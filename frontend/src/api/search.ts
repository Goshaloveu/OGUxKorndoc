import api from './client';
import type { SearchRequest, SearchResponse } from '../types';

export async function searchDocuments(request: SearchRequest): Promise<SearchResponse> {
  const response = await api.post<SearchResponse>('/search/', request);
  return response.data;
}

export async function getSuggestions(q: string): Promise<string[]> {
  if (q.length < 2) return [];
  const response = await api.get<string[]>('/search/suggest', { params: { q } });
  return response.data;
}
