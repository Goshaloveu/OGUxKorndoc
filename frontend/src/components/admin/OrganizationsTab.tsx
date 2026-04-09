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
import { Plus, Person, Persons, Pencil, TrashBin } from '@gravity-ui/icons';
import { toaster } from '@gravity-ui/uikit/toaster-singleton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAdminOrganizations,
  updateAdminOrganization,
  deleteAdminOrganization,
} from '../../api/admin';
import type { AdminOrganization, AdminOrgListResponse } from '../../api/admin';
import {
  createOrganization,
  getOrganization,
  addOrgMember,
  removeOrgMember,
} from '../../api/organizations';
import type { OrganizationDetail, OrganizationMember } from '../../api/organizations';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const EnhancedOrgTable = withTableActions(Table<AdminOrganization>);
const EnhancedMemberTable = withTableActions(Table<OrganizationMember>);

const OrganizationsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState('');

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<AdminOrganization | null>(null);
  const [editOrgTarget, setEditOrgTarget] = useState<AdminOrganization | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminOrganization | null>(null);

  // Create form
  const [newOrgName, setNewOrgName] = useState('');

  // Edit form
  const [editName, setEditName] = useState('');

  // Member add form
  const [addUserId, setAddUserId] = useState<number | null>(null);
  const [addRole, setAddRole] = useState<string[]>(['member']);

  const { data, isLoading, isError } = useQuery<AdminOrgListResponse>({
    queryKey: ['admin', 'organizations', page, searchValue],
    queryFn: () =>
      getAdminOrganizations({
        page,
        limit: 50,
        search: searchValue || undefined,
      }),
    refetchInterval: 30_000,
  });

  const { data: orgDetail, isLoading: detailLoading } = useQuery<OrganizationDetail>({
    queryKey: ['org-detail', selectedOrg?.id],
    queryFn: () => getOrganization(selectedOrg!.id),
    enabled: !!selectedOrg,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createOrganization({ name }),
    onSuccess: () => {
      toaster.add({ name: 'org-created', title: 'Организация создана', theme: 'success', autoHiding: 3000 });
      setCreateOpen(false);
      setNewOrgName('');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toaster.add({
        name: 'org-create-err',
        title: err.response?.data?.detail ?? 'Ошибка создания организации',
        theme: 'danger',
        autoHiding: 4000,
      });
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      updateAdminOrganization(id, { name }),
    onSuccess: () => {
      toaster.add({ name: 'org-renamed', title: 'Организация переименована', theme: 'success', autoHiding: 3000 });
      setEditOrgTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toaster.add({
        name: 'org-rename-err',
        title: err.response?.data?.detail ?? 'Ошибка переименования',
        theme: 'danger',
        autoHiding: 4000,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminOrganization(id),
    onSuccess: () => {
      toaster.add({ name: 'org-deleted', title: 'Организация удалена', theme: 'success', autoHiding: 3000 });
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toaster.add({
        name: 'org-delete-err',
        title: err.response?.data?.detail ?? 'Ошибка удаления',
        theme: 'danger',
        autoHiding: 4000,
      });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: () =>
      addOrgMember(selectedOrg!.id, {
        user_id: addUserId!,
        role: addRole[0] as 'owner' | 'member',
      }),
    onSuccess: () => {
      toaster.add({ name: 'member-added', title: 'Участник добавлен', theme: 'success', autoHiding: 3000 });
      setAddUserId(null);
      void queryClient.invalidateQueries({ queryKey: ['org-detail', selectedOrg?.id] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toaster.add({
        name: 'member-add-err',
        title: err.response?.data?.detail ?? 'Ошибка добавления участника',
        theme: 'danger',
        autoHiding: 4000,
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: number) => removeOrgMember(selectedOrg!.id, userId),
    onSuccess: () => {
      toaster.add({ name: 'member-removed', title: 'Участник удалён', theme: 'success', autoHiding: 3000 });
      void queryClient.invalidateQueries({ queryKey: ['org-detail', selectedOrg?.id] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toaster.add({
        name: 'member-rm-err',
        title: err.response?.data?.detail ?? 'Ошибка удаления участника',
        theme: 'danger',
        autoHiding: 4000,
      });
    },
  });

  const changeMemberRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: number; newRole: 'owner' | 'member' }) => {
      await removeOrgMember(selectedOrg!.id, userId);
      await addOrgMember(selectedOrg!.id, { user_id: userId, role: newRole });
    },
    onSuccess: () => {
      toaster.add({ name: 'member-role', title: 'Роль изменена', theme: 'success', autoHiding: 3000 });
      void queryClient.invalidateQueries({ queryKey: ['org-detail', selectedOrg?.id] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toaster.add({
        name: 'member-role-err',
        title: err.response?.data?.detail ?? 'Ошибка смены роли',
        theme: 'danger',
        autoHiding: 4000,
      });
    },
  });

  const handleOpenEdit = (org: AdminOrganization) => {
    setEditName(org.name);
    setEditOrgTarget(org);
  };

  const handleSaveEdit = () => {
    if (!editOrgTarget || !editName.trim()) return;
    renameMutation.mutate({ id: editOrgTarget.id, name: editName.trim() });
  };

  const orgColumns = [
    { id: 'id', name: 'ID', width: 60 },
    {
      id: 'name',
      name: 'Название',
      template: (row: AdminOrganization) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon data={Persons} size={16} />
          <Text variant="body-1">{row.name}</Text>
        </div>
      ),
    },
    {
      id: 'slug',
      name: 'Slug',
      template: (row: AdminOrganization) => (
        <Text variant="body-1" color="secondary">{row.slug}</Text>
      ),
    },
    {
      id: 'member_count',
      name: 'Участники',
      width: 110,
      template: (row: AdminOrganization) => (
        <Label theme="normal" size="s">{row.member_count}</Label>
      ),
    },
    {
      id: 'creator',
      name: 'Создатель',
      template: (row: AdminOrganization) => (
        <Text variant="body-1" color="secondary">{row.creator_username ?? `#${row.created_by}`}</Text>
      ),
    },
    {
      id: 'created_at',
      name: 'Создана',
      width: 120,
      template: (row: AdminOrganization) => formatDate(row.created_at),
    },
  ];

  const getOrgRowActions = (row: AdminOrganization): TableActionConfig<AdminOrganization>[] => [
    {
      text: 'Участники',
      handler: () => setSelectedOrg(row),
      icon: <Icon data={Persons} size={14} />,
    },
    {
      text: 'Переименовать',
      handler: () => handleOpenEdit(row),
      icon: <Icon data={Pencil} size={14} />,
    },
    {
      text: 'Удалить',
      handler: () => setDeleteTarget(row),
      theme: 'danger',
      icon: <Icon data={TrashBin} size={14} />,
    },
  ];

  const memberColumns = [
    {
      id: 'username',
      name: 'Пользователь',
      template: (m: OrganizationMember) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon data={Person} size={14} />
          <Text variant="body-1">{m.username}</Text>
        </div>
      ),
    },
    {
      id: 'email',
      name: 'Email',
      template: (m: OrganizationMember) => (
        <Text variant="body-1" color="secondary">{m.email}</Text>
      ),
    },
    {
      id: 'role',
      name: 'Роль',
      width: 120,
      template: (m: OrganizationMember) => (
        <Label theme={m.role === 'owner' ? 'danger' : 'info'} size="s">
          {m.role === 'owner' ? 'Владелец' : 'Участник'}
        </Label>
      ),
    },
    {
      id: 'joined_at',
      name: 'Дата вступления',
      width: 130,
      template: (m: OrganizationMember) => formatDate(m.joined_at),
    },
  ];

  const getMemberRowActions = (m: OrganizationMember): TableActionConfig<OrganizationMember>[] => [
    {
      text: m.role === 'owner' ? 'Сделать участником' : 'Сделать владельцем',
      handler: () =>
        changeMemberRoleMutation.mutate({
          userId: m.user_id,
          newRole: m.role === 'owner' ? 'member' : 'owner',
        }),
    },
    {
      text: 'Удалить',
      handler: () => removeMemberMutation.mutate(m.user_id),
      theme: 'danger',
    },
  ];

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
    return <Alert theme="danger" title="Ошибка" message="Не удалось загрузить список организаций" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          <Text variant="subheader-2">Организации ({data?.total ?? 0})</Text>
          <TextInput
            placeholder="Поиск по названию..."
            value={searchValue}
            onUpdate={setSearchValue}
            size="m"
            style={{ maxWidth: 300 }}
          />
        </div>
        <Button view="action" onClick={() => setCreateOpen(true)}>
          <Icon data={Plus} size={16} />
          Создать организацию
        </Button>
      </div>

      <EnhancedOrgTable
        data={data?.items ?? []}
        columns={orgColumns}
        getRowId={(row) => String(row.id)}
        emptyMessage="Организации не найдены"
        getRowActions={getOrgRowActions}
        rowActionsSize="m"
      />

      {/* Pagination */}
      {data && data.total > 50 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
          <Button view="flat" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Назад
          </Button>
          <Text variant="body-1" style={{ alignSelf: 'center' }}>
            Стр. {page} из {Math.ceil(data.total / 50)}
          </Text>
          <Button view="flat" disabled={page * 50 >= data.total} onClick={() => setPage((p) => p + 1)}>
            Вперёд
          </Button>
        </div>
      )}

      {/* Create org dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} size="s">
        <Dialog.Header caption="Создать организацию" />
        <Dialog.Body>
          <TextInput
            label="Название"
            placeholder="Название организации"
            value={newOrgName}
            onUpdate={setNewOrgName}
            autoFocus
          />
        </Dialog.Body>
        <Dialog.Footer
          onClickButtonCancel={() => setCreateOpen(false)}
          textButtonCancel="Отмена"
          onClickButtonApply={() => createMutation.mutate(newOrgName.trim())}
          textButtonApply="Создать"
          loading={createMutation.isPending}
          propsButtonApply={{ disabled: !newOrgName.trim() }}
        />
      </Dialog>

      {/* Rename org dialog */}
      <Dialog open={editOrgTarget !== null} onClose={() => setEditOrgTarget(null)} size="s">
        <Dialog.Header caption="Переименовать организацию" />
        <Dialog.Body>
          <TextInput
            label="Новое название"
            value={editName}
            onUpdate={setEditName}
            autoFocus
          />
        </Dialog.Body>
        <Dialog.Footer
          onClickButtonCancel={() => setEditOrgTarget(null)}
          textButtonCancel="Отмена"
          onClickButtonApply={handleSaveEdit}
          textButtonApply="Сохранить"
          loading={renameMutation.isPending}
          propsButtonApply={{ disabled: !editName.trim() }}
        />
      </Dialog>

      {/* Delete org confirmation */}
      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} size="s">
        <Dialog.Header caption="Удалить организацию?" />
        <Dialog.Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Text variant="body-1">
              Организация &laquo;{deleteTarget?.name}&raquo; будет удалена.
            </Text>
            <Text variant="body-1" color="secondary">
              Все участники будут удалены из организации. Документы, привязанные к ней, станут личными.
              Права доступа через организацию будут отозваны.
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

      {/* Organization detail + members dialog */}
      <Dialog open={selectedOrg !== null} onClose={() => setSelectedOrg(null)} size="l">
        <Dialog.Header caption={`Организация: ${selectedOrg?.name ?? ''}`} />
        <Dialog.Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 500 }}>
            {detailLoading ? (
              <Skeleton style={{ height: 200 }} />
            ) : orgDetail ? (
              <>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <Text color="secondary">Slug: <strong>{orgDetail.slug}</strong></Text>
                  <Text color="secondary">Создана: <strong>{formatDate(orgDetail.created_at)}</strong></Text>
                </div>

                <Text variant="subheader-2">
                  Участники ({orgDetail.members.length})
                </Text>

                <EnhancedMemberTable
                  data={orgDetail.members}
                  columns={memberColumns}
                  getRowId={(m) => String(m.user_id)}
                  emptyMessage="Нет участников"
                  getRowActions={getMemberRowActions}
                  rowActionsSize="m"
                />

                {/* Add member */}
                <div style={{
                  borderTop: '1px solid var(--g-color-line-generic)',
                  paddingTop: '1rem',
                }}>
                  <Text variant="subheader-2" style={{ marginBottom: 8, display: 'block' }}>
                    Добавить участника
                  </Text>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <div>
                      <Text variant="caption-2" color="secondary" style={{ display: 'block', marginBottom: 4 }}>
                        ID пользователя
                      </Text>
                      <NumberInput
                        value={addUserId ?? undefined}
                        onUpdate={(v) => setAddUserId(v ?? null)}
                        min={1}
                        hiddenControls
                        size="m"
                      />
                    </div>
                    <div>
                      <Text variant="caption-2" color="secondary" style={{ display: 'block', marginBottom: 4 }}>
                        Роль
                      </Text>
                      <Select
                        value={addRole}
                        onUpdate={setAddRole}
                        options={[
                          { value: 'member', content: 'Участник' },
                          { value: 'owner', content: 'Владелец' },
                        ]}
                        size="m"
                        width={140}
                      />
                    </div>
                    <Button
                      view="action"
                      size="m"
                      disabled={!addUserId || addUserId < 1}
                      loading={addMemberMutation.isPending}
                      onClick={() => addMemberMutation.mutate()}
                    >
                      <Icon data={Plus} size={14} />
                      Добавить
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <Alert theme="danger" message="Не удалось загрузить данные организации" />
            )}
          </div>
        </Dialog.Body>
        <Dialog.Footer
          onClickButtonCancel={() => setSelectedOrg(null)}
          textButtonCancel="Закрыть"
        />
      </Dialog>
    </div>
  );
};

export default OrganizationsTab;
