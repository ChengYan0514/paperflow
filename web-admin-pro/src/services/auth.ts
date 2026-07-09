import { request } from '@umijs/max';

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

export type AuthUser = {
  id: number;
  username: string;
  displayName?: string | null;
  role: AdminRole;
};

export type LoginParams = {
  username: string;
  password: string;
};

export type ChangePasswordParams = {
  oldPassword: string;
  newPassword: string;
};

export const apiBaseUrl = process.env.API_BASE_URL || '';
const xsrfCookieName = 'XSRF-TOKEN';

function readCookie(name: string) {
  const prefix = `${name}=`;
  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}

export async function csrfToken() {
  const token = readCookie(xsrfCookieName);
  if (token) {
    return decodeURIComponent(token);
  }

  const csrf = await request<{ token: string }>('/api/auth/csrf', {
    method: 'GET',
  });
  return csrf.token;
}

export async function getCurrentUser() {
  return request<AuthUser>('/api/auth/me', {
    method: 'GET',
  });
}

export async function login(params: LoginParams) {
  const token = await csrfToken();
  return request<AuthUser>('/api/auth/login', {
    method: 'POST',
    headers: {
      'X-XSRF-TOKEN': token,
    },
    data: params,
  });
}

export async function logout() {
  const token = await csrfToken();
  await request<void>('/api/auth/logout', {
    method: 'POST',
    headers: {
      'X-XSRF-TOKEN': token,
    },
  });
}

export async function changePassword(params: ChangePasswordParams) {
  const token = await csrfToken();
  await request<void>('/api/auth/change-password', {
    method: 'POST',
    headers: {
      'X-XSRF-TOKEN': token,
    },
    data: params,
  });
}
