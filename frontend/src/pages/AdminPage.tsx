import React, { useState } from 'react';
import { Text, TabProvider, TabList, Tab } from '@gravity-ui/uikit';
import UsersTab from '../components/admin/UsersTab';
import StatsTab from '../components/admin/StatsTab';
import AuditLogTab from '../components/admin/AuditLogTab';
import HealthTab from '../components/admin/HealthTab';
import OrganizationsTab from '../components/admin/OrganizationsTab';
import ErrorBoundary from '../components/ErrorBoundary';

type TabId = 'users' | 'stats' | 'audit' | 'health' | 'orgs';

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('users');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Text variant="header-1">Администрирование</Text>

      <TabProvider value={activeTab} onUpdate={(v) => setActiveTab(v as TabId)}>
        <TabList size="l">
          <Tab value="users">Пользователи</Tab>
          <Tab value="stats">Статистика</Tab>
          <Tab value="audit">Журнал действий</Tab>
          <Tab value="health">Здоровье системы</Tab>
          <Tab value="orgs">Организации</Tab>
        </TabList>
      </TabProvider>

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
        {activeTab === 'orgs' && (
          <ErrorBoundary fallbackTitle="Ошибка вкладки «Организации»">
            <OrganizationsTab />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
