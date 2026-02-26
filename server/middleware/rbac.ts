/**
 * RBAC middleware — Role-based permission checks for Express routes.
 *
 * Usage:
 *   router.delete('/prompts/:id', requireAnyAuth, requirePermission('prompt:delete'), handler);
 *   router.post('/team/invite',   requireAnyAuth, requireRole('admin'), handler);
 */

import type { Request, Response, NextFunction } from 'express';
import type { AuthUser } from './supabaseAuth';
import type { OrgRole, Permission } from '../../types/rbac';
import { roleHasPermission, roleAtLeast } from '../../types/rbac';

/** Helper to extract AuthUser from request */
function getAuthUser(req: Request): AuthUser | null {
  return req.authUser ?? null;
}

/**
 * Middleware: require a specific permission.
 * Must be placed AFTER requireAnyAuth (so authUser is set).
 *
 * Returns 403 if:
 *   - No authUser (shouldn't happen after requireAnyAuth)
 *   - User has no role
 *   - User's role doesn't include the required permission
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = getAuthUser(req);

    // Dev bypass mode (never in production)
    if (!user && process.env.NODE_ENV !== 'production' && process.env.DISABLE_API_KEY_AUTH === 'true') {
      return next();
    }

    if (!user) {
      res.status(401).json({ error: 'Authentication required', code: 'NO_AUTH' });
      return;
    }

    const role = user.role as OrgRole | null;
    if (!role) {
      res.status(403).json({
        error: 'No role assigned',
        code: 'NO_ROLE',
        required: permission,
      });
      return;
    }

    if (!roleHasPermission(role, permission)) {
      res.status(403).json({
        error: `Insufficient permissions: requires '${permission}'`,
        code: 'FORBIDDEN',
        role,
        required: permission,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware: require at least a minimum role level.
 * Uses role hierarchy: owner > admin > editor > viewer.
 */
export function requireRole(minRole: OrgRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = getAuthUser(req);

    if (!user && process.env.NODE_ENV !== 'production' && process.env.DISABLE_API_KEY_AUTH === 'true') {
      return next();
    }

    if (!user) {
      res.status(401).json({ error: 'Authentication required', code: 'NO_AUTH' });
      return;
    }

    const role = user.role as OrgRole | null;
    if (!role) {
      res.status(403).json({
        error: 'No role assigned',
        code: 'NO_ROLE',
        required: minRole,
      });
      return;
    }

    if (!roleAtLeast(role, minRole)) {
      res.status(403).json({
        error: `Insufficient role: requires at least '${minRole}'`,
        code: 'FORBIDDEN',
        role,
        required: minRole,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware: require the user to be the org owner.
 * Shorthand for requireRole('owner').
 */
export const requireOwner = requireRole('owner');

/**
 * Middleware: require at least admin role.
 * Shorthand for requireRole('admin').
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware: require at least editor role.
 * Shorthand for requireRole('editor').
 */
export const requireEditor = requireRole('editor');
