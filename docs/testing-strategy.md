# Lovcore 测试策略

Status: **Planning**（尚未实施）

## 概览

Lovcore 目前零测试。本文档定义测试优先级、工具选型、测试类型，以及从零开始的渐进式测试计划。

---

## 1. 工具选型

### 1.1 测试框架：Vitest

**推荐 Vitest**（不是 Jest），原因：
- Vite 原生支持，零额外配置
- 与 `vite.config.ts` 共享配置
- 比 Jest 快 3-5 倍（Vite 的模块解析优势）
- TypeScript 开箱即用
- API 与 Jest 兼容（`describe`, `it`, `expect`）

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### 1.2 组件测试：React Testing Library

不推荐 Enzyme。React Testing Library 鼓励测试用户行为而非实现细节，更适合 Lovcore 这种交互密集的产品。

### 1.3 E2E 测试：Playwright（可选，后期再加）

组件测试覆盖核心交互后，再考虑 E2E。不需要从 E2E 开始。

---

## 2. 测试类型和优先级

### 优先级矩阵

| 优先级 | 模块 | 测试类型 | 原因 |
|--------|------|---------|------|
| 🔴 P0 | `lib/storage.ts` | 单元测试 | 数据持久化是核心，localStorage 操作出错会丢数据 |
| 🔴 P0 | `lib/fileStore.ts` | 单元测试 | IndexedDB 操作复杂，错误处理隐蔽 |
| 🔴 P0 | `hooks/useCards.ts` | Hook 测试 | 核心 CRUD 逻辑，ingest 流程关键 |
| 🟡 P1 | `hooks/useSpaces.ts` | Hook 测试 | 空间过滤逻辑，seed 默认空间 |
| 🟡 P1 | `hooks/useSearch.ts` | Hook 测试 | 搜索和过滤逻辑 |
| 🟡 P1 | `ai/router.ts` | 单元测试 | Provider 选择和 fallback |
| 🟡 P1 | `lib/ingestion.ts` | 单元测试 | 文件类型判断、draft 创建 |
| 🟢 P2 | `components/ContentCard.tsx` | 组件测试 | 卡片渲染、点击交互 |
| 🟢 P2 | `components/DetailDrawer.tsx` | 组件测试 | 抽屉打开/关闭、编辑保存 |
| 🟢 P2 | `components/QuickNoteCard.tsx` | 组件测试 | 快速笔记创建流程 |
| ⚪ P3 | `components/SearchHeader.tsx` | 组件测试 | 搜索输入、视图切换 |
| ⚪ P3 | `components/LandingPage.tsx` | 组件测试 | 登录表单 |
| ⚪ P3 | Ghost AI 相关 hooks | Hook 测试 | debounce、IME guard |

---

## 3. 测试示例

### 3.1 单元测试：lib/storage.ts

```typescript
// src/lib/storage.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadStoredItems, persistItems } from './storage';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns mockItems when localStorage is empty', () => {
    const items = loadStoredItems();
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty('id');
    expect(items[0]).toHaveProperty('type');
  });

  it('persists and loads items correctly', () => {
    const items = loadStoredItems();
    persistItems(items);

    const loaded = loadStoredItems();
    expect(loaded).toEqual(items);
  });

  it('resets when stored data is corrupted', () => {
    localStorage.setItem('lovcore_items', 'not-json');
    const items = loadStoredItems();
    expect(items.length).toBeGreaterThan(0);
  });

  it('resets when version mismatch', () => {
    localStorage.setItem('lovcore_items', JSON.stringify([{ id: 'broken' }]));
    localStorage.setItem('lovcore_items_version', 'old-version');
    const items = loadStoredItems();
    expect(items.length).toBeGreaterThan(0);
  });
});
```

### 3.2 Hook 测试：useCards

