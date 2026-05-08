import React, { useState } from 'react';
import { Button, Card, Divider, Switch, Text } from '@gravity-ui/uikit';
import { useNotifications } from '../contexts/NotificationContext';
import { useThemeContext } from '../hooks/useTheme';
import type { NotifCategory } from '../contexts/NotificationContext';
import { useTranslation } from '../i18n';

const CATEGORIES: NotifCategory[] = ['upload', 'permission', 'admin', 'settings', 'document'];

const SettingsPage: React.FC = () => {
  const { categorySettings, updateCategorySettings, addNotification } = useNotifications();
  const { theme, setTheme } = useThemeContext();
  const t = useTranslation('settingsPage');

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
    addNotification('success', 'settings', t('saved'));
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
          {t('title')}
        </Text>
      </div>

      {/* Display */}
      <Card view="outlined" style={{ padding: '20px' }}>
        <Text variant="subheader-2">
          {t('display')}
        </Text>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginTop: 16 }}>
          <div>
            <Text variant="body-2">{t('darkTheme')}</Text>
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
        <Text variant="subheader-2">
          {t('notifications')}
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 16 }}>
          {CATEGORIES.map((cat, idx) => (
            <React.Fragment key={cat}>
              {idx > 0 && <Divider style={{ margin: '12px 0' }} />}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <Text variant="body-2">{t(`category.${cat}`)}</Text>
                  <Text variant="caption-1" color="secondary" style={{ display: 'block', marginTop: 2 }}>
                    {t(`categoryDescription.${cat}`)}
                  </Text>
                </div>
                <Switch
                  checked={localSettings[cat]}
                  onUpdate={(val) => handleToggle(cat, val)}
                />
              </div>
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* Save */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <Button view="action" size="l" disabled={!dirty} onClick={handleSave}>
          {t('saveSettings')}
        </Button>
        {dirty && (
          <Button view="outlined" size="l" onClick={handleReset}>
            {t('cancelChanges')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
