/**
 * PyParsing-inspired Prompt Parser Engine.
 *
 * Combinator tabanlı recursive-descent parser:
 *   - Gramer tanımları ile prompt yapısını parse eder
 *   - AST (Abstract Syntax Tree) oluşturur
 *   - Değişken çıkarımı, format dönüşümü, kalite metrikleri
 *
 * @see https://pyparsing-docs.readthedocs.io — esinlenme kaynağı
 */

import type {
  Parser,
  ParseResult,
  PromptAST,
  PromptASTNode,
  PromptASTStatistics,
  PromptNodeType,
  VariableStyle,
  ExtractedVariable,
  VariableExtractionResult,
  TransformationType,
  TransformResult,
  PromptQualityMetrics,
} from '../types/promptParser';

// ======================================================================
// SECTION 1: Parser Combinator Primitives
// ======================================================================

function ok<T>(value: T, position: number, length: number, named: Record<string, unknown> = {}): ParseResult<T> {
  return { success: true, value, rest: '', position, length, named };
}

function fail<T>(position: number): ParseResult<T> {
  return { success: false, value: '' as unknown as T, rest: '', position, length: 0, named: {} };
}

/** Exact string match (PyParsing Literal) */
export function literal(s: string, caseInsensitive = false): Parser<string> {
  return (input, pos) => {
    const slice = input.slice(pos, pos + s.length);
    const match = caseInsensitive ? slice.toLowerCase() === s.toLowerCase() : slice === s;
    if (match) return ok(slice, pos + s.length, s.length);
    return fail(pos);
  };
}

/** Regex match at current position (PyParsing Regex) */
export function regex(pattern: RegExp): Parser<string[]> {
  return (input, pos) => {
    const sub = input.slice(pos);
    const anchored = new RegExp('^(?:' + pattern.source + ')', pattern.flags.replace('g', ''));
    const m = sub.match(anchored);
    if (m) {
      const groups = Array.from(m);
      return ok(groups, pos + m[0].length, m[0].length);
    }
    return fail(pos);
  };
}

/** Sequential combinator — all parsers must match in order (PyParsing And / +) */
export function seq<T>(...parsers: Parser<T>[]): Parser<T[]> {
  return (input, pos) => {
    const values: T[] = [];
    let cur = pos;
    let totalLen = 0;
    const allNamed: Record<string, unknown> = {};
    for (const p of parsers) {
      const r = p(input, cur);
      if (!r.success) return fail(pos);
      values.push(r.value);
      cur = r.position;
      totalLen += r.length;
      Object.assign(allNamed, r.named);
    }
    return { success: true, value: values, rest: input.slice(cur), position: cur, length: totalLen, named: allNamed };
  };
}

/** Alternation combinator — first match wins (PyParsing Or / |) */
export function alt<T>(...parsers: Parser<T>[]): Parser<T> {
  return (input, pos) => {
    for (const p of parsers) {
      const r = p(input, pos);
      if (r.success) return r;
    }
    return fail(pos);
  };
}

/** Optional match (PyParsing Optional) */
export function optional<T>(parser: Parser<T>, defaultValue?: T): Parser<T | undefined> {
  return (input, pos) => {
    const r = parser(input, pos);
    if (r.success) return r;
    return ok(defaultValue, pos, 0);
  };
}

/** Zero or more (PyParsing ZeroOrMore) */
export function many<T>(parser: Parser<T>): Parser<T[]> {
  return (input, pos) => {
    const values: T[] = [];
    let cur = pos;
    let totalLen = 0;
    while (cur < input.length) {
      const r = parser(input, cur);
      if (!r.success || r.length === 0) break;
      values.push(r.value);
      cur = r.position;
      totalLen += r.length;
    }
    return ok(values, cur, totalLen);
  };
}

/** Transform result (PyParsing setParseAction) */
export function map<A, B>(parser: Parser<A>, fn: (a: A, pos: number) => B): Parser<B> {
  return (input, pos) => {
    const r = parser(input, pos);
    if (!r.success) return fail(pos);
    return { ...r, value: fn(r.value, pos) } as ParseResult<B>;
  };
}

/** Scan input for all matches (PyParsing scanString) */
export function scanString<T>(parser: Parser<T>, input: string): Array<{
  value: T;
  start: number;
  end: number;
  named: Record<string, unknown>;
}> {
  const results: Array<{ value: T; start: number; end: number; named: Record<string, unknown> }> = [];
  let pos = 0;
  const maxPos = Math.min(input.length, 50000); // safety limit
  while (pos < maxPos) {
    const r = parser(input, pos);
    if (r.success && r.length > 0) {
      results.push({ value: r.value, start: pos, end: pos + r.length, named: r.named });
      pos += r.length;
    } else {
      pos++;
    }
  }
  return results;
}

