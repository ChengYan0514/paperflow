import type { AuthUser } from '@/services/auth';

export default function access(
  initialState: { currentUser?: AuthUser } | undefined,
) {
  const role = initialState?.currentUser?.role;
  const canSuperAdmin = role === 'SUPER_ADMIN';
  const canManageUsers = canSuperAdmin || role === 'ADMIN';
  const canDeletePapers = canManageUsers;

  return {
    canSuperAdmin,
    canManageUsers,
    canViewAuditLogs: canSuperAdmin,
    canViewRoles: canSuperAdmin,
    canWritePapers: Boolean(role),
    canDeletePapers,
    canRestorePapers: canDeletePapers,
    canRestorePaperVersions: canDeletePapers,
    canPurgePapers: canSuperAdmin,
    canSearchOpenAlexSources: Boolean(role),
  };
}
