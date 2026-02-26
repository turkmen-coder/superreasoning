-- Multi-tenant şema — docs/MULTI_TENANCY_AND_KEYS.md ile uyumlu.
-- Tenant = Organization; tüm içerik org_id (ve gerekiyorsa project_id) ile izole edilir.

-- Tenant (Organization)
CREATE TABLE IF NOT EXISTS organizations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  slug                  TEXT NOT NULL UNIQUE,
  plan                  TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
  stripe_subscription_id TEXT,
  stripe_customer_id    TEXT,
  settings              JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Kullanıcılar
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  auth_provider TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Org üyeliği ve rol
CREATE TABLE IF NOT EXISTS org_members (
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

-- Projeler (org altında)
CREATE TABLE IF NOT EXISTS projects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, slug)
);

-- Prompt başlık (güncel sürüm referansı için)
CREATE TABLE IF NOT EXISTS prompts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  name        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, external_id)
);

-- Prompt sürümleri
CREATE TABLE IF NOT EXISTS prompt_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id     UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  version       TEXT NOT NULL,
  master_prompt TEXT NOT NULL,
  reasoning     TEXT,
  meta          JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (prompt_id, version)
);

-- Workflow tanımları (pipeline preset)
CREATE TABLE IF NOT EXISTS workflows (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  slug       TEXT,
  config     JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Çalıştırma geçmişi (audit + history)
CREATE TABLE IF NOT EXISTS runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  workflow_id       UUID REFERENCES workflows(id) ON DELETE SET NULL,
  project_id        UUID REFERENCES projects(id) ON DELETE SET NULL,
  intent            TEXT,
  intent_raw        TEXT,
  intent_compressed TEXT,
  framework         TEXT,
  domain_id         TEXT,
  provider          TEXT,
  model             TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  step_outputs      JSONB,
  timings           JSONB,
  cost_estimate     NUMERIC(10,6),
  token_usage       BIGINT DEFAULT 0,
  request_usage     INT DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Run adımları (orchestrator pipeline)
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

-- Audit log
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

-- Ek dosyalar (object storage key)
CREATE TABLE IF NOT EXISTS attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  run_id      UUID REFERENCES runs(id) ON DELETE SET NULL,
  prompt_id   UUID REFERENCES prompts(id) ON DELETE SET NULL,
  storage_key TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Style profiles (Interactive Teaching Mode)
CREATE TABLE IF NOT EXISTS style_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  description TEXT,
  examples    JSONB NOT NULL DEFAULT '[]',
  tone_keywords JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BYOK: şifreli API key (org veya user)
CREATE TABLE IF NOT EXISTS api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  provider     TEXT NOT NULL CHECK (provider IN ('gemini', 'groq', 'claude', 'openrouter', 'hf')),
  encrypted_key TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (org_id IS NOT NULL OR user_id IS NOT NULL)
);

-- Metered billing: org kullanımı
CREATE TABLE IF NOT EXISTS usage (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan          TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'team')),
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  token_count   BIGINT NOT NULL DEFAULT 0,
  request_count INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, period_start)
);

-- Custom Domains (kullanıcı tanımlı uzmanlık alanları)
CREATE TABLE IF NOT EXISTS custom_domains (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain_id   TEXT NOT NULL,
  name        TEXT NOT NULL,
  icon        TEXT DEFAULT '🔧',
  description TEXT,
  context_rules TEXT NOT NULL,
  is_public   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, domain_id)
);
CREATE INDEX IF NOT EXISTS idx_custom_domains_org ON custom_domains(org_id);

-- Custom Frameworks (kullanıcı tanımlı stratejik çerçeveler)
CREATE TABLE IF NOT EXISTS custom_frameworks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  framework_id TEXT NOT NULL,
  name        TEXT NOT NULL,
  icon        TEXT DEFAULT '🔧',
  color       TEXT DEFAULT 'text-gray-400',
  description TEXT,
  focus       TEXT,
  template    TEXT NOT NULL,
  is_public   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, framework_id)
);
CREATE INDEX IF NOT EXISTS idx_custom_frameworks_org ON custom_frameworks(org_id);

