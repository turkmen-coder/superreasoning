/**
 * IR → Model-agnostic prompt bileşenleri.
 * Backend derleyiciler bu fonksiyonları kullanarak provider'a özel prompt üretir.
 */

import type { IR, CompiledPrompt, ProviderType } from '../../../types/ir';

function buildSystemFromIR(ir: IR): string {
  const lang = ir.language === 'tr' ? 'Turkish' : 'English';
  const goalsText = ir.goals.map((g) => `- ${g.description}`).join('\n');
  const constraintsText = ir.constraints.map((c) => `- [${c.type}] ${c.rule}`).join('\n');
  const securityText = ir.security_policies.map((s) => `- ${s}`).join('\n');
  const stopText = ir.stop_conditions.map((s) => `- ${s}`).join('\n');
  const formatSections = ir.format_schema.sections
    .map((s) => `  - ${s.id}${s.structure ? ` (${s.structure.join(', ')})` : ''}${s.max_tokens ? ` max ${s.max_tokens} tokens` : ''}`)
    .join('\n');

  return `[SYSTEM — SR-MPG v3.1 | IR-based Master Prompt Generator]

Compile the user request into a deterministic, high-performance Master Prompt.
Target Language: ${lang}

GOALS (priority order):
${goalsText}

CONSTRAINTS:
${constraintsText}

SECURITY POLICIES:
${securityText}

STOP CONDITIONS (do not proceed if violated):
${stopText}

OUTPUT FORMAT (strict):
${formatSections}

IMPERATIVE MOOD — MANDATORY: All instructions in the prompt MUST use imperative form.
  CORRECT: "Analyze the request.", "Return only JSON.", "Validate before responding."
  WRONG: "You are an assistant...", "The model should..."

SINGLE TEMPLATE RULE — MANDATORY:
  Do NOT split into ## SYSTEM / ## DEVELOPER / ## USER sections.
  Produce ONE unified prompt block under ## PROMPT only.

Available Frameworks: KERNEL, CO_STAR, RISEN, RTF, BAB, TAG, CARE.
Reply in Markdown only. No JSON.
1) One short reasoning paragraph (2-4 sentences).
2) Blank line.
3) ONE single prompt block under ## PROMPT. No sub-sections.`;
}

function buildUserFromIR(ir: IR): string {
  return `[RUNTIME INPUTS]
USER_INPUT: "${ir.intent_raw}"
CONTEXT: Domain ID: ${ir.domain_id}
Rules: ${ir.context_rules}
I18N: ${ir.language.toUpperCase()}
FRAMEWORK_OVERRIDE: ${ir.framework}
ATTACHMENTS: NO

Reply in Markdown only. First: short reasoning paragraph. Then blank line. Then ONE unified prompt under ## PROMPT. No sub-sections. No JSON.`;
}

/** Groq / HuggingFace / OpenRouter — system + user messages formatı */
export function compileForChat(ir: IR, provider: ProviderType): CompiledPrompt {
  return {
    system: buildSystemFromIR(ir),
    user: buildUserFromIR(ir),
    provider,
  };
}

/** Claude — system ayrı, user ayrı (Anthropic API formatı) */
export function compileForClaude(ir: IR, provider: ProviderType): CompiledPrompt {
  return compileForChat(ir, provider);
}

/** Gemini — system + user tek mesaj (bazı modeller system desteklemez) */
export function compileForGemini(ir: IR, provider: ProviderType): CompiledPrompt {
  const system = buildSystemFromIR(ir);
  const user = buildUserFromIR(ir);
  return {
    system: system + '\n\n' + user,
    user: '',
    provider,
  };
}
