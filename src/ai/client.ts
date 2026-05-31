/**
 * Lovcore AI Client — FRONTEND
 *
 * Thin client that calls backend API endpoints.
 * Does NOT import any provider code or API keys.
 */

import { withAILog } from '../lib/aiEvents';
import type {
  AnalyzeCardPayload,
  AnalyzeCardResult,
  AnalyzeImagePayload,
  AnalyzeImageResult,
  AnalyzeVideoPayload,
  AnalyzeVideoResult,
  AutocompletePayload,
  AutocompleteResult,
  EmbedPayload,
  EmbedResult,
  GhostCorrectPayload,
  GhostCorrectResult,
  RewritePayload,
  RewriteResult,
  ScrapeUrlPayload,
  ScrapeUrlResult,
  SpaceRulePayload,
  SpaceRuleResult,
  SummarizePayload,
  SummarizeResult,
  TranscribePayload,
  TranscribeResult,
} from './types';

import { supabase } from '../lib/supabaseClient';

function getApiBase(): string {
  return import.meta.env.VITE_API_BASE_URL || '/api';
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers['Authorization'] = `Bearer ${data.session.access_token}`;
    }
  }

  const response = await fetch(`${getApiBase()}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`AI API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

export async function autocomplete(payload: AutocompletePayload): Promise<AutocompleteResult> {
  return withAILog('autocomplete', () => post<AutocompleteResult>('/ai/autocomplete', payload));
}

export async function ghostCorrect(payload: GhostCorrectPayload): Promise<GhostCorrectResult> {
  return withAILog('ghost-correct', () => post<GhostCorrectResult>('/ai/ghost-correct', payload));
}

export async function rewrite(payload: RewritePayload): Promise<RewriteResult> {
  return withAILog('rewrite', () => post<RewriteResult>('/ai/rewrite', payload));
}

export async function summarize(payload: SummarizePayload): Promise<SummarizeResult> {
  return withAILog('summarize', () => post<SummarizeResult>('/ai/summarize', payload));
}

export async function transcribe(payload: TranscribePayload): Promise<TranscribeResult> {
  return withAILog('transcribe', () => post<TranscribeResult>('/ai/transcribe', payload));
}

export async function scrapeUrl(payload: ScrapeUrlPayload): Promise<ScrapeUrlResult> {
  return withAILog('scrape-url', () => post<ScrapeUrlResult>('/ai/scrape-url', payload));
}

export async function analyzeCard(payload: AnalyzeCardPayload): Promise<AnalyzeCardResult> {
  return withAILog('analyze-card', () => post<AnalyzeCardResult>('/ai/analyze-card', payload));
}

export async function embed(payload: EmbedPayload): Promise<EmbedResult> {
  return withAILog('embed', () => post<EmbedResult>('/ai/embed', payload));
}

export async function analyzeImage(payload: AnalyzeImagePayload): Promise<AnalyzeImageResult> {
  return withAILog('analyze-image', () => post<AnalyzeImageResult>('/ai/analyze-image', payload));
}

export async function analyzeVideo(payload: AnalyzeVideoPayload): Promise<AnalyzeVideoResult> {
  return withAILog('analyze-video', () => post<AnalyzeVideoResult>('/ai/analyze-video', payload));
}

export async function spaceRule(payload: SpaceRulePayload): Promise<SpaceRuleResult> {
  return withAILog('space-rule', () => post<SpaceRuleResult>('/ai/space-rule', payload));
}

export const aiClient = {
  autocomplete,
  ghostCorrect,
  rewrite,
  summarize,
  transcribe,
  scrapeUrl,
  analyzeCard,
  embed,
  analyzeImage,
  analyzeVideo,
  spaceRule,
};
