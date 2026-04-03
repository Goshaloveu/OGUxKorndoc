import React, { useState } from 'react';
import {
  Button,
  Icon,
  Label,
  Modal,
  Select,
  Table,
  Text,
  TextInput,
} from '@gravity-ui/uikit';
import { Plus, Person, TrashBin } from '@gravity-ui/icons';
import { toaster } from '@gravity-ui/uikit/toaster-singleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
} from '../../api/admin';
import type { AdminUser, CreateUserParams } from '../../api/admin';

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

const UsersTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUser | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');

  const { data: users, isLoading, isError } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: getAdminUsers,
  });

  const createMutation = useMutation({
    mutationFn: (params: CreateUserParams) => createAdminUser(params),
    onSuccess: () => {
      toaster.add({ name: 'user-created', title: 'Пользователь создан', theme: 'success', autoHiding: 3000 });
      setCreateOpen(false);
      setNewEmail('');
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => {
      toaster.add({ name: 'user-create-err', title: 'Ошибка создания пользователя', theme: 'danger', autoHiding: 4000 });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, params }: { id: number; params: { role?: 'admin' | 'user'; is_active?: boolean } }) =>
      updateAdminUser(id, params),
    onSuccess: () => {
      toaster.add({ name: 'user-updated', title: 'Пользователь обновлён', theme: 'success', autoHiding: 3000 });
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => {
      toaster.add({ name: 'user-update-err', title: 'Ошибка обновления', theme: 'danger', autoHiding: 4000 });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => deleteAdminUser(id),
    onSuccess: () => {
      toaster.add({ name: 'user-deact', title: 'Пользователь деактивирован', theme: 'success', autoHiding: 3000 });
      setDeactivateTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => {
      toaster.add({ name: 'user-deact-err', title: 'Ошибка деактивации', theme: 'danger', autoHiding: 4000 });
    },
  });

  const handleCreate = () => {
    if (!newEmail || !newUsername || !newPassword) return;
    createMutation.mutate({ email: newEmail, username: newUsername, password: newPassword, role: newRole });
  };

  const columns = [
    {
      id: 'username',
      name: 'Пользователь',
      template: (u: AdminUser) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon data={Person} size={16} />
          <Text variant="body-1">{u.username}</Text>
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
      template: (u: AdminUser) => (
        <Label theme={ROLE_THEMES[u.role]} size="s">{ROLE_LABELS[u.role]}</Label>
      ),
    },
    {
      id: 'status',
      name: 'Статус',
      template: (u: AdminUser) => (
        <Label theme={u.is_active ? 'success' : 'danger'} size="s">
          {u.is_active ? 'Активен' : 'Деактивирован'}
        </Label>
      ),
    },
    {
      id: 'created_at',
      name: 'Дата регистрации',
      template: (u: AdminUser) => (
        <Text variant="body-1">{formatDate(u.created_at)}</Text>
      ),
    },
    {
      id: 'last_login',
      name: 'Последний вход',
      template: (u: AdminUser) => (
        <Text variant="body-1" color="secondary">
          {u.last_login ? formatDate(u.last_login) : '—'}
        </Text>
      ),
    },
    {
      id: 'actions',
      name: 'Действия',
      template: (u: AdminUser) => (
        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
          <Button
            view="outlined"
            size="s"
            onClick={() =>
              updateMutation.mutate({
                id: u.id,
                params: { role: u.role === 'admin' ? 'user' : 'admin' },
              })
            }
            title={u.role === 'admin' ? 'Снять права admin' : 'Назначить admin'}
          >
            {u.role === 'admin' ? 'user' : 'admin'}
          </Button>
          {u.is_active && (
            <Button
              view="outlined-danger"
              size="s"
              onClick={() => setDeactivateTarget(u)}
              title="Деактивировать"
            >
              <Icon data={TrashBin} size={14} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <Text color="secondary">Загрузка...</Text>;
  }
  if (isError) {
    return <Text color="danger">Ошибка загрузки пользователей</Text>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button view="action" onClick={() => setCreateOpen(true)}>
          <Icon data={Plus} size={16} />
          Создать пользователя
        </Button>
      </div>

      <Table
        data={users ?? []}
        columns={columns}
        getRowId={(u) => String(u.id)}
        emptyMessage="Пользователей не найдено"
      />

      {/* Create user modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)}>
        <div style={{ padding: '1.5rem', minWidth: 360, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Text variant="header-2">Создать пользователя</Text>
          <TextInput
            label="Email"
            placeholder="user@company.com"
            value={newEmail}
            onUpdate={setNewEmail}
          />
          <TextInput
            label="Username"
            placeholder="username"
            value={newUsername}
            onUpdate={setNewUsername}
          />
          <TextInput
            label="Пароль"
            type="password"
            placeholder="••••••••"
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

      {/* Deactivate confirmation modal */}
      <Modal open={deactivateTarget !== null} onClose={() => setDeactivateTarget(null)}>
        <div style={{ padding: '1.5rem', minWidth: 320, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Text variant="header-2">Деактивировать пользователя?</Text>
          <Text variant="body-1">
            Пользователь &laquo;{deactivateTarget?.username}&raquo; будет деактивирован и не сможет войти в систему.
          </Text>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button view="normal" onClick={() => setDeactivateTarget(null)}>Отмена</Button>
            <Button
              view="outlined-danger"
              loading={deactivateMutation.isPending}
              onClick={() => { if (deactivateTarget) deactivateMutation.mutate(deactivateTarget.id); }}
            >
              Деактивировать
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsersTab;
