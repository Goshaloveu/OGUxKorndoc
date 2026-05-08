import api from './client';
import type { Document, DocumentPermission } from '../types';

export interface DocumentStatus {
  id: number;
  status: 'pending' | 'processing' | 'indexed' | 'error';
  error_message: string | null;
  chunk_count: number | null;
}

export interface DocumentListResponse {
  items: Document[];
  total: number;
  page: number;
  limit: number;
}

export interface UploadDocumentParams {
  file: File;
  title?: string;
  folder_path?: string;
  tags?: string[];
  org_id?: number;
  onUploadProgress?: (percent: number) => void;
}

export async function uploadDocument(params: UploadDocumentParams): Promise<Document> {
  const formData = new FormData();
  formData.append('file', params.file);
  if (params.title) formData.append('title', params.title);
  if (params.folder_path) formData.append('folder_path', params.folder_path);
  if (params.tags && params.tags.length > 0) {
    formData.append('tags', JSON.stringify(params.tags));
  }
  if (params.org_id !== undefined) formData.append('org_id', String(params.org_id));

  const response = await api.post<Document>('/documents/upload', formData, {
    onUploadProgress: (event) => {
      if (event.total && event.total > 0) {
        const percent = Math.round((event.loaded / event.total) * 100);
        params.onUploadProgress?.(percent);
      }
    },
  });
  return response.data;
}

export async function getDocumentStatus(id: number): Promise<DocumentStatus> {
  const response = await api.get<DocumentStatus>(`/documents/${id}/status`);
  return response.data;
}

export async function getDocuments(params?: {
  page?: number;
  limit?: number;
  status?: string;
  file_type?: string;
}): Promise<DocumentListResponse> {
  const response = await api.get<DocumentListResponse>('/documents/', { params });
  return response.data;
}

export interface UpdateDocumentParams {
  title?: string;
  tags?: string[];
  folder_path?: string;
}

export async function updateDocument(id: number, params: UpdateDocumentParams): Promise<Document> {
  const response = await api.patch<Document>(`/documents/${id}`, params);
  return response.data;
}

export async function deleteDocument(id: number): Promise<void> {
  await api.delete(`/documents/${id}`);
}

export async function getPresignedUrl(id: number): Promise<string> {
  const response = await api.get<{ url: string; expires_in: number }>(
    `/documents/${id}/presigned-url`,
  );
  return response.data.url;
}

export interface DocumentPreview {
  text: string;
  page_count: number;
}

export async function getDocumentPreview(id: number): Promise<DocumentPreview> {
  const response = await api.get<DocumentPreview>(`/documents/${id}/preview`);
  return response.data;
}

export interface AddPermissionParams {
  user_id?: number;
  org_id?: number;
  level: 'viewer' | 'editor' | 'owner';
}

export async function getDocumentPermissions(id: number): Promise<DocumentPermission[]> {
  const response = await api.get<DocumentPermission[]>(`/documents/${id}/permissions`);
  return response.data;
}

export async function addDocumentPermission(
  id: number,
  params: AddPermissionParams,
): Promise<DocumentPermission> {
  const response = await api.post<DocumentPermission>(`/documents/${id}/permissions`, params);
  return response.data;
}

export async function removeDocumentPermission(id: number, permId: number): Promise<void> {
  await api.delete(`/documents/${id}/permissions/${permId}`);
}
