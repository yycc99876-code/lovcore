# Lovcore 性能分析报告

Status: **审计完成**（2026-05-24）

审计范围：`src/` 全部源码、`package.json`、`index.html`、CSS 文件

---

## 总览

| 类别 | 问题数 | 最高影响 |
|------|--------|---------|
| Bundle 大小 | 4 | 无代码分割，首屏加载全部 JS |
| 图片优化 | 2 | LandingPage 7 张大图未懒加载 |
| 渲染性能 | 5 | ContentCard 无 memo，rAF 持续循环 |
| CSS 性能 | 3 | 9+ 元素过度使用 will-change |
| 网络/加载 | 3 | 字体阻塞渲染，同步 localStorage 读取 |
| 内存泄漏 | 3 | 事件监听器未清理，缓存无上限 |

---

## Top 10 性能问题（按影响排序）

### P1. 无代码分割 — 首屏加载全部 JS

**文件：** `src/App.tsx:2-18`

所有组件都是静态 import，零 `React.lazy()` 或动态 `import()`。首屏加载包含：
- Tiptap 编辑器（~100KB+，8 个包）
- GSAP 动画库（~30KB gzip）
- Lenis 平滑滚动
- SerendipityView 的环境音引擎

用户即使只看卡片列表，也要下载编辑器和动画库的全部代码。

**修复：**
```tsx
// App.tsx
import { lazy, Suspense } from 'react';

const LandingPage = lazy(() => import('./components/LandingPage'));
const DetailDrawer = lazy(() => import('./components/DetailDrawer'));
const SerendipityView = lazy(() => import('./components/SerendipityView'));
const SpacesView = lazy(() => import('./components/SpacesView'));

// 在使用处包裹 Suspense
<Suspense fallback={<div>Loading...</div>}>
  <DetailDrawer ... />
</Suspense>
```

**预估效果：** 首屏 JS 减少 40-60%。

### P2. LandingPage 图片未懒加载

**文件：** `src/components/LandingPage.tsx:716, 726, 744, 759, 873, 885, 944`

7 张大 PNG 图片全部 eager loading，即使用户立即进入 vault 也会下载。

**修复：** 添加 `loading="lazy"`：
```tsx
<img src="/images/sequoia_agi_screenshot.png" loading="lazy" alt="..." />
```

首屏视口内的图片保持 eager，其余加 lazy。

### P3. MasonryWaterfall 持续 rAF 循环

**文件：** `src/components/MasonryWaterfall.tsx:50-78`

`requestAnimationFrame` 循环在整个组件生命周期内持续运行，每帧都执行 `querySelectorAll('.masonry-item')` 和 GSAP tween 计算，即使用户完全静止。

**修复：**
```tsx
// 只在滚动或内容变化时触发动画，而非每帧
useLayoutEffect(() => {
  const items = containerRef.current?.querySelectorAll('.masonry-item');
  if (!items) return;
  gsap.set(items, { opacity: 0, y: 30 });
  gsap.to(items, { opacity: 1, y: 0, stagger: 0.06, duration: 0.5 });
}, [children]); // 只在 children 变化时运行一次
```

移除持续 rAF 循环，改用 GSAP 的内置 ticker 或 IntersectionObserver。

### P4. ContentCard 未 memo 化

**文件：** `src/components/ContentCard.tsx:15`

卡片列表中最频繁渲染的组件没有 `React.memo`，且父组件每轮渲染都创建新的回调函数。

**修复：**
```tsx
// ContentCard.tsx
export const ContentCard = React.memo(function ContentCard({ ... }) {
  // ...
});

// App.tsx — 用 useCallback 稳定回调
const handleSelectCard = useCallback((item: Item) => {
  setSelectedItem(item);
}, []);
```

**预估效果：** 卡片列表滚动时减少 50%+ 的无用渲染。

### P5. will-change 过度使用

**文件：** `src/index.css`（2 处）、`src/components/LandingPage.css`（7 处）

9+ 个元素声明 `will-change: transform`，导致全部被提升为 GPU 层，消耗显存。

**修复：** 只在动画开始前添加 will-change，动画结束后移除：
```css
/* 移除静态 will-change */
.masonry-item { /* 删除 will-change: transform */ }

/* 用 JS 在动画前添加 */
element.style.willChange = 'transform';
animation完成后: element.style.willChange = 'auto';
```

或至少只在 `:hover` 时添加：
```css
.masonry-item:hover { will-change: transform; }
```

### P6. useGhostCorrection 缓存无上限

