/**
 * Bailian (Alibaba Cloud DashScope) Provider — BACKEND ONLY
 *
 * This file must NEVER be imported by frontend code.
 * API key is read from server-side environment variables (no VITE_ prefix).
 *
 * Env vars:
 *   BAILIAN_API_KEY
 *   BAILIAN_BASE_URL
 *   HTTPS_PROXY / HTTP_PROXY (optional, for proxy environments)
 */

import type { AIProvider } from './types';
import { proxyFetch } from '../proxy-fetch';

const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

function getApiKey(): string {
  const key = process.env.BAILIAN_API_KEY;
  if (!key) throw new Error('BAILIAN_API_KEY is not set in environment variables.');
  return key;
}

function getBaseUrl(): string {
  return process.env.BAILIAN_BASE_URL || DEFAULT_BASE_URL;
}

function getModel(tier: string): string {
  const envMap: Record<string, string | undefined> = {
    fast: process.env.BAILIAN_MODEL_FAST,
    balanced: process.env.BAILIAN_MODEL_BALANCED,
    strong: process.env.BAILIAN_MODEL_STRONG,
    coder: process.env.BAILIAN_MODEL_CODER,
    vision: process.env.BAILIAN_MODEL_VISION,
    visionFast: process.env.BAILIAN_MODEL_VISION_FAST,
    asrRealtime: process.env.BAILIAN_MODEL_ASR_REALTIME,
    asrFile: process.env.BAILIAN_MODEL_ASR_FILE,
    asrContextRealtime: process.env.BAILIAN_MODEL_ASR_CONTEXT_REALTIME,
    asrContextFile: process.env.BAILIAN_MODEL_ASR_CONTEXT_FILE,
  };

  const defaults: Record<string, string> = {
    fast: 'qwen-turbo',
    balanced: 'qwen-turbo',
    strong: 'qwen3.6-max-preview',
    coder: 'qwen3-coder-plus',
    vision: 'qwen3-vl-plus',
    visionFast: 'qwen3-vl-flash',
    asrRealtime: 'fun-asr-realtime',
    asrFile: 'fun-asr',
    asrContextRealtime: 'qwen3.5-omni-plus-realtime',
    asrContextFile: 'qwen3.5-omni-plus',
  };

  return envMap[tier] || defaults[tier] || tier;
}

export const bailianProvider: AIProvider = {
  name: 'bailian',

  isAvailable(): boolean {
    return !!process.env.BAILIAN_API_KEY;
  },

  resolveModel(tier: string): string {
    return getModel(tier);
  },

  async complete(prompt, model, options) {
    const apiKey = getApiKey();
    const baseUrl = getBaseUrl();

    const response = await proxyFetch(`${baseUrl}/chat/completions`, {
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
      throw new Error(`Bailian API error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as Record<string, unknown>;
    const choices = data.choices as Array<Record<string, unknown>> | undefined;
    const message = choices?.[0]?.message as Record<string, unknown> | undefined;
    return (message?.content as string) ?? '';
  },
};
