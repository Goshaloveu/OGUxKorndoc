import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import type { User } from '../types';

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['me'],
    queryFn: async () => {
      const response = await api.get<User>('/auth/me');
      return response.data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: !!localStorage.getItem('access_token'),
  });

  const logout = () => {
    localStorage.removeItem('access_token');
    queryClient.clear();
    window.location.href = '/login';
  };

  return { user, isLoading, logout };
}
