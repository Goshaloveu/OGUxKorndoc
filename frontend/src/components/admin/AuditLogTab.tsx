import React, { useState } from 'react';
import { Button, Pagination, Select, Text, TextInput } from '@gravity-ui/uikit';
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
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            style={{ width: 140, height: 28, padding: '2px 8px', border: '1px solid #e0e0e0', borderRadius: 4, fontSize: 14 }}
          />
        </div>
        <div style={{ minWidth: 140 }}>
          <Text variant="caption-2" style={{ display: 'block', marginBottom: 4 }}>Дата до</Text>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            style={{ width: 140, height: 28, padding: '2px 8px', border: '1px solid #e0e0e0', borderRadius: 4, fontSize: 14 }}
          />
        </div>
        <Button view="normal" onClick={handleReset}>Сбросить</Button>
      </div>

      {isLoading && <Text color="secondary">Загрузка...</Text>}
      {isError && <Text color="danger">Ошибка загрузки журнала</Text>}

      {data && (
        <>
          <Text variant="caption-2" color="secondary">Всего записей: {data.total}</Text>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Время</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Пользователь</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Действие</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Тип ресурса</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>ID ресурса</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>IP</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Детали</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                      Записей не найдено
                    </td>
                  </tr>
                ) : (
                  data.items.map((entry: AuditLogEntry) => (
                    <tr
                      key={entry.id}
                      style={{ borderBottom: '1px solid #f0f0f0' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#fafafa'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <Text variant="body-1">{formatDatetime(entry.created_at)}</Text>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <Text variant="body-1">{entry.user_id}</Text>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <Text variant="body-1">{ACTION_LABELS[entry.action] ?? entry.action}</Text>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <Text variant="body-1" color="secondary">{entry.resource_type}</Text>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <Text variant="body-1" color="secondary">{entry.resource_id ?? '—'}</Text>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <Text variant="body-1" color="secondary">{entry.ip_address ?? '—'}</Text>
                      </td>
                      <td style={{ padding: '8px 12px', maxWidth: 200 }}>
                        <Text
                          variant="caption-2"
                          color="secondary"
                          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                          title={JSON.stringify(entry.details)}
                        >
                          {JSON.stringify(entry.details)}
                        </Text>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

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
