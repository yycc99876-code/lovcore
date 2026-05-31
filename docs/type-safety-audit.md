# Lovcore TypeScript 类型安全审计报告

Status: **审计完成**（2026-05-24）

审计范围：`src/` 下全部 57 个 `.ts` / `.tsx` 文件

---

## 总览

| 严重程度 | 数量 | 说明 |
|---------|------|------|
| High | 8 | `any` 传播 + 不安全的 JSON.parse |
| Medium | 10 | useRef<any>、null 守卫缺失、泛型泄漏 |
| Low | 22 | 缺少返回类型、可接受的类型断言 |

**做得好的地方：**
- 零 `@ts-ignore` / `@ts-expect-error`
- 所有事件处理器正确类型化
- 一致使用 string literal union（不用 enum）
- `VoiceState` 使用了正确的判别联合模式
- 所有 hooks 有显式返回类型注解（`loadStoredItems(): Item[]`）

---

## High 严重问题（8 个）

### H1. `LovcoreDocumentBody.json` 是 `any` 类型（根源）

**文件：** `src/types.ts:7`

```typescript
export interface LovcoreDocumentBody {
  kind: 'tiptap';
  json: any; // ← 根源
  text: string;
  html?: string;
}
```

**影响：** 这个 `any` 传播到 5 个下游位置：

| 文件 | 行号 | 用法 |
|------|------|------|
| `DetailDrawer.tsx` | 30 | `useRef<{ text: string; json: any; html: string } \| null>` |
| `DetailDrawer.tsx` | 31 | `useRef<any>(null)` (saveTimeoutRef) |
| `DetailDrawer.tsx` | 154 | `handleEditorChange = (data: { text: string; json: any; html: string })` |
| `QuickNoteCard.tsx` | 61 | `handleEditorChange = (data: { text: string; json: any; html: string })` |
| `QuickNoteCard.tsx` | 71 | `handleSave = (data?: { text: string; json: any; html: string })` |

每个位置都有 `eslint-disable-line @typescript-eslint/no-explicit-any`。

**修复：**
```typescript
import type { JSONContent } from '@tiptap/core';

export interface LovcoreDocumentBody {
  kind: 'tiptap';
  json: JSONContent; // ← 替换 any
  text: string;
  html?: string;
}
```

修复 `types.ts` 后，删除其余 5 处 `eslint-disable` 注释即可。

### H2. JSON.parse 不安全类型断言（2 处）

**文件 1：** `src/lib/storage.ts:31`

```typescript
const parsed = JSON.parse(saved) as Item[];
```

**文件 2：** `src/hooks/useSpaces.ts:32`

```typescript
const parsed = JSON.parse(saved) as LovcoreSpace[];
```

**问题：** `JSON.parse` 返回 `any`。如果 localStorage 数据被损坏或格式变更，直接断言会导致运行时崩溃。

**修复：** 添加运行时校验：
```typescript
function isValidItemArray(data: unknown): data is Item[] {
  return Array.isArray(data) && data.every(item =>
    typeof item === 'object' && item !== null &&
    'id' in item && 'type' in item && 'status' in item
  );
}

// 使用
const parsed = JSON.parse(saved);
if (!isValidItemArray(parsed)) {
  // 回退到 mockItems
  return mockItems;
}
```

### H3. `saveTimeoutRef` 使用 `any`

**文件：** `src/components/DetailDrawer.tsx:31`

```typescript
const saveTimeoutRef = useRef<any>(null); // eslint-disable-line
```

**修复：**
```typescript
const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

---

## Medium 严重问题（10 个）

### M1. `response.json()` 泛型泄漏

**文件：** `src/ai/client.ts:39`

```typescript
async function post<T>(path: string, body: unknown): Promise<T> {
  // ...
  return response.json(); // 返回 Promise<any>，泛型 T 丢失
}
```

**修复：**
```typescript
return response.json() as Promise<T>;
```

### M2. LandingPage ref 访问缺少 null 守卫

**文件：** `src/components/LandingPage.tsx:439, 502-503`

```typescript
// 第 439 行：heroTitleRef.current 可能为 null
heroTitleRef.current.querySelectorAll(...)

