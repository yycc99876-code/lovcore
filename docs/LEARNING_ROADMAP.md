# Lovcore 项目驱动学习路线图

> 基于音频学习理念：不是先学完所有知识再做项目，而是靠项目倒逼自己学习。

---

## 项目现状概览

**Lovcore** 是一个私人记忆归档应用，核心架构：

```
前端 (React 19 + TypeScript + Vite)
  ↓ fetch API 调用
后端 API (Vercel Serverless Functions)
  ↓ Supabase SDK
数据库 + 认证 + 文件存储 (Supabase)
  ↓ AI Provider SDK
AI 服务 (百炼/OpenAI/Anthropic)
```

还附带一个浏览器扩展 (Chrome Extension) 用于网页剪藏。

---

## 阶段一：你已经在用的（基础巩固）

### 1. 版本管理 — Git
**你在项目中已有的：** 项目是 git 仓库，有 `.gitignore`

**需要深入学习的：**
- `git branch` / `git merge` — 你项目的 `master` 和 `main` 分支策略
- `git rebase` — 保持提交历史整洁
- `git stash` — 临时保存未完成的工作
- `git cherry-pick` — 选择性合并某个提交
- `.gitignore` 规则 — 你项目的 `node_modules`、`.env.local` 等

**项目实践：** 试着为每个功能建 feature 分支，完成后 merge 回 main

---

### 2. 数据库 — Supabase (PostgreSQL)
**你在项目中已有的：** `supabaseClient.ts`、`types/database.ts`、`docs/supabase/schema.sql`

**需要深入学习的：**
- **SQL 基础** — 你的 `schema.sql` 里的 `CREATE TABLE`、`SELECT`、`JOIN`
- **索引优化** — 你的 cards 表如果数据量大了，查询会变慢，需要加索引
- **RLS (Row Level Security)** — 你已有 `rls-policies.sql`，理解为什么每行数据都要做权限控制
- **数据库设计** — 你的 card 和 card_body 分表设计，理解一对多关系

**项目实践：**
```sql
-- 看你项目的 schema.sql，试着回答：
-- 1. 为什么 card 和 card_body 要分两张表？
-- 2. assignedSpaceIds 用了什么数据结构？为什么？
-- 3. 如果要按标签搜索所有卡片，需要加什么索引？
```

---

### 3. 网络编程 — HTTP / Fetch API
**你在项目中已有的：** `ai/client.ts` 里的 `fetch` 调用，所有 `api/` 下的路由

**需要深入学习的：**
- **HTTP 方法** — 你的项目只用了 `POST`，理解 GET/PUT/DELETE/PATCH 的区别
- **请求头** — 你代码里的 `Authorization: Bearer ${token}` 是什么原理
- **状态码** — `response.ok` 对应哪些状态码？401/403/500 分别什么意思
- **CORS** — 为什么你的浏览器扩展能跨域调用你的 API？

**项目实践：** 用浏览器 DevTools 的 Network 面板，观察你应用的每次 API 请求

---

## 阶段二：你即将遇到的（中级进阶）

### 4. 缓存 — 性能优化
**你在项目中会遇到的场景：**
- 用户每次切换 Space 都重新请求数据 → 可以缓存
- AI 分析结果不变，但每次都重新调用 → 可以缓存
- 语义搜索的 embedding 计算昂贵 → 应该缓存

**需要学习的：**
- **浏览器缓存** — `localStorage`、`sessionStorage`、`Cache API`
- **HTTP 缓存** — `Cache-Control`、`ETag`、`Last-Modified`
- **应用层缓存** — 内存 Map、SWR 策略（Stale-While-Revalidate）
- **Redis（后期）** — 当用户量上来后，服务端缓存

**缓存三大问题（音频提到的）：**
| 问题 | 含义 | 你的场景 |
|------|------|----------|
| 穿透 | 查不存在的数据，每次都打到数据库 | 搜一个不存在的标签 |
| 击穿 | 热点 key 过期，大量请求同时打到数据库 | 某个热门 Space 的数据缓存过期 |
| 雪崩 | 大量 key 同时过期 | 部署新版本时所有缓存失效 |

