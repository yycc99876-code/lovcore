import { withHandler } from '../_handler';

import { proxyFetch } from './proxy-fetch';

export interface EmbedRequest {
  text: string;
}

export interface EmbedResponse {
  embedding: number[];
}

function getApiKey(): string {
  const key = process.env.BAILIAN_API_KEY;
  if (!key) throw new Error('BAILIAN_API_KEY is not set');
  return key;
}

function getBaseUrl(): string {
  return process.env.BAILIAN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
}

function getEmbeddingModel(): string {
  return process.env.BAILIAN_MODEL_EMBEDDING || 'text-embedding-v3';
}

export async function handleEmbed(req: EmbedRequest): Promise<EmbedResponse> {
  if (!req.text || !req.text.trim()) {
    return { embedding: [] };
  }

  try {
    const apiKey = getApiKey();
    const baseUrl = getBaseUrl();
    const model = getEmbeddingModel();

    const response = await proxyFetch(`${baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: req.text.slice(0, 8000),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Embedding API error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as Record<string, unknown>;
    const dataArr = data.data as Array<Record<string, unknown>> | undefined;
    const embedding = dataArr?.[0]?.embedding as number[] | undefined;

    return { embedding: embedding || [] };
  } catch {
    return { embedding: [] };
  }
}


export default withHandler(handleEmbed);
