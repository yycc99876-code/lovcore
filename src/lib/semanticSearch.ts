/**
 * Hybrid semantic search combining cosine similarity with keyword/tag/title signals.
 *
 * - Query embedding is generated on-demand via aiClient.embed()
 * - Card embeddings are stored in item.embedding (generated during ingest)
 * - Hybrid scoring: semantic (0.5) + title (0.2) + tag (0.15) + keyword (0.15)
 * - Soft threshold prevents irrelevant results from flooding
 * - Falls back to keyword-only search when embeddings are unavailable
 */

import { aiClient } from '../ai/client';
import type { Item } from '../types';

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

let queryEmbeddingCache: { text: string; embedding: number[] } | null = null;

/**
 * Generate embedding for a search query. Cached per session.
 */
export async function getQueryEmbedding(query: string): Promise<number[] | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  if (queryEmbeddingCache && queryEmbeddingCache.text === trimmed) {
    return queryEmbeddingCache.embedding;
  }

  try {
    const result = await aiClient.embed({ text: trimmed });
    if (result.embedding.length > 0) {
      queryEmbeddingCache = { text: trimmed, embedding: result.embedding };
      return result.embedding;
    }
    return null;
  } catch {
    return null;
  }
}

// --- Hybrid Scoring ---

const WEIGHT_SEMANTIC = 0.5;
const WEIGHT_TITLE = 0.2;
const WEIGHT_TAG = 0.15;
const WEIGHT_KEYWORD = 0.15;
const SOFT_THRESHOLD = 0.18;

function keywordScore(text: string, query: string): number {
  if (!query || !text) return 0;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  if (lower.includes(q)) return 1;
  // Partial word match
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const matched = words.filter((w) => lower.includes(w)).length;
  return matched / words.length;
}

function titleScore(title: string, query: string): number {
  if (!query || !title) return 0;
  return keywordScore(title, query);
}

function tagScore(tags: string[], query: string): number {
  if (!query || tags.length === 0) return 0;
  const q = query.toLowerCase();
  const matched = tags.filter((tag) => tag.toLowerCase().includes(q) || q.includes(tag.toLowerCase())).length;
  return matched > 0 ? Math.min(1, matched / 2) : 0;
}

function computeHybridScore(item: Item, query: string, queryEmbedding: number[]): number {
  const semantic = item.embedding ? cosineSimilarity(queryEmbedding, item.embedding) : 0;
  const title = titleScore(item.title, query);
  const tag = tagScore(item.tags, query);

  const searchableText = [
    item.content,
    item.summary,
    item.sourceUrl,
    item.keyClaims?.join(' '),
    item.whyItMatters,
  ].filter(Boolean).join(' ');
  const keyword = keywordScore(searchableText, query);

  return (
    WEIGHT_SEMANTIC * semantic +
    WEIGHT_TITLE * title +
    WEIGHT_TAG * tag +
    WEIGHT_KEYWORD * keyword
  );
}

/**
 * Re-rank items using hybrid scoring (semantic + keyword + title + tag).
 * Applies soft threshold to filter out irrelevant results.
 * Items without embeddings get reduced semantic weight.
 */
export function rerankBySimilarity(items: Item[], queryEmbedding: number[], query?: string): Item[] {
  const q = (query || '').trim().toLowerCase();

  const withScore = items.map((item) => {
    if (q) {
      const score = computeHybridScore(item, q, queryEmbedding);
      return { item, score };
    }
    // No text query — pure semantic similarity
    const score = item.embedding ? cosineSimilarity(queryEmbedding, item.embedding) : -1;
    return { item, score };
  });

  // Apply soft threshold when we have a text query
  const filtered = q
    ? withScore.filter((s) => s.score >= SOFT_THRESHOLD || s.score < 0)
    : withScore;

  filtered.sort((a, b) => {
    if (a.score >= 0 && b.score >= 0) return b.score - a.score;
    if (a.score >= 0) return -1;
    if (b.score >= 0) return 1;
    return 0;
  });

  return filtered.map((s) => s.item);
}
