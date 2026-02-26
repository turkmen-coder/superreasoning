/**
 * Team management routes — RBAC-protected member management.
 *
 * GET    /v1/team/members          — List org members (viewer+)
 * POST   /v1/team/members          — Invite member (admin+)
 * PATCH  /v1/team/members/:userId  — Change role (owner only for role changes)
 * DELETE /v1/team/members/:userId  — Remove member (admin+)
 */

import { Router } from 'express';
import { requireAnyAuth } from '../middleware/supabaseAuth';
import { requirePermission } from '../middleware/rbac';
import { getPool } from '../db/client';
import { writeAuditLog } from '../lib/auditLog';
import { apiRateLimiter } from '../middleware/rateLimit';
import { optionalApiKey } from '../middleware/auth';
import { ALL_ROLES, ROLE_HIERARCHY } from '../../types/rbac';
import type { OrgRole } from '../../types/rbac';
import type { AuthUser } from '../middleware/supabaseAuth';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();
const withKey = [optionalApiKey];

/** GET /v1/team/members — List all org members */
router.get('/team/members', ...withKey, apiRateLimiter, requireAnyAuth, requirePermission('team:view'), asyncHandler(async (req, res) => {
  const user = req.authUser as AuthUser;
  if (!user.orgId) {
    return res.status(400).json({ error: 'No organization context' });
  }

  const pool = getPool();
  if (!pool) return res.status(503).json({ error: 'Database not available' });

    const result = await pool.query(
      `SELECT u.id as user_id, u.email, om.role, om.created_at as joined_at
       FROM org_members om
       JOIN users u ON u.id = om.user_id
       WHERE om.org_id = $1::uuid
       ORDER BY om.created_at ASC`,
      [user.orgId]
    );

    res.json({
      orgId: user.orgId,
      members: result.rows.map(r => ({
        userId: r.user_id,
        email: r.email,
        role: r.role,
        joinedAt: r.joined_at,
      })),
      total: result.rows.length,
    });
}));

