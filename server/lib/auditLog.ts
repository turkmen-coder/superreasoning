/**
 * Audit Log — Kim, ne zaman, ne yaptı.
 * @see docs/SAAS_TRANSFORMATION.md, server/db/schema-rls.sql
 *
 * DB bağlantısı varsa audit_log tablosuna yazar; yoksa console.log.
 * v2: PII redaction + retention policy + action genişletme.
 */

import type { Pool } from 'pg';
import { redactPIIFromObject } from '../middleware/piiRedaction';

export type AuditAction =
  | 'generate'
  | 'prompt_save'
  | 'prompt_delete'
  | 'prompt_list'
  | 'run_start'
  | 'run_complete'
  | 'run_fail'
  | 'auth_validate'
  | 'auth_fail'
  | 'cache_hit'
  | 'judge_evaluate'
  | 'lint_check'
  | 'custom_domain_save'
  | 'custom_domain_delete'
  | 'custom_framework_save'
  | 'custom_framework_delete'
  | 'enhance_prompt'
  | 'enrich'
  | 'contract_save'
  | 'contract_delete'
  | 'test_case_save'
  | 'test_case_delete'
  | 'regression_run'
  | 'version_promote'
  | 'provider_route'
  | 'adversarial_test'
  | 'pii_detected'
  | 'anchor_drift'
  | 'role_change'
  | 'team_invite'
  | 'team_remove';

export interface AuditEntry {
  orgId?: string;
  userId?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}

/**
 * Audit log yaz — DB varsa INSERT, yoksa console.
 * Metadata alanlarında PII otomatik maskelenir.
 */
export async function writeAuditLog(pool: Pool | null, entry: AuditEntry): Promise<void> {
  // PII redaction: metadata içindeki kişisel verileri maskele
  const safeMetadata = entry.metadata
    ? redactPIIFromObject(entry.metadata)
    : null;

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO audit_log (org_id, user_id, action, resource, resource_id, new_value, ip)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::jsonb, $7::inet)`,
        [
          entry.orgId || null,
          entry.userId || null,
          entry.action,
          entry.resourceType || 'prompt',
          entry.resourceId || null,
          safeMetadata ? JSON.stringify(safeMetadata) : null,
          entry.ip || null,
        ]
      );
    } catch (e) {
      // Audit log hatası uygulamayı durdurmamalı
      console.error('[AuditLog] DB write failed:', e instanceof Error ? e.message : e);
    }
  }
}

/**
 * Audit loglarını listele (son N kayıt).
 * Opsiyonel: action filtresi, tarih aralığı.
 */
export async function listAuditLogs(
  pool: Pool,
  orgId: string,
  options: {
    limit?: number;
    action?: AuditAction;
    since?: Date;
  } = {},
): Promise<Array<Record<string, unknown>>> {
  const { limit = 50, action, since } = options;

  let query = `SELECT id, org_id, user_id, action, resource, resource_id, new_value as metadata, ip, created_at
     FROM audit_log
     WHERE org_id = $1::uuid`;
  const params: (string | number | Date | null)[] = [orgId];
  let paramIdx = 2;

  if (action) {
    query += ` AND action = $${paramIdx}`;
    params.push(action);
    paramIdx++;
  }

  if (since) {
    query += ` AND created_at >= $${paramIdx}`;
    params.push(since.toISOString());
    paramIdx++;
  }

  query += ` ORDER BY created_at DESC LIMIT $${paramIdx}`;
  params.push(limit);

  const result = await pool.query(query, params);
  return result.rows;
}

// ── Retention Policy ─────────────────────────────────────────────────────────

export interface RetentionConfig {
  /** Kaç gün sonra eski kayıtlar silinsin (default: 90) */
  retentionDays: number;
  /** Silme batch boyutu (default: 1000) */
  batchSize: number;
}

const DEFAULT_RETENTION: RetentionConfig = {
  retentionDays: parseInt(process.env.SR_AUDIT_RETENTION_DAYS ?? '90', 10),
  batchSize: 1000,
};

/**
 * Retention policy'ye göre eski audit loglarını temizle.
 * Cron job veya startup'ta çağrılır.
 * @returns Silinen kayıt sayısı
 */
export async function cleanupExpiredAuditLogs(
  pool: Pool,
  config: RetentionConfig = DEFAULT_RETENTION,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);

  let totalDeleted = 0;
  let deletedInBatch = 0;

  do {
    try {
      const result = await pool.query(
        `DELETE FROM audit_log
         WHERE id IN (
           SELECT id FROM audit_log
           WHERE created_at < $1
           ORDER BY created_at ASC
           LIMIT $2
         )`,
        [cutoffDate.toISOString(), config.batchSize],
      );
      deletedInBatch = result.rowCount ?? 0;
      totalDeleted += deletedInBatch;
    } catch (e) {
      console.error('[AuditLog] Cleanup failed:', e instanceof Error ? e.message : e);
      break;
    }
  } while (deletedInBatch >= config.batchSize);

  if (totalDeleted > 0) {
    console.info(`[AuditLog] Retention cleanup: removed ${totalDeleted} records older than ${config.retentionDays} days`);
  }

  return totalDeleted;
}
