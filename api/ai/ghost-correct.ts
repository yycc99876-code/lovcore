import { withHandler } from '../../server/api/handler.js';

/**
 * POST /api/ai/ghost-correct
 *
 * Quiet correction underlines for the current paragraph.
 * Uses the fast model tier, with local hard-error rules first.
 */

import { aiComplete } from '../../server/ai/router.js';
import type { AICompleteOptions } from '../../server/ai/router.js';

export interface GhostCorrectRequest {
  paragraphText: string;
  fullContext: string;
}

export interface GhostCorrectSuggestion {
  original: string;
  replacement: string;
  reason: string;
  severity: 'minor' | 'moderate' | 'major';
  from?: number;
  to?: number;
}

export interface GhostCorrectResponse {
  suggestions: GhostCorrectSuggestion[];
}

const SYSTEM_PROMPT = `You are a quiet Chinese writing editor for an inline editor.
Find only 1-3 local edits that are clearly worth fixing.
Prioritize hard errors: typos, wrong characters, pinyin leftovers, grammar mistakes, repeated words, and awkward collocations.
Do not rewrite the whole sentence.
Each "original" must be an exact substring from the paragraph.
Each "replacement" must be concise and should not be much longer than "original".
Avoid subjective polishing unless it clearly improves correctness or clarity.
Return strict JSON only. No markdown. No explanation outside JSON.`;

const HARD_RULES: Array<{ pattern: string; replacement: string; reason: string }> = [
  { pattern: '进一布', replacement: '进一步', reason: '错别字' },
  { pattern: '帮主', replacement: '帮助', reason: '错别字' },
  { pattern: '应为', replacement: '因为', reason: '错别字' },
  { pattern: '在去', replacement: '再去', reason: '语义搭配' },
  { pattern: 'dan是', replacement: '但是', reason: '拼音残留' },
  { pattern: '但是是', replacement: '但是', reason: '重复表达' },
  { pattern: '的的', replacement: '的', reason: '重复输入' },
  { pattern: '了了', replacement: '了', reason: '重复输入' },
];

function buildPrompt(req: GhostCorrectRequest): string {
  return [
    `paragraphText:\n${req.paragraphText}`,
    `fullContext, for style only. Do not edit this directly:\n${req.fullContext?.slice(0, 1000) || 'none'}`,
    'Return format:',
    '{"suggestions":[{"original":"exact substring","replacement":"suggested replacement","reason":"short reason","severity":"minor/moderate/major"}]}',
    'Return {"suggestions":[]} if there is nothing clearly worth fixing.',
  ].join('\n\n');
}

function localRuleSuggestions(paragraphText: string): GhostCorrectSuggestion[] {
  const results: GhostCorrectSuggestion[] = [];
  const seen = new Set<string>();

  for (const rule of HARD_RULES) {
    if (!paragraphText.includes(rule.pattern)) continue;
    const key = `${rule.pattern}__${rule.replacement}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      original: rule.pattern,
      replacement: rule.replacement,
      reason: rule.reason,
      severity: 'major',
    });
    if (results.length >= 3) break;
  }

  return results;
}

function parseResponse(raw: string): GhostCorrectSuggestion[] {
  try {
    const cleaned = raw.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '');

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const candidate = firstBrace >= 0 && lastBrace > firstBrace
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;

    const json = JSON.parse(candidate) as { suggestions?: unknown[] };
    const items = Array.isArray(json.suggestions) ? json.suggestions : [];

    const results: GhostCorrectSuggestion[] = [];
    const seen = new Set<string>();

    for (const item of items) {
      const s = item as Record<string, unknown>;
      const original = typeof s.original === 'string' ? s.original.trim() : '';
      const replacement = typeof s.replacement === 'string' ? s.replacement.trim() : '';
      const reason = typeof s.reason === 'string' ? s.reason.trim() : '';
      const severity = (s.severity === 'minor' || s.severity === 'moderate' || s.severity === 'major')
        ? s.severity
        : 'minor';

      if (!original || !replacement) continue;
      if (original === replacement) continue;

      const key = `${original}__${replacement}`;
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({ original, replacement, reason, severity });
      if (results.length >= 3) break;
    }

    return results;
  } catch {
    return [];
  }
}

export async function handleGhostCorrect(req: GhostCorrectRequest): Promise<GhostCorrectResponse> {
  const paragraphText = req.paragraphText?.trim() ?? '';

  if (paragraphText.length < 8) {
    return { suggestions: [] };
  }

  const local = localRuleSuggestions(paragraphText);
  if (local.length >= 2 || paragraphText.length < 18) {
    return { suggestions: local };
  }

  const prompt = buildPrompt(req);
  const options: AICompleteOptions = {
    systemPrompt: SYSTEM_PROMPT,
    maxTokens: 220,
    temperature: 0.15,
  };

  const raw = await aiComplete('ghostCorrect', prompt, options);
  const suggestions = [...local, ...parseResponse(raw)];
  const seen = new Set<string>();

  const validated = suggestions.filter((s) => {
    if (!paragraphText.includes(s.original)) return false;
    const key = `${s.original}__${s.replacement}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { suggestions: validated.slice(0, 3) };
}


export default withHandler(handleGhostCorrect);
