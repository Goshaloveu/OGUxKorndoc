import React from 'react';
import { Alert, Modal, Skeleton, Text } from '@gravity-ui/uikit';
import { useQuery } from '@tanstack/react-query';
import { getDocumentPreview, getPresignedUrl } from '../api/documents';
import type { Document } from '../types';

interface DocumentPreviewModalProps {
  doc: Document | null;
  onClose: () => void;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ doc, onClose }) => {
  const isPdf = doc?.file_type === 'pdf';

  const { data: previewUrl, isLoading: urlLoading } = useQuery({
    queryKey: ['presigned-url', doc?.id],
    queryFn: () => getPresignedUrl(doc!.id),
    enabled: !!doc && isPdf,
    staleTime: 4 * 60 * 1000,
  });

  const { data: preview, isLoading: textLoading, isError } = useQuery({
    queryKey: ['doc-preview', doc?.id],
    queryFn: () => getDocumentPreview(doc!.id),
    enabled: !!doc && !isPdf,
    staleTime: 5 * 60 * 1000,
  });

  if (!doc) return null;

  const isLoading = isPdf ? urlLoading : textLoading;

  return (
    <Modal open={!!doc} onClose={onClose} contentClassName="doc-preview-modal">
      <div style={{ display: 'flex', flexDirection: 'column', height: '80vh', padding: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <Text variant="header-2">{doc.title}</Text>
          <Text color="secondary" variant="caption-2" style={{ display: 'block', marginTop: 4 }}>
            {doc.file_type.toUpperCase()} · {doc.folder_path}
          </Text>
        </div>

        {isLoading && <Skeleton style={{ flex: 1 }} />}

        {isError && (
          <Alert theme="danger" message="Не удалось загрузить превью документа" />
        )}

        {!isLoading && !isError && isPdf && previewUrl && (
          <iframe
            src={previewUrl}
            style={{ flex: 1, border: 'none', borderRadius: 8, width: '100%' }}
            title={doc.title}
          />
        )}

        {!isLoading && !isError && !isPdf && preview && (
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              background: 'var(--g-color-base-simple-hover-solid)',
              borderRadius: 8,
              fontFamily: 'var(--g-font-family-monospace)',
              fontSize: 13,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {preview.text || <Text color="hint">Текст документа недоступен</Text>}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DocumentPreviewModal;
