# ADR-0001: Архитектура AI-агента и абстракция LLM-провайдера

**Статус:** Принято  
**Дата:** 2026-05-07  
**Автор:** architect  
**Блокирует:** A2 (backend proxy), A3 (LangGraph agent), A4 (AIKit frontend)  
**Зависит от:** A0 (вынос ключей в бэкенд)

---

## 1. Абстракция провайдера

### .env-контракт

```env
# LLM Provider — любой OpenAI-compatible API
LLM_PROVIDER=deepseek          # deepseek | openai | local
LLM_API_KEY=sk-xxx
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
LLM_MAX_TOKENS=4096
LLM_TEMPERATURE=0.7
```

Переход на другого провайдера (например, локальный vLLM с Gemma4):

```env
LLM_PROVIDER=local
LLM_API_KEY=not-needed
LLM_BASE_URL=http://llm:8000/v1
LLM_MODEL=gemma-4-27b
```

Три переменные (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`) — единственное, что меняется. Код остаётся тем же.

### Интерфейс ChatLLM

Файл: `backend/shared/llm.py` (new)

```python
from shared.config import settings
from openai import AsyncOpenAI

class ChatLLM:
    """Thin wrapper over any OpenAI-compatible API."""

    def __init__(self) -> None:
        self._client = AsyncOpenAI(
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
        )
        self.model = settings.llm_model

    async def chat(
        self,
        messages: list[dict[str, str]],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        response = await self._client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature or settings.llm_temperature,
            max_tokens=max_tokens or settings.llm_max_tokens,
        )
        return response.choices[0].message.content or ""

    async def stream(
        self,
        messages: list[dict[str, str]],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ):
        """Yields content deltas as strings."""
        response = await self._client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature or settings.llm_temperature,
            max_tokens=max_tokens or settings.llm_max_tokens,
            stream=True,
        )
        async for chunk in response:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
```

**Settings additions** в `backend/shared/config.py`:

```python
# LLM
llm_provider: str = "deepseek"
llm_api_key: str = ""
llm_base_url: str = "https://api.deepseek.com/v1"
llm_model: str = "deepseek-chat"
llm_max_tokens: int = 4096
llm_temperature: float = 0.7
```

**Singleton** — ChatLLM инстанцируется один раз в API lifespan (`app.state.llm = ChatLLM()`), аналогично embedder.

**Зависимость** — пакет `openai` (AsyncOpenAI). Используем его как универсальный клиент для любого OpenAI-compatible API, включая DeepSeek, vLLM, Ollama.

---

## 2. LangGraph топология v1

```
         ┌──────────────┐
         │ rephrase_query│
         └──────┬───────┘
                │
         ┌──────▼───────┐
         │    route      │
         └──┬────────┬──┘
            │        │
     direct │        │ needs_tools
            │   ┌────▼────────┐
            │   │  tool_call   │◄──┐
            │   └────┬────────┘   │
            │        │            │ (loop if more tools needed)
            │   ┌────▼────────┐   │
            │   │ tool_result  ├───┘
            │   └────┬────────┘
            │        │
         ┌──▼────────▼──┐
         │   generate    │
         └──────────────┘
```

### State-объект

Файл: `backend/api/agent/state.py` (new)

```python
from typing import TypedDict, Literal
from langgraph.graph import MessagesState

class AgentState(MessagesState):
    original_query: str
    rephrased_query: str
    style: Literal["normal", "explanatory", "formal"]
    tool_calls_count: int
    session_id: int
```

### Узлы

| Узел | Назначение | Вход | Выход |
|------|-----------|------|-------|
| `rephrase_query` | Переформулирует запрос для поиска (убирает «найди мне», добавляет контекст из истории) | `original_query`, history | `rephrased_query` |
| `route` | LLM решает: ответить напрямую или вызвать инструмент | `rephrased_query` | branch: `direct` → `generate`, `needs_tools` → `tool_call` |
| `tool_call` | LLM выбирает инструмент и формирует аргументы | messages | tool call message |
| `tool_result` | Выполняет инструмент, добавляет результат в messages | tool call | tool result message |
| `generate` | Финальная генерация ответа с учётом стиля | all messages, style | assistant response |

### Инструменты

```python
@tool
def search_documents(query: str, filters: dict | None = None) -> str:
    """Ищет по корпоративным документам. Возвращает релевантные фрагменты."""
    # Внутри: embed query → Qdrant search → format results
    # Переиспользует логику из routers/search.py (build_qdrant_filter, build_snippet)
    # Фильтрует по правам текущего пользователя (user_id из state)

