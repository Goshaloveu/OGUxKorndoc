# CLAUDE.md — Корпоративное хранилище документов с семантическим поиском
### Репозиторий: https://github.com/Goshaloveu/OGUxKorndoc

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

**Planning phase** — no code has been written yet. The full technical specification is below. Implement it sequentially: each step must leave the system in a runnable state before proceeding to the next.

## Reference Project

`../URFU-LLM-Agent-main/` contains reusable patterns:
- `rag/rag.py` — S3/MinIO integration, text chunking, HuggingFace embedding loading pattern
- `moderation_regex/moder_api.py` — clean FastAPI + Pydantic service template
- `orchestrator/main.py` — async inter-service calls, structured logging, JWT patterns
- `compose.yml` — Docker multi-service orchestration reference

Use as reference, **not copy-paste**. Key differences from this project:
- **Qdrant** (not FAISS) — vector DB, collection size **768-dim**
- **async SQLAlchemy** (not sync)
- **Celery** (not direct calls)
- **uv** (not pip / requirements.txt)
- **MinIO self-hosted** (not Yandex S3) — same boto3 interface, only env vars differ

## Architecture Overview

```
Browser → Nginx (:80) → FastAPI api (:8000)
                      → React frontend (static dist/)

FastAPI api ──writes──→ PostgreSQL  (users, documents, audit_logs,
            │                        organizations, org_members,
            │                        document_permissions)
            ──queues──→ Redis → Celery worker
            ──search──→ Qdrant (vector search, 768-dim cosine)
            ──files───→ MinIO  (raw document storage)

Celery worker ──reads──→ MinIO      (download file for processing)
              ──writes─→ Qdrant     (upsert embeddings)
              ──writes─→ PostgreSQL (status updates)
```

**Shared code** (`backend/shared/`) is mounted into both `api` and `worker` containers — changes apply without rebuilding.

**Embedding model** (`paraphrase-multilingual-mpnet-base-v2`, **768-dim**) must be loaded **once at startup** as a singleton — in API via FastAPI `lifespan`, in Worker at module init. Never instantiate per-request or per-task.

**Document processing pipeline** (Celery task): download from MinIO → extract text (PyMuPDF / python-docx / openpyxl / pytesseract OCR fallback) → sliding-window chunk (2048 chars / 256 overlap) → embed → upsert to Qdrant with payload → update PostgreSQL status.

**Search flow**: embed query → Qdrant search with access-control payload filter → deduplicate by document_id (keep best chunk) → enrich from PostgreSQL → return `snippet_html` with `<mark>` highlights.

**Access control**: three hierarchical levels — `viewer` (search + read + download + preview) / `editor` (+ edit metadata) / `owner` (+ delete + manage permissions). Uploader is always `owner`. Admin bypasses all checks.

## Key Implementation Constraints

- All FastAPI route handlers and SQLAlchemy calls must be `async`
- Pydantic v2 everywhere: `model_config = ConfigDict(from_attributes=True)`, `@field_validator`
- Frontend: strict TypeScript — no `any`; all API calls via TanStack Query
- JWT stored in `localStorage`; sent as `Authorization: Bearer <token>`
- File size limit: 50 MB — enforced in **both** Nginx (`client_max_body_size 50m`) and FastAPI
- Gravity UI: wrap app in `<ThemeProvider theme="light">`, import both `fonts.css` and `styles.css`
- Run `uv run ruff check backend/ --fix && uv run ruff format backend/` before every commit
- Do **NOT** add Elasticsearch — 700MB–1.2GB RAM overhead, unnecessary for MVP; Qdrant alone is sufficient

---

## Project Status (RU)

**Ничего не реализовано.** Пустая директория. Реализуй строго последовательно по шагам из секции 10. Не переходи к следующему шагу пока текущий не проверен и не работает.

---

## Reference Project

`../URFU-LLM-Agent-main/` содержит переиспользуемые паттерны:
- `rag/rag.py` — S3/MinIO интеграция, чанкинг текста, загрузка HuggingFace модели
- `moderation_regex/moder_api.py` — шаблон FastAPI + Pydantic сервиса
- `orchestrator/main.py` — async межсервисные вызовы, structured logging, JWT паттерны
- `compose.yml` — Docker multi-service оркестрация как референс

Используй как образец, **не копируй напрямую**. Ключевые отличия: **Qdrant** (не FAISS), **async SQLAlchemy** (не sync), **Celery** (не прямые вызовы), **uv** (не pip/requirements.txt).

Из `.env` референсного проекта видно что там использовался Яндекс S3. В **данном проекте** используем **MinIO** (self-hosted) — все данные остаются на своих серверах. Интерфейс boto3 идентичен, поэтому паттерн работы с S3 из `rag.py` переносится без изменений, меняются только env-переменные.

