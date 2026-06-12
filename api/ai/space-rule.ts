import { withHandler } from '../../server/api/handler.js';

/**
 * POST /api/ai/space-rule
 *
 * Parses a natural language space rule into structured filters.
 * Returns suggested tags, type filter, and semantic query.
 *
 * Request body:
 *   { ruleText: string, language?: 'zh' | 'en' }
 *
 * Response:
 *   { tags: string[], selectedType: string, semanticQuery: string, description: string }
 */

import { proxyFetch } from '../../server/ai/proxy-fetch.js';

export interface SpaceRuleRequest {
  ruleText: string;
  language?: 'zh' | 'en';
}

export interface SpaceRuleResponse {
  tags: string[];
  selectedType: string;
  semanticQuery: string;
  description: string;
}

function getApiKey(): string {
  const key = process.env.BAILIAN_API_KEY;
  if (!key) throw new Error('BAILIAN_API_KEY is not set');
  return key;
}

function getBaseUrl(): string {
  return process.env.BAILIAN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
}

function getRuleModel(): string {
  return process.env.BAILIAN_MODEL_FAST || 'qwen-turbo';
}

const SYSTEM_PROMPT = `You are a quiet, precise assistant that converts natural language descriptions into structured filters for a personal knowledge management system called Lovcore.

Available card types: image, link, article, note, pdf, video, all.

Return strict JSON only. No markdown. No explanation outside JSON.`;

function buildPrompt(ruleText: string, language?: string): string {
  const isEn = language === 'en';
  return [
    isEn
      ? `Convert this natural language rule into structured filters:\n"${ruleText}"`
      : `将这个自然语言规则转换为结构化过滤器：\n"${ruleText}"`,
    isEn
      ? `Return JSON:
{
  "tags": ["relevant lowercase tags, max 5"],
  "selectedType": "one of: all, image, link, article, note, pdf, video",
  "semanticQuery": "a concise search query that captures the core meaning, for embedding-based matching",
  "description": "one sentence describing what this space collects"
}`
      : `返回 JSON：
{
  "tags": ["相关小写标签，最多5个"],
  "selectedType": "all / image / link / article / note / pdf / video 之一",
  "semanticQuery": "一个简洁的搜索查询，捕捉核心含义，用于嵌入匹配",
  "description": "一句话描述这个空间收集什么"
}`,
  ].join('\n\n');
}

function parseResponse(raw: string): SpaceRuleResponse {
  const empty: SpaceRuleResponse = { tags: [], selectedType: 'all', semanticQuery: '', description: '' };

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
    const json = JSON.parse(candidate) as Record<string, unknown>;

    const validTypes = ['all', 'image', 'link', 'article', 'note', 'pdf', 'video'];

    return {
      tags: Array.isArray(json.tags)
        ? json.tags.filter((t): t is string => typeof t === 'string').map(t => t.toLowerCase().trim()).slice(0, 5)
        : [],
      selectedType: typeof json.selectedType === 'string' && validTypes.includes(json.selectedType)
        ? json.selectedType
        : 'all',
      semanticQuery: typeof json.semanticQuery === 'string' ? json.semanticQuery.trim() : '',
      description: typeof json.description === 'string' ? json.description.trim() : '',
    };
  } catch {
    return empty;
  }
}

export async function handleSpaceRule(req: SpaceRuleRequest): Promise<SpaceRuleResponse> {
  const empty: SpaceRuleResponse = { tags: [], selectedType: 'all', semanticQuery: '', description: '' };

  if (!req.ruleText || !req.ruleText.trim()) return empty;

  try {
    const apiKey = getApiKey();
    const baseUrl = getBaseUrl();
    const model = getRuleModel();

    const response = await proxyFetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildPrompt(req.ruleText, req.language) },
        ],
        max_tokens: 300,
        temperature: 0.2,
      }),
    });

    if (!response.ok) return empty;

    const data = await response.json() as Record<string, unknown>;
    const choices = data.choices as Array<Record<string, unknown>> | undefined;
    const message = choices?.[0]?.message as Record<string, unknown> | undefined;
    const text = (message?.content as string ?? '').trim();

    return parseResponse(text);
  } catch {
    return empty;
  }
}


export default withHandler(handleSpaceRule);
