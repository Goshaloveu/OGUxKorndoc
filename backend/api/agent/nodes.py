from __future__ import annotations

import logging
from typing import Any, cast

from langchain_core.messages import BaseMessage

from agent.prompts import REPHRASE_SYSTEM_PROMPT, ROUTE_SYSTEM_PROMPT, build_system_prompt
from agent.state import AgentState, ToolEvent, ToolName
from agent.tools import result_preview, search_documents, search_faq, serialize_tool_args

logger = logging.getLogger(__name__)

_MAX_TOOL_CALLS = 3


async def rephrase_query(state: AgentState) -> dict[str, str]:
    """Rewrite the user message into a concise retrieval query."""
    original_query = state["original_query"].strip()
    request = state.get("request")
    if request is None:
        return {"rephrased_query": original_query}

    history = _history_for_prompt(state)
    messages = [
        {"role": "system", "content": REPHRASE_SYSTEM_PROMPT},
        *history[-8:],
        {"role": "user", "content": original_query},
    ]
    try:
        rephrased = (
            await request.app.state.llm.chat(messages, temperature=0.0, max_tokens=120)
        ).strip()
    except Exception:
        logger.exception("Failed to rephrase agent query")
        rephrased = ""

    return {"rephrased_query": rephrased or original_query}


async def route(state: AgentState) -> dict[str, Any]:
    """Choose whether the graph needs retrieval tools."""
    request = state.get("request")
    query = state["rephrased_query"]
    if request is None:
        selected_tools = _heuristic_tools(query)
        return {
            "route_decision": "needs_tools" if selected_tools else "direct",
            "selected_tools": selected_tools,
        }

    messages = [
        {"role": "system", "content": ROUTE_SYSTEM_PROMPT},
        {"role": "user", "content": query},
    ]
    try:
        decision = (
            await request.app.state.llm.chat(messages, temperature=0.0, max_tokens=20)
        ).strip()
    except Exception:
        logger.exception("Failed to route agent query")
        decision = ""

    selected_tools = _tools_from_decision(decision) or _heuristic_tools(query)
    return {
        "route_decision": "needs_tools" if selected_tools else "direct",
        "selected_tools": selected_tools,
    }


async def tool_call(state: AgentState) -> dict[str, Any]:
    """Execute selected retrieval tools and collect tool events for SSE."""
    request = state.get("request")
    if request is None:
        return {"tool_context": "", "tool_events": []}

    auth_header = state["auth_header"]
    query = state["rephrased_query"]
    selected_tools = state.get("selected_tools", [])
    contexts: list[str] = []
    events: list[ToolEvent] = []
    calls_count = min(state.get("tool_calls_count", 0), _MAX_TOOL_CALLS)

    for selected_tool in selected_tools:
        if calls_count >= _MAX_TOOL_CALLS:
            break
        calls_count += 1
        if selected_tool == "search_documents":
            args = {"query": query, "filters": {}}
            events.append(
                {"event": "tool_start", "tool": selected_tool, "args": serialize_tool_args(args)}
            )
            try:
                result = await search_documents(query, {}, request, auth_header)
            except Exception:
                logger.exception("Document search tool failed")
                result = "Не удалось выполнить поиск по корпоративным документам."
        else:
            args = {"query": query}
            events.append(
                {"event": "tool_start", "tool": selected_tool, "args": serialize_tool_args(args)}
            )
            try:
                result = await search_faq(query, request, auth_header)
            except Exception:
                logger.exception("FAQ search tool failed")
                result = "Не удалось выполнить поиск по FAQ."

        contexts.append(result)
        events.append(
            {
                "event": "tool_end",
                "tool": selected_tool,
                "result_preview": result_preview(result),
            }
        )

    return {
        "tool_calls_count": calls_count,
        "tool_context": "\n\n".join(contexts),
        "tool_events": events,
    }


async def generate(state: AgentState) -> dict[str, list[dict[str, str]]]:
    """Prepare the final generation prompt. Token streaming is handled by the router."""
    messages = [
        {"role": "system", "content": build_system_prompt(state["style"])},
        *_history_for_prompt(state)[-12:],
    ]
    tool_context = state.get("tool_context", "")
    if tool_context:
        messages.append(
            {
                "role": "system",
                "content": (
                    "Контекст retrieval ниже. Ответь на его основе, но не цитируй FAQ дословно. "
                    "Если данных недостаточно, честно скажи об этом.\n\n"
                    f"{tool_context}"
                ),
            }
        )
    messages.append({"role": "user", "content": state["original_query"]})
    return {"generation_messages": messages}


def should_call_tools(state: AgentState) -> str:
    return "tool_call" if state.get("route_decision") == "needs_tools" else "generate"


def _history_for_prompt(state: AgentState) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = []
    for message in state.get("messages", []):
        if isinstance(message, dict):
            role = message.get("role")
            content = message.get("content")
            if role in {"user", "assistant", "system"} and isinstance(content, str):
                messages.append({"role": role, "content": content})
        elif isinstance(message, BaseMessage):
            role = "assistant" if message.type == "ai" else message.type
            content = message.content
            if role in {"user", "assistant", "system", "human"} and isinstance(content, str):
                messages.append({"role": "user" if role == "human" else role, "content": content})
    return messages


def _tools_from_decision(decision: str) -> list[ToolName]:
    normalized = decision.lower()
    if "both" in normalized or "оба" in normalized:
        return ["search_documents", "search_faq"]
    if "documents" in normalized or "document" in normalized or "документ" in normalized:
        return ["search_documents"]
    if "faq" in normalized or "вопрос" in normalized:
        return ["search_faq"]
    if "direct" in normalized:
        return []
    return []


def _heuristic_tools(query: str) -> list[ToolName]:
    normalized = query.lower()
    faq_markers = ("faq", "часто", "как ", "инструкция", "помощь", "загрузить", "найти")
    document_markers = (
        "документ",
        "договор",
        "файл",
        "приказ",
        "акт",
        "счет",
        "найди",
        "поиск",
    )
    selected: list[ToolName] = []
    if any(marker in normalized for marker in document_markers):
        selected.append("search_documents")
    if any(marker in normalized for marker in faq_markers):
        selected.append("search_faq")
    return cast(list[ToolName], selected)
