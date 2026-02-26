import { Router, Request, Response } from 'express';
import { requireAnyAuth } from '../middleware/supabaseAuth';
import { optionalApiKey } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/rateLimit';

const router = Router();

type EditMode = 'grammar' | 'clarity' | 'structure' | 'tone' | 'all';
type ToneStyle = 'professional' | 'casual' | 'technical' | 'creative' | 'academic';

interface AutoEditRequest {
  prompt: string;
  mode: EditMode;
  tone: ToneStyle;
  language: string;
}

// Common grammar and style fixes
const GRAMMAR_FIXES: Array<{ pattern: RegExp; replacement: string | ((m: string) => string); description: string }> = [
  { pattern: /\bi want\b/gi, replacement: 'I would like', description: 'More formal request' },
  { pattern: /\bcan you\b/gi, replacement: 'please', description: 'More polite phrasing' },
  { pattern: /\bdont\b/gi, replacement: "don't", description: 'Proper contraction' },
  { pattern: /\bwont\b/gi, replacement: "won't", description: 'Proper contraction' },
  { pattern: /\bcant\b/gi, replacement: "can't", description: 'Proper contraction' },
  { pattern: /\bshouldnt\b/gi, replacement: "shouldn't", description: 'Proper contraction' },
  { pattern: /\bcouldnt\b/gi, replacement: "couldn't", description: 'Proper contraction' },
  { pattern: /\bwouldnt\b/gi, replacement: "wouldn't", description: 'Proper contraction' },
  { pattern: /\bdidnt\b/gi, replacement: "didn't", description: 'Proper contraction' },
  { pattern: /\bisnt\b/gi, replacement: "isn't", description: 'Proper contraction' },
  { pattern: /\barent\b/gi, replacement: "aren't", description: 'Proper contraction' },
  { pattern: /\bhavent\b/gi, replacement: "haven't", description: 'Proper contraction' },
  { pattern: /\bhasnt\b/gi, replacement: "hasn't", description: 'Proper contraction' },
  { pattern: /\bim\b/gi, replacement: "I'm", description: 'Proper contraction' },
  { pattern: /\bIll\b/g, replacement: "I'll", description: 'Proper contraction' },
  { pattern: /\bive\b/gi, replacement: "I've", description: 'Proper contraction' },
  { pattern: /\bits\s+a\b/gi, replacement: "it's a", description: 'Correct it\'s/its usage' },
  { pattern: /\b alot \b/gi, replacement: ' a lot ', description: 'Two words: a lot' },
  { pattern: /\bthankyou\b/gi, replacement: 'thank you', description: 'Two words: thank you' },
  { pattern: /\bno\s+one\b/gi, replacement: 'no one', description: 'Two words: no one' },
  { pattern: /\beverytime\b/gi, replacement: 'every time', description: 'Two words: every time' },
  { pattern: /\bsomeone\s+else\b/gi, replacement: 'someone else', description: 'Two words: someone else' },
  { pattern: /\beveryday\b/gi, replacement: 'every day', description: 'Every day (adverb)' },
  { pattern: /\beffect\b/gi, replacement: 'affect', description: 'Affect vs effect (verb)' },
  { pattern: /\bthen\b/gi, replacement: 'than', description: 'Than vs then (comparison)' },
  { pattern: /\bthere\s+is\s+many\b/gi, replacement: 'there are many', description: 'Subject-verb agreement' },
  { pattern: /\bthere\s+is\s+some\b/gi, replacement: 'there are some', description: 'Subject-verb agreement' },
  { pattern: /\bdata\s+is\b/gi, replacement: 'data are', description: 'Data is plural' },
  { pattern: /\bvery\s+unique\b/gi, replacement: 'unique', description: 'Remove intensifier' },
  { pattern: /\bvery\s+perfect\b/gi, replacement: 'perfect', description: 'Remove intensifier' },
  { pattern: /\bcompletely\s+eliminate\b/gi, replacement: 'eliminate', description: 'Remove redundant adverb' },
  { pattern: /\b\d+\s+kind\s+of\b/gi, replacement: (m) => m.replace('kind', 'kinds'), description: 'Plural kinds' },
  { pattern: /\btry\s+and\b/gi, replacement: 'try to', description: 'Try to (standard)' },
  { pattern: /\bshould\s+of\b/gi, replacement: 'should have', description: 'Should have (correct)' },
  { pattern: /\bcould\s+of\b/gi, replacement: 'could have', description: 'Could have (correct)' },
  { pattern: /\bwould\s+of\b/gi, replacement: 'would have', description: 'Would have (correct)' },
  { pattern: /\bmight\s+of\b/gi, replacement: 'might have', description: 'Might have (correct)' },
  { pattern: /\bmust\s+of\b/gi, replacement: 'must have', description: 'Must have (correct)' },
];

