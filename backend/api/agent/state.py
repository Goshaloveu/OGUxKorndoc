from __future__ import annotations

from typing import Literal, NotRequired, TypedDict

from fastapi import Request
from langgraph.graph import MessagesState

from agent.prompts import AnswerStyle

ToolName = Literal["search_documents", "search_faq"]
RouteDecision = Literal["direct", "needs_tools"]


class ToolEvent(TypedDict):
    event: Literal["tool_start", "tool_end"]
    tool: ToolName
    args: NotRequired[dict]
    result_preview: NotRequired[str]


class AgentState(MessagesState):
    original_query: str
    rephrased_query: str
    style: AnswerStyle
    tool_calls_count: int
    session_id: int
    auth_header: str
    selected_tools: list[ToolName]
    route_decision: RouteDecision
    tool_context: str
    tool_events: list[ToolEvent]
    generation_messages: list[dict[str, str]]
    request: NotRequired[Request]
