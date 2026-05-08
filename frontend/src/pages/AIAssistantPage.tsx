import React, { useState, useRef } from 'react';
import { ChatContainer } from '@gravity-ui/aikit';
import '@gravity-ui/aikit/styles';
import type { TChatMessage, ChatType, TSubmitData, ChatStatus } from '@gravity-ui/aikit';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../i18n';

const SYSTEM_PROMPT =
  'You are a helpful assistant for a corporate document management system called KornDoc. ' +
  'Answer questions about documents, help users find information, and assist with document-related tasks. ' +
  'Respond in Russian by default.';

const CHAT_URL = '/api/chat/completions';

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const AIAssistantPage: React.FC = () => {
  const { user } = useAuth();
  const t = useTranslation('aiPage');
  const tHome = useTranslation('home');
  const [messages, setMessages] = useState<TChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>('ready');
  const [chatError, setChatError] = useState<Error | null>(null);
  const [chats] = useState<ChatType[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const handleSendMessage = async (data: TSubmitData): Promise<void> => {
    const userMsg: TChatMessage = {
      id: genId(),
      role: 'user',
      content: data.content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setStatus('submitted');
    setChatError(null);

    const historyForApi = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : '',
      })),
      { role: 'user', content: data.content },
    ];

    const assistantId = genId();
    const assistantMsg: TChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setStatus('streaming');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = localStorage.getItem('access_token') ?? '';
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: historyForApi,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = parsed.choices?.[0]?.delta?.content ?? '';
            accumulated += delta;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: accumulated } : m,
              ),
            );
          } catch {
            // skip malformed chunks
          }
        }
      }

      setStatus('ready');
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setStatus('ready');
        return;
      }
      const error = err instanceof Error ? err : new Error(t('unknownError'));
      setChatError(error);
      setStatus('error');
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: t('errorMessage', { message: error.message }),
                error: error,
              }
            : m,
        ),
      );
    }
  };

  const handleCancel = async (): Promise<void> => {
    abortRef.current?.abort();
    setStatus('ready');
  };

  const handleRetry = (): void => {
    setChatError(null);
    setStatus('ready');
  };

  return (
    <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <ChatContainer
        messages={messages}
        chats={chats}
        status={status}
        error={chatError}
        onSendMessage={handleSendMessage}
        onCancel={handleCancel}
        onRetry={handleRetry}
        showHistory={false}
        showNewChat={false}
        welcomeConfig={{
          title: t('title'),
          description: t('welcome', { name: user?.username ?? tHome('fallbackUser') }),
          suggestions: [
            { title: t('suggestFind') },
            { title: t('suggestUpload') },
            { title: t('suggestShare') },
            { title: t('suggestFormats') },
          ],
        }}
        i18nConfig={{
          promptInput: {
            placeholder: t('placeholder'),
          },
          submitButton: {
            sendTooltip: t('send'),
            cancelTooltip: t('cancel'),
          },
          emptyState: {
            suggestionsTitle: t('suggestionsTitle'),
          },
        }}
      />
    </div>
  );
};

export default AIAssistantPage;
