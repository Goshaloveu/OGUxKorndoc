import api from './client';

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface AdminUser {
  id: number;
  email: string;
  username: string;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  last_login: string | null;
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

export async function getAdminUsers(params?: {
  page?: number;
  limit?: number;
}): Promise<AdminUserListResponse> {
  const response = await api.get<AdminUserListResponse>('/admin/users', { params });
  return response.data;
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

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface AdminStats {
  total_docs: number;
  indexed_docs: number;
  pending_docs: number;
  processing_docs: number;
  error_docs: number;
  total_users: number;
  active_users: number;
  total_orgs: number;
  searches_today: number;
  uploads_today: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const response = await api.get<AdminStats>('/admin/stats');
  return response.data;
}

// ---------------------------------------------------------------------------
// Audit logs
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export interface ServiceHealth {
  status: string;
  error: string | null;
  response_ms: number | null;
}

export interface SystemHealth {
  postgres: ServiceHealth;
  qdrant: ServiceHealth;
  redis: ServiceHealth;
  minio: ServiceHealth;
  checked_at: string;
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const response = await api.get<SystemHealth>('/admin/system/health');
  return response.data;
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export interface AdminOrganization {
  id: number;
  name: string;
  slug: string;
  created_by: number;
  created_at: string;
  member_count: number;
  creator_username: string | null;
}

export interface AdminOrgListResponse {
  items: AdminOrganization[];
  total: number;
  page: number;
  limit: number;
}

export async function getAdminOrganizations(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<AdminOrgListResponse> {
  const response = await api.get<AdminOrgListResponse>('/admin/organizations', { params });
  return response.data;
}

export async function updateAdminOrganization(
  id: number,
  params: { name?: string },
): Promise<AdminOrganization> {
  const response = await api.patch<AdminOrganization>(`/admin/organizations/${id}`, params);
  return response.data;
}

export async function deleteAdminOrganization(id: number): Promise<void> {
  await api.delete(`/admin/organizations/${id}`);
}

// ---------------------------------------------------------------------------
// Documents (admin)
// ---------------------------------------------------------------------------

export interface AdminDocument {
  id: number;
  title: string;
  filename: string;
  file_type: string;
  file_size: number;
  folder_path: string;
  status: 'pending' | 'processing' | 'indexed' | 'error';
  error_message: string | null;
  uploaded_by: number;
  uploaded_by_username: string | null;
  org_id: number | null;
  org_name: string | null;
  uploaded_at: string;
  updated_at: string;
  indexed_at: string | null;
  page_count: number | null;
  chunk_count: number | null;
  tags: string[];
}

export interface AdminDocListResponse {
  items: AdminDocument[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminPermission {
  id: number;
  document_id: number;
  user_id: number | null;
  org_id: number | null;
  level: 'viewer' | 'editor' | 'owner';
  granted_by: number;
  granted_at: string;
  user_username: string | null;
  user_email: string | null;
  org_name: string | null;
  granted_by_username: string | null;
}

export async function getAdminDocuments(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  file_type?: string;
  org_id?: number;
}): Promise<AdminDocListResponse> {
  const response = await api.get<AdminDocListResponse>('/admin/documents', { params });
  return response.data;
}

export async function updateAdminDocument(
  id: number,
  params: { title?: string; tags?: string[]; folder_path?: string },
): Promise<AdminDocument> {
  const response = await api.patch<AdminDocument>(`/admin/documents/${id}`, params);
  return response.data;
}

export async function deleteAdminDocument(id: number): Promise<void> {
  await api.delete(`/admin/documents/${id}`);
}

export async function reindexDocument(id: number): Promise<void> {
  await api.post(`/admin/reindex/${id}`);
}

export async function getAdminDocPermissions(docId: number): Promise<AdminPermission[]> {
  const response = await api.get<AdminPermission[]>(`/admin/documents/${docId}/permissions`);
  return response.data;
}

export async function addAdminDocPermission(
  docId: number,
  params: { user_id?: number; org_id?: number; level: string },
): Promise<AdminPermission> {
  const response = await api.post<AdminPermission>(
    `/admin/documents/${docId}/permissions`,
    params,
  );
  return response.data;
}

export async function removeAdminDocPermission(docId: number, permId: number): Promise<void> {
  await api.delete(`/admin/documents/${docId}/permissions/${permId}`);
}
