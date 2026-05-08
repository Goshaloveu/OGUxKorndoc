from __future__ import annotations

import json
from typing import Any

import httpx
from fastapi import Request
from langchain_core.tools import tool


@tool("search_documents")
def search_documents_schema(query: str, filters: dict[str, Any] | None = None) -> str:
    """Ищет по корпоративным документам. Возвращает релевантные фрагменты."""
    raise RuntimeError("This schema-only tool is executed through search_documents().")


@tool("search_faq")
def search_faq_schema(query: str) -> str:
    """Ищет в базе часто задаваемых вопросов."""
    raise RuntimeError("This schema-only tool is executed through search_faq().")


async def search_documents(
    query: str,
    filters: dict[str, Any] | None,
    request: Request,
    auth_header: str,
) -> str:
    """Call the internal document search API and format retrieval context."""
    transport = httpx.ASGITransport(app=request.app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url=str(request.base_url).rstrip("/"),
    ) as client:
        response = await client.post(
            "/api/search/",
            headers={"Authorization": auth_header},
            json={"query": query, "limit": 5, "filters": filters or {}},
        )
    response.raise_for_status()
    payload = response.json()
    results = payload.get("results", [])
    if not results:
        return "По корпоративным документам ничего не найдено."

    lines = ["Найденные документы:"]
    for index, item in enumerate(results, start=1):
        title = item.get("title", "Без названия")
        snippet = _strip_marks(str(item.get("snippet_html", "")))
        document_id = item.get("document_id")
        lines.append(f"{index}. {title} (document_id={document_id}): {snippet}")
    return "\n".join(lines)


async def search_faq(query: str, request: Request, auth_header: str) -> str:
    """Call the internal FAQ search API and format retrieval context."""
    transport = httpx.ASGITransport(app=request.app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url=str(request.base_url).rstrip("/"),
    ) as client:
        response = await client.get(
            "/api/search/faq",
            headers={"Authorization": auth_header},
            params={"q": query, "limit": 5},
        )
    response.raise_for_status()
    payload = response.json()
    results = payload.get("results", [])
    if not results:
        return "В FAQ ничего не найдено."

    lines = ["Найденные FAQ-материалы. Используй их как контекст и не цитируй дословно:"]
    for index, item in enumerate(results, start=1):
        question = item.get("question", "Вопрос")
        answer = str(item.get("answer", ""))
        compact_answer = " ".join(answer.split())
        if len(compact_answer) > 700:
            compact_answer = compact_answer[:697].rstrip() + "..."
        lines.append(f"{index}. {question}: {compact_answer}")
    return "\n".join(lines)


def _strip_marks(value: str) -> str:
    return value.replace("<mark>", "").replace("</mark>", "")


def result_preview(result: str, limit: int = 220) -> str:
    compact = " ".join(result.split())
    if len(compact) <= limit:
        return compact
    return compact[: limit - 3].rstrip() + "..."


def serialize_tool_args(args: dict[str, Any]) -> dict[str, Any]:
    return json.loads(json.dumps(args, ensure_ascii=False, default=str))
