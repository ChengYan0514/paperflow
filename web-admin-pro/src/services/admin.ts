import { request } from '@umijs/max';
import type { Page } from './business';
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

export type AdminAuditLog = {
  id: number;
  actorId?: number | null;
  actorUsername?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  result: 'SUCCESS' | 'FAILURE';
  requestId?: string | null;
  remoteAddr?: string | null;
  userAgent?: string | null;
  message?: string | null;
  createdAt: string;
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

function withDefaults(params?: URLSearchParams) {
  const next = new URLSearchParams(params);
  if (!next.has('page')) {
    next.set('page', '1');
  }
  if (!next.has('size')) {
    next.set('size', '10');
  }
  return next;
}

async function getJson<T>(path: string, params?: URLSearchParams) {
  const query = params?.toString();
  return request<T>(`${path}${query ? `?${query}` : ''}`, {
    method: 'GET',
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

export function listAdminAuditLogs(params?: URLSearchParams) {
  return getJson<Page<AdminAuditLog>>('/api/admin-audit-logs', withDefaults(params));
}