// Clarity improvements
const CLARITY_IMPROVEMENTS: Array<{ pattern: RegExp; replacement: string; description: string }> = [
  { pattern: /\bin\s+order\s+to\b/gi, replacement: 'to', description: 'Simplify: to' },
  { pattern: /\bdue\s+to\s+the\s+fact\s+that\b/gi, replacement: 'because', description: 'Simplify: because' },
  { pattern: /\bin\s+spite\s+of\s+the\s+fact\s+that\b/gi, replacement: 'although', description: 'Simplify: although' },
  { pattern: /\bfor\s+the\s+purpose\s+of\b/gi, replacement: 'for', description: 'Simplify: for' },
  { pattern: /\bin\s+the\s+event\s+that\b/gi, replacement: 'if', description: 'Simplify: if' },
  { pattern: /\bat\s+this\s+point\s+in\s+time\b/gi, replacement: 'now', description: 'Simplify: now' },
  { pattern: /\bin\s+the\s+near\s+future\b/gi, replacement: 'soon', description: 'Simplify: soon' },
  { pattern: /\bmake\s+an\s+effort\b/gi, replacement: 'try', description: 'Simplify: try' },
  { pattern: /\bgive\s+assistance\b/gi, replacement: 'help', description: 'Simplify: help' },
  { pattern: /\bprovide\s+information\b/gi, replacement: 'inform', description: 'Simplify: inform' },
  { pattern: /\bconduct\s+an\s+investigation\b/gi, replacement: 'investigate', description: 'Simplify: investigate' },
  { pattern: /\butilize\b/gi, replacement: 'use', description: 'Simplify: use' },
  { pattern: /\bimplement\b/gi, replacement: 'start', description: 'Simplify: start (where appropriate)' },
  { pattern: /\binitiate\b/gi, replacement: 'start', description: 'Simplify: start' },
  { pattern: /\bterminate\b/gi, replacement: 'end', description: 'Simplify: end' },
  { pattern: /\bcommence\b/gi, replacement: 'begin', description: 'Simplify: begin' },
  { pattern: /\bcease\b/gi, replacement: 'stop', description: 'Simplify: stop' },
  { pattern: /\boptimal\b/gi, replacement: 'best', description: 'Simplify: best' },
  { pattern: /\bsubstantial\b/gi, replacement: 'large', description: 'Simplify: large' },
  { pattern: /\badequate\b/gi, replacement: 'enough', description: 'Simplify: enough' },
];

