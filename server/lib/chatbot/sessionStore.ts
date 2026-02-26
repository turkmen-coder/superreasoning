/**
 * Chatbot Session Store — In-memory session management with TTL eviction.
 */

import { randomUUID } from 'crypto';
import type { ChatbotSession, ChatbotMessage } from './types';

const sessions = new Map<string, ChatbotSession>();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_MESSAGES = 100;

export function getOrCreateSession(
  sessionId: string | undefined,
  userId: string,
  language: 'en' | 'tr',
): ChatbotSession {
  if (sessionId && sessions.has(sessionId)) {
    const s = sessions.get(sessionId)!;
    s.lastActiveAt = Date.now();
    return s;
  }

  const newSession: ChatbotSession = {
    sessionId: sessionId || randomUUID(),
    userId,
    messages: [],
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    context: { language },
  };
  sessions.set(newSession.sessionId, newSession);
  return newSession;
}

export function addMessage(sessionId: string, message: ChatbotMessage): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.messages.push(message);
  session.lastActiveAt = Date.now();
  // Trim to max
  if (session.messages.length > MAX_MESSAGES) {
    session.messages = session.messages.slice(-MAX_MESSAGES);
  }
}

export function getHistory(sessionId: string, limit = 50): ChatbotMessage[] {
  const session = sessions.get(sessionId);
  if (!session) return [];
  return session.messages.slice(-Math.min(limit, 200));
}

export function clearHistory(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.messages = [];
  return true;
}

export function cleanExpiredSessions(): number {
  const now = Date.now();
  let cleaned = 0;
  for (const [id, session] of sessions) {
    if (now - session.lastActiveAt > SESSION_TTL_MS) {
      sessions.delete(id);
      cleaned++;
    }
  }
  return cleaned;
}

// Clean expired sessions every 5 minutes
setInterval(cleanExpiredSessions, 5 * 60 * 1000);
