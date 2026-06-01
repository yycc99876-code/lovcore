import { withHandler } from '../_handler.js';
import { proxyFetch } from './proxy-fetch.js';

/**
 * POST /api/ai/transcribe
 *
 * Receives audio as base64 and returns a final transcript. This endpoint uses
 * the backend Bailian/DashScope key so provider secrets never reach the browser.
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

function buildInstruction(req: TranscribeRequest): string {
  const terms = req.contextTerms?.length
    ? `\n参考词：${req.contextTerms.join('、')}`
    : '';

  if (req.language === 'en') {
    return [
      'Transcribe this audio accurately.',
      'Output only the transcribed text, no explanation.',
      req.contextTerms?.length ? `Reference terms: ${req.contextTerms.join(', ')}` : '',
    ].filter(Boolean).join('\n');
  }

  return [
    '请准确转写这段音频。',
    '优先识别普通话中文，保留自然标点和断句。',
    '只输出转写文本，不要解释，不要总结，不要补充原文没有的信息。',
    terms,
  ].filter(Boolean).join('\n');
}

export async function handleTranscribe(req: TranscribeRequest): Promise<TranscribeResponse> {
  if (!req.audioBase64) {
    return { text: '', language: req.language || 'zh' };
  }

  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();
  const model = getTranscribeModel();
  const mimeType = req.audioMimeType || 'audio/webm';
  const format = getAudioFormat(mimeType);

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
          role: 'system',
          content: req.language === 'en'
            ? 'You are a speech-to-text transcription engine. Transcribe the audio accurately. Output only the transcript.'
            : '你是一个高准确率的中文语音转文字引擎。请准确转写音频，只输出转写文本。',
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_audio',
              input_audio: {
                data: req.audioBase64,
                format,
              },
            },
            {
              type: 'text',
              text: buildInstruction(req),
            },
          ],
        },
      ],
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

  return { text, language: req.language || 'zh' };
}

export default withHandler(handleTranscribe, { timeoutMs: 45_000 });
