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
import { toaster } from '@gravity-ui/uikit/toaster-singleton';
import { DatePicker } from '@gravity-ui/date-components';
import { dateTime } from '@gravity-ui/date-utils';
import type { DateTime } from '@gravity-ui/date-utils';
import { Magnifier, Xmark } from '@gravity-ui/icons';
import { searchDocuments } from '../api/search';
import SearchResultCard from '../components/SearchResultCard';
import type { SearchFilters, SearchResponse } from '../types';
import { useTranslation } from '../i18n';

const SearchPage: React.FC = () => {
  const t = useTranslation('searchPage');
  const tApp = useTranslation('app');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [lastResponse, setLastResponse] = useState<SearchResponse | null>(null);

  const fileTypeOptions = [
    { value: '', content: tApp('allTypes') },
    { value: 'pdf', content: 'PDF' },
    { value: 'docx', content: 'DOCX' },
    { value: 'xlsx', content: 'XLSX' },
    { value: 'txt', content: 'TXT' },
  ];

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
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toaster.add({
        name: 'search-error',
        title: t('toastErrorTitle'),
        content: err.response?.data?.detail ?? t('toastErrorContent'),
        theme: 'danger',
        autoHiding: 4000,
      });
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
      <Text variant="header-1">{t('title')}</Text>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <TextInput
          size="xl"
          // view="clear"
          type="search"
          hasClear
          placeholder={t('placeholder')}
          value={query}
          onUpdate={setQuery}
          onKeyDown={handleKeyDown}
          startContent={
            <div style={{ marginLeft: 10, marginRight: 6, marginTop: 3 }}>
              <Magnifier width={20} height={20} />
            </div>
          }
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
          {t('submit')}
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
          <Text variant="caption-2" color="secondary">{t('fileType')}</Text>
          <Select
            size="m"
            value={filters.file_type ? [filters.file_type] : ['']}
            onUpdate={(v) => setFilters({ ...filters, file_type: v[0] || undefined })}
            options={fileTypeOptions}
            width={130}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
          <Text variant="caption-2" color="secondary">{t('dateFrom')}</Text>
          <DatePicker
            size="m"
            format="DD.MM.YYYY"
            value={filters.date_from ? dateTime({ input: filters.date_from }) : null}
            onUpdate={(v: DateTime | null) =>
              setFilters({ ...filters, date_from: v ? v.format('YYYY-MM-DD') : undefined })
            }
            hasClear
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
          <Text variant="caption-2" color="secondary">{t('dateTo')}</Text>
          <DatePicker
            size="m"
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
            {tApp('reset')}
          </Button>
        )}
      </div>

      {/* Error state */}
      {mutation.isError && (
        <Alert theme="danger" message={t('errorMessage')} />
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
            {t('results', { total: lastResponse.total, time: lastResponse.query_time_ms })}
          </Text>

          {lastResponse.results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <Text variant="body-1" color="secondary">
                {t('empty')}
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
