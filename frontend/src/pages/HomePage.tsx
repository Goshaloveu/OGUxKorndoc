import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Skeleton, Text, Label } from '@gravity-ui/uikit';
import {
  Magnifier,
  ArrowUpFromLine,
  FaceRobot,
  FileText,
  Folder,
  CircleCheck,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useQuery } from '@tanstack/react-query';
import { getAdminStats } from '../api/admin';
import { getProfile } from '../api/profile';
import { getDocuments } from '../api/documents';
import { useAuth } from '../hooks/useAuth';
import type { Document } from '../types';
import { useTranslation } from '../i18n';
import { useThemeContext } from '../hooks/useTheme';

function formatDate(iso: string, lang: string): string {
  return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const FILE_TYPE_THEMES: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'normal'> = {
  pdf: 'danger',
  docx: 'info',
  xlsx: 'success',
  txt: 'normal',
};

const STATUS_THEMES: Record<Document['status'], 'info' | 'success' | 'warning' | 'danger' | 'normal'> = {
  pending: 'warning',
  processing: 'info',
  indexed: 'success',
  error: 'danger',
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang } = useThemeContext();
  const t = useTranslation('home');
  const tApp = useTranslation('app');
  const isAdmin = user?.role === 'admin';

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
    enabled: isAdmin,
  });

  const { data: recentDocs, isLoading: docsLoading } = useQuery({
    queryKey: ['documents', 1, '', ''],
    queryFn: () => getDocuments({ page: 1, limit: 5 }),
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return tApp('fileSize.bytes', { value: bytes });
    if (bytes < 1024 * 1024) return tApp('fileSize.kb', { value: (bytes / 1024).toFixed(1) });
    return tApp('fileSize.mb', { value: (bytes / 1024 / 1024).toFixed(1) });
  };

  const statusLabels: Record<Document['status'], string> = {
    pending: tApp('pending'),
    processing: tApp('processing'),
    indexed: tApp('indexed'),
    error: tApp('error'),
  };

  const greeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return t('morning');
    if (hour < 17) return t('day');
    return t('evening');
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Welcome */}
      <Card view="outlined" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <Text variant="display-1" as="h1" style={{ marginBottom: '8px' }}>
              {greeting()},{' '}
              {profileLoading ? (
                <Skeleton style={{ display: 'inline-block', width: 120, height: 28 }} />
              ) : (
                profile?.user.username ?? user?.username ?? t('fallbackUser')
              )}
              !
            </Text>
            <Text variant="body-2" color="secondary">
              {t('welcome')}
            </Text>
          </div>
          <Label theme="info" size="m">
            {user?.role === 'admin' ? tApp('admin') : tApp('user')}
          </Label>
        </div>
      </Card>

      {/* Stats row (admin only) */}
      {isAdmin && (
        <div>
          <Text variant="subheader-2" style={{ marginBottom: '12px' }}>
            {t('systemStats')}
          </Text>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} view="outlined" style={{ padding: '16px' }}>
                  <Skeleton style={{ width: '100%', height: 60 }} />
                </Card>
              ))
            ) : stats ? (
              <>
                <StatCard
                  icon={<Icon data={FileText} size={20} />}
                  value={String(stats.total_docs)}
                  label={t('totalDocuments')}
                  color="var(--g-color-text-info)"
                />
                <StatCard
                  icon={<Icon data={CircleCheck} size={20} />}
                  value={String(stats.indexed_docs)}
                  label={t('indexed')}
                  color="var(--g-color-text-positive)"
                />
                <StatCard
                  icon={<Icon data={Magnifier} size={20} />}
                  value={String(stats.searches_today)}
                  label={t('searchesToday')}
                  color="var(--g-color-text-warning)"
                />
                <StatCard
                  icon={<Icon data={Folder} size={20} />}
                  value={String(stats.total_users)}
                  label={t('users')}
                  color="var(--g-color-text-misc)"
                />
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <Text variant="subheader-2">
          {t('quickActions')}
        </Text>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: 10 }}>
          <Button view="action" size="l" onClick={() => navigate('/search')}>
            <Icon data={Magnifier} size={16} />
            {t('findDocument')}
          </Button>
          <Button view="normal" size="l" onClick={() => navigate('/upload')}>
            <Icon data={ArrowUpFromLine} size={16} />
            {t('uploadFile')}
          </Button>
          <Button view="outlined" size="l" onClick={() => navigate('/ai')}>
            <Icon data={FaceRobot} size={16} />
            {tApp('aiAssistant')}
          </Button>
        </div>
      </div>

      {/* Recent documents */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <Text variant="subheader-2">{t('recentDocuments')}</Text>
          <Button view="flat" size="s" onClick={() => navigate('/documents')}>
            {t('allDocuments')}
          </Button>
        </div>

        <Card view="outlined" style={{ overflow: 'hidden' }}>
          {docsLoading ? (
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} style={{ width: '100%', height: 44 }} />
              ))}
            </div>
          ) : !recentDocs?.items.length ? (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <Text color="secondary">{t('emptyDocuments')}</Text>
            </div>
          ) : (
            <div>
              {recentDocs.items.map((doc, idx) => (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 16px',
                    borderBottom:
                      idx < recentDocs.items.length - 1
                        ? '1px solid var(--g-color-line-generic)'
                        : 'none',
                  }}
                >
                  <Icon data={FileText} size={16} style={{ color: 'var(--g-color-text-secondary)', flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Text variant="body-2" ellipsis>
                      {doc.title}
                    </Text>
                    <Text variant="caption-1" color="secondary">
                      {formatDate(doc.uploaded_at, lang)} · {formatFileSize(doc.file_size)}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'row', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                    <Label theme={FILE_TYPE_THEMES[doc.file_type] ?? 'normal'} size="xs">
                      {doc.file_type.toUpperCase()}
                    </Label>
                    <Label theme={STATUS_THEMES[doc.status]} size="xs">
                      {statusLabels[doc.status]}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, color }) => (
  <Card view="outlined" style={{ padding: '16px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color }}>
      {icon}
      <Text variant="display-1" style={{ color }}>
        {value}
      </Text>
    </div>
    <Text variant="body-1" color="secondary">
      {label}
    </Text>
  </Card>
);

export default HomePage;
