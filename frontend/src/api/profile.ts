import api from './client';
import type { Document } from '../types';

export interface UserProfile {
  id: number;
  email: string;
  username: string;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export interface RecentUpload {
  id: number;
  title: string;
  status: string;
  uploaded_at: string;
}

export interface RecentSearch {
  query: string;
  created_at: string;
}

export interface ProfileResponse {
  user: UserProfile;
  my_documents_count: number;
  recent_uploads: RecentUpload[];
  recent_searches: RecentSearch[];
}

export interface DocumentListResponse {
  items: Document[];
  total: number;
  page: number;
  limit: number;
}

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export async function getProfile(): Promise<ProfileResponse> {
  const response = await api.get<ProfileResponse>('/profile/');
  return response.data;
}

export async function getMyDocuments(page = 1, limit = 20): Promise<DocumentListResponse> {
  const response = await api.get<DocumentListResponse>('/profile/documents', {
    params: { page, limit },
  });
  return response.data;
}

export async function updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
  const response = await api.patch<UserProfile>('/profile/', data);
  return response.data;
}

export async function changePassword(data: ChangePasswordRequest): Promise<void> {
  await api.post('/profile/change-password', data);
}
