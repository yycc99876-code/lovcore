import { withHandler } from '../../server/api/handler.js';

/**
 * POST /api/ai/rewrite
 *
 * Receives text + instruction, returns rewritten text.
 * Uses "balanced" model tier.
 *
 * Request body:
 *   { text: string, instruction: string, language?: string }
 *
 * Response:
 *   { rewritten: string }
 */

import { aiComplete } from '../../server/ai/router.js';
import type { AICompleteOptions } from '../../server/ai/router.js';

export interface RewriteRequest {
  text: string;
  instruction: string;
  language?: string;
}

export interface RewriteResponse {
  rewritten: string;
}

const SYSTEM_PROMPT = `You are a writing assistant. Rewrite the given text according to the user's instruction. Preserve the core meaning. Return ONLY the rewritten text, no explanation.`;

function buildPrompt(req: RewriteRequest): string {
  return `Instruction: ${req.instruction}\n\nOriginal text:\n${req.text}\n\nRewritten:`;
}

export async function handleRewrite(req: RewriteRequest): Promise<RewriteResponse> {
  const prompt = buildPrompt(req);
  const options: AICompleteOptions = {
    systemPrompt: SYSTEM_PROMPT,
    maxTokens: 2048,
    temperature: 0.7,
  };

  const raw = await aiComplete('rewrite', prompt, options);
  return { rewritten: raw.trim() };
}


export default withHandler(handleRewrite);
