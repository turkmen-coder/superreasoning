/**
 * Signed Release Engine — Content hashing + signature + provenance chain.
 *
 * Uses SHA-256 for content integrity and a hash chain for tamper-evidence.
 * No external KMS dependency — uses Node.js built-in crypto module.
 *
 * @see types/signedRelease.ts
 */

import { createHash, randomUUID } from 'crypto';
import type { Pool } from 'pg';
import type {
  ContentHash,
  ReleaseSignature,
  SignResult,
  VerifyResult,
  ProvenanceChain,
  ProvenanceChainEntry,
} from '../../types/signedRelease';

// ── Hashing ────────────────────────────────────────────────────────────────

/**
 * Compute SHA-256 hash of prompt content + metadata.
 */
export function computeContentHash(
  content: string,
  metadata?: Record<string, unknown>,
): ContentHash {
  const hasher = createHash('sha256');
  hasher.update(content);

  if (metadata) {
    // Sort keys for deterministic hashing
    const sortedMeta = JSON.stringify(metadata, Object.keys(metadata).sort());
    hasher.update(sortedMeta);
  }

  return {
    algorithm: 'sha256',
    hash: hasher.digest('hex'),
    scope: metadata ? 'content+metadata' : 'content',
  };
}

/**
 * Compute chain hash: SHA-256(previousHash + currentHash).
 */
function computeChainHash(previousHash: string, currentHash: string): string {
  return createHash('sha256')
    .update(previousHash)
    .update(currentHash)
    .digest('hex');
}

// ── Sign ───────────────────────────────────────────────────────────────────

/**
 * Sign a prompt version for production release.
 *
 * Creates a content hash, stores the signature in DB, and links
 * to the provenance chain.
 */
