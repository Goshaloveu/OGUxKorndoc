"""
Chat proxy router.

POST /api/chat/completions — transparent proxy to the configured LLM provider.

Accepts the same OpenAI-compatible request body the frontend sends and streams
the response back. Switching provider = change 3 env vars, no code changes.
"""

from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from shared.config import settings
from shared.models import User
from shared.security import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

_TIMEOUT = httpx.Timeout(60.0, connect=10.0)


@router.post("/completions")
async def chat_completions(
    request: Request,
    _current_user: User = Depends(get_current_user),
):
    """Proxy chat completions to the configured LLM provider (streaming supported)."""
    if not settings.llm_api_key:
        raise HTTPException(status_code=503, detail="LLM-провайдер не настроен")

    body = await request.body()
    upstream_url = f"{settings.llm_base_url.rstrip('/')}/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.llm_api_key}",
    }

    async def stream_upstream():
        async with (
            httpx.AsyncClient(timeout=_TIMEOUT) as client,
            client.stream("POST", upstream_url, content=body, headers=headers) as resp,
        ):
            if resp.status_code >= 400:
                error_bytes = await resp.aread()
                logger.error("LLM upstream error %s: %s", resp.status_code, error_bytes[:200])
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"Ошибка LLM-провайдера: {resp.status_code}",
                )
            async for chunk in resp.aiter_bytes():
                yield chunk

    return StreamingResponse(
        stream_upstream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