```typescript
// src/hooks/useCards.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCards } from './useCards';

describe('useCards', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads initial items on mount', () => {
    const { result } = renderHook(() => useCards());
    expect(result.current.items.length).toBeGreaterThan(0);
  });

  it('deletes an item', () => {
    const { result } = renderHook(() => useCards());
    const initialCount = result.current.items.length;
    const firstId = result.current.items[0].id;

    act(() => {
      result.current.deleteItem(firstId);
    });

    expect(result.current.items.length).toBe(initialCount - 1);
    expect(result.current.items.find(i => i.id === firstId)).toBeUndefined();
  });

  it('updates an item', () => {
    const { result } = renderHook(() => useCards());
    const firstItem = result.current.items[0];

    act(() => {
      result.current.updateItem({ ...firstItem, title: 'Updated Title' });
    });

    expect(result.current.items[0].title).toBe('Updated Title');
  });

  it('triggers ingest and resolves after delay', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCards());
    const initialCount = result.current.items.length;

    act(() => {
      result.current.triggerIngest('note', { content: 'test' }, (item) => ({
        ...item,
        title: 'Resolved',
        summary: 'Done',
        tags: ['test'],
      }));
    });

    // Should add analyzing item immediately
    expect(result.current.items.length).toBe(initialCount + 1);
    expect(result.current.items[0].status).toBe('analyzing');

    // After 2.5s, should resolve
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(result.current.items[0].status).toBe('ready');
    expect(result.current.items[0].title).toBe('Resolved');

    vi.useRealTimers();
  });
});
```

### 3.3 单元测试：lib/ingestion.ts

```typescript
// src/lib/ingestion.test.ts
import { describe, it, expect } from 'vitest';
import { isHttpUrl, createAnalyzingItem, createSearchSubmitDraft } from './ingestion';

describe('ingestion', () => {
  describe('isHttpUrl', () => {
    it('returns true for valid URLs', () => {
      expect(isHttpUrl('https://example.com')).toBe(true);
      expect(isHttpUrl('http://test.org/path?q=1')).toBe(true);
    });

    it('returns false for non-URLs', () => {
      expect(isHttpUrl('hello world')).toBe(false);
      expect(isHttpUrl('')).toBe(false);
      expect(isHttpUrl('just text'));
    });
  });

  describe('createAnalyzingItem', () => {
    it('creates an analyzing item with correct defaults', () => {
      const item = createAnalyzingItem('note', { content: 'test' });
      expect(item.status).toBe('analyzing');
      expect(item.type).toBe('note');
      expect(item.content).toBe('test');
      expect(item.id).toBeTruthy();
    });
  });

  describe('createSearchSubmitDraft', () => {
    it('creates link draft for URLs', () => {
      const draft = createSearchSubmitDraft('https://example.com');
      expect(draft.type).toBe('link');
      expect(draft.initialFields.sourceUrl).toBe('https://example.com');
    });

    it('creates note draft for plain text', () => {
      const draft = createSearchSubmitDraft('just a quick note');
      expect(draft.type).toBe('note');
      expect(draft.initialFields.content).toBe('just a quick note');
    });
  });
});
```

---

## 4. Vitest 配置

```typescript
// vite.config.ts（添加 test 配置）
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // ... existing config
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
```

```typescript
// src/test-setup.ts
import '@testing-library/jest-dom';
```

```json
// package.json（添加 test 脚本）
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 5. 渐进式计划

### Week 1：基础设施 + P0 测试

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- 配置 Vitest
- 写 `storage.test.ts`（4-6 个测试）
- 写 `fileStore.test.ts`（3-4 个测试）
- 写 `useCards.test.ts`（5-6 个测试）

**目标：** 核心数据层有 15+ 个测试覆盖

### Week 2：P1 测试

- `useSpaces.test.ts`
- `useSearch.test.ts`
- `ingestion.test.ts`
- `ai/router.test.ts`

**目标：** 所有 hooks 和 lib 有测试覆盖

### Week 3+：P2 组件测试

- `ContentCard.test.tsx`
- `DetailDrawer.test.tsx`
- `QuickNoteCard.test.tsx`

**目标：** 核心交互有组件测试

### 后期：E2E（可选）

- Playwright 测试关键用户流程
- 注册 → 创建卡片 → 搜索 → 删除

---

## 6. 测试覆盖率目标

| 层级 | 目标覆盖率 | 说明 |
|------|-----------|------|
| `lib/` | 80%+ | 纯逻辑，最容易测试 |
| `hooks/` | 70%+ | Hook 测试需要 renderHook |
| `components/` | 50%+ | 只测关键交互 |
| `ai/` | 60%+ | Provider 路由和 prompt 构建 |

不追求 100% 覆盖率。把测试精力放在**数据流**和**用户关键路径**上。
