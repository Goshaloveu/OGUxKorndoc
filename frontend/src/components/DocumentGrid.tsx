import React, { useState } from 'react';
import { Button, Label, Modal, Skeleton, Text } from '@gravity-ui/uikit';
import { FileText, TrashBin, ArrowsRotateRight } from '@gravity-ui/icons';
import { toaster } from '@gravity-ui/uikit/toaster-singleton';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteDocument, getPresignedUrl } from '../api/documents';
import { reindexDocument } from '../api/admin';
import type { Document } from '../types';

interface DocumentGridProps {
  items: Document[];
  isAdmin: boolean;
  isLoading?: boolean;
  size: 'large' | 'small';
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

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: '#d93025',
  docx: '#1a73e8',
  xlsx: '#188038',
  txt: '#80868b',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const DocumentGrid: React.FC<DocumentGridProps> = ({
  items,
  isAdmin,
  isLoading = false,
  size,
}) => {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

  const cardWidth = size === 'large' ? 200 : 140;
  const cardHeight = size === 'large' ? 240 : 160;
  const iconSize = size === 'large' ? 48 : 32;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDocument(id),
    onSuccess: () => {
      toaster.add({ name: 'del-ok', title: 'Документ удалён', theme: 'success', autoHiding: 3000 });
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: () => {
      toaster.add({ name: 'del-err', title: 'Ошибка при удалении', theme: 'danger', autoHiding: 4000 });
    },
  });

  const reindexMutation = useMutation({
    mutationFn: (id: number) => reindexDocument(id),
    onSuccess: () => {
      toaster.add({ name: 'reindex-ok', title: 'Переиндексация запущена', theme: 'success', autoHiding: 3000 });
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: () => {
      toaster.add({ name: 'reindex-err', title: 'Ошибка переиндексации', theme: 'danger', autoHiding: 4000 });
    },
  });

  if (isLoading) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))`,
          gap: '1rem',
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} style={{ width: cardWidth, height: cardHeight, borderRadius: 12 }} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
        Документов не найдено
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))`,
          gap: '1rem',
        }}
      >
        {items.map((doc) => (
          <div
            key={doc.id}
            style={{
              width: '100%',
              minHeight: cardHeight,
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              border: '1px solid #e8e8e8',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: size === 'large' ? '1.25rem 1rem 1rem' : '1rem 0.75rem 0.75rem',
              gap: size === 'large' ? '0.5rem' : '0.35rem',
              transition: 'box-shadow 0.15s, transform 0.15s',
              cursor: 'default',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.14)';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            }}
          >
            {/* Top color stripe by file type */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: FILE_TYPE_COLORS[doc.file_type] ?? '#999',
                borderRadius: '12px 12px 0 0',
              }}
            />

            {/* File icon */}
            <div
              style={{
                width: iconSize,
                height: iconSize,
                borderRadius: 10,
                background: `${FILE_TYPE_COLORS[doc.file_type] ?? '#999'}18`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: FILE_TYPE_COLORS[doc.file_type] ?? '#999',
                marginTop: size === 'large' ? 4 : 2,
              }}
            >
              <FileText width={iconSize * 0.55} height={iconSize * 0.55} />
            </div>

            {/* Title */}
            <div
              style={{
                width: '100%',
                textAlign: 'center',
                overflow: 'hidden',
              }}
            >
              <Text
                variant={size === 'large' ? 'body-2' : 'body-1'}
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                  lineHeight: '1.3',
                  cursor: 'pointer',
                  color: '#3d96f9',
                }}
                onClick={async () => {
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
                title={doc.title}
              >
                {doc.title}
              </Text>
            </div>

            {/* Status badge */}
            <Label theme={STATUS_THEMES[doc.status]} size="s">
              {STATUS_LABELS[doc.status]}
            </Label>

            {size === 'large' && (
              <>
                {/* File type badge */}
                <Label theme={FILE_TYPE_THEMES[doc.file_type] ?? 'normal'} size="s">
                  {doc.file_type.toUpperCase()}
                </Label>

                {/* Date */}
                <Text variant="caption-2" color="secondary">
                  {formatDate(doc.uploaded_at)}
                </Text>

                {/* Admin actions */}
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: 'auto' }}>
                    <Button
                      view="outlined"
                      size="s"
                      loading={reindexMutation.isPending && reindexMutation.variables === doc.id}
                      onClick={() => reindexMutation.mutate(doc.id)}
                      title="Переиндексировать"
                    >
                      <ArrowsRotateRight width={12} height={12} />
                    </Button>
                    <Button
                      view="outlined-danger"
                      size="s"
                      onClick={() => setDeleteTarget(doc)}
                      title="Удалить"
                    >
                      <TrashBin width={12} height={12} />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

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
    </>
  );
};

export default DocumentGrid;
