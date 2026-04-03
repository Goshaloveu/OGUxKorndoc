export interface User {
  id: number;
  email: string;
  username: string;
  role: 'admin' | 'user';
  is_active?: boolean;
  created_at?: string;
  last_login?: string | null;
}

export interface ApiError {
  detail: string;
}

// Documents
export interface Document {
  id: number;
  title: string;
  filename: string;
  file_type: string;
  file_size: number;
  folder_path: string;
  status: 'pending' | 'processing' | 'indexed' | 'error';
  error_message: string | null;
  uploaded_by: number;
  org_id: number | null;
  uploaded_at: string;
  updated_at: string;
  indexed_at: string | null;
  page_count: number | null;
  chunk_count: number | null;
  tags: string[];
  department: string | null;
}

export interface DocumentPermission {
  id: number;
  document_id: number;
  user_id: number | null;
  org_id: number | null;
  level: 'viewer' | 'editor' | 'owner';
  granted_by: number;
  granted_at: string;
}

// Search
export interface SearchFilters {
  file_type?: string;
  folder_path?: string;
  department?: string;
  org_id?: number;
  date_from?: string;
  date_to?: string;
}

export interface SearchRequest {
  query: string;
  limit?: number;
  filters?: SearchFilters;
}

export interface SearchResult {
  document_id: number;
  title: string;
  snippet_html: string;
  score: number;
  file_type: string;
  folder_path: string;
  uploaded_at: string;
  access_level: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query_time_ms: number;
}
