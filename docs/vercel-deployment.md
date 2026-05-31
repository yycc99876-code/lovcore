# Lovcore Vercel 部署配置

Status: **Planning**（尚未实施）

## 概览

Lovcore 迁移到 Next.js 后，Vercel 是最自然的部署目标：零配置、自动 CI/CD、免费额度足够个人项目使用。本文档定义从本地到上线的完整部署流程。

---

## 1. 项目结构（迁移后）

```
lovcore/                    ← Vite SPA（当前，保留不动）
lovcore-web/                ← Next.js（迁移目标）
├── app/
├── lib/
├── public/
├── next.config.ts
├── package.json
└── vercel.json             ← Vercel 配置（可选，通常不需要）
```

**部署对象：** `lovcore-web/` 目录，不是根目录。

---

## 2. Vercel 项目设置

### 2.1 创建项目

1. 前往 [vercel.com](https://vercel.com)，用 GitHub 账号登录
2. 点击 "Add New Project"
3. 导入 `lovcore-web` 所在的 GitHub 仓库
4. 配置：
   - **Framework Preset:** Next.js（自动检测）
   - **Root Directory:** `lovcore-web`（如果仓库根目录不是 Next.js 项目）
   - **Build Command:** `next build`（默认）
   - **Output Directory:** `.next`（默认）

### 2.2 自定义域名

1. Vercel Dashboard → Project → Settings → Domains
2. 添加你的域名（如 `lovcore.com`）
3. 按提示配置 DNS：
   - **方式 A：** 将域名 nameserver 切换到 Vercel（推荐，最简单）
   - **方式 B：** 在现有 DNS 中添加 CNAME 记录指向 `cname.vercel-dns.com`

### 2.3 HTTPS

Vercel 自动为所有域名提供 SSL 证书（Let's Encrypt），无需手动配置。

---

## 3. 环境变量

### 3.1 在 Vercel Dashboard 设置

Settings → Environment Variables：

| Variable | Value | Environments |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Production, Preview |
| `BAILIAN_API_KEY` | `sk-...` | Production, Preview |
| `BAILIAN_BASE_URL` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | Production, Preview |
| `OPENAI_API_KEY` | `sk-...`（可选） | Production, Preview |
| `ANTHROPIC_API_KEY` | `sk-ant-...`（可选） | Production, Preview |

### 3.2 环境隔离

| 环境 | 触发条件 | Supabase 项目 | 说明 |
|------|---------|--------------|------|
| Production | 推送到 `main` 分支 | 生产项目 | 用户使用的正式环境 |
| Preview | 创建 PR 或推送到非 main 分支 | 可以共用生产项目 | 测试用，RLS 隔离用户数据 |
| Development | `vercel dev` 本地运行 | 本地 .env.local | 开发用 |

---

## 4. 部署流程

### 4.1 自动部署（推荐）

```
git push origin main  →  Vercel 自动触发 Production 部署
git push origin feat-xxx  →  Vercel 自动触发 Preview 部署
创建 PR  →  Vercel 在 PR 中评论 Preview URL
```

### 4.2 手动部署（CLI）

```bash
# 安装 CLI
npm i -g vercel

# 首次部署（会引导项目关联）
cd lovcore-web
vercel

# 生产部署
vercel --prod

# 查看部署状态
vercel ls
```

### 4.3 回滚

Vercel Dashboard → Project → Deployments → 找到之前的版本 → "Promote to Production"

---

## 5. Next.js 配置

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },
};

export default nextConfig;
```

**说明：**
- `images.remotePatterns` 允许 Next.js Image 组件加载外部图片
- Supabase Storage 的图片 URL 需要在这里配置

---

## 6. 构建优化

### 6.1 Bundle 分析

```bash
# 安装分析工具
npm install -D @next/bundle-analyzer

# next.config.ts 中启用
const nextConfig = {
  // ... existing config
  experimental: {
    optimizePackageImports: ['lucide-react', 'gsap'],
  },
};
```

### 6.2 关键优化点

| 优化 | 效果 | 方法 |
|------|------|------|
| lucide-react tree-shaking | 减少 ~200KB | 已自动（按需导入） |
| Tiptap 按需加载 | 减少首屏 bundle | dynamic import |
| 图片优化 | 自动 WebP 转换 | Next.js Image 组件 |
| 字体优化 | 避免 FOUT | Next.js next/font |

---

## 7. 监控和日志

### 7.1 Vercel 内置

- **Analytics:** Dashboard → Analytics（免费版有基础数据）
- **Logs:** Dashboard → Logs（实时查看函数日志）
- **Speed Insights:** Dashboard → Speed Insights

### 7.2 错误追踪（可选，后期添加）

```bash
# Sentry（推荐）
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

---

## 8. 部署前检查清单

- [ ] `npm run build` 在本地成功
- [ ] `npm run lint` 无错误
- [ ] `.env.local` 中的变量已添加到 Vercel Dashboard
- [ ] Supabase 项目已创建，schema 已部署
- [ ] Supabase Storage bucket 已创建
- [ ] Google OAuth redirect URI 已添加 Vercel 域名
- [ ] `next.config.ts` 中 `images.remotePatterns` 包含所有需要的域名
- [ ] 自定义域名 DNS 已配置（如果使用）
