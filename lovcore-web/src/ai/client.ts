/**
 * Lovcore AI Client — FRONTEND
 *
 * Thin client that calls backend API endpoints.
 * Does NOT import any provider code or API keys.
 */

import type {
  AutocompletePayload,
  AutocompleteResult,
  GhostCorrectPayload,
  GhostCorrectResult,
  RewritePayload,
  RewriteResult,
  ScrapeUrlPayload,
  ScrapeUrlResult,
  SummarizePayload,
  SummarizeResult,
  TranscribePayload,
  TranscribeResult,
} from './types';

function getApiBase(): string {
  return '/api';
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${getApiBase()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`AI API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

export async function autocomplete(payload: AutocompletePayload): Promise<AutocompleteResult> {
  return post<AutocompleteResult>('/ai/autocomplete', payload);
}

export async function ghostCorrect(payload: GhostCorrectPayload): Promise<GhostCorrectResult> {
  return post<GhostCorrectResult>('/ai/ghost-correct', payload);
}

export async function rewrite(payload: RewritePayload): Promise<RewriteResult> {
  return post<RewriteResult>('/ai/rewrite', payload);
}

export async function summarize(payload: SummarizePayload): Promise<SummarizeResult> {
  return post<SummarizeResult>('/ai/summarize', payload);
}

export async function transcribe(payload: TranscribePayload): Promise<TranscribeResult> {
  return post<TranscribeResult>('/ai/transcribe', payload);
}

export async function scrapeUrl(payload: ScrapeUrlPayload): Promise<ScrapeUrlResult> {
  return post<ScrapeUrlResult>('/ai/scrape-url', payload);
}

export const aiClient = {
  autocomplete,
  ghostCorrect,
  rewrite,
  summarize,
  transcribe,
  scrapeUrl,
};
