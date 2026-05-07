from __future__ import annotations

import json
import logging
from collections.abc import AsyncGenerator

import httpx

from shared.config import settings

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(120.0, connect=10.0)


class ChatLLM:
    """OpenAI-compatible chat client used by API routers."""

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(timeout=_TIMEOUT)
        self.model = settings.llm_model
        self.base_url = settings.llm_base_url.rstrip("/")

    async def close(self) -> None:
        await self._client.aclose()

    async def stream(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> AsyncGenerator[str, None]:
        if not settings.llm_api_key:
            raise RuntimeError("LLM provider is not configured")

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature if temperature is not None else settings.llm_temperature,
            "max_tokens": max_tokens if max_tokens is not None else settings.llm_max_tokens,
            "stream": True,
        }
        headers = {
            "Authorization": f"Bearer {settings.llm_api_key}",
            "Content-Type": "application/json",
        }

        async with self._client.stream(
            "POST",
            f"{self.base_url}/chat/completions",
            json=payload,
            headers=headers,
        ) as response:
            if response.status_code >= 400:
                error_text = await response.aread()
                logger.error("LLM upstream error %s: %s", response.status_code, error_text[:200])
                raise RuntimeError(f"LLM upstream error: {response.status_code}")

            async for line in response.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line.removeprefix("data:").strip()
                if not data or data == "[DONE]":
                    continue
                try:
                    chunk = json.loads(data)
                except json.JSONDecodeError:
                    logger.warning("Skipping malformed LLM stream chunk")
                    continue

                choices = chunk.get("choices") or []
                if not choices:
                    continue
                delta = choices[0].get("delta") or {}
                content = delta.get("content")
                if isinstance(content, str) and content:
                    yield content
