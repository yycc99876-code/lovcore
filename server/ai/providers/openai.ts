/**
 * OpenAI Provider 鈥?BACKEND ONLY
 *
 * Env vars:
 *   OPENAI_API_KEY
 *   OPENAI_BASE_URL
 */

import type { AIProvider } from './types.js';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

const DEFAULT_MODELS: Record<string, string> = {
  fast: 'gpt-4o-mini',
  balanced: 'gpt-4o',
  strong: 'gpt-4o',
};

export const openaiProvider: AIProvider = {
  name: 'openai',

  isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
  },

  resolveModel(tier: string): string {
    return DEFAULT_MODELS[tier] || tier;
  },

  async complete(prompt, model, options) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set.');
    const baseUrl = process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(options?.systemPrompt
            ? [{ role: 'system', content: options.systemPrompt }]
            : []),
          { role: 'user', content: prompt },
        ],
        max_tokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as Record<string, unknown>;
    const choices = data.choices as Array<Record<string, unknown>> | undefined;
    const message = choices?.[0]?.message as Record<string, unknown> | undefined;
    return (message?.content as string) ?? '';
  },
};
