-- Row-Level Security (RLS) + audit + soft delete
-- docs/SAAS_TRANSFORMATION.md ile uyumlu. Tenant = org_id (organizations).

-- 1) Soft delete: prompt_versions için deleted_at
ALTER TABLE prompt_versions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_prompt_versions_deleted ON prompt_versions(prompt_id) WHERE deleted_at IS NULL;

-- 2) Audit log (OWASP: kim, ne zaman, ne yaptı)
CREATE TABLE IF NOT EXISTS audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  resource   TEXT NOT NULL,
  resource_id TEXT,
  old_value  JSONB,
  new_value  JSONB,
  ip         INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_org_created ON audit_log(org_id, created_at DESC);

-- 3) RLS: PostgreSQL Row-Level Security
-- Uygulama her istekte: SET LOCAL app.current_org_id = '<uuid>';
-- RLS politikaları bu session değişkenine göre satır filtreler.

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- organizations: sadece kendi org'unu görebilir
DROP POLICY IF EXISTS org_isolation ON organizations;
CREATE POLICY org_isolation ON organizations
  FOR ALL USING (id::text = current_setting('app.current_org_id', true));

-- prompts: sadece kendi org'unun promptları
DROP POLICY IF EXISTS prompts_org_isolation ON prompts;
CREATE POLICY prompts_org_isolation ON prompts
  FOR ALL USING (org_id::text = current_setting('app.current_org_id', true));

-- prompt_versions: prompt üzerinden org izolasyonu (JOIN prompts ile)
DROP POLICY IF EXISTS prompt_versions_org_isolation ON prompt_versions;
CREATE POLICY prompt_versions_org_isolation ON prompt_versions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM prompts p
      WHERE p.id = prompt_versions.prompt_id
      AND p.org_id::text = current_setting('app.current_org_id', true)
    )
  );

-- runs: org izolasyonu
DROP POLICY IF EXISTS runs_org_isolation ON runs;
CREATE POLICY runs_org_isolation ON runs
  FOR ALL USING (org_id::text = current_setting('app.current_org_id', true));

-- style_profiles: org izolasyonu
DROP POLICY IF EXISTS style_profiles_org_isolation ON style_profiles;
CREATE POLICY style_profiles_org_isolation ON style_profiles
  FOR ALL USING (org_id::text = current_setting('app.current_org_id', true));

-- api_keys: org veya user izolasyonu (BYOK)
DROP POLICY IF EXISTS api_keys_org_isolation ON api_keys;
CREATE POLICY api_keys_org_isolation ON api_keys
  FOR ALL USING (
    (org_id IS NOT NULL AND org_id::text = current_setting('app.current_org_id', true))
    OR (user_id::text = current_setting('app.current_user_id', true))
  );

-- usage: org izolasyonu
DROP POLICY IF EXISTS usage_org_isolation ON usage;
CREATE POLICY usage_org_isolation ON usage
  FOR ALL USING (org_id::text = current_setting('app.current_org_id', true));

-- audit_log: sadece kendi org'unun logları
DROP POLICY IF EXISTS audit_log_org_isolation ON audit_log;
CREATE POLICY audit_log_org_isolation ON audit_log
  FOR ALL USING (org_id::text = current_setting('app.current_org_id', true));

-- Servis hesabı (migration/admin) RLS bypass: superuser veya BYPASSRLS rolü kullanılabilir.
-- Normal uygulama bağlantıları app.current_org_id set ederek çalışır.
