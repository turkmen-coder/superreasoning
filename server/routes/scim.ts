/**
 * SCIM 2.0 Provisioning Routes — User and Group management.
 *
 * Implements RFC 7644 (SCIM Protocol) for identity provider integration.
 * Used by Okta, Azure AD, OneLogin, etc. for automated user lifecycle.
 *
 * Routes:
 *   GET    /scim/v2/Users              — List/search users
 *   POST   /scim/v2/Users              — Create (provision) user
 *   GET    /scim/v2/Users/:id          — Get user
 *   PUT    /scim/v2/Users/:id          — Replace user
 *   PATCH  /scim/v2/Users/:id          — Update user (partial)
 *   DELETE /scim/v2/Users/:id          — Delete (deprovision) user
 *   GET    /scim/v2/Groups             — List groups
 *   POST   /scim/v2/Groups             — Create group
 *   GET    /scim/v2/Groups/:id         — Get group
 *   PATCH  /scim/v2/Groups/:id         — Update group
 *   DELETE /scim/v2/Groups/:id         — Delete group
 *
 * Authentication: Bearer token (per-org SCIM token, NOT user JWT)
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { getPool } from '../db/client';
import { writeAuditLog } from '../lib/auditLog';
import { asyncHandler } from '../lib/asyncHandler';
import type {
  ScimUser,
  ScimGroup,
  ScimListResponse,
  ScimError,
  ScimPatchOp,
  ScimFilter,
} from '../../types/scim';

const router = Router();

// ── SCIM Bearer Token Auth ─────────────────────────────────────────────────

interface ScimAuthContext {
  orgId: string;
  defaultRole: string;
}

async function scimAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const pool = getPool();
  if (!pool) {
    sendScimError(res, 503, 'Database not available');
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    sendScimError(res, 401, 'Bearer token required');
    return;
  }

  const token = authHeader.slice(7);
  if (!token) {
    sendScimError(res, 401, 'Invalid bearer token');
    return;
  }

  try {
    // Look up org by SCIM token
    const result = await pool.query(
      `SELECT id, scim_config FROM organizations
       WHERE scim_config->>'bearerToken' = $1
         AND (scim_config->>'enabled')::boolean = true`,
      [token]
    );

    if (result.rows.length === 0) {
      sendScimError(res, 401, 'Invalid or disabled SCIM token');
      return;
    }

    const org = result.rows[0];
    const config = org.scim_config ?? {};

    req.scimAuth = {
      orgId: org.id,
      defaultRole: config.defaultRole ?? 'member',
    } as ScimAuthContext;

    next();
  } catch {
    sendScimError(res, 500, 'Authentication error');
  }
}

// ── SCIM Content-Type middleware ────────────────────────────────────────────

function scimContentType(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Content-Type', 'application/scim+json');
  next();
}

router.use(scimContentType);

// ── Filter Parser ──────────────────────────────────────────────────────────

function parseScimFilter(filterStr: string | undefined): ScimFilter | null {
  if (!filterStr) return null;

  // Simple filter: "userName eq \"user@example.com\""
  const match = filterStr.match(/^(\w+)\s+(eq|ne|co|sw|ew|gt|lt|ge|le)\s+"([^"]*)"$/);
  if (!match) return null;

  return {
    attribute: match[1],
    operator: match[2] as ScimFilter['operator'],
    value: match[3],
  };
}

// ── Error Helper ───────────────────────────────────────────────────────────

function sendScimError(res: Response, status: number, detail: string, scimType?: ScimError['scimType']): void {
  const error: ScimError = {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
    detail,
    status: String(status),
    scimType,
  };
  res.status(status).json(error);
}

// ── User Mapping ───────────────────────────────────────────────────────────

function mapUserToScim(row: any, baseUrl: string): ScimUser {
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: row.id,
    externalId: row.external_id ?? undefined,
    userName: row.email,
    name: {
      givenName: row.first_name ?? '',
      familyName: row.last_name ?? '',
      formatted: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email,
    },
    emails: [{
      value: row.email,
      type: 'work',
      primary: true,
    }],
    active: row.active !== false,
    displayName: row.display_name ?? row.email,
    meta: {
      resourceType: 'User',
      created: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      lastModified: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
      location: `${baseUrl}/scim/v2/Users/${row.id}`,
    },
  };
}

function getBaseUrl(req: Request): string {
  const proto = req.headers['x-forwarded-proto'] ?? req.protocol ?? 'https';
  const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost';
  return `${proto}://${host}`;
}

// ════════════════════════════════════════════════════════════════════════════
// ── USER ENDPOINTS ─────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

/** GET /scim/v2/Users — List/search users */
router.get('/scim/v2/Users', scimAuth, asyncHandler(async (req, res) => {
  const { orgId } = req.scimAuth as ScimAuthContext;
  const pool = getPool()!;
  const baseUrl = getBaseUrl(req);

  const startIndex = Math.max(1, parseInt(String(req.query.startIndex), 10) || 1);
  const count = Math.min(100, Math.max(1, parseInt(String(req.query.count), 10) || 100));
  const filter = parseScimFilter(String(req.query.filter ?? ''));

  let query: string;
  let params: any[];

  if (filter && filter.attribute === 'userName' && filter.operator === 'eq') {
    query = `SELECT u.* FROM users u
             JOIN org_members om ON om.user_id = u.id
             WHERE om.org_id = $1::uuid AND u.email = $2
             ORDER BY u.created_at ASC
             OFFSET $3 LIMIT $4`;
    params = [orgId, filter.value, startIndex - 1, count];
  } else {
    query = `SELECT u.* FROM users u
             JOIN org_members om ON om.user_id = u.id
             WHERE om.org_id = $1::uuid
             ORDER BY u.created_at ASC
             OFFSET $2 LIMIT $3`;
    params = [orgId, startIndex - 1, count];
  }

  const result = await pool.query(query, params);

  // Total count
  const totalResult = await pool.query(
    `SELECT COUNT(*) as total FROM users u
     JOIN org_members om ON om.user_id = u.id
     WHERE om.org_id = $1::uuid`,
    [orgId]
  );

  const response: ScimListResponse<ScimUser> = {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: parseInt(totalResult.rows[0].total, 10),
    startIndex,
    itemsPerPage: result.rows.length,
    Resources: result.rows.map(r => mapUserToScim(r, baseUrl)),
  };

  res.json(response);
}));

