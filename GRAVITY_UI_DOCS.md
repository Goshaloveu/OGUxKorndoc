# Gravity UI — Полная документация для ИИ агента

> Источник: репозитории github.com/gravity-ui, сайт gravity-ui.com
> ⚠️ ОБЯЗАТЕЛЬНО читать перед любой frontend задачей
> 📌 Для актуального списка иконок — смотри `node_modules/@gravity-ui/icons/` или https://preview.gravity-ui.com/icons/

---

## ПРАВИЛА БЕЗ ИСКЛЮЧЕНИЙ

```
1. НЕ пиши компонент с нуля если он есть в этом документе
2. НЕ придумывай пропсы — используй только задокументированные
3. НЕ придумывай импорты — используй точные пути из этого документа
4. Перед каждой новой страницей — найди нужные компоненты в этом документе (Ctrl+F)
5. Компонент покрывает 80% задачи → используй его, а не пиши свой
```

---

## СОДЕРЖАНИЕ

1. [@gravity-ui/uikit — базовые компоненты](#1-gravity-uiuikit)
2. [@gravity-ui/icons — иконки](#2-gravity-uiicons)
3. [@gravity-ui/aikit — AI чат компоненты](#3-gravity-uiaikit)
4. [@gravity-ui/markdown-editor — редактор Markdown](#4-gravity-uimarkdown-editor)
5. [@gravity-ui/chartkit — графики](#5-gravity-uichartkit)
6. [@gravity-ui/i18n — интернационализация](#6-gravity-uii18n)
7. [@gravity-ui/prettier-config — форматирование](#7-gravity-uiprettier-config)
8. [Типовые паттерны страниц](#8-типовые-паттерны-страниц)

---

## 1. @gravity-ui/uikit

**npm:** `@gravity-ui/uikit` | **Версия:** 7.34.0 | **GitHub:** https://github.com/gravity-ui/uikit

### Обязательный бойлерплейт (уже настроен в проекте)

```tsx
// src/main.tsx
import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';
import { configure, ThemeProvider } from '@gravity-ui/uikit';

configure({ lang: 'ru' });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme="light">
    <App />
  </ThemeProvider>
);
```

### Полный список компонентов

Все компоненты импортируются из `'@gravity-ui/uikit'`

#### Базовые элементы

| Компонент | Описание | Ключевые пропсы |
|-----------|----------|-----------------|
| `Button` | Кнопка | `view?: 'normal'\|'action'\|'outlined'\|'flat'\|'outlined-info'\|'outlined-danger'\|'raised'\|'flat-info'\|'flat-danger'\|'flat-secondary'\|'normal-contrast'\|'outlined-contrast'\|'flat-contrast'`, `size?: 'xs'\|'s'\|'m'\|'l'\|'xl'`, `disabled?`, `loading?`, `width?: 'auto'\|'max'`, `selected?`, `href?`, `target?` |
| `Link` | Ссылка | `href`, `view?: 'normal'\|'primary'\|'secondary'\|'ghost'`, `target?`, `visitable?` |
| `Text` | Типографика | `variant?: 'display-4'\|'display-3'\|'display-2'\|'display-1'\|'header-2'\|'header-1'\|'subheader-3'\|'subheader-2'\|'subheader-1'\|'body-3'\|'body-2'\|'body-1'\|'body-short'\|'caption-2'\|'caption-1'\|'code-3'\|'code-2'\|'code-1'\|'code-inline-3'\|'code-inline-2'\|'code-inline-1'`, `color?`, `ellipsis?`, `as?` |
| `Icon` | SVG иконка из @gravity-ui/icons | `data` (SVG data), `size?: number\|'xs'\|'s'\|'m'\|'l'` |
| `Label` | Бейдж/тег | `type?: 'default'\|'copy'\|'close'`, `theme?: 'normal'\|'info'\|'danger'\|'warning'\|'success'\|'unknown'\|'clear'`, `size?: 'xs'\|'s'\|'m'`, `value?`, `copyText?`, `onClose?` |
| `Divider` | Разделитель | `orientation?: 'horizontal'\|'vertical'` |

#### Формы и ввод

| Компонент | Описание | Ключевые пропсы |
|-----------|----------|-----------------|
| `TextInput` | Текстовое поле | `value?`, `defaultValue?`, `onUpdate?`, `placeholder?`, `label?`, `size?: 's'\|'m'\|'l'\|'xl'`, `disabled?`, `error?`, `errorMessage?`, `hasClear?`, `startContent?`, `endContent?`, `type?`, `autoComplete?`, `validationState?: 'invalid'` |
| `TextArea` | Многострочное поле | `value?`, `onUpdate?`, `rows?`, `minRows?`, `maxRows?`, `disabled?`, `error?` |
| `NumberInput` | Числовое поле | `value?`, `onUpdate?`, `min?`, `max?`, `step?`, `shiftMultiplier?`, `hiddenControls?` |
| `PasswordInput` | Поле пароля | `value?`, `onUpdate?`, `showCopyButton?` |
| `Select` | Выпадающий список | `value?`, `defaultValue?`, `onUpdate?`, `options`, `multiple?`, `label?`, `placeholder?`, `size?: 's'\|'m'\|'l'\|'xl'`, `disabled?`, `filterable?`, `renderControl?`, `renderOption?` |
| `Checkbox` | Чекбокс | `checked?`, `defaultChecked?`, `onUpdate?`, `disabled?`, `indeterminate?`, `size?: 'm'\|'l'`, `content?` |
| `Radio` | Радио-кнопка | `value`, `checked?`, `onUpdate?`, `disabled?`, `content?` |
| `RadioButton` | Группа радио-кнопок | `value?`, `defaultValue?`, `onUpdate?`, `size?: 's'\|'m'\|'l'\|'xl'` |
| `RadioGroup` | Группа радио | `value?`, `onUpdate?`, `options`, `direction?: 'vertical'\|'horizontal'` |
| `Switch` | Переключатель | `checked?`, `defaultChecked?`, `onUpdate?`, `disabled?`, `size?: 'm'\|'l'`, `content?` |
| `Slider` | Ползунок | `value?`, `defaultValue?`, `onUpdate?`, `min?`, `max?`, `step?`, `disabled?`, `range?` |

#### Отображение данных

| Компонент | Описание | Ключевые пропсы |
|-----------|----------|-----------------|
| `Table` | Таблица данных | `data`, `columns`, `onRowClick?`, `getRowId?`, `emptyMessage?`, `stickyHeader?` |
| `List` | Список элементов | `items`, `renderItem?`, `onItemClick?`, `filterable?`, `sortable?`, `virtualized?` |
| `DefinitionList` | Список определений (key-value) | `items: [{name, content}]`, `nameMaxWidth?`, `responsive?` |
| `Pagination` | Пагинация | `page`, `pageSize`, `total`, `onUpdate` |
| `Progress` | Прогресс-бар | `value`, `theme?: 'default'\|'success'\|'warning'\|'danger'\|'info'\|'misc'`, `text?`, `stack?` |
| `Skeleton` | Скелетон загрузки | `style?` (задай width/height) |

#### Навигация и структура

| Компонент | Описание | Ключевые пропсы |
|-----------|----------|-----------------|
| `Breadcrumbs` | Хлебные крошки | `items: [{text, href?, action?}]`, `lastDisplayedItemsCount?`, `firstDisplayedItemsCount?` |
| `Tabs` | Вкладки | `value?`, `defaultValue?`, `onUpdate?`, `size?: 'm'\|'l'\|'xl'`, `activeTab?` |
| `Menu` | Вертикальное меню | содержит `Menu.Item`, `Menu.Group`, `Menu.Separator` |
| `Stepper` | Пошаговая навигация | `value`, `onUpdate?` + `Stepper.Item` |

#### Оверлеи и попапы

| Компонент | Описание | Ключевые пропсы |
|-----------|----------|-----------------|
| `Modal` | Модальное окно | `open`, `onClose`, `contentClassName?` |
| `Dialog` | Диалог с шапкой/футером | `open`, `onClose`, `size?: 's'\|'m'\|'l'`. Содержит `Dialog.Header`, `Dialog.Body`, `Dialog.Footer` |
| `Popup` | Всплывающий элемент | `open`, `onClose?`, `anchorRef`, `placement?` |
| `Popover` | Попover с контентом | `content`, `children`, `placement?`, `trigger?: 'hover'\|'click'\|'focus'`, `disabled?` |
| `Tooltip` | Подсказка | `content`, `children`, `placement?`, `disabled?` |
| `DropdownMenu` | Выпадающее меню | `items: [{text, action?, href?, icon?}]`, `renderSwitcher?`, `size?` |
| `Sheet` | Нижний шит (мобайл) | `open`, `onClose`, `title?` |
| `Drawer` | Боковая панель | `open`, `onClose`, `children` |

#### Состояния и уведомления

| Компонент | Описание | Ключевые пропсы |
|-----------|----------|-----------------|
| `Alert` | Встроенное уведомление | `theme?: 'normal'\|'info'\|'positive'\|'warning'\|'danger'`, `title?`, `message?`, `view?: 'filled'\|'outlined'`, `layout?: 'horizontal'\|'vertical'`, `onClose?` |
| `Loader` | Индикатор загрузки | `size?: 's'\|'m'\|'l'`, `theme?: 'light'\|'dark'` |
| `Spin` | Маленький спиннер | `size?: 'xs'\|'s'\|'m'\|'l'\|'xl'` |
| `Disclosure` | Раскрываемый блок | `summary`, `expanded?`, `defaultExpanded?`, `onUpdate?` |
| `Accordion` | Аккордеон | содержит `Accordion.Item` |

#### Медиа и прочее

| Компонент | Описание | Ключевые пропсы |
|-----------|----------|-----------------|
| `Avatar` | Аватар | `imgUrl?\|text?\|icon?`, `size?: 'xs'\|'s'\|'m'\|'l'\|'xl'\|'2xl'`, `theme?`, `fallbackImgUrl?` |
| `AvatarStack` | Стопка аватаров | `max?`, `overlapping?: 'start'\|'end'` |
| `ClipboardButton` | Кнопка копирования | `text`, `size?` |
| `CopyToClipboard` | HOC для копирования | `text`, `children` (render prop) |
| `FilePreview` | Превью файла | `file\|url`, `name?`, `onClose?` |
| `ArrowToggle` | Стрелка-тогл | `direction?: 'top'\|'bottom'\|'left'\|'right'` |
| `Card` | Карточка-контейнер | `type?: 'container'\|'selection'\|'action'`, `view?: 'outlined'\|'filled'\|'clear'`, `theme?: 'normal'\|'info'\|'positive'\|'warning'\|'danger'`, `selected?`, `disabled?`, `onClick?` |

#### Хуки и утилиты

```tsx
import { useToaster } from '@gravity-ui/uikit';
import { ToasterComponent } from '@gravity-ui/uikit'; // монтируй в App

// Или singleton
import { toaster } from '@gravity-ui/uikit/toaster-singleton';

const { add } = useToaster();
add({
  name: 'unique-id',
  title: 'Заголовок',
  content: 'Текст',
  theme: 'success' | 'info' | 'warning' | 'danger' | 'normal',
  autoHiding: 3000,
  isClosable: true,
});
```

#### Таблица — пример использования

```tsx
import { Table } from '@gravity-ui/uikit';

const columns = [
  { id: 'name', name: 'Имя' },
  { id: 'status', name: 'Статус', template: (row) => <Label>{row.status}</Label> },
  { id: 'actions', name: '', template: (row) => <Button>...</Button> },
];

<Table
  data={rows}
  columns={columns}
  onRowClick={(row) => console.log(row)}
  getRowId={(row) => row.id}
  emptyMessage="Нет данных"
/>
```

#### Dialog — пример

```tsx
import { Dialog, Button } from '@gravity-ui/uikit';

<Dialog open={isOpen} onClose={() => setIsOpen(false)} size="m">
  <Dialog.Header caption="Заголовок" />
  <Dialog.Body>Содержимое</Dialog.Body>
  <Dialog.Footer
    onClickButtonApply={() => handleConfirm()}
    onClickButtonCancel={() => setIsOpen(false)}
    textButtonApply="Подтвердить"
    textButtonCancel="Отмена"
  />
</Dialog>
```

---

## 2. @gravity-ui/icons

**npm:** `@gravity-ui/icons` | **Версия:** 2.18.0 | **Showcase:** https://preview.gravity-ui.com/icons/

### Установка

```bash
npm install --save-dev @gravity-ui/icons
```

### Использование — два способа

```tsx
// Способ 1 — именованный импорт (tree-shaking)
import { Cloud, Gear, Person, Plus, Pencil, TrashBin, Check, Xmark } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

<Icon data={Cloud} size={16} />
<Icon data={Gear} size="m" />

// Способ 2 — прямой импорт
import Cloud from '@gravity-ui/icons/Cloud';
```

### Категории иконок (наиболее используемые)

| Категория | Примеры |
|-----------|---------|
| **Действия** | `Plus`, `Minus`, `Pencil`, `TrashBin`, `Check`, `Xmark`, `Copy`, `Download`, `Upload` |
| **Навигация** | `ChevronDown`, `ChevronUp`, `ChevronLeft`, `ChevronRight`, `ArrowLeft`, `ArrowRight` |
| **Пользователь** | `Person`, `PersonAdd`, `Persons` |
| **Система** | `Gear`, `GearFill`, `Bell`, `BellFill`, `Lock`, `LockOpen` |
| **Файлы** | `File`, `Folder`, `FolderOpen`, `FileText`, `FilePlus` |
| **Медиа** | `Play`, `Pause`, `Stop`, `Mic` |
| **Облако** | `Cloud`, `CloudArrowUpIn`, `CloudArrowDownOut` |
| **Данные** | `Database`, `ChartBar`, `ChartLine`, `CirclesIntersection` |
| **UI** | `Eye`, `EyeSlash`, `Filter`, `FilterFill`, `Magnifier`, `MagnifierMinus`, `MagnifierPlus` |
| **Статус** | `CircleCheck`, `CircleCheckFill`, `TriangleExclamation`, `CircleXmark`, `CircleInfo` |
| **Разное** | `Ellipsis`, `EllipsisVertical`, `Sliders`, `Star`, `StarFill`, `Heart`, `Link`, `Share` |

### Поиск иконок

Полный актуальный каталог: https://preview.gravity-ui.com/icons/
Или в файловой системе: `ls frontend/node_modules/@gravity-ui/icons/` — каждый файл = одна иконка

---

## 3. @gravity-ui/aikit

**npm:** `@gravity-ui/aikit` | **Версия:** 1.12.0 | **GitHub:** https://github.com/gravity-ui/aikit
**Storybook:** https://preview.gravity-ui.com/aikit/

### Установка

```bash
npm install @gravity-ui/aikit
```

### Архитектура (Atomic Design)

```
atoms → molecules → organisms → templates → pages
```

### Страница целиком — ChatContainer

```tsx
import { ChatContainer } from '@gravity-ui/aikit';
import type { ChatType, TChatMessage } from '@gravity-ui/aikit';

function App() {
  const [messages, setMessages] = useState<TChatMessage[]>([]);
  const [chats, setChats] = useState<ChatType[]>([]);
  const [activeChat, setActiveChat] = useState<ChatType | null>(null);

  return (
    <ChatContainer
      chats={chats}
      activeChat={activeChat}
      messages={messages}
      onSendMessage={async (data) => { /* логика отправки */ }}
      onSelectChat={setActiveChat}
      onCreateChat={() => { /* создать чат */ }}
      onDeleteChat={(chat) => { /* удалить чат */ }}
    />
  );
}
```

### Компоненты по уровням

#### Atoms (базовые элементы)
```tsx
import {
  ActionButton,    // кнопка с тултипом
  Alert,           // алерт-сообщения
  ChatDate,        // форматирование даты
  ContextIndicator,// индикатор использования контекста
  ContextItem,     // контекст-метка с удалением
  DiffStat,        // статистика изменений кода
  Disclaimer,      // дисклеймер
  InlineCitation,  // цитата в тексте
  Loader,          // индикатор загрузки
  MarkdownRenderer,// рендер Yandex Flavored Markdown
  MessageBalloon,  // обёртка сообщения
  Shimmer,         // эффект загрузки
  SubmitButton,    // кнопка отправки
  ToolIndicator,   // статус выполнения инструмента
} from '@gravity-ui/aikit';
```

#### Molecules (комбинации)
```tsx
import {
  BaseMessage,       // базовая обёртка для сообщений
  ButtonGroup,       // группа кнопок с ориентацией
  InputContext,      // управление контекстом
  PromptInputBody,   // textarea с авторостом
  PromptInputFooter, // футер с иконками и кнопкой
  PromptInputHeader, // хедер с контекстом и индикатором
  PromptInputPanel,  // панель-контейнер
  Suggestions,       // кнопки-подсказки
  Tabs,              // вкладки с удалением
  ToolFooter,        // футер сообщения-инструмента
  ToolHeader,        // хедер сообщения-инструмента
} from '@gravity-ui/aikit';
```

#### Organisms (с логикой)
```tsx
import {
  AssistantMessage,  // сообщение ИИ-ассистента
  Header,            // шапка чата
  MessageList,       // список сообщений
  PromptInput,       // поле ввода
  ThinkingMessage,   // "думает..."
  ToolMessage,       // сообщение-инструмент
  UserMessage,       // сообщение пользователя
} from '@gravity-ui/aikit';
```

#### Templates
```tsx
import {
  ChatContent,    // основной контент чата
  EmptyContainer, // пустое состояние
  History,        // история чатов
} from '@gravity-ui/aikit';
```

### Типы

```tsx
import type {
  TChatMessage,     // сообщение чата
  ChatType,         // тип чата
  TMessageRole,     // 'user' | 'assistant' | 'tool'
} from '@gravity-ui/aikit';
```

---

## 4. @gravity-ui/markdown-editor

**npm:** `@gravity-ui/markdown-editor` | **Версия:** 15.35.1 | **GitHub:** https://github.com/gravity-ui/markdown-editor
**Storybook:** https://preview.gravity-ui.com/md-editor/

### Установка

```bash
npm install @gravity-ui/markdown-editor @diplodoc/transform
```

peerDependencies: `react`, `react-dom`, `@gravity-ui/uikit`, `@gravity-ui/components`

### Основной паттерн — хук + компонент

```tsx
import { useMarkdownEditor, MarkdownEditorView } from '@gravity-ui/markdown-editor';
import { configure } from '@gravity-ui/markdown-editor';

configure({ lang: 'ru' });

function Editor({ onSubmit }: { onSubmit: (md: string) => void }) {
  const editor = useMarkdownEditor({ allowHTML: false });

  React.useEffect(() => {
    const handler = () => onSubmit(editor.getValue());
    editor.on('submit', handler);
    return () => editor.off('submit', handler);
  }, [editor, onSubmit]);

  return (
    <MarkdownEditorView
      editor={editor}
      stickyToolbar
      autofocus
    />
  );
}
```

### useMarkdownEditor — опции

```tsx
const editor = useMarkdownEditor({
  allowHTML: false,        // разрешить HTML
  linkify: true,           // автоссылки
  breaks: true,            // переносы строк
  initialMarkup: '',       // начальное содержимое
  initialEditorType: 'wysiwyg' | 'markup', // режим по умолчанию
  extensions: [],          // расширения ProseMirror/CodeMirror
});
```

### Методы editor

```tsx
editor.getValue()          // → string (markdown)
editor.setValue(markdown)  // установить содержимое
editor.focus()             // установить фокус
editor.on(event, handler)  // подписка
editor.off(event, handler) // отписка
// события: 'submit', 'change', 'toolbar-action'
```

### MarkdownEditorView — пропсы

```tsx
<MarkdownEditorView
  editor={editor}
  stickyToolbar     // тулбар залипает сверху
  autofocus         // фокус при монтировании
  className?
  renderPreview?    // кастомный рендер превью для markup режима
  toaster?          // instance toaster
/>
```

### Расширения (по необходимости)

```tsx
import { Math } from '@gravity-ui/markdown-editor/extensions/math';    // LaTeX
import { Mermaid } from '@gravity-ui/markdown-editor/extensions/mermaid'; // диаграммы
import { GPT } from '@gravity-ui/markdown-editor/extensions/gpt';      // AI интеграция
```

---

## 5. @gravity-ui/chartkit

**npm:** `@gravity-ui/chartkit` | **Версия:** 7.42.2 | **GitHub:** https://github.com/gravity-ui/chartkit
**Storybook:** https://preview.gravity-ui.com/chartkit/

### Установка

```bash
npm install --save-dev @gravity-ui/chartkit @gravity-ui/uikit
```

### Архитектура — плагинная система

ChartKit работает через плагины. Нужно зарегистрировать плагин перед использованием.

```tsx
import ChartKit, { settings } from '@gravity-ui/chartkit';
import '@gravity-ui/uikit/styles/styles.css';

// Регистрируй нужные плагины один раз при инициализации приложения
settings.set({ plugins: [YagrPlugin] }); // или любой другой плагин
```

### Плагины

| Плагин | Импорт | Тип данных | Описание |
|--------|--------|-----------|----------|
| **Yagr** | `@gravity-ui/chartkit/yagr` | `YagrWidgetData` | Временные ряды, canvas-рендеринг, высокая производительность |
| **Highcharts** | `@gravity-ui/chartkit/highcharts` | `HighchartsWidgetData` | Богатые интерактивные графики |
| **D3** | `@gravity-ui/chartkit/d3` | `D3WidgetData` | SVG-графики через D3.js |

### Использование — Yagr (линейные графики)

```tsx
import ChartKit, { settings } from '@gravity-ui/chartkit';
import { YagrPlugin } from '@gravity-ui/chartkit/yagr';
import type { YagrWidgetData } from '@gravity-ui/chartkit/yagr';

settings.set({ plugins: [YagrPlugin] });

const data: YagrWidgetData = {
  data: {
    timeline: [1636838612441, 1636925012441, /* ... */],
    graphs: [
      {
        id: '0',
        name: 'Серия 1',
        color: '#6c59c2',
        data: [25, 52, 89, 72, 39],
      },
    ],
  },
  libraryConfig: {
    chart: {
      series: { type: 'line' }, // 'line' | 'area' | 'column' | 'dots'
    },
    title: { text: 'Заголовок графика' },
    axes: {
      x: { label: 'Время' },
      y: { label: 'Значение' },
    },
  },
};

function MyChart() {
  return (
    <div style={{ height: 400 }}>
      <ChartKit type="yagr" data={data} />
    </div>
  );
}
```

### Использование — D3 (bar, pie)

```tsx
import ChartKit, { settings } from '@gravity-ui/chartkit';
import { D3Plugin } from '@gravity-ui/chartkit/d3';
import type { D3WidgetData } from '@gravity-ui/chartkit/d3';

settings.set({ plugins: [D3Plugin] });

const data: D3WidgetData = {
  series: {
    data: [
      {
        type: 'bar-x',  // 'bar-x' | 'bar-y' | 'pie' | 'line' | 'scatter' | 'area'
        name: 'Данные',
        data: [
          { x: 'Январь', y: 100 },
          { x: 'Февраль', y: 150 },
        ],
      },
    ],
  },
  title: { text: 'Продажи' },
};

<div style={{ height: 300 }}>
  <ChartKit type="d3" data={data} />
</div>
```

### Компонент ChartKit — пропсы

```tsx
<ChartKit
  type="yagr" | "d3" | "highcharts"  // тип плагина
  data={data}                          // данные соответствующего типа
  onLoad?={(chart) => {}}             // коллбек после загрузки
  onError?={(err) => {}}              // коллбек при ошибке
  renderPluginLoader?={() => <Loader />} // кастомный лоадер
/>
```

---

## 6. @gravity-ui/i18n

**npm:** `@gravity-ui/i18n` (монорепо) | **Версия:** 1.8.0 | **GitHub:** https://github.com/gravity-ui/i18n

### Пакеты в монорепо

| Пакет | npm | Описание |
|-------|-----|----------|
| `i18n` | `@gravity-ui/i18n-core` | Лёгкая i18n библиотека |
| `i18n-react` | `@gravity-ui/i18n-react` | Для React (ICU Message Syntax) |
| `i18n-node` | `@gravity-ui/i18n-node` | Для Node.js сервера |
| `eslint-plugin-i18n` | `@gravity-ui/eslint-plugin-i18n` | ESLint правила |
| `i18n-cli` | `@gravity-ui/i18n-cli` | Утилита для файлов переводов |

### Но в проекте с Gravity UI достаточно configure из uikit

```tsx
// Для локализации компонентов UIKit достаточно:
import { configure } from '@gravity-ui/uikit';
configure({ lang: 'ru' });

// И в markdown-editor:
import { configure as configureMD } from '@gravity-ui/markdown-editor';
configureMD({ lang: 'ru' });
```

### Для собственных переводов — @gravity-ui/i18n-react

```bash
npm install @gravity-ui/i18n-react
```

```tsx
import { I18nProvider, useTranslate } from '@gravity-ui/i18n-react';

// Файл переводов src/i18n/ru.json
const ru = {
  "common.save": "Сохранить",
  "common.cancel": "Отменить",
};

// Провайдер в App.tsx
<I18nProvider lang="ru" keyset={ru}>
  <App />
</I18nProvider>

// Использование в компоненте
function MyComponent() {
  const { t } = useTranslate('common');
  return <Button>{t('save')}</Button>;
}
```

---

## 7. @gravity-ui/prettier-config

**npm:** `@gravity-ui/prettier-config` | **GitHub:** https://github.com/gravity-ui/prettier-config

### Установка

```bash
npm install --save-dev prettier @gravity-ui/prettier-config
```

### Использование

```js
// .prettierrc.js в корне проекта
module.exports = require('@gravity-ui/prettier-config');
```

### Что включает конфиг

Стандартные правила Gravity UI: printWidth 100, tabWidth 4, singleQuote true, trailingComma all, bracketSpacing true, arrowParens always.

---

## 8. Типовые паттерны страниц

### Страница со списком + фильтры + таблица

```tsx
import {
  Button, TextInput, Select, Table, Pagination,
  Loader, Text, Breadcrumbs, Label, Icon, DropdownMenu
} from '@gravity-ui/uikit';
import { Plus, Pencil, TrashBin, Filter } from '@gravity-ui/icons';

function ListPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const columns = [
    { id: 'name', name: 'Название' },
    {
      id: 'status', name: 'Статус',
      template: (row) => (
        <Label theme={row.status === 'active' ? 'success' : 'danger'}>
          {row.status}
        </Label>
      )
    },
    {
      id: 'actions', name: '',
      template: (row) => (
        <DropdownMenu
          items={[
            { text: 'Редактировать', icon: <Icon data={Pencil} />, action: () => onEdit(row) },
            { text: 'Удалить', icon: <Icon data={TrashBin} />, action: () => onDelete(row), theme: 'danger' },
          ]}
        />
      )
    },
  ];

  return (
    <div>
      <Breadcrumbs items={[{ text: 'Главная', href: '/' }, { text: 'Список' }]} />
      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <TextInput
          value={search}
          onUpdate={setSearch}
          placeholder="Поиск..."
          hasClear
          style={{ width: 300 }}
        />
        <Button view="action" onClick={() => setIsCreateOpen(true)}>
          <Icon data={Plus} />
          Создать
        </Button>
      </div>
      <Table data={items} columns={columns} getRowId={r => r.id} emptyMessage="Нет данных" />
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onUpdate={setPage} />
    </div>
  );
}
```

### Страница с формой (создание/редактирование)

```tsx
import {
  Card, Text, TextInput, Select, Checkbox,
  Button, Alert, Loader
} from '@gravity-ui/uikit';
import { useToaster } from '@gravity-ui/uikit';

function FormPage() {
  const { add } = useToaster();
  const [name, setName] = useState('');
  const [type, setType] = useState<string[]>([]);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    try {
      await api.save({ name, type });
      add({ name: 'save-ok', title: 'Сохранено', theme: 'success' });
    } catch (e) {
      setError('Ошибка сохранения');
    }
  };

  return (
    <Card view="outlined" style={{ padding: 24, maxWidth: 600 }}>
      <Text variant="header-1">Создать запись</Text>
      {error && <Alert theme="danger" message={error} style={{ margin: '16px 0' }} />}
      <TextInput
        label="Название"
        value={name}
        onUpdate={setName}
        placeholder="Введите название"
        error={!name ? 'Обязательное поле' : undefined}
        size="l"
      />
      <Select
        label="Тип"
        value={type}
        onUpdate={setType}
        options={[
          { value: 'a', content: 'Тип A' },
          { value: 'b', content: 'Тип B' },
        ]}
        size="l"
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
        <Button view="action" size="l" onClick={handleSubmit}>Сохранить</Button>
        <Button view="outlined" size="l" onClick={() => navigate(-1)}>Отмена</Button>
      </div>
    </Card>
  );
}
```

### Страница-дашборд с графиками

```tsx
import { Card, Text, Skeleton } from '@gravity-ui/uikit';
import ChartKit, { settings } from '@gravity-ui/chartkit';
import { D3Plugin } from '@gravity-ui/chartkit/d3';

settings.set({ plugins: [D3Plugin] });

function DashboardPage() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <Card view="outlined" style={{ padding: 20 }}>
        <Text variant="subheader-2">Активность</Text>
        <div style={{ height: 300 }}>
          <ChartKit type="d3" data={activityData} />
        </div>
      </Card>
      <Card view="outlined" style={{ padding: 20 }}>
        <Text variant="subheader-2">Распределение</Text>
        <div style={{ height: 300 }}>
          <ChartKit type="d3" data={pieData} />
        </div>
      </Card>
    </div>
  );
}
```

### Подтверждение удаления (Dialog)

```tsx
import { Dialog, Text, Button } from '@gravity-ui/uikit';

function DeleteConfirm({ open, onClose, onConfirm, itemName }) {
  return (
    <Dialog open={open} onClose={onClose} size="s">
      <Dialog.Header caption="Удаление" />
      <Dialog.Body>
        <Text>Вы уверены, что хотите удалить «{itemName}»? Это действие необратимо.</Text>
      </Dialog.Body>
      <Dialog.Footer
        onClickButtonApply={onConfirm}
        onClickButtonCancel={onClose}
        textButtonApply="Удалить"
        textButtonCancel="Отмена"
        propsButtonApply={{ view: 'outlined-danger' }}
      />
    </Dialog>
  );
}
```

---

## Быстрая шпаргалка по импортам

```tsx
// ВСЕ базовые компоненты
import {
  Button, Link, Text, Icon, Label, Divider,
  TextInput, TextArea, NumberInput, PasswordInput,
  Select, Checkbox, Radio, RadioButton, RadioGroup, Switch, Slider,
  Table, List, DefinitionList, Pagination, Progress, Skeleton,
  Breadcrumbs, Tabs, Menu, Stepper,
  Modal, Dialog, Popup, Popover, Tooltip, DropdownMenu, Sheet, Drawer,
  Alert, Loader, Spin, Disclosure, Accordion,
  Avatar, AvatarStack, ClipboardButton, CopyToClipboard, Card,
  FilePreview, ArrowToggle,
  useToaster, ToasterComponent, ThemeProvider, configure,
} from '@gravity-ui/uikit';

// Иконки
import { Plus, Pencil, TrashBin, Check, Xmark, Gear, Person,
         ChevronDown, ChevronRight, MagnifierFill, Filter, Ellipsis } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit'; // обёртка для иконок

// AI чат
import { ChatContainer, PromptInput, MessageList, AssistantMessage } from '@gravity-ui/aikit';

// Markdown редактор
import { useMarkdownEditor, MarkdownEditorView } from '@gravity-ui/markdown-editor';

// Графики
import ChartKit, { settings } from '@gravity-ui/chartkit';
import { D3Plugin } from '@gravity-ui/chartkit/d3';
import { YagrPlugin } from '@gravity-ui/chartkit/yagr';
```
