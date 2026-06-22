import React, { useCallback, useMemo, useRef, useState } from 'react';
import { SegmentedRadioGroup, Switch, Text } from '@gravity-ui/uikit';
import { ChatContainer } from '@gravity-ui/aikit';
import { ThinkingMessage } from '@gravity-ui/aikit/ThinkingMessage';
import { createMessageRendererRegistry, registerMessageRenderer } from '@gravity-ui/aikit/utils/messageTypeRegistry';
import '@gravity-ui/aikit/styles';
import type {
  ChatStatus,
  ChatType,
  TChatMessage,
  TAssistantMessage,
  TDefaultMessageContent,
  TSubmitData,
  ThinkingMessageContentData,
  ThinkingMessageContent,
} from '@gravity-ui/aikit';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toaster } from '@gravity-ui/uikit/toaster-singleton';
import {
  createSession,
  deleteSession,
  getSessionMessages,
  listSessions,
} from '../api/chat';
import type { BackendChatMessage, ChatSessionItem } from '../api/chat';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../i18n';
import type { AnswerStyle, KnownTool } from '../types';

const TOOL_NAMES: Record<KnownTool, string> = {
  search_documents: 'search_documents',
  search_faq: 'search_faq',
};

function toAikitChat(session: ChatSessionItem): ChatType {
  return {
    id: String(session.id),
    name: session.title,
    createTime: session.updated_at,
  };
}

function getToolLabel(toolName: string, t: (key: string) => string): string {
  if (toolName === TOOL_NAMES.search_documents) return t('toolThinkingTitle');
  if (toolName === TOOL_NAMES.search_faq) return t('toolFaqThinkingTitle');
  return toolName;
}

function buildThinkingBlock(
  title: string,
  status: ThinkingMessageContentData['status'],
  content: string,
): TDefaultMessageContent {
  return {
    type: 'thinking',
    data: { title, content, status, enabledCopy: true, defaultExpanded: true },
  };
}

function buildTextBlock(text: string): TDefaultMessageContent {
  return { type: 'text', data: { text } };
}

function blocksToContent(
  blocks: TDefaultMessageContent[],
): TAssistantMessage['content'] {
  if (blocks.length === 0) return '';
  if (blocks.length === 1 && blocks[0].type === 'text') {
    return (blocks[0].data as { text: string }).text;
  }
  return blocks;
}

function buildAssistantContent(
  msg: BackendChatMessage,
  t: (key: string) => string,
): TAssistantMessage['content'] {
  const blocks: TDefaultMessageContent[] = [];

  if (msg.tool_calls?.events) {
    const toolStartMap = new Map<string, number>();
    for (const ev of msg.tool_calls.events) {
      if (ev.event === 'tool_start' && ev.tool) {
        const idx = blocks.length;
        toolStartMap.set(ev.tool, idx);
        blocks.push(buildThinkingBlock(getToolLabel(ev.tool, t), 'thinking', ''));
      } else if (ev.event === 'tool_end' && ev.tool) {
        const idx = toolStartMap.get(ev.tool);
        if (idx !== undefined) {
          blocks[idx] = buildThinkingBlock(
            getToolLabel(ev.tool, t),
            'thought',
            ev.result_preview ?? '',
          );
        }
      }
    }
  }

  if (msg.content) {
    blocks.push(buildTextBlock(msg.content));
  }

  return blocksToContent(blocks);
}

