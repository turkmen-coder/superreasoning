/**
 * Embedding Versioning — Model migration + re-embed pipeline.
 *
 * Tracks embedding model versions and provides a pipeline to re-generate
 * embeddings when the model changes, with zero-downtime dual-read support.
 *
 * Strategies:
 *   1. Incremental re-embed: Process stale embeddings in background batches
 *   2. Dual-read: During migration, search both old and new embeddings
 *   3. Version detection: Auto-flag stale embeddings on model version change
 *
 * @see server/lib/embeddings.ts (embedding generation)
 * @see server/lib/pgvectorStore.ts (vector storage)
 */

import { createHash } from 'crypto';
import type { Pool } from 'pg';
import { getProviderInfo, generateEmbeddings } from './embeddings';

// ── Types ──────────────────────────────────────────────────────────────────

export interface EmbeddingVersionInfo {
  currentModel: string;
  currentDim: number;
  totalEmbeddings: number;
  staleEmbeddings: number;
  upToDate: number;
  stalePercent: number;
  lastMigrationAt?: string;
}

export interface ReembedProgress {
  total: number;
  processed: number;
  failed: number;
  percentComplete: number;
  estimatedRemainingMs: number;
  startedAt: string;
  currentBatch: number;
  totalBatches: number;
}

export interface ReembedResult {
  success: boolean;
  processed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  newModelVersion: string;
}

type ProgressCallback = (progress: ReembedProgress) => void;

// ── Version Utilities ──────────────────────────────────────────────────────

/**
 * Compute a version hash for the current embedding model configuration.
 * Changes when model name, provider, or dimension changes.
 */
export function computeModelVersionHash(): string {
  const info = getProviderInfo();
  const versionString = `${info.provider}:${info.model}:${info.dim}`;
  return createHash('sha256').update(versionString).digest('hex').slice(0, 16);
}

/**
 * Get the current model version identifier.
 */
export function getCurrentModelVersion(): string {
  const info = getProviderInfo();
  return `${info.provider}/${info.model}`;
}

// ── Stale Detection ────────────────────────────────────────────────────────

/**
 * Check embedding version status in the database.
 */
