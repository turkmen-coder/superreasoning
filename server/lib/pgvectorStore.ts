/**
 * PgVector Backend — PostgreSQL + pgvector extension for vector search.
 *
 * Requires:
 *   CREATE EXTENSION IF NOT EXISTS vector;
 *   Table: prompt_embeddings (id TEXT PK, vector vector(N), metadata JSONB, updated_at TIMESTAMPTZ)
 *
 * Implements VectorStoreBackend interface for drop-in replacement.
 */

import type { Pool } from 'pg';
import type { VectorDoc, SearchResult, VectorStoreBackend } from './vectorStore';

// ── SQL Setup ──────────────────────────────────────────────────────────────

const SETUP_SQL = `
  CREATE EXTENSION IF NOT EXISTS vector;

  CREATE TABLE IF NOT EXISTS prompt_embeddings (
    id            TEXT PRIMARY KEY,
    embedding     vector,
    metadata      JSONB NOT NULL DEFAULT '{}',
    model_version TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_prompt_embeddings_cosine
    ON prompt_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

  CREATE INDEX IF NOT EXISTS idx_prompt_embeddings_metadata
    ON prompt_embeddings USING gin (metadata jsonb_path_ops);
`;

// ── PgVector Store Class ───────────────────────────────────────────────────

export class PgVectorStore implements VectorStoreBackend {
  readonly name = 'pgvector';
  private pool: Pool;
  private dimension: number;
  private ready = false;
  private docCount = 0;
  private modelVersion: string;

  constructor(pool: Pool, dimension: number = 1536, modelVersion: string = 'text-embedding-3-small') {
    this.pool = pool;
    this.dimension = dimension;
    this.modelVersion = modelVersion;
  }

  async init(): Promise<void> {
    try {
      // Setup tables and extensions
      await this.pool.query(SETUP_SQL);

      // Get current count
      const result = await this.pool.query('SELECT COUNT(*) as cnt FROM prompt_embeddings');
      this.docCount = parseInt(result.rows[0].cnt, 10);
      this.ready = true;

      console.log(`[PgVectorStore] Initialized (${this.docCount} embeddings, dim=${this.dimension})`);
    } catch (e: any) {
      console.error('[PgVectorStore] Init failed:', e.message);
      throw e;
    }
  }

  async upsert(docs: VectorDoc[]): Promise<number> {
    if (!this.ready) throw new Error('PgVectorStore not initialized');
    if (docs.length === 0) return 0;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const doc of docs) {
        // Format vector as pgvector literal: [0.1,0.2,...]
        const vectorStr = `[${doc.vector.join(',')}]`;

        await client.query(
          `INSERT INTO prompt_embeddings (id, embedding, metadata, model_version, updated_at)
           VALUES ($1, $2::vector, $3::jsonb, $4, now())
           ON CONFLICT (id) DO UPDATE SET
             embedding = EXCLUDED.embedding,
             metadata = EXCLUDED.metadata,
             model_version = EXCLUDED.model_version,
             updated_at = now()`,
          [doc.id, vectorStr, JSON.stringify(doc.metadata), this.modelVersion]
        );
      }

      await client.query('COMMIT');
      this.docCount += docs.length; // Approximate; refresh on next count()
      return docs.length;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async search(queryVector: number[], topK: number): Promise<SearchResult[]> {
    if (!this.ready) throw new Error('PgVectorStore not initialized');

    const vectorStr = `[${queryVector.join(',')}]`;

    // Use cosine distance operator <=> (returns distance, we convert to similarity)
    const result = await this.pool.query(
      `SELECT id, metadata, 1 - (embedding <=> $1::vector) as similarity
       FROM prompt_embeddings
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [vectorStr, topK]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      score: Math.round(row.similarity * 10000) / 10000,
      metadata: row.metadata as VectorDoc['metadata'],
    }));
  }

  /** Search with metadata filter (language, category) */
  async searchFiltered(
    queryVector: number[],
    topK: number,
    filters: { lang?: string; category?: string },
  ): Promise<SearchResult[]> {
    if (!this.ready) throw new Error('PgVectorStore not initialized');

    const vectorStr = `[${queryVector.join(',')}]`;
    const conditions: string[] = [];
    const params: any[] = [vectorStr, topK];
    let paramIdx = 3;

    if (filters.lang) {
      conditions.push(`metadata->>'lang' = $${paramIdx}`);
      params.push(filters.lang);
      paramIdx++;
    }

    if (filters.category) {
      conditions.push(`metadata->>'category' = $${paramIdx}`);
      params.push(filters.category);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.pool.query(
      `SELECT id, metadata, 1 - (embedding <=> $1::vector) as similarity
       FROM prompt_embeddings
       ${whereClause}
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      params
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      score: Math.round(row.similarity * 10000) / 10000,
      metadata: row.metadata as VectorDoc['metadata'],
    }));
  }

  count(): number {
    return this.docCount;
  }

  isReady(): boolean {
    return this.ready;
  }

  /** Refresh the doc count from DB */
  async refreshCount(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) as cnt FROM prompt_embeddings');
    this.docCount = parseInt(result.rows[0].cnt, 10);
    return this.docCount;
  }

  /** Delete embeddings by ID */
  async delete(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await this.pool.query(
      `DELETE FROM prompt_embeddings WHERE id = ANY($1::text[])`,
      [ids]
    );
    this.docCount = Math.max(0, this.docCount - (result.rowCount ?? 0));
    return result.rowCount ?? 0;
  }

  /** Get embeddings that need re-embedding (model version mismatch) */
  async getStaleEmbeddings(currentModel: string, limit: number = 100): Promise<string[]> {
    const result = await this.pool.query(
      `SELECT id FROM prompt_embeddings WHERE model_version != $1 LIMIT $2`,
      [currentModel, limit]
    );
    return result.rows.map((r: any) => r.id);
  }
}
