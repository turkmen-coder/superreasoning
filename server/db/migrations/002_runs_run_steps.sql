-- Migration: runs genişletme + run_steps + audit_logs + stripe_subscription_id
-- BUILD MASTER PROMPT SaaS gereksinimleri
-- Çalıştırma: psql $DATABASE_URL -f server/db/migrations/002_runs_run_steps.sql

-- runs tablosu genişletme
ALTER TABLE runs ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS intent_raw TEXT;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS intent_compressed TEXT;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS framework TEXT;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS domain_id TEXT;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE runs ADD COLUMN IF NOT EXISTS timings JSONB;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS cost_estimate NUMERIC(10,6);

-- status constraint (PostgreSQL 9.4+ için)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'runs_status_check'
  ) THEN
    ALTER TABLE runs ADD CONSTRAINT runs_status_check
      CHECK (status IN ('pending', 'running', 'completed', 'failed'));
  END IF;
END $$;

-- run_steps tablosu
CREATE TABLE IF NOT EXISTS run_steps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id     UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  step_name  TEXT NOT NULL,
  input      TEXT,
  output     TEXT,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  metrics    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_run_steps_run ON run_steps(run_id);

-- audit_logs tablosu
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  target     TEXT,
  meta       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs(org_id, created_at DESC);

-- organizations: Stripe subscription
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- usage: unique for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'usage_org_period_unique'
  ) THEN
    ALTER TABLE usage ADD CONSTRAINT usage_org_period_unique UNIQUE (org_id, period_start);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
