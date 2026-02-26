/**
 * Chatbot Agent — Creates and runs the chatbot agent using @openai/agents SDK.
 */

import { Agent, run } from '@openai/agents';
import { buildChatbotSystemPrompt } from './knowledgeBase';
import { CHATBOT_TOOLS } from './tools';
import type { ChatbotContext, ChatbotResponse, ChatbotMessage, ChatbotAction } from './types';

function createChatbotAgent(language: 'en' | 'tr', context?: ChatbotContext): InstanceType<typeof Agent> {
  const instructions = buildChatbotSystemPrompt(language, context);

  return new Agent({
    name: 'SuperReasoningChatbot',
    instructions,
    model: 'gpt-4o-mini',
    tools: CHATBOT_TOOLS,
  });
}

/**
 * Parse agent output text for structured [ACTIONS] and [SUGGESTIONS] blocks.
 */
function parseAgentOutput(output: string): {
  reply: string;
  actions: ChatbotAction[];
  suggestions: string[];
} {
  const actions: ChatbotAction[] = [];
  const suggestions: string[] = [];

  // Extract [ACTIONS] blocks
  let reply = output.replace(/\[ACTIONS\]([\s\S]*?)\[\/ACTIONS\]/g, (_, block: string) => {
    for (const line of block.trim().split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.type && parsed.label) {
          actions.push(parsed);
        }
      } catch {
        // Not valid JSON action, skip
      }
    }
    return '';
  });

  // Extract [SUGGESTIONS] blocks
  reply = reply.replace(/\[SUGGESTIONS\]([\s\S]*?)\[\/SUGGESTIONS\]/g, (_, block: string) => {
    for (const line of block.trim().split('\n')) {
      const trimmed = line.trim();
      if (trimmed) suggestions.push(trimmed);
    }
    return '';
  });

  // Also extract inline tool-returned actions from the output
  const actionJsonRegex = /\{"type"\s*:\s*"(navigate|generate|search|quality_check|recommend_framework|recommend_domain|explain_feature)"[^}]*\}/g;
  let match: RegExpExecArray | null;
  while ((match = actionJsonRegex.exec(output)) !== null) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed.type && parsed.label && !actions.some(a => a.type === parsed.type && a.label === parsed.label)) {
        actions.push(parsed);
      }
    } catch {
      // skip
    }
  }

  return { reply: reply.trim(), actions, suggestions: suggestions.slice(0, 3) };
}

function fallbackResponse(language: 'en' | 'tr'): ChatbotResponse {
  const reply = language === 'tr'
    ? 'Chatbot şu an kullanılamıyor (OpenAI API anahtarı eksik veya geçersiz). Prompt üretmek için ana ekranı kullanabilirsiniz.'
    : 'Chatbot is currently unavailable (OpenAI API key missing or invalid). Use the main dashboard to generate prompts.';
  return { sessionId: '', reply, actions: [], suggestions: [] };
}

/**
 * Process a chatbot message — builds context from history, runs the agent, parses output.
 */
export async function processChatbotMessage(
  userMessage: string,
  conversationHistory: ChatbotMessage[],
  language: 'en' | 'tr',
  context?: ChatbotContext,
): Promise<ChatbotResponse> {
  const apiKey = process.env.OPENAI_API_KEY ?? '';
  if (!apiKey) return fallbackResponse(language);

  const agent = createChatbotAgent(language, context);

  // Build conversation context from recent history (last 10 messages)
  const recentHistory = conversationHistory.slice(-10);
  let fullQuery = userMessage;

  if (recentHistory.length > 1) {
    const historyMessages = recentHistory.slice(0, -1);
    if (historyMessages.length > 0) {
      const historyContext = historyMessages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 500)}`)
        .join('\n');
      fullQuery = `Previous conversation:\n${historyContext}\n\nUser: ${userMessage}`;
    }
  }

  try {
    const result = await run(agent, fullQuery);
    const parsed = parseAgentOutput(String(result.finalOutput ?? ''));
    return {
      sessionId: '',
      reply: parsed.reply,
      actions: parsed.actions,
      suggestions: parsed.suggestions,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('401') || msg.includes('invalid_api_key') || msg.includes('Incorrect API key')) {
      return fallbackResponse(language);
    }
    throw err;
  }
}