// Tone adjustments by style
const TONE_ADJUSTMENTS: Record<ToneStyle, Array<{ pattern: RegExp; replacement: string }>> = {
  professional: [
    { pattern: /\bhey\b/gi, replacement: 'hello' },
    { pattern: /\bhi\s+there\b/gi, replacement: 'hello' },
    { pattern: /\bguys\b/gi, replacement: 'team' },
    { pattern: /\bfolks\b/gi, replacement: 'colleagues' },
    { pattern: /\bawesome\b/gi, replacement: 'excellent' },
    { pattern: /\bcool\b/gi, replacement: 'good' },
    { pattern: /\bokay\b/gi, replacement: 'acceptable' },
    { pattern: /\bASAP\b/g, replacement: 'as soon as possible' },
    { pattern: /\bFYI\b/g, replacement: 'for your information' },
    { pattern: /\bBTW\b/g, replacement: 'by the way' },
    { pattern: /\bthx\b/gi, replacement: 'thank you' },
    { pattern: /\bpls\b/gi, replacement: 'please' },
    { pattern: /\bu\b/gi, replacement: 'you' },
    { pattern: /\br\b/gi, replacement: 'are' },
    { pattern: /\by\b/gi, replacement: 'why' },
    { pattern: /\bgonna\b/gi, replacement: 'going to' },
    { pattern: /\bwanna\b/gi, replacement: 'want to' },
    { pattern: /\bgotta\b/gi, replacement: 'got to' },
    { pattern: /\bkinda\b/gi, replacement: 'kind of' },
    { pattern: /\bsorta\b/gi, replacement: 'sort of' },
    { pattern: /\byeah\b/gi, replacement: 'yes' },
    { pattern: /\bnope\b/gi, replacement: 'no' },
    { pattern: /\bsure\b/gi, replacement: 'certainly' },
    { pattern: /\bno\s+problem\b/gi, replacement: 'you are welcome' },
    { pattern: /\bmy\s+bad\b/gi, replacement: 'my mistake' },
  ],
  casual: [
    { pattern: /\butilize\b/gi, replacement: 'use' },
    { pattern: /\bcommence\b/gi, replacement: 'start' },
    { pattern: /\bterminate\b/gi, replacement: 'end' },
    { pattern: /\bnevertheless\b/gi, replacement: 'but' },
    { pattern: /\bfurthermore\b/gi, replacement: 'also' },
    { pattern: /\bhowever\b/gi, replacement: 'but' },
    { pattern: /\btherefore\b/gi, replacement: 'so' },
    { pattern: /\bconsequently\b/gi, replacement: 'so' },
    { pattern: /\bmoreover\b/gi, replacement: 'also' },
  ],
  technical: [
    { pattern: /\buse\b/gi, replacement: 'utilize' },
    { pattern: /\bstart\b/gi, replacement: 'initiate' },
    { pattern: /\bend\b/gi, replacement: 'terminate' },
    { pattern: /\bmake\b/gi, replacement: 'create' },
    { pattern: /\bget\b/gi, replacement: 'obtain' },
    { pattern: /\bput\b/gi, replacement: 'place' },
    { pattern: /\bsend\b/gi, replacement: 'transmit' },
    { pattern: /\bcheck\b/gi, replacement: 'verify' },
    { pattern: /\bfix\b/gi, replacement: 'resolve' },
    { pattern: /\bhelp\b/gi, replacement: 'assist' },
    { pattern: /\bshow\b/gi, replacement: 'demonstrate' },
    { pattern: /\btell\b/gi, replacement: 'inform' },
    { pattern: /\bbuy\b/gi, replacement: 'purchase' },
    { pattern: /\bsell\b/gi, replacement: 'market' },
  ],
  creative: [
    { pattern: /\bgood\b/gi, replacement: 'exceptional' },
    { pattern: /\bbad\b/gi, replacement: 'challenging' },
    { pattern: /\bbig\b/gi, replacement: 'monumental' },
    { pattern: /\bsmall\b/gi, replacement: 'intimate' },
    { pattern: /\bvery\b/gi, replacement: 'remarkably' },
    { pattern: /\breally\b/gi, replacement: 'profoundly' },
    { pattern: /\bnice\b/gi, replacement: 'delightful' },
    { pattern: /\bhappy\b/gi, replacement: 'ecstatic' },
    { pattern: /\bsad\b/gi, replacement: 'melancholy' },
    { pattern: /\bthink\b/gi, replacement: 'envision' },
    { pattern: /\bmake\b/gi, replacement: 'craft' },
    { pattern: /\buse\b/gi, replacement: 'leverage' },
  ],
  academic: [
    { pattern: /\bgood\b/gi, replacement: 'effective' },
    { pattern: /\bbad\b/gi, replacement: 'ineffective' },
    { pattern: /\bbig\b/gi, replacement: 'substantial' },
    { pattern: /\bsmall\b/gi, replacement: 'minimal' },
    { pattern: /\bvery\b/gi, replacement: 'highly' },
    { pattern: /\breally\b/gi, replacement: 'significantly' },
    { pattern: /\balso\b/gi, replacement: 'furthermore' },
    { pattern: /\bbut\b/gi, replacement: 'however' },
    { pattern: /\bso\b/gi, replacement: 'therefore' },
    { pattern: /\bsays\b/gi, replacement: 'states' },
    { pattern: /\bshows\b/gi, replacement: 'demonstrates' },
    { pattern: /\bgets\b/gi, replacement: 'obtains' },
    { pattern: /\buses\b/gi, replacement: 'utilizes' },
    { pattern: /\bmakes\b/gi, replacement: 'creates' },
    { pattern: /\bputs\b/gi, replacement: 'places' },
  ],
};

