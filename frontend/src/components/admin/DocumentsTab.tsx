import React, { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  Icon,
  Label,
  NumberInput,
  Select,
  Skeleton,
  Table,
  Text,
  TextInput,
  withTableActions,
} from '@gravity-ui/uikit';
import type { TableActionConfig } from '@gravity-ui/uikit';
import {
  FileText,
  ArrowRotateLeft,
  Pencil,
  TrashBin,
  Key,
  Plus,
  Person,
  Persons,
} from '@gravity-ui/icons';
import { toaster } from '@gravity-ui/uikit/toaster-singleton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAdminDocuments,
  updateAdminDocument,
  deleteAdminDocument,
  reindexDocument,
  getAdminDocPermissions,
  addAdminDocPermission,
  removeAdminDocPermission,
} from '../../api/admin';
import type {
  AdminDocument,
  AdminDocListResponse,
  AdminPermission,
} from '../../api/admin';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_THEME: Record<string, 'success' | 'danger' | 'warning' | 'info'> = {
  indexed: 'success',
  error: 'danger',
  processing: 'warning',
  pending: 'info',
};

const STATUS_LABEL: Record<string, string> = {
  indexed: 'Индексирован',
  error: 'Ошибка',
  processing: 'Обработка',
  pending: 'В очереди',
};

const FILE_TYPE_LABEL: Record<string, string> = {
  pdf: 'PDF',
  docx: 'DOCX',
  xlsx: 'XLSX',
  txt: 'TXT',
};

// ---------------------------------------------------------------------------
// Sub-table for permissions
// ---------------------------------------------------------------------------

const PermTable = withTableActions(Table<AdminPermission>);

