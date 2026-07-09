import type { AuthUser } from '@/services/auth';

export default function access(
  initialState: { currentUser?: AuthUser } | undefined,
) {
  const role = initialState?.currentUser?.role;
  const canSuperAdmin = role === 'SUPER_ADMIN';
  const canManageUsers = canSuperAdmin || role === 'ADMIN';

  return {
    canSuperAdmin,
    canManageUsers,
    canViewRoles: canSuperAdmin,
  };
}
