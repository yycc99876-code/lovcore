# Lovcore 环境变量管理方案

Status: **Planning**（尚未实施）

## 概览

Lovcore 涉及两套环境变量：AI Provider API Keys（后端）和 Supabase 连接信息（前端+后端）。本文档定义变量清单、命名规范、安全规则，以及从本地开发到 Vercel 部署的完整管理流程。

---

## 1. 变量清单

### 1.1 Supabase（新增）

| 变量名 | 前端可见 | 说明 |
|--------|---------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ 是 | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ 是 | Supabase anon key（受 RLS 限制） |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ 否 | Supabase 管理员 key（绕过 RLS） |

> **Next.js 规则：** 以 `NEXT_PUBLIC_` 开头的变量会被打包到前端 bundle 中。没有这个前缀的变量只在服务端可用。

> **Vite 规则：** 以 `VITE_` 开头的变量才会暴露到前端。Next.js 中不使用 `VITE_` 前缀。

### 1.2 AI Provider Keys（现有，不变）

| 变量名 | 前端可见 | 说明 |
|--------|---------|------|
| `BAILIAN_API_KEY` | ❌ 否 | 百炼/通义千问 API Key |
| `BAILIAN_BASE_URL` | ❌ 否 | 百炼 API 端点 |
| `OPENAI_API_KEY` | ❌ 否 | OpenAI API Key |
| `OPENAI_BASE_URL` | ❌ 否 | OpenAI API 端点 |
| `ANTHROPIC_API_KEY` | ❌ 否 | Anthropic API Key |
| `ANTHROPIC_BASE_URL` | ❌ 否 | Anthropic API 端点 |

### 1.3 模型路由配置（现有，不变）

| 变量名 | 前端可见 | 说明 |
|--------|---------|------|
| `BAILIAN_MODEL_FAST` | ❌ 否 | 快速模型（autocomplete 等） |
| `BAILIAN_MODEL_BALANCED` | ❌ 否 | 平衡模型（summarize 等） |
| `BAILIAN_MODEL_STRONG` | ❌ 否 | 强力模型 |
| `BAILIAN_MODEL_CODER` | ❌ 否 | 代码模型 |
| `BAILIAN_MODEL_VISION` | ❌ 否 | 视觉模型 |
| `BAILIAN_MODEL_VISION_FAST` | ❌ 否 | 快速视觉模型 |
| `BAILIAN_MODEL_ASR_*` | ❌ 否 | 语音识别模型 |

### 1.4 应用配置（迁移后变更）

| 变量名 | 前端可见 | 说明 |
|--------|---------|------|
| `VITE_API_BASE_URL` → 删除 | — | Vite 特有，Next.js 中不再需要 |
| `VITE_USE_SUPABASE` → 改名 | — | 改为 `NEXT_PUBLIC_USE_SUPABASE` |

---

## 2. 命名规范

### 2.1 前缀规则

| 前缀 | 框架 | 前端可见 | 用途 |
|------|------|---------|------|
| `NEXT_PUBLIC_` | Next.js | ✅ | 需要在浏览器中使用的变量 |
| （无前缀） | Next.js | ❌ | 仅服务端（Route Handlers、Server Components） |
| `VITE_` | Vite | ✅ | 需要在浏览器中使用的变量（Vite 特有） |
| （无前缀） | Vite | ❌ | 仅在 vite.config.ts 和 dev-server 中可用 |

### 2.2 安全规则

```
✅ 可以 NEXT_PUBLIC_: Supabase URL、Supabase anon key、feature flags
❌ 绝不 NEXT_PUBLIC_: API keys、service role key、数据库密码
❌ 绝不 VITE_: API keys（Vite 项目中同理）
```

---

## 3. 本地开发

### 3.1 文件结构

```
lovcore/
├── .env.example          ← 提交到 git，作为模板
├── .env.local            ← 不提交（在 .gitignore 中），存放真实密钥
└── .gitignore            ← 必须包含 .env.local
```

