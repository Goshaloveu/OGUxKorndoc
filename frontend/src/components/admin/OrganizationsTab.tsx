import React from 'react';
import { Table, Text, Skeleton, Alert } from '@gravity-ui/uikit';
import { useQuery } from '@tanstack/react-query';
import { getAdminOrganizations } from '../../api/admin';
import type { AdminOrganization } from '../../api/admin';
import type { TableColumnConfig } from '@gravity-ui/uikit';

const columns: TableColumnConfig<AdminOrganization>[] = [
  { id: 'id', name: 'ID', width: 60 },
  { id: 'name', name: 'Название' },
  { id: 'slug', name: 'Slug' },
  {
    id: 'created_at',
    name: 'Создана',
    template: (row) =>
      new Date(row.created_at).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
  },
];

const OrganizationsTab: React.FC = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'organizations'],
    queryFn: getAdminOrganizations,
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 40, width: '100%' }} />
        ))}
      </div>
    );
  }

  if (isError) {
    return <Alert theme="danger" title="Ошибка" message="Не удалось загрузить список организаций" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Text variant="subheader-2">Организации ({data?.length ?? 0})</Text>
      <Table
        data={data ?? []}
        columns={columns}
        getRowId={(row) => String(row.id)}
        emptyMessage="Организации не найдены"
      />
    </div>
  );
};

export default OrganizationsTab;
