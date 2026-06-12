/**
 * Anthropic (Claude) Provider 鈥?BACKEND ONLY
 *
 * Env vars:
 *   ANTHROPIC_API_KEY
 *   ANTHROPIC_BASE_URL
 */

import type { AIProvider } from './types.js';

const DEFAULT_BASE_URL = 'https://api.anthropic.com/v1';

const DEFAULT_MODELS: Record<string, string> = {
  fast: 'claude-haiku-4-5-20251001',
  balanced: 'claude-sonnet-4-6',
  strong: 'claude-opus-4-7',
};

export const anthropicProvider: AIProvider = {
  name: 'anthropic',

  isAvailable(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  },

  resolveModel(tier: string): string {
    return DEFAULT_MODELS[tier] || tier;
  },

  async complete(prompt, model, options) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set.');
    const baseUrl = process.env.ANTHROPIC_BASE_URL || DEFAULT_BASE_URL;

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: options?.maxTokens ?? 1024,
        ...(options?.systemPrompt ? { system: options.systemPrompt } : {}),
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as Record<string, unknown>;
    const content = data.content as Array<Record<string, unknown>> | undefined;
    const textBlock = content?.find((b) => b.type === 'text');
    return (textBlock?.text as string) ?? '';
  },
};
