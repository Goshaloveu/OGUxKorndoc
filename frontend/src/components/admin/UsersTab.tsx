import React, { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  Icon,
  Label,
  Modal,
  Select,
  Skeleton,
  Table,
  Text,
  TextInput,
  withTableActions,
} from '@gravity-ui/uikit';
import type { TableActionConfig } from '@gravity-ui/uikit';
import { Plus, Person, Pencil } from '@gravity-ui/icons';
import { toaster } from '@gravity-ui/uikit/toaster-singleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
} from '../../api/admin';
import type { AdminUser, AdminUserListResponse, CreateUserParams, UpdateUserParams } from '../../api/admin';
import { useAuth } from '../../hooks/useAuth';

const ROLE_THEMES: Record<AdminUser['role'], 'info' | 'normal'> = {
  admin: 'info',
  user: 'normal',
};

const ROLE_LABELS: Record<AdminUser['role'], string> = {
  admin: 'Администратор',
  user: 'Пользователь',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const EnhancedTable = withTableActions(Table<AdminUser>);

const UsersTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState('');

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUser | null>(null);

  // Create form
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');

  // Edit form
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');

  const { data, isLoading, isError } = useQuery<AdminUserListResponse>({
    queryKey: ['admin-users', page],
    queryFn: () => getAdminUsers({ page, limit: 50 }),
  });

  const users = data?.items ?? [];

  // Filter locally by search
  const filtered = searchValue
    ? users.filter(
        (u) =>
          u.username.toLowerCase().includes(searchValue.toLowerCase()) ||
          u.email.toLowerCase().includes(searchValue.toLowerCase()),
      )
    : users;

  const createMutation = useMutation({
    mutationFn: (params: CreateUserParams) => createAdminUser(params),
    onSuccess: () => {
      toaster.add({ name: 'user-created', title: 'Пользователь создан', theme: 'success', autoHiding: 3000 });
      setCreateOpen(false);
      resetCreateForm();
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toaster.add({
        name: 'user-create-err',
        title: err.response?.data?.detail ?? 'Ошибка создания пользователя',
        theme: 'danger',
        autoHiding: 4000,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, params }: { id: number; params: UpdateUserParams }) =>
      updateAdminUser(id, params),
    onSuccess: () => {
      toaster.add({ name: 'user-updated', title: 'Пользователь обновлён', theme: 'success', autoHiding: 3000 });
      setEditTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toaster.add({
        name: 'user-update-err',
        title: err.response?.data?.detail ?? 'Ошибка обновления',
        theme: 'danger',
        autoHiding: 4000,
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => deleteAdminUser(id),
    onSuccess: () => {
      toaster.add({ name: 'user-deact', title: 'Пользователь деактивирован', theme: 'success', autoHiding: 3000 });
      setDeactivateTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toaster.add({
        name: 'user-deact-err',
        title: err.response?.data?.detail ?? 'Ошибка деактивации',
        theme: 'danger',
        autoHiding: 4000,
      });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => updateAdminUser(id, { is_active: true }),
    onSuccess: () => {
      toaster.add({ name: 'user-act', title: 'Пользователь активирован', theme: 'success', autoHiding: 3000 });
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => {
      toaster.add({ name: 'user-act-err', title: 'Ошибка активации', theme: 'danger', autoHiding: 4000 });
    },
  });

  const resetCreateForm = () => {
    setNewEmail('');
    setNewUsername('');
    setNewPassword('');
    setNewRole('user');
  };

  const handleCreate = () => {
    if (!newEmail || !newUsername || !newPassword) return;
    createMutation.mutate({ email: newEmail, username: newUsername, password: newPassword, role: newRole });
  };

  const handleOpenEdit = (user: AdminUser) => {
    setEditRole(user.role);
    setEditTarget(user);
  };

  const handleSaveEdit = () => {
    if (!editTarget) return;
    const params: UpdateUserParams = {};
    if (editRole !== editTarget.role) params.role = editRole;
    if (Object.keys(params).length === 0) {
      setEditTarget(null);
      return;
    }
    updateMutation.mutate({ id: editTarget.id, params });
  };

  const isSelf = (user: AdminUser) => currentUser?.id === user.id;

  const columns = [
    {
      id: 'username',
      name: 'Пользователь',
      template: (u: AdminUser) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon data={Person} size={16} />
          <div>
            <Text variant="body-1">
              {u.username}
              {isSelf(u) && (
                <Text variant="caption-2" color="secondary"> (вы)</Text>
              )}
            </Text>
          </div>
        </div>
      ),
    },
    {
      id: 'email',
      name: 'Email',
      template: (u: AdminUser) => (
        <Text variant="body-1" color="secondary">{u.email}</Text>
      ),
    },
    {
      id: 'role',
      name: 'Роль',
      width: 150,
      template: (u: AdminUser) => (
        <Label theme={ROLE_THEMES[u.role]} size="s">{ROLE_LABELS[u.role]}</Label>
      ),
    },
    {
      id: 'status',
      name: 'Статус',
      width: 140,
      template: (u: AdminUser) => (
        <Label theme={u.is_active ? 'success' : 'danger'} size="s">
          {u.is_active ? 'Активен' : 'Деактивирован'}
        </Label>
      ),
    },
    {
      id: 'created_at',
      name: 'Регистрация',
      width: 130,
      template: (u: AdminUser) => (
        <Text variant="body-1">{formatDate(u.created_at)}</Text>
      ),
    },
    {
      id: 'last_login',
      name: 'Последний вход',
      width: 160,
      template: (u: AdminUser) => (
        <Text variant="body-1" color="secondary">
          {u.last_login ? formatDateTime(u.last_login) : '—'}
        </Text>
      ),
    },
  ];

  const getRowActions = (user: AdminUser): TableActionConfig<AdminUser>[] => {
    const actions: TableActionConfig<AdminUser>[] = [];

    // Edit (role change) - always available except for self
    actions.push({
      text: 'Редактировать',
      handler: () => handleOpenEdit(user),
      icon: <Icon data={Pencil} size={14} />,
    });

    // Toggle role - not for self
    if (!isSelf(user)) {
      actions.push({
        text: user.role === 'admin' ? 'Сделать пользователем' : 'Назначить администратором',
        handler: () =>
          updateMutation.mutate({
            id: user.id,
            params: { role: user.role === 'admin' ? 'user' : 'admin' },
          }),
      });
    }

    // Activate / Deactivate - not for self
    if (!isSelf(user)) {
      if (user.is_active) {
        actions.push({
          text: 'Деактивировать',
          handler: () => setDeactivateTarget(user),
          theme: 'danger',
        });
      } else {
        actions.push({
          text: 'Активировать',
          handler: () => activateMutation.mutate(user.id),
        });
      }
    }

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
    return <Alert theme="danger" title="Ошибка" message="Не удалось загрузить пользователей" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          <Text variant="subheader-2">
            Пользователи ({data?.total ?? 0})
          </Text>
          <TextInput
            placeholder="Поиск по имени или email..."
            value={searchValue}
            onUpdate={setSearchValue}
            size="m"
            style={{ maxWidth: 300 }}
          />
        </div>
        <Button view="action" onClick={() => setCreateOpen(true)}>
          <Icon data={Plus} size={16} />
          Создать пользователя
        </Button>
      </div>

      <EnhancedTable
        data={filtered}
        columns={columns}
        getRowId={(u) => String(u.id)}
        emptyMessage="Пользователей не найдено"
        getRowActions={getRowActions}
        rowActionsSize="m"
      />

      {/* Pagination */}
      {data && data.total > 50 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
          <Button
            view="flat"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Назад
          </Button>
          <Text variant="body-1" style={{ alignSelf: 'center' }}>
            Стр. {page} из {Math.ceil(data.total / 50)}
          </Text>
          <Button
            view="flat"
            disabled={page * 50 >= data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Вперёд
          </Button>
        </div>
      )}

      {/* Create user modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)}>
        <div style={{ padding: '1.5rem', minWidth: 400, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Text variant="header-2">Создать пользователя</Text>
          <TextInput
            label="Email"
            placeholder="user@company.com"
            value={newEmail}
            onUpdate={setNewEmail}
          />
          <TextInput
            label="Имя пользователя"
            placeholder="username"
            value={newUsername}
            onUpdate={setNewUsername}
          />
          <TextInput
            label="Пароль"
            type="password"
            placeholder="Минимум 6 символов"
            value={newPassword}
            onUpdate={setNewPassword}
          />
          <div>
            <Text variant="body-2" style={{ marginBottom: 4, display: 'block' }}>Роль</Text>
            <Select
              value={[newRole]}
              onUpdate={(vals) => setNewRole(vals[0] as 'admin' | 'user')}
              options={[
                { value: 'user', content: 'Пользователь' },
                { value: 'admin', content: 'Администратор' },
              ]}
              width="max"
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button view="normal" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button
              view="action"
              loading={createMutation.isPending}
              disabled={!newEmail || !newUsername || !newPassword}
              onClick={handleCreate}
            >
              Создать
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit user modal */}
      <Dialog
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        size="s"
      >
        <Dialog.Header caption={`Редактирование: ${editTarget?.username ?? ''}`} />
        <Dialog.Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 360 }}>
            <div>
              <Text variant="caption-2" color="secondary" style={{ display: 'block', marginBottom: 4 }}>Email</Text>
              <Text variant="body-1">{editTarget?.email}</Text>
            </div>
            <div>
              <Text variant="caption-2" color="secondary" style={{ display: 'block', marginBottom: 4 }}>Статус</Text>
              <Label theme={editTarget?.is_active ? 'success' : 'danger'} size="s">
                {editTarget?.is_active ? 'Активен' : 'Деактивирован'}
              </Label>
            </div>
            <div>
              <Text variant="body-2" style={{ marginBottom: 4, display: 'block' }}>Роль</Text>
              <Select
                value={[editRole]}
                onUpdate={(vals) => setEditRole(vals[0] as 'admin' | 'user')}
                options={[
                  { value: 'user', content: 'Пользователь' },
                  { value: 'admin', content: 'Администратор' },
                ]}
                width="max"
                disabled={editTarget ? isSelf(editTarget) : false}
              />
              {editTarget && isSelf(editTarget) && (
                <Text variant="caption-2" color="secondary" style={{ marginTop: 4, display: 'block' }}>
                  Вы не можете изменить собственную роль
                </Text>
              )}
            </div>
            {editTarget && editTarget.created_at && (
              <div>
                <Text variant="caption-2" color="secondary" style={{ display: 'block', marginBottom: 4 }}>Дата регистрации</Text>
                <Text variant="body-1">{formatDateTime(editTarget.created_at)}</Text>
              </div>
            )}
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

      {/* Deactivate confirmation modal */}
      <Dialog
        open={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        size="s"
      >
        <Dialog.Header caption="Деактивировать пользователя?" />
        <Dialog.Body>
          <Text variant="body-1">
            Пользователь &laquo;{deactivateTarget?.username}&raquo; ({deactivateTarget?.email}) будет
            деактивирован и не сможет войти в систему. Вы сможете активировать его позже.
          </Text>
        </Dialog.Body>
        <Dialog.Footer
          onClickButtonCancel={() => setDeactivateTarget(null)}
          textButtonCancel="Отмена"
          onClickButtonApply={() => { if (deactivateTarget) deactivateMutation.mutate(deactivateTarget.id); }}
          textButtonApply="Деактивировать"
          loading={deactivateMutation.isPending}
        />
      </Dialog>
    </div>
  );
};

export default UsersTab;
