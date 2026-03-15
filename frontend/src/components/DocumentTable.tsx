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
} from '@gravity-ui/uikit';
import { FileText, TrashBin, ArrowsRotateRight, ArrowUpFromSquare } from '@gravity-ui/icons';
import { toaster } from '@gravity-ui/uikit/toaster-singleton';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteDocument } from '../api/documents';
import { reindexDocument } from '../api/admin';
import type { Document } from '../types';
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

type SortKey = 'title' | 'uploaded_at' | 'file_size';

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

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDocument(id),
    onSuccess: () => {
      toaster.add({
        name: 'delete-ok',
        title: 'Документ удалён',
        theme: 'success',
        autoHiding: 3000,
      });
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: () => {
      toaster.add({
        name: 'delete-err',
        title: 'Ошибка при удалении',
        theme: 'danger',
        autoHiding: 4000,
      });
    },
  });

  const reindexMutation = useMutation({
    mutationFn: (id: number) => reindexDocument(id),
    onSuccess: () => {
      toaster.add({
        name: 'reindex-ok',
        title: 'Переиндексация запущена',
        theme: 'success',
        autoHiding: 3000,
      });
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: () => {
      toaster.add({
        name: 'reindex-err',
        title: 'Ошибка при запуске переиндексации',
        theme: 'danger',
        autoHiding: 4000,
      });
    },
  });

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  const columns = [
    {
      id: 'type_icon',
      name: '',
      template: () => <Icon data={FileText} size={18} />,
    },
    {
      id: 'title',
      name: `Название${sortArrow('title')}`,
      template: (doc: Document) => (
        <div style={{ maxWidth: 260 }}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setPreviewDoc(doc);
            }}
            style={{
              color: 'var(--g-color-text-link)',
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
            <Text variant="caption-2" color="hint">
              {doc.filename}
            </Text>
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
    },
    {
      id: 'file_size',
      name: `Размер${sortArrow('file_size')}`,
      template: (doc: Document) => (
        <Text variant="body-1">{formatSize(doc.file_size)}</Text>
      ),
    },
    {
      id: 'status',
      name: 'Статус',
      template: (doc: Document) => (
        <Label theme={STATUS_THEMES[doc.status]} size="s">
          {STATUS_LABELS[doc.status]}
        </Label>
      ),
    },
    {
      id: 'uploaded_at',
      name: `Дата${sortArrow('uploaded_at')}`,
      template: (doc: Document) => (
        <Text variant="body-1">{formatDate(doc.uploaded_at)}</Text>
      ),
    },
    {
      id: 'folder_path',
      name: 'Папка',
      template: (doc: Document) => (
        <Text
          variant="caption-2"
          color="secondary"
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
            maxWidth: 160,
          }}
          title={doc.folder_path}
        >
          {doc.folder_path}
        </Text>
      ),
    },
    {
      id: 'share',
      name: '',
      template: (doc: Document) =>
        isAdmin || doc.uploaded_by === currentUserId ? (
          <Button
            view="flat"
            size="s"
            onClick={() => setShareDoc(doc)}
            title="Поделиться"
          >
            <Icon data={ArrowUpFromSquare} size={14} />
          </Button>
        ) : null,
    },
    ...(isAdmin
      ? [
          {
            id: 'actions',
            name: 'Действия',
            template: (doc: Document) => (
              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                <Button
                  view="outlined"
                  size="s"
                  loading={reindexMutation.isPending && reindexMutation.variables === doc.id}
                  onClick={() => reindexMutation.mutate(doc.id)}
                  title="Переиндексировать"
                >
                  <Icon data={ArrowsRotateRight} size={14} />
                </Button>
                <Button
                  view="outlined-danger"
                  size="s"
                  onClick={() => setDeleteTarget(doc)}
                  title="Удалить"
                >
                  <Icon data={TrashBin} size={14} />
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Search */}
      <TextInput
        placeholder="Поиск по названию..."
        value={inputValue}
        onUpdate={handleInputChange}
        style={{ maxWidth: 400 }}
      />

      {/* Table */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 40, width: '100%' }} />
          ))}
        </div>
      ) : (
        <Table
          data={items}
          columns={columns}
          getRowId={(row) => String(row.id)}
          emptyMessage="Документов не найдено"
          onRowClick={(row) => {
            // clicking row header cells (sortable) is handled via column name click
            void row;
          }}
        />
      )}

      {/* Sort controls */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <Text variant="caption-2" color="secondary">Сортировка:</Text>
        {(['title', 'uploaded_at', 'file_size'] as SortKey[]).map((key) => (
          <Button
            key={key}
            view={sortKey === key ? 'action' : 'flat'}
            size="s"
            onClick={() => onSort(key)}
          >
            {key === 'title' ? 'Название' : key === 'uploaded_at' ? 'Дата' : 'Размер'}
            {sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
          </Button>
        ))}
      </div>

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
            Вы уверены что хотите удалить &laquo;{deleteTarget?.title}&raquo;? Это действие
            необратимо.
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
