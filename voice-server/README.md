# Lovcore Voice Server

Long-lived WebSocket relay for Lovcore realtime ASR.

The Vercel app should not host realtime ASR because Vercel Functions are not a stable WebSocket server. Deploy this folder to a long-running Node host such as Railway, Render, Fly.io, or a small cloud VM.

## Local Run

```bash
cd voice-server
npm install
copy .env.example .env
npm start
```

Health check:

```text
http://localhost:8787/health
```

WebSocket endpoint:

```text
ws://localhost:8787/realtime-asr?language=zh&token=<supabase_access_token>
```

## Required Environment Variables

```text
ALLOWED_ORIGINS=https://lovcore.vercel.app,http://localhost:5173
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-supabase-anon-key>
BAILIAN_API_KEY=<your-bailian-key>
BAILIAN_REALTIME_TASK_WS_URL=wss://dashscope.aliyuncs.com/api-ws/v1/inference
BAILIAN_MODEL_ASR_STREAMING=paraformer-realtime-v2
```

After deploying this server, set the Lovcore frontend variable:

```text
VITE_REALTIME_ASR_URL=wss://<your-voice-server-domain>/realtime-asr
```

## Deploy Notes

Recommended hosts:

- Railway: create a new service from the `voice-server` folder, set the env vars above, expose the generated HTTPS domain.
- Render: create a Web Service, root directory `voice-server`, build command `npm ci`, start command `npm start`.
- Fly.io / ECS / any VM: use the included `Dockerfile`.

After deployment, add this to the Vercel project env vars for Lovcore Production:

```text
VITE_REALTIME_ASR_URL=wss://<your-voice-server-domain>/realtime-asr
```

Then redeploy Lovcore. The browser will use realtime Bailian ASR for live dictation and keep `/api/ai/transcribe` as the fallback.
