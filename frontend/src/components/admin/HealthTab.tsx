import React from 'react';
import { Card, Label, Text, Skeleton } from '@gravity-ui/uikit';
import { useQuery } from '@tanstack/react-query';
import { getSystemHealth } from '../../api/admin';
import type { SystemHealth, ServiceHealth } from '../../api/admin';

interface ServiceCardProps {
  name: string;
  health: ServiceHealth;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ name, health }) => {
  const isOk = health.status === 'ok';
  return (
    <Card
      view="outlined"
      style={{ padding: '1.25rem 1.5rem', minWidth: 160, flex: '1 1 160px' }}
    >
      <Text variant="subheader-2" style={{ display: 'block', marginBottom: '0.5rem' }}>{name}</Text>
      <Label theme={isOk ? 'success' : 'danger'}>
        {isOk ? 'Работает' : (health.error ?? health.status)}
      </Label>
    </Card>
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
          <ServiceCard key={key} name={SERVICE_NAMES[key]} health={data[key]} />
        ))}
      </div>
      <Text variant="caption-2" color="secondary">
        Обновляется каждые 10 секунд
      </Text>
    </div>
  );
};

export default HealthTab;
