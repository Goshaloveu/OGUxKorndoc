import React from 'react';
import { Select, TextInput, Text } from '@gravity-ui/uikit';
import type { SearchFilters as SearchFiltersType } from '../types';

interface SearchFiltersProps {
  filters: SearchFiltersType;
  onChange: (filters: SearchFiltersType) => void;
}

const FILE_TYPE_OPTIONS = [
  { value: '', content: 'Все типы' },
  { value: 'pdf', content: 'PDF' },
  { value: 'docx', content: 'DOCX' },
  { value: 'xlsx', content: 'XLSX' },
  { value: 'txt', content: 'TXT' },
];

const SearchFilters: React.FC<SearchFiltersProps> = ({ filters, onChange }) => {
  const handleFileType = (values: string[]) => {
    onChange({ ...filters, file_type: values[0] || undefined });
  };

  const handleDepartment = (value: string) => {
    onChange({ ...filters, department: value || undefined });
  };

  const handleDateFrom = (value: string) => {
    onChange({ ...filters, date_from: value || undefined });
  };

  const handleDateTo = (value: string) => {
    onChange({ ...filters, date_to: value || undefined });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        alignItems: 'center',
        padding: '0.75rem',
        background: 'var(--g-color-base-float)',
        borderRadius: 8,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
        <Text variant="caption-2" color="secondary">
          Тип файла
        </Text>
        <Select
          size="s"
          value={filters.file_type ? [filters.file_type] : ['']}
          onUpdate={handleFileType}
          options={FILE_TYPE_OPTIONS}
          width={140}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
        <Text variant="caption-2" color="secondary">
          Отдел
        </Text>
        <TextInput
          size="s"
          placeholder="Все отделы"
          value={filters.department ?? ''}
          onUpdate={handleDepartment}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
        <Text variant="caption-2" color="secondary">
          С даты
        </Text>
        <input
          type="date"
          value={filters.date_from ?? ''}
          onChange={(e) => handleDateFrom(e.target.value)}
          style={{
            height: 28,
            padding: '0 8px',
            borderRadius: 4,
            border: '1px solid var(--g-color-line-generic)',
            background: 'var(--g-color-base-background)',
            color: 'var(--g-color-text-primary)',
            fontSize: 13,
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
        <Text variant="caption-2" color="secondary">
          По дату
        </Text>
        <input
          type="date"
          value={filters.date_to ?? ''}
          onChange={(e) => handleDateTo(e.target.value)}
          style={{
            height: 28,
            padding: '0 8px',
            borderRadius: 4,
            border: '1px solid var(--g-color-line-generic)',
            background: 'var(--g-color-base-background)',
            color: 'var(--g-color-text-primary)',
            fontSize: 13,
          }}
        />
      </div>
    </div>
  );
};

export default SearchFilters;
