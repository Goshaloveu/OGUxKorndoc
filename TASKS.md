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

## История выполненных задач

| Задача | Коммит | Описание |
|--------|--------|----------|
| TASK-001 | `d186419` | Directory structure and environment configuration |
| TASK-002 | `0175d8d` | Docker Compose и базовые Dockerfile |
| TASK-003 | `6d16f44` | Shared config, database, и ORM модели |
| TASK-004 | `59275e4` | Alembic migrations и entrypoint для API |
| TASK-005 | `6eb6b40` | Auth security utilities + /api/auth роутер |
| TASK-006 | `852ac23` | Admin script + bcrypt compatibility fix |
| TASK-007 | `a302df0` | MinIO utilities + Documents API |
| TASK-008 | `a6aaa2a` | Celery Worker — pipeline обработки документов |
| TASK-009 | `d1754c5` | Search API — семантический поиск + автодополнение |
| TASK-010 | `0f6a07a` | Admin API — управление пользователями, статистика, аудит |
| TASK-011 | `e5c27fc` | Frontend skeleton — Vite + React + Gravity UI + роутинг |
| TASK-012 | `4d884f8` | Frontend LoginPage |
| TASK-013 | `3e7a3e2` | Frontend SearchPage — поиск с фильтрами и сниппетами |
| TASK-015 | `bfc8f2b` | Frontend DocumentsPage — таблица, сортировка, пагинация. TASK-014 была выполнена в рамках этой задачи. |
| TASK-016 | `0e9ef02` | Frontend AdminPage — 4 вкладки |
| TASK-017 | `ee7f13c` | Frontend Dockerfile + Nginx финальная конфигурация |
| TASK-018 | `a044d3a` | Healthcheck и финальная интеграционная проверка |
| TASK-019 | `a3d1093` | Аутентификация для download и preview |
| TASK-020 | `daf0adc` | Исправить debounce поиска на DocumentsPage |
| TASK-021 | `daf0adc` | Исправить страницу профиля |
| TASK-022 | `b77eb67` | Исправить страницу администрирования |
| TASK-023 | `c0609ec` | Исправить фильтр статуса и извлечение текста DOCX |
| TASK-024 | `80df582` | Редизайн — тёмный сайдбар, акцент, визуальная иерархия |
| TASK-025 | `20aa2a1` | (см. git log) |

> Полная история: `git log --oneline`

---

## БЛОК 6 — Фронтенд: визуальная система и Gravity UI