@tool
def search_faq(query: str) -> str:
    """Ищет в базе часто задаваемых вопросов."""
    # v1: статический JSON/YAML с FAQ по системе
    # Будущее: отдельная Qdrant коллекция "faq"
```

### Условия остановки

- `tool_calls_count >= 3` → принудительный переход в `generate` (защита от зацикливания)
- `route` решил `direct` → сразу в `generate`
- `tool_result` не содержит полезных данных → `generate` с "не удалось найти"

### Файловая структура

```
backend/api/agent/
├── __init__.py
├── state.py          # AgentState
├── graph.py          # LangGraph граф, compile()
├── nodes.py          # rephrase_query, route, tool_call, generate
├── tools.py          # search_documents, search_faq
└── prompts.py        # system prompts по стилям
```

---

## 3. Персистентность истории

### Новые таблицы

```python
# backend/shared/models.py — добавить

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False, default="Новый чат")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship("User")
    messages: Mapped[list["ChatMessage"]] = relationship(
        "ChatMessage", back_populates="session", cascade="all, delete-orphan",
        order_by="ChatMessage.created_at"
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # "user" | "assistant" | "tool"
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    tool_calls: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    session: Mapped["ChatSession"] = relationship("ChatSession", back_populates="messages")
```

**Миграция:** `alembic revision --autogenerate -m "add_chat_sessions_and_messages"`

**Индексы:** `chat_sessions(user_id)`, `chat_messages(session_id)` — уже покрыты через `index=True` на FK.

### API эндпоинты

Файл: `backend/api/routers/chat.py` (new)

```
POST   /api/chat/sessions                   → создать сессию
GET    /api/chat/sessions                   → список сессий текущего пользователя
GET    /api/chat/sessions/{id}              → сессия + последние N сообщений
DELETE /api/chat/sessions/{id}              → удалить сессию (только свою)
POST   /api/chat/sessions/{id}/messages     → отправить сообщение (SSE response)
```

| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/api/chat/sessions` | POST | `get_current_user` | `{ title?: str }` | `{ id, title, created_at }` |
| `/api/chat/sessions` | GET | `get_current_user` | query: `limit=20, offset=0` | `{ sessions: [{ id, title, created_at, updated_at, message_count }] }` |
| `/api/chat/sessions/{id}` | GET | `get_current_user` | query: `limit=50` | `{ session, messages: [...] }` |
| `/api/chat/sessions/{id}` | DELETE | `get_current_user` | — | `204 No Content` |
| `/api/chat/sessions/{id}/messages` | POST | `get_current_user` | `{ content: str, style?: str }` | SSE stream |

Пользователь может работать только со своими сессиями. Admin не имеет доступа к чужим чатам.

---

## 4. SSE-контракт

`POST /api/chat/sessions/{id}/messages` возвращает `Content-Type: text/event-stream`.

### Типы событий

```
event: token
data: {"content": "Документ"}

event: tool_start
data: {"tool": "search_documents", "args": {"query": "договор аренды"}}

event: tool_end
data: {"tool": "search_documents", "result_preview": "Найдено 3 документа..."}

event: done
data: {"message_id": 42, "session_id": 5}

event: error
data: {"message": "Не удалось получить ответ от LLM", "code": "llm_error"}
```

### Маппинг на AIKit компоненты

| SSE event | AIKit компонент | Поведение |
|-----------|----------------|-----------|
| `token` | `ThinkingMessage` / streaming content | Посимвольный вывод ответа |
| `tool_start` | `ToolMessage` (status="pending") | Показать "Ищу в документах..." |
| `tool_end` | `ToolMessage` (status="done") | Показать краткий результат |
| `done` | — | Финализировать сообщение, обновить список сессий |
| `error` | Error state в ChatContainer | Показать ошибку с кнопкой "Повторить" |

### Реализация на бэкенде

```python
from fastapi.responses import StreamingResponse

@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: int,
    body: SendMessageRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 1. Проверить что сессия принадлежит пользователю
    # 2. Сохранить user message в chat_messages
    # 3. Загрузить историю сессии (последние N сообщений)
    # 4. Запустить LangGraph граф, стримить события

    async def event_stream():
        async for event in agent_graph.astream(state):
            yield format_sse(event)

    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

### Реализация на фронтенде

```typescript
// frontend/src/api/chat.ts
const eventSource = new EventSource(url);  // Нет — POST не поддерживается EventSource

// Используем fetch + ReadableStream:
const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, style }),
});
const reader = response.body!.getReader();
// Парсить SSE-фрейм вручную (event: ...\ndata: ...\n\n)
```

---

## 5. Стиль ответа

Параметр `style` в запросе `POST /api/chat/sessions/{id}/messages`:

| Значение | System prompt дополнение | Когда использовать |
|----------|-------------------------|-------------------|
| `normal` | (без дополнения) | По умолчанию |
| `explanatory` | "Отвечай подробно с примерами и пояснениями. Разбивай сложные темы на шаги." | Обучение, разбор процесса |
| `formal` | "Отвечай в официально-деловом стиле. Используй канцелярский язык, ссылки на пункты документов." | Юридические, бухгалтерские запросы |

Переключение — фронтенд (селектор в UI чата). Значение передаётся в каждом запросе, не сохраняется на уровне сессии (пользователь может менять стиль в любой момент).

Файл: `backend/api/agent/prompts.py` (new)

```python
BASE_SYSTEM_PROMPT = """Ты — AI-ассистент корпоративной системы документооборота KornDoc.
Ты помогаешь пользователям находить документы, отвечаешь на вопросы по их содержимому
и помогаешь с задачами документооборота. Отвечай на русском языке."""

