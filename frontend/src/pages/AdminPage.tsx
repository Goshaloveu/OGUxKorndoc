import React, { useState } from 'react';
import { Text } from '@gravity-ui/uikit';
import UsersTab from '../components/admin/UsersTab';
import StatsTab from '../components/admin/StatsTab';
import AuditLogTab from '../components/admin/AuditLogTab';
import HealthTab from '../components/admin/HealthTab';
import ErrorBoundary from '../components/ErrorBoundary';

type TabId = 'users' | 'stats' | 'audit' | 'health';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'users', label: 'Пользователи' },
  { id: 'stats', label: 'Статистика' },
  { id: 'audit', label: 'Журнал действий' },
  { id: 'health', label: 'Здоровье системы' },
];

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('users');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Text variant="header-1">Администрирование</Text>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid #e0e0e0',
          gap: 0,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #3d96f9' : '2px solid transparent',
              marginBottom: -2,
              padding: '0.625rem 1.25rem',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? '#3d96f9' : '#333',
              fontSize: 14,
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'users' && (
          <ErrorBoundary fallbackTitle="Ошибка вкладки «Пользователи»">
            <UsersTab />
          </ErrorBoundary>
        )}
        {activeTab === 'stats' && (
          <ErrorBoundary fallbackTitle="Ошибка вкладки «Статистика»">
            <StatsTab />
          </ErrorBoundary>
        )}
        {activeTab === 'audit' && (
          <ErrorBoundary fallbackTitle="Ошибка вкладки «Журнал действий»">
            <AuditLogTab />
          </ErrorBoundary>
        )}
        {activeTab === 'health' && (
          <ErrorBoundary fallbackTitle="Ошибка вкладки «Здоровье системы»">
            <HealthTab />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
