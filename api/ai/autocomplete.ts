import { withHandler } from '../_handler.js';

/**
 * POST /api/ai/autocomplete
 *
 * Cursor-like ghost text autocomplete.
 * Uses the fast model tier for low latency.
 */

import { aiComplete } from './router.js';
import type { AICompleteOptions } from './router.js';

export interface AutocompleteRequest {
  paragraph: string;
  beforeCursor: string;
  afterCursor: string;
  fullContext: string;
}

export interface AutocompleteResponse {
  suggestion: string;
  confidence?: number;
}

const SYSTEM_PROMPT = `You are a Cursor-style inline writing autocomplete engine.
Predict only the text that should appear AFTER the user's cursor.
Return plain text only: no quotes, no markdown, no explanation, no prefix label.
Never repeat the user's existing text before the cursor.
Continue in the same language, tone, and rhythm as the input.
If the input is a well-known poem, idiom, fixed phrase, or obvious unfinished sentence, prefer the canonical next phrase.
If there is no useful continuation, return an empty string.`;

const FIXED_COMPLETIONS: Array<[string, string]> = [
  ['床前明月光，', '疑是地上霜'],
  ['鹅鹅鹅，', '曲项向天歌'],
  ['白日依山尽，', '黄河入海流'],
  ['春眠不觉晓，', '处处闻啼鸟'],
];

function getFixedCompletion(beforeCursor: string): string | null {
  const trimmed = beforeCursor.trim();
  const match = FIXED_COMPLETIONS.find(([prefix]) => trimmed.endsWith(prefix));
  return match?.[1] ?? null;
}

function buildPrompt(req: AutocompleteRequest): string {
  const parts: string[] = [];
  parts.push(`Text before cursor:\n${req.beforeCursor}`);

  if (req.afterCursor) {
    parts.push(`\nText after cursor, for context only. Do not repeat it:\n${req.afterCursor}`);
  }

  if (req.fullContext && req.fullContext !== req.paragraph) {
    parts.push(`\nFull document context, for style only:\n${req.fullContext.slice(0, 800)}`);
  }

  parts.push('\nAutocomplete after the cursor:');
  return parts.join('\n');
}

function parseResponse(raw: string, req: AutocompleteRequest): AutocompleteResponse {
  let suggestion = raw.trim().replace(/^["']|["']$/g, '');
  const beforeCursor = req.beforeCursor.trim();
  const paragraph = req.paragraph.trim();

  if (beforeCursor && suggestion.startsWith(beforeCursor)) {
    suggestion = suggestion.slice(beforeCursor.length).trimStart();
  }

  if (paragraph && suggestion.startsWith(paragraph)) {
    suggestion = suggestion.slice(paragraph.length).trimStart();
  }

  suggestion = suggestion
    .replace(/^autocomplete\s*[:：]\s*/i, '')
    .replace(/^completion\s*[:：]\s*/i, '')
    .replace(/^续写\s*[:：]\s*/i, '')
    .replace(/^补全\s*[:：]\s*/i, '')
    .trim();

  if (suggestion.length < 2) return { suggestion: '', confidence: 0 };

  if (suggestion.startsWith('Text before cursor') || suggestion.startsWith('Autocomplete after')) {
    return { suggestion: '', confidence: 0 };
  }

  return { suggestion, confidence: 0.8 };
}

export async function handleAutocomplete(req: AutocompleteRequest): Promise<AutocompleteResponse> {
  const beforeCursor = req.beforeCursor.trim();

  if (beforeCursor.length < 4) {
    return { suggestion: '', confidence: 0 };
  }

  const fixedCompletion = getFixedCompletion(beforeCursor);
  if (fixedCompletion) {
    return { suggestion: fixedCompletion, confidence: 0.98 };
  }

  const lastChar = beforeCursor[beforeCursor.length - 1];
  if ('。！？!?\n'.includes(lastChar)) {
    return { suggestion: '', confidence: 0 };
  }

  const prompt = buildPrompt(req);
  const options: AICompleteOptions = {
    systemPrompt: SYSTEM_PROMPT,
    maxTokens: 120,
    temperature: 0.25,
  };

  const raw = await aiComplete('autocomplete', prompt, options);
  return parseResponse(raw, req);
}


export default withHandler(handleAutocomplete);
