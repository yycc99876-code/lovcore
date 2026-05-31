/**
 * Lovcore AI Module — FRONTEND PUBLIC API
 *
 * Import from 'src/ai' only.
 * Do NOT import providers or backend code in UI components.
 */

export { aiClient } from './client';
export type {
  AutocompletePayload,
  AutocompleteResult,
  GhostCorrectPayload,
  GhostCorrectResult,
  GhostCorrectSuggestion,
  RewritePayload,
  RewriteResult,
  SummarizePayload,
  SummarizeResult,
  TranscribePayload,
  TranscribeResult,
} from './types';