// ======================================================================
// SECTION 2: Prompt Grammar Definitions
// ======================================================================

/** Helper: line-start aware regex — matches pattern only at start of a line */
function lineRegex(pattern: RegExp): Parser<string[]> {
  return (input, pos) => {
    if (pos > 0 && input[pos - 1] !== '\n') return fail(pos);
    return regex(pattern)(input, pos);
  };
}

// --- Role Definition ---
const rolePatterns: Parser<PromptASTNode>[] = [
  map(regex(/you are (?:a|an) (.+?)(?:\.|,|\n|$)/i), (m, p) =>
    makeNode('role_definition', m[1], p, m[0].length, 0.95, { style: 'you_are' })),
  map(regex(/act as (?:a|an) (.+?)(?:\.|,|\n|$)/i), (m, p) =>
    makeNode('role_definition', m[1], p, m[0].length, 0.90, { style: 'act_as' })),
  map(regex(/your role is (.+?)(?:\.|,|\n|$)/i), (m, p) =>
    makeNode('role_definition', m[1], p, m[0].length, 0.90, { style: 'your_role' })),
  map(regex(/as (?:a|an) (.+?),/i), (m, p) =>
    makeNode('role_definition', m[1], p, m[0].length, 0.70, { style: 'as_a' })),
  map(regex(/sen bir (.+?)(?:sin|sunuz|sın|\.)/i), (m, p) =>
    makeNode('role_definition', m[1], p, m[0].length, 0.90, { style: 'sen_bir' })),
  map(regex(/(.+?) olarak davran/i), (m, p) =>
    makeNode('role_definition', m[1], p, m[0].length, 0.85, { style: 'olarak_davran' })),
  map(regex(/role:\s*(.+?)(?:\n|$)/i), (m, p) =>
    makeNode('role_definition', m[1], p, m[0].length, 0.90, { style: 'role_label' })),
];
const roleParser: Parser<PromptASTNode> = alt(...rolePatterns);

