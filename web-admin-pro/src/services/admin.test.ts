import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@umijs/max', () => ({
  request: requestMock,
}));

describe('admin service', () => {
  beforeEach(() => {
    vi.resetModules();
    requestMock.mockReset();
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists admin users', async () => {
    requestMock.mockResolvedValueOnce([]);

    const { listAdminUsers } = await import('./admin');

    await expect(listAdminUsers()).resolves.toEqual([]);

    expect(requestMock).toHaveBeenCalledWith('/api/admin-users', {
      method: 'GET',
    });
  });

  it('creates admin users with csrf', async () => {
    requestMock
      .mockResolvedValueOnce({ token: 'csrf-token' })
      .mockResolvedValueOnce({ id: 2, username: 'new_user', role: 'USER' });

    const { createAdminUser } = await import('./admin');

    await createAdminUser({
      username: 'new_user',
      displayName: 'New User',
      role: 'USER',
      password: 'admin',
      enabled: true,
    });

    expect(requestMock).toHaveBeenNthCalledWith(1, '/api/auth/csrf', {
      method: 'GET',
    });
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      '/api/admin-users',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-XSRF-TOKEN': 'csrf-token' }),
        data: {
          username: 'new_user',
          displayName: 'New User',
          role: 'USER',
          password: 'admin',
          enabled: true,
        },
      }),
    );
  });

  it('updates admin users', async () => {
    document.cookie = 'XSRF-TOKEN=cookie-token; path=/';
    requestMock.mockResolvedValueOnce({ id: 2, username: 'reader', role: 'USER' });

    const { updateAdminUser } = await import('./admin');

    await updateAdminUser(2, { role: 'USER', enabled: false });

    expect(requestMock).toHaveBeenCalledWith(
      '/api/admin-users/2',
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({ 'X-XSRF-TOKEN': 'cookie-token' }),
        data: { role: 'USER', enabled: false },
      }),
    );
  });

  it('resets admin user passwords', async () => {
    document.cookie = 'XSRF-TOKEN=cookie-token; path=/';
    requestMock.mockResolvedValueOnce(undefined);

    const { resetAdminUserPassword } = await import('./admin');

    await resetAdminUserPassword(2, 'admin');

    expect(requestMock).toHaveBeenCalledWith(
      '/api/admin-users/2/reset-password',
      expect.objectContaining({
        method: 'POST',
        data: { newPassword: 'admin' },
      }),
    );
  });

  it('lists admin roles', async () => {
    requestMock.mockResolvedValueOnce([{ role: 'USER', description: '普通用户' }]);

    const { listAdminRoles } = await import('./admin');

    await expect(listAdminRoles()).resolves.toEqual([
      { role: 'USER', description: '普通用户' },
    ]);

    expect(requestMock).toHaveBeenCalledWith('/api/admin-roles', {
      method: 'GET',
    });
  });

  it('lists audit logs with defaults', async () => {
    requestMock.mockResolvedValueOnce({ items: [], page: 1, size: 10, total: 0 });

    const { listAdminAuditLogs } = await import('./admin');
    const params = new URLSearchParams('action=LOGIN');

    await listAdminAuditLogs(params);

    expect(requestMock).toHaveBeenCalledWith('/api/admin-audit-logs?action=LOGIN&page=1&size=10', {
      method: 'GET',
    });
  });
});
