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
  user_id: number;
  username: string;
  email: string;
  role: 'owner' | 'member';
  joined_at: string;
}

export interface OrganizationDetail {
  id: number;
  name: string;
  slug: string;
  created_by: number;
  created_at: string;
  members: OrganizationMember[];
}

export interface CreateOrganizationParams {
  name: string;
}

export interface AddMemberParams {
  user_id: number;
  role: 'owner' | 'member';
}

export async function getMyOrganizations(): Promise<Organization[]> {
  const response = await api.get<Organization[]>('/organizations/');
  return response.data;
}

export async function createOrganization(params: CreateOrganizationParams): Promise<Organization> {
  const response = await api.post<Organization>('/organizations/', params);
  return response.data;
}

export async function getOrganization(orgId: number): Promise<OrganizationDetail> {
  const response = await api.get<OrganizationDetail>(`/organizations/${orgId}`);
  return response.data;
}

export async function addOrgMember(orgId: number, params: AddMemberParams): Promise<OrganizationMember> {
  const response = await api.post<OrganizationMember>(`/organizations/${orgId}/members`, params);
  return response.data;
}

export async function removeOrgMember(orgId: number, userId: number): Promise<void> {
  await api.delete(`/organizations/${orgId}/members/${userId}`);
}
