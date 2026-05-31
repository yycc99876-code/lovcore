# Lovcore QA Audit Report

> Date: 2026-05-24 | Auditor: Claude Code

---

## 本次审计范围

对 Lovcore 项目进行全面的产品质量审计，覆盖：
- 15 个核心功能模块的实现完成度
- 前端代码质量（60+ 源文件）
- 后端 API 路由实现（14 个文件）
- 安全漏洞扫描
- 用户体验评估
- 上线差距分析

---

## 读了哪些文件

### 文档（10 个）
| 文件 | 行数 | 状态 |
|------|------|------|
| `docs/NEXT_PLAN.md` | 300 | 已读 |
| `docs/TARGET_DEFINITION.md` | 327 | 已读 |
| `docs/GOAL_COMMAND.md` | 707 | 已读 |
| `docs/NEXT_FEATURE_GOAL.md` | 1556 | 已读 |
| `docs/IMPLEMENTATION_AUDIT.md` | 410 | 已读 |
| `docs/GHOST_AI_SPEC.md` | 201 | 已读 |
| `docs/OVERNIGHT_HARDENING_REPORT.md` | 169 | 已读 |
| `docs/GHOST_VOICE_IMPLEMENTATION_GOAL.md` | 502 | 已读 |
| `docs/DATA_MODEL_AUDIT.md` | 119 | 已读 |
| `docs/API_CONTRACT.md` | 637 | 已读 |

### 源代码（60+ 文件）
- **编辑器核心**: LovcoreEditor, slashCommands, SlashCommandMenu, slashCommand extension
- **Ghost 系统**: GhostOverlay, GhostCorrectionLayer, GhostInlineCompletion, ghostTypes, useGhostAutocomplete, useGhostCorrection, autocompleteScanner, ghostCorrectionScanner
- **语音系统**: voiceRecorder, useVoiceCapture, VoiceRecorderIndicator, useAudioCue
- **AI 系统**: ai/index, ai/client, ai/types, InlineAICommand
- **数据层**: storage, fileStore, ingestion, useCards, useSpaces, useSearch
- **UI 组件**: App, SearchHeader, ContentCard, QuickNoteCard, DetailDrawer, SpacesView, CreateSpaceModal, SpacePills, SerendipityView, LandingPage, MasonryWaterfall
- **API 路由**: autocomplete, ghost-correct, rewrite, summarize, transcribe, scrape-url, router, notes/route, export/route, files/upload, providers (openai, anthropic, bailian, types)
- **配置**: vite-api-mock, vercel.json, package.json

---

## 生成了哪些文档

| 文档 | 路径 | 用途 |
|------|------|------|
| 产品验收清单 | `docs/PRODUCT_ACCEPTANCE_CHECKLIST.md` | 15 个模块、150+ 条可手动验证的 checklist |
| Bug/体验问题清单 | `docs/PRODUCT_ISSUES_BACKLOG.md` | 30 个具体问题，按 P0-P3 分级 |
| 下一轮开发任务包 | `docs/NEXT_DEV_TASK_PACK.md` | 7 个独立任务包，可由 AI agent 执行 |
| 上线差距报告 | `docs/LAUNCH_GAP_REPORT.md` | 上线差距分析 + 7天/30天路线图 |
| QA 审计报告 | `docs/QA_AUDIT_REPORT.md` | 本报告 |

---

## 最大的 10 个风险

### 1. 无后端 = 无产品
当前所有数据存储在 localStorage 和 IndexedDB。用户清浏览器缓存 = 数据全丢。没有后端意味着没有用户认证、没有多设备同步、没有付费可能。这是**最大的结构性风险**。

### 2. AI 功能在生产环境不可用
`vite-api-mock.ts` 只在 Vite dev server 运行。部署到 Vercel 后，所有 AI 端点（autocomplete、ghost-correct、rewrite、transcribe）返回 404。Ghost autocomplete、Ghost correction、Inline AI rewrite、Voice transcription 全部失效。

### 3. vite-api-mock 只检查 BAILIAN_API_KEY
如果开发者只配置了 OpenAI 或 Anthropic key，所有 AI 功能返回空 stub。这会导致开发者的错误判断——以为功能坏了。

### 4. XSS 漏洞（编辑器 + 导出）
- `LovcoreEditor.getParsedContent` 不转义 HTML
- `DetailDrawer` 导出函数不转义用户内容
- 恶意内容可通过 `<script>` 注入

### 5. AI Writing Slash Command 完全失效
选择 "AI Writing" 什么都不做。这是一个核心功能的入口，用户会认为产品坏了。

