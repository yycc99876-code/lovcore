import { withHandler } from '../_handler.js';
import { proxyFetch } from './proxy-fetch.js';

/**
 * POST /api/ai/transcribe
 *
 * Receives audio as base64 and returns a final transcript. Qwen ASR expects
 * the audio payload as a Data URL inside input_audio.data.
 */

export interface TranscribeRequest {
  audioBase64?: string;
  audioMimeType?: string;
  audioUrl?: string;
  language?: string;
  contextTerms?: string[];
}

export interface TranscribeResponse {
  text: string;
  language: string;
  segments?: { start: number; end: number; text: string }[];
}

function getApiKey(): string {
  const key = process.env.BAILIAN_API_KEY;
  if (!key) throw new Error('BAILIAN_API_KEY is not set');
  return key;
}

function getBaseUrl(): string {
  return process.env.BAILIAN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
}

function getTranscribeModel(): string {
  return process.env.BAILIAN_MODEL_ASR_FILE
    || process.env.BAILIAN_MODEL_ASR_CONTEXT_FILE
    || 'qwen3-asr-flash';
}

function getAudioFormat(mimeType: string | undefined): string {
  if (!mimeType) return 'webm';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'mp4';
  return 'webm';
}

function getLanguage(req: TranscribeRequest): 'zh' | 'en' {
  return req.language === 'en' ? 'en' : 'zh';
}

function getAsrOptions(req: TranscribeRequest): Record<string, unknown> {
  const language = getLanguage(req);
  const options: Record<string, unknown> = {
    language,
    enable_lid: false,
    enable_itn: true,
  };

  if (req.contextTerms?.length) {
    options.hotwords = req.contextTerms.join(' ');
  }

  return options;
}

export async function handleTranscribe(req: TranscribeRequest): Promise<TranscribeResponse> {
  if (!req.audioBase64) {
    return { text: '', language: getLanguage(req) };
  }

  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();
  const model = getTranscribeModel();
  const mimeType = req.audioMimeType || 'audio/webm';
  const format = getAudioFormat(mimeType);
  const dataUrl = req.audioBase64.startsWith('data:')
    ? req.audioBase64
    : `data:${mimeType};base64,${req.audioBase64}`;

  const response = await proxyFetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'input_audio',
              input_audio: {
                data: dataUrl,
                format,
              },
            },
          ],
        },
      ],
      modalities: ['text'],
      asr_options: getAsrOptions(req),
      max_tokens: 4096,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Transcription API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as Record<string, unknown>;
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  const message = choices?.[0]?.message as Record<string, unknown> | undefined;
  const text = (message?.content as string ?? '').trim();

  return { text, language: getLanguage(req) };
}

export default withHandler(handleTranscribe, { timeoutMs: 45_000 });
