import React, { useState } from 'react';
import {
  Alert,
  Button,
  Card,
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
import { Person, Persons, Plus } from '@gravity-ui/icons';
import { toaster } from '@gravity-ui/uikit/toaster-singleton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changePassword,
  getMyDocuments,
  getProfile,
  updateProfile,
} from '../api/profile';
import {
  getMyOrganizations,
  createOrganization,
  getOrganization,
  addOrgMember,
  removeOrgMember,
} from '../api/organizations';
import type { Document } from '../types';
import type { Organization, OrganizationDetail, OrganizationMember } from '../api/organizations';

const STATUS_LABELS: Record<string, { text: string; theme: 'info' | 'success' | 'warning' | 'danger' | 'normal' }> = {
  pending: { text: 'В очереди', theme: 'warning' },
  processing: { text: 'Обработка', theme: 'info' },
  indexed: { text: 'Индексирован', theme: 'success' },
  error: { text: 'Ошибка', theme: 'danger' },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const EnhancedOrgTable = withTableActions(Table<Organization>);
const EnhancedMemberTable = withTableActions(Table<OrganizationMember>);

const ProfilePage: React.FC = () => {
  const queryClient = useQueryClient();

  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [docPage, setDocPage] = useState(1);
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [addMemberUserId, setAddMemberUserId] = useState<number | null>(null);
  const [addMemberRole, setAddMemberRole] = useState<string[]>(['member']);

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  });

  const { data: docsData, isLoading: docsLoading } = useQuery({
    queryKey: ['profile-documents', docPage],
    queryFn: () => getMyDocuments(docPage, 10),
  });

  const { data: orgs, isLoading: orgsLoading } = useQuery({
    queryKey: ['my-organizations'],
    queryFn: getMyOrganizations,
  });

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      toaster.add({ name: 'profile-updated', title: 'Профиль обновлён', theme: 'success' });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setIsEditing(false);
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toaster.add({
        name: 'profile-error',
        title: err.response?.data?.detail ?? 'Ошибка обновления',
        theme: 'danger',
      });
    },
  });

  const createOrgMutation = useMutation({
    mutationFn: () => createOrganization({ name: newOrgName.trim() }),
    onSuccess: () => {
      toaster.add({ name: 'org-created', title: 'Организация создана', theme: 'success', autoHiding: 3000 });
      setNewOrgName('');
      setIsCreateOrgOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['my-organizations'] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toaster.add({
        name: 'org-err',
        title: err.response?.data?.detail ?? 'Ошибка при создании организации',
        theme: 'danger',
        autoHiding: 4000,
      });
    },
  });

  const { data: orgDetail, isLoading: orgDetailLoading } = useQuery<OrganizationDetail>({
    queryKey: ['org-detail', selectedOrgId],
    queryFn: () => getOrganization(selectedOrgId!),
    enabled: !!selectedOrgId,
  });

  const addMemberMutation = useMutation({
    mutationFn: () =>
      addOrgMember(selectedOrgId!, {
        user_id: addMemberUserId!,
        role: addMemberRole[0] as 'owner' | 'member',
      }),
    onSuccess: () => {
      toaster.add({ name: 'member-added', title: 'Участник добавлен', theme: 'success', autoHiding: 3000 });
      setAddMemberUserId(null);
      void queryClient.invalidateQueries({ queryKey: ['org-detail', selectedOrgId] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toaster.add({ name: 'member-err', title: err.response?.data?.detail ?? 'Ошибка', theme: 'danger', autoHiding: 4000 });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: number) => removeOrgMember(selectedOrgId!, userId),
    onSuccess: () => {
      toaster.add({ name: 'member-removed', title: 'Участник удалён', theme: 'success', autoHiding: 3000 });
      void queryClient.invalidateQueries({ queryKey: ['org-detail', selectedOrgId] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toaster.add({ name: 'member-rm-err', title: err.response?.data?.detail ?? 'Ошибка', theme: 'danger', autoHiding: 4000 });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toaster.add({ name: 'pwd-changed', title: 'Пароль изменён', theme: 'success' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toaster.add({
        name: 'pwd-error',
        title: err.response?.data?.detail ?? 'Ошибка смены пароля',
        theme: 'danger',
      });
    },
  });

  const startEdit = () => {
    if (profile) {
      setEditUsername(profile.user.username);
      setEditEmail(profile.user.email);
      setIsEditing(true);
    }
  };

  const saveEdit = () => {
    updateMutation.mutate({
      username: editUsername || undefined,
      email: editEmail || undefined,
    });
  };

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      toaster.add({ name: 'pwd-mismatch', title: 'Пароли не совпадают', theme: 'danger' });
      return;
    }
    passwordMutation.mutate({ old_password: oldPassword, new_password: newPassword });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Skeleton style={{ height: 40, width: 200 }} />
        <Skeleton style={{ height: 120 }} />
      </div>
    );
  }

  if (isError || !profile) {
    return <Alert theme="danger" title="Ошибка" message="Не удалось загрузить профиль" />;
  }

  const { user, my_documents_count, recent_searches } = profile;

  const orgColumns = [
    { id: 'id', name: 'ID', width: 60 },
    { id: 'name', name: 'Название' },
    { id: 'slug', name: 'Slug' },
    {
      id: 'created_at',
      name: 'Создана',
      template: (org: Organization) => formatDate(org.created_at),
    },
  ];

  const getOrgRowActions = (org: Organization): TableActionConfig<Organization>[] => [
    {
      text: 'Участники',
      handler: () => setSelectedOrgId(org.id),
      icon: <Icon data={Persons} size={14} />,
    },
  ];

  const docColumns = [
    {
      id: 'title',
      name: 'Название',
      template: (doc: Document) => (
        <Text variant="body-short">{doc.title}</Text>
      ),
    },
    {
      id: 'file_type',
      name: 'Тип',
      template: (doc: Document) => doc.file_type.toUpperCase(),
    },
    {
      id: 'file_size',
      name: 'Размер',
      template: (doc: Document) => formatBytes(doc.file_size),
    },
    {
      id: 'status',
      name: 'Статус',
      template: (doc: Document) => {
        const s = STATUS_LABELS[doc.status] ?? { text: doc.status, theme: 'normal' as const };
        return <Label theme={s.theme}>{s.text}</Label>;
      },
    },
    {
      id: 'uploaded_at',
      name: 'Дата загрузки',
      template: (doc: Document) => formatDate(doc.uploaded_at),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 900 }}>
      <Text variant="header-1">Профиль</Text>

      {/* User card */}
      <Card style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Text variant="header-2">{user.username}</Text>
            <Text color="secondary">{user.email}</Text>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Label theme={user.role === 'admin' ? 'danger' : 'info'}>
                {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
              </Label>
              <Text color="secondary" variant="caption-2">
                Зарегистрирован: {formatDate(user.created_at)}
              </Text>
              {user.last_login && (
                <Text color="secondary" variant="caption-2">
                  · Последний вход: {formatDate(user.last_login)}
                </Text>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Text color="secondary">Документов: <strong>{my_documents_count}</strong></Text>
            {!isEditing && (
              <Button view="action" onClick={startEdit}>
                Редактировать
              </Button>
            )}
          </div>
        </div>

        {isEditing && (
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Text variant="subheader-2">Редактирование профиля</Text>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <Text variant="caption-2" color="secondary">Имя пользователя</Text>
                <TextInput
                  value={editUsername}
                  onUpdate={setEditUsername}
                  placeholder="Имя пользователя"
                />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <Text variant="caption-2" color="secondary">Email</Text>
                <TextInput
                  value={editEmail}
                  onUpdate={setEditEmail}
                  placeholder="Email"
                  type="email"
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button
                view="action"
                loading={updateMutation.isPending}
                onClick={saveEdit}
              >
                Сохранить
              </Button>
              <Button view="flat" onClick={() => setIsEditing(false)}>
                Отмена
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Change password */}
      <Card style={{ padding: '1.5rem' }}>
        <Text variant="subheader-2" style={{ marginBottom: '1rem' }}>
          Смена пароля
        </Text>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 180 }}>
            <Text variant="caption-2" color="secondary">Текущий пароль</Text>
            <TextInput
              type="password"
              value={oldPassword}
              onUpdate={setOldPassword}
              placeholder="Текущий пароль"
            />
          </div>
          <div style={{ minWidth: 180 }}>
            <Text variant="caption-2" color="secondary">Новый пароль</Text>
            <TextInput
              type="password"
              value={newPassword}
              onUpdate={setNewPassword}
              placeholder="Новый пароль"
            />
          </div>
          <div style={{ minWidth: 180 }}>
            <Text variant="caption-2" color="secondary">Повторите пароль</Text>
            <TextInput
              type="password"
              value={confirmPassword}
              onUpdate={setConfirmPassword}
              placeholder="Повторите пароль"
            />
          </div>
          <Button
            view="action"
            loading={passwordMutation.isPending}
            onClick={handlePasswordChange}
            disabled={!oldPassword || !newPassword || !confirmPassword}
          >
            Сменить пароль
          </Button>
        </div>
      </Card>

      {/* Recent searches */}
      {recent_searches.length > 0 && (
        <Card style={{ padding: '1.5rem' }}>
          <Text variant="subheader-2" style={{ marginBottom: '1rem' }}>
            Последние поиски
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recent_searches.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>"{s.query}"</Text>
                <Text color="secondary" variant="caption-2">{formatDate(s.created_at)}</Text>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* My documents */}
      <Card style={{ padding: '1.5rem' }}>
        <Text variant="subheader-2" style={{ marginBottom: '1rem' }}>
          Мои документы ({my_documents_count})
        </Text>

        {docsLoading ? (
          <Skeleton style={{ height: 200 }} />
        ) : docsData && docsData.items.length > 0 ? (
          <>
            <Table
              data={docsData.items}
              columns={docColumns}
              getRowId={(doc) => String(doc.id)}
            />
            {docsData.total > 10 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem', gap: '0.5rem' }}>
                <Button
                  view="flat"
                  disabled={docPage <= 1}
                  onClick={() => setDocPage((p) => p - 1)}
                >
                  ← Назад
                </Button>
                <Text style={{ lineHeight: '32px' }}>
                  Стр. {docPage} / {Math.ceil(docsData.total / 10)}
                </Text>
                <Button
                  view="flat"
                  disabled={docPage >= Math.ceil(docsData.total / 10)}
                  onClick={() => setDocPage((p) => p + 1)}
                >
                  Вперёд →
                </Button>
              </div>
            )}
          </>
        ) : (
          <Text color="secondary">Вы ещё не загружали документы</Text>
        )}
      </Card>

      {/* Organizations */}
      <Card style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <Text variant="subheader-2">
            Мои организации ({orgs?.length ?? 0})
          </Text>
          <Button view="action" onClick={() => setIsCreateOrgOpen(true)}>
            + Создать
          </Button>
        </div>

        {orgsLoading ? (
          <Skeleton style={{ height: 80 }} />
        ) : orgs && orgs.length > 0 ? (
          <EnhancedOrgTable
            data={orgs}
            columns={orgColumns}
            getRowId={(org) => String(org.id)}
            emptyMessage="Организаций нет"
            getRowActions={getOrgRowActions}
            rowActionsSize="m"
          />
        ) : (
          <Text color="secondary">Вы не состоите ни в одной организации</Text>
        )}
      </Card>

      {/* Create organization dialog */}
      <Dialog open={isCreateOrgOpen} onClose={() => setIsCreateOrgOpen(false)} size="s">
        <Dialog.Header caption="Создать организацию" />
        <Dialog.Body>
          <TextInput
            label="Название"
            value={newOrgName}
            onUpdate={setNewOrgName}
            placeholder="Название организации"
            size="l"
          />
        </Dialog.Body>
        <Dialog.Footer
          onClickButtonApply={() => {
            if (newOrgName.trim()) createOrgMutation.mutate();
          }}
          onClickButtonCancel={() => setIsCreateOrgOpen(false)}
          textButtonApply="Создать"
          textButtonCancel="Отмена"
          propsButtonApply={{ loading: createOrgMutation.isPending, disabled: !newOrgName.trim() }}
        />
      </Dialog>

      {/* Organization detail dialog */}
      <Dialog open={selectedOrgId !== null} onClose={() => setSelectedOrgId(null)} size="l">
        <Dialog.Header caption={`Организация: ${orgDetail?.name ?? ''}`} />
        <Dialog.Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 460 }}>
            {orgDetailLoading ? (
              <Skeleton style={{ height: 150 }} />
            ) : orgDetail ? (
              <>
                <Text variant="subheader-2">Участники ({orgDetail.members.length})</Text>
                <EnhancedMemberTable
                  data={orgDetail.members}
                  columns={[
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
                  ]}
                  getRowId={(m) => String(m.user_id)}
                  emptyMessage="Нет участников"
                  getRowActions={(m: OrganizationMember) => [
                    {
                      text: 'Удалить',
                      handler: () => removeMemberMutation.mutate(m.user_id),
                      theme: 'danger' as const,
                    },
                  ]}
                  rowActionsSize="m"
                />

                <div style={{ borderTop: '1px solid var(--g-color-line-generic)', paddingTop: '1rem' }}>
                  <Text variant="subheader-2" style={{ marginBottom: 8, display: 'block' }}>Добавить участника</Text>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <NumberInput
                      value={addMemberUserId ?? undefined}
                      onUpdate={(v) => setAddMemberUserId(v ?? null)}
                      placeholder="ID пользователя"
                      min={1}
                      hiddenControls
                      size="m"
                    />
                    <Select
                      value={addMemberRole}
                      onUpdate={setAddMemberRole}
                      options={[
                        { value: 'member', content: 'Участник' },
                        { value: 'owner', content: 'Владелец' },
                      ]}
                      size="m"
                      width={140}
                    />
                    <Button
                      view="action"
                      size="m"
                      disabled={!addMemberUserId || addMemberUserId < 1}
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
              <Alert theme="danger" message="Не удалось загрузить данные" />
            )}
          </div>
        </Dialog.Body>
        <Dialog.Footer
          onClickButtonCancel={() => setSelectedOrgId(null)}
          textButtonCancel="Закрыть"
        />
      </Dialog>
    </div>
  );
};

export default ProfilePage;
