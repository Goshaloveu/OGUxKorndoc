import React, { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  Icon,
  Label,
  Modal,
  NumberInput,
  Skeleton,
  Table,
  Text,
  TextInput,
  withTableActions,
} from '@gravity-ui/uikit';
import type { TableActionConfig } from '@gravity-ui/uikit';
import { Pencil, Plus, TrashBin } from '@gravity-ui/icons';
import { MarkdownEditorView, useMarkdownEditor } from '@gravity-ui/markdown-editor';
import { toaster } from '@gravity-ui/uikit/toaster-singleton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminFAQItem,
  deleteAdminFAQItem,
  getAdminFAQItems,
  updateAdminFAQItem,
} from '../../api/admin';
import type { AdminFAQItem, AdminFAQListResponse, FAQItemPayload } from '../../api/admin';

const EnhancedTable = withTableActions(Table<AdminFAQItem>);

interface FAQMarkdownEditorProps {
  value: string;
  onUpdate: (value: string) => void;
  editorKey: string;
}

const FAQMarkdownEditor: React.FC<FAQMarkdownEditorProps> = ({ value, onUpdate, editorKey }) => {
  const editor = useMarkdownEditor({
    md: {
      html: false,
      linkify: true,
      breaks: true,
    },
    initial: {
      markup: value,
      mode: 'wysiwyg',
    },
  });

  React.useEffect(() => {
    const handleChange = () => onUpdate(editor.getValue());
    editor.on('change', handleChange);
    return () => editor.off('change', handleChange);
  }, [editor, onUpdate]);

  React.useEffect(() => {
    editor.replace(value);
  }, [editor, editorKey]);

  return (
    <div style={{ minHeight: 320, border: '1px solid var(--g-color-line-generic)', borderRadius: 8 }}>
      <MarkdownEditorView editor={editor} stickyToolbar autofocus />
    </div>
  );
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof err.response === 'object' &&
    err.response !== null &&
    'data' in err.response &&
    typeof err.response.data === 'object' &&
    err.response.data !== null &&
    'detail' in err.response.data &&
    typeof err.response.data.detail === 'string'
  ) {
    return err.response.data.detail;
  }
  return fallback;
}

const FAQTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminFAQItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminFAQItem | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [order, setOrder] = useState(0);
  const [isPublished, setIsPublished] = useState(true);
  const [formVersion, setFormVersion] = useState(0);

  const { data, isLoading, isError } = useQuery<AdminFAQListResponse>({
    queryKey: ['admin-faq'],
    queryFn: getAdminFAQItems,
  });

  const sortedItems = useMemo(
    () => [...(data?.items ?? [])].sort((a, b) => a.order - b.order || a.id - b.id),
    [data?.items],
  );

  const resetForm = () => {
    setQuestion('');
    setAnswer('');
    setOrder(0);
    setIsPublished(true);
    setEditTarget(null);
  };

  const openCreate = () => {
    resetForm();
    setFormVersion((value) => value + 1);
    setModalOpen(true);
  };

  const openEdit = (item: AdminFAQItem) => {
    setEditTarget(item);
    setQuestion(item.question);
    setAnswer(item.answer);
    setOrder(item.order);
    setIsPublished(item.is_published);
    setFormVersion((value) => value + 1);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const createMutation = useMutation({
    mutationFn: (params: FAQItemPayload) => createAdminFAQItem(params),
    onSuccess: () => {
      toaster.add({ name: 'faq-created', title: 'FAQ-запись создана', theme: 'success', autoHiding: 3000 });
      closeModal();
      void queryClient.invalidateQueries({ queryKey: ['admin-faq'] });
    },
    onError: (err: unknown) => {
      toaster.add({
        name: 'faq-create-error',
        title: getErrorMessage(err, 'Не удалось создать FAQ-запись'),
        theme: 'danger',
        autoHiding: 4000,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, params }: { id: number; params: Partial<FAQItemPayload> }) =>
      updateAdminFAQItem(id, params),
    onSuccess: () => {
      toaster.add({ name: 'faq-updated', title: 'FAQ-запись обновлена', theme: 'success', autoHiding: 3000 });
      closeModal();
      void queryClient.invalidateQueries({ queryKey: ['admin-faq'] });
    },
    onError: (err: unknown) => {
      toaster.add({
        name: 'faq-update-error',
        title: getErrorMessage(err, 'Не удалось обновить FAQ-запись'),
        theme: 'danger',
        autoHiding: 4000,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminFAQItem(id),
    onSuccess: () => {
      toaster.add({ name: 'faq-deleted', title: 'FAQ-запись удалена', theme: 'success', autoHiding: 3000 });
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-faq'] });
    },
    onError: (err: unknown) => {
      toaster.add({
        name: 'faq-delete-error',
        title: getErrorMessage(err, 'Не удалось удалить FAQ-запись'),
        theme: 'danger',
        autoHiding: 4000,
      });
    },
  });

  const handleSave = () => {
    const payload: FAQItemPayload = {
      question: question.trim(),
      answer: answer.trim(),
      order,
      is_published: isPublished,
    };

    if (!payload.question || !payload.answer) return;

    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, params: payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const columns = [
    {
      id: 'order',
      name: 'Порядок',
      width: 100,
      template: (item: AdminFAQItem) => <Text variant="body-1">{item.order}</Text>,
    },
    {
      id: 'question',
      name: 'Вопрос',
      template: (item: AdminFAQItem) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Text variant="body-1">{item.question}</Text>
          <Text variant="caption-2" color="secondary">
            Обновлено: {formatDateTime(item.updated_at)}
          </Text>
        </div>
      ),
    },
    {
      id: 'is_published',
      name: 'Статус',
      width: 140,
      template: (item: AdminFAQItem) => (
        <Label theme={item.is_published ? 'success' : 'warning'} size="s">
          {item.is_published ? 'Опубликовано' : 'Черновик'}
        </Label>
      ),
    },
    {
      id: 'created_by',
      name: 'Автор',
      width: 160,
      template: (item: AdminFAQItem) => (
        <Text variant="body-1" color="secondary">
          {item.created_by_username ?? `ID ${item.created_by}`}
        </Text>
      ),
    },
  ];

  const getRowActions = (item: AdminFAQItem): TableActionConfig<AdminFAQItem>[] => [
    {
      text: 'Редактировать',
      handler: () => openEdit(item),
      icon: <Icon data={Pencil} size={14} />,
    },
    {
      text: item.is_published ? 'Снять с публикации' : 'Опубликовать',
      handler: () =>
        updateMutation.mutate({
          id: item.id,
          params: { is_published: !item.is_published },
        }),
    },
    {
      text: 'Удалить',
      handler: () => setDeleteTarget(item),
      icon: <Icon data={TrashBin} size={14} />,
      theme: 'danger',
    },
  ];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 48, width: '100%' }} />
        ))}
      </div>
    );
  }

  if (isError) {
    return <Alert theme="danger" title="Ошибка" message="Не удалось загрузить FAQ" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <Text variant="subheader-2">FAQ ({data?.total ?? 0})</Text>
        <Button view="action" onClick={openCreate}>
          <Icon data={Plus} size={16} />
          Добавить FAQ
        </Button>
      </div>

      <EnhancedTable
        data={sortedItems}
        columns={columns}
        getRowId={(item) => String(item.id)}
        emptyMessage="FAQ-записей пока нет"
        getRowActions={getRowActions}
        rowActionsSize="m"
      />

      <Modal open={modalOpen} onClose={closeModal}>
        <div
          style={{
            padding: '1.5rem',
            width: 'min(900px, calc(100vw - 48px))',
            maxHeight: 'calc(100vh - 64px)',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <Text variant="header-2">{editTarget ? 'Редактировать FAQ' : 'Добавить FAQ'}</Text>
          <TextInput
            label="Вопрос"
            placeholder="Введите вопрос"
            value={question}
            onUpdate={setQuestion}
            validationState={!question.trim() ? 'invalid' : undefined}
            errorMessage={!question.trim() ? 'Укажите вопрос' : undefined}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '1rem', alignItems: 'center' }}>
            <NumberInput value={order} onUpdate={(value) => setOrder(value ?? 0)} label="Порядок" />
            <Checkbox checked={isPublished} onUpdate={setIsPublished} content="Опубликовано" />
          </div>
          <div>
            <Text variant="body-2" style={{ display: 'block', marginBottom: 8 }}>
              Ответ
            </Text>
            <FAQMarkdownEditor
              key={formVersion}
              editorKey={String(formVersion)}
              value={answer}
              onUpdate={setAnswer}
            />
            {!answer.trim() && (
              <Text variant="caption-2" color="danger" style={{ display: 'block', marginTop: 6 }}>
                Укажите ответ
              </Text>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button view="normal" onClick={closeModal}>
              Отмена
            </Button>
            <Button
              view="action"
              loading={createMutation.isPending || updateMutation.isPending}
              disabled={!question.trim() || !answer.trim()}
              onClick={handleSave}
            >
              Сохранить
            </Button>
          </div>
        </div>
      </Modal>

      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} size="s">
        <Dialog.Header caption="Удалить FAQ-запись?" />
        <Dialog.Body>
          <Text variant="body-1">
            Запись &laquo;{deleteTarget?.question}&raquo; будет удалена без возможности восстановления.
          </Text>
        </Dialog.Body>
        <Dialog.Footer
          onClickButtonCancel={() => setDeleteTarget(null)}
          textButtonCancel="Отмена"
          onClickButtonApply={() => {
            if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
          }}
          textButtonApply="Удалить"
          propsButtonApply={{ view: 'outlined-danger' }}
          loading={deleteMutation.isPending}
        />
      </Dialog>
    </div>
  );
};

export default FAQTab;
