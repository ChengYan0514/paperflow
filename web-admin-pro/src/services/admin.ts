import { request } from '@umijs/max';
import type { AdminRole } from './auth';
import { csrfToken } from './auth';

export type AdminUser = {
  id: number;
  username: string;
  displayName?: string | null;
  role: AdminRole;
  enabled: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminRoleInfo = {
  role: AdminRole;
  description: string;
};

export type CreateAdminUserParams = {
  username: string;
  password: string;
  displayName?: string | null;
  role: AdminRole;
  enabled?: boolean;
};

export type UpdateAdminUserParams = {
  displayName?: string | null;
  role?: AdminRole;
  enabled?: boolean;
};

async function writeJson<T>(
  path: string,
  method: 'POST' | 'PATCH',
  body?: unknown,
) {
  const token = await csrfToken();
  return request<T>(path, {
    method,
    headers: {
      'X-XSRF-TOKEN': token,
    },
    data: body,
  });
}

export async function listAdminUsers() {
  return request<AdminUser[]>('/api/admin-users', {
    method: 'GET',
  });
}

export function createAdminUser(params: CreateAdminUserParams) {
  return writeJson<AdminUser>('/api/admin-users', 'POST', params);
}

export function updateAdminUser(id: number, params: UpdateAdminUserParams) {
  return writeJson<AdminUser>(`/api/admin-users/${id}`, 'PATCH', params);
}

export function resetAdminUserPassword(id: number, newPassword: string) {
  return writeJson<void>(`/api/admin-users/${id}/reset-password`, 'POST', {
    newPassword,
  });
}

export async function listAdminRoles() {
  return request<AdminRoleInfo[]>('/api/admin-roles', {
    method: 'GET',
  });
}
