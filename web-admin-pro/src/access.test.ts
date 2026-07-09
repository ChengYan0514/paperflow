import { describe, expect, it } from 'vitest';
import access from './access';

describe('access', () => {
  it('grants system management to super admins', () => {
    expect(access({ currentUser: { role: 'SUPER_ADMIN' } as any })).toMatchObject({
      canSuperAdmin: true,
      canManageUsers: true,
      canViewRoles: true,
    });
  });

  it('lets admins manage users but not roles', () => {
    expect(access({ currentUser: { role: 'ADMIN' } as any })).toMatchObject({
      canSuperAdmin: false,
      canManageUsers: true,
      canViewRoles: false,
    });
  });

  it('blocks regular users from system management', () => {
    expect(access({ currentUser: { role: 'USER' } as any })).toMatchObject({
      canSuperAdmin: false,
      canManageUsers: false,
      canViewRoles: false,
    });
  });
});