---

### 5. 部署 — Vercel + Docker
**你在项目中已有的：** `vercel.json` 配置，push 到 main 自动部署

**需要深入学习的：**
- **Serverless 函数** — 你的 `api/` 目录就是 Vercel Serverless，理解冷启动
- **环境变量** — 你的 `.env.example` 里的 `VITE_SUPABASE_URL` 等，理解前后端环境变量隔离
- **CI/CD** — 你有 `docs/ci-pipeline.md`，理解自动化测试和部署流程
- **Docker（进阶）** — 把你的应用容器化，不依赖 Vercel

**项目实践：**
```bash
# 试试本地模拟生产环境构建
npm run build
npm run preview
# 观察和 npm run dev 的区别
```

---

### 6. 测试 — Vitest + Playwright
**你在项目中已有的：** 多个 `.test.ts` 文件，`playwright.config.ts`

**需要深入学习的：**
- **单元测试** — 你的 `storage.test.ts`、`ingestion.test.ts`
- **组件测试** — 你的 `ErrorBoundary.test.tsx`
- **E2E 测试** — 你的 Playwright 配置，模拟真实用户操作
- **测试覆盖率** — `npm run test:coverage`

**项目实践：** 给你的 `useCards` hook 写一个完整的单元测试

---

## 阶段三：规模扩大后（高级架构）

### 7. 监控与可观测性
**你在项目中会遇到的场景：**
- AI 接口调用失败了，用户只看到"分析失败"，不知道为什么
- 页面加载慢，不知道是前端渲染慢还是 API 慢

**需要学习的：**
- **日志系统** — 你已有 `aiEvents.ts`，理解结构化日志
- **错误追踪** — Sentry / 自建 ErrorBoundary
- **性能监控** — 你的 `docs/performance-analysis.md`
- **Grafana（后期）** — CPU、内存、磁盘、网络监控

---

### 8. 发布策略
**音频提到的：**
| 策略 | 含义 | 何时用 |
|------|------|--------|
| 灰度发布 | 先让 1% 用户用新版本 | 测试新功能是否有 bug |
| 蓝绿部署 | 新旧版本同时运行，瞬间切换 | 零停机部署 |
| 滚动更新 | 逐个替换旧实例 | 大规模服务更新 |

**你的现状：** Vercel 自动部署 = 蓝绿部署（每次部署生成新 URL，切换域名指向）

---

### 9. 高可用架构
**音频提到的：**
| 概念 | 含义 | 你的学习路径 |
|------|------|-------------|
| 负载均衡 | 多台服务器分担请求 | Nginx 配置 upstream |
| DNS 解析 | 域名 → IP 地址 | 理解你的 vercel 域名怎么工作的 |
| 反向代理 | 用户 → 代理 → 服务器 | Nginx / Caddy |
| 异地多活 | 多个地区的服务器都能独立服务 | Supabase 的多区域部署 |

---

## 推荐学习顺序

```
当前位置 ──────────────────────────────────────────────→

  ① Git 分支管理        ← 现在就能用
  ② SQL + 数据库设计     ← 看懂你的 schema.sql
  ③ HTTP 协议深入        ← 理解你的 API 调用
  ④ 测试写法             ← 补全测试覆盖率
  ⑤ 缓存策略             ← 优化用户体验
  ⑥ 部署与 CI/CD        ← 理解你的 Vercel 部署
  ⑦ Docker 容器化        ← 不再依赖平台
  ⑧ 监控与日志           ← 线上问题排查
  ⑨ 负载均衡 + 反向代理   ← 用户量增长
  ⑩ 高可用架构           ← 最终形态
```

---

## 每个知识点的学习方法

1. **先在项目中找到对应代码** — 比如学 HTTP，就看 `ai/client.ts` 的 fetch 调用
2. **理解为什么这样写** — 比如为什么用 POST 而不是 GET
3. **试着改一改** — 比如把 POST 改成 GET，看看会发生什么
4. **查文档补理论** — 用 Context7 查 React、Supabase、Vite 的官方文档
5. **写个小实验** — 比如单独写一个文件测试 Supabase 的 RLS 策略