// --- Section Headers ---
const sectionPatterns: Parser<PromptASTNode>[] = [
  map(lineRegex(/(#{1,6})\s+(.+)$/m), (m, p) =>
    makeNode('section', m[2], p, m[0].length, 0.95, { style: `markdown_h${m[1].length}`, level: m[1].length })),
  map(lineRegex(/\*\*(.+?)\*\*\s*:?\s*$/m), (m, p) =>
    makeNode('section', m[1], p, m[0].length, 0.85, { style: 'bold_label' })),
  map(lineRegex(/([A-Z][A-Z\s]{2,}):\s*$/m), (m, p) =>
    makeNode('section', m[1].trim(), p, m[0].length, 0.80, { style: 'allcaps_label' })),
];
const sectionParser: Parser<PromptASTNode> = alt(...sectionPatterns);

// --- Constraints ---
const constraintPatterns: Parser<PromptASTNode>[] = [
  map(regex(/(?:do not|don't|never|must not|should not) (.+?)(?:\.|;|\n|$)/i), (m, p) =>
    makeNode('constraint', m[0], p, m[0].length, 0.90, { style: 'negative' })),
  map(regex(/(?:always|must|ensure|make sure) (.+?)(?:\.|;|\n|$)/i), (m, p) =>
    makeNode('constraint', m[0], p, m[0].length, 0.85, { style: 'positive' })),
  map(regex(/(?:avoid|refrain from|under no circumstances) (.+?)(?:\.|;|\n|$)/i), (m, p) =>
    makeNode('constraint', m[0], p, m[0].length, 0.85, { style: 'negative' })),
  map(regex(/(?:yapma|asla|kesinlikle yapma|sakın) (.+?)(?:\.|;|\n|$)/i), (m, p) =>
    makeNode('constraint', m[0], p, m[0].length, 0.90, { style: 'negative_tr' })),
  map(regex(/(?:her zaman|mutlaka|kesinlikle) (.+?)(?:\.|;|\n|$)/i), (m, p) =>
    makeNode('constraint', m[0], p, m[0].length, 0.85, { style: 'positive_tr' })),
];
const constraintParser: Parser<PromptASTNode> = alt(...constraintPatterns);

// --- Output Format ---
const outputFormatPatterns: Parser<PromptASTNode>[] = [
  map(regex(/(?:return|output|respond|provide|format)(?:\s+(?:the|your|as|in|a))?\s+(?:as\s+|in\s+)?(?:a\s+)?(json|markdown|xml|yaml|csv|table|list|html|code|plain text)(?:\s+format)?/i), (m, p) =>
    makeNode('output_format', m[0], p, m[0].length, 0.90, { style: m[1].toLowerCase() })),
  map(regex(/(?:response|output|format)\s*(?:format|type)?\s*:\s*(.+?)(?:\n|$)/i), (m, p) =>
    makeNode('output_format', m[0], p, m[0].length, 0.85, { style: 'label' })),
  map(regex(/```(?:json|xml|yaml|csv|html|markdown)\b/i), (m, p) =>
    makeNode('output_format', m[0], p, m[0].length, 0.80, { style: 'code_fence' })),
  map(regex(/(?:çıktı|yanıt|cevap)\s*(?:formatı|biçimi)?\s*:\s*(.+?)(?:\n|$)/i), (m, p) =>
    makeNode('output_format', m[0], p, m[0].length, 0.85, { style: 'label_tr' })),
];
const outputFormatParser: Parser<PromptASTNode> = alt(...outputFormatPatterns);

// --- Example Blocks ---
const examplePatterns: Parser<PromptASTNode>[] = [
  map(regex(/(?:example|for example|e\.g\.|örnek|örneğin)\s*:?\s*\n?([\s\S]*?)(?=\n#{1,3}\s|\n\*\*|\n(?:example|for example)|$)/i), (m, p) =>
    makeNode('example_block', m[0].slice(0, 500), p, m[0].length, 0.85, { style: 'labeled' })),
  map(regex(/(?:input|giriş)\s*:\s*(.+?)(?:\n|$)(?:[\s\S]*?)(?:output|çıktı)\s*:\s*(.+?)(?:\n|$)/i), (m, p) =>
    makeNode('example_block', m[0].slice(0, 500), p, m[0].length, 0.90, { style: 'io_pair' })),
  map(regex(/(?:Q|question|soru)\s*:\s*(.+?)(?:\n|$)(?:[\s\S]*?)(?:A|answer|cevap)\s*:\s*(.+?)(?:\n|$)/i), (m, p) =>
    makeNode('example_block', m[0].slice(0, 500), p, m[0].length, 0.90, { style: 'qa_pair' })),
];
const exampleParser: Parser<PromptASTNode> = alt(...examplePatterns);

// --- Variables / Placeholders ---
const variablePatterns: Parser<PromptASTNode>[] = [
  map(regex(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/), (m, p) =>
    makeNode('variable', m[1], p, m[0].length, 0.95, { style: 'double_brace' })),
  map(regex(/\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/), (m, p) =>
    makeNode('variable', m[1], p, m[0].length, 0.95, { style: 'template_literal' })),
  map(regex(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/), (m, p) =>
    makeNode('variable', m[1], p, m[0].length, 0.90, { style: 'single_brace' })),
  map(regex(/\[([A-Z][A-Z0-9_]*)\]/), (m, p) =>
    makeNode('variable', m[1], p, m[0].length, 0.75, { style: 'bracket' })),
];
const variableParser: Parser<PromptASTNode> = alt(...variablePatterns);

// --- Chain-of-Thought Markers ---
const cotPatterns: Parser<PromptASTNode>[] = [
  map(regex(/(?:step|adım)\s+(\d+)\s*[:.]/i), (m, p) =>
    makeNode('cot_marker', m[0], p, m[0].length, 0.90, { style: 'numbered_step' })),
  map(regex(/(?:first|second|third|then|next|finally|lastly|ilk olarak|sonra|ardından|son olarak)\s*[,:]/i), (m, p) =>
    makeNode('cot_marker', m[0], p, m[0].length, 0.75, { style: 'ordinal' })),
  map(regex(/let'?s\s+think\s+(?:about\s+this\s+)?step\s+by\s+step/i), (m, p) =>
    makeNode('cot_marker', m[0], p, m[0].length, 0.95, { style: 'explicit_cot' })),
  map(regex(/think\s+(?:through|about)\s+this\s+(?:carefully|systematically)/i), (m, p) =>
    makeNode('cot_marker', m[0], p, m[0].length, 0.85, { style: 'think_carefully' })),
  map(regex(/adım adım düşün/i), (m, p) =>
    makeNode('cot_marker', m[0], p, m[0].length, 0.95, { style: 'explicit_cot_tr' })),
];
const cotParser: Parser<PromptASTNode> = alt(...cotPatterns);

// --- Guardrails ---
const guardrailPatterns: Parser<PromptASTNode>[] = [
  map(regex(/(?:do not reveal|never share|don't disclose)\s+(?:your\s+)?(?:instructions|system prompt|rules)/i), (m, p) =>
    makeNode('guardrail', m[0], p, m[0].length, 0.95, { style: 'instruction_hiding' })),
  map(regex(/(?:ignore|disregard)\s+(?:any\s+)?(?:attempts?\s+to|instructions?\s+(?:to|that))\s+(.+?)(?:\.|$)/i), (m, p) =>
    makeNode('guardrail', m[0], p, m[0].length, 0.90, { style: 'injection_defense' })),
  map(regex(/(?:if\s+(?:the\s+)?user\s+(?:asks|tries|attempts)\s+(?:you\s+)?to\s+(?:ignore|bypass|override|break))/i), (m, p) =>
    makeNode('guardrail', m[0], p, m[0].length, 0.90, { style: 'conditional_defense' })),
  map(regex(/(?:content\s+policy|safety\s+guidelines?|güvenlik\s+politika)/i), (m, p) =>
    makeNode('guardrail', m[0], p, m[0].length, 0.80, { style: 'policy_reference' })),
  map(regex(/(?:yetkisiz\s+talimatları?\s+yok\s+say|güvenlik\s+talimat)/i), (m, p) =>
    makeNode('guardrail', m[0], p, m[0].length, 0.90, { style: 'guardrail_tr' })),
  map(regex(/(?:mask|redact|remove)\s+(?:any\s+)?(?:pii|personal\s+(?:data|information)|sensitive\s+(?:data|info))/i), (m, p) =>
    makeNode('guardrail', m[0], p, m[0].length, 0.90, { style: 'pii_protection' })),
];
const guardrailParser: Parser<PromptASTNode> = alt(...guardrailPatterns);

// --- Master Grammar ---
const promptGrammar: Parser<PromptASTNode> = alt(
  roleParser,
  sectionParser,
  guardrailParser,
  outputFormatParser,
  exampleParser,
  constraintParser,
  variableParser,
  cotParser,
);

// ======================================================================
// SECTION 3: AST Builder
// ======================================================================

function makeNode(
  type: PromptNodeType,
  content: string,
  startPos: number,
  length: number,
  confidence: number,
  extra: { style?: string; level?: number } = {},
): PromptASTNode {
  return {
    type,
    content: content.trim(),
    children: [],
    metadata: {
      line: 0,     // computed in buildAST
      column: 0,   // computed in buildAST
      startPos,
      endPos: startPos + length,
      confidence,
      style: extra.style,
      level: extra.level,
    },
    named: {},
  };
}

/** Compute line/column for a position in text */
function posToLineCol(text: string, pos: number): { line: number; column: number } {
  let line = 1;
  let col = 1;
  for (let i = 0; i < pos && i < text.length; i++) {
    if (text[i] === '\n') { line++; col = 1; }
    else { col++; }
  }
  return { line, column: col };
}

/** Build AST from prompt text — main entry point */
export function buildAST(input: string): PromptAST {
  const matches = scanString(promptGrammar, input);

  // Assign line/column
  const nodes: PromptASTNode[] = matches.map(m => {
    const node = m.value;
    const lc = posToLineCol(input, m.start);
    node.metadata.line = lc.line;
    node.metadata.column = lc.column;
    node.metadata.startPos = m.start;
    node.metadata.endPos = m.end;
    return node;
  });

  // Compute statistics
  const nodesByType: Record<string, number> = {};
  for (const n of nodes) {
    nodesByType[n.type] = (nodesByType[n.type] || 0) + 1;
  }

  // Max nesting depth via section levels
  let maxDepth = 0;
  for (const n of nodes) {
    if (n.type === 'section' && n.metadata.level) {
      maxDepth = Math.max(maxDepth, n.metadata.level);
    }
  }

  const statistics: PromptASTStatistics = {
    totalNodes: nodes.length,
    nodesByType,
    maxDepth,
    variableCount: nodesByType['variable'] || 0,
    constraintCount: nodesByType['constraint'] || 0,
    sectionCount: nodesByType['section'] || 0,
    hasRole: (nodesByType['role_definition'] || 0) > 0,
    hasOutputFormat: (nodesByType['output_format'] || 0) > 0,
    hasExamples: (nodesByType['example_block'] || 0) > 0,
    hasGuardrails: (nodesByType['guardrail'] || 0) > 0,
    hasCotMarkers: (nodesByType['cot_marker'] || 0) > 0,
  };

  return { type: 'document', nodes, source: input, statistics };
}

/** Filter AST nodes by type */
export function filterNodes(ast: PromptAST, type: PromptNodeType): PromptASTNode[] {
  return ast.nodes.filter(n => n.type === type);
}

/** Convert AST to JSON-safe object (depth-limited for agent use) */
export function astToJSON(ast: PromptAST): object {
  const truncate = (s: string, max = 200) => s.length > max ? s.slice(0, max) + '...' : s;
  return {
    type: ast.type,
    statistics: ast.statistics,
    nodes: ast.nodes.map(n => ({
      type: n.type,
      content: truncate(n.content),
      line: n.metadata.line,
      confidence: n.metadata.confidence,
      style: n.metadata.style,
      level: n.metadata.level,
    })),
  };
}

// ======================================================================
// SECTION 4: Variable Extraction
// ======================================================================

const VAR_PATTERNS: Array<{ style: VariableStyle; pattern: RegExp }> = [
  { style: 'double_brace', pattern: /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g },
  { style: 'template_literal', pattern: /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g },
  { style: 'single_brace', pattern: /(?<!\{)\{([a-zA-Z_][a-zA-Z0-9_]*)\}(?!\})/g },
  { style: 'bracket', pattern: /\[([A-Z][A-Z0-9_]{1,})\]/g },
];

function inferVarType(name: string, surroundingText: string): ExtractedVariable['inferredType'] {
  const ctx = surroundingText.toLowerCase();
  if (/\b(?:count|number|amount|size|length|quantity|total|age|price|score)\b/.test(name.toLowerCase()) ||
      /\b(?:between\s+\d|from\s+\d|integer|float|numeric)\b/.test(ctx)) return 'number';
  if (/\b(?:list|items|array|categories|tags|options)\b/.test(name.toLowerCase()) ||
      /\b(?:separated\s+by|comma|each|multiple|array)\b/.test(ctx)) return 'list';
  if (/\b(?:is_|has_|enable|disable|include|verbose|flag)\b/.test(name.toLowerCase()) ||
      /\b(?:true|false|yes|no|boolean)\b/.test(ctx)) return 'boolean';
  if (/\b(?:config|settings|data|object|user|profile|params)\b/.test(name.toLowerCase()) ||
      /\b(?:object|json|fields|properties)\b/.test(ctx)) return 'object';
  return 'string';
}

function isVarRequired(name: string, fullText: string): boolean {
  const lowerText = fullText.toLowerCase();
  const lowerName = name.toLowerCase();
  // Check for optional markers near the variable
  const varPos = lowerText.indexOf(lowerName);
  if (varPos === -1) return true;
  const nearby = lowerText.slice(Math.max(0, varPos - 80), varPos + lowerName.length + 80);
  if (/\b(?:optional|if\s+(?:provided|available|given)|when\s+(?:provided|available))\b/.test(nearby)) return false;
  return true;
}

export function extractVariables(
  input: string,
  options?: { style?: string; inferTypes?: boolean },
): VariableExtractionResult {
  const filterStyle = options?.style ?? 'all';
  const doInfer = options?.inferTypes !== false;

  const varMap = new Map<string, ExtractedVariable>();

  for (const { style, pattern } of VAR_PATTERNS) {
    if (filterStyle !== 'all' && filterStyle !== style) continue;

    const re = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(input)) !== null) {
      const name = match[1];
      const pos = match.index;
      const key = `${name}__${style}`;

      if (varMap.has(key)) {
        const existing = varMap.get(key)!;
        existing.positions.push(pos);
        existing.count++;
      } else {
        const surrounding = input.slice(Math.max(0, pos - 60), Math.min(input.length, pos + 60));
        varMap.set(key, {
          name,
          style,
          rawToken: match[0],
          positions: [pos],
          count: 1,
          inferredType: doInfer ? inferVarType(name, surrounding) : 'unknown',
          required: isVarRequired(name, input),
          contextHint: surrounding.replace(/\n/g, ' ').trim().slice(0, 100),
        });
      }
    }
  }

  const variables = Array.from(varMap.values());

  // Default value extraction: {var:default} or {var|default}
  for (const v of variables) {
    const defPattern = new RegExp(`\\{${v.name}[:|]([^}]+)\\}`);
    const defMatch = input.match(defPattern);
    if (defMatch) {
      v.defaultValue = defMatch[1].trim();
      v.required = false;
    }
  }

  const styles = [...new Set(variables.map(v => v.style))];
  const byType: Record<string, number> = {};
  for (const v of variables) {
    byType[v.inferredType] = (byType[v.inferredType] || 0) + 1;
  }

  return {
    variables,
    summary: {
      total: variables.reduce((s, v) => s + v.count, 0),
      unique: variables.length,
      styles,
      mixedStyles: styles.length > 1,
      required: variables.filter(v => v.required).length,
      optional: variables.filter(v => !v.required).length,
      byType,
    },
  };
}

// ======================================================================
// SECTION 5: Prompt Transformations
// ======================================================================

export function transformPrompt(
  input: string,
  transformation: TransformationType,
  options?: { targetVariableStyle?: string },
): TransformResult {
  switch (transformation) {
    case 'markdown_to_json':
      return transformMarkdownToJSON(input);
    case 'flat_to_structured':
      return transformFlatToStructured(input);
    case 'single_to_multiturn':
      return transformSingleToMultiturn(input);
    case 'normalize_variables':
      return transformNormalizeVariables(input, (options?.targetVariableStyle as VariableStyle) || 'single_brace');
    default:
      return { original: input, transformed: input, format: 'unchanged', changes: [], metadata: {} };
  }
}

function transformMarkdownToJSON(input: string): TransformResult {
  const ast = buildAST(input);
  const changes: string[] = [];

  const roleNodes = filterNodes(ast, 'role_definition');
  const sectionNodes = filterNodes(ast, 'section');
  const constraintNodes = filterNodes(ast, 'constraint');
  const formatNodes = filterNodes(ast, 'output_format');
  const exampleNodes = filterNodes(ast, 'example_block');
  const guardrailNodes = filterNodes(ast, 'guardrail');
  const varResult = extractVariables(input);

  const jsonObj: Record<string, unknown> = {};

  if (roleNodes.length > 0) {
    jsonObj.role = roleNodes[0].content;
    changes.push('Extracted role definition');
  }

  if (sectionNodes.length > 0) {
    jsonObj.sections = sectionNodes.map(n => ({
      heading: n.content,
      level: n.metadata.level || 1,
      style: n.metadata.style,
    }));
    changes.push(`Extracted ${sectionNodes.length} sections`);
  }

  if (constraintNodes.length > 0) {
    jsonObj.constraints = constraintNodes.map(n => n.content);
    changes.push(`Extracted ${constraintNodes.length} constraints`);
  }

  if (formatNodes.length > 0) {
    jsonObj.outputFormat = formatNodes[0].content;
    changes.push('Extracted output format');
  }

  if (exampleNodes.length > 0) {
    jsonObj.examples = exampleNodes.map(n => n.content);
    changes.push(`Extracted ${exampleNodes.length} examples`);
  }

  if (guardrailNodes.length > 0) {
    jsonObj.guardrails = guardrailNodes.map(n => n.content);
    changes.push(`Extracted ${guardrailNodes.length} guardrails`);
  }

  if (varResult.variables.length > 0) {
    jsonObj.variables = varResult.variables.map(v => ({
      name: v.name,
      type: v.inferredType,
      required: v.required,
      style: v.style,
      ...(v.defaultValue ? { default: v.defaultValue } : {}),
    }));
    changes.push(`Extracted ${varResult.variables.length} variables`);
  }

  jsonObj.statistics = ast.statistics;

  return {
    original: input,
    transformed: JSON.stringify(jsonObj, null, 2),
    format: 'json',
    changes,
    metadata: { nodeCount: ast.statistics.totalNodes },
  };
}

function transformFlatToStructured(input: string): TransformResult {
  const ast = buildAST(input);
  const changes: string[] = [];
  const lines = input.split('\n');
  const outputLines: string[] = [];

  // Detect if already structured
  if (ast.statistics.sectionCount >= 2) {
    return {
      original: input,
      transformed: input,
      format: 'markdown',
      changes: ['Prompt is already structured'],
      metadata: {},
    };
  }

  // Build structured version
  const roleNodes = filterNodes(ast, 'role_definition');
  const constraintNodes = filterNodes(ast, 'constraint');
  const formatNodes = filterNodes(ast, 'output_format');
  const exampleNodes = filterNodes(ast, 'example_block');
  const guardrailNodes = filterNodes(ast, 'guardrail');

  // Role section
  if (roleNodes.length > 0) {
    outputLines.push('## ROLE', '', roleNodes.map(n => n.content).join('. ') + '.', '');
    changes.push('Added ROLE section');
  }

  // Instructions section — everything that isn't role/constraint/format/example/guardrail
  const covered = new Set<number>();
  for (const n of [...roleNodes, ...constraintNodes, ...formatNodes, ...exampleNodes, ...guardrailNodes]) {
    const startLine = n.metadata.line;
    covered.add(startLine);
  }
  const instructionLines = lines.filter((_, i) => !covered.has(i + 1) && _.trim().length > 0);
  if (instructionLines.length > 0) {
    outputLines.push('## INSTRUCTIONS', '', ...instructionLines, '');
    changes.push('Added INSTRUCTIONS section');
  }

  // Constraints
  if (constraintNodes.length > 0) {
    outputLines.push('## CONSTRAINTS', '', ...constraintNodes.map(n => `- ${n.content}`), '');
    changes.push('Added CONSTRAINTS section');
  }

  // Output Format
  if (formatNodes.length > 0) {
    outputLines.push('## OUTPUT FORMAT', '', formatNodes.map(n => n.content).join('\n'), '');
    changes.push('Added OUTPUT FORMAT section');
  }

  // Examples
  if (exampleNodes.length > 0) {
    outputLines.push('## EXAMPLES', '', ...exampleNodes.map(n => n.content), '');
    changes.push('Added EXAMPLES section');
  }

  // Guardrails
  if (guardrailNodes.length > 0) {
    outputLines.push('## GUARDRAILS', '', ...guardrailNodes.map(n => `- ${n.content}`), '');
    changes.push('Added GUARDRAILS section');
  }

  const transformed = outputLines.length > 0 ? outputLines.join('\n') : input;

  return {
    original: input,
    transformed,
    format: 'structured_markdown',
    changes,
    metadata: { sectionsAdded: changes.length },
  };
}

function transformSingleToMultiturn(input: string): TransformResult {
  const ast = buildAST(input);
  const changes: string[] = [];

  const roleNodes = filterNodes(ast, 'role_definition');
  const guardrailNodes = filterNodes(ast, 'guardrail');
  const constraintNodes = filterNodes(ast, 'constraint');
  const formatNodes = filterNodes(ast, 'output_format');

  // System message: role + guardrails + constraints
  const systemParts: string[] = [];
  if (roleNodes.length > 0) {
    systemParts.push(`You are ${roleNodes[0].content}.`);
    changes.push('Moved role to system message');
  }
  if (guardrailNodes.length > 0) {
    systemParts.push('\n' + guardrailNodes.map(n => n.content).join('\n'));
    changes.push('Moved guardrails to system message');
  }
  if (constraintNodes.length > 0) {
    systemParts.push('\nConstraints:\n' + constraintNodes.map(n => `- ${n.content}`).join('\n'));
    changes.push('Moved constraints to system message');
  }

  // User message: remaining instructions
  const coveredPositions = new Set<number>();
  for (const n of [...roleNodes, ...guardrailNodes, ...constraintNodes, ...formatNodes]) {
    for (let p = n.metadata.startPos; p < n.metadata.endPos; p++) {
      coveredPositions.add(p);
    }
  }
  const userParts: string[] = [];
  let current = '';
  for (let i = 0; i < input.length; i++) {
    if (!coveredPositions.has(i)) {
      current += input[i];
    } else if (current.trim()) {
      userParts.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) userParts.push(current.trim());

  // Assistant hint from output format
  let assistantHint = '';
  if (formatNodes.length > 0) {
    assistantHint = `I'll respond in ${formatNodes[0].metadata.style || 'the requested'} format.`;
    changes.push('Created assistant prefill from output format');
  }

  const messages: Array<{ role: string; content: string }> = [];
  if (systemParts.length > 0) messages.push({ role: 'system', content: systemParts.join('\n').trim() });
  messages.push({ role: 'user', content: userParts.join('\n').trim() || input.trim() });
  if (assistantHint) messages.push({ role: 'assistant', content: assistantHint });

  if (messages.length <= 1) changes.push('No separation possible — returned as single user message');

  return {
    original: input,
    transformed: JSON.stringify({ messages }, null, 2),
    format: 'multiturn_json',
    changes,
    metadata: { messageCount: messages.length },
  };
}

function transformNormalizeVariables(input: string, targetStyle: VariableStyle): TransformResult {
  const changes: string[] = [];
  let result = input;

  const replacements: Array<{ from: RegExp; to: (name: string) => string; styleName: string }> = [];

  const wrap = (name: string): string => {
    switch (targetStyle) {
      case 'single_brace': return `{${name}}`;
      case 'double_brace': return `{{${name}}}`;
      case 'template_literal': return '${' + name + '}';
      default: return `{${name}}`;
    }
  };

  // Replace all non-target styles
  if (targetStyle !== 'double_brace') {
    replacements.push({ from: /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, to: wrap, styleName: 'double_brace' });
  }
  if (targetStyle !== 'template_literal') {
    replacements.push({ from: /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, to: wrap, styleName: 'template_literal' });
  }
  if (targetStyle !== 'single_brace') {
    replacements.push({ from: /(?<!\{)\{([a-zA-Z_][a-zA-Z0-9_]*)\}(?!\})/g, to: wrap, styleName: 'single_brace' });
  }

  for (const { from, to, styleName } of replacements) {
    const matches = result.match(from);
    if (matches && matches.length > 0) {
      result = result.replace(from, (_, name) => to(name));
      changes.push(`Converted ${matches.length} ${styleName} variable(s) to ${targetStyle}`);
    }
  }

  return {
    original: input,
    transformed: result,
    format: targetStyle,
    changes: changes.length > 0 ? changes : ['No changes needed — variables already in target style'],
    metadata: { targetStyle },
  };
}

// ======================================================================
// SECTION 6: Quality Metrics
// ======================================================================

export function computeMetrics(ast: PromptAST, input: string): PromptQualityMetrics {
  const words = input.split(/\s+/).filter(Boolean);
  const sentences = input.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));

  // Complexity
  const nestingDepth = ast.statistics.maxDepth;
  const instructionDensity = words.length > 0
    ? ((ast.statistics.constraintCount + ast.statistics.sectionCount) / words.length) * 100
    : 0;
  const vocabularyRichness = words.length > 0 ? uniqueWords.size / words.length : 0;
  const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;

  // Coverage
  const coverageItems = [
    ast.statistics.hasRole,
    ast.statistics.constraintCount > 0,
    ast.statistics.hasOutputFormat,
    ast.statistics.hasExamples,
    ast.statistics.hasGuardrails,
    ast.statistics.hasCotMarkers,
  ];
  const presentCount = coverageItems.filter(Boolean).length;
  const sectionCompleteness = Math.round((presentCount / coverageItems.length) * 100);
  const constraintCoverage = ast.statistics.sectionCount > 0
    ? Math.min(100, Math.round((ast.statistics.constraintCount / ast.statistics.sectionCount) * 100))
    : 0;

  // Quality scores (0-100)
  const structureScore = Math.min(100, ast.statistics.sectionCount * 15 + (ast.statistics.hasRole ? 20 : 0));
  const clarityScore = Math.min(100, Math.round(
    (avgSentenceLength < 30 ? 40 : 20) +
    (vocabularyRichness > 0.3 ? 30 : 15) +
    (ast.statistics.hasOutputFormat ? 30 : 0),
  ));
  const completenessScore = sectionCompleteness;
  const safetyScore = Math.min(100,
    (ast.statistics.hasGuardrails ? 50 : 0) +
    (ast.statistics.constraintCount > 0 ? 30 : 0) +
    (ast.statistics.hasRole ? 20 : 0),
  );
  const overallScore = Math.round(
    structureScore * 0.30 +
    clarityScore * 0.20 +
    completenessScore * 0.30 +
    safetyScore * 0.20,
  );

  return {
    complexity: {
      nestingDepth,
      instructionDensity: Math.round(instructionDensity * 100) / 100,
      vocabularyRichness: Math.round(vocabularyRichness * 100) / 100,
      avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    },
    coverage: {
      hasRole: ast.statistics.hasRole,
      hasConstraints: ast.statistics.constraintCount > 0,
      hasOutputFormat: ast.statistics.hasOutputFormat,
      hasExamples: ast.statistics.hasExamples,
      hasGuardrails: ast.statistics.hasGuardrails,
      hasCotMarkers: ast.statistics.hasCotMarkers,
      sectionCompleteness,
      constraintCoverage,
    },
    quality: {
      overallScore,
      clarity: clarityScore,
      structure: structureScore,
      completeness: completenessScore,
      safety: safetyScore,
    },
  };
}
