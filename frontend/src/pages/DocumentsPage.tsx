import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Pagination, Text, Select } from '@gravity-ui/uikit';
import { ListUl, LayoutCellsLarge, LayoutCells } from '@gravity-ui/icons';
import { getDocuments } from '../api/documents';
import { useAuth } from '../hooks/useAuth';
import DocumentTable from '../components/DocumentTable';
import DocumentGrid from '../components/DocumentGrid';
import { useTranslation } from '../i18n';

type SortKey = 'title' | 'uploaded_at' | 'file_size';
type SortDir = 'asc' | 'desc';
type ViewMode = 'list' | 'grid-large' | 'grid-small';

const VIEW_MODE_KEY = 'docs-view-mode';

const PAGE_SIZE = 20;

function loadViewMode(): ViewMode {
  const saved = localStorage.getItem(VIEW_MODE_KEY);
  if (saved === 'list' || saved === 'grid-large' || saved === 'grid-small') return saved;
  return 'list';
}

const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const t = useTranslation('documentsPage');
  const tApp = useTranslation('app');
  const isAdmin = user?.role === 'admin';

  const [page, setPage] = useState(1);
  const [searchFilter, setSearchFilter] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('uploaded_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>(loadViewMode);

  const handleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

  const handleSearchChange = (value: string) => {
    setSearchFilter(value);
    setPage(1);
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['documents', page, fileTypeFilter, statusFilter],
    queryFn: () =>
      getDocuments({
        page,
        limit: PAGE_SIZE,
        status: statusFilter || undefined,
        file_type: fileTypeFilter || undefined,
      }),
  });

  const fileTypeOptions = [
    { value: '', content: tApp('allTypes') },
    { value: 'pdf', content: 'PDF' },
    { value: 'docx', content: 'DOCX' },
    { value: 'xlsx', content: 'XLSX' },
    { value: 'txt', content: 'TXT' },
  ];
  const statusOptions = [
    { value: '', content: tApp('allStatuses') },
    { value: 'pending', content: tApp('pending') },
    { value: 'processing', content: tApp('processing') },
    { value: 'indexed', content: tApp('indexed') },
    { value: 'error', content: tApp('error') },
  ];

  // Build unique owner options from all loaded documents
  const ownerOptions = React.useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    const opts: { value: string; content: string }[] = [];
    for (const doc of data.items) {
      const name = doc.uploaded_by_username ?? String(doc.uploaded_by);
      if (!seen.has(name)) {
        seen.add(name);
        const isMe = doc.uploaded_by === user?.id;
        opts.push({ value: name, content: isMe ? t('ownerMe', { name }) : name });
      }
    }
    return opts;
  }, [data, user?.id, t]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Client-side sort + filter
  const filteredAndSorted = React.useMemo(() => {
    if (!data) return [];
    let items = [...data.items];

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      items = items.filter(
        (doc) =>
          doc.title.toLowerCase().includes(q) || doc.filename.toLowerCase().includes(q),
      );
    }

    if (ownerFilter.length > 0) {
      items = items.filter((doc) => {
        const name = doc.uploaded_by_username ?? String(doc.uploaded_by);
        return ownerFilter.includes(name);
      });
    }

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
  }, [data, searchFilter, ownerFilter, sortKey, sortDir]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <Text variant="header-1">{t('title')}</Text>

      {/* Filters + view switcher row */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ minWidth: 160 }}>
          <Select
            value={fileTypeFilter ? [fileTypeFilter] : ['']}
            onUpdate={(val) => setFileTypeFilter(val[0] === '' ? '' : val[0])}
            options={fileTypeOptions}
            placeholder={t('fileTypePlaceholder')}
            width="max"
          />
        </div>
        <div style={{ minWidth: 180 }}>
          <Select
            value={statusFilter ? [statusFilter] : ['']}
            onUpdate={(val) => setStatusFilter(val[0] === '' ? '' : val[0])}
            options={statusOptions}
            placeholder={t('statusPlaceholder')}
            width="max"
          />
        </div>
        <div style={{ minWidth: 200 }}>
          <Select
            value={ownerFilter}
            onUpdate={(val) => { setOwnerFilter(val); setPage(1); }}
            options={ownerOptions}
            placeholder={t('ownerPlaceholder')}
            multiple
            hasClear
            width="max"
            disabled={ownerOptions.length === 0}
          />
        </div>

        {data && (
          <Text variant="caption-2" color="secondary">
            {ownerFilter.length > 0
              ? t('shown', { shown: filteredAndSorted.length, total: data.total })
              : t('total', { total: data.total })}
          </Text>
        )}

        {/* View mode switcher */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem' }}>
          <Button
            view={viewMode === 'list' ? 'action' : 'outlined'}
            size="m"
            title={t('list')}
            onClick={() => handleViewMode('list')}
          >
            <ListUl width={16} height={16} />
          </Button>
          <Button
            view={viewMode === 'grid-large' ? 'action' : 'outlined'}
            size="m"
            title={t('gridLarge')}
            onClick={() => handleViewMode('grid-large')}
          >
            <LayoutCellsLarge width={16} height={16} />
          </Button>
          <Button
            view={viewMode === 'grid-small' ? 'action' : 'outlined'}
            size="m"
            title={t('gridSmall')}
            onClick={() => handleViewMode('grid-small')}
          >
            <LayoutCells width={16} height={16} />
          </Button>
        </div>
      </div>

      {isError && (
        <Alert theme="danger" title={t('loadErrorTitle')} message={t('loadErrorMessage')} />
      )}

      {viewMode === 'list' ? (
        <DocumentTable
          items={filteredAndSorted}
          total={data?.total ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          isAdmin={isAdmin}
          currentUserId={user?.id}
          isLoading={isLoading}
          sortKey={sortKey}
          sortDir={sortDir}
          onPageChange={setPage}
          onSearchChange={handleSearchChange}
          onSort={handleSort}
        />
      ) : (
        <>
          <DocumentGrid
            items={filteredAndSorted}
            isAdmin={isAdmin}
            isLoading={isLoading}
            size={viewMode === 'grid-large' ? 'large' : 'small'}
          />
          {data && data.total > PAGE_SIZE && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={data.total}
                onUpdate={(newPage) => setPage(newPage)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DocumentsPage;
