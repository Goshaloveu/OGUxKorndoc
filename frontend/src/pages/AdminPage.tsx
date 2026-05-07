import React, { useState } from 'react';
import { Text, TabProvider, TabList, Tab } from '@gravity-ui/uikit';
import UsersTab from '../components/admin/UsersTab';
import StatsTab from '../components/admin/StatsTab';
import AuditLogTab from '../components/admin/AuditLogTab';
import HealthTab from '../components/admin/HealthTab';
import OrganizationsTab from '../components/admin/OrganizationsTab';
import DocumentsTab from '../components/admin/DocumentsTab';
import FAQTab from '../components/admin/FAQTab';
import ErrorBoundary from '../components/ErrorBoundary';
import { useTranslation } from '../i18n';

type TabId = 'users' | 'orgs' | 'documents' | 'faq' | 'stats' | 'audit' | 'health';

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('users');
  const t = useTranslation('adminPage');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Text variant="header-1">{t('title')}</Text>

      <TabProvider value={activeTab} onUpdate={(v) => setActiveTab(v as TabId)}>
        <TabList size="l">
          <Tab value="users">{t('users')}</Tab>
          <Tab value="orgs">{t('organizations')}</Tab>
          <Tab value="documents">{t('documents')}</Tab>
          <Tab value="faq">{t('faq')}</Tab>
          <Tab value="stats">{t('stats')}</Tab>
          <Tab value="audit">{t('audit')}</Tab>
          <Tab value="health">{t('health')}</Tab>
        </TabList>
      </TabProvider>

      <div>
        {activeTab === 'users' && (
          <ErrorBoundary fallbackTitle={t('usersError')}>
            <UsersTab />
          </ErrorBoundary>
        )}
        {activeTab === 'orgs' && (
          <ErrorBoundary fallbackTitle={t('orgsError')}>
            <OrganizationsTab />
          </ErrorBoundary>
        )}
        {activeTab === 'documents' && (
          <ErrorBoundary fallbackTitle={t('documentsError')}>
            <DocumentsTab />
          </ErrorBoundary>
        )}
        {activeTab === 'faq' && (
          <ErrorBoundary fallbackTitle={t('faqError')}>
            <FAQTab />
          </ErrorBoundary>
        )}
        {activeTab === 'stats' && (
          <ErrorBoundary fallbackTitle={t('statsError')}>
            <StatsTab />
          </ErrorBoundary>
        )}
        {activeTab === 'audit' && (
          <ErrorBoundary fallbackTitle={t('auditError')}>
            <AuditLogTab />
          </ErrorBoundary>
        )}
        {activeTab === 'health' && (
          <ErrorBoundary fallbackTitle={t('healthError')}>
            <HealthTab />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