function toAikitMessages(
  msgs: BackendChatMessage[],
  t: (key: string) => string,
): TChatMessage[] {
  const result: TChatMessage[] = [];
  for (const msg of msgs) {
    if (msg.role === 'user') {
      result.push({
        id: String(msg.id),
        role: 'user',
        content: msg.content,
        timestamp: msg.created_at,
      });
    } else if (msg.role === 'assistant') {
      result.push({
        id: String(msg.id),
        role: 'assistant',
        content: buildAssistantContent(msg, t),
        timestamp: msg.created_at,
      });
    }
  }
  return result;
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const AIAssistantPage: React.FC = () => {
  const { user } = useAuth();
  const t = useTranslation('aiPage');
  const tHome = useTranslation('home');
  const queryClient = useQueryClient();

  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<TChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>('ready');
  const [chatError, setChatError] = useState<Error | null>(null);
  const [answerStyle, setAnswerStyle] = useState<AnswerStyle>('normal');
  const [disabledTools, setDisabledTools] = useState<Set<KnownTool>>(new Set());

  const abortRef = useRef<AbortController | null>(null);
  const streamBlocksRef = useRef<TDefaultMessageContent[]>([]);

  const messageRendererRegistry = useMemo(() => {
    const registry = createMessageRendererRegistry();
    registerMessageRenderer<ThinkingMessageContent>(registry, 'thinking', {
      component: ({ part }) => (
        <ThinkingMessage {...part.data} format="markdown" enabledCopy defaultExpanded />
      ),
    });
    return registry;
  }, []);

  const { data: sessions = [] } = useQuery({
    queryKey: ['chatSessions'],
    queryFn: () => listSessions(),
    staleTime: 10_000,
  });

  const aikitChats: ChatType[] = sessions.map(toAikitChat);
  const activeChat = aikitChats.find((c) => c.id === String(activeSessionId)) ?? null;

  const loadSession = useCallback(
    async (sessionId: number) => {
      try {
        const data = await getSessionMessages(sessionId);
        setMessages(toAikitMessages(data.messages, t));
      } catch {
        toaster.add({
          name: 'load-messages-error',
          title: t('loadMessagesError'),
          theme: 'danger',
          autoHiding: 3000,
        });
      }
    },
    [t],
  );

  const handleSelectChat = useCallback(
    (chat: ChatType) => {
      const sessionId = Number(chat.id);
      setActiveSessionId(sessionId);
      setChatError(null);
      setStatus('ready');
      void loadSession(sessionId);
    },
    [loadSession],
  );

  const handleCreateChat = useCallback(async () => {
    try {
      const session = await createSession();
      await queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
      setActiveSessionId(session.id);
      setMessages([]);
      setChatError(null);
      setStatus('ready');
    } catch {
      toaster.add({
        name: 'create-session-error',
        title: t('createSessionError'),
        theme: 'danger',
        autoHiding: 3000,
      });
    }
  }, [queryClient, t]);

  const handleDeleteChat = useCallback(
    async (chat: ChatType) => {
      const sessionId = Number(chat.id);
      try {
        await deleteSession(sessionId);
        await queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
        if (activeSessionId === sessionId) {
          setActiveSessionId(null);
          setMessages([]);
          setChatError(null);
          setStatus('ready');
        }
      } catch {
        toaster.add({
          name: 'delete-session-error',
          title: t('deleteSessionError'),
          theme: 'danger',
          autoHiding: 3000,
        });
      }
    },
    [activeSessionId, queryClient, t],
  );

  const updateAssistantMsg = useCallback(
    (msgId: string, contentBlocks: TDefaultMessageContent[]) => {
      const content = blocksToContent(contentBlocks);
      setMessages((prev) =>
        prev.map((m): TChatMessage => {
          if (m.id !== msgId || m.role !== 'assistant') return m;
          return { ...m, content };
        }),
      );
    },
    [],
  );

  const handleSendMessage = useCallback(
    async (data: TSubmitData): Promise<void> => {
      let sessionId = activeSessionId;

      if (sessionId === null) {
        try {
          const session = await createSession();
          sessionId = session.id;
          setActiveSessionId(sessionId);
          await queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
        } catch {
          toaster.add({
            name: 'create-session-error',
            title: t('createSessionError'),
            theme: 'danger',
            autoHiding: 3000,
          });
          return;
        }
      }

      const userMsg: TChatMessage = {
        id: genId(),
        role: 'user',
        content: data.content,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setStatus('submitted');
      setChatError(null);

      const assistantId = genId();
      const assistantMsg: TChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStatus('streaming');

      streamBlocksRef.current = [];

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const authToken = localStorage.getItem('access_token') ?? '';
        const body: {
          content: string;
          style: AnswerStyle;
          disabled_tools?: string[];
        } = {
          content: data.content,
          style: answerStyle,
        };

        if (disabledTools.size > 0) {
          body.disabled_tools = Array.from(disabledTools);
        }

        const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error('No response body');

        const toolBlockIndex = new Map<string, number>();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE frames (separated by double newline)
          const frames = buffer.split('\n\n');
          // Keep the last incomplete frame in buffer
          buffer = frames.pop() ?? '';

          for (const frame of frames) {
            if (!frame.trim()) continue;
            const lines = frame.split('\n');
            let eventName = '';
            let dataStr = '';
            for (const l of lines) {
              if (l.startsWith('event: ')) eventName = l.slice(7).trim();
              if (l.startsWith('data: ')) dataStr = l.slice(6).trim();
            }
            if (!dataStr) continue;

            let payload: Record<string, unknown>;
            try {
              payload = JSON.parse(dataStr) as Record<string, unknown>;
            } catch {
              continue;
            }

            if (eventName === 'tool_start') {
              const toolName = String(payload.tool ?? '');
              const blockIdx = streamBlocksRef.current.length;
              toolBlockIndex.set(toolName, blockIdx);
              streamBlocksRef.current = [
                ...streamBlocksRef.current,
                buildThinkingBlock(getToolLabel(toolName, t), 'thinking', ''),
              ];
              updateAssistantMsg(assistantId, streamBlocksRef.current);
            } else if (eventName === 'tool_end') {
              const toolName = String(payload.tool ?? '');
              const resultPreview = String(payload.result_preview ?? '');
              const blockIdx = toolBlockIndex.get(toolName);
              if (blockIdx !== undefined) {
                const blocks = [...streamBlocksRef.current];
                blocks[blockIdx] = buildThinkingBlock(
                  getToolLabel(toolName, t),
                  'thought',
                  resultPreview,
                );
                streamBlocksRef.current = blocks;
                updateAssistantMsg(assistantId, streamBlocksRef.current);
              }
            } else if (eventName === 'token') {
              const tokenContent = String(payload.content ?? '');
              const blocks = streamBlocksRef.current;
              const last = blocks[blocks.length - 1];
              if (last?.type === 'text') {
                const prevText = (last.data as { text: string }).text;
                streamBlocksRef.current = [
                  ...blocks.slice(0, -1),
                  buildTextBlock(prevText + tokenContent),
                ];
              } else {
                streamBlocksRef.current = [...blocks, buildTextBlock(tokenContent)];
              }
              updateAssistantMsg(assistantId, streamBlocksRef.current);
            } else if (eventName === 'done') {
              void queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
            } else if (eventName === 'error') {
              const errMsg = String(payload.message ?? t('unknownError'));
              throw new Error(errMsg);
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
        const errorContent = t('errorMessage', { message: error.message });
        setMessages((prev) =>
          prev.map((m): TChatMessage => {
            if (m.id !== assistantId || m.role !== 'assistant') return m;
            return { ...m, content: errorContent, error };
          }),
        );
      }
    },
    [activeSessionId, answerStyle, disabledTools, queryClient, t, updateAssistantMsg],
  );

  const handleCancel = useCallback(async (): Promise<void> => {
    abortRef.current?.abort();
    setStatus('ready');
  }, []);

  const handleRetry = useCallback((): void => {
    setChatError(null);
    setStatus('ready');
  }, []);

  const toggleTool = useCallback((tool: KnownTool) => {
    setDisabledTools((prev) => {
      const next = new Set(prev);
      if (next.has(tool)) {
        next.delete(tool);
      } else {
        next.add(tool);
      }
      return next;
    });
  }, []);

  const styleOptions: Array<{ value: AnswerStyle; content: string }> = [
    { value: 'normal', content: t('styleNormal') },
    { value: 'explanatory', content: t('styleExplanatory') },
    { value: 'formal', content: t('styleFormal') },
  ];

  const controlsPanel = (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--g-spacing-3)',
        padding: 'var(--g-spacing-2) var(--g-spacing-3)',
        borderBottom: '1px solid var(--g-color-line-generic)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--g-spacing-2)' }}>
        <Text variant="caption-2" color="secondary">
          {t('styleLabel')}:
        </Text>
        <SegmentedRadioGroup
          size="s"
          value={answerStyle}
          onUpdate={(v: AnswerStyle) => setAnswerStyle(v)}
          options={styleOptions}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--g-spacing-3)' }}>
        <Text variant="caption-2" color="secondary">
          {t('toolsLabel')}:
        </Text>
        <Switch
          size="m"
          checked={!disabledTools.has('search_documents')}
          onUpdate={() => toggleTool('search_documents')}
          content={t('toolSearchDocuments')}
        />
        <Switch
          size="m"
          checked={!disabledTools.has('search_faq')}
          onUpdate={() => toggleTool('search_faq')}
          content={t('toolSearchFaq')}
        />
      </div>
    </div>
  );

  return (
    <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <ChatContainer
        chats={aikitChats}
        activeChat={activeChat}
        messages={messages}
        status={status}
        error={chatError}
        onSendMessage={handleSendMessage}
        onSelectChat={handleSelectChat}
        onCreateChat={() => {
          void handleCreateChat();
        }}
        onDeleteChat={handleDeleteChat}
        onCancel={handleCancel}
        onRetry={handleRetry}
        showHistory
        showNewChat
        messageListConfig={{ messageRendererRegistry }}
        promptInputProps={{
          topPanel: {
            isOpen: true,
            children: controlsPanel,
          },
        }}
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
          history: {
            emptyPlaceholder: t('historyEmpty'),
            emptyFilteredPlaceholder: t('historyFilterEmpty'),
            searchPlaceholder: t('historySearch'),
          },
        }}
      />
    </div>
  );
};

export default AIAssistantPage;
