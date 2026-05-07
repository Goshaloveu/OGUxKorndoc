import React, { useState } from 'react';
import { Button, Card, Divider, Switch, Text } from '@gravity-ui/uikit';
import { useNotifications } from '../contexts/NotificationContext';
import { useThemeContext } from '../hooks/useTheme';
import type { NotifCategory } from '../contexts/NotificationContext';

const CATEGORY_LABELS: Record<NotifCategory, string> = {
  upload: 'Загрузка файлов',
  permission: 'Права доступа',
  admin: 'Администрирование',
  settings: 'Настройки',
  document: 'Документы',
};

const CATEGORY_DESCRIPTIONS: Record<NotifCategory, string> = {
  upload: 'Загрузка, индексация и ошибки обработки файлов',
  permission: 'Выдача и отзыв прав доступа к документам',
  admin: 'Создание пользователей, переиндексация и другие админ-действия',
  settings: 'Сохранение настроек профиля и системы',
  document: 'Удаление документов',
};

const CATEGORIES: NotifCategory[] = ['upload', 'permission', 'admin', 'settings', 'document'];

const SettingsPage: React.FC = () => {
  const { categorySettings, updateCategorySettings, addNotification } = useNotifications();
  const { theme, setTheme } = useThemeContext();

  const [localSettings, setLocalSettings] = useState({ ...categorySettings });
  const [localTheme, setLocalTheme] = useState(theme);
  const [dirty, setDirty] = useState(false);

  const handleToggle = (cat: NotifCategory, value: boolean) => {
    setLocalSettings((prev) => ({ ...prev, [cat]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    updateCategorySettings(localSettings);
    setTheme(localTheme);
    setDirty(false);
    // Fire notification (uses current settings, so 'settings' category must be enabled)
    addNotification('success', 'settings', 'Настройки сохранены');
  };

  const handleReset = () => {
    setLocalSettings({ ...categorySettings });
    setLocalTheme(theme);
    setDirty(false);
  };

  return (
    <div
      style={{
        maxWidth: 720,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      <div>
        <Text variant="display-1" as="h1" style={{ marginBottom: '8px' }}>
          Настройки
        </Text>
      </div>

      {/* Display */}
      <Card view="outlined" style={{ padding: '20px' }}>
        <Text variant="subheader-2" style={{ marginBottom: '16px' }}>
          Отображение
        </Text>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Text variant="body-2">Тёмная тема</Text>
          </div>
          <Switch
            checked={localTheme === 'dark'}
            onUpdate={(val) => {
              setLocalTheme(val ? 'dark' : 'light');
              setDirty(true);
            }}
          />
        </div>
      </Card>

      {/* Notifications */}
      <Card view="outlined" style={{ padding: '20px' }}>
        <Text variant="subheader-2" style={{ marginBottom: '8px' }}>
          Уведомления
        </Text>
        <Text variant="body-2" color="secondary" style={{ marginBottom: '20px' }}>
          Категории событий, о которых вы хотите получать уведомления в колокольчике
        </Text>

        {CATEGORIES.map((cat, idx) => (
          <React.Fragment key={cat}>
            {idx > 0 && <Divider style={{ margin: '12px 0' }} />}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text variant="body-2">{CATEGORY_LABELS[cat]}</Text>
                <Text variant="caption-1" color="secondary" style={{ display: 'block', marginTop: 2 }}>
                  {CATEGORY_DESCRIPTIONS[cat]}
                </Text>
              </div>
              <Switch
                checked={localSettings[cat]}
                onUpdate={(val) => handleToggle(cat, val)}
              />
            </div>
          </React.Fragment>
        ))}
      </Card>

      {/* Save */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <Button view="action" size="l" disabled={!dirty} onClick={handleSave}>
          Сохранить настройки
        </Button>
        {dirty && (
          <Button view="outlined" size="l" onClick={handleReset}>
            Отменить
          </Button>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
