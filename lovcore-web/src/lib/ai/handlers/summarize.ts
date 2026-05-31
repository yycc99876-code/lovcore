/**
 * POST /api/ai/summarize
 *
 * Receives text, returns summary.
 * Uses "balanced" model tier.
 *
 * Request body:
 *   { text: string, maxLength?: number, style?: 'brief' | 'detailed' | 'bullet-points' }
 *
 * Response:
 *   { summary: string }
 */

import { aiComplete } from '../router';
import type { AICompleteOptions } from '../router';

export interface SummarizeRequest {
  text: string;
  maxLength?: number;
  style?: 'brief' | 'detailed' | 'bullet-points';
}

export interface SummarizeResponse {
  summary: string;
}

const SYSTEM_PROMPT = `You are a concise summarizer. Summarize the given text according to the requested style. Be clear and direct.`;

function buildPrompt(req: SummarizeRequest): string {
  const style = req.style || 'brief';
  const styleMap: Record<string, string> = {
    brief: 'Provide a 1-2 sentence summary.',
    detailed: 'Provide a detailed paragraph summary.',
    'bullet-points': 'Summarize as 3-5 bullet points.',
  };

  let prompt = `${styleMap[style] || styleMap.brief}\n\nText:\n${req.text}`;
  if (req.maxLength) prompt += `\n\nKeep under ${req.maxLength} characters.`;
  return prompt;
}

export async function handleSummarize(req: SummarizeRequest): Promise<SummarizeResponse> {
  const prompt = buildPrompt(req);
  const options: AICompleteOptions = {
    systemPrompt: SYSTEM_PROMPT,
    maxTokens: 512,
    temperature: 0.5,
  };

  const raw = await aiComplete('summarize', prompt, options);
  return { summary: raw.trim() };
}
