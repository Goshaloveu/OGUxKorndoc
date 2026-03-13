import React, { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Button,
  TextInput,
  Alert,
  Skeleton,
  Text,
} from '@gravity-ui/uikit';
import { Magnifier } from '@gravity-ui/icons';
import { searchDocuments } from '../api/search';
import SearchResultCard from '../components/SearchResultCard';
import SearchFilters from '../components/SearchFilters';
import type { SearchFilters as SearchFiltersType, SearchResponse } from '../types';

const DEFAULT_FILTERS: SearchFiltersType = {};

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filters, setFilters] = useState<SearchFiltersType>(DEFAULT_FILTERS);
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

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Text variant="header-1">Поиск документов</Text>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <TextInput
          size="l"
          placeholder="Введите текст или отрывок из документа..."
          value={query}
          onUpdate={setQuery}
          onKeyDown={handleKeyDown}
          startContent={<Magnifier width={18} height={18} />}
          style={{ flex: 1 }}
          disabled={mutation.isPending}
        />
        <Button
          view="action"
          size="l"
          loading={mutation.isPending}
          onClick={handleSearch}
          disabled={!query.trim()}
        >
          Найти
        </Button>
        <Button
          view="outlined"
          size="l"
          onClick={() => setFiltersVisible((v) => !v)}
        >
          Фильтры {filtersVisible ? '▲' : '▼'}
        </Button>
      </div>

      {/* Filters panel */}
      {filtersVisible && (
        <SearchFilters filters={filters} onChange={setFilters} />
      )}

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
