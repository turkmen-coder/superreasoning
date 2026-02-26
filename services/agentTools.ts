/**
 * Extended Agent Tools
 *
 * Yeni agent araçları: compare_prompts, batch_enrich, export_prompt_pack,
 * analyze_performance_trends, suggest_domain, validate_prompt_syntax
 */

import { tool } from '@openai/agents';
import { z } from 'zod';
import { generateEmbedding } from '../server/lib/embeddings';
import { getVectorStore } from '../server/lib/vectorStore';
import { enrichMasterPrompt } from '../server/lib/enrichment';
import type { PromptComparison, BatchEnrichResult, PromptPack } from '../types/agent';

// ---------- Compare Prompts Tool ----------

export const comparePromptsTool = tool({
  name: 'compare_prompts',
  description: 'Compare two prompts side-by-side and analyze differences. Returns recommendation on which is better.',
  parameters: z.object({
    promptA: z.string().describe('First prompt content'),
    promptB: z.string().describe('Second prompt content'),
    criteria: z.array(z.string()).default(['clarity', 'structure', 'completeness']).describe('Comparison criteria'),
  }),
  execute: async (input) => {
    const { promptA, promptB, criteria } = input;

    // Structure analysis
    const extractSections = (text: string): string[] => {
      const sectionPatterns = [
        /^#{1,3}\s+(.+)$/gm,
        /^\*\*(.+)\*\*:$/gm,
        /^[-•]\s+(.+)$/gm,
      ];
      const sections: string[] = [];
      for (const pattern of sectionPatterns) {
        const matches = text.match(pattern) || [];
        sections.push(...matches.map(m => m.trim()));
      }
      return [...new Set(sections)];
    };

    const sectionsA = extractSections(promptA);
    const sectionsB = extractSections(promptB);

    // Length comparison
    const lenA = promptA.length;
    const lenB = promptB.length;
    const lenDiff = lenB - lenA;

    // Word count
    const wordsA = promptA.split(/\s+/).filter(Boolean).length;
    const wordsB = promptB.split(/\s+/).filter(Boolean).length;

    // Placeholder detection
    const placeholderPattern = /\{[a-zA-Z_]+\}|\{\{[a-zA-Z_]+\}\}|\$\{[a-zA-Z_]+\}/g;
    const placeholdersA = (promptA.match(placeholderPattern) || []).length;
    const placeholdersB = (promptB.match(placeholderPattern) || []).length;

    // Structure diff
    const structureDiff: string[] = [];
    sectionsA.forEach(s => {
      if (!sectionsB.includes(s)) structureDiff.push(`A only: ${s}`);
    });
    sectionsB.forEach(s => {
      if (!sectionsA.includes(s)) structureDiff.push(`B only: ${s}`);
    });

    // Scoring based on criteria
    let scoreA = 0;
    let scoreB = 0;

    // Clarity: shorter sentences, less jargon
    if (wordsA < wordsB * 1.2 && wordsA > wordsB * 0.8) scoreA += 1;
    else if (wordsB < wordsA * 1.2 && wordsB > wordsA * 0.8) scoreB += 1;

    // Structure: more sections is usually better for complex prompts
    if (sectionsA.length > sectionsB.length) scoreA += 1;
    else if (sectionsB.length > sectionsA.length) scoreB += 1;

    // Completeness: placeholders indicate completeness
    if (placeholdersA > placeholdersB) scoreA += 1;
    else if (placeholdersB > placeholdersA) scoreB += 1;

    // Recommendation
    let recommendation: 'A' | 'B' | 'either' = 'either';
    let reasoning = '';

    if (scoreA > scoreB + 1) {
      recommendation = 'A';
      reasoning = `Prompt A scores higher on ${criteria.join(', ')} criteria with better structure and completeness.`;
    } else if (scoreB > scoreA + 1) {
      recommendation = 'B';
      reasoning = `Prompt B scores higher on ${criteria.join(', ')} criteria with better structure and completeness.`;
    } else {
      reasoning = `Both prompts are similar in quality. Choose based on specific use case.`;
    }

    const comparison: PromptComparison = {
      promptA: { id: 'A', name: 'Prompt A', content: promptA },
      promptB: { id: 'B', name: 'Prompt B', content: promptB },
      analysis: {
        structureDiff,
        lengthDiff: lenDiff,
        sectionDiff: structureDiff.slice(0, 5),
        recommendation,
        reasoning,
      },
    };

    return JSON.stringify({
      comparison,
      metrics: {
        promptA: { length: lenA, words: wordsA, sections: sectionsA.length, placeholders: placeholdersA, score: scoreA },
        promptB: { length: lenB, words: wordsB, sections: sectionsB.length, placeholders: placeholdersB, score: scoreB },
      },
    });
  },
});