STYLE_ADDONS: dict[str, str] = {
    "normal": "",
    "explanatory": "\n\nОтвечай подробно с примерами и пояснениями. Разбивай сложные темы на шаги.",
    "formal": "\n\nОтвечай в официально-деловом стиле. Используй канцелярский язык.",
}
```

---

## 6. Вне скоупа v1

Следующие функции **явно исключены** из первой версии агента:

- **Вложения файлов в чат** — пользователь не может прикрепить файл к сообщению. Поиск идёт только по уже загруженным документам через UploadPage.
- **MCP (Model Context Protocol)** — инфраструктура готова (CLAUDE.md упоминает), но интеграция агента с MCP-серверами — пост-MVP.
- **Multi-agent** — один граф, один агент. Нет оркестрации между несколькими агентами.
- **Fine-tuned эмбеддинги** — используем `paraphrase-multilingual-mpnet-base-v2` as-is (768-dim). Дообучение — пост-MVP.
- **Gold standard / evaluation dataset** — нет эталонного набора вопросов-ответов для оценки качества.
- **DeepEval / автоматическое тестирование качества** — нет автоматизированных метрик (faithfulness, relevancy). Качество оценивается вручную.
- **Guardrails / модерация** — нет фильтрации входных/выходных сообщений. Доверяем встроенным ограничениям провайдера.
- **Streaming tool results** — инструменты возвращают результат целиком, не стримятся.
- **Голосовой ввод** — только текстовый интерфейс.

---

## 7. Этапы перехода

```
     A0 (done)          A2                  A3                    A4
┌───────────────┐  ┌──────────────┐  ┌────────────────────┐  ┌──────────────┐
│ (a) Ключи в  │→ │ (b) Прокси   │→ │ (d) LangGraph +    │→ │ (e) AIKit UI │
│ .env бэкенда  │  │ без LangGraph│  │ инструменты        │  │              │
└───────────────┘  └──────┬───────┘  └────────────────────┘  └──────────────┘
                          │
                   ┌──────▼───────┐
                   │ (c) FE на    │
                   │ прокси       │
                   └──────────────┘
