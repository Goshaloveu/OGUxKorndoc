Ты — архитектор-аналитик. Твоя задача: провести полную диагностику текущего состояния проекта и написать точные, реалистичные задачи в TASKS.md. Ты НЕ пишешь код — только анализируешь и планируешь.

---

## ФАЗА 1 — Изучи спецификацию (что ДОЛЖНО быть)

```bash
cat CLAUDE.md
```

Запомни: какие страницы должны быть, какие API эндпоинты, какие модели данных, какой стек.

---

## ФАЗА 2 — Полная диагностика кодовой базы

### 2.1 Структура проекта
```bash
find . -type f \( -name "*.py" -o -name "*.tsx" -o -name "*.ts" \) \
  | grep -v node_modules | grep -v __pycache__ | grep -v .git | sort
```

### 2.2 Backend — что реализовано
```bash
# Все API роутеры
for f in backend/api/routers/*.py; do
  echo "=== $f ==="
  grep -E "^@router\.(get|post|patch|put|delete)" "$f"
done

# Модели БД
cat backend/shared/models.py

# Celery задачи
cat backend/worker/tasks/process_document.py 2>/dev/null | head -100

# Что установлено
cat backend/api/pyproject.toml 2>/dev/null || cat backend/api/requirements.txt 2>/dev/null
```

### 2.3 Frontend — что реализовано
```bash
# Все страницы
for f in frontend/src/pages/*.tsx; do
  echo "=== $f ==="
  grep "from '@gravity-ui" "$f" | head -5
  grep -c "Skeleton\|isLoading\|isError\|Alert" "$f" || echo "0"
done

# Компоненты
ls frontend/src/components/ 2>/dev/null

# API клиенты
for f in frontend/src/api/*.ts; do
  echo "=== $f ==="
  grep -E "^export (async )?function|^export const" "$f"
done

# Стили
cat frontend/src/main.tsx | grep import
ls frontend/src/styles/ 2>/dev/null || echo "папки styles нет"
```

### 2.4 Живая проверка — что работает
```bash
# Запущены ли сервисы
docker-compose ps

# API здоровье
curl -s http://localhost:8000/health 2>/dev/null || echo "API недоступен"

# Получить токен
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token','NO_TOKEN'))" 2>/dev/null)
echo "Token получен: $([ -n "$TOKEN" ] && echo ДА || echo НЕТ)"

# Проверить ключевые эндпоинты
for ep in "GET /api/auth/me" "GET /api/documents/" "GET /api/profile/" "GET /api/admin/stats" "GET /api/organizations/"; do
  METHOD=$(echo $ep | cut -d' ' -f1)
  PATH=$(echo $ep | cut -d' ' -f2)
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X $METHOD "http://localhost:8000$PATH" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null)
  echo "$METHOD $PATH → $CODE"
done

# Qdrant векторы
curl -s http://localhost:6333/collections/documents 2>/dev/null \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('Vectors:', d.get('result',{}).get('vectors_count','?'))" 2>/dev/null
```

### 2.5 Анализ качества кода
```bash
# TypeScript ошибки
cd frontend && npm run build 2>&1 | grep -E "error TS|Error:" | head -20; cd ..

# Захардкоженные цвета
grep -rn "#[0-9a-fA-F]\{3,6\}\b" frontend/src --include="*.tsx" \
  | grep -v "brand.css" | grep -v ".git" | wc -l

# Самописные button вместо Gravity UI Button
grep -rn "<button " frontend/src --include="*.tsx" | wc -l

# Gravity UI используется?
echo "Импортов из @gravity-ui/uikit:"
grep -r "from '@gravity-ui/uikit'" frontend/src --include="*.tsx" | wc -l

# Python линтинг
uv run ruff check backend/ 2>&1 | grep -c "error\|warning" || echo "0"
```

### 2.6 Git-история
```bash
git log --oneline -15
grep -E "\[x\]|\[~\]|\[ \]" TASKS.md | head -30
```

---

## ФАЗА 3 — Сформируй диагностический отчёт

На основе собранных данных составь отчёт:

```
## ДИАГНОСТИКА — {дата}

### ✅ Что работает
- ...

### ❌ Что сломано (с конкретными файлами)
- файл:строка — причина

### ⚠️ Что частично работает
- ...

### 🏗️ Отсутствует из спецификации CLAUDE.md
- ...

### 📊 Метрики качества кода
- TypeScript ошибок компиляции: N
- Самописных <button> вместо Button: N
- Файлов с захардкоженными цветами: N
- Импортов Gravity UI: N
```

---

## ФАЗА 4 — Напиши задачи в TASKS.md

ПРАВИЛА — каждое нарушение делает задачи бесполезными:

1. **Только факты** — задача основана на конкретной находке из диагностики, не на предположении
2. **Конкретный файл** — указать `backend/api/routers/profile.py строка 45` а не "где-то в backend"
3. **Атомарность** — одна задача решается за одну итерацию цикла
4. **Порядок** — если задача B зависит от A, A идёт первой
5. **Проверка** — конкретная команда curl или действие в браузере

Префиксы задач:
- `BE-XXX` — Python/FastAPI/Celery
- `FE-XXX` — React/TypeScript/Gravity UI
- `INFRA-XXX` — Docker/nginx/CI

Шаблон задачи:
```markdown
### BE-001 — Название
**Файл:** `путь/к/файлу.py`
**Обнаружено:** что конкретно нашла диагностика
**Что сделать:** пошаговые инструкции
**Проверка:** curl -s ... | grep "ожидаемое"
**Статус:** `[ ]`
```

Добавь блок задач в конец TASKS.md:
```markdown
---

## БЛОК X — [название]
> Сгенерировано архитектором {дата}
> Диагностика: BE эндпоинтов {N}/M, FE страниц {N}/M, TS ошибок: N

[задачи]

## Прогресс (обновить счётчик)
```

---

## ФАЗА 5 — Зафиксируй результат

```bash
DATE=$(date +%Y%m%d)
# Сохранить диагностический отчёт
cat > DIAGNOSIS_${DATE}.md << 'ENDOFDIAG'
[отчёт из фазы 3]
ENDOFDIAG

git add TASKS.md DIAGNOSIS_${DATE}.md
git commit -m "chore: архитектурная диагностика ${DATE}, обновлён TASKS.md"
git push origin main
```

Выведи итоговое резюме:
```
Диагностика завершена.
Найдено проблем: BE={N}, FE={N}, INFRA={N}
Добавлено задач: {N}
Файл диагностики: DIAGNOSIS_{дата}.md
```

---

## Запуск (один раз, не в цикле)

```bash
claude --model claude-opus-4-5 -p "$(cat ARCHITECT_PROMPT.md)"
```

После завершения запускай нужные loop-циклы с обновлёнными задачами.
