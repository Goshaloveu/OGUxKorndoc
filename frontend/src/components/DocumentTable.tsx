import React, { useState, useEffect, useRef } from 'react';
import {
  Button,
  Dialog,
  Icon,
  Label,
  Pagination,
  Skeleton,
  Table,
  Text,
  TextInput,
  withTableActions,
  withTableSelection,
  withTableSorting,
} from '@gravity-ui/uikit';
import type {
  TableActionConfig,
  TableColumnSortState,
} from '@gravity-ui/uikit';
import { FileText, TrashBin, ArrowsRotateRight, ArrowUpFromSquare, Pencil } from '@gravity-ui/icons';
import { toaster } from '@gravity-ui/uikit/toaster-singleton';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteDocument, updateDocument } from '../api/documents';
import { reindexDocument } from '../api/admin';
import type { Document } from '../types';
import type { UpdateDocumentParams } from '../api/documents';
import DocumentPreviewModal from './DocumentPreviewModal';
import DocumentShareModal from './DocumentShareModal';

interface DocumentTableProps {
  items: Document[];
  total: number;
  page: number;
  pageSize: number;
  isAdmin: boolean;
  currentUserId?: number;
  isLoading?: boolean;
  sortKey: 'title' | 'uploaded_at' | 'file_size';
  sortDir: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onSearchChange: (value: string) => void;
  onSort: (key: 'title' | 'uploaded_at' | 'file_size') => void;
}

const FILE_TYPE_THEMES: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'normal'> = {
  pdf: 'danger',
  docx: 'info',
  xlsx: 'success',
  txt: 'normal',
};

const STATUS_THEMES: Record<Document['status'], 'info' | 'success' | 'warning' | 'danger' | 'normal'> = {
  pending: 'warning',
  processing: 'info',
  indexed: 'success',
  error: 'danger',
};

