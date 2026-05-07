import api from './client';

export interface UserLookup {
  id: number;
  email: string;
  username: string;
}

export async function lookupUsers(q: string): Promise<UserLookup[]> {
  const response = await api.get<UserLookup[]>('/users/lookup', { params: { q } });
  return response.data;
}
