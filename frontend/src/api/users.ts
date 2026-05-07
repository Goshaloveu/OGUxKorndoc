import api from './client';
import type { UserLookup } from '../types';

export async function lookupUsers(q: string): Promise<UserLookup[]> {
  const response = await api.get<UserLookup[]>('/users/lookup', { params: { q } });
  return response.data;
}
