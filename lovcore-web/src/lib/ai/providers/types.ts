/**
 * Backend AI Provider Types — BACKEND ONLY
 *
 * Shared interface for all AI providers.
 * These types are never imported by frontend code.
 */

export type AIProviderName = 'bailian' | 'openai' | 'anthropic';

export interface AIProvider {
  name: AIProviderName;
  isAvailable(): boolean;
  resolveModel(tier: string): string;
  complete(
    prompt: string,
    model: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    },
  ): Promise<string>;
}