// 第 502 行：slide1CardsRef.current 可能为 null
slide1CardsRef.current.querySelectorAll(...)
```

**修复：** 在使用前添加 `if (!ref.current) return;`

### M3. MasonryWaterfall ref 访问缺少 null 守卫

**文件：** `src/components/MasonryWaterfall.tsx:60`

第 15 行有守卫，但第 60 行没有。

**修复：** 统一在函数开头检查 `if (!containerRef.current) return;`

### M4. FileReader.result 类型断言（2 处）

**文件：** `src/lib/ingestion.ts:85`、`src/services/editor/voiceRecorder.ts:216`

```typescript
const text = (event.target?.result as string) || '';
```

**问题：** `FileReader.result` 可以是 `string | ArrayBuffer | null`。

**修复：**
```typescript
const result = event.target?.result;
const text = typeof result === 'string' ? result : '';
```

### M5. IndexedDB 结果类型断言

**文件：** `src/lib/fileStore.ts:41`

```typescript
const blob = await new Promise<Blob | undefined>((resolve) => {
  request.onsuccess = () => resolve(request.result as Blob | undefined);
});
```

**修复：** 添加运行时检查：
```typescript
request.onsuccess = () => {
  const result = request.result;
  resolve(result instanceof Blob ? result : undefined);
};
```

### M6. LandingPage filter(Boolean) 类型断言

**文件：** `src/components/LandingPage.tsx:358`

```typescript
.filter(Boolean) as HTMLDivElement[]
```

**修复：** 使用类型谓词：
```typescript
.filter((x): x is HTMLDivElement => Boolean(x))
```

### M7. React Hook 依赖警告被抑制（3 处）

**文件：** `DetailDrawer.tsx:189, 197`、`QuickNoteCard.tsx:44`

```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
```

**问题：** 可能导致闭包过时（stale closure）。

**修复：** 将被抑制的函数移到 `useCallback` 中，或将其依赖添加到 deps 数组。

---

## Low 严重问题（22 个）

### 缺少显式返回类型的导出函数（12 个）

| 文件 | 函数 |
|------|------|
| `hooks/useAudioCue.ts:84` | `useAudioCue()` |
| `hooks/useVoiceCapture.ts:44` | `useVoiceCapture()` |
| `hooks/useGhostCorrection.ts:32` | `useGhostCorrection()` |
| `hooks/useGhostAutocomplete.ts:36` | `useGhostAutocomplete()` |
| `hooks/useEditorShortcutRouter.ts:36` | `useEditorShortcutRouter()` |
| `i18n/I18nContext.tsx:31` | `I18nProvider()` |
| `i18n/useTranslation.ts:4` | `useTranslation()` |
| `components/editor/InlineAICommand.tsx:25` | `InlineAICommand()` |
| `components/ghost/GhostInlineCompletion.tsx:12` | `GhostInlineCompletion()` |
| `components/ghost/GhostOverlay.tsx:41` | `GhostOverlay()` |
| `components/ghost/GhostCorrectionLayer.tsx:69` | `GhostCorrectionLayer()` |
| `components/voice/VoiceRecorderIndicator.tsx:44` | `VoiceRecorderIndicator()` |

**影响：** 不影响运行时安全，但降低了可维护性。TypeScript 能推断返回类型，但显式声明可以作为文档并防止意外的 API 变更。

### 可接受的类型断言（10 个）

| 文件 | 断言 | 说明 |
|------|------|------|
| `DetailDrawer.tsx:216` | `(e.target as HTMLElement)` | DOM 事件处理，可接受 |
| `DetailDrawer.tsx:303` | `node as HTMLElement` | 已有 nodeType 检查 |
| `voiceRecorder.ts:37-43` | `window as Window & { SpeechRecognition? }` | 浏览器前缀 API |
| `SerendipityView.tsx:27` | `window as Window & { webkitAudioContext? }` | Safari 兼容 |
| `aesthetic.ts:102` | `createElement('canvas') as HTMLCanvasElement` | 冗余但无害 |
| `useEditorShortcutRouter.ts:61` | `event.target as HTMLElement \| null` | 键盘事件 |
| `SearchHeader.tsx:87` | `(['stack', ...] as VaultView[])` | 可改为模块级 const |
| `useCards.ts:44` | `'ready' as const` | 正确用法 |
| `QuickNoteCard.tsx:89` | `} as CSSProperties` | CSS 自定义属性 |

---

## 修复优先级

```
Step 1: H1 — 修改 types.ts 中 LovcoreDocumentBody.json 的类型
        → 一次性消除 5 个 any + 5 个 eslint-disable
        → 工作量：30 分钟

Step 2: H2 — 为 JSON.parse 添加运行时校验
        → 防止 localStorage 损坏导致白屏
        → 工作量：1 小时

Step 3: H3 + M1 — saveTimeoutRef 类型 + response.json() 泛型
        → 快速修复，各 5 分钟

Step 4: M2-M6 — ref null 守卫 + FileReader 类型守卫
        → 防止潜在运行时错误
        → 工作量：1 小时

Step 5: Low — 逐步添加导出函数的显式返回类型
        → 随开发自然完成，不需要专门处理
```
