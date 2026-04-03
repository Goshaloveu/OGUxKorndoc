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
  withTableActions,
} from '@gravity-ui/uikit';
import type { TableActionConfig } from '@gravity-ui/uikit';
import { Plus, Person, Persons } from '@gravity-ui/icons';
import { toaster } from '@gravity-ui/uikit/toaster-singleton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAdminOrganizations } from '../../api/admin';
import type { AdminOrganization } from '../../api/admin';
import {
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
  const [selectedOrg, setSelectedOrg] = useState<AdminOrganization | null>(null);
  const [addUserId, setAddUserId] = useState<number | null>(null);
  const [addRole, setAddRole] = useState<string[]>(['member']);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'organizations'],
    queryFn: getAdminOrganizations,
    refetchInterval: 30_000,
  });

  const { data: orgDetail, isLoading: detailLoading } = useQuery<OrganizationDetail>({
    queryKey: ['org-detail', selectedOrg?.id],
    queryFn: () => getOrganization(selectedOrg!.id),
    enabled: !!selectedOrg,
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

  const orgColumns = [
    { id: 'id', name: 'ID', width: 60 },
    { id: 'name', name: 'Название' },
    { id: 'slug', name: 'Slug' },
    {
      id: 'created_at',
      name: 'Создана',
      template: (row: AdminOrganization) => formatDate(row.created_at),
    },
  ];

  const getOrgRowActions = (row: AdminOrganization): TableActionConfig<AdminOrganization>[] => [
    {
      text: 'Участники',
      handler: () => setSelectedOrg(row),
      icon: <Icon data={Persons} size={14} />,
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
    { id: 'email', name: 'Email', template: (m: OrganizationMember) => m.email },
    {
      id: 'role',
      name: 'Роль',
      template: (m: OrganizationMember) => (
        <Label theme={m.role === 'owner' ? 'danger' : 'info'} size="s">
          {m.role === 'owner' ? 'Владелец' : 'Участник'}
        </Label>
      ),
    },
    {
      id: 'joined_at',
      name: 'Дата вступления',
      template: (m: OrganizationMember) => formatDate(m.joined_at),
    },
  ];

  const getMemberRowActions = (m: OrganizationMember): TableActionConfig<OrganizationMember>[] => [
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
      <Text variant="subheader-2">Организации ({data?.length ?? 0})</Text>
      <EnhancedOrgTable
        data={data ?? []}
        columns={orgColumns}
        getRowId={(row) => String(row.id)}
        emptyMessage="Организации не найдены"
        getRowActions={getOrgRowActions}
        rowActionsSize="m"
      />

      {/* Organization detail dialog */}
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
                      <Text variant="caption-2" color="secondary" style={{ display: 'block', marginBottom: 4 }}>ID пользователя</Text>
                      <NumberInput
                        value={addUserId ?? undefined}
                        onUpdate={(v) => setAddUserId(v ?? null)}
                        min={1}
                        hiddenControls
                        size="m"
                      />
                    </div>
                    <div>
                      <Text variant="caption-2" color="secondary" style={{ display: 'block', marginBottom: 4 }}>Роль</Text>
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