/** POST /scim/v2/Users — Provision new user */
router.post('/scim/v2/Users', scimAuth, asyncHandler(async (req, res) => {
  const { orgId, defaultRole } = req.scimAuth as ScimAuthContext;
  const pool = getPool()!;
  const baseUrl = getBaseUrl(req);

  const body = req.body as Partial<ScimUser>;
  const email = body.userName ?? body.emails?.[0]?.value;

  if (!email || typeof email !== 'string') {
    sendScimError(res, 400, 'userName (email) is required', 'invalidValue');
    return;
  }

  // Check if user already exists
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

  let userId: string;

  if (existing.rows.length > 0) {
    userId = existing.rows[0].id;

    // Check if already in org
    const memberCheck = await pool.query(
      'SELECT 1 FROM org_members WHERE org_id = $1::uuid AND user_id = $2::uuid',
      [orgId, userId]
    );

    if (memberCheck.rows.length > 0) {
      sendScimError(res, 409, 'User already exists in organization', 'uniqueness');
      return;
    }
  } else {
    // Create new user
    const insertResult = await pool.query(
      `INSERT INTO users (email, first_name, last_name, display_name, external_id, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        email,
        body.name?.givenName ?? '',
        body.name?.familyName ?? '',
        body.displayName ?? email,
        body.externalId ?? null,
        body.active !== false,
      ]
    );
    userId = insertResult.rows[0].id;
  }

  // Add to org with default role
  await pool.query(
    `INSERT INTO org_members (org_id, user_id, role) VALUES ($1::uuid, $2::uuid, $3)
     ON CONFLICT (org_id, user_id) DO NOTHING`,
    [orgId, userId, defaultRole]
  );

  // Audit log
  writeAuditLog(pool, {
    orgId,
    userId,
    action: 'team_invite',
    resourceType: 'user',
    resourceId: userId,
    metadata: { source: 'scim', role: defaultRole, email },
  }).catch(() => {});

  // Return created user
  const userRow = await pool.query('SELECT * FROM users WHERE id = $1::uuid', [userId]);
  const scimUser = mapUserToScim(userRow.rows[0], baseUrl);
  res.status(201).json(scimUser);
}));

/** GET /scim/v2/Users/:id — Get single user */
router.get('/scim/v2/Users/:id', scimAuth, asyncHandler(async (req, res) => {
  const { orgId } = req.scimAuth as ScimAuthContext;
  const pool = getPool()!;
  const baseUrl = getBaseUrl(req);
  const userId = req.params.id as string;

  const result = await pool.query(
    `SELECT u.* FROM users u
     JOIN org_members om ON om.user_id = u.id
     WHERE u.id = $1::uuid AND om.org_id = $2::uuid`,
    [userId, orgId]
  );

  if (result.rows.length === 0) {
    sendScimError(res, 404, 'User not found');
    return;
  }

  res.json(mapUserToScim(result.rows[0], baseUrl));
}));

/** PUT /scim/v2/Users/:id — Replace user */
router.put('/scim/v2/Users/:id', scimAuth, asyncHandler(async (req, res) => {
  const { orgId } = req.scimAuth as ScimAuthContext;
  const pool = getPool()!;
  const baseUrl = getBaseUrl(req);
  const userId = req.params.id as string;

  const body = req.body as Partial<ScimUser>;

  // Verify user exists in org
  const exists = await pool.query(
    `SELECT 1 FROM org_members WHERE org_id = $1::uuid AND user_id = $2::uuid`,
    [orgId, userId]
  );

  if (exists.rows.length === 0) {
    sendScimError(res, 404, 'User not found');
    return;
  }

  // Update user
  await pool.query(
    `UPDATE users SET
       first_name = COALESCE($1, first_name),
       last_name = COALESCE($2, last_name),
       display_name = COALESCE($3, display_name),
       active = COALESCE($4, active),
       external_id = COALESCE($5, external_id),
       updated_at = now()
     WHERE id = $6::uuid`,
    [
      body.name?.givenName,
      body.name?.familyName,
      body.displayName,
      body.active,
      body.externalId,
      userId,
    ]
  );

  const userRow = await pool.query('SELECT * FROM users WHERE id = $1::uuid', [userId]);
  res.json(mapUserToScim(userRow.rows[0], baseUrl));
}));

/** PATCH /scim/v2/Users/:id — Partial update (activate/deactivate) */
router.patch('/scim/v2/Users/:id', scimAuth, asyncHandler(async (req, res) => {
  const { orgId } = req.scimAuth as ScimAuthContext;
  const pool = getPool()!;
  const baseUrl = getBaseUrl(req);
  const userId = req.params.id as string;

  const body = req.body as ScimPatchOp;

  // Verify user exists in org
  const exists = await pool.query(
    `SELECT 1 FROM org_members WHERE org_id = $1::uuid AND user_id = $2::uuid`,
    [orgId, userId]
  );

  if (exists.rows.length === 0) {
    sendScimError(res, 404, 'User not found');
    return;
  }

  // Process PATCH operations
  for (const op of body.Operations ?? []) {
    if (op.path === 'active' || (!op.path && typeof op.value === 'object' && op.value !== null && 'active' in (op.value as Record<string, unknown>))) {
      const activeValue = op.path === 'active'
        ? op.value
        : (op.value as Record<string, unknown>).active;

      await pool.query(
        `UPDATE users SET active = $1, updated_at = now() WHERE id = $2::uuid`,
        [activeValue, userId]
      );

      // If deactivating, remove from org
      if (activeValue === false) {
        await pool.query(
          `DELETE FROM org_members WHERE org_id = $1::uuid AND user_id = $2::uuid`,
          [orgId, userId]
        );

        writeAuditLog(pool, {
          orgId,
          userId,
          action: 'team_remove',
          resourceType: 'user',
          resourceId: userId,
          metadata: { source: 'scim', reason: 'deactivated' },
        }).catch(() => {});
      }
    }

    if (op.path === 'name.givenName') {
      await pool.query('UPDATE users SET first_name = $1, updated_at = now() WHERE id = $2::uuid', [op.value, userId]);
    }
    if (op.path === 'name.familyName') {
      await pool.query('UPDATE users SET last_name = $1, updated_at = now() WHERE id = $2::uuid', [op.value, userId]);
    }
    if (op.path === 'displayName') {
      await pool.query('UPDATE users SET display_name = $1, updated_at = now() WHERE id = $2::uuid', [op.value, userId]);
    }
  }

  const userRow = await pool.query('SELECT * FROM users WHERE id = $1::uuid', [userId]);
  if (userRow.rows.length === 0) {
    sendScimError(res, 404, 'User not found');
    return;
  }
  res.json(mapUserToScim(userRow.rows[0], baseUrl));
}));

/** DELETE /scim/v2/Users/:id — Deprovision user */
router.delete('/scim/v2/Users/:id', scimAuth, asyncHandler(async (req, res) => {
  const { orgId } = req.scimAuth as ScimAuthContext;
  const pool = getPool()!;
  const userId = req.params.id as string;

  // Remove from org (soft deprovision)
  const result = await pool.query(
    `DELETE FROM org_members WHERE org_id = $1::uuid AND user_id = $2::uuid`,
    [orgId, userId]
  );

  if ((result.rowCount ?? 0) === 0) {
    sendScimError(res, 404, 'User not found');
    return;
  }

  // Mark user as inactive
  await pool.query(
    `UPDATE users SET active = false, updated_at = now() WHERE id = $1::uuid`,
    [userId]
  );

  writeAuditLog(pool, {
    orgId,
    userId,
    action: 'team_remove',
    resourceType: 'user',
    resourceId: userId,
    metadata: { source: 'scim', reason: 'deprovisioned' },
  }).catch(() => {});

  res.status(204).send();
}));

// ════════════════════════════════════════════════════════════════════════════
// ── GROUP ENDPOINTS ────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

function mapGroupToScim(row: any, members: any[], baseUrl: string): ScimGroup {
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
    id: row.id,
    externalId: row.external_id ?? undefined,
    displayName: row.name,
    members: members.map(m => ({
      value: m.user_id,
      display: m.email ?? m.display_name ?? m.user_id,
      type: 'User' as const,
    })),
    meta: {
      resourceType: 'Group',
      created: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      lastModified: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
      location: `${baseUrl}/scim/v2/Groups/${row.id}`,
    },
  };
}

/** GET /scim/v2/Groups — List groups */
router.get('/scim/v2/Groups', scimAuth, asyncHandler(async (req, res) => {
  const { orgId } = req.scimAuth as ScimAuthContext;
  const pool = getPool()!;
  const baseUrl = getBaseUrl(req);

  // Use org as the single group
  const orgResult = await pool.query('SELECT * FROM organizations WHERE id = $1::uuid', [orgId]);
  if (orgResult.rows.length === 0) {
    const response: ScimListResponse<ScimGroup> = {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: 0, startIndex: 1, itemsPerPage: 0, Resources: [],
    };
    res.json(response);
    return;
  }

  const org = orgResult.rows[0];
  const members = await pool.query(
    `SELECT om.user_id, u.email, u.display_name
     FROM org_members om JOIN users u ON u.id = om.user_id
     WHERE om.org_id = $1::uuid`,
    [orgId]
  );

  const group = mapGroupToScim(org, members.rows, baseUrl);

  const response: ScimListResponse<ScimGroup> = {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: 1,
    startIndex: 1,
    itemsPerPage: 1,
    Resources: [group],
  };

  res.json(response);
}));

/** GET /scim/v2/Groups/:id — Get group */
router.get('/scim/v2/Groups/:id', scimAuth, asyncHandler(async (req, res) => {
  const { orgId } = req.scimAuth as ScimAuthContext;
  const pool = getPool()!;
  const baseUrl = getBaseUrl(req);
  const groupId = req.params.id as string;

  if (groupId !== orgId) {
    sendScimError(res, 404, 'Group not found');
    return;
  }

  const orgResult = await pool.query('SELECT * FROM organizations WHERE id = $1::uuid', [orgId]);
  if (orgResult.rows.length === 0) {
    sendScimError(res, 404, 'Group not found');
    return;
  }

  const members = await pool.query(
    `SELECT om.user_id, u.email, u.display_name
     FROM org_members om JOIN users u ON u.id = om.user_id
     WHERE om.org_id = $1::uuid`,
    [orgId]
  );

  res.json(mapGroupToScim(orgResult.rows[0], members.rows, baseUrl));
}));

/** PATCH /scim/v2/Groups/:id — Update group members */
router.patch('/scim/v2/Groups/:id', scimAuth, asyncHandler(async (req, res) => {
  const { orgId, defaultRole } = req.scimAuth as ScimAuthContext;
  const pool = getPool()!;
  const baseUrl = getBaseUrl(req);
  const groupId = req.params.id as string;

  if (groupId !== orgId) {
    sendScimError(res, 404, 'Group not found');
    return;
  }

  const body = req.body as ScimPatchOp;

  for (const op of body.Operations ?? []) {
    if (op.path === 'members' && op.op === 'add' && Array.isArray(op.value)) {
      // Add members
      for (const member of op.value as Array<{ value: string }>) {
        await pool.query(
          `INSERT INTO org_members (org_id, user_id, role) VALUES ($1::uuid, $2::uuid, $3)
           ON CONFLICT (org_id, user_id) DO NOTHING`,
          [orgId, member.value, defaultRole]
        );
      }
    } else if (op.path === 'members' && op.op === 'remove' && Array.isArray(op.value)) {
      // Remove members
      for (const member of op.value as Array<{ value: string }>) {
        await pool.query(
          `DELETE FROM org_members WHERE org_id = $1::uuid AND user_id = $2::uuid`,
          [orgId, member.value]
        );
      }
    } else if (op.path?.startsWith('members[value eq "') && op.op === 'remove') {
      // Remove specific member: members[value eq "userId"]
      const match = op.path.match(/members\[value eq "([^"]+)"\]/);
      if (match) {
        await pool.query(
          `DELETE FROM org_members WHERE org_id = $1::uuid AND user_id = $2::uuid`,
          [orgId, match[1]]
        );
      }
    }
  }

  // Return updated group
  const orgResult = await pool.query('SELECT * FROM organizations WHERE id = $1::uuid', [orgId]);
  const members = await pool.query(
    `SELECT om.user_id, u.email, u.display_name
     FROM org_members om JOIN users u ON u.id = om.user_id
     WHERE om.org_id = $1::uuid`,
    [orgId]
  );

  res.json(mapGroupToScim(orgResult.rows[0], members.rows, baseUrl));
}));

export default router;
