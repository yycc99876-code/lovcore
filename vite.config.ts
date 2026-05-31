import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { mockApiPlugin } from './vite-api-mock'

// https://vite.dev/config/
// Backend-only env vars needed by the dev API router (never exposed to client)
const API_ENV_KEYS = [
  'BAILIAN_API_KEY', 'BAILIAN_BASE_URL',
  'BAILIAN_MODEL_FAST', 'BAILIAN_MODEL_BALANCED', 'BAILIAN_MODEL_STRONG',
  'BAILIAN_MODEL_CODER', 'BAILIAN_MODEL_VISION', 'BAILIAN_MODEL_VISION_FAST',
  'BAILIAN_MODEL_VIDEO', 'BAILIAN_MODEL_EMBEDDING',
  'BAILIAN_MODEL_ASR_REALTIME', 'BAILIAN_MODEL_ASR_FILE',
  'BAILIAN_MODEL_ASR_CONTEXT_REALTIME', 'BAILIAN_MODEL_ASR_CONTEXT_FILE',
  'BAILIAN_MODEL_ASR_STREAMING', 'BAILIAN_MODEL_ASR_TASK',
  'BAILIAN_REALTIME_TASK_WS_URL',
  'OPENAI_API_KEY', 'OPENAI_BASE_URL',
  'ANTHROPIC_API_KEY', 'ANTHROPIC_BASE_URL',
  'HTTPS_PROXY', 'HTTP_PROXY', 'https_proxy', 'http_proxy',
  'LIBREOFFICE_PATH',
];

export default defineConfig(({ mode }) => {
  // Load only VITE_ prefixed vars (safe for client) + explicitly listed backend keys
  const viteEnv = loadEnv(mode, process.cwd(), 'VITE_');
  Object.assign(process.env, viteEnv);
  const allEnv = loadEnv(mode, process.cwd(), '');
  for (const key of API_ENV_KEYS) {
    if (allEnv[key]) process.env[key] = allEnv[key];
  }

  return {
    plugins: [react(), mode === 'development' && mockApiPlugin()].filter(Boolean),
  }
})
