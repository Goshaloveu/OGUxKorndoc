from __future__ import annotations

import json
import logging
from collections.abc import AsyncGenerator

import httpx

from shared.config import settings

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(120.0, connect=10.0)

_REPHRASE_SYSTEM_PROMPT = (
    "You are a search query optimizer. Your task is to rephrase the user's query "
    "to be more effective for semantic document search. "
    "Given the conversation history (if any) and the current query, produce a single "
    "concise, self-contained search query that captures the user's intent. "
    "Return ONLY the rephrased query text with no explanation or additional text. "
    "If the query is already clear and specific, return it unchanged."
)


class ChatLLM:
    """OpenAI-compatible chat client used by API routers."""

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(timeout=_TIMEOUT)
        self.model = settings.llm_model
        self.base_url = settings.llm_base_url.rstrip("/")

    async def close(self) -> None:
        await self._client.aclose()

    async def complete(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        """Non-streaming chat completion — returns the full response as a string."""
        if not settings.llm_api_key:
            raise RuntimeError("LLM provider is not configured")

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature if temperature is not None else settings.llm_temperature,
            "max_tokens": max_tokens if max_tokens is not None else settings.llm_max_tokens,
            "stream": False,
        }
        headers = {
            "Authorization": f"Bearer {settings.llm_api_key}",
            "Content-Type": "application/json",
        }

        response = await self._client.post(
            f"{self.base_url}/chat/completions",
            json=payload,
            headers=headers,
        )
        if response.status_code >= 400:
            logger.error("LLM upstream error %s: %s", response.status_code, response.text[:200])
            raise RuntimeError(f"LLM upstream error: {response.status_code}")

        data = response.json()
        choices = data.get("choices") or []
        if not choices:
            raise RuntimeError("LLM returned no choices")
        return choices[0].get("message", {}).get("content", "").strip()

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


async def rephrase_query(
    query: str,
    history: list[dict],
    llm: ChatLLM,
) -> str:
    """
    Rephrase the search query using LLM context from conversation history.

    Falls back to the original query if LLM is unavailable or returns an empty result.
    History entries should be dicts with "role" and "content" keys.
    """
    if not settings.llm_api_key:
        logger.debug("LLM not configured, skipping query rephrase")
        return query

    messages: list[dict[str, str]] = [{"role": "system", "content": _REPHRASE_SYSTEM_PROMPT}]

    # Include recent conversation context (last 6 turns to stay within token budget)
    relevant_history = [
        {"role": h["role"], "content": h["content"]}
        for h in history[-6:]
        if h.get("role") in {"user", "assistant"} and h.get("content")
    ]
    messages.extend(relevant_history)
    messages.append({"role": "user", "content": f"Search query to rephrase: {query}"})

    try:
        rephrased = await llm.complete(messages, temperature=0.0, max_tokens=256)
        if rephrased:
            logger.info("Query rephrased: %r -> %r", query, rephrased)
            return rephrased
    except Exception as exc:
        logger.warning("Query rephrase failed, using original query: %s", exc)

    return query
