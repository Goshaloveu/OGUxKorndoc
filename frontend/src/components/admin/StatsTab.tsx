import React from 'react';
import { Text, Skeleton } from '@gravity-ui/uikit';
import { useQuery } from '@tanstack/react-query';
import { getAdminStats } from '../../api/admin';
import type { AdminStats } from '../../api/admin';

interface StatCardProps {
  title: string;
  value: number | string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, color }) => (
  <div
    style={{
      background: '#fff',
      border: '1px solid #e0e0e0',
      borderRadius: 8,
      padding: '1.25rem 1.5rem',
      minWidth: 160,
      flex: '1 1 160px',
    }}
  >
    <Text variant="caption-2" color="secondary" style={{ display: 'block', marginBottom: 8 }}>
      {title}
    </Text>
    <Text
      variant="display-1"
      style={{ color: color ?? 'inherit', fontSize: 32, fontWeight: 600, display: 'block' }}
    >
      {value}
    </Text>
  </div>
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
        <StatCard title="Проиндексировано" value={stats.indexed_docs} color="#27ae60" />
        <StatCard title="С ошибкой" value={stats.error_docs} color="#e74c3c" />
        <StatCard title="Пользователей" value={stats.total_users} color="#2980b9" />
        <StatCard title="Поисков сегодня" value={stats.searches_today} color="#8e44ad" />
      </div>
      <Text variant="caption-2" color="secondary">
        Обновляется каждые 30 секунд
      </Text>
    </div>
  );
};

export default StatsTab;