### 3.2 .env.example（模板，提交到 git）

```bash
# === Supabase ===
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# === AI Provider Keys (backend only, never exposed to browser) ===
BAILIAN_API_KEY=
BAILIAN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1

ANTHROPIC_API_KEY=
ANTHROPIC_BASE_URL=https://api.anthropic.com/v1

# === Bailian Model Routing ===
BAILIAN_MODEL_FAST=qwen-turbo
BAILIAN_MODEL_BALANCED=qwen3.6-plus
BAILIAN_MODEL_STRONG=qwen3.6-max-preview
BAILIAN_MODEL_CODER=qwen3-coder-plus
BAILIAN_MODEL_VISION=qwen3-vl-plus
BAILIAN_MODEL_VISION_FAST=qwen3-vl-flash
BAILIAN_MODEL_ASR_REALTIME=fun-asr-realtime
BAILIAN_MODEL_ASR_FILE=fun-asr

# === Feature Flags ===
NEXT_PUBLIC_USE_SUPABASE=false
```

### 3.3 .env.local（真实密钥，不提交）

```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdef.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

BAILIAN_API_KEY=sk-xxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
```

### 3.4 .gitignore 检查

确保 `.gitignore` 包含：

```gitignore
# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

---

## 4. Vercel 部署

### 4.1 环境变量设置

Vercel Dashboard → Project → Settings → Environment Variables：

| Variable | Environments | 说明 |
|----------|-------------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development | 所有环境 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development | 所有环境 |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | 不需要 Development |
| `BAILIAN_API_KEY` | Production, Preview | 本地开发用 .env.local |
| `OPENAI_API_KEY` | Production, Preview | 可选 |
| `ANTHROPIC_API_KEY` | Production, Preview | 可选 |

### 4.2 区分 Production / Preview / Development

- **Production:** `main` 分支部署，使用生产 Supabase 项目
- **Preview:** PR 部署，可以使用同一个 Supabase 项目（RLS 隔离用户数据）
- **Development:** 本地 `npm run dev`，使用 `.env.local`

### 4.3 通过 CLI 设置（可选）

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 添加环境变量
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add BAILIAN_API_KEY
```

---

## 5. Vite → Next.js 迁移中的变量映射

| Vite（当前） | Next.js（迁移后） | 说明 |
|-------------|------------------|------|
| `VITE_API_BASE_URL=/api` | 删除 | Next.js API Routes 默认在同一域名下 |
| （不存在） | `NEXT_PUBLIC_SUPABASE_URL` | 新增 |
| （不存在） | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 新增 |
| （不存在） | `SUPABASE_SERVICE_ROLE_KEY` | 新增 |
| `BAILIAN_API_KEY` | `BAILIAN_API_KEY` | 不变 |
| `BAILIAN_BASE_URL` | `BAILIAN_BASE_URL` | 不变 |
| `OPENAI_API_KEY` | `OPENAI_API_KEY` | 不变 |
| `ANTHROPIC_API_KEY` | `ANTHROPIC_API_KEY` | 不变 |

### 代码中的引用变化

```typescript
// Vite（当前）
const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
const isDev = import.meta.env.DEV;

// Next.js（迁移后）
const apiBase = '/api';  // 同域名，不需要配置
const isDev = process.env.NODE_ENV === 'development';
```

---

## 6. 安全审计清单

- [ ] `.env.local` 在 `.gitignore` 中
- [ ] `.env.example` 不包含真实密钥
- [ ] 所有 AI API Key 没有 `NEXT_PUBLIC_` / `VITE_` 前缀
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 只在 Route Handlers 中使用
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 配合 RLS 使用（anon key 安全的前提是 RLS 正确配置）
- [ ] Vercel 环境变量中 Preview 和 Production 使用相同的 Supabase 项目（或不同项目）
- [ ] git history 中没有提交过真实密钥（如果有，需要 rotate key）
