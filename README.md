# OGUxKorndoc — Корпоративное хранилище документов с семантическим поиском

Система для загрузки, хранения и семантического поиска по корпоративным документам (PDF, DOCX, XLSX, TXT) с разграничением доступа по ролям.

## Возможности

- Семантический поиск по содержимому документов (модель `paraphrase-multilingual-mpnet-base-v2`, 768-dim)
- Подсветка найденных фрагментов в результатах поиска
- Поддержка форматов: PDF, DOCX, XLSX, TXT (OCR для сканированных PDF)
- Управление доступом: viewer / editor / owner
- Организации и групповые права
- Полный журнал действий (audit log)
- Административная панель со статистикой и мониторингом здоровья сервисов

## Стек

| Слой | Технологии |
|------|-----------|
| Backend API | FastAPI + Uvicorn + SQLAlchemy 2.0 async |
| База данных | PostgreSQL 16 |
| Векторная БД | Qdrant (768-dim, cosine) |
| Очередь задач | Celery + Redis |
| Файловое хранилище | MinIO (self-hosted S3) |
| Парсинг | PyMuPDF, python-docx, openpyxl, pytesseract |
| Эмбеддинги | sentence-transformers |
| Frontend | React 18 + TypeScript + Vite + Gravity UI |
| Инфраструктура | Docker Compose + Nginx |

## Быстрый старт

### Требования

- Docker 24+ и Docker Compose v2
- 4 GB RAM (для embedding-модели ~1.5 GB)

### 1. Клонировать и настроить

```bash
git clone https://github.com/Goshaloveu/OGUxKorndoc
cd OGUxKorndoc
cp .env.example .env
```

При необходимости отредактируй `.env` (пароли, секретный ключ JWT).

### 2. Запустить инфраструктуру

```bash
docker-compose up -d
```

Дождись пока все сервисы станут healthy (~2-3 минуты при первом запуске — скачиваются образы и embedding-модель):

```bash
docker-compose ps
```

### 3. Применить миграции БД

```bash
docker-compose exec api alembic upgrade head
```

### 4. Создать первого администратора

```bash
docker-compose exec api python scripts/create_admin.py \
  --email admin@company.com \
  --password admin123 \
  --username admin
```

### 5. Открыть приложение

- **Приложение:** http://localhost
- **MinIO Console:** http://localhost:9001 (minioadmin / minioadmin123)
- **Adminer (dev):** запустить с `docker-compose --profile dev up -d`, затем http://localhost:8080

## Использование

1. Войти по адресу http://localhost с учётными данными администратора
2. Загрузить документ на странице `/upload`
3. Дождаться статуса "Индексирован" (~30 сек для небольшого PDF)
4. Перейти на главную `/` и выполнить семантический поиск

## Разработка

### Backend

```bash
# Линтинг и форматирование (обязательно перед коммитом)
uv run ruff check backend/ --fix
uv run ruff format backend/

# Новая миграция после изменения models.py
docker-compose exec api alembic revision --autogenerate -m "description"
docker-compose exec api alembic upgrade head

# Логи сервисов
docker-compose logs -f api
docker-compose logs -f worker
```

### Frontend

```bash
cd frontend
npm install
npm run dev      # dev-сервер на :5173 с proxy на api:8000
npm run build    # проверить TypeScript + собрать dist/
```

### Перезапуск одного сервиса

```bash
docker-compose restart api
docker-compose restart worker
```

## Переменные окружения

Все переменные описаны в `.env.example`. Ключевые:

| Переменная | Описание |
|-----------|---------|
| `SECRET_KEY` | JWT секрет (минимум 32 символа, обязательно сменить в prod) |
| `EMBEDDING_MODEL` | Название HuggingFace модели (default: `paraphrase-multilingual-mpnet-base-v2`) |
| `EMBEDDING_DIM` | Размер вектора (default: 768) |
| `CHUNK_SIZE` | Размер чанка в символах (default: 2048) |
| `MINIO_ENDPOINT` | Адрес MinIO — для облака менять здесь |

### Смена embedding-модели

1. Поменяй `EMBEDDING_MODEL` и `EMBEDDING_DIM` в `.env`
2. Удали Qdrant-коллекцию: `docker-compose exec api python -c "from qdrant_client import QdrantClient; QdrantClient(host='qdrant').delete_collection('documents')"`
3. Перезапусти сервисы и переиндексируй документы через AdminPage → Reindex

## Архитектура

```
Browser → Nginx :80 → FastAPI api :8000
                    → React frontend (static)

FastAPI API
  ├── /api/auth/*           JWT аутентификация
  ├── /api/documents/*      загрузка, скачивание, права
  ├── /api/search/*         семантический поиск
  ├── /api/organizations/*  организации
  ├── /api/profile/*        профиль
  └── /api/admin/*          администрирование

  → PostgreSQL  (metadata, users, audit)
  → Redis → Celery worker (document processing pipeline)
  → Qdrant  (vector search)
  → MinIO   (file storage)
```

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`):
- **lint** — ruff check + format на каждый push/PR
- **build-and-push** — Docker образы api/worker в GHCR при push в main
- **build-frontend** — образ frontend в GHCR при push в main

Образы доступны по адресу `ghcr.io/goshaloveu/oguxkorndoc-{api,worker,frontend}:latest`.

## Чеклист готовности MVP

- [x] `docker-compose up` без ошибок
- [x] `http://localhost` → страница логина
- [x] Логин admin работает
- [x] Загрузка PDF → через ~30 сек статус "Индексирован"
- [x] Поиск → результаты со сниппетом и `<mark>` подсветкой
- [x] Превью PDF в Modal без скачивания
- [ ] Создать организацию → расшарить документ → другой пользователь находит
- [x] AdminPage: все 4 вкладки с данными
- [ ] `git push` → CI зелёный → образы в GHCR
