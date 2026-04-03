import React from 'react';
import { Card, Text, Skeleton } from '@gravity-ui/uikit';
import { useQuery } from '@tanstack/react-query';
import { getAdminStats } from '../../api/admin';
import type { AdminStats } from '../../api/admin';

interface StatCardProps {
  title: string;
  value: number | string;
  colorVar?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, colorVar }) => (
  <Card
    view="outlined"
    style={{ padding: '1.25rem 1.5rem', minWidth: 160, flex: '1 1 160px' }}
  >
    <Text variant="caption-2" color="secondary" style={{ display: 'block', marginBottom: 8 }}>
      {title}
    </Text>
    <Text
      variant="display-1"
      style={{
        color: colorVar ? `var(${colorVar})` : 'var(--g-color-text-primary)',
        fontSize: 32,
        fontWeight: 600,
        display: 'block',
      }}
    >
      {value}
    </Text>
  </Card>
);

const StatsTab: React.FC = () => {
  const { data: stats, isLoading, isError } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} style={{ width: 160, height: 90, borderRadius: 8 }} />
        ))}
      </div>
    );
  }

  if (isError || !stats) {
    return <Text color="danger">Ошибка загрузки статистики</Text>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <StatCard title="Всего документов" value={stats.total_docs} />
        <StatCard title="Проиндексировано" value={stats.indexed_docs} colorVar="--g-color-text-positive" />
        <StatCard title="С ошибкой" value={stats.error_docs} colorVar="--g-color-text-danger" />
        <StatCard title="Пользователей" value={stats.total_users} colorVar="--g-color-text-info" />
        <StatCard title="Поисков сегодня" value={stats.searches_today} colorVar="--g-color-text-utility" />
      </div>
      <Text variant="caption-2" color="secondary">
        Обновляется каждые 30 секунд
      </Text>
    </div>
  );
};

export default StatsTab;
