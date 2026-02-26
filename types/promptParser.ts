/**
 * PyParsing-inspired Prompt Parser — Type Definitions.
 * Combinator tipleri, AST düğümleri, değişken analiz ve dönüşüm tipleri.
 */

// ==================== Parser Combinator Types ====================

export interface ParseResult<T = string> {
  success: boolean;
  value: T;
  rest: string;
  position: number;
  length: number;
  named: Record<string, unknown>;
}

export type Parser<T = string> = (input: string, position: number) => ParseResult<T>;

// ==================== AST Types ====================

export type PromptNodeType =
  | 'document'
  | 'role_definition'
  | 'section'
  | 'constraint'
  | 'output_format'
  | 'example_block'
  | 'variable'
  | 'cot_marker'
  | 'guardrail'
  | 'instruction'
  | 'context_block'
  | 'text';

export interface PromptASTNode {
  type: PromptNodeType;
  content: string;
  children: PromptASTNode[];
  metadata: {
    line: number;
    column: number;
    startPos: number;
    endPos: number;
    confidence: number;
    style?: string;
    level?: number;
  };
  named: Record<string, string>;
}

export interface PromptASTStatistics {
  totalNodes: number;
  nodesByType: Record<string, number>;
  maxDepth: number;
  variableCount: number;
  constraintCount: number;
  sectionCount: number;
  hasRole: boolean;
  hasOutputFormat: boolean;
  hasExamples: boolean;
  hasGuardrails: boolean;
  hasCotMarkers: boolean;
}

export interface PromptAST {
  type: 'document';
  nodes: PromptASTNode[];
  source: string;
  statistics: PromptASTStatistics;
}

// ==================== Variable Types ====================

export type VariableStyle = 'single_brace' | 'double_brace' | 'template_literal' | 'bracket';

export interface ExtractedVariable {
  name: string;
  style: VariableStyle;
  rawToken: string;
  positions: number[];
  count: number;
  inferredType: 'string' | 'number' | 'list' | 'boolean' | 'object' | 'unknown';
  required: boolean;
  defaultValue?: string;
  contextHint: string;
}

export interface VariableExtractionResult {
  variables: ExtractedVariable[];
  summary: {
    total: number;
    unique: number;
    styles: VariableStyle[];
    mixedStyles: boolean;
    required: number;
    optional: number;
    byType: Record<string, number>;
  };
}

// ==================== Transform Types ====================

export type TransformationType =
  | 'markdown_to_json'
  | 'flat_to_structured'
  | 'single_to_multiturn'
  | 'normalize_variables';

export interface TransformResult {
  original: string;
  transformed: string;
  format: string;
  changes: string[];
  metadata: Record<string, unknown>;
}

// ==================== Metrics Types ====================

export interface PromptQualityMetrics {
  complexity: {
    nestingDepth: number;
    instructionDensity: number;
    vocabularyRichness: number;
    avgSentenceLength: number;
  };
  coverage: {
    hasRole: boolean;
    hasConstraints: boolean;
    hasOutputFormat: boolean;
    hasExamples: boolean;
    hasGuardrails: boolean;
    hasCotMarkers: boolean;
    sectionCompleteness: number;
    constraintCoverage: number;
  };
  quality: {
    overallScore: number;
    clarity: number;
    structure: number;
    completeness: number;
    safety: number;
  };
}
