/**
 * Chatbot type definitions — Layered Architecture types.
 */

export type SidebarPage =
  | 'dashboard' | 'prompts' | 'testing' | 'ailab' | 'optimizer'
  | 'vibecoding' | 'genetik' | 'analytics' | 'settings' | 'collaboration'
  | 'marketplace' | 'abtesting' | 'scheduled' | 'webhooks' | 'mobile'
  | 'finetuning' | 'security' | 'export';

export type ChatbotActionType =
  | 'navigate'
  | 'generate'
  | 'search'
  | 'quality_check'
  | 'recommend_framework'
  | 'recommend_domain'
  | 'explain_feature';

export interface ChatbotAction {
  type: ChatbotActionType;
  label: string;
  params: Record<string, unknown>;
}

export interface ChatbotMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  actions?: ChatbotAction[];
}

export interface ChatbotContext {
  currentPage?: SidebarPage;
  currentPrompt?: string;
  domainId?: string;
  framework?: string;
  provider?: string;
  language: 'en' | 'tr';
}

export interface ChatbotSession {
  sessionId: string;
  userId: string;
  messages: ChatbotMessage[];
  createdAt: number;
  lastActiveAt: number;
  context: ChatbotContext;
}

export interface ChatbotResponse {
  sessionId: string;
  reply: string;
  actions: ChatbotAction[];
  suggestions: string[];
}

export interface ActionExecutionResult {
  success: boolean;
  actionType: string;
  result: Record<string, unknown>;
}