const PermissionsPanel: React.FC<{ docId: number }> = ({ docId }) => {
  const queryClient = useQueryClient();
  const [addType, setAddType] = useState<string[]>(['user']);
  const [addTargetId, setAddTargetId] = useState<number | null>(null);
  const [addLevel, setAddLevel] = useState<string[]>(['viewer']);

  const { data: perms, isLoading } = useQuery<AdminPermission[]>({
    queryKey: ['admin-doc-perms', docId],
    queryFn: () => getAdminDocPermissions(docId),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      addAdminDocPermission(docId, {
        user_id: addType[0] === 'user' ? addTargetId! : undefined,
        org_id: addType[0] === 'org' ? addTargetId! : undefined,
        level: addLevel[0],
      }),
    onSuccess: () => {
      toaster.add({ name: 'perm-added', title: 'Доступ выдан', theme: 'success', autoHiding: 3000 });
      setAddTargetId(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-doc-perms', docId] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toaster.add({
        name: 'perm-add-err',
        title: err.response?.data?.detail ?? 'Ошибка выдачи доступа',
        theme: 'danger',
        autoHiding: 4000,
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (permId: number) => removeAdminDocPermission(docId, permId),
    onSuccess: () => {
      toaster.add({ name: 'perm-removed', title: 'Доступ отозван', theme: 'success', autoHiding: 3000 });
      void queryClient.invalidateQueries({ queryKey: ['admin-doc-perms', docId] });
    },
    onError: () => {
      toaster.add({ name: 'perm-rm-err', title: 'Ошибка отзыва доступа', theme: 'danger', autoHiding: 4000 });
    },
  });

  const LEVEL_THEME: Record<string, 'success' | 'info' | 'danger'> = {
    owner: 'danger',
    editor: 'info',
    viewer: 'success',
  };

  const permColumns = [
    {
      id: 'target',
      name: 'Субъект',
      template: (p: AdminPermission) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon data={p.user_id ? Person : Persons} size={14} />
          <Text variant="body-1">
            {p.user_id
              ? (p.user_username ?? `User #${p.user_id}`)
              : (p.org_name ?? `Org #${p.org_id}`)}
          </Text>
          {p.user_email && (
            <Text variant="caption-2" color="secondary">{p.user_email}</Text>
          )}
        </div>
      ),
    },
    {
      id: 'level',
      name: 'Уровень',
      width: 120,
      template: (p: AdminPermission) => (
        <Label theme={LEVEL_THEME[p.level] ?? 'normal'} size="s">
          {p.level}
        </Label>
      ),
    },
    {
      id: 'granted_by',
      name: 'Выдал',
      width: 140,
      template: (p: AdminPermission) => (
        <Text variant="body-1" color="secondary">
          {p.granted_by_username ?? `#${p.granted_by}`}
        </Text>
      ),
    },
    {
      id: 'granted_at',
      name: 'Дата',
      width: 110,
      template: (p: AdminPermission) => formatDate(p.granted_at),
    },
  ];

  const getPermActions = (p: AdminPermission): TableActionConfig<AdminPermission>[] => [
    {
      text: 'Отозвать',
      handler: () => removeMutation.mutate(p.id),
      theme: 'danger',
    },
  ];

  if (isLoading) return <Skeleton style={{ height: 100 }} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <Text variant="subheader-2">Права доступа ({perms?.length ?? 0})</Text>

      {perms && perms.length > 0 ? (
        <PermTable
          data={perms}
          columns={permColumns}
          getRowId={(p) => String(p.id)}
          getRowActions={getPermActions}
          rowActionsSize="m"
          emptyMessage="Нет прав"
        />
      ) : (
        <Text variant="body-1" color="secondary">Нет явных прав доступа (только загрузивший пользователь)</Text>
      )}

      <div style={{
        borderTop: '1px solid var(--g-color-line-generic)',
        paddingTop: '0.75rem',
      }}>
        <Text variant="subheader-2" style={{ marginBottom: 8, display: 'block' }}>
          Выдать доступ
        </Text>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <Text variant="caption-2" color="secondary" style={{ display: 'block', marginBottom: 4 }}>Тип</Text>
            <Select
              value={addType}
              onUpdate={setAddType}
              options={[
                { value: 'user', content: 'Пользователь' },
                { value: 'org', content: 'Организация' },
              ]}
              size="m"
              width={150}
            />
          </div>
          <div>
            <Text variant="caption-2" color="secondary" style={{ display: 'block', marginBottom: 4 }}>
              ID {addType[0] === 'user' ? 'пользователя' : 'организации'}
            </Text>
            <NumberInput
              value={addTargetId ?? undefined}
              onUpdate={(v) => setAddTargetId(v ?? null)}
              min={1}
              hiddenControls
              size="m"
            />
          </div>
          <div>
            <Text variant="caption-2" color="secondary" style={{ display: 'block', marginBottom: 4 }}>Уровень</Text>
            <Select
              value={addLevel}
              onUpdate={setAddLevel}
              options={[
                { value: 'viewer', content: 'Viewer' },
                { value: 'editor', content: 'Editor' },
                { value: 'owner', content: 'Owner' },
              ]}
              size="m"
              width={120}
            />
          </div>
          <Button
            view="action"
            size="m"
            disabled={!addTargetId || addTargetId < 1}
            loading={addMutation.isPending}
            onClick={() => addMutation.mutate()}
          >
            <Icon data={Plus} size={14} />
            Выдать
          </Button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main table
// ---------------------------------------------------------------------------

const EnhancedDocTable = withTableActions(Table<AdminDocument>);

const DocumentsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);

  // Modals
  const [editTarget, setEditTarget] = useState<AdminDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminDocument | null>(null);
  const [permsDocId, setPermsDocId] = useState<number | null>(null);

  // Edit form
  const [editTitle, setEditTitle] = useState('');
  const [editFolder, setEditFolder] = useState('');
  const [editTags, setEditTags] = useState('');

  const { data, isLoading, isError } = useQuery<AdminDocListResponse>({
    queryKey: ['admin-documents', page, searchValue, filterStatus, filterType],
    queryFn: () =>
      getAdminDocuments({
        page,
        limit: 20,
        search: searchValue || undefined,
        status: filterStatus[0] || undefined,
        file_type: filterType[0] || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminDocument(id),
    onSuccess: () => {
      toaster.add({ name: 'doc-deleted', title: 'Документ удалён', theme: 'success', autoHiding: 3000 });
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toaster.add({
        name: 'doc-delete-err',
        title: err.response?.data?.detail ?? 'Ошибка удаления',
        theme: 'danger',
        autoHiding: 4000,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, params }: { id: number; params: { title?: string; tags?: string[]; folder_path?: string } }) =>
      updateAdminDocument(id, params),
    onSuccess: () => {
      toaster.add({ name: 'doc-updated', title: 'Документ обновлён', theme: 'success', autoHiding: 3000 });
      setEditTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toaster.add({
        name: 'doc-update-err',
        title: err.response?.data?.detail ?? 'Ошибка обновления',
        theme: 'danger',
        autoHiding: 4000,
      });
    },
  });

  const reindexMutation = useMutation({
    mutationFn: (id: number) => reindexDocument(id),
    onSuccess: () => {
      toaster.add({ name: 'doc-reindex', title: 'Документ поставлен в очередь', theme: 'success', autoHiding: 3000 });
      void queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
    },
    onError: () => {
      toaster.add({ name: 'doc-reindex-err', title: 'Ошибка переиндексации', theme: 'danger', autoHiding: 4000 });
    },
  });

  const handleOpenEdit = (doc: AdminDocument) => {
    setEditTitle(doc.title);
    setEditFolder(doc.folder_path);
    setEditTags(doc.tags.join(', '));
    setEditTarget(doc);
  };

  const handleSaveEdit = () => {
    if (!editTarget) return;
    const params: { title?: string; tags?: string[]; folder_path?: string } = {};
    if (editTitle !== editTarget.title) params.title = editTitle;
    if (editFolder !== editTarget.folder_path) params.folder_path = editFolder;
    const newTags = editTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const oldTags = editTarget.tags.join(', ');
    if (editTags !== oldTags) params.tags = newTags;

    if (Object.keys(params).length === 0) {
      setEditTarget(null);
      return;
    }
    updateMutation.mutate({ id: editTarget.id, params });
  };

  const columns = [
    {
      id: 'title',
      name: 'Название',
      template: (d: AdminDocument) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <Icon data={FileText} size={16} />
          <div style={{ overflow: 'hidden' }}>
            <Text variant="body-1" ellipsis>{d.title}</Text>
            <Text variant="caption-2" color="secondary" ellipsis>{d.filename}</Text>
          </div>
        </div>
      ),
    },
    {
      id: 'file_type',
      name: 'Тип',
      width: 70,
      template: (d: AdminDocument) => (
        <Label theme="normal" size="s">{FILE_TYPE_LABEL[d.file_type] ?? d.file_type.toUpperCase()}</Label>
      ),
    },
    {
      id: 'file_size',
      name: 'Размер',
      width: 90,
      template: (d: AdminDocument) => (
        <Text variant="body-1" color="secondary">{formatSize(d.file_size)}</Text>
      ),
    },
    {
      id: 'status',
      name: 'Статус',
      width: 120,
      template: (d: AdminDocument) => (
        <Label theme={STATUS_THEME[d.status] ?? 'normal'} size="s">
          {STATUS_LABEL[d.status] ?? d.status}
        </Label>
      ),
    },
    {
      id: 'uploaded_by_username',
      name: 'Автор',
      width: 130,
      template: (d: AdminDocument) => (
        <Text variant="body-1" color="secondary">
          {d.uploaded_by_username ?? `#${d.uploaded_by}`}
        </Text>
      ),
    },
    {
      id: 'org_name',
      name: 'Организация',
      width: 140,
      template: (d: AdminDocument) => (
        <Text variant="body-1" color="secondary">
          {d.org_name ?? (d.org_id ? `#${d.org_id}` : '—')}
        </Text>
      ),
    },
    {
      id: 'uploaded_at',
      name: 'Загружен',
      width: 110,
      template: (d: AdminDocument) => formatDate(d.uploaded_at),
    },
  ];

  const getRowActions = (doc: AdminDocument): TableActionConfig<AdminDocument>[] => {
    const actions: TableActionConfig<AdminDocument>[] = [
      {
        text: 'Редактировать',
        handler: () => handleOpenEdit(doc),
        icon: <Icon data={Pencil} size={14} />,
      },
      {
        text: 'Права доступа',
        handler: () => setPermsDocId(doc.id),
        icon: <Icon data={Key} size={14} />,
      },
      {
        text: 'Переиндексировать',
        handler: () => reindexMutation.mutate(doc.id),
        icon: <Icon data={ArrowRotateLeft} size={14} />,
      },
      {
        text: 'Удалить',
        handler: () => setDeleteTarget(doc),
        theme: 'danger',
        icon: <Icon data={TrashBin} size={14} />,
      },
    ];
    return actions;
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 40, width: '100%' }} />
        ))}
      </div>
    );
  }

  if (isError) {
    return <Alert theme="danger" title="Ошибка" message="Не удалось загрузить документы" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header + filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <Text variant="subheader-2">Документы ({data?.total ?? 0})</Text>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextInput
            placeholder="Поиск по названию..."
            value={searchValue}
            onUpdate={(v) => { setSearchValue(v); setPage(1); }}
            size="m"
            style={{ width: 240 }}
          />
          <Select
            value={filterStatus}
            onUpdate={(v) => { setFilterStatus(v); setPage(1); }}
            options={[
              { value: 'pending', content: 'В очереди' },
              { value: 'processing', content: 'Обработка' },
              { value: 'indexed', content: 'Индексирован' },
              { value: 'error', content: 'Ошибка' },
            ]}
            placeholder="Все статусы"
            size="m"
            width={160}
            hasClear
          />
          <Select
            value={filterType}
            onUpdate={(v) => { setFilterType(v); setPage(1); }}
            options={[
              { value: 'pdf', content: 'PDF' },
              { value: 'docx', content: 'DOCX' },
              { value: 'xlsx', content: 'XLSX' },
              { value: 'txt', content: 'TXT' },
            ]}
            placeholder="Все типы"
            size="m"
            width={130}
            hasClear
          />
        </div>
      </div>

      <EnhancedDocTable
        data={data?.items ?? []}
        columns={columns}
        getRowId={(d) => String(d.id)}
        emptyMessage="Документы не найдены"
        getRowActions={getRowActions}
        rowActionsSize="m"
      />

      {/* Pagination */}
      {data && data.total > 20 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
          <Button view="flat" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Назад
          </Button>
          <Text variant="body-1" style={{ alignSelf: 'center' }}>
            Стр. {page} из {Math.ceil(data.total / 20)}
          </Text>
          <Button view="flat" disabled={page * 20 >= data.total} onClick={() => setPage((p) => p + 1)}>
            Вперёд
          </Button>
        </div>
      )}

      {/* Edit document dialog */}
      <Dialog open={editTarget !== null} onClose={() => setEditTarget(null)} size="m">
        <Dialog.Header caption={`Редактирование: ${editTarget?.filename ?? ''}`} />
        <Dialog.Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 450 }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <Text variant="caption-2" color="secondary" style={{ display: 'block', marginBottom: 4 }}>Тип</Text>
                <Label theme="normal" size="s">{editTarget?.file_type.toUpperCase()}</Label>
              </div>
              <div>
                <Text variant="caption-2" color="secondary" style={{ display: 'block', marginBottom: 4 }}>Размер</Text>
                <Text variant="body-1">{editTarget ? formatSize(editTarget.file_size) : ''}</Text>
              </div>
              <div>
                <Text variant="caption-2" color="secondary" style={{ display: 'block', marginBottom: 4 }}>Статус</Text>
                <Label theme={STATUS_THEME[editTarget?.status ?? ''] ?? 'normal'} size="s">
                  {STATUS_LABEL[editTarget?.status ?? ''] ?? editTarget?.status}
                </Label>
              </div>
              <div>
                <Text variant="caption-2" color="secondary" style={{ display: 'block', marginBottom: 4 }}>Автор</Text>
                <Text variant="body-1">{editTarget?.uploaded_by_username ?? `#${editTarget?.uploaded_by}`}</Text>
              </div>
            </div>

            {editTarget?.error_message && (
              <Alert theme="danger" title="Ошибка обработки" message={editTarget.error_message} />
            )}

            <TextInput
              label="Название"
              value={editTitle}
              onUpdate={setEditTitle}
            />
            <TextInput
              label="Путь папки"
              value={editFolder}
              onUpdate={setEditFolder}
              placeholder="/"
            />
            <TextInput
              label="Теги (через запятую)"
              value={editTags}
              onUpdate={setEditTags}
              placeholder="тег1, тег2, тег3"
            />
          </div>
        </Dialog.Body>
        <Dialog.Footer
          onClickButtonCancel={() => setEditTarget(null)}
          textButtonCancel="Отмена"
          onClickButtonApply={handleSaveEdit}
          textButtonApply="Сохранить"
          loading={updateMutation.isPending}
        />
      </Dialog>

      {/* Delete document confirmation */}
      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} size="s">
        <Dialog.Header caption="Удалить документ?" />
        <Dialog.Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Text variant="body-1">
              Документ &laquo;{deleteTarget?.title}&raquo; будет удалён безвозвратно.
            </Text>
            <Text variant="body-1" color="secondary">
              Файл будет удалён из хранилища, векторы из поискового индекса, все права доступа будут отозваны.
            </Text>
          </div>
        </Dialog.Body>
        <Dialog.Footer
          onClickButtonCancel={() => setDeleteTarget(null)}
          textButtonCancel="Отмена"
          onClickButtonApply={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
          textButtonApply="Удалить"
          loading={deleteMutation.isPending}
        />
      </Dialog>

      {/* Permissions dialog */}
      <Dialog open={permsDocId !== null} onClose={() => setPermsDocId(null)} size="l">
        <Dialog.Header
          caption={`Права доступа: ${data?.items.find((d) => d.id === permsDocId)?.title ?? `Документ #${permsDocId}`}`}
        />
        <Dialog.Body>
          <div style={{ minWidth: 550 }}>
            {permsDocId !== null && <PermissionsPanel docId={permsDocId} />}
          </div>
        </Dialog.Body>
        <Dialog.Footer
          onClickButtonCancel={() => setPermsDocId(null)}
          textButtonCancel="Закрыть"
        />
      </Dialog>
    </div>
  );
};

export default DocumentsTab;
