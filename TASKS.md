# TASKS.md — План реализации: Корпоративное хранилище документов

## Статусы
- `[ ]` — не начато
- `[~]` — в процессе (агент взял задачу)
- `[x]` — выполнено и закоммичено

## Правила декомпозиции
- Каждая задача — один атомарный коммит
- Задача считается выполненной только если код запускается без ошибок
- Зависимости указаны явно — не начинай задачу если зависимость не выполнена

---

## БЛОК 1 — Инфраструктура и скелет проекта

### TASK-001 — Структура директорий и конфигурация окружения
**Зависимости:** нет
**Файлы к созданию:**
- Полное дерево директорий согласно CLAUDE.md секция 2
- `.env.example` со всеми переменными из CLAUDE.md секция 3
- `.env` (копия `.env.example`, значения по умолчанию для dev)
- `.gitignore` (python, node, .env, __pycache__, dist, *.pyc)

**Проверка:** `ls -R` показывает правильную структуру, `.env` существует

**Статус:** `[x]`

---

### TASK-002 — Docker Compose и базовые Dockerfile
**Зависимости:** TASK-001
**Файлы к созданию:**
- `docker-compose.yml` — все сервисы из CLAUDE.md секция 9
- `backend/api/Dockerfile` — Python 3.12-slim, копирует shared/, устанавливает requirements
- `backend/worker/Dockerfile` — аналогично, плюс системные зависимости для Tesseract
- `nginx/nginx.conf` — proxy /api/* → api:8000, статика, client_max_body_size 50m
- `backend/api/requirements.txt` — fastapi, uvicorn, sqlalchemy[asyncio], asyncpg, alembic, pydantic-settings, python-jose, passlib[bcrypt], httpx, boto3, qdrant-client, sentence-transformers
- `backend/worker/requirements.txt` — celery, redis, sqlalchemy[asyncio], asyncpg, PyMuPDF, python-docx, openpyxl, pytesseract, sentence-transformers, boto3, qdrant-client, pydantic-settings

**Проверка:** `docker-compose config` выполняется без ошибок

**Статус:** `[x]`

---

### TASK-003 — Shared: config, database, models
**Зависимости:** TASK-002
**Файлы к созданию:**
- `backend/shared/config.py` — pydantic-settings Settings, читает все переменные из .env
- `backend/shared/database.py` — async SQLAlchemy engine, AsyncSession, get_db dependency
- `backend/shared/models.py` — ORM модели User, Document, AuditLog точно по CLAUDE.md секция 4
- `backend/shared/__init__.py`

**Детали:**
- `database.py`: `create_async_engine`, `async_sessionmaker`, `AsyncSession`
- `models.py`: все поля включая `tags: Mapped[list[str]]` через JSONB, `details: Mapped[dict]` через JSONB

**Проверка:** `python3 -c "from shared.models import User, Document, AuditLog; print('OK')"` из backend/

**Статус:** `[x]`

---

### TASK-004 — Alembic: миграции и первый запуск БД
**Зависимости:** TASK-003
**Файлы к созданию:**
- `backend/alembic.ini`
- `backend/alembic/env.py` — с async engine, импортирует все модели
- `backend/alembic/versions/0001_initial.py` — первая автогенерированная миграция

**Файлы к обновлению:**
- `backend/api/Dockerfile` — добавить `alembic upgrade head` в entrypoint или отдельный скрипт

**Проверка:** `docker-compose up -d postgres && docker-compose run --rm api alembic upgrade head` — без ошибок, таблицы созданы

**Статус:** `[x]`

---

## БЛОК 2 — Backend API

### TASK-005 — Auth: security utilities + /api/auth роутер
**Зависимости:** TASK-004
**Файлы к созданию:**
- `backend/shared/security.py` — hash_password, verify_password, create_access_token, decode_token, get_current_user dependency
- `backend/api/routers/auth.py` — POST /login, GET /me
- `backend/api/main.py` — FastAPI app с lifespan, подключает auth роутер, healthcheck GET /health

**Детали:**
- `lifespan`: инициализировать embedding-модель как синглтон в `app.state.embedder`
- Middleware: CORS для dev (allow all origins)
- `/login` возвращает `{ access_token, token_type, user: { id, email, username, role } }`

**Проверка:** `docker-compose up -d api && curl http://localhost:8000/health` → `{"status":"ok"}`

**Статус:** `[x]`

---

### TASK-006 — Admin script: создание первого пользователя
**Зависимости:** TASK-005
**Файлы к созданию:**
- `backend/scripts/create_admin.py` — CLI через argparse: --email, --password, --username
  Создаёт пользователя с role="admin" через прямой запрос к БД (не через API)

**Проверка:**
```bash
docker-compose exec api python scripts/create_admin.py \
  --email admin@test.com --password admin123 --username admin
# Затем:
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'
# → получить access_token
```

**Статус:** `[x]`

---

### TASK-007 — MinIO utilities + Documents: upload и download
**Зависимости:** TASK-006
**Файлы к созданию:**
- `backend/shared/minio_client.py` — get_minio_client(), upload_file(), download_file(), delete_file(), ensure_bucket()
- `backend/api/routers/documents.py`:
  - POST /api/documents/upload — multipart, валидация 50MB и типа файла, сохранить в MinIO, создать запись Document(status="pending"), вернуть document_id
  - GET /api/documents/{id} — метаданные
  - GET /api/documents/{id}/download — стрим файла из MinIO
  - GET /api/documents/{id}/status — только status и error_message
  - GET /api/documents/ — список с пагинацией (page, limit) и фильтрами (status, file_type)

**Детали:**
- При upload сразу после сохранения вызывать `process_document.delay(document_id)` (импорт задачи)
- AuditLog запись на каждый download

**Проверка:** загрузить PDF через curl, получить 200, document_id в ответе

**Статус:** `[x]`

---

### TASK-008 — Celery Worker: pipeline обработки документов
**Зависимости:** TASK-007
**Файлы к созданию:**
- `backend/worker/celery_app.py` — инициализация Celery, Redis broker, загрузка embedding-модели как модульный синглтон при импорте
- `backend/worker/tasks/process_document.py` — полный pipeline из CLAUDE.md секция 6:
  1. MinIO download во tmpdir
  2. status → "processing"
  3. Парсинг по типу (PyMuPDF / python-docx / openpyxl / plain text)
  4. OCR fallback для PDF без текстового слоя (pytesseract)
  5. Chunking: 512*4=2048 символов, overlap 256 символов
  6. Embedding каждого чанка через синглтон модели
  7. Upsert в Qdrant с payload {document_id, title, chunk_index, text_snippet}
  8. Обновить Document: status="indexed", chunk_count, indexed_at
  9. При ошибке: status="error", error_message, retry через 60 сек

**Детали:**
- Qdrant коллекция создаётся при первом запуске если не существует: vectors size=768 (mpnet), Distance.COSINE
- Синглтон модели: `_model = None` на уровне модуля, инициализируется при первом вызове задачи

**Проверка:** загрузить документ → `docker-compose logs -f worker` → видно прогресс → через ~30 сек GET /status → "indexed"

**Статус:** `[x]`

---

### TASK-009 — Search API
**Зависимости:** TASK-008
**Файлы к созданию:**
- `backend/api/routers/search.py`:
  - POST /api/search/ — алгоритм из CLAUDE.md секция 7
  - GET /api/search/suggest?q= — ILIKE по Document.title, возвращает список строк

**Детали алгоритма поиска:**
1. AuditLog(action="search", details={"query": query.query})
2. `app.state.embedder.encode([query.query])[0]` → вектор
3. `qdrant.search(collection, vector, limit=query.limit*2, query_filter=...)`
4. Дедупликация: dict by document_id, оставить с max score
5. JOIN с PostgreSQL — получить title, filename, uploaded_at
6. Фильтры если переданы: file_type через qdrant payload filter, date через PostgreSQL WHERE
7. Вернуть `SearchResponse(results=[...], total=N, query_time_ms=T)`

**Проверка:** POST /api/search с query из текста загруженного документа → score > 0.5

**Статус:** `[x]`

---

### TASK-010 — Admin API
**Зависимости:** TASK-009
**Файлы к созданию:**
- `backend/api/routers/admin.py`:
  - GET /api/admin/users — список пользователей
  - POST /api/admin/users — создать пользователя (только admin)
  - PATCH /api/admin/users/{id} — изменить role / is_active
  - DELETE /api/admin/users/{id} — деактивировать (is_active=False, не удалять)
  - GET /api/admin/stats — { total_docs, indexed_docs, error_docs, total_users, searches_today }
  - GET /api/admin/audit-logs — пагинация + фильтры user_id, action, date_from, date_to
  - POST /api/admin/reindex/{id} — сбросить статус в "pending", запустить задачу заново
  - GET /api/admin/system/health — ping к postgres/redis/qdrant/minio, вернуть статус каждого

**Детали:** dependency `require_admin` = `get_current_user` + проверка `user.role == "admin"`, иначе 403

**Проверка:** GET /api/admin/stats с admin JWT → корректные числа

**Статус:** `[x]`

---

## БЛОК 3 — Frontend

### TASK-011 — Frontend: скелет проекта + роутинг + Layout
**Зависимости:** TASK-005 (нужен работающий /api/auth/login)
**Файлы к созданию:**
- `frontend/package.json` — зависимости: react 18, typescript, vite, @gravity-ui/uikit, @gravity-ui/icons, @gravity-ui/date-components, @tanstack/react-query, react-router-dom, axios
- `frontend/vite.config.ts` — proxy /api → http://api:8000 (или localhost:8000 для dev)
- `frontend/tsconfig.json`
- `frontend/src/main.tsx` — ThemeProvider + QueryClientProvider + BrowserRouter + import стилей Gravity UI
- `frontend/src/App.tsx` — все роуты: /, /upload, /documents, /admin, /login
- `frontend/src/api/client.ts` — axios instance с JWT интерцептором (из PROMPT.md)
- `frontend/src/components/Layout.tsx` — sidebar (Поиск/Загрузить/Документы/Администрирование) + header (имя пользователя, роль, logout)
- `frontend/src/components/PrivateRoute.tsx` — редирект на /login если нет токена
- `frontend/src/hooks/useAuth.ts` — useQuery для /api/auth/me, хелперы login/logout

**Проверка:** `npm run dev` запускается, http://localhost:5173 показывает страницу логина

**Статус:** `[x]`

---

### TASK-012 — Frontend: LoginPage
**Зависимости:** TASK-011
**Файлы к созданию:**
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/api/auth.ts` — функции loginUser, getMe

**UI (Gravity UI компоненты):**
- `Card` по центру страницы
- `TextInput` для email, `TextInput` type="password" для пароля
- `Button` для входа (loading состояние)
- `Alert` для ошибки (неверные данные)
- После успеха: сохранить токен в localStorage → редирект на /

**Проверка:** войти под admin@test.com/admin123 → редирект на / → в header видно имя пользователя

**Статус:** `[x]`

---

### TASK-013 — Frontend: SearchPage (главная)
**Зависимости:** TASK-012
**Файлы к созданию:**
- `frontend/src/pages/SearchPage.tsx`
- `frontend/src/api/search.ts` — searchDocuments, getSuggestions
- `frontend/src/components/SearchResultCard.tsx`
- `frontend/src/components/SearchFilters.tsx`

**UI:**
- `TextInput` с иконкой поиска + кнопка "Поиск" (Enter тоже работает)
- `Select` для типа файла, `Select` для отдела, DatePicker из @gravity-ui/date-components для периода
- Список `SearchResultCard`: иконка типа файла, название, скор (Badge), snippet с `<mark>` подсветкой, дата, кнопки "Скачать" и "Подробнее"
- Состояния: loading (Skeleton), empty (Text "Ничего не найдено"), error (Alert)
- Счётчик результатов и время запроса

**Проверка:** найти по тексту из загруженного документа → карточка с корректным сниппетом

**Статус:** `[~]`

---

### TASK-014 — Frontend: UploadPage
**Зависимости:** TASK-012
**Файлы к созданию:**
- `frontend/src/pages/UploadPage.tsx`
- `frontend/src/api/documents.ts` — uploadDocument, getDocumentStatus, getDocuments, deleteDocument

**UI:**
- Drag & drop зона (нативный HTML5 dragover/drop + click для выбора файла)
- Поддержка множественной загрузки
- `Select` для отдела, теги через `TextInput` + Enter добавляет тег, `Label` компонент для тегов
- Очередь загрузки: список файлов со статусом — иконка (✅/⏳/❌), название, статус текстом
- Polling каждые 2 секунды для файлов со статусом "pending" или "processing" через useQuery refetchInterval
- Прогресс-бар для самого HTTP upload (axios onUploadProgress)

**Проверка:** загрузить PDF → видеть "Обрабатывается..." → через ~30 сек "Индексирован"

**Статус:** `[ ]`

---

### TASK-015 — Frontend: DocumentsPage
**Зависимости:** TASK-014
**Файлы к созданию:**
- `frontend/src/pages/DocumentsPage.tsx`
- `frontend/src/components/DocumentTable.tsx`

**UI (Gravity UI `Table` компонент):**
- Колонки: иконка типа, название (кликабельное → скачать), тип, размер (форматированный), статус (Badge с цветом), дата, кто загрузил
- Сортировка по названию, дате, размеру
- Пагинация (Gravity UI `Pagination`)
- Поиск по названию (debounced TextInput)
- Для admin: кнопки Delete (с подтверждением через Modal) и Reindex
- Toast уведомления через Gravity UI `toaster` на все операции

**Проверка:** таблица показывает загруженные документы, удаление работает у admin

**Статус:** `[ ]`

---

### TASK-016 — Frontend: AdminPage
**Зависимости:** TASK-015
**Файлы к созданию:**
- `frontend/src/pages/AdminPage.tsx`
- `frontend/src/api/admin.ts` — getUsers, createUser, updateUser, getStats, getAuditLogs, getHealth
- `frontend/src/components/admin/UsersTab.tsx`
- `frontend/src/components/admin/StatsTab.tsx`
- `frontend/src/components/admin/AuditLogTab.tsx`
- `frontend/src/components/admin/HealthTab.tsx`

**UI:**
- `Tabs` компонент: Пользователи / Статистика / Журнал действий / Здоровье системы
- **Пользователи:** таблица + Modal с формой создания (email, username, password, role)
- **Статистика:** `Card` карточки (всего документов, проиндексировано, ошибки, пользователей, поисков сегодня) + обновление каждые 30 сек
- **Журнал действий:** таблица с фильтрами, пагинацией
- **Здоровье:** карточка каждого сервиса (PostgreSQL/Redis/Qdrant/MinIO), зелёный/красный статус, polling каждые 10 сек

**Проверка:** все 4 вкладки загружаются с данными, создание пользователя работает

**Статус:** `[ ]`

---

## БЛОК 4 — Сборка и интеграция

### TASK-017 — Frontend Dockerfile + Nginx финальная конфигурация
**Зависимости:** TASK-016
**Файлы к созданию/обновлению:**
- `frontend/Dockerfile` — multi-stage: node:20-alpine для build, nginx:alpine для serve
- `nginx/nginx.conf` — финальная версия: /api/* → api:8000, /* → frontend статика, gzip, правильные заголовки кеширования
- `frontend/.dockerignore`
- `backend/api/.dockerignore`
- `backend/worker/.dockerignore`

**Проверка:** `docker-compose up -d --build` → все контейнеры healthy → http://localhost работает

**Статус:** `[ ]`

---

### TASK-018 — Healthcheck и финальная интеграционная проверка
**Зависимости:** TASK-017
**Что сделать:**
- Добавить `healthcheck` в docker-compose для сервисов: api, postgres, redis, qdrant
- Убедиться что `depends_on` использует `condition: service_healthy` где нужно
- Проверить полный E2E сценарий и задокументировать в `README.md`:
  1. `cp .env.example .env && docker-compose up -d`
  2. `docker-compose exec api alembic upgrade head`
  3. `docker-compose exec api python scripts/create_admin.py --email admin@company.com --password admin123 --username admin`
  4. Открыть http://localhost, войти, загрузить документ, дождаться индексации, найти через поиск
- Создать `README.md` с инструкциями запуска

**Проверка:** все пункты чеклиста из CLAUDE.md секция 11 выполнены ✅

**Статус:** `[ ]`

---

## Прогресс

```
Выполнено: 10 / 18
Блок 1 (Инфраструктура):  4/4
Блок 2 (Backend API):      6/6
Блок 3 (Frontend):         0/6
Блок 4 (Интеграция):       0/2
```
