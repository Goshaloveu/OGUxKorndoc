from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Literal, TypedDict

from fastapi import Request
from langgraph.graph import END, START, StateGraph

from agent.nodes import generate, rephrase_query, route, should_call_tools, tool_call
from agent.prompts import AnswerStyle
from agent.state import AgentState


class AgentEvent(TypedDict):
    event: Literal["token", "tool_start", "tool_end"]
    data: dict


class AgentGraph:
    def __init__(self) -> None:
        graph = StateGraph(AgentState)
        graph.add_node("rephrase_query", rephrase_query)
        graph.add_node("route", route)
        graph.add_node("tool_call", tool_call)
        graph.add_node("generate", generate)
        graph.add_edge(START, "rephrase_query")
        graph.add_edge("rephrase_query", "route")
        graph.add_conditional_edges(
            "route",
            should_call_tools,
            {"tool_call": "tool_call", "generate": "generate"},
        )
        graph.add_edge("tool_call", "generate")
        graph.add_edge("generate", END)
        self._compiled = graph.compile()

    async def astream(
        self,
        *,
        request: Request,
        session_id: int,
        original_query: str,
        style: AnswerStyle,
        auth_header: str,
        history: list[dict[str, str]],
    ) -> AsyncGenerator[AgentEvent, None]:
        generation_messages: list[dict[str, str]] = []
        initial_state: AgentState = {
            "messages": history,
            "original_query": original_query,
            "rephrased_query": original_query,
            "style": style,
            "tool_calls_count": 0,
            "session_id": session_id,
            "auth_header": auth_header,
            "selected_tools": [],
            "route_decision": "direct",
            "tool_context": "",
            "tool_events": [],
            "generation_messages": [],
            "request": request,
        }

        async for update in self._compiled.astream(initial_state, stream_mode="updates"):
            tool_update = update.get("tool_call")
            if tool_update:
                for tool_event in tool_update.get("tool_events", []):
                    if tool_event["event"] == "tool_start":
                        yield {
                            "event": "tool_start",
                            "data": {
                                "tool": tool_event["tool"],
                                "args": tool_event.get("args", {}),
                            },
                        }
                    else:
                        yield {
                            "event": "tool_end",
                            "data": {
                                "tool": tool_event["tool"],
                                "result_preview": tool_event.get("result_preview", ""),
                            },
                        }

            generate_update = update.get("generate")
            if generate_update:
                generation_messages = generate_update.get("generation_messages", [])

        async for token in request.app.state.llm.stream(generation_messages):
            yield {"event": "token", "data": {"content": token}}


_agent_graph: AgentGraph | None = None


def get_agent_graph() -> AgentGraph:
    global _agent_graph
    if _agent_graph is None:
        _agent_graph = AgentGraph()
    return _agent_graph
