import React, { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Skeleton,
  Text,
  TextInput,
  Label,
} from '@gravity-ui/uikit';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotifications } from '../contexts/NotificationContext';
import {
  changePassword,
  getProfile,
  updateProfile,
} from '../api/profile';
import { useTranslation } from '../i18n';
import { useThemeContext } from '../hooks/useTheme';

function formatDate(iso: string, lang: string): string {
  return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const ProfilePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const { lang } = useThemeContext();
  const t = useTranslation('profilePage');
  const tApp = useTranslation('app');

  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  });

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      addNotification('success', 'settings', t('profileUpdated'));
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setIsEditing(false);
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      addNotification(
        'error',
        'settings',
        t('profileUpdateError'),
        err.response?.data?.detail,
      );
    },
  });

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      addNotification('success', 'settings', t('passwordChanged'));
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      addNotification(
        'error',
        'settings',
        t('passwordChangeError'),
        err.response?.data?.detail,
      );
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
      addNotification('error', 'settings', t('passwordMismatch'), t('passwordMismatchDescription'));
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
    return <Alert theme="danger" title={tApp('error')} message={t('loadError')} />;
  }

  const { user, my_documents_count, recent_searches } = profile;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 900 }}>
      <Text variant="header-1">{tApp('profile')}</Text>

      {/* User card */}
      <Card style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Text variant="header-2">{user.username}</Text>
            <Text color="secondary">{user.email}</Text>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Label theme={user.role === 'admin' ? 'danger' : 'info'}>
                {user.role === 'admin' ? tApp('admin') : tApp('user')}
              </Label>
              <Text color="secondary" variant="caption-2">
                {t('registered', { date: formatDate(user.created_at, lang) })}
              </Text>
              {user.last_login && (
                <Text color="secondary" variant="caption-2">
                  {t('lastLogin', { date: formatDate(user.last_login, lang) })}
                </Text>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Text color="secondary">{t('documentsCount', { count: my_documents_count })}</Text>
            {!isEditing && (
              <Button view="action" onClick={startEdit}>
                {tApp('edit')}
              </Button>
            )}
          </div>
        </div>

        {isEditing && (
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Text variant="subheader-2">{t('editProfile')}</Text>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Text variant="caption-2" color="secondary">{t('username')}</Text>
                <TextInput
                  value={editUsername}
                  onUpdate={setEditUsername}
                  placeholder={t('username')}
                />
              </div>
              <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                {tApp('save')}
              </Button>
              <Button view="flat" onClick={() => setIsEditing(false)}>
                {tApp('cancel')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Change password */}
      <Card style={{ padding: '1.5rem' }}>
        <Text variant="subheader-2" style={{ marginBottom: '1rem' }}>
          {t('changePassword')}
        </Text>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 180, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Text variant="caption-2" color="secondary">{t('oldPassword')}</Text>
            <TextInput
              type="password"
              value={oldPassword}
              onUpdate={setOldPassword}
              placeholder={t('oldPassword')}
            />
          </div>
          <div style={{ minWidth: 180, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Text variant="caption-2" color="secondary">{t('newPassword')}</Text>
            <TextInput
              type="password"
              value={newPassword}
              onUpdate={setNewPassword}
              placeholder={t('newPassword')}
            />
          </div>
          <div style={{ minWidth: 180, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Text variant="caption-2" color="secondary">{t('confirmPassword')}</Text>
            <TextInput
              type="password"
              value={confirmPassword}
              onUpdate={setConfirmPassword}
              placeholder={t('confirmPassword')}
            />
          </div>
          <Button
            view="action"
            loading={passwordMutation.isPending}
            onClick={handlePasswordChange}
            disabled={!oldPassword || !newPassword || !confirmPassword}
          >
            {t('changePassword')}
          </Button>
        </div>
      </Card>

      {/* Recent searches */}
      {recent_searches.length > 0 && (
        <Card style={{ padding: '1.5rem' }}>
          <Text variant="subheader-2" style={{ marginBottom: '1rem' }}>
            {t('recentSearches')}
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recent_searches.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>"{s.query}"</Text>
                <Text color="secondary" variant="caption-2">{formatDate(s.created_at, lang)}</Text>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ProfilePage;
