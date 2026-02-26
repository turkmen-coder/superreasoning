/**
 * RBAC (Role-Based Access Control) type definitions.
 *
 * 4 roles with hierarchical permissions:
 *   owner > admin > editor > viewer
 *
 * Permissions are grouped by resource (prompt, team, settings, etc.).
 */

// ── Roles ──────────────────────────────────────────────────────────────────────

export type OrgRole = 'owner' | 'admin' | 'editor' | 'viewer';

/** Numeric hierarchy: higher = more privileges */
export const ROLE_HIERARCHY: Record<OrgRole, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  owner: 3,
};

// ── Permissions ────────────────────────────────────────────────────────────────

export type Permission =
  // Prompt CRUD
  | 'prompt:read'
  | 'prompt:create'
  | 'prompt:update'
  | 'prompt:delete'
  // Version lifecycle
  | 'version:promote'
  | 'version:rollback'
  // Quality / CI-CD
  | 'regression:run'
  | 'contract:manage'
  // Team management
  | 'team:view'
  | 'team:invite'
  | 'team:remove'
  | 'team:change_role'
  // Settings / billing
  | 'settings:view'
  | 'settings:edit'
  | 'billing:manage'
  // Generate / use
  | 'generate:run'
  | 'enrichment:run'
  // Audit
  | 'audit:view'
  // Pack management
  | 'pack:create'
  | 'pack:delete';

// ── Role → Permission Map ──────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<OrgRole, readonly Permission[]> = {
  viewer: [
    'prompt:read',
    'generate:run',
    'settings:view',
    'team:view',
    'audit:view',
  ],

  editor: [
    'prompt:read',
    'prompt:create',
    'prompt:update',
    'generate:run',
    'enrichment:run',
    'regression:run',
    'settings:view',
    'team:view',
    'audit:view',
    'pack:create',
  ],

  admin: [
    'prompt:read',
    'prompt:create',
    'prompt:update',
    'prompt:delete',
    'version:promote',
    'version:rollback',
    'generate:run',
    'enrichment:run',
    'regression:run',
    'contract:manage',
    'settings:view',
    'settings:edit',
    'team:view',
    'team:invite',
    'team:remove',
    'audit:view',
    'pack:create',
    'pack:delete',
  ],

  owner: [
    'prompt:read',
    'prompt:create',
    'prompt:update',
    'prompt:delete',
    'version:promote',
    'version:rollback',
    'generate:run',
    'enrichment:run',
    'regression:run',
    'contract:manage',
    'settings:view',
    'settings:edit',
    'billing:manage',
    'team:view',
    'team:invite',
    'team:remove',
    'team:change_role',
    'audit:view',
    'pack:create',
    'pack:delete',
  ],
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Check if a role has a specific permission */
export function roleHasPermission(role: OrgRole, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role] as readonly Permission[]).includes(permission);
}

/** Check if roleA is at least as high as roleB in the hierarchy */
export function roleAtLeast(role: OrgRole, minRole: OrgRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
}

/** Get all permissions for a role */
export function getPermissionsForRole(role: OrgRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

/** All valid roles (for validation) */
export const ALL_ROLES: readonly OrgRole[] = ['owner', 'admin', 'editor', 'viewer'];
