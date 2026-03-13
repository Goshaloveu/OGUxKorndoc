import React from 'react';
import { Text, Skeleton } from '@gravity-ui/uikit';
import { useQuery } from '@tanstack/react-query';
import { getSystemHealth } from '../../api/admin';
import type { SystemHealth } from '../../api/admin';

interface ServiceCardProps {
  name: string;
  status: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ name, status }) => {
  const isOk = status === 'ok';
  return (
    <div
      style={{
        background: '#fff',
        border: `2px solid ${isOk ? '#27ae60' : '#e74c3c'}`,
        borderRadius: 8,
        padding: '1.25rem 1.5rem',
        minWidth: 160,
        flex: '1 1 160px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <Text variant="subheader-2">{name}</Text>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: isOk ? '#27ae60' : '#e74c3c',
            flexShrink: 0,
          }}
        />
        <Text
          variant="body-1"
          style={{ color: isOk ? '#27ae60' : '#e74c3c', fontWeight: 600 }}
        >
          {isOk ? 'Работает' : status}
        </Text>
      </div>
    </div>
  );
};

const SERVICE_NAMES: Record<keyof SystemHealth, string> = {
  postgres: 'PostgreSQL',
  qdrant: 'Qdrant',
  redis: 'Redis',
  minio: 'MinIO',
};

const HealthTab: React.FC = () => {
  const { data, isLoading, isError } = useQuery<SystemHealth>({
    queryKey: ['system-health'],
    queryFn: getSystemHealth,
    refetchInterval: 10_000,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} style={{ width: 160, height: 90, borderRadius: 8 }} />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return <Text color="danger">Ошибка получения статуса системы</Text>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {(Object.keys(SERVICE_NAMES) as Array<keyof SystemHealth>).map((key) => (
          <ServiceCard key={key} name={SERVICE_NAMES[key]} status={data[key]} />
        ))}
      </div>
      <Text variant="caption-2" color="secondary">
        Обновляется каждые 10 секунд
      </Text>
    </div>
  );
};

export default HealthTab;