// Structure improvements - section headers and formatting
const improveStructure = (text: string): { text: string; changes: Array<{ type: 'add' | 'remove' | 'replace'; description: string; position: number }> } => {
  const changes: Array<{ type: 'add' | 'remove' | 'replace'; description: string; position: number }> = [];
  let improved = text;

  // Add section breaks for long content
  if (improved.length > 500 && !improved.includes('##')) {
    const paragraphs = improved.split('\n\n');
    if (paragraphs.length > 3) {
      const sections: string[] = [];
      let currentSection: string[] = [];

      paragraphs.forEach((para, idx) => {
        if (para.trim().length > 0) {
          currentSection.push(para);
          if (currentSection.length >= 2 || idx === paragraphs.length - 1) {
            if (sections.length === 0) {
              sections.push('## Overview\n\n' + currentSection.join('\n\n'));
            } else if (sections.length === 1) {
              sections.push('## Details\n\n' + currentSection.join('\n\n'));
            } else {
              sections.push('## Additional Information\n\n' + currentSection.join('\n\n'));
            }
            currentSection = [];
          }
        }
      });

      improved = sections.join('\n\n---\n\n');
      changes.push({ type: 'add', description: 'Added section headers for better organization', position: 0 });
    }
  }

  // Convert long lists to bullet points
  const numberedListPattern = /(\d+)[.)]\s+([^\n]+)/g;
  if (improved.match(numberedListPattern) && !improved.includes('-')) {
    improved = improved.replace(numberedListPattern, '- $2');
    changes.push({ type: 'replace', description: 'Converted numbered list to bullet points for readability', position: 0 });
  }

  // Add line breaks after sentences in very long paragraphs
  const longParagraphPattern = /([^\n]{200,})/g;
  improved = improved.replace(longParagraphPattern, (match) => {
    return match.replace(/([.!?])\s+/g, '$1\n');
  });

  return { text: improved, changes };
};

// Calculate readability score (simplified Flesch Reading Ease)
const calculateReadability = (text: string): number => {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  const syllables = text.split(/\s+/).reduce((count, word) => {
    return count + Math.max(1, word.toLowerCase().replace(/[^aeiou]/g, '').length);
  }, 0);

  if (sentences === 0 || words === 0) return 0;

  const avgSentenceLength = words / sentences;
  const avgSyllablesPerWord = syllables / words;

  // Simplified formula
  const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  return Math.max(0, Math.min(100, Math.round(score)));
};

// Generate suggestions for further improvement
const generateSuggestions = (text: string, mode: EditMode): string[] => {
  const suggestions: string[] = [];

  // Length-based suggestions
  if (text.length < 100) {
    suggestions.push('Consider adding more detail for clarity');
  } else if (text.length > 1000 && mode !== 'structure') {
    suggestions.push('Long prompt - consider breaking into sections');
  }

  // Check for passive voice indicators
  const passiveIndicators = ['was', 'were', 'been', 'being', 'is being', 'are being', 'was being'];
  const hasPassive = passiveIndicators.some(indicator =>
    new RegExp(`\\b${indicator}\\s+\\w+ed\\b`, 'i').test(text)
  );
  if (hasPassive) {
    suggestions.push('Consider using active voice for more impact');
  }

  // Check for weak words
  const weakWords = ['thing', 'stuff', 'very', 'really', 'just', 'quite', 'rather'];
  const foundWeakWords = weakWords.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(text));
  if (foundWeakWords.length > 0) {
    suggestions.push(`Replace weak words: ${foundWeakWords.join(', ')}`);
  }

  // Check for questions
  if (!text.includes('?')) {
    suggestions.push('Consider adding questions to guide the response');
  }

  // Context-specific suggestions
  if (text.includes('example') && !text.includes('Examples:')) {
    suggestions.push('Add a dedicated Examples section');
  }

  if (text.includes('step') && !text.includes('Steps:')) {
    suggestions.push('Format steps as a numbered list');
  }

  return suggestions.slice(0, 5);
};

