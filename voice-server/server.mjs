import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { WebSocket, WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 8787);
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const BAILIAN_API_KEY = process.env.BAILIAN_API_KEY || '';
const DASH_SCOPE_WS_URL = process.env.BAILIAN_REALTIME_TASK_WS_URL || 'wss://dashscope.aliyuncs.com/api-ws/v1/inference';
const ASR_MODEL = process.env.BAILIAN_MODEL_ASR_STREAMING
  || process.env.BAILIAN_MODEL_ASR_TASK
  || process.env.BAILIAN_MODEL_ASR_REALTIME
  || 'paraformer-realtime-v2';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

function isOriginAllowed(origin) {
  if (!origin || ALLOWED_ORIGINS.length === 0) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

function sendJson(socket, payload) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function appendTranscript(prefix, text) {
  const normalizedPrefix = prefix.trim();
  const normalizedText = text.trim();
  if (!normalizedText) return normalizedPrefix;
  if (!normalizedPrefix) return normalizedText;
  if (normalizedPrefix.endsWith(normalizedText)) return normalizedPrefix;
  return `${normalizedPrefix}${/[\u4e00-\u9fff]$/.test(normalizedPrefix) ? '' : ' '}${normalizedText}`;
}

async function verifyToken(token) {
  if (!supabase) return { ok: false, reason: 'Supabase is not configured' };
  if (!token) return { ok: false, reason: 'Missing auth token' };

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, reason: error?.message || 'Invalid auth token' };
  }

  return { ok: true, userId: data.user.id };
}

function createRunTask(language, taskId) {
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
      model: ASR_MODEL,
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

function createFinishTask(taskId) {
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

function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function bridgeAsr(client, { language, userId }) {
  if (!BAILIAN_API_KEY) {
    sendJson(client, { type: 'error', message: 'BAILIAN_API_KEY is not set.' });
    client.close(1011, 'Missing Bailian API key');
    return;
  }

  const taskId = `lovcore_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const upstream = new WebSocket(DASH_SCOPE_WS_URL, {
    headers: {
      Authorization: `Bearer ${BAILIAN_API_KEY}`,
      'X-DashScope-DataInspection': 'enable',
    },
  });

  let taskStarted = false;
  let finalizedTranscript = '';
  let liveSentence = '';
  const pendingAudio = [];

  const flushAudio = () => {
    while (taskStarted && pendingAudio.length > 0 && upstream.readyState === WebSocket.OPEN) {
      upstream.send(pendingAudio.shift(), { binary: true });
    }
  };

  upstream.on('open', () => {
    sendJson(upstream, createRunTask(language, taskId));
  });

  upstream.on('message', (message, isBinary) => {
    if (isBinary) return;

    const event = parseJson(message.toString());
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
        });
      }
      client.close();
    }
  });

  upstream.on('error', (error) => {
    console.error('[asr] upstream error', { userId, message: error.message });
    sendJson(client, { type: 'error', message: error.message });
  });

  upstream.on('close', () => {
    if (client.readyState === WebSocket.OPEN) client.close();
  });

  client.on('message', (message) => {
    const data = parseJson(message.toString());
    if (!data?.type) return;

    if (data.type === 'audio' && data.audio) {
      const audio = Buffer.from(data.audio, 'base64');
      if (taskStarted && upstream.readyState === WebSocket.OPEN) {
        upstream.send(audio, { binary: true });
      } else if (pendingAudio.length < 160) {
        pendingAudio.push(audio);
      }
      return;
    }

    if (data.type === 'commit') {
      sendJson(upstream, createFinishTask(taskId));
      return;
    }

    if (data.type === 'close') {
      client.close();
    }
  });

  client.on('close', () => {
    sendJson(upstream, createFinishTask(taskId));
    upstream.close();
  });
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'lovcore-voice-server',
      model: ASR_MODEL,
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', async (req, socket, head) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname !== '/realtime-asr') {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }

  if (!isOriginAllowed(req.headers.origin)) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }

  const token = url.searchParams.get('token') || '';
  const auth = await verifyToken(token);
  if (!auth.ok) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (client) => {
    bridgeAsr(client, {
      language: url.searchParams.get('language') || 'zh',
      userId: auth.userId,
    });
  });
});

server.listen(PORT, () => {
  console.log(`[voice-server] listening on :${PORT}`);
  console.log(`[voice-server] model=${ASR_MODEL}`);
});