/** POST /v1/team/members — Invite a new member */
router.post('/team/members', ...withKey, apiRateLimiter, requireAnyAuth, requirePermission('team:invite'), asyncHandler(async (req, res) => {
  const actor = req.authUser as AuthUser;
  if (!actor.orgId) {
    return res.status(400).json({ error: 'No organization context' });
  }

  const { email, role } = req.body ?? {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email (string) required' });
  }

  const memberRole = (ALL_ROLES as readonly string[]).includes(role) ? role as OrgRole : 'viewer';

  // Cannot assign a role higher than your own
  const actorRole = actor.role as OrgRole;
  if (ROLE_HIERARCHY[memberRole] >= ROLE_HIERARCHY[actorRole]) {
    return res.status(403).json({
      error: `Cannot assign role '${memberRole}' (must be lower than your role '${actorRole}')`,
      code: 'ROLE_ESCALATION',
    });
  }

  const pool = getPool();
  if (!pool) return res.status(503).json({ error: 'Database not available' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find user by email
    const userResult = await client.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [email.toLowerCase().trim()]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found. They must sign up first.', code: 'USER_NOT_FOUND' });
    }

    const targetUserId = userResult.rows[0].id;

    // Check if already a member
    const existingResult = await client.query(
      `SELECT role FROM org_members WHERE org_id = $1::uuid AND user_id = $2::uuid`,
      [actor.orgId, targetUserId]
    );

    if (existingResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'User is already a member of this organization',
        code: 'ALREADY_MEMBER',
        currentRole: existingResult.rows[0].role,
      });
    }

    // Add member
    await client.query(
      `INSERT INTO org_members (org_id, user_id, role) VALUES ($1::uuid, $2::uuid, $3)`,
      [actor.orgId, targetUserId, memberRole]
    );

    await client.query('COMMIT');

    // Audit log
    writeAuditLog(pool, {
      orgId: actor.orgId,
      userId: actor.userId,
      action: 'team_invite',
      resourceType: 'user',
      resourceId: targetUserId,
      metadata: { targetEmail: email, assignedRole: memberRole },
      ip: req.ip ?? undefined,
    }).catch(() => {});

    res.status(201).json({
      userId: targetUserId,
      email,
      role: memberRole,
      orgId: actor.orgId,
    });
  } catch (e: any) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

/** PATCH /v1/team/members/:userId — Change member role */
router.patch('/team/members/:userId', ...withKey, apiRateLimiter, requireAnyAuth, requirePermission('team:change_role'), asyncHandler(async (req, res) => {
  const actor = req.authUser as AuthUser;
  if (!actor.orgId) {
    return res.status(400).json({ error: 'No organization context' });
  }

  const targetUserId = req.params.userId as string;
  const { role: newRole } = req.body ?? {};

  if (!newRole || !(ALL_ROLES as readonly string[]).includes(newRole)) {
    return res.status(400).json({ error: `role must be one of: ${ALL_ROLES.join(', ')}` });
  }

  // Cannot change your own role
  if (targetUserId === actor.userId) {
    return res.status(400).json({ error: 'Cannot change your own role', code: 'SELF_ROLE_CHANGE' });
  }

  // Cannot assign a role >= your own (except owner assigning owner is also blocked)
  const actorRole = actor.role as OrgRole;
  if (ROLE_HIERARCHY[newRole as OrgRole] >= ROLE_HIERARCHY[actorRole]) {
    return res.status(403).json({
      error: `Cannot assign role '${newRole}' (must be lower than your role '${actorRole}')`,
      code: 'ROLE_ESCALATION',
    });
  }

  const pool = getPool();
  if (!pool) return res.status(503).json({ error: 'Database not available' });

    // Get current role
    const current = await pool.query(
      `SELECT role FROM org_members WHERE org_id = $1::uuid AND user_id = $2::uuid`,
      [actor.orgId, targetUserId]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found in organization' });
    }

    const previousRole = current.rows[0].role;

    // Cannot change role of someone with equal/higher role
    if (ROLE_HIERARCHY[previousRole as OrgRole] >= ROLE_HIERARCHY[actorRole]) {
      return res.status(403).json({
        error: `Cannot modify role of '${previousRole}' (equal or higher than your role)`,
        code: 'ROLE_HIERARCHY',
      });
    }

    // Update role
    await pool.query(
      `UPDATE org_members SET role = $1 WHERE org_id = $2::uuid AND user_id = $3::uuid`,
      [newRole, actor.orgId, targetUserId]
    );

    // Audit log
    writeAuditLog(pool, {
      orgId: actor.orgId,
      userId: actor.userId,
      action: 'role_change',
      resourceType: 'user',
      resourceId: targetUserId,
      metadata: { previousRole, newRole },
      ip: req.ip ?? undefined,
    }).catch(() => {});

    res.json({
      userId: targetUserId,
      previousRole,
      newRole,
    });
}));

/** DELETE /v1/team/members/:userId — Remove member from org */
router.delete('/team/members/:userId', ...withKey, apiRateLimiter, requireAnyAuth, requirePermission('team:remove'), asyncHandler(async (req, res) => {
  const actor = req.authUser as AuthUser;
  if (!actor.orgId) {
    return res.status(400).json({ error: 'No organization context' });
  }

  const targetUserId = req.params.userId as string;

  // Cannot remove yourself
  if (targetUserId === actor.userId) {
    return res.status(400).json({ error: 'Cannot remove yourself from the organization', code: 'SELF_REMOVE' });
  }

  const pool = getPool();
  if (!pool) return res.status(503).json({ error: 'Database not available' });

    // Check target's role (cannot remove equal/higher role)
    const current = await pool.query(
      `SELECT role FROM org_members WHERE org_id = $1::uuid AND user_id = $2::uuid`,
      [actor.orgId, targetUserId]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found in organization' });
    }

    const targetRole = current.rows[0].role as OrgRole;
    const actorRole = actor.role as OrgRole;

    if (ROLE_HIERARCHY[targetRole] >= ROLE_HIERARCHY[actorRole]) {
      return res.status(403).json({
        error: `Cannot remove '${targetRole}' (equal or higher than your role)`,
        code: 'ROLE_HIERARCHY',
      });
    }

    // Cannot remove the last owner
    if (targetRole === 'owner') {
      const ownerCount = await pool.query(
        `SELECT COUNT(*) as cnt FROM org_members WHERE org_id = $1::uuid AND role = 'owner'`,
        [actor.orgId]
      );
      if (parseInt(ownerCount.rows[0].cnt, 10) <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last owner', code: 'LAST_OWNER' });
      }
    }

    await pool.query(
      `DELETE FROM org_members WHERE org_id = $1::uuid AND user_id = $2::uuid`,
      [actor.orgId, targetUserId]
    );

    // Audit log
    writeAuditLog(pool, {
      orgId: actor.orgId,
      userId: actor.userId,
      action: 'team_remove',
      resourceType: 'user',
      resourceId: targetUserId,
      metadata: { removedRole: targetRole },
      ip: req.ip ?? undefined,
    }).catch(() => {});

    res.status(204).send();
}));

export default router;