/**
 * POST /api/v1/auto-edit
 * Auto-edit a prompt based on selected mode and tone
 */
router.post('/auto-edit', optionalApiKey, apiRateLimiter, requireAnyAuth, (req: Request, res: Response) => {
  try {
    const { prompt, mode, tone, language }: AutoEditRequest = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const original = prompt;
    let edited = prompt;
    const allChanges: Array<{ type: 'add' | 'remove' | 'replace'; description: string; position: number }> = [];

    // Apply grammar fixes
    if (mode === 'grammar' || mode === 'all') {
      GRAMMAR_FIXES.forEach((fix, idx) => {
        if (fix.pattern.test(edited)) {
          edited = edited.replace(fix.pattern, fix.replacement as string);
          allChanges.push({ type: 'replace', description: fix.description, position: idx });
        }
      });
    }

    // Apply clarity improvements
    if (mode === 'clarity' || mode === 'all') {
      CLARITY_IMPROVEMENTS.forEach((improvement, idx) => {
        if (improvement.pattern.test(edited)) {
          edited = edited.replace(improvement.pattern, improvement.replacement);
          allChanges.push({ type: 'replace', description: improvement.description, position: idx });
        }
      });
    }

    // Apply structure improvements
    if (mode === 'structure' || mode === 'all') {
      const structureResult = improveStructure(edited);
      edited = structureResult.text;
      allChanges.push(...structureResult.changes);
    }

    // Apply tone adjustments
    if (mode === 'tone' || mode === 'all') {
      const toneAdjustments = TONE_ADJUSTMENTS[tone] || TONE_ADJUSTMENTS.professional;
      toneAdjustments.forEach((adjustment) => {
        if (adjustment.pattern.test(edited)) {
          edited = edited.replace(adjustment.pattern, adjustment.replacement);
        }
      });
      allChanges.push({ type: 'replace', description: `Adjusted tone to ${tone}`, position: 0 });
    }

    // Calculate stats
    const wordCountBefore = original.split(/\s+/).filter(w => w.length > 0).length;
    const wordCountAfter = edited.split(/\s+/).filter(w => w.length > 0).length;

    const stats = {
      originalLength: original.length,
      editedLength: edited.length,
      wordCountBefore,
      wordCountAfter,
      readabilityBefore: calculateReadability(original),
      readabilityAfter: calculateReadability(edited),
    };

    // Generate suggestions
    const suggestions = generateSuggestions(edited, mode);

    res.json({
      success: true,
      original,
      edited,
      mode,
      changes: allChanges.slice(0, 20), // Limit to 20 changes
      stats,
      suggestions,
      language,
    });
  } catch (error) {
    console.error('Auto-edit error:', error);
    res.status(500).json({
      error: 'Auto-edit failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/auto-edit/modes
 * Get available edit modes and tone styles
 */
router.get('/auto-edit/modes', (_req: Request, res: Response) => {
  res.json({
    modes: [
      { id: 'grammar', label: 'Grammar & Spelling', description: 'Fix spelling and grammar errors' },
      { id: 'clarity', label: 'Clarity', description: 'Make statements clearer' },
      { id: 'structure', label: 'Structure', description: 'Better organization' },
      { id: 'tone', label: 'Tone', description: 'Adjust tone' },
      { id: 'all', label: 'Full Edit', description: 'Apply all improvements' },
    ],
    tones: [
      { id: 'professional', label: 'Professional' },
      { id: 'casual', label: 'Casual' },
      { id: 'technical', label: 'Technical' },
      { id: 'creative', label: 'Creative' },
      { id: 'academic', label: 'Academic' },
    ],
  });
});

export default router;
