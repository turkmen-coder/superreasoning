/**
 * Chatbot Routes — 4 endpoints for the in-app chatbot.
 *
 * POST   /chatbot/message   — Send message, get AI response
 * GET    /chatbot/history    — Get conversation history
 * DELETE /chatbot/history    — Clear conversation history
 * POST   /chatbot/action     — Execute a chatbot-suggested action
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { verifySupabaseToken } from '../middleware/supabaseAuth';
import { apiRateLimiter } from '../middleware/rateLimit';
import { processChatbotMessage } from '../lib/chatbot/chatbotAgent';
import { getOrCreateSession, addMessage, getHistory, clearHistory } from '../lib/chatbot/sessionStore';
import type { ChatbotContext, ChatbotMessage } from '../lib/chatbot/types';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

/**
 * Lightweight auth for chatbot — JWT verify only (no DB lookup) or API key.
 * Chatbot uses in-memory sessions, doesn't need DB user provisioning.
 */
async function chatbotAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Try JWT first
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7);
    try {
      const identity = await verifySupabaseToken(token);
      if (identity) {
        req.authUser = {
          userId: identity.userId,
          email: identity.email,
          orgId: null,
          plan: 'free',
          role: null,
          authMethod: 'jwt',
        };
        return next();
      }
    } catch { /* JWT verify failed, fall through */ }
    // JWT present but invalid — still allow chatbot access with anonymous user
    req.authUser = { userId: 'jwt-unverified', email: '', orgId: null, plan: 'free', role: null, authMethod: 'jwt' };
    return next();
  }

  // Try API key
  const apiKey = typeof req.headers['x-api-key'] === 'string' ? req.headers['x-api-key'] : undefined;
  if (apiKey) {
    req.apiKey = apiKey;
    req.authUser = { userId: 'apikey-user', email: '', orgId: null, plan: 'free', role: null, authMethod: 'apikey' };
    return next();
  }

  // Dev bypass
  if (process.env.DISABLE_API_KEY_AUTH === 'true') {
    req.authUser = { userId: 'dev-user', email: '', orgId: null, plan: 'free', role: null, authMethod: 'jwt' };
    return next();
  }

  res.status(401).json({ error: 'Authentication required', code: 'NO_AUTH' });
}

/**
 * POST /chatbot/message
 * Send a message to the chatbot and get an AI-powered response.
 */
router.post('/chatbot/message', apiRateLimiter, chatbotAuth, asyncHandler(async (req, res) => {
    const { message, sessionId, context } = req.body ?? {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message (non-empty string) required' });
    }

    const userId = req.authUser?.userId ?? 'anonymous';
    const language: 'en' | 'tr' = context?.language === 'tr' ? 'tr' : 'en';

    // Get or create session
    const session = getOrCreateSession(sessionId, userId, language);

    // Build context from request
    const chatContext: ChatbotContext | undefined = context
      ? {
          currentPage: context.currentPage,
          currentPrompt: context.currentPrompt,
          domainId: context.domainId,
          framework: context.framework,
          provider: context.provider,
          language,
        }
      : undefined;

    // Add user message to session
    const userMsg: ChatbotMessage = {
      role: 'user',
      content: message.slice(0, 5000),
      timestamp: Date.now(),
    };
    addMessage(session.sessionId, userMsg);

    // Process with AI agent
    const response = await processChatbotMessage(
      message.slice(0, 5000),
      session.messages,
      language,
      chatContext,
    );

    // Add assistant response to session
    const assistantMsg: ChatbotMessage = {
      role: 'assistant',
      content: response.reply,
      timestamp: Date.now(),
      actions: response.actions.length > 0 ? response.actions : undefined,
    };
    addMessage(session.sessionId, assistantMsg);

    res.json({
      sessionId: session.sessionId,
      reply: response.reply,
      actions: response.actions,
      suggestions: response.suggestions,
    });
}));

/**
 * GET /chatbot/history?sessionId=...&limit=50
 * Retrieve conversation history for a session.
 */
router.get('/chatbot/history', apiRateLimiter, chatbotAuth, asyncHandler(async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId query param required' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
    const messages = getHistory(sessionId, limit);

    res.json({
      sessionId,
      messages,
      totalMessages: messages.length,
    });
}));

/**
 * DELETE /chatbot/history?sessionId=...
 * Clear conversation history for a session.
 */
router.delete('/chatbot/history', apiRateLimiter, chatbotAuth, asyncHandler(async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId query param required' });
    }

    const cleared = clearHistory(sessionId);
    res.json({ cleared, sessionId });
}));

/**
 * POST /chatbot/action
 * Execute a chatbot-suggested action server-side.
 */
router.post('/chatbot/action', apiRateLimiter, chatbotAuth, asyncHandler(async (req, res) => {
    const { actionType, params } = req.body ?? {};

    if (!actionType || typeof actionType !== 'string') {
      return res.status(400).json({ error: 'actionType (string) required' });
    }

    const validActions = ['navigate', 'generate', 'search', 'quality_check', 'recommend_framework', 'recommend_domain', 'explain_feature'];
    if (!validActions.includes(actionType)) {
      return res.status(400).json({ error: `Invalid actionType. Valid: ${validActions.join(', ')}` });
    }

    // Most actions are client-side (navigate, generate). Server validates and returns params.
    res.json({
      success: true,
      actionType,
      result: {
        validated: true,
        params: params ?? {},
      },
    });
}));

export default router;
