import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button, Text, TextInput, Select, Label, Alert, Progress } from '@gravity-ui/uikit';
import { uploadDocument, getDocumentStatus } from '../api/documents';
import type { UploadDocumentParams } from '../api/documents';

interface UploadItem {
  localId: string;
  file: File;
  title: string;
  status: 'waiting' | 'uploading' | 'pending' | 'processing' | 'indexed' | 'error';
  progress: number;
  documentId: number | null;
  errorMsg: string | null;
}

const DEPARTMENT_OPTIONS = [
  { value: '', content: '— не выбран —' },
  { value: 'hr', content: 'HR' },
  { value: 'legal', content: 'Юридический' },
  { value: 'it', content: 'ИТ' },
  { value: 'finance', content: 'Финансы' },
  { value: 'marketing', content: 'Маркетинг' },
];

const STATUS_TEXT: Record<UploadItem['status'], string> = {
  waiting: '⏳ Ожидает',
  uploading: '⬆️ Загружается...',
  pending: '🕐 В очереди',
  processing: '⚙️ Обрабатывается...',
  indexed: '✅ Индексирован',
  error: '❌ Ошибка',
};

const UploadPage: React.FC = () => {
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [department, setDepartment] = useState('');
  const [folderPath, setFolderPath] = useState('/');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef<UploadItem[]>([]);

  // Keep ref in sync with state for polling
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Poll every 2 seconds for pending/processing items
  useEffect(() => {
    const id = setInterval(async () => {
      const current = queueRef.current;
      const toPoll = current.filter(
        (item) =>
          (item.status === 'pending' || item.status === 'processing') &&
          item.documentId !== null,
      );
      for (const item of toPoll) {
        try {
          const statusData = await getDocumentStatus(item.documentId!);
          setQueue((prev) =>
            prev.map((q) =>
              q.localId === item.localId
                ? {
                    ...q,
                    status: statusData.status as UploadItem['status'],
                    errorMsg: statusData.error_message,
                  }
                : q,
            ),
          );
        } catch {
          // ignore polling errors silently
        }
      }
    }, 2000);

    return () => clearInterval(id);
  }, []);

  const addFiles = useCallback((files: File[]) => {
    const newItems: UploadItem[] = files.map((file) => ({
      localId: `${Date.now()}-${Math.random()}`,
      file,
      title: file.name.replace(/\.[^.]+$/, ''),
      status: 'waiting' as const,
      progress: 0,
      documentId: null,
      errorMsg: null,
    }));
    setQueue((prev) => [...prev, ...newItems]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) addFiles(droppedFiles);
    },
    [addFiles],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      if (selected.length > 0) addFiles(selected);
      e.target.value = '';
    },
    [addFiles],
  );

  const addTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  }, [tagInput, tags]);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const uploadAll = useCallback(async () => {
    const waiting = queueRef.current.filter((item) => item.status === 'waiting');
    for (const item of waiting) {
      setQueue((prev) =>
        prev.map((q) =>
          q.localId === item.localId ? { ...q, status: 'uploading' as const } : q,
        ),
      );

      try {
        const params: UploadDocumentParams = {
          file: item.file,
          title: item.title || undefined,
          folder_path: folderPath || undefined,
          tags: tags.length > 0 ? tags : undefined,
          department: department || undefined,
          onUploadProgress: (percent) => {
            setQueue((prev) =>
              prev.map((q) =>
                q.localId === item.localId ? { ...q, progress: percent } : q,
              ),
            );
          },
        };

        const doc = await uploadDocument(params);
        setQueue((prev) =>
          prev.map((q) =>
            q.localId === item.localId
              ? { ...q, status: 'pending' as const, documentId: doc.id, progress: 100 }
              : q,
          ),
        );
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Ошибка загрузки';
        setQueue((prev) =>
          prev.map((q) =>
            q.localId === item.localId
              ? { ...q, status: 'error' as const, errorMsg: message }
              : q,
          ),
        );
      }
    }
  }, [folderPath, tags, department]);

  const removeFromQueue = useCallback((localId: string) => {
    setQueue((prev) => prev.filter((q) => q.localId !== localId));
  }, []);

  const waitingCount = queue.filter((q) => q.status === 'waiting').length;

  return (
    <div
      style={{
        maxWidth: 700,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      <Text variant="header-1">Загрузить документы</Text>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragOver ? '#5b67ff' : 'var(--g-color-line-generic-accent)'}`,
          borderRadius: 16,
          padding: '3rem 2rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragOver
            ? 'rgba(91, 103, 255, 0.06)'
            : 'var(--g-color-base-simple-hover-solid)',
          transition: 'all 0.2s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: isDragOver
              ? 'rgba(91, 103, 255, 0.15)'
              : 'var(--g-color-base-misc-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            transition: 'all 0.2s',
          }}
        >
          {isDragOver ? '📂' : '⬆️'}
        </div>
        <div>
          <Text variant="body-2" style={{ fontWeight: 600, display: 'block' }}>
            {isDragOver ? 'Отпустите файлы здесь' : 'Перетащите файлы сюда'}
          </Text>
          <Text variant="caption-2" color="secondary" style={{ display: 'block', marginTop: 4 }}>
            или нажмите для выбора
          </Text>
        </div>
        <Text variant="caption-2" color="hint">
          PDF, DOCX, XLSX, TXT · не более 50 МБ
        </Text>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.xlsx,.txt"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />
      </div>

      {/* Settings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <Text variant="body-2" style={{ marginBottom: 4, display: 'block' }}>
              Папка
            </Text>
            <TextInput
              value={folderPath}
              onUpdate={setFolderPath}
              placeholder="/папка/подпапка/"
            />
          </div>
          <div style={{ flex: 1 }}>
            <Text variant="body-2" style={{ marginBottom: 4, display: 'block' }}>
              Отдел
            </Text>
            <Select
              value={department ? [department] : []}
              onUpdate={(val) => setDepartment(val[0] ?? '')}
              options={DEPARTMENT_OPTIONS}
              placeholder="Выбрать отдел"
              width="max"
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <Text variant="body-2" style={{ marginBottom: 4, display: 'block' }}>
            Теги
          </Text>
          {tags.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '0.4rem',
                flexWrap: 'wrap',
                marginBottom: 8,
              }}
            >
              {tags.map((tag) => (
                <Label key={tag} theme="info" type="close" onCloseClick={() => removeTag(tag)}>
                  {tag}
                </Label>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <TextInput
              value={tagInput}
              onUpdate={setTagInput}
              placeholder="Добавить тег и нажать Enter..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              style={{ flex: 1 }}
            />
            <Button view="outlined" onClick={addTag} disabled={!tagInput.trim()}>
              + Тег
            </Button>
          </div>
        </div>
      </div>

      {/* Upload Queue */}
      {queue.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text variant="subheader-2">Очередь загрузки ({queue.length})</Text>
            {waitingCount > 0 && (
              <Button view="action" size="xl" onClick={uploadAll}>
                Загрузить все ({waitingCount})
              </Button>
            )}
          </div>

          {queue.map((item) => (
            <div
              key={item.localId}
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: 8,
                padding: '0.75rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div
                  style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}
                >
                  <Text variant="body-2" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.file.name}
                  </Text>
                  <Text variant="caption-2" color="secondary">
                    {(item.file.size / 1024 / 1024).toFixed(2)} МБ
                  </Text>
                </div>
                <Text
                  variant="caption-1"
                  color={
                    item.status === 'error'
                      ? 'danger'
                      : item.status === 'indexed'
                        ? 'positive'
                        : 'secondary'
                  }
                >
                  {STATUS_TEXT[item.status]}
                </Text>
                {(item.status === 'waiting' || item.status === 'error') && (
                  <Button
                    view="flat-danger"
                    size="s"
                    onClick={() => removeFromQueue(item.localId)}
                  >
                    ✕
                  </Button>
                )}
              </div>

              {item.status === 'uploading' && (
                <Progress value={item.progress} theme="info" />
              )}

              {item.status === 'error' && item.errorMsg && (
                <Alert theme="danger" message={item.errorMsg} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UploadPage;
