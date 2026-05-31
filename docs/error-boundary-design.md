# Lovcore 全局 ErrorBoundary 设计

Status: **Planning**（尚未实施）

## 概览

Lovcore 目前没有任何 ErrorBoundary。如果一个组件抛出异常，整个应用会白屏。本文档设计一个分层的错误边界策略，确保局部错误不会导致全局崩溃。

---

## 1. React 错误边界机制

### 1.1 什么是 ErrorBoundary

ErrorBoundary 是 React 组件，捕获其子组件树中的 JavaScript 渲染错误，显示备用 UI 而不是白屏。

**能捕获：** 子组件的 `render`、生命周期方法、构造函数中的错误
**不能捕获：** 事件处理函数中的错误（需要 `try/catch`）、异步代码、SSR 错误

### 1.2 为什么需要

当前 Lovcore 的组件树：

```
App
├── LandingPage（登录）
├── SearchHeader（搜索栏）
├── SpacePills（空间标签）
├── MasonryWaterfall（卡片瀑布流）
│   ├── QuickNoteCard（快速笔记）
│   └── ContentCard × N（各种卡片）
├── DetailDrawer（详情抽屉）
│   └── LovcoreEditor（富文本编辑器）
│       ├── SlashCommandMenu
│       └── InlineAICommand
├── GhostOverlay / GhostInlineCompletion / GhostCorrectionLayer
├── VoiceRecorderIndicator
├── DragZone（拖拽上传）
├── CreateSpaceModal（创建空间）
└── SpacesView / SerendipityView
```

如果 `LovcoreEditor` 抛错，没有 ErrorBoundary 的话整个 App 白屏。有了 ErrorBoundary，只有编辑器区域显示错误提示，其他功能不受影响。

---

## 2. 分层策略

```
App（全局 ErrorBoundary）
├── LandingPage
├── SearchHeader
├── ContentArea ErrorBoundary
│   ├── MasonryWaterfall
│   │   ├── CardItem ErrorBoundary（per card）
│   │   │   └── ContentCard
│   │   └── QuickNoteCard
│   └── SpacesView / SerendipityView
├── DetailDrawer ErrorBoundary
│   └── LovcoreEditor
│       └── Editor ErrorBoundary
└── DragZone
```

### 层级说明

| 层级 | 位置 | 错误时表现 |
|------|------|-----------|
| **全局** | `App` 最外层 | 显示"应用出错"页面，有"刷新"按钮 |
| **内容区** | 卡片列表区域 | 卡片列表区域显示错误提示，搜索栏和侧边栏正常 |
| **卡片级** | 每个 ContentCard | 单张卡片显示错误占位，其他卡片不受影响 |
| **抽屉** | DetailDrawer | 抽屉内显示错误提示，可关闭抽屉继续使用 |
| **编辑器** | LovcoreEditor | 编辑器区域显示错误提示，可关闭重新打开 |

---

## 3. 实现方案

### 3.1 ErrorBoundary 组件

```tsx
// src/components/ErrorBoundary.tsx
import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-fallback">
          <p>Something went wrong.</p>
          <button onClick={this.reset}>Try Again</button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 3.2 卡片级错误占位

```tsx
// src/components/CardErrorFallback.tsx
export function CardErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="card-error-fallback">
      <p>Unable to display this card.</p>
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  );
}
```

### 3.3 在 App.tsx 中使用

```tsx
import { ErrorBoundary } from './components/ErrorBoundary';
import { CardErrorFallback } from './components/CardErrorFallback';

function App() {
  return (
    // 全局 ErrorBoundary
    <ErrorBoundary
      fallback={<div>App crashed. <button onClick={() => window.location.reload()}>Reload</button></div>}
      onError={(err) => console.error('Global error:', err)}
    >
      <LandingPage ... />

      {/* 内容区 ErrorBoundary */}
      <ErrorBoundary>
        <SearchHeader ... />
        <SpacePills ... />
        <MasonryWaterfall
          items={filteredItems}
          renderItem={(item) => (
            // 卡片级 ErrorBoundary
            <ErrorBoundary
              key={item.id}
              fallback={<CardErrorFallback />}
            >
              <ContentCard item={item} ... />
            </ErrorBoundary>
          )}
        />
      </ErrorBoundary>

      {/* 抽屉 ErrorBoundary */}
      <ErrorBoundary>
        <DetailDrawer ... >
          <ErrorBoundary>
            <LovcoreEditor ... />
          </ErrorBoundary>
        </DetailDrawer>
      </ErrorBoundary>
    </ErrorBoundary>
  );
}
```

---

## 4. 错误上报（可选，后期添加）

### 4.1 控制台日志（当前阶段）

```typescript
onError={(error, errorInfo) => {
  console.error('[ErrorBoundary]', {
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
  });
}}
```

### 4.2 Sentry 集成（后期）

```typescript
import * as Sentry from '@sentry/react';

onError={(error, errorInfo) => {
  Sentry.captureException(error, {
    extra: { componentStack: errorInfo.componentStack },
  });
}}
```

---

## 5. 事件处理函数中的错误

ErrorBoundary 不能捕获事件处理器中的错误。这些需要手动 `try/catch`：

```tsx
// 当前已有，不需要改
const handleDelete = (id: string) => {
  try {
    deleteItem(id);
    onToast?.('Card deleted');
  } catch (err) {
    onToast?.('Failed to delete card');
    console.error(err);
  }
};
```

Lovcore 现有的 `try/catch` 覆盖已经不错（20+ 处），不需要大规模修改。

---

## 6. CSS 样式

```css
/* src/components/ErrorBoundary.css */
.error-boundary-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px dashed var(--border-color);
}

.error-boundary-fallback button {
  margin-top: 0.75rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.875rem;
}

.error-boundary-fallback button:hover {
  background: var(--bg-hover);
}

.card-error-fallback {
  padding: 1.5rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
```

---

## 7. 实施步骤

```
Step 1: 创建 ErrorBoundary 组件和 CardErrorFallback 组件
Step 2: 在 App.tsx 最外层包裹全局 ErrorBoundary
Step 3: 在 MasonryWaterfall 的每个 ContentCard 外包裹卡片级 ErrorBoundary
Step 4: 在 DetailDrawer 内包裹 ErrorBoundary
Step 5: 添加 CSS 样式
Step 6: 测试：在某个组件中 throw new Error('test')，验证降级 UI 正常显示
```

**总工作量：** ~2 小时。不需要改任何现有组件逻辑，只在外层包裹。
