import React, { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Button,
  TextInput,
  Alert,
  Skeleton,
  Text,
  Select,
} from '@gravity-ui/uikit';
import { DatePicker } from '@gravity-ui/date-components';
import { dateTime } from '@gravity-ui/date-utils';
import type { DateTime } from '@gravity-ui/date-utils';
import { Magnifier, Xmark } from '@gravity-ui/icons';
import { searchDocuments } from '../api/search';
import SearchResultCard from '../components/SearchResultCard';
import type { SearchFilters, SearchResponse } from '../types';

const FILE_TYPE_OPTIONS = [
  { value: '', content: 'Все типы' },
  { value: 'pdf', content: 'PDF' },
  { value: 'docx', content: 'DOCX' },
  { value: 'xlsx', content: 'XLSX' },
  { value: 'txt', content: 'TXT' },
];

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [lastResponse, setLastResponse] = useState<SearchResponse | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      searchDocuments({
        query,
        limit: 10,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
      }),
    onSuccess: (data) => {
      setLastResponse(data);
    },
  });

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    mutation.mutate();
  }, [query, mutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== '');

  const clearFilters = () => {
    setFilters({});
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Text variant="header-1">Поиск документов</Text>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <TextInput
          size="xl"
          placeholder="Введите текст или отрывок из документа..."
          value={query}
          onUpdate={setQuery}
          onKeyDown={handleKeyDown}
          startContent={<Magnifier width={20} height={20} />}
          style={{ flex: 1 }}
          disabled={mutation.isPending}
        />
        <Button
          view="action"
          size="xl"
          loading={mutation.isPending}
          onClick={handleSearch}
          disabled={!query.trim()}
        >
          Найти
        </Button>
      </div>

      {/* Inline filters */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'flex-end',
          padding: '0.75rem',
          background: 'var(--g-color-base-float)',
          borderRadius: 8,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 130 }}>
          <Text variant="caption-2" color="secondary">Тип файла</Text>
          <Select
            size="s"
            value={filters.file_type ? [filters.file_type] : ['']}
            onUpdate={(v) => setFilters({ ...filters, file_type: v[0] || undefined })}
            options={FILE_TYPE_OPTIONS}
            width={130}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
          <Text variant="caption-2" color="secondary">С даты</Text>
          <DatePicker
            size="s"
            format="DD.MM.YYYY"
            value={filters.date_from ? dateTime({ input: filters.date_from }) : null}
            onUpdate={(v: DateTime | null) =>
              setFilters({ ...filters, date_from: v ? v.format('YYYY-MM-DD') : undefined })
            }
            hasClear
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
          <Text variant="caption-2" color="secondary">По дату</Text>
          <DatePicker
            size="s"
            format="DD.MM.YYYY"
            value={filters.date_to ? dateTime({ input: filters.date_to }) : null}
            onUpdate={(v: DateTime | null) =>
              setFilters({ ...filters, date_to: v ? v.format('YYYY-MM-DD') : undefined })
            }
            hasClear
          />
        </div>

        {hasFilters && (
          <Button view="flat" size="s" onClick={clearFilters}>
            <Xmark width={14} height={14} />
            Сбросить
          </Button>
        )}
      </div>

      {/* Error state */}
      {mutation.isError && (
        <Alert theme="danger" message="Ошибка выполнения поиска. Попробуйте снова." />
      )}

      {/* Loading skeletons */}
      {mutation.isPending && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} style={{ height: 100, borderRadius: 8 }} />
          ))}
        </div>
      )}

      {/* Results */}
      {!mutation.isPending && lastResponse !== null && (
        <>
          <Text variant="body-2" color="secondary">
            Найдено: {lastResponse.total} документов ({lastResponse.query_time_ms} мс)
          </Text>

          {lastResponse.results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <Text variant="body-1" color="secondary">
                Ничего не найдено. Попробуйте изменить запрос или фильтры.
              </Text>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {lastResponse.results.map((result) => (
                <SearchResultCard key={result.document_id} result={result} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SearchPage;
