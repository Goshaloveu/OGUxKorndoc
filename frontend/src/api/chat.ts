import api from './client';

export interface ChatSessionItem {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface BackendChatMessage {
  id: number;
  session_id: number;
  role: string;
  content: string;
  tool_calls: { events: ToolCallEvent[] } | null;
  created_at: string;
}

export interface ToolCallEvent {
  event: string;
  tool?: string;
  args?: Record<string, unknown>;
  result_preview?: string;
}

export interface ChatSessionMessages {
  session: {
    id: number;
    title: string;
    created_at: string;
    updated_at: string;
  };
  messages: BackendChatMessage[];
}

export async function createSession(title?: string): Promise<{ id: number; title: string; created_at: string }> {
  const response = await api.post<{ id: number; title: string; created_at: string }>('/chat/sessions', {
    title: title ?? null,
  });
  return response.data;
}

export async function listSessions(limit = 30, offset = 0): Promise<ChatSessionItem[]> {
  const response = await api.get<{ sessions: ChatSessionItem[] }>('/chat/sessions', {
    params: { limit, offset },
  });
  return response.data.sessions;
}

export async function getSessionMessages(sessionId: number, limit = 50): Promise<ChatSessionMessages> {
  const response = await api.get<ChatSessionMessages>(`/chat/sessions/${sessionId}/messages`, {
    params: { limit },
  });
  return response.data;
}

export async function deleteSession(sessionId: number): Promise<void> {
  await api.delete(`/chat/sessions/${sessionId}`);
}
