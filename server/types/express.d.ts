/**
 * Express Request augmentation.
 * Adds typed properties set by auth/RBAC/SCIM middleware.
 * Eliminates `(req as any).authUser` casts across all routes.
 */

import type { AuthUser } from '../middleware/supabaseAuth';

export interface ScimAuthContext {
  orgId: string;
  defaultRole: string;
}

declare global {
  namespace Express {
    interface Request {
      /** Authenticated user context (set by requireSupabaseAuth / requireAnyAuth) */
      authUser?: AuthUser;
      /** API key value (set by requireApiKey / optionalApiKey) */
      apiKey?: string;
      /** Tenant/org ID (set by tenant middleware) */
      tenantId?: string;
      /** SCIM auth context (set by SCIM auth middleware) */
      scimAuth?: ScimAuthContext;
    }
  }
}
