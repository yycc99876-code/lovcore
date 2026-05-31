import { withHandler } from '../_handler.js';

/**
 * POST /api/ai/analyze-image
 *
 * Analyzes an image using Bailian's vision model.
 * Returns structured metadata: summary, tags, subjects, visual style.
 *
 * Request body:
 *   { imageBase64?: string, imageUrl?: string, title?: string, language?: 'zh' | 'en' }
 *
 * Response:
 *   { summary, tags, colorPalette?, visualStyle?, subjects, whyItMatters }
 */

import { proxyFetch } from './proxy-fetch.js';

export interface AnalyzeImageRequest {
  imageBase64?: string;
  imageUrl?: string;
  title?: string;
  language?: 'zh' | 'en';
}

export interface AnalyzeImageResponse {
  summary: string;
  tags: string[];
  colorPalette: string[];
  visualStyle: string;
  subjects: string[];
  whyItMatters: string;
}

function getApiKey(): string {
  const key = process.env.BAILIAN_API_KEY;
  if (!key) throw new Error('BAILIAN_API_KEY is not set');
  return key;
}

function getBaseUrl(): string {
  return process.env.BAILIAN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
}

function getVisionModel(): string {
  return process.env.BAILIAN_MODEL_VISION || 'qwen-vl-plus';
}

const SYSTEM_PROMPT = `You are a quiet, precise visual archivist inside a private digital vault called Lovcore.
You describe images the way a thoughtful museum cataloguer would: factual, specific, understated.
Never marketing language. Never superlatives. Never "stunning" or "breathtaking".

Return strict JSON only. No markdown. No explanation outside JSON.`;

function buildPrompt(title?: string, language?: string): string {
  const isEn = language === 'en';
  return [
    isEn ? 'Analyze this image. Describe what you see factually.' : '分析这张图片。客观描述你看到的内容。',
    title ? `Context: The user saved this as "${title}".` : '',
    isEn
      ? `Return JSON:
{
  "summary": "1-2 sentence factual description of the image content.",
  "tags": ["3-6 lowercase searchable tags"],
  "colorPalette": ["3-5 dominant hex colors, e.g. #1A1A18"],
  "visualStyle": "one of: photograph, illustration, screenshot, diagram, painting, collage, abstract, other",
  "subjects": ["2-4 main subjects or objects in the image"],
  "whyItMatters": "1 sentence: why this image might matter in a personal knowledge base"
}`
      : `返回 JSON：
{
  "summary": "1-2句事实性描述。",
  "tags": ["3-6个小写可搜索标签"],
  "colorPalette": ["3-5个主色调hex值，如 #1A1A18"],
  "visualStyle": "photograph / illustration / screenshot / diagram / painting / collage / abstract / other 之一",
  "subjects": ["2-4个图片中的主要主体或物体"],
  "whyItMatters": "1句话：这张图片在个人知识库中可能的意义"
}`,
  ].filter(Boolean).join('\n\n');
}

function parseResponse(raw: string): AnalyzeImageResponse {
  const empty: AnalyzeImageResponse = {
    summary: '', tags: [], colorPalette: [], visualStyle: 'other', subjects: [], whyItMatters: '',
  };

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

    return {
      summary: typeof json.summary === 'string' ? json.summary.trim() : '',
      tags: Array.isArray(json.tags)
        ? json.tags.filter((t): t is string => typeof t === 'string').map(t => t.toLowerCase().trim()).slice(0, 8)
        : [],
      colorPalette: Array.isArray(json.colorPalette)
        ? json.colorPalette.filter((c): c is string => typeof c === 'string').slice(0, 6)
        : [],
      visualStyle: typeof json.visualStyle === 'string' ? json.visualStyle.trim() : 'other',
      subjects: Array.isArray(json.subjects)
        ? json.subjects.filter((s): s is string => typeof s === 'string').slice(0, 6)
        : [],
      whyItMatters: typeof json.whyItMatters === 'string' ? json.whyItMatters.trim() : '',
    };
  } catch {
    return empty;
  }
}

export async function handleAnalyzeImage(req: AnalyzeImageRequest): Promise<AnalyzeImageResponse> {
  const empty: AnalyzeImageResponse = {
    summary: '', tags: [], colorPalette: [], visualStyle: 'other', subjects: [], whyItMatters: '',
  };

  if (!req.imageBase64 && !req.imageUrl) return empty;

  try {
    const apiKey = getApiKey();
    const baseUrl = getBaseUrl();
    const model = getVisionModel();

    const imageContent: Record<string, unknown> = req.imageBase64
      ? { url: `data:image/jpeg;base64,${req.imageBase64}` }
      : { url: req.imageUrl };

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
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: imageContent },
              { type: 'text', text: buildPrompt(req.title, req.language) },
            ],
          },
        ],
        max_tokens: 600,
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


export default withHandler(handleAnalyzeImage);
