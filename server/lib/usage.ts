/**
 * Kullanım metering — org bazlı request/token sayacı.
 * usage tablosuna aylık periyot ile kayıt.
 */

import type { Pool } from 'pg';

export async function recordRunUsage(
  pool: Pool,
  orgId: string,
  requestCount = 1,
  tokenCount = 0
): Promise<void> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const planResult = await pool.query(
    'SELECT plan FROM organizations WHERE id = $1::uuid',
    [orgId]
  );
  const plan = planResult.rows[0]?.plan ?? 'free';

  await pool.query(
    `INSERT INTO usage (org_id, plan, period_start, period_end, request_count, token_count)
     VALUES ($1::uuid, $2, $3, $4, $5, $6)
     ON CONFLICT (org_id, period_start) DO UPDATE SET
       request_count = usage.request_count + EXCLUDED.request_count,
       token_count = usage.token_count + EXCLUDED.token_count`,
    [orgId, plan, periodStart, periodEnd, requestCount, tokenCount]
  );
}

export interface UsageSummary {
  orgId: string;
  plan: string;
  periodStart: string;
  periodEnd: string;
  requestCount: number;
  tokenCount: number;
}

export async function getUsageForOrg(
  pool: Pool,
  orgId: string
): Promise<UsageSummary | null> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const result = await pool.query(
    `SELECT org_id, plan, period_start, period_end, request_count, token_count
     FROM usage
     WHERE org_id = $1::uuid AND period_start = $2`,
    [orgId, periodStart]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    orgId: row.org_id,
    plan: row.plan,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    requestCount: parseInt(String(row.request_count), 10),
    tokenCount: parseInt(String(row.token_count), 10),
  };
}
