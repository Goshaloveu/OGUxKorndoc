import React, { useState } from 'react';
import {
  Button,
  Label,
  Modal,
  Pagination,
  Text,
  TextInput,
} from '@gravity-ui/uikit';
import { FileText, TrashBin, ArrowsRotateRight } from '@gravity-ui/icons';
import { toaster } from '@gravity-ui/uikit/toaster-singleton';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteDocument, getPresignedUrl } from '../api/documents';
import { reindexDocument } from '../api/admin';
import type { Document } from '../types';

interface DocumentTableProps {
  items: Document[];
  total: number;
  page: number;
  pageSize: number;
  isAdmin: boolean;
  searchQuery: string;
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
  searchQuery,
  sortKey,
  sortDir,
  onPageChange,
  onSearchChange,
  onSort,
}) => {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

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
    if (sortKey !== key) return null;
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Search */}
      <TextInput
        placeholder="Поиск по названию..."
        value={searchQuery}
        onUpdate={onSearchChange}
        style={{ maxWidth: 400 }}
      />

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 14,
          }}
        >
          <thead>
            <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', width: 36 }}>Тип</th>
              <th
                style={{ padding: '8px 12px', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => onSort('title')}
              >
                Название{sortArrow('title')}
              </th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Формат</th>
              <th
                style={{ padding: '8px 12px', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => onSort('file_size')}
              >
                Размер{sortArrow('file_size')}
              </th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Статус</th>
              <th
                style={{ padding: '8px 12px', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => onSort('uploaded_at')}
              >
                Дата{sortArrow('uploaded_at')}
              </th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Папка</th>
              {isAdmin && (
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Действия</th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 8 : 7}
                  style={{ padding: '2rem', textAlign: 'center', color: '#888' }}
                >
                  Документов не найдено
                </td>
              </tr>
            ) : (
              items.map((doc) => (
                <tr
                  key={doc.id}
                  style={{
                    borderBottom: '1px solid #f0f0f0',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = '#fafafa';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '8px 12px' }}>
                    <FileText width={18} height={18} />
                  </td>
                  <td style={{ padding: '8px 12px', maxWidth: 260 }}>
                    <a
                      href="#"
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          const url = await getPresignedUrl(doc.id);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = doc.filename;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        } catch {
                          // ignore
                        }
                      }}
                      style={{
                        color: '#3d96f9',
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
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <Label theme={FILE_TYPE_THEMES[doc.file_type] ?? 'normal'} size="s">
                      {doc.file_type.toUpperCase()}
                    </Label>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    <Text variant="body-1">{formatSize(doc.file_size)}</Text>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <Label theme={STATUS_THEMES[doc.status]} size="s">
                      {STATUS_LABELS[doc.status]}
                    </Label>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <Text variant="body-1">{formatDate(doc.uploaded_at)}</Text>
                  </td>
                  <td style={{ padding: '8px 12px', maxWidth: 160 }}>
                    <Text
                      variant="caption-2"
                      color="secondary"
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                      title={doc.folder_path}
                    >
                      {doc.folder_path}
                    </Text>
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                        <Button
                          view="outlined"
                          size="s"
                          loading={reindexMutation.isPending && reindexMutation.variables === doc.id}
                          onClick={() => reindexMutation.mutate(doc.id)}
                          title="Переиндексировать"
                        >
                          <ArrowsRotateRight width={14} height={14} />
                        </Button>
                        <Button
                          view="outlined-danger"
                          size="s"
                          onClick={() => setDeleteTarget(doc)}
                          title="Удалить"
                        >
                          <TrashBin width={14} height={14} />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
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

      {/* Delete confirmation modal */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
        <div
          style={{
            padding: '1.5rem',
            minWidth: 320,
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <Text variant="header-2">Удалить документ?</Text>
          <Text variant="body-1">
            Вы уверены что хотите удалить &laquo;{deleteTarget?.title}&raquo;? Это действие
            необратимо.
          </Text>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button view="normal" onClick={() => setDeleteTarget(null)}>
              Отмена
            </Button>
            <Button
              view="outlined-danger"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
            >
              Удалить
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DocumentTable;
