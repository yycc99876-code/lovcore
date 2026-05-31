# Lovcore GitHub Actions CI 流水线

Status: **Planning**（尚未实施）

## 概览

Lovcore 目前没有任何 CI。本文档定义一个轻量级的 GitHub Actions 流水线，在每次 push 和 PR 时自动运行 lint、类型检查和构建，确保代码质量。

---

## 1. 流水线设计

### 触发条件

```
push → main / develop 分支
pull_request → main 分支
```

### 执行步骤

```
1. Checkout 代码
2. 安装 Node.js + 依赖
3. ESLint 检查
4. TypeScript 类型检查
5. 构建（验证无编译错误）
6. （可选）运行测试
```

---

## 2. 配置文件

### 2.1 基础 CI（当前 Vite 项目）

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-build:
    name: Lint & Build
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: ESLint
        run: npm run lint

      - name: TypeScript check
        run: npx tsc -b --noEmit

      - name: Build
        run: npm run build
```

### 2.2 迁移后 CI（Next.js 项目）

```yaml
# lovcore-web/.github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-typecheck-build:
    name: Lint, Type Check & Build
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: 'lovcore-web/package-lock.json'

      - name: Install dependencies
        working-directory: lovcore-web
        run: npm ci

      - name: ESLint
        working-directory: lovcore-web
        run: npm run lint

      - name: TypeScript check
        working-directory: lovcore-web
        run: npx tsc --noEmit

      - name: Build
        working-directory: lovcore-web
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder

  test:
    name: Tests
    runs-on: ubuntu-latest
    needs: lint-typecheck-build

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        working-directory: lovcore-web
        run: npm ci

      - name: Run tests
        working-directory: lovcore-web
        run: npm run test
```

---

## 3. 工作流说明

### 3.1 为什么用 `npm ci` 而不是 `npm install`

- `npm ci` 严格按 `package-lock.json` 安装，保证 CI 和本地环境一致
- 比 `npm install` 快（跳过依赖解析）
- 如果 lockfile 和 package.json 不一致，会报错（好事情）

### 3.2 Build 时的占位环境变量

Next.js 构建时 `NEXT_PUBLIC_*` 变量会被内联到 bundle 中。CI 环境没有真实密钥，用占位值即可。构建成功不代表密钥正确，只代表代码无编译错误。

### 3.3 TypeScript 检查 vs 构建

- `tsc --noEmit` 只做类型检查，不生成文件
- `next build` 也会做类型检查，但 `tsc` 更快且错误信息更清晰
- 两个都跑：`tsc` 捕获类型错误，`build` 捕获 bundler 层面的问题

---

## 4. PR 检查效果

当有人创建 PR 时：

```
PR #42: Add ghost autocomplete
├── ✅ Lint & Build (passed)
├── ✅ Tests (passed)
└── Ready to merge
```

如果任何步骤失败：
```
PR #43: Fix card deletion
├── ❌ Lint & Build (failed)
│   └── Error: src/hooks/useCards.ts:42:5 - error TS2322
└── Cannot merge until checks pass
```

---

## 5. 分支保护规则

GitHub → Settings → Branches → Add rule for `main`：

- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - Required checks: `Lint & Build`, `Tests`
- ✅ Require branches to be up to date before merging

**效果：** 不能直接 push 到 main，必须通过 PR + CI 通过。

---

## 6. 进阶配置（后期添加）

### 6.1 自动部署 Preview

Vercel 已经自动为 PR 创建 Preview 部署，无需额外 CI 配置。

### 6.2 自动格式化

```yaml
# 添加 Prettier 检查
- name: Prettier check
  run: npx prettier --check "src/**/*.{ts,tsx,css}"
```

### 6.3 安全审计

```yaml
# 检查依赖漏洞
- name: Security audit
  run: npm audit --audit-level=high
```

### 6.4 Bundle 大小检查

```yaml
# 使用 size-limit 监控 bundle 大小
- name: Check bundle size
  run: npx size-limit
```

---

## 7. 从零开始的步骤

```bash
# 1. 创建目录
mkdir -p .github/workflows

# 2. 创建 CI 配置文件
# （复制上面的 ci.yml 内容）

# 3. 提交并推送
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions lint + build pipeline"
git push origin main

# 4. 在 GitHub 上配置分支保护规则
# Settings → Branches → Add rule
```
