/**
 * Parser API routes — PyParsing-inspired prompt analysis endpoints.
 * Exposes buildAST, extractVariables, transformPrompt, computeMetrics via HTTP.
 */

import { Router } from 'express';
import { optionalApiKey } from '../middleware/auth';
import { requireAnyAuth } from '../middleware/supabaseAuth';
import { apiRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../lib/asyncHandler';
import {
  buildAST,
  extractVariables,
  transformPrompt,
  computeMetrics,
  astToJSON,
} from '../../services/promptParser';
import type { TransformationType } from '../../types/promptParser';

const router = Router();
const withMiddleware = [optionalApiKey, apiRateLimiter, requireAnyAuth];

/** POST /v1/parser/parse — Parse prompt into AST + optional metrics */
router.post('/parser/parse', ...withMiddleware, asyncHandler(async (req, res) => {
  const { prompt, includeMetrics = true, language = 'en' } = req.body ?? {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt (string) required' });
  }

  const ast = buildAST(prompt.slice(0, 50000));
  const json = astToJSON(ast);
  let metrics;
  if (includeMetrics) {
    metrics = computeMetrics(ast, prompt);
  }

  const summary = language === 'tr'
    ? `${ast.statistics.sectionCount} bölüm, ${ast.statistics.constraintCount} kısıt, ${ast.statistics.variableCount} değişken bulundu.`
    : `Found ${ast.statistics.sectionCount} sections, ${ast.statistics.constraintCount} constraints, ${ast.statistics.variableCount} variables.`;

  res.json({
    ast: json,
    statistics: ast.statistics,
    metrics: metrics ?? null,
    summary,
  });
}));

/** POST /v1/parser/variables — Extract variables/placeholders with type inference */
router.post('/parser/variables', ...withMiddleware, asyncHandler(async (req, res) => {
  const { prompt, style = 'all', inferTypes = true } = req.body ?? {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt (string) required' });
  }

  const result = extractVariables(prompt.slice(0, 50000), { style, inferTypes });
  res.json(result);
}));

/** POST /v1/parser/transform — Transform prompt format */
router.post('/parser/transform', ...withMiddleware, asyncHandler(async (req, res) => {
  const { prompt, transformation, options } = req.body ?? {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt (string) required' });
  }
  const validTransforms: TransformationType[] = [
    'markdown_to_json',
    'flat_to_structured',
    'single_to_multiturn',
    'normalize_variables',
  ];
  if (!transformation || !validTransforms.includes(transformation)) {
    return res.status(400).json({
      error: `transformation required. Valid: ${validTransforms.join(', ')}`,
    });
  }

  const result = transformPrompt(prompt.slice(0, 50000), transformation, options ?? {});
  res.json(result);
}));

/** POST /v1/parser/metrics — Compute quality metrics for a prompt */
router.post('/parser/metrics', ...withMiddleware, asyncHandler(async (req, res) => {
  const { prompt, language: _language = 'en' } = req.body ?? {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt (string) required' });
  }

  const ast = buildAST(prompt.slice(0, 50000));
  const metrics = computeMetrics(ast, prompt);

  res.json({
    metrics,
    statistics: ast.statistics,
  });
}));

export default router;