-- Unified Prompt Templates (Role-Based Template System)
CREATE TABLE IF NOT EXISTS prompt_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  template_system TEXT NOT NULL,      -- System role content
  template_user   TEXT NOT NULL,      -- User role content
  template_assistant TEXT,            -- Optional assistant role
  variables       JSONB DEFAULT '{}', -- Default variables
  version         TEXT NOT NULL DEFAULT '1.0.0',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  metadata        JSONB DEFAULT '{}', -- category, tags, useCases, etc.
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, name, version)
);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_org ON prompt_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_project ON prompt_templates(project_id);

-- Prompt Benchmarks (auto-test sonuçları)
CREATE TABLE IF NOT EXISTS prompt_benchmarks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prompt_id       UUID REFERENCES prompts(id) ON DELETE CASCADE,
  version         TEXT NOT NULL,
  provider        TEXT NOT NULL,
  model           TEXT,
  judge_score     NUMERIC(5,2),
  lint_passed     BOOLEAN,
  lint_errors     INT DEFAULT 0,
  lint_warnings   INT DEFAULT 0,
  token_count     INT,
  cost_usd        NUMERIC(10,6),
  test_output     TEXT,
  test_passed     BOOLEAN,
  duration_ms     INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_benchmarks_prompt ON prompt_benchmarks(prompt_id, version);
CREATE INDEX IF NOT EXISTS idx_benchmarks_org ON prompt_benchmarks(org_id, created_at DESC);

-- İndeksler (org izolasyonu ve sorgu performansı)
CREATE INDEX IF NOT EXISTS idx_prompts_org ON prompts(org_id);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt ON prompt_versions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_runs_org_created ON runs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_org_period ON usage(org_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Prompt CI/CD — Contract Outputs, Test Cases, Regression Engine, Version Lifecycle
-- ═══════════════════════════════════════════════════════════════════════════════

-- Version lifecycle status
ALTER TABLE prompt_versions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','testing','staging','production','archived')),
  ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promoted_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Output Contracts
CREATE TABLE IF NOT EXISTS prompt_contracts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prompt_id   UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'default',
  description TEXT,
  rules       JSONB NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (prompt_id, name)
);
CREATE INDEX IF NOT EXISTS idx_prompt_contracts_prompt ON prompt_contracts(prompt_id);

-- Golden Test Cases
CREATE TABLE IF NOT EXISTS prompt_test_cases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prompt_id       UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  input_vars      JSONB NOT NULL DEFAULT '{}',
  expected_output TEXT,
  match_mode      TEXT NOT NULL DEFAULT 'contains'
    CHECK (match_mode IN ('exact','contains','regex','semantic','contract')),
  tags            TEXT[] DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  priority        INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prompt_test_cases_prompt ON prompt_test_cases(prompt_id);

-- Regression Runs
CREATE TABLE IF NOT EXISTS regression_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prompt_id    UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  version      TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (trigger_type IN ('manual','on_save','on_promote','scheduled','api')),
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','passed','failed','error')),
  config       JSONB DEFAULT '{}',
  summary      JSONB DEFAULT '{}',
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_regression_runs_prompt ON regression_runs(prompt_id, version);
CREATE INDEX IF NOT EXISTS idx_regression_runs_org ON regression_runs(org_id, created_at DESC);

-- Regression Results
CREATE TABLE IF NOT EXISTS regression_results (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id       UUID NOT NULL REFERENCES regression_runs(id) ON DELETE CASCADE,
  test_type    TEXT NOT NULL
    CHECK (test_type IN ('contract','golden_test','judge_gate','lint_gate','budget_gate','cross_provider')),
  test_case_id UUID REFERENCES prompt_test_cases(id) ON DELETE SET NULL,
  provider     TEXT,
  model        TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','passed','failed','skipped','error')),
  input        TEXT,
  actual_output TEXT,
  expected     TEXT,
  score        NUMERIC(5,2),
  details      JSONB DEFAULT '{}',
  duration_ms  INT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_regression_results_run ON regression_results(run_id);
