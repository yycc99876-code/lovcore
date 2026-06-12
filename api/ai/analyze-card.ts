import { withHandler } from '../../server/api/handler.js';

import { aiComplete } from '../../server/ai/router.js';
import type { AICompleteOptions } from '../../server/ai/router.js';

export interface AnalyzeCardRequest {
  type: string;
  title: string;
  content: string;
  sourceUrl?: string;
  thumbnail?: string;
  language?: 'en' | 'zh';
}

export interface AnalyzeCardResponse {
  title?: string;
  summary: string;
  tags: string[];
  keyClaims: string[];
  whyItMatters: string;
  suggestedSpaceIds: string[];
  contentKind: string;
}

const SYSTEM_PROMPT = `You are a personal knowledge management assistant inside a quiet, private digital vault called Lovcore.
Your job is to understand what the user saved and extract structured metadata.

Tone: calm, precise, understated. Never marketing language, never superlatives.
Think like a thoughtful archivist, not a social media copywriter.

Preserve the original language of titles, names, websites, and quoted text.
Do not translate people names, handles, publication names, or social post titles.
For links and social posts, keep the provided title unless it is empty or clearly generic.

Return strict JSON only. No markdown. No explanation outside JSON.`;

const SPACE_HINTS: Record<string, string[]> = {
  image: ['space-enterprise-ai'],
  photo: ['space-enterprise-ai'],
  visual: ['space-enterprise-ai'],
  article: ['space-agentic-coding'],
  essay: ['space-agentic-coding'],
  link: ['space-agentic-coding'],
  note: ['space-good'],
  draft: ['space-good'],
  idea: ['space-keynotes'],
  inspiration: ['space-keynotes'],
  video: ['space-venture-thesis'],
  clip: ['space-venture-thesis'],
  research: ['space-research-pdfs'],
  document: ['space-research-pdfs'],
  pdf: ['space-research-pdfs'],
};

function buildPrompt(req: AnalyzeCardRequest): string {
  const parts: string[] = [];
  parts.push(`Content type: ${req.type}`);
  if (req.title) parts.push(`Title: ${req.title}`);
  if (req.sourceUrl) {
    parts.push(`Source URL: ${req.sourceUrl}`);
    parts.push('Important: this is a saved link. Do not invent or translate its title. Prefer omitting "title" unless the provided title is empty or useless.');
  }
  parts.push(`Content:\n${req.content.slice(0, 3000)}`);
  parts.push(`
Return JSON with these fields:
{
  "title": "only include if the original title is empty, generic, or obviously broken; never translate names or social post titles",
  "summary": "1-2 sentence summary. Calm, factual, specific. Not generic.",
  "tags": ["3-6 lowercase tags, hyphenated if multi-word"],
  "keyClaims": ["1-3 key claims or insights from the content"],
  "whyItMatters": "1 sentence: why this matters to the user's knowledge base",
  "contentKind": "one of: insight, reference, idea, inspiration, research, interview, tutorial, opinion, news"
}`);
  return parts.join('\n\n');
}

function parseResponse(raw: string): AnalyzeCardResponse {
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

    const title = typeof json.title === 'string' ? json.title.trim() : undefined;
    const summary = typeof json.summary === 'string' ? json.summary.trim() : '';
    const tags = Array.isArray(json.tags)
      ? json.tags.filter((t): t is string => typeof t === 'string').map(t => t.toLowerCase().trim()).slice(0, 8)
      : [];
    const keyClaims = Array.isArray(json.keyClaims)
      ? json.keyClaims.filter((c): c is string => typeof c === 'string').slice(0, 5)
      : [];
    const whyItMatters = typeof json.whyItMatters === 'string' ? json.whyItMatters.trim() : '';
    const contentKind = typeof json.contentKind === 'string' ? json.contentKind.trim() : 'reference';

    return { title, summary, tags, keyClaims, whyItMatters, suggestedSpaceIds: [], contentKind };
  } catch {
    return { summary: '', tags: [], keyClaims: [], whyItMatters: '', suggestedSpaceIds: [], contentKind: 'reference' };
  }
}

function inferSpaceIds(tags: string[], contentKind: string): string[] {
  const ids = new Set<string>();
  const allText = [...tags, contentKind].join(' ').toLowerCase();
  for (const [keyword, spaces] of Object.entries(SPACE_HINTS)) {
    if (allText.includes(keyword)) {
      for (const s of spaces) ids.add(s);
    }
  }
  return [...ids].slice(0, 4);
}

const EMPTY_RESPONSE: AnalyzeCardResponse = {
  summary: '', tags: [], keyClaims: [], whyItMatters: '', suggestedSpaceIds: [], contentKind: 'reference',
};

export async function handleAnalyzeCard(req: AnalyzeCardRequest): Promise<AnalyzeCardResponse> {
  if (!req.content && !req.title) return EMPTY_RESPONSE;

  try {
    const prompt = buildPrompt(req);
    const options: AICompleteOptions = {
      systemPrompt: SYSTEM_PROMPT,
      maxTokens: 600,
      temperature: 0.3,
    };

    const raw = await aiComplete('analyzeCard', prompt, options);
    const result = parseResponse(raw);
    result.suggestedSpaceIds = inferSpaceIds(result.tags, result.contentKind);
    return result;
  } catch {
    return EMPTY_RESPONSE;
  }
}


export default withHandler(handleAnalyzeCard);
