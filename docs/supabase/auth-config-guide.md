# Lovcore Supabase Auth 配置指南

Status: **Planning**（尚未实施）

## 概览

Lovcore 当前的"认证"是 `localStorage` 里的一个布尔值 `lovcore_has_entered`。迁移到 Supabase Auth 后，用户需要真正的注册/登录才能访问自己的数据。

---

## 1. Supabase Dashboard 设置

### 1.1 创建项目

1. 前往 [supabase.com](https://supabase.com)，注册/登录
2. 点击 "New Project"
3. 选择组织，填写：
   - **Name:** `lovcore`
   - **Database Password:** 生成一个强密码，保存好
   - **Region:** 选离你最近的（建议 `Northeast Asia - Tokyo` 或 `Southeast Asia - Singapore`）
4. 等待 ~2 分钟创建完成

### 1.2 获取连接信息

进入项目 → Settings → API：

```
Project URL:  https://<project-ref>.supabase.co
Anon Key:     eyJ...（public，可暴露到前端）
Service Role: eyJ...（secret，仅后端使用，绝不暴露）
```

---

## 2. Email/Password 认证

### 2.1 基本配置（默认已开启）

Supabase 项目创建时，Email/Password 认证默认启用。

Dashboard → Authentication → Providers → Email：
- ✅ **Enable Email provider** — 已默认开启
- **Confirm email** — 建议开启（用户注册后需验证邮箱）

### 2.2 密码策略

Dashboard → Authentication → Password Policy：

| 设置 | 推荐值 | 说明 |
|------|--------|------|
| Minimum password length | `8` | 最少 8 位 |
| Require uppercase | `false` | 对独立产品太严格 |
| Require lowercase | `true` | 基本安全 |
| Require numbers | `false` | 降低注册摩擦 |
| Require special chars | `false` | 降低注册摩擦 |

**建议：** 只要求 8 位 + 包含小写字母。独立产品不需要企业级密码策略，降低注册摩擦比安全更重要。

### 2.3 邮件模板（可选自定义）

Dashboard → Authentication → Email Templates：

- **Confirm signup** — 注册确认邮件
- **Magic Link** — 魔法链接登录（暂不使用）
- **Change Email Address** — 更改邮箱确认
- **Reset Password** — 密码重置

建议至少自定义 Confirm signup 和 Reset Password 模板的品牌名称和颜色。

---

## 3. Google OAuth 配置

### 3.1 Google Cloud Console 设置

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目（或选择已有项目）
3. 启用 Google+ API：
   - APIs & Services → Library → 搜索 "Google+ API" → Enable

4. 创建 OAuth 凭证：
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: **Web application**
   - Name: `Lovcore`
   - Authorized redirect URIs 添加：
     ```
     https://<project-ref>.supabase.co/auth/v1/callback
     ```
   - 保存，记录 **Client ID** 和 **Client Secret**

### 3.2 Supabase Dashboard 配置

1. Dashboard → Authentication → Providers → Google
2. 开启 **Enable Sign in with Google**
3. 填入：
   - **Client ID:** 从 Google Cloud Console 获取
   - **Client Secret:** 从 Google Cloud Console 获取
4. 保存

### 3.3 前端代码调用

```typescript
// 使用 Supabase 客户端
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

### 3.4 OAuth 回调处理

需要一个回调页面处理 OAuth 重定向：

```typescript
// app/auth/callback/route.ts (Next.js) 或 src/pages/AuthCallback.tsx (Vite SPA)
// 在回调中 exchange code for session：
const { error } = await supabase.auth.exchangeCodeForSession(code);
```

---

## 4. Auth 状态管理

### 4.1 核心 API

```typescript
import { supabase } from './supabase-client';

// 注册
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
});

// 登录
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
});

// 登出
const { error } = await supabase.auth.signOut();

// 获取当前用户
const { data: { user } } = await supabase.auth.getUser();

// 监听认证状态变化
supabase.auth.onAuthStateChange((event, session) => {
  // event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED'
  console.log(event, session?.user);
});
```

### 4.2 与现有 useVaultGate 的关系

| 现状 | 迁移后 |
|------|--------|
| `useVaultGate()` 检查 `localStorage` 布尔值 | `useAuth()` 检查 `supabase.auth.getUser()` |
| `enterVault()` 设置 localStorage | `signIn()` 调用 Supabase Auth |
| `exitVault()` 清除 localStorage | `signOut()` 调用 Supabase Auth |
| 无真实认证，任何人可进入 | 只有注册用户可访问自己的数据 |

### 4.3 useAuth Hook 设计

```typescript
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 获取当前 session
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    // 监听变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    loading,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUp: (email, password) => supabase.auth.signUp({ email, password }),
    signInWithGoogle: () => supabase.auth.signInWithOAuth({ provider: 'google' }),
    signOut: () => supabase.auth.signOut(),
  };
}
```

---

## 5. 安全注意事项

### 5.1 RLS 是关键

Supabase Auth 本身只管"谁登录了"。数据隔离靠的是 RLS（Row Level Security）策略。没有 RLS，任何登录用户都能读取所有人的数据。

**必须确保：**
- `cards` 和 `spaces` 表都启用了 RLS
- 每个操作（SELECT/INSERT/UPDATE/DELETE）都有对应的 policy
- policy 条件是 `auth.uid() = user_id`

### 5.2 API Key 安全

| Key | 可见性 | 用途 |
|-----|--------|------|
| `SUPABASE_URL` | 前端可见 | 项目地址 |
| `SUPABASE_ANON_KEY` | 前端可见 | 匿名访问（受 RLS 限制） |
| `SUPABASE_SERVICE_ROLE_KEY` | **仅后端** | 绕过 RLS 的管理操作 |

`anon_key` 可以暴露到前端，因为它受 RLS 限制。但 `service_role_key` 绝不能出现在前端代码中。

### 5.3 Session 管理

- Supabase 默认使用 JWT，token 存储在 `localStorage`
- Token 有效期默认 1 小时，自动刷新
- 不需要手动管理 token，Supabase 客户端自动处理

---

## 6. 迁移路径（不破坏现有功能）

```
Phase 0: 在 Supabase Dashboard 完成上述配置
Phase 1: 添加 useAuth hook（与 useVaultGate 并行）
Phase 2: LandingPage 增加邮箱/密码表单 + Google OAuth 按钮
Phase 3: 用 useAuth 替代 useVaultGate 的判断逻辑
Phase 4: 移除 useVaultGate
```

每一步都可以通过 feature flag 回退，不影响现有功能。
