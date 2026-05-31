/**
 * Lovcore AI Type Definitions — FRONTEND
 *
 * Payload and result types for AI tasks.
 * UI components use these types to interact with the AI client.
 *
 * Provider types, model routing, and API keys are in api/ (backend only).
 */

// --- Task Payloads ---

export interface AutocompletePayload {
  paragraph: string;
  beforeCursor: string;
  afterCursor: string;
  fullContext: string;
}

export interface GhostCorrectPayload {
  paragraphText: string;
  fullContext: string;
}

export interface RewritePayload {
  text: string;
  instruction: string;
  language?: string;
}

export interface SummarizePayload {
  text: string;
  maxLength?: number;
  style?: 'brief' | 'detailed' | 'bullet-points';
}

export interface TranscribePayload {
  audioBase64?: string;
  audioUrl?: string;
  language?: string;
  contextTerms?: string[];
}

// --- Task Results ---

export interface AutocompleteResult {
  suggestion: string;
  confidence?: number;
}

export interface GhostCorrectSuggestion {
  original: string;
  replacement: string;
  reason: string;
  severity: 'minor' | 'moderate' | 'major';
  from?: number;
  to?: number;
}

export interface GhostCorrectResult {
  suggestions: GhostCorrectSuggestion[];
}

export interface RewriteResult {
  rewritten: string;
}

export interface SummarizeResult {
  summary: string;
}

export interface TranscribeResult {
  text: string;
  language: string;
  segments?: { start: number; end: number; text: string }[];
}

export interface ScrapeUrlPayload {
  url: string;
}

export interface ScrapeUrlResult {
  title: string;
  description: string;
  image: string;
  favicon: string;
  siteName: string;
}

// --- Analyze Card ---

export interface AnalyzeCardPayload {
  type: string;
  title: string;
  content: string;
  sourceUrl?: string;
  thumbnail?: string;
  language?: 'en' | 'zh';
}

export interface AnalyzeCardResult {
  title?: string;
  summary: string;
  tags: string[];
  keyClaims: string[];
  whyItMatters: string;
  suggestedSpaceIds: string[];
  contentKind: string;
}

// --- Embedding ---

export interface EmbedPayload {
  text: string;
}

export interface EmbedResult {
  embedding: number[];
}

// --- Analyze Image ---

export interface AnalyzeImagePayload {
  imageBase64?: string;
  imageUrl?: string;
  title?: string;
  language?: 'en' | 'zh';
}

export interface AnalyzeImageResult {
  summary: string;
  tags: string[];
  colorPalette: string[];
  visualStyle: string;
  subjects: string[];
  whyItMatters: string;
}

// --- Analyze Video ---

export interface AnalyzeVideoPayload {
  videoBase64?: string;
  videoUrl?: string;
  title?: string;
  language?: 'en' | 'zh';
}

export interface AnalyzeVideoResult {
  summary: string;
  tags: string[];
  subjects: string[];
  whyItMatters: string;
}

// --- Space Rule ---

export interface SpaceRulePayload {
  ruleText: string;
  language?: 'zh' | 'en';
}

export interface SpaceRuleResult {
  tags: string[];
  selectedType: string;
  semanticQuery: string;
  description: string;
}
