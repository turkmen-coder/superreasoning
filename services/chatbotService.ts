/**
 * Chatbot Service — Frontend API client for the in-app chatbot.
 */

import { getAuthHeaders } from './apiClient';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '') || '/api/v1';

export interface ChatbotAction {
  type: string;
  label: string;
  params: Record<string, unknown>;
}

export interface ChatbotMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  actions?: ChatbotAction[];
}

export interface ChatbotResponse {
  sessionId: string;
  reply: string;
  actions: ChatbotAction[];
  suggestions: string[];
}

export interface ChatbotContext {
  currentPage?: string;
  currentPrompt?: string;
  domainId?: string;
  framework?: string;
  provider?: string;
  language: 'en' | 'tr';
}

/** POST /chatbot/message — Send a message, get AI response */
export async function sendChatbotMessage(
  message: string,
  sessionId?: string,
  context?: ChatbotContext,
): Promise<ChatbotResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/chatbot/message`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId, context }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const errMsg = typeof data.error === 'string'
      ? data.error
      : (data.error?.message ?? data.message ?? `Chatbot error: ${res.status}`);
    throw new Error(errMsg);
  }
  return res.json();
}

/** GET /chatbot/history — Get conversation history */
export async function getChatbotHistory(
  sessionId: string,
  limit = 50,
): Promise<{ sessionId: string; messages: ChatbotMessage[]; totalMessages: number }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/chatbot/history?sessionId=${encodeURIComponent(sessionId)}&limit=${limit}`, {
    headers,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const errMsg = typeof data.error === 'string'
      ? data.error
      : (data.error?.message ?? data.message ?? `History error: ${res.status}`);
    throw new Error(errMsg);
  }
  return res.json();
}

/** DELETE /chatbot/history — Clear conversation history */
export async function clearChatbotHistory(
  sessionId: string,
): Promise<{ cleared: boolean; sessionId: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/chatbot/history?sessionId=${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const errMsg = typeof data.error === 'string'
      ? data.error
      : (data.error?.message ?? data.message ?? `Clear error: ${res.status}`);
    throw new Error(errMsg);
  }
  return res.json();
}
