"""
Chat API router.

Provides persisted chat sessions and SSE message streaming. The legacy
/api/chat/completions proxy is kept for compatibility with the current frontend.
"""

from __future__ import annotations

import json
import logging
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from typing import Literal

import httpx
from agent import get_agent_graph
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator
from shared.config import settings
from shared.database import get_db
from shared.models import ChatMessage, ChatSession, User
from shared.security import get_current_user
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

_TIMEOUT = httpx.Timeout(60.0, connect=10.0)
_HISTORY_LIMIT = 20


class CreateSessionRequest(BaseModel):
    title: str | None = Field(default=None, max_length=500)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str | None:
        if value is None:
            return value
        stripped = value.strip()
        if not stripped:
            raise ValueError("Название чата не может быть пустым")
        return stripped


class ChatSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    created_at: datetime
    updated_at: datetime


class ChatSessionCreatedOut(BaseModel):
    id: int
    title: str
    created_at: datetime


class ChatSessionListItemOut(ChatSessionOut):
    message_count: int


class ChatSessionListOut(BaseModel):
    sessions: list[ChatSessionListItemOut]


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    role: str
    content: str
    tool_calls: dict | None
    created_at: datetime


class ChatMessagesOut(BaseModel):
    session: ChatSessionOut
    messages: list[ChatMessageOut]


class SendMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=20_000)
    style: Literal["normal", "explanatory", "formal"] | None = "normal"

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Сообщение не может быть пустым")
        return stripped

    @field_validator("style")
    @classmethod
    def validate_style(
        cls, value: Literal["normal", "explanatory", "formal"] | None
    ) -> Literal["normal", "explanatory", "formal"]:
        return value or "normal"


async def _get_owned_session(
    session_id: int,
    current_user: User,
    db: AsyncSession,
) -> ChatSession:
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Чат не найден")
    return session


def _format_sse(event: str, data: dict) -> str:
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


def _message_history_query(session_id: int, limit: int) -> Select[tuple[ChatMessage]]:
    return (
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
        .limit(limit)
    )


def _build_title(content: str) -> str:
    compact = " ".join(content.split())
    if len(compact) <= 80:
        return compact
    return compact[:77].rstrip() + "..."


@router.post(
    "/sessions",
    response_model=ChatSessionCreatedOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_session(
    body: CreateSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = ChatSession(user_id=current_user.id, title=body.title or "Новый чат")
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return ChatSessionCreatedOut(id=session.id, title=session.title, created_at=session.created_at)


@router.get("/sessions", response_model=ChatSessionListOut)
async def list_sessions(
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    limit = max(1, min(limit, 100))
    offset = max(0, offset)

    result = await db.execute(
        select(ChatSession, func.count(ChatMessage.id).label("message_count"))
        .outerjoin(ChatMessage, ChatMessage.session_id == ChatSession.id)
        .where(ChatSession.user_id == current_user.id)
        .group_by(ChatSession.id)
        .order_by(ChatSession.updated_at.desc(), ChatSession.id.desc())
        .limit(limit)
        .offset(offset)
    )
    sessions = [
        ChatSessionListItemOut(
            id=session.id,
            title=session.title,
            created_at=session.created_at,
            updated_at=session.updated_at,
            message_count=message_count,
        )
        for session, message_count in result.all()
    ]
    return ChatSessionListOut(sessions=sessions)


@router.get("/sessions/{session_id}", response_model=ChatMessagesOut)
async def get_session(
    session_id: int,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_session_messages(session_id, limit, current_user, db)


@router.get("/sessions/{session_id}/messages", response_model=ChatMessagesOut)
async def get_session_messages(
    session_id: int,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    limit = max(1, min(limit, 200))
    session = await _get_owned_session(session_id, current_user, db)
    result = await db.execute(_message_history_query(session.id, limit))
    messages = list(reversed(result.scalars().all()))
    return ChatMessagesOut(
        session=ChatSessionOut.model_validate(session),
        messages=[ChatMessageOut.model_validate(message) for message in messages],
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_owned_session(session_id, current_user, db)
    await db.delete(session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: int,
    body: SendMessageRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_owned_session(session_id, current_user, db)
    auth_header = request.headers.get("authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Не передан токен авторизации")

    user_message = ChatMessage(session_id=session.id, role="user", content=body.content)
    db.add(user_message)
    if session.title == "Новый чат":
        session.title = _build_title(body.content)
    session.updated_at = datetime.now(UTC)
    await db.flush()

    async def event_stream() -> AsyncGenerator[str, None]:
        assistant_content: list[str] = []
        try:
            history_result = await db.execute(_message_history_query(session.id, _HISTORY_LIMIT))
            history = list(reversed(history_result.scalars().all()))
            llm_messages: list[dict[str, str]] = [
                {"role": message.role, "content": message.content}
                for message in history
                if message.role in {"user", "assistant", "system"}
            ]

            agent_graph = get_agent_graph()
            async for agent_event in agent_graph.astream(
                request=request,
                session_id=session.id,
                original_query=body.content,
                style=body.style or "normal",
                auth_header=auth_header,
                history=llm_messages,
            ):
                if agent_event["event"] == "token":
                    content = agent_event["data"].get("content", "")
                    if isinstance(content, str):
                        assistant_content.append(content)
                yield _format_sse(agent_event["event"], agent_event["data"])

            assistant_message = ChatMessage(
                session_id=session.id,
                role="assistant",
                content="".join(assistant_content),
            )
            db.add(assistant_message)
            session.updated_at = datetime.now(UTC)
            await db.flush()
            yield _format_sse(
                "done",
                {"message_id": assistant_message.id, "session_id": session.id},
            )
        except Exception:
            logger.exception("Failed to stream chat response")
            yield _format_sse(
                "error",
                {"message": "Не удалось получить ответ от LLM", "code": "llm_error"},
            )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/completions")
async def chat_completions(
    request: Request,
    _current_user: User = Depends(get_current_user),
):
    """Proxy chat completions to the configured LLM provider (streaming supported)."""
    if not settings.llm_api_key:
        raise HTTPException(status_code=503, detail="LLM-провайдер не настроен")

    raw_body = await request.body()
    try:
        body_data = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Невалидный JSON") from exc

    body_data.setdefault("model", settings.llm_model)
    body_data.setdefault("max_tokens", settings.llm_max_tokens)
    patched_body = json.dumps(body_data).encode()

    upstream_url = f"{settings.llm_base_url.rstrip('/')}/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.llm_api_key}",
    }

    async def stream_upstream() -> AsyncGenerator[bytes, None]:
        try:
            async with (
                httpx.AsyncClient(timeout=_TIMEOUT) as client,
                client.stream("POST", upstream_url, content=patched_body, headers=headers) as resp,
            ):
                if resp.status_code >= 400:
                    error_bytes = await resp.aread()
                    logger.error("LLM upstream error %s: %s", resp.status_code, error_bytes[:200])
                    error_payload = json.dumps(
                        {
                            "error": {
                                "message": f"Ошибка LLM-провайдера: {resp.status_code}",
                                "code": resp.status_code,
                            }
                        }
                    )
                    yield f"data: {error_payload}\n\ndata: [DONE]\n\n".encode()
                    return
                async for chunk in resp.aiter_bytes():
                    yield chunk
        except Exception:
            logger.exception("Unexpected error proxying LLM request")
            error_payload = json.dumps(
                {"error": {"message": "Внутренняя ошибка прокси", "code": 500}}
            )
            yield f"data: {error_payload}\n\ndata: [DONE]\n\n".encode()

    return StreamingResponse(
        stream_upstream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
