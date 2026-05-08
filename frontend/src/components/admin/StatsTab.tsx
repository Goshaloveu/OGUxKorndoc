import React from 'react';
import { Button, Card, Icon, Label, Progress, Skeleton, Text } from '@gravity-ui/uikit';
import type { Stack as ProgressStack } from '@gravity-ui/uikit';
import { ArrowsRotateRight } from '@gravity-ui/icons';
import { useQuery } from '@tanstack/react-query';
import { getAdminStats } from '../../api/admin';
import type { AdminStats } from '../../api/admin';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  accent?: 'positive' | 'danger' | 'info' | 'warning' | 'utility';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, accent }) => {
  const colorMap: Record<string, string> = {
    positive: 'var(--g-color-text-positive)',
    danger: 'var(--g-color-text-danger)',
    info: 'var(--g-color-text-info)',
    warning: 'var(--g-color-text-warning)',
    utility: 'var(--g-color-text-utility)',
  };

  return (
    <Card
      view="outlined"
      style={{ padding: '1.25rem 1.5rem', flex: '1 1 140px', minWidth: 140, display: 'flex', flexDirection: 'column', gap: 4 }}
    >
      <Text variant="caption-2" color="secondary">{title}</Text>
      <Text
        variant="display-1"
        style={{
          fontSize: 36,
          fontWeight: 700,
          lineHeight: 1,
          color: accent ? colorMap[accent] : 'var(--g-color-text-primary)',
        }}
      >
        {value}
      </Text>
      {subtitle && (
        <Text variant="caption-2" color="secondary">{subtitle}</Text>
      )}
    </Card>
  );
};

function buildIndexBar(stats: AdminStats): { segments: ProgressStack[]; text: string } {
  const { total_docs, indexed_docs, pending_docs, processing_docs, error_docs } = stats;
  if (total_docs === 0) return { segments: [], text: 'Нет документов' };

  const pct = (n: number) => Math.round((n / total_docs) * 100);
  const segments = [
    { theme: 'success' as const, value: pct(indexed_docs) },
    { theme: 'info' as const, value: pct(processing_docs) },
    { theme: 'warning' as const, value: pct(pending_docs) },
    { theme: 'danger' as const, value: pct(error_docs) },
  ].filter((s) => s.value > 0);

  return {
    segments,
    text: `${pct(indexed_docs)}% индексировано`,
  };
}

const StatsTab: React.FC = () => {
  const { data: stats, isLoading, isFetching, isError, refetch, dataUpdatedAt } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} style={{ flex: '1 1 140px', minWidth: 140, height: 90, borderRadius: 8 }} />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return <Text color="danger">Ошибка загрузки статистики</Text>;
  }

  const { segments, text: indexText } = buildIndexBar(stats);
  const indexPct = stats.total_docs > 0 ? Math.round((stats.indexed_docs / stats.total_docs) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="subheader-2">Обзор системы</Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {dataUpdatedAt > 0 && (
            <Text variant="caption-2" color="secondary">
              Обновлено: {new Date(dataUpdatedAt).toLocaleTimeString('ru-RU')}
            </Text>
          )}
          <Button view="outlined" size="s" loading={isFetching} onClick={() => void refetch()}>
            <Icon data={ArrowsRotateRight} size={14} />
            Обновить
          </Button>
        </div>
      </div>

      {/* Documents group */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <Text variant="subheader-1" color="secondary">Документы</Text>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <StatCard title="Всего" value={stats.total_docs} />
          <StatCard title="Индексировано" value={stats.indexed_docs} accent="positive" subtitle={`${indexPct}%`} />
          <StatCard title="В очереди" value={stats.pending_docs} accent="warning" />
          <StatCard title="Обрабатывается" value={stats.processing_docs} accent="info" />
          <StatCard title="Ошибки" value={stats.error_docs} accent="danger" />
        </div>

        {/* Indexing progress bar */}
        {stats.total_docs > 0 && (
          <Card view="outlined" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="body-2">Статус индексации</Text>
              <Text variant="caption-2" color="secondary">{indexText}</Text>
            </div>
            <Progress
              stack={segments.length > 0 ? segments : [{ theme: 'default', value: 100 }]}
              size="m"
            />
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Индексировано', theme: 'success' as const, value: stats.indexed_docs },
                { label: 'В обработке', theme: 'info' as const, value: stats.processing_docs },
                { label: 'В очереди', theme: 'warning' as const, value: stats.pending_docs },
                { label: 'Ошибки', theme: 'danger' as const, value: stats.error_docs },
              ].map(({ label, theme, value }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Label theme={theme} size="xs">{value}</Label>
                  <Text variant="caption-2" color="secondary">{label}</Text>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Users group */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <Text variant="subheader-1" color="secondary">Пользователи</Text>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <StatCard title="Всего" value={stats.total_users} />
          <StatCard
            title="Активных"
            value={stats.active_users}
            accent="positive"
            subtitle={stats.total_users > 0 ? `${Math.round((stats.active_users / stats.total_users) * 100)}%` : undefined}
          />
          <StatCard title="Организаций" value={stats.total_orgs} accent="info" />
        </div>
      </div>

      {/* Activity today */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <Text variant="subheader-1" color="secondary">Активность сегодня</Text>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <StatCard title="Поисков" value={stats.searches_today} accent="utility" />
          <StatCard title="Загрузок" value={stats.uploads_today} accent="info" />
        </div>
      </div>

      <Text variant="caption-2" color="secondary">
        Автообновление каждые 60 секунд
      </Text>
    </div>
  );
};

export default StatsTab;