### FE-026 — Подключить brand.css и убрать конфликтующие переменные из index.css
**Файл:** `frontend/src/main.tsx`, `frontend/src/index.css`
**Обнаружено:** `brand.css` с лаймово-зелёным брендом (#cbff5c) не импортирован в main.tsx. В `index.css:20-27` определены жёлто-оранжевые `--g-color-base-brand: #fede3f` и `--app-sidebar-*` переменные, которые конфликтуют с brand.css
**Что сделать:**
1. В `main.tsx` добавить `import './brand.css';` **после** `import '@gravity-ui/uikit/styles/styles.css';`
2. В `index.css` удалить блок `:root { --g-color-base-brand: ...; --app-sidebar-*: ...; }` (строки 19-28) — brand.css берёт на себя брендовые переменные
3. Обновить sidebar переменные в `Layout.css` на новую палитру: тёмный фон `#1a1a1a`, активный пункт с лаймовым акцентом
4. Обновить `LoginPage.tsx` — фон-градиент, логотип, карточку на новые бренд-цвета из brand.css
5. Обновить `Layout.css` — `.layout-logo-icon`, `.layout-avatar`, `.nav-item:hover`, `.nav-item.active` на бренд-цвета
**Проверка:** кнопки `view="action"` имеют лаймово-зелёный фон с контрастным текстом; sidebar и login используют новые цвета
**Статус:** `[x]`

---

### FE-027 — Заменить кастомные табы AdminPage на Gravity UI Tabs
**Файл:** `frontend/src/pages/AdminPage.tsx:31-57`
**Обнаружено:** табы реализованы через нативные `<button>` с захардкоженными цветами `#3d96f9`, `#333`, `#e0e0e0`
**Что сделать:**
1. Импортировать `Tabs` из `@gravity-ui/uikit`
2. Заменить кастомный div+button табар (строки 31-57) на `<Tabs activeTab={activeTab} onSelectTab={setActiveTab} items={TABS} />`
3. Удалить все inline style с `#3d96f9`, `#333`, `#e0e0e0` из этого файла
**Проверка:** вкладки выглядят как стандартные Gravity UI табы с brand-цветом для активной
**Статус:** `[x]`

---

### FE-028 — Заменить нативные `<table>` на Gravity UI Table в DocumentTable
**Файл:** `frontend/src/components/DocumentTable.tsx:161-329`
**Обнаружено:** нативный `<table>` с 10+ захардкоженными цветами (`#e0e0e0`, `#f0f0f0`, `#fafafa`, `#888`, `#3d96f9`), ручной hover через onMouseEnter/onMouseLeave
**Что сделать:**
1. Заменить нативный `<table>` на Gravity UI `Table` с `columns` и `data` props
2. Убрать все захардкоженные цвета — использовать `var(--g-color-line-generic)`, `var(--g-color-text-secondary)`, `var(--g-color-text-link)` и т.д.
3. Если нужен кастом-стиль — использовать CSS-переменные Gravity UI вместо hex-литералов
4. Ссылка на скачивание (`color: '#3d96f9'`) → `var(--g-color-text-link)`
**Проверка:** таблица визуально соответствует стилю Gravity UI, нет захардкоженных цветов в файле
**Статус:** `[x]`

---

### FE-029 — Заменить нативные `<table>` на Gravity UI Table в UsersTab и AuditLogTab
**Файлы:** `frontend/src/components/admin/UsersTab.tsx:116-200`, `frontend/src/components/admin/AuditLogTab.tsx:115-176`
**Обнаружено:** нативные `<table>` с захардкоженными `#e0e0e0`, `#f0f0f0`, `#fafafa`, `#888`, ручной hover
**Что сделать:**
1. В `UsersTab.tsx` заменить `<table>` (строки 116-200) на Gravity UI `Table` с columns/data
2. В `AuditLogTab.tsx` заменить `<table>` (строки 115-176) на Gravity UI `Table`
3. Убрать все hex-литералы — `#e0e0e0` → `var(--g-color-line-generic)`, `#888` → `var(--g-color-text-hint)`, `#fafafa` → не нужен (Table имеет свой hover)
**Проверка:** обе таблицы используют Gravity UI Table, нет захардкоженных цветов
**Статус:** `[x]`

---

### FE-030 — Заменить нативные `<input type="date">` на DatePicker из @gravity-ui/date-components
**Файлы:** `frontend/src/components/SearchFilters.tsx:76-109`, `frontend/src/components/admin/AuditLogTab.tsx:90-104`
**Обнаружено:** 4 нативных `<input type="date">` с inline стилями и захардкоженными `#e0e0e0`
**Что сделать:**
1. Установить `@gravity-ui/date-components` если не установлен (проверить package.json)
2. В `SearchFilters.tsx` заменить два `<input type="date">` (строки 76-109) на `DatePicker` из `@gravity-ui/date-components`
3. В `AuditLogTab.tsx` заменить два `<input type="date">` (строки 90-104) на `DatePicker`
4. Убрать все inline стили с hex-цветами из этих элементов
**Проверка:** дата-пикеры визуально соответствуют Gravity UI, работают фильтры
**Статус:** `[~]`

---

### FE-031 — Sidebar: Gravity UI иконки вместо emoji + нативная кнопка → Button
**Файл:** `frontend/src/components/Layout.tsx:34-69`
**Обнаружено:** навигация использует нативные `<button>` (строка 60) с emoji-иконками `''`, `'⬆'`, `''`, `''`, `''` — пустые строки или некорректные символы
**Что сделать:**
1. Импортировать иконки из `@gravity-ui/icons`: `Magnifier`, `ArrowUpFromLine`, `FolderOpen`, `Person`, `Gear`
2. В массиве `navItems` заменить поле `icon: string` на React-компонент иконки
3. Заменить нативный `<button className="nav-item">` на стилизованный элемент с Gravity UI иконками (можно оставить `<button>` если нужен кастомный стиль sidebar, но иконки заменить обязательно)
**Проверка:** в sidebar отображаются распознаваемые иконки рядом с текстом меню
**Статус:** `[ ]`

---

### FE-032 — StatsTab и HealthTab: убрать захардкоженные цвета, использовать Card
**Файлы:** `frontend/src/components/admin/StatsTab.tsx:13-34,60-64`, `frontend/src/components/admin/HealthTab.tsx:12-48`
**Обнаружено:**
- StatsTab: кастомный StatCard с `background: '#fff'`, `border: '1px solid #e0e0e0'`, цвета `#27ae60`, `#e74c3c`, `#2980b9`, `#8e44ad` в литералах
- HealthTab: ServiceCard с `background: '#fff'`, `border: '2px solid #27ae60/#e74c3c'`, цветные точки
**Что сделать:**
1. Заменить кастомные `<div>` карточки на Gravity UI `Card`
2. Цвета заменить на CSS-переменные: `#27ae60` → `var(--g-color-text-positive)`, `#e74c3c` → `var(--g-color-text-danger)`, `#2980b9` → `var(--g-color-text-info)`, `#8e44ad` → `var(--g-color-text-utility)`
3. `background: '#fff'` → убрать (Card имеет свой фон), `border: '1px solid #e0e0e0'` → убрать (Card имеет свою рамку)
**Проверка:** карточки статистики и здоровья используют Gravity UI Card с семантическими цветами
**Статус:** `[ ]`

---

### FE-033 — DocumentGrid: убрать захардкоженные цвета, использовать Card
**Файл:** `frontend/src/components/DocumentGrid.tsx:38-43, 107, 125-150, 199`
**Обнаружено:** карточки плиток используют `background: '#fff'`, `border: '1px solid #e8e8e8'`, ручной hover через JS `style.boxShadow`, ссылки `color: '#3d96f9'`, пустое состояние `color: '#888'`
**Что сделать:**
1. Заменить корневой `<div>` каждой карточки на Gravity UI `Card` (с type="action" для hover-эффекта)
2. `background: '#fff'` → убрать (Card), `border: '1px solid #e8e8e8'` → убрать (Card)
3. Ручной hover через `onMouseEnter`/`onMouseLeave` → убрать (Card type="action" даёт hover)
4. `color: '#3d96f9'` → `var(--g-color-text-link)`, `color: '#888'` → `var(--g-color-text-hint)`
5. `FILE_TYPE_COLORS` с hex → можно оставить как декоративные (type-stripe), но рамки через переменные
**Проверка:** плиточный вид использует Gravity UI Card, нет ручных hover-хаков, цвета из переменных
**Статус:** `[ ]`

---

### FE-034 — UploadPage: убрать захардкоженные цвета
**Файл:** `frontend/src/pages/UploadPage.tsx:199, 205, 220, 342`
**Обнаружено:** drag-зона `border: '#fede3f'` (жёлтый вместо бренда), `background: 'rgba(91, 103, 255, 0.06)'` (синий — мусор от старой палитры), очередь `border: '1px solid #e0e0e0'`
**Что сделать:**
1. Drag-зона активная: `border-color` → `var(--g-color-line-brand)`, `background` → `var(--g-color-base-brand)` с низкой непрозрачностью
2. Иконка drag-зоны при активации: `background: 'rgba(91, 103, 255, 0.15)'` → `var(--g-color-base-brand)` с подходящей непрозрачностью
3. Очередь загрузки: `border: '1px solid #e0e0e0'` → `var(--g-color-line-generic)` или обернуть в Gravity UI Card
**Проверка:** drag-зона подсвечивается лаймово-зелёным при перетаскивании, нет hex в файле
**Статус:** `[ ]`

---

### FE-035 — Удалить кастомный ToastContainer, подключить Gravity UI ToasterComponent
**Файл:** `frontend/src/components/ToastContainer.tsx` (весь файл), `frontend/src/main.tsx:10,27`
**Обнаружено:** кастомная реализация ToastContainer с 10+ захардкоженными цветами, нативным `<button>`, ручным subscribe на toaster — не соответствует Gravity UI стилю
**Что сделать:**
1. Проверить версию `@gravity-ui/uikit` — если v7+, использовать `ToasterComponent` или `<Toaster>` из пакета
2. Если `ToasterComponent` доступен: импортировать и поместить в main.tsx вместо кастомного `<ToastContainer />`
3. Если `ToasterComponent` недоступен в текущей версии: оставить кастомный, но заменить все hex-цвета на CSS-переменные Gravity UI (`var(--g-color-base-positive-light)`, `var(--g-color-base-danger-light)` и т.д.)
4. Удалить `ToastContainer.tsx` если используется встроенный компонент
**Проверка:** тосты выглядят в стиле Gravity UI, нет захардкоженных цветов
**Статус:** `[ ]`

---

### FE-036 — AdminPage: добавить вкладку «Организации»
**Файл:** `frontend/src/pages/AdminPage.tsx`, новый: `frontend/src/components/admin/OrganizationsTab.tsx`
**Обнаружено:** CLAUDE.md секция 8.5 описывает 5 вкладок AdminPage, реализовано только 4 — нет «Организации»
**Что сделать:**
1. Создать `OrganizationsTab.tsx` — таблица всех организаций из `GET /api/admin/organizations`
2. Добавить вкладку в массив `TABS` в `AdminPage.tsx`: `{ id: 'orgs', label: 'Организации' }`
3. Рендерить `<OrganizationsTab />` при `activeTab === 'orgs'`
4. Использовать Gravity UI `Table` (не нативный `<table>`)
**Проверка:** пятая вкладка «Организации» загружает список организаций
**Статус:** `[ ]`

---

### FE-037 — DocumentsPage: превью по клику и кнопка «Поделиться»
**Файлы:** `frontend/src/components/DocumentTable.tsx:235-249`, `frontend/src/components/DocumentGrid.tsx:201-213`
**Обнаружено:**
- Клик на название документа → скачивание (а по CLAUDE.md секция 8.3 должен быть Modal превью)
- Нет кнопки «Поделиться» и Modal управления доступом (секция 8.3 описывает viewer/editor/owner Modal)
**Что сделать:**
1. Клик на название → открывать Modal превью (PDF через iframe, остальные — текст из GET /preview)
2. Добавить кнопку «Поделиться» (только для owner) → Modal управления доступом:
   - GET `/{id}/permissions` — список текущих прав
   - POST `/{id}/permissions` — добавить
   - DELETE `/{id}/permissions/{perm_id}` — удалить
3. Использовать Gravity UI `Modal`, `Select` для уровня (viewer/editor/owner), `Button`
**Проверка:** клик на название → Modal с превью; кнопка «Поделиться» открывает Modal управления правами
**Статус:** `[ ]`

---

### FE-038 — ProfilePage: секция «Мои организации»
**Файл:** `frontend/src/pages/ProfilePage.tsx`
**Обнаружено:** CLAUDE.md секция 8.4 описывает «Список Мои организации + кнопка создания новой» — не реализовано
**Что сделать:**
1. Добавить запрос `GET /api/organizations/` (мои организации) через useQuery
2. Отрисовать Card со списком организаций (название, роль, кол-во участников)
3. Кнопка «Создать организацию» → Modal с формой (name), POST /api/organizations/
4. Использовать Gravity UI `Card`, `Table` или список, `Modal`, `TextInput`, `Button`
**Проверка:** на ProfilePage видна секция «Мои организации» с возможностью создания
**Статус:** `[ ]`

---

## Прогресс (обновить после каждой задачи)
```
Выполнено: 26 / 38
Блок 6 (FE визуал):  3/13
```
