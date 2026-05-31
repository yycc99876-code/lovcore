/**
 * Backend AI Router — BACKEND ONLY
 *
 * Selects provider and model based on task type.
 * This is the ONLY place that imports provider implementations.
 *
 * Provider priority: Bailian → OpenAI → Anthropic
 * (configurable per task via env vars in the future)
 */

import type { AIProvider, AIProviderName } from './providers/types';
import { bailianProvider } from './providers/bailian';
import { openaiProvider } from './providers/openai';
import { anthropicProvider } from './providers/anthropic';

// --- Task → Model Tier Mapping ---

export type AITaskKind =
  | 'autocomplete'
  | 'ghostCorrect'
  | 'rewrite'
  | 'summarize'
  | 'transcribe'
  | 'analyzeCard'
  | 'embed';

const TASK_TIER_MAP: Record<AITaskKind, string> = {
  autocomplete: 'fast',
  ghostCorrect: 'fast',
  rewrite: 'fast',
  summarize: 'balanced',
  transcribe: 'asrRealtime',
  analyzeCard: 'balanced',
  embed: 'fast',
};

// --- Provider Resolution ---

interface TaskRoute {
  provider: AIProvider;
  modelTier: string;
  fallback?: TaskRoute;
}

function getAllProviders(): AIProvider[] {
  return [bailianProvider, openaiProvider, anthropicProvider];
}

function resolveRoute(task: AITaskKind): TaskRoute {
  const tier = TASK_TIER_MAP[task];
  const providers = getAllProviders();

  for (let i = 0; i < providers.length; i++) {
    if (providers[i].isAvailable()) {
      const fallback = providers.slice(i + 1).find((p) => p.isAvailable());
      return {
        provider: providers[i],
        modelTier: tier,
        ...(fallback ? { fallback: { provider: fallback, modelTier: tier } } : {}),
      };
    }
  }

  throw new Error(
    'No AI provider available. Set BAILIAN_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY.',
  );
}

// --- Completion Interface ---

export interface AICompleteOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

/**
 * Execute a single AI completion for a given task.
 * Handles provider selection, model resolution, and fallback.
 */
export async function aiComplete(
  task: AITaskKind,
  prompt: string,
  options?: AICompleteOptions,
): Promise<string> {
  const route = resolveRoute(task);

  try {
    return await route.provider.complete(
      prompt,
      route.provider.resolveModel(route.modelTier),
      options,
    );
  } catch (error) {
    if (route.fallback) {
      return await route.fallback.provider.complete(
        prompt,
        route.fallback.provider.resolveModel(route.fallback.modelTier),
        options,
      );
    }
    throw error;
  }
}

/**
 * Get provider info for diagnostics (no secrets exposed).
 */
export function getProviderStatus(): { name: AIProviderName; available: boolean }[] {
  return getAllProviders().map((p) => ({
    name: p.name,
    available: p.isAvailable(),
  }));
}
