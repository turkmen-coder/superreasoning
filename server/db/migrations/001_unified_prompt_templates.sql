-- Migration: Create unified prompt_templates table
-- Role-Based Template System
-- Run after schema.sql

BEGIN;

-- Create the new unified prompt_templates table
CREATE TABLE IF NOT EXISTS prompt_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  template_system TEXT NOT NULL,
  template_user   TEXT NOT NULL,
  template_assistant TEXT,
  variables       JSONB DEFAULT '{}',
  version         TEXT NOT NULL DEFAULT '1.0.0',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, name, version)
);

CREATE INDEX IF NOT EXISTS idx_prompt_templates_org ON prompt_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_project ON prompt_templates(project_id);

-- Migrate existing prompts to unified templates (if prompts table has data)
-- This assumes prompts table has system_prompt and user_prompt columns
-- Adjust based on actual schema
INSERT INTO prompt_templates (org_id, project_id, name, template_system, template_user, version)
SELECT 
  p.org_id,
  p.project_id,
  COALESCE(p.name, 'migrated_' || p.id::text),
  COALESCE(pv.master_prompt, ''),
  COALESCE(pv.reasoning, ''),
  COALESCE(pv.version, '1.0.0')
FROM prompts p
LEFT JOIN LATERAL (
  SELECT master_prompt, reasoning, version 
  FROM prompt_versions 
  WHERE prompt_id = p.id 
  ORDER BY created_at DESC 
  LIMIT 1
) pv ON true
ON CONFLICT (org_id, name, version) DO NOTHING;

COMMIT;
