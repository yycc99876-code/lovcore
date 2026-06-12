import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocket, WebSocketServer } from 'ws';
import { verifyAuth } from '../../api/auth.js';

type ClientMessage =
  | { type: 'audio'; audio: string }
  | { type: 'commit' }
  | { type: 'close' };

type DashScopeEvent = {
  header?: {
    event?: string;
    task_id?: string;
    error_code?: string;
    error_message?: string;
  };
  payload?: {
    output?: {
      sentence?: {
        text?: string;
        sentence_end?: boolean;
      };
    };
  };
};

const DEFAULT_TASK_MODEL = 'paraformer-realtime-v2';
const DEFAULT_TASK_URL = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference';

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getTaskModel() {
  return process.env.BAILIAN_MODEL_ASR_STREAMING
    || process.env.BAILIAN_MODEL_ASR_TASK
    || DEFAULT_TASK_MODEL;
}

function getTaskUrl() {
  return process.env.BAILIAN_REALTIME_TASK_WS_URL || DEFAULT_TASK_URL;
}

function sendJson(socket: WebSocket, payload: unknown) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function appendTranscript(prefix: string, text: string): string {
  const normalizedPrefix = prefix.trim();
  const normalizedText = text.trim();
  if (!normalizedText) return normalizedPrefix;
  if (!normalizedPrefix) return normalizedText;
  if (normalizedPrefix.endsWith(normalizedText)) return normalizedPrefix;
  return `${normalizedPrefix}${/[\u4e00-\u9fff]$/.test(normalizedPrefix) ? '' : ' '}${normalizedText}`;
}

function createRunTask(language: string | null, taskId: string) {
  return {
    header: {
      action: 'run-task',
      task_id: taskId,
      streaming: 'duplex',
    },
    payload: {
      task_group: 'audio',
      task: 'asr',
      function: 'recognition',
      model: getTaskModel(),
      parameters: {
        format: 'pcm',
        sample_rate: 16000,
        language_hints: language?.startsWith('zh') ? ['zh'] : ['en'],
        disfluency_removal_enabled: false,
      },
      input: {},
    },
  };
}

function createFinishTask(taskId: string) {
  return {
    header: {
      action: 'finish-task',
      task_id: taskId,
      streaming: 'duplex',
    },
    payload: {
      input: {},
    },
  };
}

function parseDashScopeEvent(raw: string): DashScopeEvent | null {
  try {
    return JSON.parse(raw) as DashScopeEvent;
  } catch {
    return null;
  }
}

export async function handleRealtimeAsrUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): Promise<boolean> {
  const path = req.url?.split('?')[0];
  if (path !== '/api/ai/realtime-asr') return false;

  // Verify authentication before allowing WebSocket upgrade
  const isAuthorized = await verifyAuth(req);
  if (!isAuthorized) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return true;
  }

  const wss = new WebSocketServer({ noServer: true });
  wss.handleUpgrade(req, socket, head, (client) => {
    const apiKey = process.env.BAILIAN_API_KEY;
    if (!apiKey) {
      sendJson(client, { type: 'error', message: 'BAILIAN_API_KEY is not set.' });
      client.close(1011, 'Missing Bailian API key');
      return;
    }

    const url = new URL(req.url || '', 'http://localhost');
    const language = url.searchParams.get('language');
    const taskId = createId('lovcore_asr');
    const upstream = new WebSocket(getTaskUrl(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-DashScope-DataInspection': 'enable',
      },
    });

    let taskStarted = false;
    let finalizedTranscript = '';
    let liveSentence = '';
    const pendingAudio: Buffer[] = [];

    const flushAudio = () => {
      while (taskStarted && pendingAudio.length > 0 && upstream.readyState === WebSocket.OPEN) {
        const audio = pendingAudio.shift();
        if (audio) upstream.send(audio, { binary: true });
      }
    };

    upstream.on('open', () => {
      sendJson(upstream, createRunTask(language, taskId));
    });

    upstream.on('message', (message, isBinary) => {
      if (isBinary) return;

      const event = parseDashScopeEvent(message.toString());
      const eventName = event?.header?.event;

      if (eventName === 'task-started') {
        taskStarted = true;
        sendJson(client, { type: 'ready' });
        flushAudio();
        return;
      }

      if (eventName === 'result-generated') {
        const sentence = event?.payload?.output?.sentence;
        const text = sentence?.text?.trim() || '';
        const isFinal = !!sentence?.sentence_end;
        if (!text) return;

        if (isFinal) {
          finalizedTranscript = appendTranscript(finalizedTranscript, text);
          liveSentence = '';
        } else {
          liveSentence = text;
        }

        sendJson(client, {
          type: 'transcript',
          transcript: appendTranscript(finalizedTranscript, liveSentence),
          delta: liveSentence,
          isFinal,
          eventType: eventName,
        });
        return;
      }

      if (eventName === 'task-failed') {
        const code = event?.header?.error_code || 'TASK_FAILED';
        const messageText = event?.header?.error_message || message.toString();
        sendJson(client, { type: 'error', message: `${code}: ${messageText}` });
        return;
      }

      if (eventName === 'task-finished') {
        if (finalizedTranscript || liveSentence) {
          sendJson(client, {
            type: 'transcript',
            transcript: appendTranscript(finalizedTranscript, liveSentence),
            delta: '',
            isFinal: true,
            eventType: eventName,
          });
        }
        client.close();
      }
    });

    upstream.on('error', (error) => {
      sendJson(client, { type: 'error', message: error.message });
    });

    upstream.on('close', () => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });

    client.on('message', (message) => {
      let data: ClientMessage;
      try {
        data = JSON.parse(message.toString()) as ClientMessage;
      } catch {
        return;
      }

      if (data.type === 'audio' && data.audio) {
        const audio = Buffer.from(data.audio, 'base64');
        if (taskStarted && upstream.readyState === WebSocket.OPEN) {
          upstream.send(audio, { binary: true });
        } else if (pendingAudio.length < 120) {
          pendingAudio.push(audio);
        }
      }

      if (data.type === 'commit') {
        sendJson(upstream, createFinishTask(taskId));
      }

      if (data.type === 'close') {
        client.close();
      }
    });

    client.on('close', () => {
      sendJson(upstream, createFinishTask(taskId));
      upstream.close();
    });
  });

  return true;
}