---

## Development Commands

```bash
# Установить зависимости (uv обязателен)
uv sync

# Старт всей инфраструктуры
docker-compose up -d

# Миграции БД (после первого старта и после изменений models.py)
docker-compose exec api alembic upgrade head

# Новая миграция после изменения models.py
docker-compose exec api alembic revision --autogenerate -m "description"

# Создать первого admin-пользователя
docker-compose exec api python scripts/create_admin.py \
  --email admin@company.com --password admin123 --username admin

# Логи воркера (там видна обработка документов)
docker-compose logs -f worker

# Логи API
docker-compose logs -f api

# Перезапустить один сервис
docker-compose restart api

# Линтинг и форматирование (ruff — перед каждым коммитом)
uv run ruff check backend/ --fix
uv run ruff format backend/

# Frontend dev (локально вне Docker)
cd frontend && npm install && npm run dev

# Проверка TypeScript компиляции
cd frontend && npm run build
```

---

## Git и CI/CD

Репозиторий: **https://github.com/Goshaloveu/OGUxKorndoc**

### Правила коммитов
Каждый коммит должен:
1. Содержать изменения только одной задачи из TASKS.md
2. Проходить `ruff check` без ошибок
3. Иметь префикс по типу: `feat:`, `fix:`, `infra:`

```bash
git add -A
git commit -m "feat: TASK-XXX краткое описание"
git push origin main
```

### GitHub Actions (создать `.github/workflows/ci.yml`)

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ghcr.io/goshaloveu/oguxkorndoc

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - run: uv sync --dev
      - run: uv run ruff check backend/
      - run: uv run ruff format --check backend/

  build-and-push:
    needs: lint
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write
    strategy:
      matrix:
        service: [api, worker]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          file: backend/${{ matrix.service }}/Dockerfile
          push: true
          tags: |
            ${{ env.IMAGE_PREFIX }}-${{ matrix.service }}:latest
            ${{ env.IMAGE_PREFIX }}-${{ matrix.service }}:${{ github.sha }}

  build-frontend:
    needs: lint
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: frontend/
          push: true
          tags: |
            ${{ env.IMAGE_PREFIX }}-frontend:latest
            ${{ env.IMAGE_PREFIX }}-frontend:${{ github.sha }}
```

---

## Architecture Overview

```
Browser
  │
  ▼
