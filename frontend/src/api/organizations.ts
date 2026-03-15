import api from './client';

export interface Organization {
  id: number;
  name: string;
  slug: string;
  created_by: number;
  created_at: string;
}

export interface OrganizationMember {
  id: number;
  org_id: number;
  user_id: number;
  role: 'owner' | 'member';
  joined_at: string;
}

export interface CreateOrganizationParams {
  name: string;
}

export async function getMyOrganizations(): Promise<Organization[]> {
  const response = await api.get<Organization[]>('/organizations/');
  return response.data;
}

export async function createOrganization(params: CreateOrganizationParams): Promise<Organization> {
  const response = await api.post<Organization>('/organizations/', params);
  return response.data;
}
