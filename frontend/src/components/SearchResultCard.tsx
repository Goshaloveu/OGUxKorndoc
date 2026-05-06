import React, { useState } from 'react';
import { Button, Label, Text, Modal } from '@gravity-ui/uikit';
import { FileText, FileArrowDown } from '@gravity-ui/icons';
import { getPresignedUrl } from '../api/documents';
import type { SearchResult } from '../types';

interface SearchResultCardProps {
  result: SearchResult;
}

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: 'PDF',
  docx: 'DOCX',
  xlsx: 'XLSX',
  txt: 'TXT',
};

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: '#e53e3e',
  docx: '#3182ce',
  xlsx: '#38a169',
  txt: '#718096',
};

const FILE_TYPE_BADGE_THEMES: Record<string, 'danger' | 'info' | 'success' | 'normal'> = {
  pdf: 'danger',
  docx: 'info',
  xlsx: 'success',
  txt: 'normal',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({ result }) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [pdfPresignedUrl, setPdfPresignedUrl] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);

  const scorePercent = Math.round(result.score * 100);
  const borderColor = FILE_TYPE_COLORS[result.file_type] ?? '#718096';

  const handlePreview = async () => {
    setPreviewOpen(true);

    if (result.file_type === 'pdf') {
      if (pdfPresignedUrl) return;
      setPreviewLoading(true);
      try {
        const url = await getPresignedUrl(result.document_id);
        setPdfPresignedUrl(url);
      } catch {
        setPdfPresignedUrl(null);
      } finally {
        setPreviewLoading(false);
      }
      return;
    }

    if (previewText !== null) return;
    setPreviewLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const resp = await fetch(`/api/documents/${result.document_id}/preview`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (resp.ok) {
        const data = (await resp.json()) as { text: string; page_count: number };
        setPreviewText(data.text);
      } else {
        setPreviewText('Не удалось загрузить превью');
      }
    } catch {
      setPreviewText('Ошибка загрузки превью');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const url = await getPresignedUrl(result.document_id);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // fallback: do nothing
    }
  };

  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderRadius: 10,
          border: '1px solid var(--g-color-line-generic)',
          borderLeft: `4px solid ${borderColor}`,
          padding: '1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          background: hovered ? 'var(--g-color-base-simple-hover)' : 'var(--g-color-base-background)',
          transition: 'background 0.15s, box-shadow 0.15s',
          boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
          cursor: 'default',
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <FileText width={20} height={20} style={{ color: borderColor, flexShrink: 0 }} />
          <Text variant="body-2" style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
            {result.title}
          </Text>
          <Label
            theme={scorePercent >= 80 ? 'success' : scorePercent >= 60 ? 'warning' : 'normal'}
          >
            {scorePercent}%
          </Label>
          <Label theme={FILE_TYPE_BADGE_THEMES[result.file_type] ?? 'normal'}>
            {FILE_TYPE_LABELS[result.file_type] ?? result.file_type}
          </Label>
        </div>

        {/* Meta row */}
        <Text variant="caption-2" color="secondary">
          {result.folder_path} · {formatDate(result.uploaded_at)}
        </Text>

        {/* Snippet */}
        <Text variant="body-1">
          <span dangerouslySetInnerHTML={{ __html: result.snippet_html }} />
        </Text>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button view="outlined" size="s" onClick={handlePreview}>
            Превью
          </Button>
          <Button view="outlined" size="s" onClick={handleDownload}>
            <FileArrowDown width={14} height={14} />
            Скачать
          </Button>
        </div>
      </div>

      {/* Preview modal */}
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)}>
        <div style={{ width: '80vw', maxWidth: 900, height: '80vh', display: 'flex', flexDirection: 'column', padding: '1rem', gap: '0.75rem' }}>
          <Text variant="header-1">{result.title}</Text>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {result.file_type === 'pdf' ? (
              previewLoading ? (
                <Text color="secondary">Загрузка PDF...</Text>
              ) : pdfPresignedUrl ? (
                <iframe
                  src={pdfPresignedUrl}
                  title={result.title}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <Text color="secondary">Не удалось загрузить PDF</Text>
              )
            ) : previewLoading ? (
              <Text color="secondary">Загрузка...</Text>
            ) : (
              <div style={{ overflow: 'auto', height: '100%', whiteSpace: 'pre-wrap' }}>
                <Text variant="body-1">{previewText ?? ''}</Text>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button view="normal" onClick={() => setPreviewOpen(false)}>
              Закрыть
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default SearchResultCard;
