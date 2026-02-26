/**
 * Prompt Lifecycle — Version promotion pipeline.
 * draft → testing → staging → production → archived
 * @see types/regression.ts
 */

import type { Pool } from 'pg';
import type { VersionStatus, VersionLifecycleInfo, PromoteResult } from '../types/regression';
import { lintPrompt } from './promptLint';
import { judgePrompt } from './judgeEnsemble';
import { validateContract } from './contractValidator';

const STATUS_ORDER: VersionStatus[] = ['draft', 'testing', 'staging', 'production'];

/**
 * Get lifecycle info for a prompt version.
 */
export async function getVersionLifecycle(
  pool: Pool, orgId: string, promptId: string, version: string
): Promise<VersionLifecycleInfo | null> {
  const row = await pool.query(
    `SELECT pv.version, pv.master_prompt, pv.reasoning,
            COALESCE(pv.status, 'draft') as status,
            pv.promoted_at, pv.promoted_by
     FROM prompt_versions pv
     JOIN prompts p ON p.id = pv.prompt_id
     WHERE p.org_id = $1::uuid AND p.id = $2::uuid AND pv.version = $3`,
    [orgId, promptId, version]
  );
  if (row.rows.length === 0) return null;

  const r = row.rows[0];
  const masterPrompt = r.master_prompt;
  const reasoning = r.reasoning;

  // Check gates
  const lintResult = lintPrompt(masterPrompt, reasoning);
  const judgeResult = judgePrompt(masterPrompt, { reasoning });

  // Check contracts
  const contractRows = await pool.query(
    `SELECT rules FROM prompt_contracts WHERE prompt_id = $1::uuid AND is_active = true`,
    [promptId]
  );
  let contractPassed = true;
  let contractScore = 100;
  if (contractRows.rows.length > 0) {
    let totalScore = 0;
    for (const cr of contractRows.rows) {
      const result = validateContract(masterPrompt, cr.rules);
      totalScore += result.score;
      if (!result.passed) contractPassed = false;
    }
    contractScore = Math.round(totalScore / contractRows.rows.length);
  }

  // Check regression
  const regRow = await pool.query(
    `SELECT status FROM regression_runs
     WHERE prompt_id = $1::uuid AND version = $2
     ORDER BY created_at DESC LIMIT 1`,
    [promptId, version]
  );
  const regressionPassed = regRow.rows.length > 0 ? regRow.rows[0].status === 'passed' : false;
  const regressionChecked = regRow.rows.length > 0;

  return {
    promptId,
    version,
    status: r.status as VersionStatus,
    promotedAt: r.promoted_at ? new Date(r.promoted_at).toISOString() : undefined,
    promotedBy: r.promoted_by ?? undefined,
    gates: {
      lint: { passed: lintResult.passed, checked: true },
      judge: { passed: judgeResult.passThreshold, score: judgeResult.totalScore, checked: true },
      contract: { passed: contractPassed, score: contractScore, checked: contractRows.rows.length > 0 },
      regression: { passed: regressionPassed, checked: regressionChecked },
    },
  };
}

/**
 * Promote a prompt version to a target status.
 * Checks gate requirements for each transition.
 */
export async function promoteVersion(
  pool: Pool, orgId: string, promptId: string, version: string,
  targetStatus: VersionStatus, userId?: string
): Promise<PromoteResult> {
  // Get current lifecycle info
  const info = await getVersionLifecycle(pool, orgId, promptId, version);
  if (!info) {
    return { success: false, newStatus: 'draft', message: 'Version not found' };
  }

  const currentStatus = info.status;

  // Allow archiving from any status
  if (targetStatus === 'archived') {
    await updateVersionStatus(pool, promptId, version, 'archived', userId);
    return { success: true, newStatus: 'archived', message: 'Version archived', gateResults: info.gates };
  }

  // Validate promotion path
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const targetIdx = STATUS_ORDER.indexOf(targetStatus);

  if (targetIdx < 0) {
    return { success: false, newStatus: currentStatus, message: `Invalid target status: ${targetStatus}` };
  }
  if (targetIdx <= currentIdx) {
    return { success: false, newStatus: currentStatus, message: `Cannot demote from ${currentStatus} to ${targetStatus}. Use 'archived' to retire.` };
  }
  if (targetIdx > currentIdx + 1) {
    return { success: false, newStatus: currentStatus, message: `Cannot skip stages. Promote to ${STATUS_ORDER[currentIdx + 1]} first.` };
  }

  // Check gate requirements for each transition
  switch (targetStatus) {
    case 'testing': {
      // draft → testing: Lint must pass
      if (!info.gates.lint.passed) {
        return { success: false, newStatus: currentStatus, message: 'Lint gate failed. Fix lint errors before promoting to testing.', gateResults: info.gates };
      }
      break;
    }
    case 'staging': {
      // testing → staging: Last regression run must pass + judge >= threshold
      if (!info.gates.regression.checked) {
        return { success: false, newStatus: currentStatus, message: 'No regression run found. Run regression tests before promoting to staging.', gateResults: info.gates };
      }
      if (!info.gates.regression.passed) {
        return { success: false, newStatus: currentStatus, message: 'Last regression run failed. Fix issues and re-run tests.', gateResults: info.gates };
      }
      if (!info.gates.judge.passed) {
        return { success: false, newStatus: currentStatus, message: `Judge score (${info.gates.judge.score}) below threshold. Improve prompt quality.`, gateResults: info.gates };
      }
      break;
    }
    case 'production': {
      // staging → production: All gates pass + contract compliance 100%
      if (!info.gates.lint.passed) {
        return { success: false, newStatus: currentStatus, message: 'Lint gate failed.', gateResults: info.gates };
      }
      if (!info.gates.judge.passed) {
        return { success: false, newStatus: currentStatus, message: `Judge score (${info.gates.judge.score}) below threshold.`, gateResults: info.gates };
      }
      if (info.gates.contract.checked && !info.gates.contract.passed) {
        return { success: false, newStatus: currentStatus, message: `Contract compliance (${info.gates.contract.score}%) is not 100%. Fix contract violations.`, gateResults: info.gates };
      }
      if (!info.gates.regression.passed) {
        return { success: false, newStatus: currentStatus, message: 'Last regression run did not pass.', gateResults: info.gates };
      }
      break;
    }
  }

  // All checks passed — promote
  await updateVersionStatus(pool, promptId, version, targetStatus, userId);
  return { success: true, newStatus: targetStatus, message: `Promoted to ${targetStatus}`, gateResults: info.gates };
}

async function updateVersionStatus(
  pool: Pool, promptId: string, version: string,
  status: VersionStatus, userId?: string
): Promise<void> {
  await pool.query(
    `UPDATE prompt_versions
     SET status = $1, promoted_at = now(), promoted_by = $2::uuid
     WHERE prompt_id = $3::uuid AND version = $4`,
    [status, userId || null, promptId, version]
  );
}