### 6. Serendipity 滑动无实际效果
动画很酷但 keep/forget 是假的。用户期待滑动有实际作用（收藏/跳过），但什么都不会发生。这是产品信任问题。

### 7. SSRF 漏洞（scrape-url）
`api/ai/scrape-url.ts` 不验证 URL 是否指向内部网络。攻击者可以探测 `127.0.0.1`、`10.x.x.x` 等内部服务。

### 8. Inline AI Rewrite 无法撤销
`acceptDiff` 使用 raw ProseMirror transaction 绕过了历史系统。用户改写后无法 Ctrl+Z 撤回。这是核心编辑体验问题。

### 9. Vault 密码是假的
任何输入都能解锁。如果用户以为有隐私保护但实际上没有，这是信任问题。

### 10. 数据版本迁移会丢失所有用户数据
`storage.ts` 的 version-based reset 在版本变更时会清空所有用户数据，用 mock 数据替换。每次代码更新都可能丢用户数据。

---

## 15 个功能模块完成度总览

| 模块 | 有实现 | 真实（非 mock） | 用户体验达标 | 主要问题 |
|------|--------|-----------------|-------------|----------|
| Quick Note | ✅ | ✅ | ⚠️ | 重开丢失格式 |
| Slash Command | ✅ | ✅ | ⚠️ | AI Writing 失效，图片用 window.prompt |
| Ghost Autocomplete | ✅ | ✅ | ⚠️ | 无法取消请求，错误静默 |
| Ghost Correction | ✅ | ✅ | ✅ | 缓存无上限 |
| Inline AI Rewrite | ✅ | ✅ | ❌ | 无法撤销，加载无反馈 |
| Diff Preview | ✅ | ✅ | ⚠️ | 选区可能过期 |
| Voice Push-to-Talk | ✅ | ✅ | ⚠️ | 语言硬编码 |
| Voice Hands-Free | ✅ | ✅ | ⚠️ | 同上 |
| DetailDrawer Autosave | ✅ | ✅ | ⚠️ | 闭包过期，XSS |
| Export txt/html/md | ✅ | ✅ | ⚠️ | XSS，PDF 是 placeholder |
| Spaces / Smart Spaces | ✅ | ✅ | ⚠️ | Smart Folio 死链 |
| Search / Filter | ✅ | ✅ | ⚠️ | 无模糊搜索，无 debounce |
| Serendipity | ✅ | ❌ | ❌ | 滑动无效果 |
| LandingPage | ✅ | ✅ | ✅ | 密码假的，组件太大 |
| Light / Dark Mode | ✅ | ✅ | ⚠️ | 不监听系统变化 |

**图例**: ✅ 完成 | ⚠️ 有实现但有明显问题 | ❌ 未达标

---

## 明天醒来后最应该看的 5 个地方

### 1. `src/components/editor/LovcoreEditor.tsx`
编辑器是所有功能的集成点。修复 `getParsedContent` 的 XSS，确认 AI Writing slash command 的事件监听器，检查 ghost 和 voice 的集成。

### 2. `vite-api-mock.ts`
当前 AI 功能在生产环境完全不可用的根源。需要决定：是迁移到 Vercel Serverless Functions，还是保持 Vite plugin 但修复多 provider 检查。

### 3. `src/components/DetailDrawer.tsx`
用户花最多时间的地方。修复 XSS、autosave 闭包、placeholder alerts、格式保留。这是影响用户体验最直接的文件。

### 4. `src/components/editor/InlineAICommand.tsx`
AI 改写是产品的核心卖点之一。修复 undo（用 TipTap commands 替换 raw transactions）、添加 loading spinner、处理选区过期。

### 5. `src/lib/storage.ts`
数据持久化的基础。当前 version-based reset 会在每次版本变更时丢失用户数据。需要实现迁移策略而不是暴力重置。

---

## 总结

Lovcore 是一个**功能丰富、设计精良的原型**。核心编辑器、Ghost AI、语音录入、空间管理等功能都有真实实现，不是空壳。但距离可上线产品，最大的差距在于：

1. **没有后端** — 所有数据在浏览器本地，AI 功能依赖 dev server
2. **安全问题** — XSS 和 SSRF 漏洞需要修复
3. **功能断裂** — AI Writing slash command 失效、Serendipity 无实际效果
4. **数据安全** — localStorage 无错误处理、版本迁移丢数据

如果目标是 7 天内做可演示版本，重点是修复 P0 问题 + 视觉打磨。
如果目标是 30 天内做可收费版本，需要同时推进后端集成和产品化。
