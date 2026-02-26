/**
 * Backend AI Proxy — All AI provider calls routed through backend.
 * Keeps API keys server-side only (never exposed to browser).
 * Supports: Claude, Gemini, Groq, OpenAI, DeepSeek, OpenRouter, HuggingFace.
 *
 * @route POST /v1/ai/generate
 * @route GET  /v1/ai/providers
 */

import { Router } from 'express';
import { requireAnyAuth } from '../middleware/supabaseAuth';
import { apiRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../lib/asyncHandler';
import { ValidationError, ServiceUnavailableError } from '../../utils/errors';

const router = Router();

/** Provider config — keys read from server-side env only */
interface ProviderConfig {
  name: string;
  envKey: string;
  baseUrl: string;
  defaultModel: string;
}

const PROVIDERS: Record<string, ProviderConfig> = {
  claude: {
    name: 'Claude',
    envKey: 'ANTHROPIC_API_KEY',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-sonnet-4-5-20250929',
  },
  gemini: {
    name: 'Gemini',
    envKey: 'GEMINI_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultModel: 'gemini-2.0-flash',
  },
  groq: {
    name: 'Groq',
    envKey: 'GROQ_API_KEY',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
  },
  openai: {
    name: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o',
  },
  deepseek: {
    name: 'DeepSeek',
    envKey: 'DEEPSEEK_API_KEY',
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-chat',
  },
  openrouter: {
    name: 'OpenRouter',
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'anthropic/claude-sonnet-4-5',
  },
  huggingface: {
    name: 'HuggingFace',
    envKey: 'HUGGING_FACE_HUB_TOKEN',
    baseUrl: 'https://router.huggingface.co/novita/v3/openai/chat/completions',
    defaultModel: 'deepseek/DeepSeek-V3-0324',
  },
};

/** Check which providers have valid keys configured */
function getAvailableProviders(): string[] {
  return Object.entries(PROVIDERS)
    .filter(([, config]) => !!process.env[config.envKey])
    .map(([id]) => id);
}

/**
 * GET /v1/ai/providers — List available providers for the current deployment.
 */
router.get(
  '/ai/providers',
  requireAnyAuth,
  asyncHandler(async (_req, res) => {
    const available = getAvailableProviders();
    const providers = available.map((id) => ({
      id,
      name: PROVIDERS[id].name,
      defaultModel: PROVIDERS[id].defaultModel,
    }));
    res.json({ data: providers });
  }),
);

/**
 * POST /v1/ai/generate — Proxy AI generation through backend.
 * Body: { provider, model?, messages, maxTokens?, temperature? }
 */
router.post(
  '/ai/generate',
  requireAnyAuth,
  apiRateLimiter,
  asyncHandler(async (req, res) => {
    const { provider, model, messages, maxTokens = 4096, temperature = 0.7 } = req.body;

    if (!provider || typeof provider !== 'string') {
      throw new ValidationError('provider is required');
    }
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new ValidationError('messages array is required and must not be empty');
    }

    const config = PROVIDERS[provider];
    if (!config) {
      throw new ValidationError(`Unknown provider: ${provider}. Available: ${Object.keys(PROVIDERS).join(', ')}`);
    }

    const apiKey = process.env[config.envKey];
    if (!apiKey) {
      throw new ServiceUnavailableError(`${config.name} API key not configured on server`);
    }

    const selectedModel = model || config.defaultModel;

    // Route to provider-specific format
    let response: Response;

    if (provider === 'claude') {
      response = await fetch(config.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: selectedModel,
          max_tokens: maxTokens,
          temperature,
          messages,
        }),
      });
    } else if (provider === 'gemini') {
      const geminiUrl = `${config.baseUrl}/${selectedModel}:generateContent?key=${apiKey}`;
      const geminiMessages = messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
      response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        }),
      });
    } else {
      // OpenAI-compatible format (Groq, OpenAI, DeepSeek, OpenRouter, HuggingFace)
      response = await fetch(config.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      });
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ServiceUnavailableError(
        `${config.name} API returned ${response.status}: ${errorBody.slice(0, 200)}`,
      );
    }

    const data = await response.json();
    res.json({ data, provider, model: selectedModel });
  }),
);

export default router;
