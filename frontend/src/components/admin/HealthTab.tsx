import React from 'react';
import { Button, Card, Label, Text, Skeleton, Icon, Spin } from '@gravity-ui/uikit';
import type { IconData } from '@gravity-ui/uikit';
import { ArrowsRotateRight, Circles5Random, DatabaseFill, Cube, Thunderbolt } from '@gravity-ui/icons';
import { useQuery } from '@tanstack/react-query';
import { getSystemHealth } from '../../api/admin';
import type { SystemHealth, ServiceHealth } from '../../api/admin';

interface ServiceCardProps {
  name: string;
  icon: IconData;
  health: ServiceHealth;
  description: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ name, icon, health, description }) => {
  const isOk = health.status === 'ok';

  const pingColor =
    health.response_ms === null
      ? undefined
      : health.response_ms < 20
        ? 'var(--g-color-text-positive)'
        : health.response_ms < 100
          ? 'var(--g-color-text-warning)'
          : 'var(--g-color-text-danger)';

  return (
    <Card
      view="outlined"
      style={{
        padding: '1.25rem 1.5rem',
        flex: '1 1 200px',
        minWidth: 200,
        borderLeft: `3px solid ${isOk ? 'var(--g-color-line-positive)' : 'var(--g-color-line-danger)'}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon data={icon} size={20} />
          <Text variant="subheader-2">{name}</Text>
        </div>
        <Label theme={isOk ? 'success' : 'danger'} size="s">
          {isOk ? 'OK' : 'Ошибка'}
        </Label>
      </div>

      <Text variant="caption-2" color="secondary">
        {description}
      </Text>

      {isOk && health.response_ms !== null && (
        <Text variant="caption-2" style={{ color: pingColor }}>
          Ping: {health.response_ms} мс
        </Text>
      )}

      {!isOk && health.error && (
        <Text
          variant="caption-2"
          color="danger"
          style={{
            fontFamily: 'monospace',
            background: 'var(--g-color-base-danger-light)',
            padding: '4px 6px',
            borderRadius: 4,
            wordBreak: 'break-all',
          }}
        >
          {health.error}
        </Text>
      )}
    </Card>
  );
};

const SERVICE_META: Record<
  keyof Omit<SystemHealth, 'checked_at'>,
  { name: string; icon: IconData; description: string }
> = {
  postgres: {
    name: 'PostgreSQL',
    icon: DatabaseFill,
    description: 'Основная реляционная БД (пользователи, документы, права)',
  },
  qdrant: {
    name: 'Qdrant',
    icon: Circles5Random,
    description: 'Векторная БД для семантического поиска (768-dim)',
  },
  redis: {
    name: 'Redis',
    icon: Thunderbolt,
    description: 'Брокер задач Celery и кеш',
  },
  minio: {
    name: 'MinIO',
    icon: Cube,
    description: 'Объектное хранилище файлов (S3-совместимое)',
  },
};

function formatCheckedAt(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const REFETCH_INTERVAL = 15_000;

const HealthTab: React.FC = () => {
  const { data, isLoading, isFetching, isError, refetch } = useQuery<SystemHealth>({
    queryKey: ['system-health'],
    queryFn: getSystemHealth,
    // Автообновление каждые 15 сек. Фоновый рефетч не сбрасывает UI к скелетонам —
    // старые данные остаются видны, пока приходят новые.
    refetchInterval: REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const allOk =
    data !== undefined
      ? (Object.keys(SERVICE_META) as Array<keyof typeof SERVICE_META>).every(
          (k) => data[k].status === 'ok',
        )
      : null;

  // Фоновая проверка — показываем тонкий индикатор, не сбрасываем UI
  const isBackgroundFetch = isFetching && !isLoading;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {data && allOk !== null && (
            <Label theme={allOk ? 'success' : 'danger'} size="m">
              {allOk ? '✓ Все сервисы в норме' : '✗ Есть проблемы'}
            </Label>
          )}
          {isBackgroundFetch && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Spin size="xs" />
              <Text variant="caption-2" color="secondary">Проверяю...</Text>
            </div>
          )}
          {data?.checked_at && !isBackgroundFetch && (
            <Text variant="caption-2" color="secondary">
              Проверено в {formatCheckedAt(data.checked_at)} · авто каждые {REFETCH_INTERVAL / 1000} с
            </Text>
          )}
        </div>
        <Button
          view="outlined"
          size="m"
          loading={isFetching}
          onClick={() => void refetch()}
        >
          <Icon data={ArrowsRotateRight} size={14} />
          Проверить сейчас
        </Button>
      </div>

      {/* Cards — первичная загрузка: скелетоны; фоновый рефетч: старые данные */}
      {isLoading ? (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              style={{ flex: '1 1 200px', minWidth: 200, height: 110, borderRadius: 8 }}
            />
          ))}
        </div>
      ) : isError && !data ? (
        <Card view="outlined" style={{ padding: '1.5rem' }}>
          <Text color="danger">
            Не удалось получить статус сервисов. Проверьте доступность API.
          </Text>
        </Card>
      ) : data ? (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {(Object.keys(SERVICE_META) as Array<keyof typeof SERVICE_META>).map((key) => (
            <ServiceCard key={key} health={data[key]} {...SERVICE_META[key]} />
          ))}
        </div>
      ) : null}

      {/* Legend */}
      {data && (
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Text variant="caption-2" color="secondary">
            Ping:
          </Text>
          <Text variant="caption-2" style={{ color: 'var(--g-color-text-positive)' }}>
            {'< 20 мс — отлично'}
          </Text>
          <Text variant="caption-2" style={{ color: 'var(--g-color-text-warning)' }}>
            20–100 мс — норма
          </Text>
          <Text variant="caption-2" style={{ color: 'var(--g-color-text-danger)' }}>
            {'> 100 мс — медленно'}
          </Text>
        </div>
      )}
    </div>
  );
};

export default HealthTab;
