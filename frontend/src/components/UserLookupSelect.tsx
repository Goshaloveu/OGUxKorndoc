import React, { useMemo, useState } from 'react';
import { Select, Text } from '@gravity-ui/uikit';
import { useQuery } from '@tanstack/react-query';
import { lookupUsers } from '../api/users';
import type { UserLookup } from '../types';

interface UserLookupSelectProps {
  value: UserLookup | null;
  onUpdate: (user: UserLookup | null) => void;
  placeholder?: string;
  disabled?: boolean;
  width?: number | 'auto' | 'max';
}

function formatUser(user: UserLookup): string {
  return `${user.username} (${user.email})`;
}

const UserLookupSelect: React.FC<UserLookupSelectProps> = ({
  value,
  onUpdate,
  placeholder = 'Email или username',
  disabled = false,
  width = 260,
}) => {
  const [filter, setFilter] = useState('');
  const normalizedFilter = filter.trim();

  const { data: users = [], isFetching } = useQuery({
    queryKey: ['users', 'lookup', normalizedFilter],
    queryFn: () => lookupUsers(normalizedFilter),
    enabled: normalizedFilter.length > 0,
  });

  const options = useMemo(() => {
    const byId = new Map<number, UserLookup>();
    if (value) {
      byId.set(value.id, value);
    }
    users.forEach((user) => byId.set(user.id, user));

    return Array.from(byId.values()).map((user) => ({
      value: String(user.id),
      content: formatUser(user),
      text: formatUser(user),
      data: user,
    }));
  }, [users, value]);

  return (
    <Select<UserLookup>
      value={value ? [String(value.id)] : []}
      onUpdate={(selected) => {
        const selectedId = Number(selected[0]);
        const selectedUser = options.find((option) => option.data.id === selectedId)?.data ?? null;
        onUpdate(selectedUser);
      }}
      options={options}
      renderOption={(option) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Text variant="body-1">{option.data?.username}</Text>
          <Text variant="caption-2" color="secondary">{option.data?.email}</Text>
        </div>
      )}
      renderSelectedOption={(option) => (
        <Text variant="body-1" ellipsis>{option.data ? formatUser(option.data) : option.value}</Text>
      )}
      renderEmptyOptions={({ filter: currentFilter }) => (
        <Text color="secondary">
          {currentFilter.trim() ? 'Пользователи не найдены' : 'Введите email или username'}
        </Text>
      )}
      filterable
      filter={filter}
      onFilterChange={setFilter}
      filterPlaceholder="Email или username"
      placeholder={placeholder}
      loading={isFetching}
      hasClear
      onBlur={() => {
        if (!value && filter) {
          setFilter('');
        }
      }}
      disabled={disabled}
      width={width}
      popupWidth={320}
    />
  );
};

export default UserLookupSelect;