// ---------- Batch Enrich Tool ----------

export const batchEnrichTool = tool({
  name: 'batch_enrich',
  description: 'Enrich multiple prompts in a single batch operation. Returns results for each prompt.',
  parameters: z.object({
    items: z.array(z.object({
      id: z.string(),
      prompt: z.string(),
      domainId: z.string().nullable().default(null),
      mode: z.enum(['fast', 'deep']).default('fast'),
    })).max(10).describe('Prompts to enrich (max 10)'),
  }),
  execute: async (input) => {
    const results: BatchEnrichResult[] = [];

    for (const item of input.items) {
      try {
        const enriched = await enrichMasterPrompt(item.prompt, {
          domainId: item.domainId ?? undefined,
          config: { mode: item.mode },
        });

        results.push({
          id: item.id,
          originalPrompt: item.prompt,
          enrichedPrompt: enriched.enrichedPrompt,
          status: 'success',
          metrics: {
            promptsIntegrated: enriched.metrics.promptsIntegrated,
            tokensAdded: enriched.metrics.tokensAdded,
            durationMs: enriched.metrics.durationMs,
          },
        });
      } catch (error) {
        results.push({
          id: item.id,
          originalPrompt: item.prompt,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const summary = {
      total: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      totalTokensAdded: results.reduce((sum, r) => sum + (r.metrics?.tokensAdded || 0), 0),
      avgDurationMs: results.reduce((sum, r) => sum + (r.metrics?.durationMs || 0), 0) / results.length,
    };

    return JSON.stringify({ results, summary });
  },
});

// ---------- Export Prompt Pack Tool ----------

export const exportPromptPackTool = tool({
  name: 'export_prompt_pack',
  description: 'Export a collection of prompts for a specific domain as a portable pack.',
  parameters: z.object({
    name: z.string().describe('Pack name'),
    description: z.string().describe('Pack description'),
    domainId: z.string().describe('Domain ID to filter prompts'),
    promptIds: z.array(z.string()).optional().describe('Specific prompt IDs to include (optional)'),
    format: z.enum(['json', 'markdown']).default('json').describe('Export format'),
  }),
  execute: async (input) => {
    const { name, description, domainId, promptIds, format } = input;

    const store = getVectorStore();
    if (!store || !store.isReady()) {
      return JSON.stringify({ error: 'Vector store not ready' });
    }

    // Search for domain-related prompts
    const queryVector = await generateEmbedding(`${domainId} domain prompts`);
    const searchResults = await store.search(queryVector, 50);

    // Filter by promptIds if provided
    const filtered = promptIds
      ? searchResults.filter(r => promptIds.includes(r.id))
      : searchResults.filter(r => r.metadata.category?.toLowerCase().includes(domainId.toLowerCase()));

    const prompts = filtered.map(r => ({
      id: r.id,
      name: r.metadata.name,
      category: r.metadata.category,
      content: r.metadata.name || '',
    }));

    const pack: PromptPack = {
      id: `pack-${Date.now()}`,
      name,
      description,
      domainId,
      prompts,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };

    if (format === 'markdown') {
      let md = `# ${name}\n\n${description}\n\nDomain: ${domainId}\n\n---\n\n`;
      for (const p of prompts) {
        md += `## ${p.name}\n\nCategory: ${p.category}\n\n\`\`\`\n${p.content}\n\`\`\`\n\n---\n\n`;
      }
      return JSON.stringify({ format: 'markdown', content: md, promptCount: prompts.length });
    }

    return JSON.stringify({ pack, promptCount: prompts.length });
  },
});

// ---------- Analyze Performance Trends Tool ----------

export const analyzePerformanceTrendsTool = tool({
  name: 'analyze_performance_trends',
  description: 'Analyze prompt performance trends over time. Identifies patterns and anomalies.',
  parameters: z.object({
    timeRange: z.enum(['7d', '30d', '90d']).default('30d').describe('Time range for analysis'),
    metrics: z.array(z.enum(['success_rate', 'edit_rate', 'latency', 'cost'])).default(['success_rate', 'edit_rate']),
    groupBy: z.enum(['domain', 'framework', 'provider']).default('domain').describe('Grouping dimension'),
  }),
  execute: async (input) => {
    // Simulated trend analysis (in real app, would query analytics DB)
    const daysBack = input.timeRange === '7d' ? 7 : input.timeRange === '30d' ? 30 : 90;

    const trends = {
      timeRange: input.timeRange,
      groupBy: input.groupBy,
      data: [] as Array<{ key: string; values: number[]; trend: 'up' | 'down' | 'stable' }>,
      insights: [] as string[],
    };

    // Generate sample trend data
    const groups = input.groupBy === 'domain'
      ? ['coding', 'writing', 'analysis', 'creative']
      : input.groupBy === 'framework'
        ? ['CO_STAR', 'RISEN', 'CHAIN_OF_THOUGHT', 'TREE_OF_THOUGHT']
        : ['openai', 'anthropic', 'google', 'groq'];

    for (const group of groups) {
      const values = Array.from({ length: daysBack }, () => 0.6 + Math.random() * 0.35);
      const firstHalf = values.slice(0, Math.floor(daysBack / 2));
      const secondHalf = values.slice(Math.floor(daysBack / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (secondAvg > firstAvg + 0.05) trend = 'up';
      else if (secondAvg < firstAvg - 0.05) trend = 'down';

      trends.data.push({ key: group, values: values.slice(-7), trend });
    }

    // Generate insights
    const declining = trends.data.filter(d => d.trend === 'down');
    const improving = trends.data.filter(d => d.trend === 'up');

    if (declining.length > 0) {
      trends.insights.push(`⚠️ Declining performance in: ${declining.map(d => d.key).join(', ')}`);
    }
    if (improving.length > 0) {
      trends.insights.push(`✅ Improving performance in: ${improving.map(d => d.key).join(', ')}`);
    }

    return JSON.stringify(trends);
  },
});

// ---------- Suggest Domain Tool ----------

export const suggestDomainTool = tool({
  name: 'suggest_domain',
  description: 'Suggest appropriate domain based on user intent. Returns ranked domain suggestions.',
  parameters: z.object({
    intent: z.string().describe('User intent or task description'),
    topK: z.number().min(1).max(5).default(3).describe('Number of suggestions'),
  }),
  execute: async (input) => {
    const { intent, topK } = input;

    // Domain knowledge base
    const domains = [
      { id: 'coding', keywords: ['code', 'programming', 'debug', 'function', 'api', 'software', 'develop', 'algorithm'] },
      { id: 'writing', keywords: ['write', 'article', 'blog', 'content', 'copy', 'essay', 'story', 'document'] },
      { id: 'analysis', keywords: ['analyze', 'data', 'report', 'insight', 'metric', 'statistics', 'research'] },
      { id: 'creative', keywords: ['creative', 'design', 'art', 'brainstorm', 'idea', 'innovative', 'imagine'] },
      { id: 'education', keywords: ['teach', 'learn', 'explain', 'tutorial', 'course', 'lesson', 'education'] },
      { id: 'business', keywords: ['business', 'strategy', 'marketing', 'sales', 'customer', 'revenue', 'growth'] },
      { id: 'technical', keywords: ['technical', 'engineering', 'system', 'architecture', 'infrastructure', 'devops'] },
      { id: 'legal', keywords: ['legal', 'contract', 'compliance', 'regulation', 'policy', 'terms'] },
      { id: 'medical', keywords: ['medical', 'health', 'diagnosis', 'treatment', 'patient', 'clinical'] },
      { id: 'finance', keywords: ['finance', 'investment', 'portfolio', 'risk', 'trading', 'market'] },
    ];

    const intentLower = intent.toLowerCase();
    const scored = domains.map(d => {
      const matches = d.keywords.filter(k => intentLower.includes(k)).length;
      return { id: d.id, score: matches / d.keywords.length };
    });

    const sorted = scored.sort((a, b) => b.score - a.score).slice(0, topK);

    return JSON.stringify({
      intent,
      suggestions: sorted.map(s => ({
        domainId: s.id,
        confidence: s.score,
        reasoning: s.score > 0.3 ? 'Strong keyword match' : s.score > 0.1 ? 'Partial match' : 'Weak match',
      })),
    });
  },
});

// ---------- Validate Prompt Syntax Tool ----------

export const validatePromptSyntaxTool = tool({
  name: 'validate_prompt_syntax',
  description: 'Validate prompt syntax: check placeholders, variables, structure, and common issues.',
  parameters: z.object({
    prompt: z.string().describe('Prompt text to validate'),
    strictMode: z.boolean().default(false).describe('Enable strict validation'),
  }),
  execute: async (input) => {
    const { prompt, strictMode } = input;
    const issues: Array<{ type: 'error' | 'warning' | 'info'; message: string; line?: number }> = [];
    const suggestions: string[] = [];

    // Placeholder validation
    const placeholderPattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}|\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}|\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    const placeholders: string[] = [];
    let match;
    while ((match = placeholderPattern.exec(prompt)) !== null) {
      placeholders.push(match[1] || match[2] || match[3]);
    }

    // Check for unclosed braces
    const openBraces = (prompt.match(/\{(?![a-zA-Z_])/g) || []).length;
    const closeBraces = (prompt.match(/(?<![a-zA-Z0-9_])\}/g) || []).length;
    if (openBraces !== closeBraces) {
      issues.push({ type: 'error', message: 'Unbalanced braces detected. Check placeholder syntax.' });
    }

    // Check for empty placeholders
    if (prompt.includes('{}') || prompt.includes('{{}}')) {
      issues.push({ type: 'error', message: 'Empty placeholder found. Provide a variable name.' });
    }

    // Check for consistent placeholder style
    const styles = {
      single: (prompt.match(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g) || []).length,
      double: (prompt.match(/\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}/g) || []).length,
      template: (prompt.match(/\$\{[a-zA-Z_][a-zA-Z0-9_]*\}/g) || []).length,
    };
    const usedStyles = Object.entries(styles).filter(([_, v]) => v > 0).map(([k]) => k);
    if (usedStyles.length > 1) {
      issues.push({ type: 'warning', message: `Mixed placeholder styles: ${usedStyles.join(', ')}. Stick to one style.` });
    }

    // Structure checks
    const hasSections = /^#{1,3}\s+/m.test(prompt) || /^\*\*.+\*\*:$/m.test(prompt);
    if (!hasSections && prompt.length > 500) {
      issues.push({ type: 'info', message: 'Long prompt without section headers. Consider adding structure.' });
      suggestions.push('Use ## headers or **bold labels** to organize sections');
    }

    // Role definition check
    const hasRole = /you are|act as|your role|as a/i.test(prompt);
    if (!hasRole && strictMode) {
      issues.push({ type: 'warning', message: 'No explicit role definition found.' });
      suggestions.push('Start with "You are a [role]..." for better context');
    }

    // Output format check
    const hasOutputFormat = /output|format|response|return|provide/i.test(prompt);
    if (!hasOutputFormat && strictMode) {
      issues.push({ type: 'info', message: 'No output format specification found.' });
      suggestions.push('Specify expected output format (JSON, markdown, list, etc.)');
    }

    // Constraint check
    const hasConstraints = /do not|never|avoid|must|should|always|don't/i.test(prompt);
    if (!hasConstraints && strictMode) {
      issues.push({ type: 'info', message: 'No constraints or guardrails defined.' });
      suggestions.push('Add constraints like "Do not...", "Always...", "Never..."');
    }

    const valid = issues.filter(i => i.type === 'error').length === 0;

    return JSON.stringify({
      valid,
      placeholders: [...new Set(placeholders)],
      placeholderCount: placeholders.length,
      issues,
      suggestions,
      stats: {
        length: prompt.length,
        words: prompt.split(/\s+/).filter(Boolean).length,
        lines: prompt.split('\n').length,
        sections: (prompt.match(/^#{1,3}\s+/gm) || []).length,
      },
    });
  },
});

// ---------- Drift Detection Tool ----------

export const driftDetectionTool = tool({
  name: 'drift_detection',
  description: 'Detect prompt drift over time - when prompt performance degrades or behavior changes.',
  parameters: z.object({
    promptId: z.string().describe('Prompt ID to analyze'),
    baselineMetrics: z.object({
      successRate: z.number(),
      editRate: z.number(),
      avgLatencyMs: z.number(),
    }).describe('Baseline metrics to compare against'),
    currentMetrics: z.object({
      successRate: z.number(),
      editRate: z.number(),
      avgLatencyMs: z.number(),
    }).describe('Current metrics'),
    threshold: z.number().default(0.1).describe('Drift threshold (0.1 = 10% change)'),
  }),
  execute: async (input) => {
    const { promptId, baselineMetrics, currentMetrics, threshold } = input;

    const drifts: Array<{ metric: string; baseline: number; current: number; change: number; drifted: boolean }> = [];

    // Success rate drift (decrease is bad)
    const successChange = (currentMetrics.successRate - baselineMetrics.successRate) / baselineMetrics.successRate;
    drifts.push({
      metric: 'successRate',
      baseline: baselineMetrics.successRate,
      current: currentMetrics.successRate,
      change: successChange,
      drifted: Math.abs(successChange) > threshold && successChange < 0,
    });

    // Edit rate drift (increase is bad)
    const editChange = (currentMetrics.editRate - baselineMetrics.editRate) / baselineMetrics.editRate;
    drifts.push({
      metric: 'editRate',
      baseline: baselineMetrics.editRate,
      current: currentMetrics.editRate,
      change: editChange,
      drifted: Math.abs(editChange) > threshold && editChange > 0,
    });

    // Latency drift (increase is bad)
    const latencyChange = (currentMetrics.avgLatencyMs - baselineMetrics.avgLatencyMs) / baselineMetrics.avgLatencyMs;
    drifts.push({
      metric: 'avgLatencyMs',
      baseline: baselineMetrics.avgLatencyMs,
      current: currentMetrics.avgLatencyMs,
      change: latencyChange,
      drifted: Math.abs(latencyChange) > threshold && latencyChange > 0,
    });

    const hasDrift = drifts.some(d => d.drifted);
    const severity = drifts.filter(d => d.drifted).length;

    const recommendations: string[] = [];
    if (drifts.find(d => d.metric === 'successRate')?.drifted) {
      recommendations.push('Success rate declining. Consider re-enriching the prompt or reviewing domain fit.');
    }
    if (drifts.find(d => d.metric === 'editRate')?.drifted) {
      recommendations.push('Edit rate increasing. Users may be unsatisfied with output quality. Review prompt clarity.');
    }
    if (drifts.find(d => d.metric === 'avgLatencyMs')?.drifted) {
      recommendations.push('Latency increasing. Check for prompt length issues or consider model optimization.');
    }

    return JSON.stringify({
      promptId,
      hasDrift,
      severity: severity > 2 ? 'high' : severity > 0 ? 'medium' : 'low',
      drifts,
      recommendations,
    });
  },
});

// ---------- Cost Analysis Tool ----------

export const costAnalysisTool = tool({
  name: 'cost_analysis',
  description: 'Analyze token usage and costs. Suggest optimizations for cost reduction.',
  parameters: z.object({
    usageData: z.array(z.object({
      date: z.string(),
      inputTokens: z.number(),
      outputTokens: z.number(),
      model: z.string(),
      costUsd: z.number(),
    })).describe('Usage data points'),
    targetReduction: z.number().default(0.2).describe('Target cost reduction (0.2 = 20%)'),
  }),
  execute: async (input) => {
    const { usageData, targetReduction } = input;

    const totalCost = usageData.reduce((sum, d) => sum + d.costUsd, 0);
    const totalInputTokens = usageData.reduce((sum, d) => sum + d.inputTokens, 0);
    const totalOutputTokens = usageData.reduce((sum, d) => sum + d.outputTokens, 0);

    // Group by model
    const byModel: Record<string, { count: number; cost: number; avgInput: number; avgOutput: number }> = {};
    for (const d of usageData) {
      if (!byModel[d.model]) {
        byModel[d.model] = { count: 0, cost: 0, avgInput: 0, avgOutput: 0 };
      }
      byModel[d.model].count++;
      byModel[d.model].cost += d.costUsd;
      byModel[d.model].avgInput += d.inputTokens;
      byModel[d.model].avgOutput += d.outputTokens;
    }

    // Calculate averages
    for (const model in byModel) {
      byModel[model].avgInput /= byModel[model].count;
      byModel[model].avgOutput /= byModel[model].count;
    }

    // Optimization suggestions
    const optimizations: string[] = [];
    const targetCost = totalCost * (1 - targetReduction);
    const savingsNeeded = totalCost - targetCost;

    // Check for expensive models
    const sortedModels = Object.entries(byModel).sort((a, b) => b[1].cost - a[1].cost);
    if (sortedModels.length > 1) {
      const [topModel, topData] = sortedModels[0];
      if (topData.cost > totalCost * 0.5) {
        optimizations.push(`Consider using cheaper models for ${topModel} which accounts for ${(topData.cost / totalCost * 100).toFixed(1)}% of costs`);
      }
    }

    // Check for high output tokens
    const avgOutputRatio = totalOutputTokens / (totalInputTokens + totalOutputTokens);
    if (avgOutputRatio > 0.6) {
      optimizations.push('High output token ratio. Consider constraining output format in prompts.');
    }

    // Check for long prompts
    const avgInput = totalInputTokens / usageData.length;
    if (avgInput > 2000) {
      optimizations.push(`Average input tokens (${avgInput.toFixed(0)}) is high. Consider prompt compression or caching.`);
    }

    return JSON.stringify({
      summary: {
        totalCost,
        totalInputTokens,
        totalOutputTokens,
        dataPoints: usageData.length,
      },
      byModel,
      targetReduction,
      savingsNeeded,
      optimizations,
      potentialSavings: optimizations.length > 0 ? savingsNeeded * 0.5 : 0,
    });
  },
});

// ---------- PyParsing-Inspired Parser Tools ----------

import { buildAST, extractVariables, transformPrompt, computeMetrics, astToJSON } from './promptParser';
import type { TransformationType } from '../types/promptParser';

export const parsePromptTool = tool({
  name: 'parse_prompt',
  description: 'Parse a prompt into a structured AST (Abstract Syntax Tree). Detects roles, sections, constraints, output formats, examples, variables, chain-of-thought markers, and guardrails. Returns quality metrics.',
  parameters: z.object({
    prompt: z.string().describe('Prompt text to parse'),
    includeMetrics: z.boolean().default(true).describe('Include quality/complexity metrics'),
    language: z.enum(['tr', 'en']).default('en').describe('Prompt language for bilingual pattern matching'),
  }),
  execute: async (input) => {
    const { prompt, includeMetrics, language } = input;
    const ast = buildAST(prompt);
    const result: Record<string, unknown> = {
      ast: astToJSON(ast),
      statistics: ast.statistics,
    };
    if (includeMetrics) {
      result.metrics = computeMetrics(ast, prompt);
    }
    result.summary = language === 'tr'
      ? `${ast.statistics.totalNodes} düğüm bulundu: ${ast.statistics.sectionCount} bölüm, ${ast.statistics.constraintCount} kısıt, ${ast.statistics.variableCount} değişken. Rol: ${ast.statistics.hasRole ? 'Var' : 'Yok'}. Çıktı formatı: ${ast.statistics.hasOutputFormat ? 'Var' : 'Yok'}. Örnekler: ${ast.statistics.hasExamples ? 'Var' : 'Yok'}. Güvenlik: ${ast.statistics.hasGuardrails ? 'Var' : 'Yok'}.`
      : `Found ${ast.statistics.totalNodes} nodes: ${ast.statistics.sectionCount} sections, ${ast.statistics.constraintCount} constraints, ${ast.statistics.variableCount} variables. Role: ${ast.statistics.hasRole ? 'Yes' : 'No'}. Output format: ${ast.statistics.hasOutputFormat ? 'Yes' : 'No'}. Examples: ${ast.statistics.hasExamples ? 'Yes' : 'No'}. Guardrails: ${ast.statistics.hasGuardrails ? 'Yes' : 'No'}.`;
    return JSON.stringify(result);
  },
});

export const extractVariablesTool = tool({
  name: 'extract_variables',
  description: 'Deep analysis of all variables/placeholders in a prompt. Detects multiple styles ({var}, {{var}}, ${var}, [VAR]), infers types from context, identifies required vs optional, and extracts default values.',
  parameters: z.object({
    prompt: z.string().describe('Prompt text to analyze'),
    style: z.enum(['all', 'single_brace', 'double_brace', 'template_literal', 'bracket']).default('all').describe('Filter by variable style'),
    inferTypes: z.boolean().default(true).describe('Infer variable types from surrounding context'),
  }),
  execute: async (input) => {
    const { prompt, style, inferTypes } = input;
    const result = extractVariables(prompt, { style, inferTypes });
    return JSON.stringify(result);
  },
});

export const transformPromptTool = tool({
  name: 'transform_prompt',
  description: 'Transform a prompt between formats: markdown to JSON schema, flat text to structured sections, single prompt to multi-turn conversation, or normalize variable styles.',
  parameters: z.object({
    prompt: z.string().describe('Prompt text to transform'),
    transformation: z.enum(['markdown_to_json', 'flat_to_structured', 'single_to_multiturn', 'normalize_variables']).describe('Type of transformation'),
    targetVariableStyle: z.enum(['single_brace', 'double_brace', 'template_literal']).default('double_brace').describe('Target variable style for normalize_variables transformation'),
  }),
  execute: async (input) => {
    const { prompt, transformation, targetVariableStyle } = input;
    const options = transformation === 'normalize_variables' ? { targetVariableStyle } : undefined;
    const result = transformPrompt(prompt, transformation as TransformationType, options);
    return JSON.stringify(result);
  },
});

// ---------- Export all tools ----------

export const EXTENDED_TOOLS = [
  comparePromptsTool,
  batchEnrichTool,
  exportPromptPackTool,
  analyzePerformanceTrendsTool,
  suggestDomainTool,
  validatePromptSyntaxTool,
  driftDetectionTool,
  costAnalysisTool,
  // PyParsing parser tools
  parsePromptTool,
  extractVariablesTool,
  transformPromptTool,
];
