import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton, Alert, Text, Select } from '@gravity-ui/uikit';
import { getDocuments } from '../api/documents';
import { useAuth } from '../hooks/useAuth';
import DocumentTable from '../components/DocumentTable';

type SortKey = 'title' | 'uploaded_at' | 'file_size';
type SortDir = 'asc' | 'desc';

const FILE_TYPE_OPTIONS = [
  { value: '', content: 'Все типы' },
  { value: 'pdf', content: 'PDF' },
  { value: 'docx', content: 'DOCX' },
  { value: 'xlsx', content: 'XLSX' },
  { value: 'txt', content: 'TXT' },
];

const STATUS_OPTIONS = [
  { value: '', content: 'Все статусы' },
  { value: 'pending', content: 'В очереди' },
  { value: 'processing', content: 'Обработка' },
  { value: 'indexed', content: 'Индексирован' },
  { value: 'error', content: 'Ошибка' },
];

const PAGE_SIZE = 20;

const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('uploaded_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Debounce search input
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [fileTypeFilter, statusFilter, sortKey, sortDir]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['documents', page, debouncedSearch, fileTypeFilter, statusFilter, sortKey, sortDir],
    queryFn: () =>
      getDocuments({
        page,
        limit: PAGE_SIZE,
        status: statusFilter || undefined,
        file_type: fileTypeFilter || undefined,
      }),
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Client-side sort + filter (since API may not support all params)
  const filteredAndSorted = React.useMemo(() => {
    if (!data) return [];
    let items = [...data.items];

    // Filter by search query
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      items = items.filter(
        (doc) =>
          doc.title.toLowerCase().includes(q) || doc.filename.toLowerCase().includes(q),
      );
    }

    // Sort
    items.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'title') {
        cmp = a.title.localeCompare(b.title, 'ru');
      } else if (sortKey === 'uploaded_at') {
        cmp = new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
      } else if (sortKey === 'file_size') {
        cmp = a.file_size - b.file_size;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return items;
  }, [data, debouncedSearch, sortKey, sortDir]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <Text variant="header-1">Документы</Text>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ minWidth: 160 }}>
          <Select
            value={fileTypeFilter ? [fileTypeFilter] : ['']}
            onUpdate={(val) => setFileTypeFilter(val[0] === '' ? '' : val[0])}
            options={FILE_TYPE_OPTIONS}
            placeholder="Тип файла"
            width="max"
          />
        </div>
        <div style={{ minWidth: 180 }}>
          <Select
            value={statusFilter ? [statusFilter] : ['']}
            onUpdate={(val) => setStatusFilter(val[0] === '' ? '' : val[0])}
            options={STATUS_OPTIONS}
            placeholder="Статус"
            width="max"
          />
        </div>
        {data && (
          <Text variant="caption-2" color="secondary" style={{ marginLeft: 'auto' }}>
            Всего: {data.total}
          </Text>
        )}
      </div>

      {/* Content */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 42 }} />
          ))}
        </div>
      )}

      {isError && (
        <Alert theme="danger" title="Ошибка загрузки" message="Не удалось загрузить список документов" />
      )}

      {!isLoading && !isError && (
        <DocumentTable
          items={filteredAndSorted}
          total={data?.total ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          isAdmin={isAdmin}
          searchQuery={searchQuery}
          sortKey={sortKey}
          sortDir={sortDir}
          onPageChange={setPage}
          onSearchChange={setSearchQuery}
          onSort={handleSort}
        />
      )}
    </div>
  );
};

export default DocumentsPage;
