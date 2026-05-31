/**
 * POST /api/ai/transcribe
 *
 * Receives audio (base64), returns transcript.
 * Uses DashScope qwen3.5-omni-plus via OpenAI-compatible endpoint.
 *
 * Request body:
 *   { audioBase64: string, language?: string }
 *
 * Response:
 *   { text: string, language: string }
 */

export interface TranscribeRequest {
  audioBase64?: string;
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

export async function handleTranscribe(req: TranscribeRequest): Promise<TranscribeResponse> {
  if (!req.audioBase64) {
    return { text: '', language: req.language || 'zh' };
  }

  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'qwen3.5-omni-plus',
      messages: [
        {
          role: 'system',
          content: 'You are a speech-to-text transcription engine. Transcribe the user\'s audio accurately. Output ONLY the transcribed text, nothing else.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_audio',
              input_audio: {
                data: `data:audio/webm;base64,${req.audioBase64}`,
                format: 'webm',
              },
            },
            {
              type: 'text',
              text: 'Please transcribe this audio accurately. Output only the transcribed text.',
            },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.1,
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