const STATUS_LABELS: Record<Document['status'], string> = {
  pending: 'В очереди',
  processing: 'Обработка',
  indexed: 'Индексирован',
  error: 'Ошибка',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(2)} МБ`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const EnhancedTable = withTableSorting(withTableSelection(withTableActions(Table<Document>)));

const DocumentTable: React.FC<DocumentTableProps> = ({
  items,
  total,
  page,
  pageSize,
  isAdmin,
  currentUserId,
  isLoading = false,
  sortKey,
  sortDir,
  onPageChange,
  onSearchChange,
  onSort,
}) => {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [shareDoc, setShareDoc] = useState<Document | null>(null);
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editFolder, setEditFolder] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editTags, setEditTags] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearchChange(value);
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    setSelectedIds([]);
  }, [items]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDocument(id),
    onSuccess: () => {
      toaster.add({ name: 'delete-ok', title: 'Документ удалён', theme: 'success', autoHiding: 3000 });
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: () => {
      toaster.add({ name: 'delete-err', title: 'Ошибка при удалении', theme: 'danger', autoHiding: 4000 });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => deleteDocument(id)));
    },
    onSuccess: () => {
      toaster.add({ name: 'bulk-del-ok', title: `Удалено документов: ${selectedIds.length}`, theme: 'success', autoHiding: 3000 });
      setSelectedIds([]);
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: () => {
      toaster.add({ name: 'bulk-del-err', title: 'Ошибка при массовом удалении', theme: 'danger', autoHiding: 4000 });
    },
  });

  const reindexMutation = useMutation({
    mutationFn: (id: number) => reindexDocument(id),
    onSuccess: () => {
      toaster.add({ name: 'reindex-ok', title: 'Переиндексация запущена', theme: 'success', autoHiding: 3000 });
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: () => {
      toaster.add({ name: 'reindex-err', title: 'Ошибка при запуске переиндексации', theme: 'danger', autoHiding: 4000 });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, params }: { id: number; params: UpdateDocumentParams }) =>
      updateDocument(id, params),
    onSuccess: () => {
      toaster.add({ name: 'edit-ok', title: 'Документ обновлён', theme: 'success', autoHiding: 3000 });
      setEditDoc(null);
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: () => {
      toaster.add({ name: 'edit-err', title: 'Ошибка обновления', theme: 'danger', autoHiding: 4000 });
    },
  });

  const startEdit = (doc: Document) => {
    setEditDoc(doc);
    setEditTitle(doc.title);
    setEditFolder(doc.folder_path);
    setEditDepartment(doc.department ?? '');
    setEditTags(doc.tags.join(', '));
  };

  const saveEdit = () => {
    if (!editDoc) return;
    editMutation.mutate({
      id: editDoc.id,
      params: {
        title: editTitle,
        folder_path: editFolder,
        department: editDepartment || undefined,
        tags: editTags ? editTags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      },
    });
  };

  const getRowActions = (doc: Document): TableActionConfig<Document>[] => {
    const actions: TableActionConfig<Document>[] = [];

    actions.push({
      text: 'Превью',
      handler: () => setPreviewDoc(doc),
      icon: <Icon data={FileText} size={14} />,
    });

    if (isAdmin || doc.uploaded_by === currentUserId) {
      actions.push({
        text: 'Поделиться',
        handler: () => setShareDoc(doc),
        icon: <Icon data={ArrowUpFromSquare} size={14} />,
      });
      actions.push({
        text: 'Редактировать',
        handler: () => startEdit(doc),
        icon: <Icon data={Pencil} size={14} />,
      });
    }

    if (isAdmin) {
      actions.push({
        text: 'Переиндексировать',
        handler: () => reindexMutation.mutate(doc.id),
        icon: <Icon data={ArrowsRotateRight} size={14} />,
      });
    }

    if (isAdmin || doc.uploaded_by === currentUserId) {
      actions.push({
        text: 'Удалить',
        handler: () => setDeleteTarget(doc),
        theme: 'danger',
        icon: <Icon data={TrashBin} size={14} />,
      });
    }

    return actions;
  };

  const columns = [
    {
      id: 'title',
      name: 'Название',
      meta: { sort: true },
      template: (doc: Document) => (
        <div style={{ maxWidth: 260 }}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setPreviewDoc(doc);
            }}
            style={{
              color: 'var(--g-color-text-brand-heavy)',
              textDecoration: 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
              cursor: 'pointer',
            }}
            title={doc.title}
          >
            {doc.title}
          </a>
          {doc.filename !== doc.title && (
            <Text variant="caption-2" color="hint">{doc.filename}</Text>
          )}
        </div>
      ),
    },
    {
      id: 'file_type',
      name: 'Формат',
      template: (doc: Document) => (
        <Label theme={FILE_TYPE_THEMES[doc.file_type] ?? 'normal'} size="s">
          {doc.file_type.toUpperCase()}
        </Label>
      ),
      width: 80,
    },
    {
      id: 'file_size',
      name: 'Размер',
      meta: { sort: true },
      template: (doc: Document) => <Text variant="body-1">{formatSize(doc.file_size)}</Text>,
      width: 100,
    },
    {
      id: 'status',
      name: 'Статус',
      template: (doc: Document) => (
        <Label theme={STATUS_THEMES[doc.status]} size="s">{STATUS_LABELS[doc.status]}</Label>
      ),
      width: 120,
    },
    {
      id: 'uploaded_at',
      name: 'Дата',
      meta: { sort: true },
      template: (doc: Document) => <Text variant="body-1">{formatDate(doc.uploaded_at)}</Text>,
      width: 110,
    },
    {
      id: 'folder_path',
      name: 'Папка',
      template: (doc: Document) => (
        <Text
          variant="caption-2"
          color="secondary"
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: 130 }}
          title={doc.folder_path}
        >
          {doc.folder_path}
        </Text>
      ),
      width: 140,
    },
  ];

  const sortState: TableColumnSortState[] = [{ column: sortKey, order: sortDir }];

  const handleSortStateChange = (newState: TableColumnSortState[]) => {
    if (newState.length > 0) {
      const col = newState[0].column as 'title' | 'uploaded_at' | 'file_size';
      if (col === sortKey && newState[0].order !== sortDir) {
        onSort(col);
      } else if (col !== sortKey) {
        onSort(col);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Search + bulk actions */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <TextInput
          placeholder="Поиск по названию..."
          value={inputValue}
          onUpdate={handleInputChange}
          style={{ maxWidth: 400, flex: 1 }}
        />

        {/* Bulk actions */}
        {selectedIds.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
            <Text variant="caption-2" color="secondary">
              Выбрано: {selectedIds.length}
            </Text>
            <Button
              view="outlined-danger"
              size="s"
              loading={bulkDeleteMutation.isPending}
              onClick={() => bulkDeleteMutation.mutate(selectedIds.map(Number))}
            >
              <Icon data={TrashBin} size={14} />
              Удалить выбранные
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 40, width: '100%' }} />
          ))}
        </div>
      ) : (
        <EnhancedTable
          data={items}
          columns={columns}
          getRowId={(row) => String(row.id)}
          emptyMessage="Документов не найдено"
          sortState={sortState}
          onSortStateChange={handleSortStateChange}
          disableDataSorting
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          getRowActions={getRowActions}
          rowActionsSize="m"
        />
      )}

      {/* Pagination */}
      {total > pageSize && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onUpdate={(newPage) => onPageChange(newPage)}
          />
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} size="s">
        <Dialog.Header caption="Удалить документ?" />
        <Dialog.Body>
          <Text variant="body-1">
            Вы уверены что хотите удалить &laquo;{deleteTarget?.title}&raquo;? Это действие необратимо.
          </Text>
        </Dialog.Body>
        <Dialog.Footer
          onClickButtonApply={() => {
            if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
          }}
          onClickButtonCancel={() => setDeleteTarget(null)}
          textButtonApply="Удалить"
          textButtonCancel="Отмена"
          loading={deleteMutation.isPending}
        />
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editDoc !== null} onClose={() => setEditDoc(null)} size="m">
        <Dialog.Header caption={`Редактировать: ${editDoc?.title ?? ''}`} />
        <Dialog.Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <Text variant="caption-2" color="secondary" style={{ display: 'block', marginBottom: 4 }}>Название</Text>
              <TextInput value={editTitle} onUpdate={setEditTitle} />
            </div>
            <div>
              <Text variant="caption-2" color="secondary" style={{ display: 'block', marginBottom: 4 }}>Папка</Text>
              <TextInput value={editFolder} onUpdate={setEditFolder} />
            </div>
            <div>
              <Text variant="caption-2" color="secondary" style={{ display: 'block', marginBottom: 4 }}>Отдел</Text>
              <TextInput value={editDepartment} onUpdate={setEditDepartment} placeholder="Необязательно" />
            </div>
            <div>
              <Text variant="caption-2" color="secondary" style={{ display: 'block', marginBottom: 4 }}>Теги (через запятую)</Text>
              <TextInput value={editTags} onUpdate={setEditTags} placeholder="тег1, тег2" />
            </div>
          </div>
        </Dialog.Body>
        <Dialog.Footer
          onClickButtonApply={saveEdit}
          onClickButtonCancel={() => setEditDoc(null)}
          textButtonApply="Сохранить"
          textButtonCancel="Отмена"
          loading={editMutation.isPending}
        />
      </Dialog>

      {/* Preview modal */}
      <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />

      {/* Share modal */}
      <DocumentShareModal
        docId={shareDoc?.id ?? null}
        docTitle={shareDoc?.title ?? ''}
        onClose={() => setShareDoc(null)}
      />
    </div>
  );
};

export default DocumentTable;
