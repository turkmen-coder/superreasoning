-- Signed Release Signatures + A/B Tests + Embedding Versioning
-- Run this migration after 001-pgvector.sql
--
-- Adds:
--   1. release_signatures — cryptographic hash chain for prompt versions
--   2. ab_tests — A/B test experiment tracking
--   3. ab_test_variants — individual variant results
--   4. Embedding model_version index for versioning

-- 1. Signed Release Signatures
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

-- 2. A/B Test Experiments
CREATE TABLE IF NOT EXISTS ab_tests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL,
  prompt_id       TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'cancelled')),
  variant_a       JSONB NOT NULL,           -- { version, provider, model, config }
  variant_b       JSONB NOT NULL,           -- { version, provider, model, config }
  metrics         TEXT[] NOT NULL DEFAULT '{judge_score,latency_ms,token_count,cost_usd}',
  sample_size     INTEGER NOT NULL DEFAULT 10,
  created_by      UUID REFERENCES users(id),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ab_tests_org ON ab_tests (org_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_prompt ON ab_tests (prompt_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests (status);

-- 3. A/B Test Variant Results
CREATE TABLE IF NOT EXISTS ab_test_variants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id         UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant         TEXT NOT NULL CHECK (variant IN ('A', 'B')),
  sample_index    INTEGER NOT NULL,
  output          TEXT,
  metrics         JSONB NOT NULL DEFAULT '{}',
  provider        TEXT,
  model           TEXT,
  duration_ms     INTEGER,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ab_variants_test ON ab_test_variants (test_id, variant);

-- 4. Embedding versioning support
ALTER TABLE prompt_embeddings ADD COLUMN IF NOT EXISTS embed_version_hash TEXT;
ALTER TABLE prompt_embeddings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE prompt_embeddings ADD COLUMN IF NOT EXISTS stale BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_prompt_embeddings_stale
  ON prompt_embeddings (stale) WHERE stale = true;
