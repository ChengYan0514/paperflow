import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.hoisted(() => vi.fn());
const originalApiBaseUrl = process.env.API_BASE_URL;
const originalViteApiBaseUrl = process.env.VITE_API_BASE_URL;

vi.mock('@umijs/max', () => ({
  request: requestMock,
}));

describe('auth service', () => {
  beforeEach(() => {
    vi.resetModules();
    requestMock.mockReset();
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/';
  });

  afterEach(() => {
    if (originalApiBaseUrl === undefined) {
      delete process.env.API_BASE_URL;
    } else {
      process.env.API_BASE_URL = originalApiBaseUrl;
    }

    if (originalViteApiBaseUrl === undefined) {
      delete process.env.VITE_API_BASE_URL;
    } else {
      process.env.VITE_API_BASE_URL = originalViteApiBaseUrl;
    }
  });

  it('exports API_BASE_URL for the Umi request runtime config', async () => {
    process.env.API_BASE_URL = 'http://localhost:8080';
    process.env.VITE_API_BASE_URL = 'http://localhost:5173';

    const { apiBaseUrl } = await import('./auth');

    expect(apiBaseUrl).toBe('http://localhost:8080');
  });

  it('does not read VITE_API_BASE_URL', async () => {
    delete process.env.API_BASE_URL;
    process.env.VITE_API_BASE_URL = 'http://localhost:5173';

    const { apiBaseUrl } = await import('./auth');

    expect(apiBaseUrl).toBe('');
  });

  it('loads the current user through Umi request', async () => {
    requestMock.mockResolvedValueOnce({
      id: 1,
      username: 'admin',
      displayName: 'Admin',
      role: 'SUPER_ADMIN',
    });

    const { getCurrentUser } = await import('./auth');

    await expect(getCurrentUser()).resolves.toMatchObject({
      username: 'admin',
      role: 'SUPER_ADMIN',
    });
    expect(requestMock).toHaveBeenCalledWith('/api/auth/me', {
      method: 'GET',
    });
  });

  it('fetches csrf before login when cookie is missing', async () => {
    requestMock
      .mockResolvedValueOnce({ token: 'csrf-from-response' })
      .mockResolvedValueOnce({
        id: 1,
        username: 'admin',
        displayName: 'Admin',
        role: 'SUPER_ADMIN',
      });

    const { login } = await import('./auth');

    await login({ username: 'admin', password: 'admin' });

    expect(requestMock).toHaveBeenNthCalledWith(1, '/api/auth/csrf', {
      method: 'GET',
    });
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-XSRF-TOKEN': 'csrf-from-response',
        }),
        data: {
          username: 'admin',
          password: 'admin',
        },
      }),
    );
  });

  it('sends the xsrf cookie on logout', async () => {
    document.cookie = 'XSRF-TOKEN=csrf-from-cookie; path=/';
    requestMock.mockResolvedValueOnce(undefined);

    const { logout } = await import('./auth');
    await logout();

    expect(requestMock).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-XSRF-TOKEN': 'csrf-from-cookie',
        }),
      }),
    );
  });

  it('changes the current user password with csrf', async () => {
    document.cookie = 'XSRF-TOKEN=csrf-from-cookie; path=/';
    requestMock.mockResolvedValueOnce(undefined);

    const { changePassword } = await import('./auth');
    await changePassword({
      oldPassword: 'admin',
      newPassword: 'new-password',
    });

    expect(requestMock).toHaveBeenCalledWith(
      '/api/auth/change-password',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-XSRF-TOKEN': 'csrf-from-cookie',
        }),
        data: {
          oldPassword: 'admin',
          newPassword: 'new-password',
        },
      }),
    );
  });
});