**文件：** `src/hooks/useGhostCorrection.ts:41-42`

```typescript
const paragraphCacheRef = useRef<Map<string, GhostSuggestion[]>>(new Map());
const ignoredRef = useRef<Set<string>>(new Set());
```

Map 和 Set 永远增长，长编辑会话会持续积累内存。

**修复：** 添加 LRU 限制：
```typescript
const MAX_CACHE_SIZE = 100;

function setWithLimit<K, V>(map: Map<K, V>, key: K, value: V, max: number) {
  if (map.size >= max) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) map.delete(firstKey);
  }
  map.set(key, value);
}
```

### P7. LandingPage 事件监听器泄漏

**文件：** `src/components/LandingPage.tsx:243-300`

字母喷泉 hover 效果通过 `querySelectorAll('.fountain-char')` 添加事件监听器，但 useEffect 没有 cleanup 函数。组件卸载后监听器仍然存在。

**修复：**
```tsx
useEffect(() => {
  const chars = document.querySelectorAll('.fountain-char');
  const cleanups: (() => void)[] = [];

  chars.forEach(char => {
    const handler = () => { /* ... */ };
    char.addEventListener('mouseenter', handler);
    cleanups.push(() => char.removeEventListener('mouseenter', handler));
  });

  return () => cleanups.forEach(fn => fn()); // ← 添加清理
}, []);
```

### P8. 字体加载阻塞渲染

**文件：** `index.html:9-10`

三个 Google Font 家族（Cinzel、Inter、Newsreader）通过 render-blocking `<link>` 加载，阻塞首屏渲染。

**修复方案：**
```html
<!-- 1. 只预加载关键字体 -->
<link rel="preload" href="..." as="style" onload="this.onload=null;this.rel='stylesheet'">

<!-- 2. 非关键字体用 font-display: optional -->
<!-- 或在 CSS 中用 @font-face 声明 -->
<style>
  @font-face {
    font-family: 'Cinzel';
    src: url(...) format('woff2');
    font-display: optional; /* 不阻塞渲染，字体可用时才显示 */
  }
</style>

<!-- 3. 减少字重数量 -->
<!-- 当前加载了 Cinzel 4 个 weight + Inter 4 个 weight + Newsreader 4 个 weight -->
<!-- 建议：Cinzel 400+700, Inter 400+600, Newsreader 400 italic -->
```

### P9. 同步 localStorage 读取阻塞主线程

**文件：** `src/lib/storage.ts:20-45`、`src/hooks/useSpaces.ts:53`

`loadStoredItems()` 和 `loadSpaces()` 在 `useState` 初始化器中同步读取 localStorage 并 JSON.parse。数据量大时阻塞首屏渲染。

**修复：** 当前数据量下影响不大（通常 <100KB），但可以优化：
```tsx
// 如果未来数据量增长，改为异步
const [items, setItems] = useState<Item[]>([]);
useEffect(() => {
  setItems(loadStoredItems());
}, []);
```

### P10. 未使用的依赖

**文件：** `package.json:27`

`tippy.js` 在 `package.json` 中声明但 `src/` 中没有任何文件导入它。

**修复：**
```bash
npm uninstall tippy.js
```

---

## 做得好的地方

| 方面 | 说明 |
|------|------|
| 图片懒加载 | `ContentCard` 正确使用 `loading="lazy"` |
| lucide-react 按需导入 | 每个图标单独 import，tree-shaking 有效 |
| Object URL 生命周期 | `useFileUrl` 和 `triggerDownload` 都正确 revoke |
| GSAP ScrollTrigger 清理 | LandingPage 的 useEffect 有正确的 cleanup |
| 动画使用 transform/opacity | 绝大多数动画使用 GPU 加速属性 |
| Google Fonts preconnect | 已设置 `preconnect` 到 fonts.googleapis.com |

---

## 修复优先级

```
Week 1: P1（代码分割）— 影响最大，工作量中等
Week 1: P2（图片懒加载）— 5 分钟修复
Week 1: P10（删除 tippy.js）— 1 分钟

Week 2: P3（rAF 循环）— 需要重构动画逻辑
Week 2: P4（ContentCard memo）— 30 分钟

Week 3: P5（will-change 清理）— CSS 批量修改
Week 3: P6（缓存上限）— 15 分钟
Week 3: P7（事件监听器清理）— 15 分钟

Week 4: P8（字体优化）— 需要测试字体显示效果
Week 4: P9（localStorage 异步化）— 当前影响小，低优先级
```
