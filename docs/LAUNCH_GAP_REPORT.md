# Lovcore Launch Gap Report

> Date: 2026-05-24 | Source: Full QA Audit

---

## 1. Lovcore 离可给真实用户使用还差什么？

当前 Lovcore 是一个**功能丰富的原型**，但还不是产品。核心差距：

| 维度 | 当前状态 | 差距 |
|------|----------|------|
| **数据持久化** | localStorage（浏览器本地） | 用户换浏览器/清缓存 = 数据全丢。需要 Supabase 后端 |
| **用户认证** | 无（vault 密码是假的） | 任何人都能访问。需要真实 auth |
| **AI 功能** | 依赖 vite dev mock plugin | 生产环境需要部署 API routes |
| **多设备同步** | 无 | 只能在一台浏览器使用 |
| **文件存储** | IndexedDB（浏览器本地） | 大文件受限，换设备丢失 |
| **错误处理** | 大量 silent catch | 用户不知道什么出了错 |
| **搜索质量** | 纯子串匹配 | 没有模糊搜索、没有语义搜索 |

---

## 2. 哪些是必须上线前做的？

### Must-Have（不做不能上线）

1. **Supabase 后端集成** — Cards/Spaces/Files CRUD API 真实实现
2. **用户认证** — Supabase Auth 替换假密码
3. **API Routes 部署** — 将 Vite mock plugin 迁移到 Vercel Serverless Functions
4. **数据迁移** — localStorage → Supabase 迁移路径
5. **AI Provider 配置** — 至少一个真实 AI provider（Bailian/OpenAI/Anthropic）在生产环境可用
6. **Voice Transcription** — ASR 服务在生产环境可用
7. **基础错误处理** — AI 请求失败时给用户反馈，不是 silent fail
8. **XSS 修复** — 导出功能和编辑器的 HTML 注入问题
9. **AbortController 支持** — AI 请求可取消，不堆积
10. **隐私政策 / 用户协议** — 法律合规

---

## 3. 哪些可以 MVP 后做？

### Post-MVP（可以先上线再迭代）

1. **语义搜索** — 当前子串搜索够用，语义搜索是增强
2. **Smart Spaces 自动规则** — 手动空间先上线，智能空间后做
3. **PDF/DOCX 导出** — 当前打印 PDF 够用，原生导出后做
4. **多语言完善** — 先做中英双语，其他语言后加
5. **键盘快捷键自定义** — 当前默认快捷键够用
6. **Ingestion 真实元数据提取** — 先用占位符，后做真实颜色提取/页数解析
7. **Serendipity Keep/Forget 逻辑** — 先让滑动只做浏览，后加收藏/忽略
8. **路由系统** — state-based 导航先用，React Router 后加
9. **E2E 测试** — 手动测试先覆盖，自动化后做
10. **Code splitting / 懒加载** — 先保证功能，性能优化后做

---

## 4. 哪些只是视觉锦上添花？

1. GhostOverlay scroll/resize 节流
2. ContentCard 3D 倾斜效果优化
3. LandingPage 字母喷泉动画
4. Serendipity 环境音效引擎
5. 暗色模式下的细微阴影调整
6. GSAP 入场/出场动画精细调优
7. Masonry 瀑布布局的响应式断点
8. SpacePills 溢出滚动
9. 搜索结果高亮动画
10. 语音录制的 aurora 光效

---

## 5. 哪些现在不应该做？

1. **Next.js 迁移** — 当前 Vite SPA 够用，迁移成本高收益低
2. **原生移动 App** — 先做好 Web，PWA 后考虑
3. **多人协作** — 单用户产品先做好
4. **自定义 AI 模型训练** — 用现有 API 先上线
5. **区块链/去中心化存储** — 不在路线图上
6. **插件系统** — 产品还没稳定，不需要可扩展架构
7. **离线优先** — IndexedDB 先用，真正的 offline-first 后做
8. **视频/音频播放器** — 当前 placeholder 够用
9. **3D/VR 界面** — 不符合产品定位
10. **社交分享功能** — 这是私人记忆工具，不需要社交

---

## 6. 7 天可演示版本计划

> 目标：一个可以录屏演示的完整 demo，展示核心价值

| 天 | 任务 | 交付物 |
|----|------|--------|
| **Day 1** | 修复 P0：AI writing slash command、Quick Note 格式保留 | Slash AI 写作可用，笔记重开保留格式 |
| **Day 2** | 修复 P0：vite-api-mock 多 provider 支持 + Ghost 取消请求 | AI 功能在 OpenAI/Bailian 下都可用 |
| **Day 3** | 修复 P1：Inline AI undo、voice 语言、export XSS | Ctrl+Z 可撤销 AI 改写，语音跟随语言，导出安全 |
| **Day 4** | 修复 P1：Serendipity keep/forget、PDF/video placeholder | Serendipity 滑动有实际效果，移除 alert |
| **Day 5** | 视觉打磨：暗色模式一致性、动画流畅度、loading states | 所有界面在两种主题下看起来专业 |
| **Day 6** | 端到端测试：走完所有用户流程，修 bug | 录屏 demo 流程无阻断 |
| **Day 7** | Demo 准备：准备演示数据、写演示脚本、录屏 | 完整 demo 视频 + 可运行的 demo 环境 |

---

## 7. 30 天可收费版本计划

> 目标：一个可以收费的 SaaS 产品

### Week 1: 核心功能修复（Day 1-7）
- 完成 7 天计划的所有内容
- 修复所有 P0 和 P1 issues
- 确保 AI 功能（ghost autocomplete、correction、rewrite、voice）在生产环境可用

### Week 2: 后端上线（Day 8-14）
- Supabase 数据库 schema 设计和迁移
- Cards/Spaces/Files CRUD API 真实实现
- Supabase Auth 集成（邮箱注册/登录）
- localStorage → Supabase 数据迁移脚本
- API routes 部署到 Vercel Serverless

### Week 3: 产品化（Day 15-21）
- 用户注册/登录流程
- 新用户引导（onboarding）
- 付费墙设计（免费/Pro 计划）
- Stripe 支付集成
- 隐私政策和服务条款页面
- 错误监控（Sentry 或类似）

### Week 4: 上线准备（Day 22-30）
- 域名和 SSL 配置
- 生产环境 AI provider 配置和限流
- 性能优化（代码分割、图片优化）
- 安全审计（XSS、CSRF、SSRF 修复）
- 用户测试和反馈收集
- Landing page 更新（真实产品截图、定价）
- 正式发布

---

## 关键决策点

### 现在需要你决定的事：

1. **AI Provider 选择** — 用 Bailian（便宜、中文好）还是 OpenAI（英文好、贵）还是两者都支持？
2. **认证方式** — 邮箱密码、Google OAuth、还是两者都要？
3. **免费计划限制** — 免费用户能存多少笔记？能用多少 AI 功能？
4. **定价** — Pro 计划多少钱？按月还是按年？
5. **目标用户** — 中文用户为主还是全球市场？
6. **MVP 范围** — 30 天版本砍掉哪些功能？
