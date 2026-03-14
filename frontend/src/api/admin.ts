import api from './client';

export async function reindexDocument(id: number): Promise<void> {
  await api.post(`/admin/reindex/${id}`);
}

export interface AdminUser {
  id: number;
  email: string;
  username: string;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export interface AdminStats {
  total_docs: number;
  indexed_docs: number;
  error_docs: number;
  total_users: number;
  searches_today: number;
}

export interface AuditLogEntry {
  id: number;
  user_id: number;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogResponse {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface ServiceHealth {
  status: string;
  error: string | null;
}

export interface SystemHealth {
  postgres: ServiceHealth;
  qdrant: ServiceHealth;
  redis: ServiceHealth;
  minio: ServiceHealth;
}

export interface AdminUserListResponse {
  items: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateUserParams {
  email: string;
  username: string;
  password: string;
  role: 'admin' | 'user';
}

export interface UpdateUserParams {
  role?: 'admin' | 'user';
  is_active?: boolean;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const response = await api.get<AdminUserListResponse>('/admin/users');
  return response.data.items;
}

export async function createAdminUser(params: CreateUserParams): Promise<AdminUser> {
  const response = await api.post<AdminUser>('/admin/users', params);
  return response.data;
}

export async function updateAdminUser(id: number, params: UpdateUserParams): Promise<AdminUser> {
  const response = await api.patch<AdminUser>(`/admin/users/${id}`, params);
  return response.data;
}

export async function deleteAdminUser(id: number): Promise<void> {
  await api.delete(`/admin/users/${id}`);
}

export async function getAdminStats(): Promise<AdminStats> {
  const response = await api.get<AdminStats>('/admin/stats');
  return response.data;
}

export async function getAuditLogs(params?: {
  page?: number;
  limit?: number;
  user_id?: number;
  action?: string;
  date_from?: string;
  date_to?: string;
}): Promise<AuditLogResponse> {
  const response = await api.get<AuditLogResponse>('/admin/audit-logs', { params });
  return response.data;
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const response = await api.get<SystemHealth>('/admin/system/health');
  return response.data;
}