Nginx :80
  ├── /api/*  → FastAPI api :8000
  └── /*      → React frontend (static dist/)
               client_max_body_size 50m  ← обязательно

FastAPI API :8000
  ├── /api/auth/*           JWT аутентификация
  ├── /api/documents/*      загрузка, скачивание, метаданные, права
  ├── /api/search/*         семантический поиск
  ├── /api/organizations/*  управление организациями
  ├── /api/profile/*        профиль пользователя
  └── /api/admin/*          управление системой (только admin)

  ──writes──→ PostgreSQL  (users, documents, audit_logs,
  │                        organizations, org_members,
  │                        document_permissions)
  ──queues──→ Redis → Celery worker
  ──search──→ Qdrant  (коллекция "documents", вектор 768-dim)
  ──files───→ MinIO   (сырые файлы документов)

Celery Worker
  ──reads──→ MinIO      (скачать файл)
  ──writes─→ Qdrant     (записать эмбеддинги)
  ──writes─→ PostgreSQL (обновить статус)
```

**Shared code** (`backend/shared/`) монтируется в оба контейнера через volume — изменения применяются без пересборки.

**Embedding model** (`paraphrase-multilingual-mpnet-base-v2`, вектор **768-dim**) загружается **один раз при старте** в API (lifespan) и в Worker (инициализация модуля). Не создавать новый экземпляр на каждый запрос.

**Qdrant коллекция** создаётся при первом старте API:
```python
VectorParams(size=768, distance=Distance.COSINE)
```
При смене модели на другую с иным размером вектора — дропнуть коллекцию и переиндексировать.

**Замена эмбеддера** — меняешь `EMBEDDING_MODEL` и `EMBEDDING_DIM` в `.env`, дропаешь коллекцию, запускаешь переиндексацию. Рефакторинга кода не требуется.

---

## Key Implementation Constraints

### Python / Backend

**Async везде — без исключений:**
```python
# ✅
async def get_doc(doc_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    return result.scalar_one_or_none()
# ❌ заблокирует event loop
def get_doc(doc_id: int, db: Session = Depends(get_db)):
    return db.query(Document).filter(...).first()
```

**Pydantic v2 — синтаксис изменился:**
```python
# ✅
class DocumentSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    @field_validator('file_type')
    @classmethod
    def validate_type(cls, v): ...
# ❌
class DocumentSchema(BaseModel):
    class Config:
        orm_mode = True
```

**Embedding как синглтон через lifespan:**
```python
# backend/api/main.py
from contextlib import asynccontextmanager
from sentence_transformers import SentenceTransformer

ml_models: dict = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    ml_models["embedder"] = SentenceTransformer(settings.embedding_model)
    app.state.embedder = ml_models["embedder"]
    yield
    ml_models.clear()

app = FastAPI(lifespan=lifespan)
```

**50MB лимит — в Nginx И в FastAPI:**
```python
@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    if file.size and file.size > 52_428_800:
        raise HTTPException(413, "Файл превышает 50 MB")
```
```nginx
client_max_body_size 50m;
```

**Ruff — перед каждым коммитом:**
```bash
uv run ruff check backend/ --fix && uv run ruff format backend/
```
Конфигурация в `pyproject.toml`:
```toml
[tool.ruff]
line-length = 100
target-version = "py312"
[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "SIM"]
```

### Frontend / TypeScript

**Никаких `any`** — строгая типизация, все интерфейсы в `src/types/`.

**Gravity UI — обязательный бойлерплейт:**
```tsx
// src/main.tsx
import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';
import { ThemeProvider } from '@gravity-ui/uikit';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme="light">
    <App />
  </ThemeProvider>
);
```

**Axios instance с JWT интерцептором:**
```typescript
// src/api/client.ts
const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
```

---

# Техническое задание

---

## 0. Контекст

```bash
find ../URFU-LLM-Agent-main -name "*.py" | head -40
cat ../URFU-LLM-Agent-main/README.md 2>/dev/null || true
```

Изучи структуру до начала реализации. Адаптируй паттерны, не копируй.

---

## 1. Стек технологий

### Backend (только Python)
| Компонент | Технология |
|-----------|-----------|
| API фреймворк | **FastAPI** + Uvicorn |
| Валидация | **Pydantic v2** |
| ORM | **SQLAlchemy 2.0** (async) + Alembic |
| БД | **PostgreSQL 16** |
| Векторная БД | **Qdrant** (qdrant-client), вектор **768-dim** |
| Очередь задач | **Celery** + Redis брокер |
| Файловое хранилище | **MinIO** self-hosted (boto3) |
| Парсинг | **PyMuPDF** (PDF), **python-docx** (DOCX), **openpyxl** (XLSX) |
| OCR | **pytesseract** + Tesseract, fallback для scan-PDF |
| Эмбеддинги | **sentence-transformers** (`paraphrase-multilingual-mpnet-base-v2`, 768-dim) |
| Аутентификация | **python-jose** (JWT) + **passlib** (bcrypt) |
| HTTP-клиент | **httpx** |
| Линтер | **ruff** |
| Зависимости | **uv** + `pyproject.toml` |

### Frontend
| Компонент | Технология |
|-----------|-----------|
| Фреймворк | **React 18** + TypeScript + Vite |
| UI | **Gravity UI** (`@gravity-ui/uikit`) |
| Стейт / запросы | **TanStack Query v5** |
| Роутинг | **React Router v6** |
| Иконки | **@gravity-ui/icons** |
| Датапикер | **@gravity-ui/date-components** |
| HTTP | **axios** |

### Инфраструктура
- **Docker + Docker Compose**
- **GitHub Actions** → GHCR
- **Nginx** — прокси + фронт
- **Redis** — Celery брокер + кеш

---

## 2. Структура проекта

```
docsearch/
├── CLAUDE.md
├── TASKS.md
├── LOOP_PROMPT.md
├── docker-compose.yml
├── docker-compose.prod.yml       ← образы из GHCR
├── pyproject.toml                ← uv + ruff конфиг
├── uv.lock
├── .env.example
├── .env
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/
│       │   ├── client.ts
│       │   ├── auth.ts
│       │   ├── documents.ts
│       │   ├── search.ts
│       │   ├── admin.ts
│       │   ├── organizations.ts
│       │   └── profile.ts
│       ├── components/
│       ├── pages/
│       │   ├── SearchPage.tsx
│       │   ├── UploadPage.tsx
│       │   ├── DocumentsPage.tsx
│       │   ├── ProfilePage.tsx
│       │   ├── AdminPage.tsx
│       │   └── LoginPage.tsx
│       ├── hooks/
│       └── types/
│
├── backend/
│   ├── shared/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   └── security.py
│   │
│   ├── api/
│   │   ├── Dockerfile
│   │   ├── pyproject.toml
│   │   ├── main.py
│   │   └── routers/
│   │       ├── auth.py
│   │       ├── documents.py
│   │       ├── search.py
│   │       ├── organizations.py
│   │       ├── profile.py
│   │       └── admin.py
│   │
│   ├── worker/
│   │   ├── Dockerfile
│   │   ├── pyproject.toml
│   │   ├── celery_app.py
│   │   └── tasks/
│   │       ├── process_document.py
│   │       └── indexing.py
│   │
│   ├── scripts/
│   │   └── create_admin.py
│   │
│   └── alembic/
│       ├── alembic.ini
│       └── versions/
│
└── nginx/
    └── nginx.conf
```

---

## 3. Переменные окружения (.env.example)

```env
# PostgreSQL
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=docsearch
POSTGRES_USER=docsearch
POSTGRES_PASSWORD=docsearch_secret

# Redis
REDIS_URL=redis://redis:6379/0

# MinIO (self-hosted S3, данные остаются на своих серверах)
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=documents
MINIO_SECURE=false
# Для переезда на облако — только эти 5 строк:
# MINIO_ENDPOINT=storage.yandexcloud.net
# MINIO_ACCESS_KEY=<yc_access_key>
# MINIO_SECRET_KEY=<yc_secret_key>
# MINIO_BUCKET=<bucket_name>
# MINIO_SECURE=true

# Qdrant
QDRANT_HOST=qdrant
QDRANT_PORT=6333
QDRANT_COLLECTION=documents

# JWT
SECRET_KEY=supersecretkey_change_in_production_minimum_32_chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Embedding — меняй только здесь, рефакторинг кода не нужен
EMBEDDING_MODEL=paraphrase-multilingual-mpnet-base-v2
EMBEDDING_DIM=768
CHUNK_SIZE=2048
CHUNK_OVERLAP=256

# App
ENVIRONMENT=development
LOG_LEVEL=INFO
```

---

## 4. Модели данных (PostgreSQL)

```python
# backend/shared/models.py

class User(Base):
    __tablename__ = "users"
    id: Mapped[int]          # PK
    email: Mapped[str]       # unique
    username: Mapped[str]    # unique
    hashed_password: Mapped[str]
    role: Mapped[str]        # "admin" | "user"
    is_active: Mapped[bool] = True
    created_at: Mapped[datetime]
    last_login: Mapped[datetime | None]

class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[int]
    name: Mapped[str]
    slug: Mapped[str]        # unique, для идентификации
    created_by: Mapped[int]  # FK → users.id
    created_at: Mapped[datetime]

class OrganizationMember(Base):
    __tablename__ = "organization_members"
    id: Mapped[int]
    org_id: Mapped[int]      # FK → organizations.id
    user_id: Mapped[int]     # FK → users.id
    role: Mapped[str]        # "owner" | "member"
    joined_at: Mapped[datetime]
    # UNIQUE(org_id, user_id)

class Document(Base):
    __tablename__ = "documents"
    id: Mapped[int]
    title: Mapped[str]
    filename: Mapped[str]
    file_type: Mapped[str]         # "pdf" | "docx" | "xlsx" | "txt"
    file_size: Mapped[int]         # байты
    minio_path: Mapped[str]
    folder_path: Mapped[str] = "/"  # пример: "/юридический/договоры/"
    status: Mapped[str]            # "pending"|"processing"|"indexed"|"error"
    error_message: Mapped[str | None]
    uploaded_by: Mapped[int]       # FK → users.id
    org_id: Mapped[int | None]     # FK → organizations.id, None = личный
    uploaded_at: Mapped[datetime]
    updated_at: Mapped[datetime]
    indexed_at: Mapped[datetime | None]
    page_count: Mapped[int | None]
    chunk_count: Mapped[int | None]
    tags: Mapped[list[str]]        # JSONB
    department: Mapped[str | None]

class DocumentPermission(Base):
    """
    Управление доступом к документу.

    Три уровня доступа (иерархические — каждый включает права предыдущего):
      viewer — видит в поиске + читает метаданные + скачивает + открывает превью
      editor — всё что viewer + меняет метаданные (название, теги, папку) + переиндексирует
      owner  — всё что editor + удаляет документ + управляет правами

    Правила:
      - Загрузивший документ автоматически получает уровень "owner"
      - Admin видит все документы без явных записей здесь
      - Право выдаётся либо конкретному пользователю (user_id),
        либо всей организации (org_id) — ровно одно из двух, не оба
    """
    __tablename__ = "document_permissions"
    id: Mapped[int]
    document_id: Mapped[int]       # FK → documents.id, CASCADE DELETE
    user_id: Mapped[int | None]    # FK → users.id       (либо user_id)
    org_id: Mapped[int | None]     # FK → organizations.id (либо org_id)
    level: Mapped[str]             # "viewer" | "editor" | "owner"
    granted_by: Mapped[int]        # FK → users.id
    granted_at: Mapped[datetime]
    # CHECK: (user_id IS NOT NULL) != (org_id IS NOT NULL)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int]
    user_id: Mapped[int]           # FK → users.id
    action: Mapped[str]            # "upload"|"search"|"download"|"delete"|"login"|"share"
    resource_type: Mapped[str]
    resource_id: Mapped[str | None]
    details: Mapped[dict]          # JSONB
    ip_address: Mapped[str | None]
    created_at: Mapped[datetime]
```

**Dependency для проверки доступа** (использовать во всех document-эндпоинтах):
```python
# backend/api/dependencies.py

LEVEL_RANK = {"viewer": 1, "editor": 2, "owner": 3}

async def check_document_access(
    document_id: int,
    required_level: str,  # "viewer" | "editor" | "owner"
    current_user: User,
    db: AsyncSession,
) -> Document:
    doc = await db.get(Document, document_id)
    if not doc:
        raise HTTPException(404)

    # 1. Admin — полный доступ
    if current_user.role == "admin":
        return doc

    # 2. Загрузивший документ — всегда owner
    if doc.uploaded_by == current_user.id:
        return doc

    # 3. Явная запись в document_permissions для пользователя
    # 4. Запись для любой организации в которой состоит пользователь
    # Если нашли — проверить LEVEL_RANK[found_level] >= LEVEL_RANK[required_level]

    raise HTTPException(403, "Нет доступа к документу")
```

---

## 5. API эндпоинты

### Auth  `/api/auth`
```
POST /login       → { access_token, token_type, user }
GET  /me          → текущий пользователь
```

### Documents  `/api/documents`
```
GET    /                    список (только доступные viewer+)
                            фильтры: status, file_type, folder_path, org_id, date_from, date_to
POST   /upload              multipart: file, title?, tags?, folder_path?, org_id?
                            создаёт DocumentPermission(level="owner"), запускает Celery
GET    /{id}                метаданные + access_level текущего пользователя
GET    /{id}/download       файл из MinIO (viewer+)
GET    /{id}/status         { status, error_message, chunk_count }
GET    /{id}/preview        { text: str, page_count: int } — первые 3000 символов
PATCH  /{id}                обновить title, tags, folder_path, department (editor+)
DELETE /{id}                owner или admin

GET    /{id}/permissions    список выданных прав (owner+)
POST   /{id}/permissions    { user_id|org_id, level } — выдать доступ (owner+)
DELETE /{id}/permissions/{perm_id}  отозвать доступ (owner+)
```

### Search  `/api/search`
```
POST /
  body:     { query, limit=10, filters: { file_type?, folder_path?, department?, org_id?, date_from?, date_to? } }
  response: { results: [{ document_id, title, snippet_html, score, file_type, folder_path, uploaded_at, access_level }], total, query_time_ms }
  Поиск только по документам к которым есть viewer+

GET /suggest?q=   автодополнение по названиям (только доступные)
```

### Organizations  `/api/organizations`
```
GET    /              мои организации
POST   /              создать организацию
GET    /{id}          детали + список участников
POST   /{id}/members  добавить участника { user_id, role }
DELETE /{id}/members/{uid}  удалить участника (org owner или admin)
```

### Profile  `/api/profile`
```
GET    /               { user, my_documents_count, recent_uploads, recent_searches }
GET    /documents      мои загруженные документы (пагинация)
PATCH  /               обновить username, email
POST   /change-password  { old_password, new_password }
```

### Admin  `/api/admin`  (только role="admin")
```
GET    /users                список всех пользователей
POST   /users                создать пользователя
PATCH  /users/{id}           изменить role / is_active
DELETE /users/{id}           деактивировать (is_active=False)
GET    /organizations        список всех организаций
GET    /stats                { total_docs, indexed_docs, error_docs, total_users, searches_today }
GET    /audit-logs           пагинация + фильтры (user_id, action, date_from, date_to)
POST   /reindex/{id}         сбросить статус → "pending", запустить задачу
GET    /system/health        { postgres, qdrant, redis, minio } — статус каждого
```

---

## 6. Celery: pipeline обработки документа

```python
# backend/worker/tasks/process_document.py

@celery_app.task(bind=True, max_retries=3)
def process_document(self, document_id: int):
    # 1. Скачать из MinIO во tmpdir
    # 2. status → "processing"
    # 3. Извлечь текст по типу:
    #    .pdf  → PyMuPDF. Если strip() пуст → pytesseract OCR
    #    .docx → python-docx
    #    .xlsx → openpyxl (ячейки через "\t".join)
    #    .txt  → read()
    # 4. Chunking (sliding window):
    #    size = settings.chunk_size   (символы, default 2048)
    #    overlap = settings.chunk_overlap (default 256)
    # 5. Embed через синглтон модели (загружен при инициализации воркера)
    # 6. Upsert в Qdrant:
    #    payload = {
    #      "document_id": int,
    #      "title": str,
    #      "chunk_index": int,
    #      "page": int,           # для PDF
    #      "text": str,           # полный текст чанка — нужен для сниппета
    #      "file_type": str,
    #      "folder_path": str,
    #      "uploaded_by": int,
    #      "org_id": int | None,
    #    }
    # 7. status → "indexed", indexed_at → now(), chunk_count → N
    # 8. При ошибке: status → "error", error_message → str(e), retry(countdown=60)
```

---

## 7. Семантический поиск + алгоритм подсветки сниппета

```python
# backend/api/routers/search.py

async def search(query: SearchRequest, request: Request, db: AsyncSession, user: User):
    start = time.monotonic()

    # 1. AuditLog(action="search", details={"query": query.query})
    # 2. Embed запрос
    vector = request.app.state.embedder.encode([query.query])[0].tolist()

    # 3. Построить Qdrant фильтр — ОБЯЗАТЕЛЬНО фильтровать по правам доступа:
    #    Qdrant возвращает только чанки из документов где:
    #    - payload.uploaded_by == user.id ИЛИ
    #    - payload.org_id IN (id организаций пользователя) ИЛИ
    #    - document_id IN (документы с явными viewer+ правами для user.id)
    #    Плюс пользовательские фильтры (file_type, folder_path и т.д.)

    # 4. Поиск в Qdrant: limit = query.limit * 3 (с запасом)

    # 5. Дедупликация: по document_id оставить чанк с max score

    # 6. Обогатить из PostgreSQL: title, uploaded_at, folder_path

    # 7. Сформировать snippet_html для каждого результата (см. ниже)

    # 8. Вернуть query_time_ms = int((time.monotonic() - start) * 1000)


def build_snippet(chunk_text: str, query: str, context_chars: int = 300) -> str:
    """
    Алгоритм формирования HTML-сниппета с подсветкой.

    1. Токенизировать запрос: слова длиннее 2 символов, приводить к lower
       query_tokens = [w.lower() for w in query.split() if len(w) > 2]

    2. Найти позицию первого вхождения любого токена в тексте (re.search, IGNORECASE)
       Если не найдено — взять pos = 0 (начало текста)

    3. Вырезать окно ±context_chars вокруг pos:
       start = max(0, pos - context_chars)
       end   = min(len(chunk_text), pos + context_chars)
       snippet = chunk_text[start:end]

    4. Добавить "..." если текст обрезан:
       if start > 0: snippet = "..." + snippet
       if end < len(chunk_text): snippet = snippet + "..."

    5. Обернуть все вхождения токенов в <mark>:
       for token in query_tokens:
           pattern = re.compile(re.escape(token), re.IGNORECASE)
           snippet = pattern.sub(lambda m: f"<mark>{m.group()}</mark>", snippet)

    6. Вернуть snippet — содержит только теги <mark> и текст "...", XSS-безопасно

    Пример:
      query  = "договор конфиденциальность"
      chunk  = "...настоящий Договор о неразглашении конфиденциальной информации..."
      result = "...<mark>Договор</mark> о неразглашении <mark>конфиденциальн</mark>ой информации..."
    """
```

**На фронтенде** в SearchResultCard.tsx:
```tsx
// Рендер сниппета с подсветкой
<p dangerouslySetInnerHTML={{ __html: result.snippet_html }} />
```
```css
/* mark стилизовать в index.css */
mark { background: #fff176; padding: 0 2px; border-radius: 2px; font-style: normal; }
```

---

## 8. Интерфейс фронтенда

### 8.1 SearchPage (`/`) — главная
```
┌────────────────────────────────────────────────────────┐
│  🔍  [ Введите текст или отрывок из документа...     ] │
│       [Найти]   Фильтры ▾                              │
├────────────────────────────────────────────────────────┤
│  Найдено: 12 документов  (0.3 сек)                     │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 📄  Договор о конфиденциальности.pdf      0.94  │  │
│  │  /юридический/  ·  2024-03-15  ·  Иванов И.И.   │  │
│  │  "...настоящий <mark>Договор</mark> о           │  │
│  │   неразглашении <mark>конфиденциальн</mark>ой..." │  │
│  │               [Превью]  [Скачать]  [Подробнее]  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```
- Фильтры: тип файла, папка, отдел, период
- Кнопка "Превью" → Modal:
  - PDF: `<iframe src="/api/documents/{id}/download" />` (браузер рендерит нативно)
  - DOCX/XLSX/TXT: текст из `GET /{id}/preview`, Gravity UI `Text` компонент

### 8.2 UploadPage (`/upload`)
- Drag & drop зона + множественная загрузка
- Поля: title, folder_path (Select + ввод новой), tags, department, org_id
- Очередь с polling каждые 2 сек
- Прогресс-бар через axios `onUploadProgress`

### 8.3 DocumentsPage (`/documents`)
- Переключение вида: **Таблица** | **Сетка крупная** | **Сетка мелкая**
- Таблица: настраиваемые колонки (шестерёнка → показать/скрыть):
  название, тип, размер, папка, статус, дата загрузки, дата обновления, автор
- Сортировка по любой колонке, пагинация
- Клик на название → Modal превью
- Кнопка "Поделиться" (для owner) → Modal управления доступом:
  ```
  ┌── Доступ к документу ────────────────────────────────┐
  │  👤 Иванов И.И.      owner  (вы)                     │
  │  👤 Петрова А.С.     editor  [viewer▾]  [Удалить]    │
  │  🏢 ИТ-отдел         viewer  [editor▾]  [Удалить]   │
  │                                                      │
  │  Добавить:                                           │
  │  [Пользователь или организация]  [viewer▾]  [+ Дать] │
  └──────────────────────────────────────────────────────┘
  ```

### 8.4 ProfilePage (`/profile`)
- Карточка: имя, email, роль, дата регистрации
- Форма редактирования username/email
- Смена пароля
- Таблица "Мои документы"
- Список "Мои организации" + кнопка создания новой

### 8.5 AdminPage (`/admin`)
Вкладки:
1. **Пользователи** — таблица, создание, смена роли, деактивация
2. **Статистика** — карточки, обновление каждые 30 сек
3. **Организации** — список всех в системе
4. **Журнал действий** — таблица audit_logs с фильтрами
5. **Здоровье системы** — статус PG/Redis/Qdrant/MinIO, polling каждые 10 сек

### 8.6 Layout
- Sidebar: Поиск / Загрузить / Документы / Профиль / Администрирование (только admin)
- Header: имя, роль, logout
- Toast-уведомления для всех операций

---

## 9. Docker Compose

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment: { из .env }
    healthcheck: { test: pg_isready, interval: 5s }
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    healthcheck: { test: redis-cli ping, interval: 5s }

  qdrant:
    image: qdrant/qdrant:latest
    volumes: [qdrant_data:/qdrant/storage]

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    volumes: [minio_data:/data]
    # console на :9001 в dev

  api:
    build: ./backend/api
    depends_on:
      postgres: { condition: service_healthy }
      redis:    { condition: service_healthy }
      qdrant:   { condition: service_started }
      minio:    { condition: service_started }
    environment: { из .env }
    volumes:
      - ./backend/shared:/app/shared  # hot reload без rebuild

  worker:
    build: ./backend/worker
    depends_on: (те же что api)
    environment: { из .env }
    volumes:
      - ./backend/shared:/app/shared

  frontend:
    build: ./frontend  # multi-stage: node build → nginx serve

  nginx:
    image: nginx:alpine
    ports: ["80:80"]
    depends_on: [api, frontend]
    volumes: [./nginx/nginx.conf:/etc/nginx/conf.d/default.conf]

  adminer:
    image: adminer
    ports: ["8080:8080"]
    profiles: ["dev"]
```

**nginx.conf:** `/api/*` → `api:8000`, `/*` → frontend, `client_max_body_size 50m`.

---

## 10. Порядок реализации

### Шаг 1 — Инфраструктура и скелет
- [ ] Структура директорий, `.env.example`, `.env`
- [ ] `pyproject.toml` (uv + ruff), `.github/workflows/ci.yml`
- [ ] `docker-compose.yml`
- [ ] `backend/shared/config.py`, `database.py`, `models.py` (все таблицы включая Organization, DocumentPermission)
- [ ] Alembic: первая миграция
- [ ] **Проверка:** `docker-compose up postgres` → `alembic upgrade head` → все таблицы созданы

### Шаг 2 — Auth + базовый API
- [ ] `backend/shared/security.py` — JWT, bcrypt
- [ ] `backend/api/main.py` — lifespan (embedding singleton), CORS, `/health`
- [ ] `backend/api/routers/auth.py` — `/login`, `/me`
- [ ] `backend/scripts/create_admin.py`
- [ ] **Проверка:** `POST /api/auth/login` → токен → `GET /api/auth/me`

### Шаг 3 — MinIO + загрузка
- [ ] `backend/shared/minio_client.py`
- [ ] `backend/api/routers/documents.py` — upload, download, status, preview
- [ ] **Проверка:** загрузить файл → появился в MinIO → `GET /status` → "pending"

### Шаг 4 — Celery + pipeline
- [ ] `backend/worker/celery_app.py` — init + singleton модели
- [ ] `backend/worker/tasks/process_document.py` — полный pipeline секции 6
- [ ] **Проверка:** `docker-compose logs -f worker` → задача обработана → статус "indexed"

### Шаг 5 — Семантический поиск
- [ ] Инициализация Qdrant коллекции (size=768, Distance.COSINE)
- [ ] `backend/api/routers/search.py` — поиск + `build_snippet()`
- [ ] `GET /suggest` — автодополнение
- [ ] **Проверка:** поиск → результаты с `snippet_html` содержащим `<mark>`

### Шаг 6 — Права доступа + организации
- [ ] `check_document_access` dependency в `backend/api/dependencies.py`
- [ ] `GET/POST/DELETE /{id}/permissions` в documents router
- [ ] `backend/api/routers/organizations.py`
- [ ] Поиск учитывает права (фильтр в Qdrant запросе)
- [ ] **Проверка:** создать 2 пользователей, расшарить документ → второй находит его в поиске

### Шаг 7 — Admin API + Profile API
- [ ] `backend/api/routers/admin.py`
- [ ] `backend/api/routers/profile.py`
- [ ] **Проверка:** `/admin/stats` и `/profile` возвращают данные

### Шаг 8 — Frontend: скелет + Login
- [ ] Vite + TypeScript, Gravity UI (ThemeProvider, CSS imports), React Router
- [ ] Layout, PrivateRoute, axios client с JWT
- [ ] LoginPage
- [ ] **Проверка:** `npm run build` без ошибок TypeScript, логин работает

### Шаг 9 — Frontend: SearchPage
- [ ] SearchPage с поиском, фильтрами, карточками
- [ ] `snippet_html` через `dangerouslySetInnerHTML`, `<mark>` стилизован
- [ ] Modal превью (iframe для PDF, текст для остальных)
- [ ] **Проверка:** карточки с подсвеченными фрагментами

### Шаг 10 — Frontend: UploadPage + DocumentsPage
- [ ] Drag & drop, polling статуса
- [ ] DocumentsPage: таблица + grid, настраиваемые колонки, Modal доступа
- [ ] **Проверка:** upload → indexed → найти → превью

### Шаг 11 — Frontend: ProfilePage + AdminPage
- [ ] ProfilePage: профиль, смена пароля, мои документы
- [ ] AdminPage: 5 вкладок
- [ ] **Проверка:** все вкладки AdminPage с данными

### Шаг 12 — Nginx + CI/CD + финал
- [ ] frontend/Dockerfile multi-stage
- [ ] nginx.conf финальный
- [ ] `docker-compose up --build` — вся система работает
- [ ] `git push` → GitHub Actions → образы в GHCR
- [ ] **Проверка:** весь чеклист из секции 11

---

## 11. Критерии готовности MVP

1. `docker-compose up` без ошибок
2. `http://localhost` → страница логина
3. Логин admin работает
4. Загрузка PDF → через ~30 сек статус "Индексирован"
5. Поиск → результаты со сниппетом и `<mark>` подсветкой
6. Превью PDF в Modal без скачивания
7. Создать организацию → расшарить документ → другой пользователь находит
8. Modal управления доступом: выдать/отозвать права
9. ProfilePage: профиль, смена пароля, мои документы
10. AdminPage: 5 вкладок с данными
11. `git push` → CI зелёный → образы в GHCR

---

## 12. Что НЕ нужно делать в MVP

- **Elasticsearch / BM25** — не добавлять, только Qdrant для поиска. ES дорог в памяти (~1GB+) и избыточен для MVP
- Reranker
- Версионирование файлов
- Prometheus / Grafana
- Email-уведомления
- Аватарки пользователей
- UI-навигация по папкам (`folder_path` в БД есть, навигация — пост-MVP)
- AI-ассистент с MCP (инфраструктура готова, сам агент — пост-MVP)
- Мобильная адаптация

---

## 13. Требования к коду

### Python
- Весь I/O — async/await
- Pydantic v2: `model_config = ConfigDict(from_attributes=True)`, `@field_validator`
- Логирование через `logging`, не print
- Ошибки через `HTTPException` с понятным message
- Секреты только из `.env`
- `ruff check --fix` + `ruff format` перед каждым коммитом

### Frontend
- Строгий TypeScript — no `any`
- Все запросы через TanStack Query
- Все состояния: loading (Skeleton), error (Alert), empty
- Toast для всех операций

### Docker
- Multi-stage Dockerfile где уместно
- `.dockerignore` для каждого сервиса
- `healthcheck` для api, postgres, redis

---

## 14. Запуск

```bash
cp .env.example .env
docker-compose up -d
docker-compose exec api alembic upgrade head
docker-compose exec api python scripts/create_admin.py \
  --email admin@company.com --password admin123 --username admin
open http://localhost
```

---

*Версия 2.0. Репозиторий: https://github.com/Goshaloveu/OGUxKorndoc*
