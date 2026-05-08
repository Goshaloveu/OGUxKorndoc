import React from 'react';
import { Select, Text } from '@gravity-ui/uikit';
import { DatePicker } from '@gravity-ui/date-components';
import { dateTime } from '@gravity-ui/date-utils';
import type { DateTime } from '@gravity-ui/date-utils';
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

  const handleDateFrom = (value: DateTime | null) => {
    onChange({ ...filters, date_from: value ? value.format('YYYY-MM-DD') : undefined });
  };

  const handleDateTo = (value: DateTime | null) => {
    onChange({ ...filters, date_to: value ? value.format('YYYY-MM-DD') : undefined });
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
        <Text variant="caption-2" color="secondary">
          С даты
        </Text>
        <DatePicker
          size="s"
          format="DD.MM.YYYY"
          value={filters.date_from ? dateTime({ input: filters.date_from }) : null}
          onUpdate={handleDateFrom}
          hasClear
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
        <Text variant="caption-2" color="secondary">
          По дату
        </Text>
        <DatePicker
          size="s"
          format="DD.MM.YYYY"
          value={filters.date_to ? dateTime({ input: filters.date_to }) : null}
          onUpdate={handleDateTo}
          hasClear
        />
      </div>
    </div>
  );
};

export default SearchFilters;
