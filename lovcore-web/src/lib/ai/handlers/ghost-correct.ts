/**
 * POST /api/ai/ghost-correct
 *
 * Quiet correction underlines for the current paragraph.
 * Uses "fast" model tier.
 *
 * Request body:
 *   { paragraphText: string, fullContext: string }
 *
 * Response:
 *   { suggestions: [{ original, replacement, reason, severity, from?, to? }] }
 */

import { aiComplete } from '../router';
import type { AICompleteOptions } from '../router';

export interface GhostCorrectRequest {
  paragraphText: string;
  fullContext: string;
}

export interface GhostCorrectSuggestion {
  original: string;
  replacement: string;
  reason: string;
  severity: 'minor' | 'moderate' | 'major';
  from?: number;
  to?: number;
}

export interface GhostCorrectResponse {
  suggestions: GhostCorrectSuggestion[];
}

const SYSTEM_PROMPT = `你是中文写作编辑。分析用户给定的段落，找出 1-3 个最值得改进的局部问题。优先发现错别字、搭配错误、拼音/输入法残留等硬性问题，其次才是风格润色。只做必要的局部编辑，不要重写整句。每条 original 必须是段落中已有的精确片段，replacement 应简洁，长度不要明显超过 original。避免主观润色，除非能明显提升清晰度或正确性。不允许重复或重叠建议。

severity 含义：
- minor: 措辞微调
- moderate: 表达改进
- major: 逻辑/结构/硬性问题（错别字、语法错误）

只返回严格 JSON，不要输出其他内容。`;

function buildPrompt(req: GhostCorrectRequest): string {
  return `paragraphText:\n${req.paragraphText}\n\nfullContext（仅供参考，不要修改）:\n${req.fullContext?.slice(0, 1000) || '无'}\n\n返回格式：{"suggestions":[{"original":"原文片段","replacement":"建议替换","reason":"原因","severity":"minor/moderate/major"}]}，最多 3 条。如果没有值得修改的地方，返回 {"suggestions":[]}`;
}

function parseResponse(raw: string): GhostCorrectSuggestion[] {
  try {
    const cleaned = raw.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '');

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const candidate = firstBrace >= 0 && lastBrace > firstBrace
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;

    const json = JSON.parse(candidate);
    const items = Array.isArray(json?.suggestions) ? json.suggestions : [];

    const results: GhostCorrectSuggestion[] = [];
    const seen = new Set<string>();

    for (const s of items) {
      const original = typeof s.original === 'string' ? s.original.trim() : '';
      const replacement = typeof s.replacement === 'string' ? s.replacement.trim() : '';
      const reason = typeof s.reason === 'string' ? s.reason.trim() : '';
      const severity = (s.severity === 'minor' || s.severity === 'moderate' || s.severity === 'major')
        ? s.severity
        : 'minor';

      if (!original || !replacement) continue;
      if (original === replacement) continue;

      const key = `${original}__${replacement}`;
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({ original, replacement, reason, severity });
      if (results.length >= 3) break;
    }

    return results;
  } catch {
    return [];
  }
}

export async function handleGhostCorrect(req: GhostCorrectRequest): Promise<GhostCorrectResponse> {
  // Don't scan very short paragraphs
  if (!req.paragraphText || req.paragraphText.trim().length < 8) {
    return { suggestions: [] };
  }

  const prompt = buildPrompt(req);
  const options: AICompleteOptions = {
    systemPrompt: SYSTEM_PROMPT,
    maxTokens: 256,
    temperature: 0.2,
  };

  const raw = await aiComplete('ghostCorrect', prompt, options);
  const suggestions = parseResponse(raw);

  // Validate that original text actually exists in the paragraph
  const validated = suggestions.filter(s => req.paragraphText.includes(s.original));

  return { suggestions: validated };
}