export async function signRelease(
  pool: Pool,
  promptId: string,
  version: string,
  content: string,
  userId: string,
  userEmail?: string,
  metadata?: ReleaseSignature['metadata'],
  approvalId?: string,
): Promise<SignResult> {
  try {
    // Compute content hash
    const contentHash = computeContentHash(content, metadata as Record<string, unknown> | undefined);

    const signatureId = randomUUID();
    const signedAt = new Date().toISOString();

    // Get previous chain hash (if any)
    const prevRow = await pool.query(
      `SELECT chain_hash FROM release_signatures
       WHERE prompt_id = $1 ORDER BY signed_at DESC LIMIT 1`,
      [promptId]
    );
    const previousChainHash = prevRow.rows.length > 0
      ? prevRow.rows[0].chain_hash
      : '0'.repeat(64); // Genesis hash

    const chainHash = computeChainHash(previousChainHash, contentHash.hash);

    // Store signature
    await pool.query(
      `INSERT INTO release_signatures
         (id, prompt_id, version, content_hash, hash_algorithm, hash_scope,
          signed_by, signed_by_email, signed_at, approval_id, metadata, chain_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10, $11::jsonb, $12)`,
      [
        signatureId, promptId, version,
        contentHash.hash, contentHash.algorithm, contentHash.scope,
        userId, userEmail ?? null, signedAt,
        approvalId ?? null,
        JSON.stringify(metadata ?? {}),
        chainHash,
      ]
    );

    const signature: ReleaseSignature = {
      id: signatureId,
      promptId,
      version,
      contentHash,
      signedBy: userId,
      signedByEmail: userEmail,
      signedAt,
      approvalId,
      verified: true,
      metadata: metadata ?? {},
    };

    return { success: true, signature };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Verify ─────────────────────────────────────────────────────────────────

/**
 * Verify that current content matches the signed release hash.
 */
export async function verifyRelease(
  pool: Pool,
  promptId: string,
  version: string,
  currentContent: string,
): Promise<VerifyResult> {
  // Load stored signature
  const row = await pool.query(
    `SELECT id, prompt_id, version, content_hash, hash_algorithm, hash_scope,
            signed_by, signed_by_email, signed_at, approval_id, metadata
     FROM release_signatures
     WHERE prompt_id = $1 AND version = $2
     ORDER BY signed_at DESC LIMIT 1`,
    [promptId, version]
  );

  if (row.rows.length === 0) {
    return { verified: false, reason: 'no_signature' };
  }

  const r = row.rows[0];
  const storedHash = r.content_hash;
  const scope = r.hash_scope;

  // Recompute hash from current content
  const metadata = scope === 'content+metadata' ? r.metadata : undefined;
  const currentHash = computeContentHash(currentContent, metadata);

  if (currentHash.hash !== storedHash) {
    return {
      verified: false,
      reason: 'hash_mismatch',
      details: {
        expectedHash: storedHash,
        actualHash: currentHash.hash,
      },
    };
  }

  const signature: ReleaseSignature = {
    id: r.id,
    promptId: r.prompt_id,
    version: r.version,
    contentHash: { algorithm: r.hash_algorithm, hash: storedHash, scope },
    signedBy: r.signed_by,
    signedByEmail: r.signed_by_email,
    signedAt: new Date(r.signed_at).toISOString(),
    approvalId: r.approval_id,
    verified: true,
    metadata: r.metadata ?? {},
  };

  return { verified: true, signature };
}

// ── Provenance Chain ───────────────────────────────────────────────────────

/**
 * Build the full provenance chain for a prompt.
 */
export async function getProvenanceChain(
  pool: Pool,
  promptId: string,
): Promise<ProvenanceChain> {
  // Load all signatures for this prompt, ordered by time
  const rows = await pool.query(
    `SELECT rs.id, rs.version, rs.content_hash, rs.hash_algorithm, rs.hash_scope,
            rs.signed_by, rs.signed_by_email, rs.signed_at, rs.approval_id,
            rs.metadata, rs.chain_hash,
            pv.status as version_status
     FROM release_signatures rs
     LEFT JOIN prompt_versions pv ON pv.prompt_id = rs.prompt_id AND pv.version = rs.version
     WHERE rs.prompt_id = $1
     ORDER BY rs.signed_at ASC`,
    [promptId]
  );

  const entries: ProvenanceChainEntry[] = [];
  let chainValid = true;
  let previousChainHash = '0'.repeat(64); // Genesis

  for (const r of rows.rows) {
    const expectedChainHash = computeChainHash(previousChainHash, r.content_hash);

    if (r.chain_hash !== expectedChainHash) {
      chainValid = false;
    }

    const gateResults = r.metadata?.gateResults;

    entries.push({
      version: r.version,
      status: r.version_status ?? 'unknown',
      signature: {
        id: r.id,
        promptId,
        version: r.version,
        contentHash: {
          algorithm: r.hash_algorithm,
          hash: r.content_hash,
          scope: r.hash_scope,
        },
        signedBy: r.signed_by,
        signedByEmail: r.signed_by_email,
        signedAt: new Date(r.signed_at).toISOString(),
        approvalId: r.approval_id,
        verified: r.chain_hash === expectedChainHash,
        metadata: r.metadata ?? {},
      },
      promotedBy: r.signed_by,
      promotedAt: new Date(r.signed_at).toISOString(),
      gatesPassed: gateResults
        ? !!(gateResults.judge?.passed && gateResults.lint?.passed && gateResults.contract?.passed)
        : false,
    });

    previousChainHash = r.chain_hash;
  }

  const lastChainHash = rows.rows.length > 0
    ? rows.rows[rows.rows.length - 1].chain_hash
    : '0'.repeat(64);

  return {
    promptId,
    entries,
    chainHash: lastChainHash,
    chainValid,
  };
}

// ── Migration SQL ──────────────────────────────────────────────────────────

/**
 * SQL to create the release_signatures table.
 * Run via: psql -f server/db/migrations/002-signed-releases.sql
 */
export const MIGRATION_SQL = `
-- Signed Release Signatures table
CREATE TABLE IF NOT EXISTS release_signatures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id       TEXT NOT NULL,
  version         TEXT NOT NULL,
  content_hash    TEXT NOT NULL,
  hash_algorithm  TEXT NOT NULL DEFAULT 'sha256',
  hash_scope      TEXT NOT NULL DEFAULT 'content',
  signed_by       UUID REFERENCES users(id),
  signed_by_email TEXT,
  signed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  approval_id     UUID,
  metadata        JSONB NOT NULL DEFAULT '{}',
  chain_hash      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_release_signatures_prompt
  ON release_signatures (prompt_id, version);

CREATE INDEX IF NOT EXISTS idx_release_signatures_chain
  ON release_signatures (prompt_id, signed_at);
`;
