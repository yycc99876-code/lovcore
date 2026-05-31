# Lovcore AI API — Next.js Route Handler 设计

Status: **Planning**（尚未实施）

## 概览

当前架构中，AI API 通过 Vite dev-server middleware（`vite-api-mock.ts`）处理。迁移到 Next.js 后，需要改为 Route Handlers（`app/api/ai/*/route.ts`）。

本文档定义每个 Route Handler 的结构、请求/响应格式、错误处理策略。

---

## 当前架构

```
浏览器  →  fetch('/api/ai/autocomplete', { body })
              ↓
Vite dev-server middleware (vite-api-mock.ts)
              ↓
api/ai/autocomplete.ts  →  router.ts  →  bailian/openai/anthropic provider
```

**问题：**
- Vite middleware 只在开发环境工作
- 生产环境需要单独的 Node.js 服务器
- 没有认证、没有限流、没有日志

## 目标架构

```
浏览器  →  fetch('/api/ai/autocomplete', { body })
              ↓
Next.js Route Handler (app/api/ai/autocomplete/route.ts)
              ↓
lib/ai/handlers/autocomplete.ts  →  lib/ai/router.ts  →  providers/
```

**优势：**
- 同一个代码库，开发和生产共用
- Vercel 零配置部署
- 可以用 Next.js middleware 做认证/限流
- Edge Runtime 支持（可选，提升冷启动速度）

---

## Route Handler 模板

### 基本结构

每个 Route Handler 遵循统一模式：

```typescript
// app/api/ai/autocomplete/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { handleAutocomplete } from '@/lib/ai/handlers/autocomplete';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 输入校验
    if (!body.beforeCursor || typeof body.beforeCursor !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: beforeCursor' },
        { status: 400 }
      );
    }

    // 调用 handler
    const result = await handleAutocomplete(body);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[API] autocomplete error:', message);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
```

### 6 个 Route Handler

| Route | Handler 函数 | 用途 |
|-------|-------------|------|
| `POST /api/ai/autocomplete` | `handleAutocomplete` | 光标处 ghost text 补全 |
| `POST /api/ai/ghost-correct` | `handleGhostCorrect` | 段落纠错建议 |
| `POST /api/ai/rewrite` | `handleRewrite` | 文本重写 |
| `POST /api/ai/summarize` | `handleSummarize` | 文本摘要 |
| `POST /api/ai/transcribe` | `handleTranscribe` | 语音转文字 |
| `POST /api/ai/scrape-url` | `handleScrapeUrl` | URL 元数据抓取 |

---

## 文件目录结构

```
lovcore-web/                        (Next.js 项目)
├── app/
│   └── api/
│       └── ai/
│           ├── autocomplete/
│           │   └── route.ts        ← Route Handler（薄层，只做 HTTP 解析）
│           ├── ghost-correct/
│           │   └── route.ts
│           ├── rewrite/
│           │   └── route.ts
│           ├── summarize/
│           │   └── route.ts
│           ├── transcribe/
│           │   └── route.ts
│           └── scrape-url/
│               └── route.ts
├── lib/
│   └── ai/
│       ├── router.ts               ← Provider 选择和 fallback 逻辑（不变）
│       ├── providers/
│       │   ├── types.ts            ← Provider 接口定义（不变）
│       │   ├── bailian.ts          ← 百炼/通义千问 provider（不变）
│       │   ├── openai.ts           ← OpenAI provider（不变）
│       │   └── anthropic.ts        ← Anthropic provider（不变）
│       └── handlers/
│           ├── autocomplete.ts     ← 业务逻辑（从 api/ai/autocomplete.ts 迁移）
│           ├── ghost-correct.ts
│           ├── rewrite.ts
│           ├── summarize.ts
│           ├── transcribe.ts
│           └── scrape-url.ts
└── middleware.ts                    ← 全局中间件（认证、限流、日志）
```

**关键设计：** Route Handler 是薄层（~20 行），只负责 HTTP 解析和错误格式化。所有业务逻辑在 `lib/ai/handlers/` 中，与当前 `api/ai/` 中的 handler 函数完全一致，只需更新 import 路径。

---

## 请求/响应格式（不变）

前端 `src/ai/client.ts` 的调用方式完全不变。以下格式已经定义在 `src/ai/types.ts` 中：

### autocomplete

```json
// Request
{
  "paragraph": "今天天气不错，",
  "beforeCursor": "今天天气不错，",
  "afterCursor": "",
  "fullContext": "今天天气不错，..."
}

// Response
{
  "suggestion": "适合出去走走。",
  "confidence": 0.8
}
```

### ghost-correct

```json
// Request
{
  "paragraphText": "他们的在也不去了那里",
  "fullContext": "..."
}

// Response
{
  "suggestions": [
    {
      "original": "他们的在也不去了那里",
      "replacement": "他们再也不去那里了",
      "reason": "语序错误",
      "severity": "major",
      "from": 0,
      "to": 11
    }
  ]
}
```

### rewrite

```json
// Request
{
  "text": "这段文字需要改写",
  "instruction": "让它更正式",
  "language": "zh"
}

// Response
{
  "rewritten": "此段文本需要进行正式化改写"
}
```

### summarize

```json
// Request
{
  "text": "很长的文章内容...",
  "maxLength": 200,
  "style": "brief"
}

// Response
{
  "summary": "文章的核心观点是..."
}
```

### transcribe

```json
// Request
{
  "audioBase64": "base64-encoded-audio-data",
  "language": "zh",
  "contextTerms": ["Lovcore", "AI"]
}

// Response
{
  "text": "转录的文字内容",
  "language": "zh",
  "segments": [
    { "start": 0, "end": 2.5, "text": "转录的" },
    { "start": 2.5, "end": 5.0, "text": "文字内容" }
  ]
}
```

### scrape-url

```json
// Request
{
  "url": "https://example.com/article"
}

// Response
{
  "title": "文章标题",
  "description": "文章描述",
  "image": "https://example.com/og-image.jpg",
  "favicon": "https://example.com/favicon.ico",
  "siteName": "Example"
}
```

---

## 错误处理策略

### 统一错误响应格式

```json
{
  "error": "Human-readable error message"
}
```

### HTTP 状态码

| 状态码 | 场景 |
|--------|------|
| `200` | 成功 |
| `400` | 请求体缺少必填字段或格式错误 |
| `401` | 未认证（Supabase session 无效） |
| `429` | 请求过于频繁（限流） |
| `500` | 服务端错误（AI provider 调用失败等） |
| `503` | 所有 AI provider 均不可用 |

### AI Provider Fallback

现有 `router.ts` 已实现 provider fallback 逻辑：

```
Bailian (优先) → OpenAI (备选) → Anthropic (最后)
```

如果所有 provider 都失败，返回 `503`。

---

## 中间件增强（可选）

### 认证保护

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  // 只保护 /api/ai/* 路由
  if (request.nextUrl.pathname.startsWith('/api/ai/')) {
    const supabase = createServerClient(/* ... */);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}
```

### 限流（简单方案）

```typescript
// 基于内存的简单限流（生产环境建议用 Redis）
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, limit = 60, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}
```

---

## 迁移步骤

```
Step 1: 复制 api/ai/*.ts → lib/ai/handlers/*.ts（只改 import 路径）
Step 2: 创建 app/api/ai/*/route.ts（薄层 Route Handler）
Step 3: 复制 lib/ai/router.ts + providers/（不变）
Step 4: 更新 src/ai/client.ts 的 API base URL
Step 5: 删除 vite-api-mock.ts（不再需要）
```

**关键点：** handler 业务逻辑零修改，只改文件位置和 import 路径。
