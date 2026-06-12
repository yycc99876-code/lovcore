import { withHandler } from '../../server/api/handler.js';

/**
 * POST /api/ai/analyze-video
 *
 * Analyzes a video using Bailian's vision model (qwen-vl-max).
 * Returns structured metadata: summary, tags, subjects, duration estimate.
 *
 * Request body:
 *   { videoBase64?: string, videoUrl?: string, title?: string, language?: 'zh' | 'en' }
 *
 * Response:
 *   { summary, tags, subjects, whyItMatters }
 */

import { proxyFetch } from '../../server/ai/proxy-fetch.js';

export interface AnalyzeVideoRequest {
  videoBase64?: string;
  videoUrl?: string;
  title?: string;
  language?: 'zh' | 'en';
}

export interface AnalyzeVideoResponse {
  summary: string;
  tags: string[];
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

function getVideoModel(): string {
  return process.env.BAILIAN_MODEL_VIDEO || 'qwen-vl-max-latest';
}

const SYSTEM_PROMPT = `You are a quiet, precise video archivist inside a private digital vault called Lovcore.
You describe videos the way a thoughtful museum cataloguer would: factual, specific, understated.
Never marketing language. Never superlatives. Never "stunning" or "breathtaking".

Return strict JSON only. No markdown. No explanation outside JSON.`;

function buildPrompt(title?: string, language?: string): string {
  const isEn = language === 'en';
  return [
    isEn ? 'Analyze this video. Describe what you see and hear factually.' : '分析这个视频。客观描述你看到和听到的内容。',
    title ? `Context: The user saved this as "${title}".` : '',
    isEn
      ? `Return JSON:
{
  "summary": "2-3 sentence factual description of the video content, including what is shown and any notable audio.",
  "tags": ["4-8 lowercase searchable tags"],
  "subjects": ["2-5 main subjects, activities, or objects in the video"],
  "whyItMatters": "1 sentence: why this video might matter in a personal knowledge base"
}`
      : `返回 JSON：
{
  "summary": "2-3句事实性描述，包括画面内容和显著音频。",
  "tags": ["4-8个小写可搜索标签"],
  "subjects": ["2-5个视频中的主要主体、活动或物体"],
  "whyItMatters": "1句话：这个视频在个人知识库中可能的意义"
}`,
  ].filter(Boolean).join('\n\n');
}

function parseResponse(raw: string): AnalyzeVideoResponse {
  const empty: AnalyzeVideoResponse = {
    summary: '', tags: [], subjects: [], whyItMatters: '',
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
        ? json.tags.filter((t): t is string => typeof t === 'string').map(t => t.toLowerCase().trim()).slice(0, 10)
        : [],
      subjects: Array.isArray(json.subjects)
        ? json.subjects.filter((s): s is string => typeof s === 'string').slice(0, 8)
        : [],
      whyItMatters: typeof json.whyItMatters === 'string' ? json.whyItMatters.trim() : '',
    };
  } catch {
    return empty;
  }
}

export async function handleAnalyzeVideo(req: AnalyzeVideoRequest): Promise<AnalyzeVideoResponse> {
  const empty: AnalyzeVideoResponse = {
    summary: '', tags: [], subjects: [], whyItMatters: '',
  };

  if (!req.videoBase64 && !req.videoUrl) return empty;

  try {
    const apiKey = getApiKey();
    const baseUrl = getBaseUrl();
    const model = getVideoModel();

    const videoContent: Record<string, unknown> = req.videoBase64
      ? { url: `data:video/mp4;base64,${req.videoBase64}` }
      : { url: req.videoUrl };

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
              { type: 'video_url', video_url: videoContent },
              { type: 'text', text: buildPrompt(req.title, req.language) },
            ],
          },
        ],
        max_tokens: 800,
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


export default withHandler(handleAnalyzeVideo);
