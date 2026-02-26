-- pgvector extension + prompt_embeddings table
-- Run this migration to enable vector search in PostgreSQL.
--
-- Prerequisites:
--   PostgreSQL 15+ with pgvector extension installed.
--   e.g. on Ubuntu: sudo apt install postgresql-15-pgvector
--   or via Docker: ankane/pgvector

-- 1. Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Embeddings table
CREATE TABLE IF NOT EXISTS prompt_embeddings (
  id            TEXT PRIMARY KEY,
  embedding     vector(1536),           -- text-embedding-3-small default dimension
  metadata      JSONB NOT NULL DEFAULT '{}',
  model_version TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. IVFFlat index for approximate nearest neighbor search
-- lists=100 is good for up to ~50K embeddings. Scale with sqrt(N).
CREATE INDEX IF NOT EXISTS idx_prompt_embeddings_cosine
  ON prompt_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 4. GIN index for metadata filtering (language, category, tags)
CREATE INDEX IF NOT EXISTS idx_prompt_embeddings_metadata
  ON prompt_embeddings USING gin (metadata jsonb_path_ops);

-- 5. Index for stale embedding detection (model version changes)
CREATE INDEX IF NOT EXISTS idx_prompt_embeddings_model
  ON prompt_embeddings (model_version);

-- 6. RBAC: Update org_members role constraint to include editor/viewer
ALTER TABLE org_members DROP CONSTRAINT IF EXISTS org_members_role_check;
ALTER TABLE org_members ADD CONSTRAINT org_members_role_check
  CHECK (role IN ('owner', 'admin', 'editor', 'viewer', 'member'));

-- 7. Prompt packs table (for Prompt Pack v1)
CREATE TABLE IF NOT EXISTS prompt_packs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  prompt_ids  TEXT[] NOT NULL DEFAULT '{}',
  visibility  TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'org', 'public')),
  tags        TEXT[] NOT NULL DEFAULT '{}',
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prompt_packs_org ON prompt_packs (org_id);
CREATE INDEX IF NOT EXISTS idx_prompt_packs_visibility ON prompt_packs (visibility);

-- 8. Version approvals table (approval workflow)
CREATE TABLE IF NOT EXISTS version_approvals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id           UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  version             TEXT NOT NULL,
  from_status         TEXT NOT NULL,
  to_status           TEXT NOT NULL,
  requested_by        UUID REFERENCES users(id),
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  required_approvers  INTEGER NOT NULL DEFAULT 1,
  approvals           JSONB NOT NULL DEFAULT '[]',
  gate_results        JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_version_approvals_prompt ON version_approvals (prompt_id, version);
CREATE INDEX IF NOT EXISTS idx_version_approvals_status ON version_approvals (status);
