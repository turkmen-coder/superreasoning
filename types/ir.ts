/**
 * IR (Intermediate Representation) — Portable, derlenebilir prompt spesifikasyonu.
 * Niyet → IR → model'e özel prompt derleme.
 */

export interface IRGoal {
  id: string;
  description: string;
  priority: number;
}

export type IRConstraintType = 'format' | 'scope' | 'budget' | 'security' | 'output';

export interface IRConstraint {
  type: IRConstraintType;
  rule: string;
}

export interface IRFormatSection {
  id: string;
  max_tokens?: number;
  required: boolean;
  structure?: string[];
}

export interface IRFormatSchema {
  sections: IRFormatSection[];
}

export interface IRExample {
  input: string;
  output_preview?: string;
}

export interface IRToolContract {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface IR {
  version: string;
  intent_raw: string;
  intent_compressed: string;
  framework: string;
  domain_id: string;
  language: 'tr' | 'en';
  context_rules: string;

  goals: IRGoal[];
  constraints: IRConstraint[];
  format_schema: IRFormatSchema;
  security_policies: string[];
  examples: IRExample[];
  tool_contracts: IRToolContract[];
  stop_conditions: string[];
}

export type ProviderType = 'groq' | 'gemini' | 'huggingface' | 'claude' | 'claude-opus' | 'openrouter' | 'deepseek' | 'openai' | 'ollama';

export interface CompiledPrompt {
  system: string;
  user: string;
  provider: ProviderType;
}
