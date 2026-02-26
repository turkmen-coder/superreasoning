/**
 * Frontend RBAC hook — role-based permission checks.
 * Parallel to useFeatureAccess() (plan-based) from planGating.ts.
 *
 * Usage:
 *   const { canEdit, canDelete, canManageTeam } = useRoleAccess();
 *   {canDelete && <DeleteButton />}
 */

import { useAuth } from '../contexts/AuthContext';
import type { OrgRole, Permission } from '../types/rbac';
import { roleHasPermission, roleAtLeast, ROLE_HIERARCHY } from '../types/rbac';

export interface RoleAccess {
  /** Current user role (defaults to 'viewer' if unknown) */
  role: OrgRole;
  /** All authenticated users can view */
  canView: boolean;
  /** Editor+ can create/update */
  canEdit: boolean;
  /** Admin+ can delete */
  canDelete: boolean;
  /** Admin+ can manage team */
  canManageTeam: boolean;
  /** Owner only: billing, role changes */
  isOwner: boolean;
  /** Admin or owner */
  isAdmin: boolean;
  /** Check a specific permission */
  hasPermission: (permission: Permission) => boolean;
  /** Check if role is at least minRole */
  isAtLeast: (minRole: OrgRole) => boolean;
  /** Numeric role level (0=viewer, 3=owner) */
  level: number;
}

export function useRoleAccess(): RoleAccess {
  const { profile } = useAuth();
  const role = (profile?.role as OrgRole) || 'viewer';

  const hasPermission = (permission: Permission): boolean =>
    roleHasPermission(role, permission);

  const isAtLeast = (minRole: OrgRole): boolean =>
    roleAtLeast(role, minRole);

  return {
    role,
    canView: true,
    canEdit: isAtLeast('editor'),
    canDelete: isAtLeast('admin'),
    canManageTeam: isAtLeast('admin'),
    isOwner: role === 'owner',
    isAdmin: isAtLeast('admin'),
    hasPermission,
    isAtLeast,
    level: ROLE_HIERARCHY[role],
  };
}