```

### (a) A0 — Вынос ключей в бэкенд ✅

Ключи `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` перенесены в `.env` бэкенда. Фронтенд больше не хранит секреты.

### (b) A2 — Прокси без LangGraph

Простой эндпоинт `POST /api/chat/sessions/{id}/messages` → SSE. Внутри: ChatLLM.stream() с историей из БД. Без инструментов, без графа. Цель — проверить SSE-контракт и персистентность.

**Файлы (new):** `backend/shared/llm.py`, `backend/api/routers/chat.py`  
**Файлы (edit):** `backend/shared/config.py`, `backend/shared/models.py`, `backend/api/main.py`  
**Миграция:** `add_chat_sessions_and_messages`

### (c) A3 (часть 1) — Фронтенд на прокси

`AIAssistantPage.tsx` переключается с прямого вызова DeepSeek на `POST /api/chat/sessions/{id}/messages`. Парсит SSE. Показывает историю сессий.

**Файлы (edit):** `frontend/src/pages/AIAssistantPage.tsx`, `frontend/src/api/chat.ts` (new)

### (d) A3 (часть 2) — LangGraph + инструменты

Заменить прямой ChatLLM.stream() на LangGraph граф. Добавить `search_documents` и `search_faq`. SSE-контракт не меняется — фронтенд не знает о переходе.

**Файлы (new):** `backend/api/agent/` (вся директория)  
**Файлы (edit):** `backend/api/routers/chat.py` (подключить граф вместо прямого вызова)

### (e) A4 — AIKit UI

Заменить кастомный ChatContainer на полноценные AIKit компоненты (ThinkingMessage, ToolMessage). Добавить панель сессий, селектор стиля.

**Файлы (edit):** `frontend/src/pages/AIAssistantPage.tsx`, компоненты чата

---

## 8. Риски и открытые вопросы

### Риски

| Риск | Вероятность | Влияние | Митигация |
|------|------------|---------|-----------|
| DeepSeek API нестабилен / медленный из РФ | Средняя | Высокое | ChatLLM абстракция позволяет переключиться на local за 3 env-переменные |
| LangGraph добавляет латентность (3-5 шагов вместо 1 вызова) | Высокая | Среднее | SSE стримит каждый шаг → пользователь видит прогресс; `tool_start`/`tool_end` дают обратную связь |
| Qdrant поиск из tool медленнее чем из роутера (доп. сериализация) | Низкая | Низкое | Переиспользуем ту же логику поиска, overhead минимален |
| История чата растёт бесконечно → длинный context window | Средняя | Среднее | Ограничить историю последними 20 сообщениями в промпте; старые сообщения в БД, но не в контексте |

### Открытые вопросы

1. **Контекстное окно для истории** — сколько сообщений включать в контекст LLM? Предложение: 20 последних. Решение может быть принято при имплементации A2.
2. **Авто-заголовок сессии** — генерировать title сессии из первого сообщения пользователя? Предложение: да, через отдельный LLM-вызов (1 sentence summary). Реализовать в A2.
3. **Rate limiting** — нужен ли лимит на количество сообщений в минуту? Предложение: 10 msg/min на пользователя, реализовать в A2 через Redis counter.
4. **FAQ источник** — откуда берётся контент для `search_faq`? Предложение: статический YAML файл `docs/faq.yml` на первом этапе, Qdrant коллекция "faq" позже.

---

## Приложение: Затрагиваемые файлы (сводка по всем этапам)

| Файл | Действие | Этап |
|------|----------|------|
| `backend/shared/config.py` | edit — добавить LLM settings | A2 |
| `backend/shared/models.py` | edit — добавить ChatSession, ChatMessage | A2 |
| `backend/shared/llm.py` | new — ChatLLM класс | A2 |
| `backend/api/main.py` | edit — ChatLLM в lifespan, include chat router | A2 |
| `backend/api/routers/chat.py` | new — CRUD сессий + SSE messages | A2 |
| `backend/api/agent/__init__.py` | new | A3 |
| `backend/api/agent/state.py` | new — AgentState | A3 |
| `backend/api/agent/graph.py` | new — LangGraph граф | A3 |
| `backend/api/agent/nodes.py` | new — узлы графа | A3 |
| `backend/api/agent/tools.py` | new — search_documents, search_faq | A3 |
| `backend/api/agent/prompts.py` | new — system prompts по стилям | A3 |
| `frontend/src/api/chat.ts` | new — API клиент для чата | A3/A4 |
| `frontend/src/pages/AIAssistantPage.tsx` | edit — SSE вместо прямого вызова | A3/A4 |
| `alembic/versions/XXXX_add_chat_sessions_and_messages.py` | new | A2 |
| `.env.example` | edit — добавить LLM_* переменные | A2 |
