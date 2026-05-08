import React, { useState } from 'react';
import { Button, Pagination, Select, Table, Text, TextInput } from '@gravity-ui/uikit';
import { DatePicker } from '@gravity-ui/date-components';
import { dateTime } from '@gravity-ui/date-utils';
import type { DateTime } from '@gravity-ui/date-utils';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '../../api/admin';
import type { AuditLogEntry, AuditLogResponse } from '../../api/admin';

const ACTION_OPTIONS = [
  { value: '', content: 'Все действия' },
  { value: 'upload', content: 'Загрузка' },
  { value: 'search', content: 'Поиск' },
  { value: 'download', content: 'Скачивание' },
  { value: 'delete', content: 'Удаление' },
  { value: 'login', content: 'Вход' },
  { value: 'share', content: 'Доступ' },
];

const ACTION_LABELS: Record<string, string> = {
  upload: 'Загрузка',
  search: 'Поиск',
  download: 'Скачивание',
  delete: 'Удаление',
  login: 'Вход',
  share: 'Доступ',
};

const PAGE_SIZE = 20;

function formatDatetime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const columns = [
  {
    id: 'created_at',
    name: 'Время',
    template: (entry: AuditLogEntry) => (
      <Text variant="body-1" style={{ whiteSpace: 'nowrap' }}>{formatDatetime(entry.created_at)}</Text>
    ),
  },
  {
    id: 'user_id',
    name: 'Пользователь',
    template: (entry: AuditLogEntry) => (
      <Text variant="body-1">{entry.user_id}</Text>
    ),
  },
  {
    id: 'action',
    name: 'Действие',
    template: (entry: AuditLogEntry) => (
      <Text variant="body-1">{ACTION_LABELS[entry.action] ?? entry.action}</Text>
    ),
  },
  {
    id: 'resource_type',
    name: 'Тип ресурса',
    template: (entry: AuditLogEntry) => (
      <Text variant="body-1" color="secondary">{entry.resource_type}</Text>
    ),
  },
  {
    id: 'resource_id',
    name: 'ID ресурса',
    template: (entry: AuditLogEntry) => (
      <Text variant="body-1" color="secondary">{entry.resource_id ?? '—'}</Text>
    ),
  },
  {
    id: 'ip_address',
    name: 'IP',
    template: (entry: AuditLogEntry) => (
      <Text variant="body-1" color="secondary">{entry.ip_address ?? '—'}</Text>
    ),
  },
  {
    id: 'details',
    name: 'Детали',
    template: (entry: AuditLogEntry) => (
      <Text
        variant="caption-2"
        color="secondary"
        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: 200 }}
        title={JSON.stringify(entry.details)}
      >
        {JSON.stringify(entry.details)}
      </Text>
    ),
  },
];

const AuditLogTab: React.FC = () => {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading, isError } = useQuery<AuditLogResponse>({
    queryKey: ['audit-logs', page, action, userId, dateFrom, dateTo],
    queryFn: () =>
      getAuditLogs({
        page,
        limit: PAGE_SIZE,
        ...(action ? { action } : {}),
        ...(userId ? { user_id: parseInt(userId) } : {}),
        ...(dateFrom ? { date_from: dateFrom } : {}),
        ...(dateTo ? { date_to: dateTo } : {}),
      }),
  });

  const handleReset = () => {
    setAction('');
    setUserId('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 160 }}>
          <Text variant="caption-2" style={{ display: 'block', marginBottom: 4 }}>Действие</Text>
          <Select
            value={[action]}
            onUpdate={(vals) => { setAction(vals[0] ?? ''); setPage(1); }}
            options={ACTION_OPTIONS}
            width={160}
          />
        </div>
        <div style={{ minWidth: 120 }}>
          <Text variant="caption-2" style={{ display: 'block', marginBottom: 4 }}>ID пользователя</Text>
          <TextInput
            placeholder="например, 1"
            value={userId}
            onUpdate={(v) => { setUserId(v); setPage(1); }}
            style={{ width: 120 }}
          />
        </div>
        <div style={{ minWidth: 140 }}>
          <Text variant="caption-2" style={{ display: 'block', marginBottom: 4 }}>Дата от</Text>
          <DatePicker
            size="s"
            format="DD.MM.YYYY"
            value={dateFrom ? dateTime({ input: dateFrom }) : null}
            onUpdate={(v: DateTime | null) => { setDateFrom(v ? v.format('YYYY-MM-DD') : ''); setPage(1); }}
            hasClear
          />
        </div>
        <div style={{ minWidth: 140 }}>
          <Text variant="caption-2" style={{ display: 'block', marginBottom: 4 }}>Дата до</Text>
          <DatePicker
            size="s"
            format="DD.MM.YYYY"
            value={dateTo ? dateTime({ input: dateTo }) : null}
            onUpdate={(v: DateTime | null) => { setDateTo(v ? v.format('YYYY-MM-DD') : ''); setPage(1); }}
            hasClear
          />
        </div>
        <Button view="normal" onClick={handleReset}>Сбросить</Button>
      </div>

      {isLoading && <Text color="secondary">Загрузка...</Text>}
      {isError && <Text color="danger">Ошибка загрузки журнала</Text>}

      {data && (
        <>
          <Text variant="caption-2" color="secondary">Всего записей: {data.total}</Text>

          <Table
            data={data.items}
            columns={columns}
            getRowId={(entry) => String(entry.id)}
            emptyMessage="Записей не найдено"
          />

          {data.total > PAGE_SIZE && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={data.total}
                onUpdate={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AuditLogTab;