export async function getVersionInfo(pool: Pool): Promise<EmbeddingVersionInfo> {
  const currentModel = getCurrentModelVersion();

  const countResult = await pool.query(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE model_version != $1) as stale,
       COUNT(*) FILTER (WHERE model_version = $1) as up_to_date
     FROM prompt_embeddings`,
    [currentModel]
  );

  const row = countResult.rows[0];
  const total = parseInt(row.total, 10);
  const stale = parseInt(row.stale, 10);
  const upToDate = parseInt(row.up_to_date, 10);

  // Get last migration timestamp
  const lastMigration = await pool.query(
    `SELECT MAX(updated_at) as last_update FROM prompt_embeddings WHERE model_version = $1`,
    [currentModel]
  );

  const info = getProviderInfo();

  return {
    currentModel,
    currentDim: info.dim,
    totalEmbeddings: total,
    staleEmbeddings: stale,
    upToDate,
    stalePercent: total > 0 ? Math.round((stale / total) * 100) : 0,
    lastMigrationAt: lastMigration.rows[0]?.last_update
      ? new Date(lastMigration.rows[0].last_update).toISOString()
      : undefined,
  };
}

/**
 * Mark all embeddings as stale that don't match the current model version.
 * Returns the number of embeddings marked stale.
 */
export async function markStaleEmbeddings(pool: Pool): Promise<number> {
  const currentModel = getCurrentModelVersion();

  const result = await pool.query(
    `UPDATE prompt_embeddings
     SET stale = true
     WHERE model_version != $1 AND (stale IS NULL OR stale = false)
     RETURNING id`,
    [currentModel]
  );

  return result.rowCount ?? 0;
}

// ── Re-embed Pipeline ──────────────────────────────────────────────────────

/**
 * Re-generate stale embeddings in batches.
 *
 * @param pool - Database pool
 * @param batchSize - Number of embeddings to process per batch (default: 50)
 * @param maxBatches - Maximum batches to process (0 = unlimited, default: 0)
 * @param onProgress - Progress callback
 */
export async function reembedStale(
  pool: Pool,
  batchSize: number = 50,
  maxBatches: number = 0,
  onProgress?: ProgressCallback,
): Promise<ReembedResult> {
  const startTime = Date.now();
  const currentModel = getCurrentModelVersion();
  let processed = 0;
  let failed = 0;
  let skipped = 0;
  let batchNumber = 0;

  // Count total stale embeddings
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM prompt_embeddings WHERE model_version != $1`,
    [currentModel]
  );
  const total = parseInt(countResult.rows[0].total, 10);

  if (total === 0) {
    return {
      success: true,
      processed: 0,
      failed: 0,
      skipped: 0,
      durationMs: Date.now() - startTime,
      newModelVersion: currentModel,
    };
  }

  const totalBatches = Math.ceil(total / batchSize);

  while (true) {
    batchNumber++;

    if (maxBatches > 0 && batchNumber > maxBatches) {
      break;
    }

    // Fetch a batch of stale embeddings
    const batch = await pool.query(
      `SELECT id, metadata FROM prompt_embeddings
       WHERE model_version != $1
       ORDER BY updated_at ASC
       LIMIT $2`,
      [currentModel, batchSize]
    );

    if (batch.rows.length === 0) break;

    // Extract text content from metadata for re-embedding
    const ids: string[] = [];
    const texts: string[] = [];

    for (const row of batch.rows) {
      const text = extractTextForEmbedding(row.id, row.metadata);
      if (text) {
        ids.push(row.id);
        texts.push(text);
      } else {
        skipped++;
      }
    }

    if (texts.length === 0) continue;

    try {
      // Generate new embeddings
      const newEmbeddings = await generateEmbeddings(texts);

      // Update in database
      for (let i = 0; i < ids.length; i++) {
        const vectorStr = `[${newEmbeddings[i].join(',')}]`;
        await pool.query(
          `UPDATE prompt_embeddings
           SET embedding = $1::vector,
               model_version = $2,
               stale = false,
               updated_at = now()
           WHERE id = $3`,
          [vectorStr, currentModel, ids[i]]
        );
        processed++;
      }
    } catch {
      failed += texts.length;
      // Continue with next batch despite errors
    }

    // Report progress
    if (onProgress) {
      const elapsed = Date.now() - startTime;
      const rate = processed > 0 ? elapsed / processed : 0;
      const remaining = total - processed - failed - skipped;
      onProgress({
        total,
        processed,
        failed,
        percentComplete: Math.round(((processed + failed + skipped) / total) * 100),
        estimatedRemainingMs: Math.round(remaining * rate),
        startedAt: new Date(startTime).toISOString(),
        currentBatch: batchNumber,
        totalBatches,
      });
    }
  }

  return {
    success: failed === 0,
    processed,
    failed,
    skipped,
    durationMs: Date.now() - startTime,
    newModelVersion: currentModel,
  };
}

/**
 * Extract text content for re-embedding from an embedding's metadata.
 * The metadata should contain the original prompt name/content.
 */
function extractTextForEmbedding(
  id: string,
  metadata: Record<string, unknown>,
): string | null {
  // Try different metadata fields that might contain the text
  const candidates = [
    metadata.name,
    metadata.content,
    metadata.masterPrompt,
    metadata.text,
    metadata.description,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
  }

  // Fallback: use the ID itself (for prompt IDs that are meaningful)
  if (id && id.length > 5) {
    return id;
  }

  return null;
}

// ── Dual-Read Support ──────────────────────────────────────────────────────

/**
 * Search that handles model version transition gracefully.
 * During migration, searches both current and stale embeddings
 * and merges results by relevance.
 */
export async function dualReadSearch(
  pool: Pool,
  queryVector: number[],
  topK: number,
): Promise<Array<{ id: string; similarity: number; metadata: Record<string, unknown>; stale: boolean }>> {
  const vectorStr = `[${queryVector.join(',')}]`;

  // Search all embeddings (both current and stale)
  const result = await pool.query(
    `SELECT id, metadata,
            1 - (embedding <=> $1::vector) as similarity,
            COALESCE(stale, false) as is_stale
     FROM prompt_embeddings
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [vectorStr, topK * 2] // Fetch extra to account for stale entries
  );

  // Sort by similarity, preferring non-stale results at equal similarity
  const rows = result.rows
    .map(r => ({
      id: r.id,
      similarity: parseFloat(r.similarity),
      metadata: r.metadata ?? {},
      stale: r.is_stale,
    }))
    .sort((a, b) => {
      // Primary: similarity (descending)
      const simDiff = b.similarity - a.similarity;
      if (Math.abs(simDiff) > 0.01) return simDiff;
      // Secondary: non-stale preferred
      return (a.stale ? 1 : 0) - (b.stale ? 1 : 0);
    })
    .slice(0, topK);

  return rows;
}
