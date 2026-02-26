// Unified Prompt Template System - Role-Based Template Architecture

export interface PromptRole {
  role: 'system' | 'user' | 'assistant';
  content: string;
  variables?: Record<string, string>;
}

export interface UnifiedPromptTemplate {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  roles: {
    system: PromptRole;
    user: PromptRole;
    assistant?: PromptRole;
  };
  variables: Record<string, string>;
  version: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PromptTemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  defaultValue?: unknown;
  description?: string;
}

export interface PromptTemplateMetadata {
  category: string;
  tags: string[];
  author?: string;
  useCases: string[];
  supportedProviders?: string[];
}

export type PromptTemplate = UnifiedPromptTemplate & {
  metadata?: PromptTemplateMetadata;
};

export function buildPromptFromTemplate(
  template: UnifiedPromptTemplate,
  variableValues: Record<string, unknown>
): { systemPrompt: string; userPrompt: string } {
  const resolveContent = (content: string, vars: Record<string, unknown>): string => {
    return content.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`;
    });
  };

  const mergedVars = { ...template.variables, ...variableValues };

  return {
    systemPrompt: resolveContent(template.roles.system.content, mergedVars),
    userPrompt: resolveContent(template.roles.user.content, mergedVars),
  };
}
