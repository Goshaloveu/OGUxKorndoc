import React from 'react';
import { Select, Text } from '@gravity-ui/uikit';
import { useQuery } from '@tanstack/react-query';
import { lookupOrganizations } from '../api/organizations';
import type { OrganizationLookup } from '../api/organizations';
import { lookupUsers } from '../api/users';
import type { UserLookup } from '../types';

interface UserLookupSelectProps {
  value: UserLookup | null;
  onUpdate: (user: UserLookup | null) => void;
  placeholder?: string;
}

interface OrganizationLookupSelectProps {
  value: OrganizationLookup | null;
  onUpdate: (organization: OrganizationLookup | null) => void;
  placeholder?: string;
}

function uniqueUsers(items: UserLookup[], selected: UserLookup | null): UserLookup[] {
  const byId = new Map<number, UserLookup>();
  if (selected) {
    byId.set(selected.id, selected);
  }
  items.forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values());
}

function uniqueOrganizations(
  items: OrganizationLookup[],
  selected: OrganizationLookup | null,
): OrganizationLookup[] {
  const byId = new Map<number, OrganizationLookup>();
  if (selected) {
    byId.set(selected.id, selected);
  }
  items.forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values());
}

export const UserLookupSelect: React.FC<UserLookupSelectProps> = ({
  value,
  onUpdate,
  placeholder = 'Email или username',
}) => {
  const [filter, setFilter] = React.useState('');
  const query = filter.trim();
  const { data = [], isFetching } = useQuery({
    queryKey: ['users', 'lookup', query],
    queryFn: () => lookupUsers(query),
    enabled: query.length > 0,
    staleTime: 30_000,
  });

  const users = uniqueUsers(data, value);
  const options = users.map((user) => ({
    value: String(user.id),
    text: `${user.username} ${user.email}`,
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Text variant="body-1">{user.username}</Text>
        <Text variant="caption-2" color="secondary">
          {user.email}
        </Text>
      </div>
    ),
    data: user,
  }));

  return (
    <Select
      value={value ? [String(value.id)] : []}
      onUpdate={(nextValue) => {
        const id = nextValue[0];
        const selected = users.find((user) => String(user.id) === id) ?? null;
        onUpdate(selected);
      }}
      options={options}
      filterable
      filter={filter}
      onFilterChange={setFilter}
      filterPlaceholder="Введите email или username"
      placeholder={placeholder}
      renderEmptyOptions={() => (
        <Text color="secondary">{query ? 'Пользователи не найдены' : 'Начните ввод для поиска'}</Text>
      )}
      loading={isFetching}
      hasClear
      width="max"
      size="m"
    />
  );
};

export const OrganizationLookupSelect: React.FC<OrganizationLookupSelectProps> = ({
  value,
  onUpdate,
  placeholder = 'Slug или название',
}) => {
  const [filter, setFilter] = React.useState('');
  const query = filter.trim();
  const { data = [], isFetching } = useQuery({
    queryKey: ['organizations', 'lookup', query],
    queryFn: () => lookupOrganizations(query),
    enabled: query.length > 0,
    staleTime: 30_000,
  });

  const organizations = uniqueOrganizations(data, value);
  const options = organizations.map((organization) => ({
    value: String(organization.id),
    text: `${organization.name} ${organization.slug}`,
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Text variant="body-1">{organization.name}</Text>
        <Text variant="caption-2" color="secondary">
          {organization.slug}
        </Text>
      </div>
    ),
    data: organization,
  }));

  return (
    <Select
      value={value ? [String(value.id)] : []}
      onUpdate={(nextValue) => {
        const id = nextValue[0];
        const selected =
          organizations.find((organization) => String(organization.id) === id) ?? null;
        onUpdate(selected);
      }}
      options={options}
      filterable
      filter={filter}
      onFilterChange={setFilter}
      filterPlaceholder="Введите slug или название"
      placeholder={placeholder}
      renderEmptyOptions={() => (
        <Text color="secondary">{query ? 'Организации не найдены' : 'Начните ввод для поиска'}</Text>
      )}
      loading={isFetching}
      hasClear
      width="max"
      size="m"
    />
  );
};
