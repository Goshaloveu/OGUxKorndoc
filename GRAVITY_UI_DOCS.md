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
8. [@gravity-ui/navigation — навигация и лейаут](#8-gravity-uinavigation)
9. [Типовые паттерны страниц](#9-типовые-паттерны-страниц)

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

## 8. @gravity-ui/navigation

**npm:** `@gravity-ui/navigation` | **Версия:** 4.x | **GitHub:** https://github.com/gravity-ui/navigation
**Storybook:** https://preview.gravity-ui.com/navigation/

> ⚠️ **КРИТИЧЕСКИ ВАЖНО**: НЕ пиши свой Layout, Header, Sidebar, Footer с нуля!
> Вся навигационная обвязка приложения (боковая панель, хедер, футер, контент-область) реализуется готовыми компонентами из `@gravity-ui/navigation`.
> Компонент `Layout` в `@gravity-ui/navigation` НЕ существует — используй `AsideHeader` (простой случай) или `PageLayout` + `PageLayoutAside` (продвинутый случай).

### Установка

```bash
npm install @gravity-ui/navigation
```

peer-зависимости:

```bash
npm install @gravity-ui/uikit @gravity-ui/icons @gravity-ui/components @bem-react/classname react react-dom
```

### Все компоненты импортируются из `'@gravity-ui/navigation'`

```tsx
import {
  AsideHeader,       // Главная боковая навигация (sidebar)
  PageLayout,        // Контейнер лейаута (sidebar + content)
  PageLayoutAside,   // Sidebar-часть для PageLayout
  AsideFallback,     // Скелетон-заглушка для ленивой загрузки sidebar
  FooterItem,        // Элемент футера боковой навигации
  Logo,              // Логотип в sidebar
  MobileLogo,        // Логотип для мобильной навигации
  Drawer,            // Выдвижная панель поверх контента
  DrawerItem,        // Элемент Drawer
  Footer,            // Футер страницы (десктоп)
  MobileFooter,      // Футер страницы (мобайл)
  MobileHeader,      // Хедер мобильной навигации
  MobileHeaderFooterItem, // Элемент футера в MobileHeader
  HotkeysPanel,      // Панель горячих клавиш
  ActionBar,         // Горизонтальная панель действий (хедер контента)
  Settings,          // Панель настроек
  AllPagesPanel,     // Панель управления видимостью пунктов меню
} from '@gravity-ui/navigation';
```

---

### AsideHeader — боковая навигация (ОСНОВНОЙ КОМПОНЕНТ)

Главный компонент для создания навигации приложения. Включает в себя: логотип, меню, футер, выдвижные панели.

**Два режима использования:**

#### Режим 1 — Простой (AsideHeader рендерит контент)

```tsx
import {AsideHeader} from '@gravity-ui/navigation';
import {Gear, House, Persons} from '@gravity-ui/icons';

function App() {
  const [compact, setCompact] = useState(false);

  return (
    <AsideHeader
      logo={{
        text: 'Мой Сервис',
        icon: LogoIcon, // SVG-компонент логотипа
        href: '/',
      }}
      compact={compact}
      onChangeCompact={setCompact}
      headerDecoration
      menuItems={[
        {
          id: 'home',
          title: 'Главная',
          icon: House,
          current: location.pathname === '/',
          onItemClick: () => navigate('/'),
        },
        {
          id: 'users',
          title: 'Пользователи',
          icon: Persons,
          current: location.pathname === '/users',
          onItemClick: () => navigate('/users'),
        },
        {
          id: 'divider-1',
          type: 'divider',
          title: '',
        },
        {
          id: 'settings',
          title: 'Настройки',
          icon: Gear,
          type: 'regular',
          onItemClick: () => navigate('/settings'),
        },
      ]}
      renderFooter={({size}) => (
        <FooterItem
          id="support"
          title="Поддержка"
          icon={LifeRing}
          onItemClick={() => window.open('/support')}
        />
      )}
      renderContent={({size}) => (
        <div style={{padding: 20}}>
          {/* size — текущая ширина sidebar в px, полезно для адаптации */}
          <Outlet />
        </div>
      )}
    />
  );
}
```

#### Режим 2 — Продвинутый (PageLayout + ленивая загрузка sidebar)

Для оптимизации: контент рендерится сразу, sidebar — лениво.

```tsx
// Main.tsx
import {PageLayout, AsideFallback} from '@gravity-ui/navigation';
import {Suspense, lazy} from 'react';

const Aside = lazy(() =>
  import('./Aside').then(({Aside}) => ({default: Aside}))
);

function Main() {
  return (
    <PageLayout>
      <Suspense fallback={<AsideFallback />}>
        <Aside />
      </Suspense>

      <PageLayout.Content>
        <Outlet />
      </PageLayout.Content>
    </PageLayout>
  );
}
```

```tsx
// Aside.tsx
import {PageLayoutAside} from '@gravity-ui/navigation';

export function Aside() {
  return (
    <PageLayoutAside
      logo={{text: 'Сервис', icon: LogoIcon, href: '/'}}
      menuItems={menuItems}
      compact={compact}
      onChangeCompact={setCompact}
    />
  );
}
```

#### Пропсы AsideHeader

| Проп | Тип | По умолчанию | Описание |
|------|-----|-------------|----------|
| `logo` | `LogoProps` | — | Логотип: `{text, icon, href?, iconSize?, onClick?, wrapper?}` |
| `compact` | `boolean` | `false` | Свёрнутое состояние |
| `onChangeCompact` | `(compact: boolean) => void` | — | Колбек переключения состояния |
| `hideCollapseButton` | `boolean` | `false` | Скрыть кнопку свернуть/развернуть |
| `headerDecoration` | `boolean` | `false` | Цветной фон верхней секции (логотип + subheader) |
| `customBackground` | `React.ReactNode` | — | Кастомный фон sidebar |
| `customBackgroundClassName` | `string` | — | CSS-класс фона |
| `menuItems` | `AsideHeaderItem[]` | `[]` | Пункты основного меню (средняя секция) |
| `subheaderItems` | `AsideHeaderItem[]` | `[]` | Элементы под логотипом (верхняя секция) |
| `renderFooter` | `(data: {size: number}) => ReactNode` | — | Рендер нижней секции sidebar |
| `renderContent` | `(data: {size: number}) => ReactNode` | — | Рендер основного контента справа |
| `panelItems` | `DrawerItem[]` | `[]` | Элементы выдвижных панелей |
| `onClosePanel` | `() => void` | — | Колбек закрытия панели |
| `topAlert` | `TopAlert` | — | Контейнер алерта сверху |
| `menuMoreTitle` | `string` | `"Ещё"` | Заголовок кнопки "ещё" когда элементы не помещаются |
| `collapseTitle` | `string` | `"Свернуть"` | Текст тултипа для свёртывания |
| `expandTitle` | `string` | `"Развернуть"` | Текст тултипа для развёртывания |
| `onMenuItemsChanged` | `(items: AsideHeaderItem[]) => void` | — | Колбек при изменении видимости пунктов меню (AllPages) |
| `openModalSubscriber` | `((open: boolean) => void) => void` | — | Подписка на открытие/закрытие модальных окон |
| `className` | `string` | — | CSS-класс |
| `qa` | `string` | — | data-qa атрибут |

#### Тип AsideHeaderItem (пункт меню)

```tsx
interface AsideHeaderItem {
  id: string;                     // Уникальный ID
  title: React.ReactNode;         // Заголовок
  icon: IconProps['data'];        // Иконка из @gravity-ui/icons
  iconSize?: number | string;     // Размер иконки (default: 18)
  type?: 'regular' | 'action' | 'divider'; // Тип элемента (default: 'regular')
  current?: boolean;              // Текущий/выбранный элемент
  hidden?: boolean;               // Скрыт (только для AllPages)
  pinned?: boolean;               // Запрет на скрытие пользователем
  order?: number;                 // Порядок отображения
  href?: string;                  // Ссылка
  tooltipText?: React.ReactNode;  // Текст тултипа
  enableTooltip?: boolean;        // Показывать тултип (default: true)
  rightAdornment?: React.ReactNode; // Контент справа от элемента
  bringForward?: boolean;         // Показывать иконку поверх модальных окон
  onItemClick?: (item, collapsed, event) => void; // Клик по элементу
  onItemClickCapture?: (event) => void;
  itemWrapper?: ItemWrapper;      // Обёртка элемента (для popup и кастомизации)
  category?: string;              // Категория для AllPages (default: "Остальное")
  afterMoreButton?: boolean;      // Показывать после кнопки "ещё"
}
```

#### CSS-переменные для темизации AsideHeader

```css
/* Фон */
--gn-aside-header-background-color
--gn-aside-header-collapsed-background-color
--gn-aside-header-expanded-background-color
--gn-aside-header-decoration-collapsed-background-color
--gn-aside-header-decoration-expanded-background-color

/* Элементы */
--gn-aside-header-item-icon-color
--gn-aside-header-item-text-color
--gn-aside-header-item-background-color-hover

/* Текущий элемент */
--gn-aside-header-item-current-background-color
--gn-aside-header-item-current-icon-color
--gn-aside-header-item-current-text-color

/* Разделители */
--gn-aside-header-divider-horizontal-color
--gn-aside-header-divider-vertical-color

/* Размер sidebar (READ ONLY) */
--gn-aside-header-size

/* Z-indexes */
--gn-aside-header-z-index
--gn-aside-header-panel-z-index
--gn-aside-header-content-z-index
```

---

### FooterItem — элемент нижней секции sidebar

```tsx
import {FooterItem} from '@gravity-ui/navigation';
import {LifeRing, Gear, Person} from '@gravity-ui/icons';

// Используется внутри renderFooter у AsideHeader
renderFooter={({size}) => (
  <>
    <FooterItem
      id="support"
      title="Поддержка"
      icon={LifeRing}
      onItemClick={() => window.open('/support')}
    />
    <FooterItem
      id="settings"
      title="Настройки"
      icon={Gear}
      onItemClick={() => openSettingsPanel()}
    />
    <FooterItem
      id="user"
      title="Профиль"
      icon={Person}
      bringForward  // поверх модальных окон
      onItemClick={() => openUserPanel()}
    />
  </>
)}
```

`FooterItem` принимает те же пропсы, что и `AsideHeaderItem` (id, title, icon, onItemClick, bringForward, itemWrapper и т.д.)

---

### Logo — логотип

```tsx
// Передаётся в проп logo у AsideHeader
logo={{
  text: 'Мой Сервис',        // Текст рядом с иконкой
  icon: LogoSvg,              // SVG-компонент иконки
  iconSize?: number,          // Размер иконки (default: 24)
  iconClassName?: string,     // CSS-класс иконки
  textSize?: number,          // Размер текста
  href?: string,              // Ссылка при клике
  onClick?: () => void,       // Обработчик клика
  wrapper?: (node, compact) => ReactNode, // Обёртка (например, для react-router Link)
  hasWrapper?: boolean,       // Оборачивать текст в <a> / <div>
}}
```

---

### ActionBar — горизонтальная панель действий (header контента)

Гибкий горизонтальный бар для размещения навигационных элементов, кнопок и хлебных крошек над основным контентом. **Используй вместо самописного header.**

```tsx
import {ActionBar} from '@gravity-ui/navigation';
import {Button, Breadcrumbs} from '@gravity-ui/uikit';

function PageWithHeader() {
  return (
    <>
      <ActionBar aria-label="Панель действий">
        <ActionBar.Section type="primary">
          <ActionBar.Group>
            <ActionBar.Item>
              <Breadcrumbs
                items={[
                  {text: 'Главная', href: '/'},
                  {text: 'Пользователи', href: '/users'},
                  {text: 'Иван Иванов'},
                ]}
              />
            </ActionBar.Item>
          </ActionBar.Group>

          <ActionBar.Group pull="right">
            <ActionBar.Item>
              <Button view="action">Сохранить</Button>
            </ActionBar.Item>
            <ActionBar.Separator />
            <ActionBar.Item>
              <Button view="outlined">Отмена</Button>
            </ActionBar.Item>
          </ActionBar.Group>
        </ActionBar.Section>
      </ActionBar>

      <div style={{padding: 20}}>
        {/* контент страницы */}
      </div>
    </>
  );
}
```

#### Вложенные компоненты ActionBar

| Компонент | Описание | Ключевые пропсы |
|-----------|----------|-----------------|
| `ActionBar.Section` | Секция (визуальное разделение) | `type?: 'primary' \| 'secondary'` |
| `ActionBar.Group` | Группа элементов | `pull?: 'left' \| 'left-grow' \| 'right' \| 'right-grow' \| 'center' \| 'center-grow'`, `stretchContainer?: boolean` |
| `ActionBar.Item` | Контейнер для элемента | `spacing?: boolean` (default: true) |
| `ActionBar.Separator` | Визуальный разделитель | — |

---

### Footer / MobileFooter — футер страницы

Компоненты для нижней части страницы (**не путать с FooterItem** — он для sidebar).
`Footer` — десктоп, `MobileFooter` — мобайл. У обоих одинаковые пропсы.

```tsx
import {Footer} from '@gravity-ui/navigation';

<Footer
  copyright={`© ${new Date().getFullYear()} "Мой Сервис"`}
  withDivider
  logo={{
    icon: LogoIcon,
    iconSize: 24,
    text: 'Мой Сервис',
  }}
  menuItems={[
    {text: 'О сервисе', href: '/about', target: 'blank'},
    {text: 'Документация', href: '/docs', target: 'blank'},
    {text: 'Конфиденциальность', href: '/privacy', target: 'blank'},
  ]}
/>
```

#### Пропсы Footer / MobileFooter

| Проп | Тип | Описание |
|------|-----|----------|
| `className` | `string` | CSS-класс |
| `menuItems` | `FooterMenuItem[]` | Список ссылок: `{text, href, target?}` |
| `withDivider` | `boolean` | Верхняя граница |
| `moreButtonTitle` | `string` | Заголовок кнопки "ещё" |
| `onMoreButtonClick` | `MouseEventHandler` | Клик по кнопке "ещё" |
| `view` | `'normal' \| 'clear'` | `normal` — белый фон + все элементы, `clear` — прозрачный фон + только copyright |
| `logo` | `LogoProps` | Логотип: `{icon, iconSize, text}` |
| `logoWrapperClassName` | `string` | CSS-класс обёртки логотипа |
| `copyright` | `string` | Текст копирайта |

---

### Drawer / DrawerItem — выдвижная панель

Выдвижная панель поверх основного контента. Может использоваться самостоятельно или через `panelItems` в `AsideHeader`.

```tsx
import {Drawer, DrawerItem} from '@gravity-ui/navigation';

function MyPage() {
  const [isVisible, setVisible] = useState(false);
  const [width, setWidth] = useState(400);

  return (
    <div>
      <button onClick={() => setVisible(true)}>Открыть панель</button>
      <Drawer
        onEscape={() => setVisible(false)}
        onVeilClick={() => setVisible(false)}
      >
        <DrawerItem
          id="details"
          visible={isVisible}
          resizable
          width={width}
          onResize={setWidth}
        >
          <p>Содержимое панели</p>
        </DrawerItem>
      </Drawer>
    </div>
  );
}
```

#### Пропсы DrawerItem

| Проп | Тип | Описание |
|------|-----|----------|
| `id` | `string` | Уникальный ID |
| `children` | `React.ReactNode` | Содержимое |
| `visible` | `boolean` | Видимость |
| `direction` | `'left' \| 'right' \| 'top' \| 'bottom'` | Направление выезда |
| `resizable` | `boolean` | Можно менять размер |
| `width` | `number` | Ширина панели |
| `onResize` | `(width: number) => void` | Колбек изменения ширины |

---

### Settings — панель настроек

Готовая панель настроек с двухуровневой навигацией: группы → страницы → секции → элементы.

```tsx
import {Settings} from '@gravity-ui/navigation';
import {Switch, Select} from '@gravity-ui/uikit';

function SettingsPanel() {
  return (
    <Settings>
      <Settings.Group groupTitle="Общие">
        <Settings.Page title="Внешний вид" icon={Palette}>
          <Settings.Section title="Тема">
            <Settings.Item title="Тёмная тема">
              <Switch checked={isDark} onUpdate={setIsDark} />
            </Settings.Item>
            <Settings.Item title="Язык" description="Язык интерфейса приложения">
              <Select
                value={[lang]}
                onUpdate={([v]) => setLang(v)}
                options={[
                  {value: 'ru', content: 'Русский'},
                  {value: 'en', content: 'English'},
                ]}
              />
            </Settings.Item>
          </Settings.Section>
        </Settings.Page>

        <Settings.Page title="Уведомления" icon={Bell}>
          <Settings.Section title="Email">
            <Settings.Item title="Рассылка">
              <Switch />
            </Settings.Item>
          </Settings.Section>
        </Settings.Page>
      </Settings.Group>
    </Settings>
  );
}
```

#### Вложенные компоненты Settings

| Компонент | Описание | Ключевые пропсы |
|-----------|----------|-----------------|
| `Settings.Group` | Группа страниц | `groupTitle: string` |
| `Settings.Page` | Страница настроек | `title: string`, `icon?: IconData` |
| `Settings.Section` | Секция | `title: string`, `header?: ReactNode`, `withBadge?: boolean`, `hideTitle?: boolean` |
| `Settings.Item` | Элемент настройки (title + control) | `title: string`, `description?: string`, `align?: 'top' \| 'center'`, `mode?: 'row'`, `renderTitleComponent?` |

> ⚠️ Если в `Settings.Section` только один `Settings.Item`, заголовок секции не отображается.
> В мобильном `view=mobile` группировка `Settings.Group` игнорируется.

---

### MobileHeader — мобильная навигация

```tsx
import {MobileHeader} from '@gravity-ui/navigation';

<MobileHeader
  logo={{icon: LogoIcon, text: 'Сервис', href: '/'}}
  burgerMenu={{
    items: menuItems,
  }}
  panelItems={[
    {id: 'user', content: <UserPanel />, visible: isUserOpen, direction: 'right'},
  ]}
  renderContent={() => <Outlet />}
/>
```

Мобильный хедер включает бургер-меню с навигацией и выдвижными панелями.
CSS-переменные: `--gn-mobile-header-z-index`, `--gn-mobile-header-panel-z-index`.

---

### HotkeysPanel — панель горячих клавиш

```tsx
import {HotkeysPanel} from '@gravity-ui/navigation';

<HotkeysPanel
  open={isHotkeysOpen}
  onClose={() => setIsHotkeysOpen(false)}
  hotkeys={[
    {
      title: 'Навигация',
      items: [
        {keys: 'mod+k', description: 'Поиск'},
        {keys: 'mod+/', description: 'Горячие клавиши'},
      ],
    },
  ]}
  title="Горячие клавиши"
  filterable
  filterPlaceholder="Найти..."
/>
```

#### Пропсы HotkeysPanel

| Проп | Тип | Описание |
|------|-----|----------|
| `hotkeys` | `Array<{title, items}>` | Группы горячих клавиш |
| `open` | `boolean` | Видимость |
| `onClose` | `() => void` | Закрытие |
| `title` | `ReactNode` | Заголовок |
| `filterable` | `boolean` | Поиск (default: true) |
| `filterPlaceholder` | `string` | Плейсхолдер поиска |
| `platform` | `'pc' \| 'mac'` | Платформа (auto) |
| `drawerProps` | `DrawerProps` | Доп. пропсы для Drawer |

CSS: `--hotkeys-panel-width` (default: 400px).

---

### TopAlert — алерт над навигацией

Передаётся в проп `topAlert` у `AsideHeader`. Отображается над всей навигацией.

```tsx
<AsideHeader
  topAlert={{
    title: 'Внимание',
    message: 'Плановые работы 15 апреля с 03:00 до 05:00',
    theme: 'warning',
    view: 'filled',
    closable: true,
    onCloseTopAlert: () => setShowAlert(false),
  }}
  // ...остальные пропсы
/>
```

| Проп | Тип | По умолчанию | Описание |
|------|-----|-------------|----------|
| `title` | `string` | — | Заголовок |
| `message` | `AlertMessage` | — | Текст |
| `theme` | `AlertTheme` | `'warning'` | Тема: `'normal' \| 'info' \| 'positive' \| 'warning' \| 'danger'` |
| `view` | `AlertView` | `'filled'` | Вид: `'filled' \| 'outlined'` |
| `closable` | `boolean` | `false` | Кнопка закрытия |
| `onCloseTopAlert` | `() => void` | — | Колбек закрытия |
| `centered` | `boolean` | `false` | Центрировать контент |
| `dense` | `boolean` | `false` | Уменьшенные отступы |
| `actions` | `AlertActions` | — | Кнопки действий |

CSS: `--gn-top-alert-height` (read only).

---

### Полный пример лейаута приложения

```tsx
import {AsideHeader, FooterItem, ActionBar} from '@gravity-ui/navigation';
import {Button, Breadcrumbs, Text} from '@gravity-ui/uikit';
import {House, Persons, Gear, LifeRing, CircleQuestion} from '@gravity-ui/icons';
import logoIcon from './assets/logo.svg';

function AppLayout() {
  const [compact, setCompact] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    {
      id: 'home',
      title: 'Главная',
      icon: House,
      current: location.pathname === '/',
      onItemClick: () => navigate('/'),
    },
    {
      id: 'users',
      title: 'Пользователи',
      icon: Persons,
      current: location.pathname.startsWith('/users'),
      onItemClick: () => navigate('/users'),
    },
    {
      id: 'settings',
      title: 'Настройки',
      icon: Gear,
      current: location.pathname === '/settings',
      onItemClick: () => navigate('/settings'),
    },
  ];

  return (
    <AsideHeader
      logo={{text: 'Мой Сервис', icon: logoIcon, href: '/'}}
      compact={compact}
      onChangeCompact={setCompact}
      headerDecoration
      menuItems={menuItems}
      renderFooter={() => (
        <>
          <FooterItem
            id="help"
            icon={CircleQuestion}
            title="Помощь"
            onItemClick={() => window.open('/docs')}
          />
          <FooterItem
            id="support"
            icon={LifeRing}
            title="Поддержка"
            onItemClick={() => window.open('/support')}
          />
        </>
      )}
      renderContent={() => (
        <div>
          <ActionBar aria-label="Навигация">
            <ActionBar.Section>
              <ActionBar.Group>
                <ActionBar.Item>
                  <Breadcrumbs
                    items={[{text: 'Главная', href: '/'}]}
                  />
                </ActionBar.Item>
              </ActionBar.Group>
              <ActionBar.Group pull="right">
                <ActionBar.Item>
                  <Button view="action">Создать</Button>
                </ActionBar.Item>
              </ActionBar.Group>
            </ActionBar.Section>
          </ActionBar>

          <div style={{padding: 20}}>
            <Outlet />
          </div>
        </div>
      )}
    />
  );
}
```

---

## 9. Типовые паттерны страниц

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

// Навигация и лейаут
import {
  AsideHeader, PageLayout, PageLayoutAside, AsideFallback,
  FooterItem, Logo, Drawer, DrawerItem,
  Footer, MobileFooter, MobileHeader, MobileHeaderFooterItem,
  HotkeysPanel, ActionBar, Settings, AllPagesPanel,
} from '@gravity-ui/navigation';
```