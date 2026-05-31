# Lovcore Accessibility 审计报告

Status: **审计完成**（2026-05-24）

审计范围：`src/` 下全部 24 个 `.tsx` 文件

---

## 总览

| 严重程度 | 数量 | 说明 |
|---------|------|------|
| Critical | 5 | 影响键盘用户和屏幕阅读器用户的基本使用 |
| Moderate | 11 | 影响部分用户的体验 |
| Minor | 5 | 最佳实践问题，影响较小 |

**做得好的地方：**
- 所有 `<img>` 标签都有 `alt` 属性
- 所有事件处理器都有正确的 TypeScript 类型
- 使用了 `<nav>`、`<main>`、`<header>`、`<section>`、`<footer>` 等语义标签
- `QuickNoteCard` 有 `role="dialog"` 和 `aria-modal="true"`
- `VoiceRecorderIndicator` 有 `aria-live="polite"`

---

## Critical 问题（5 个）

### C1. ContentCard 可点击 div 缺少 role 和键盘支持

**文件：** `src/components/ContentCard.tsx:169`

```tsx
<div className="masonry-item" onClick={() => onSelect(item)}>
```

**问题：** 整个卡片是可点击区域，但使用的是 `<div>`，没有 `role`、`tabIndex`、`onKeyDown`。键盘用户无法选中卡片。

**修复：**
```tsx
<article
  className="masonry-item"
  role="button"
  tabIndex={0}
  onClick={() => onSelect(item)}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(item); }}
>
```

### C2. CreateSpaceModal 缺少 dialog 语义

**文件：** `src/components/CreateSpaceModal.tsx:52`

```tsx
<div className="space-create-modal">
```

**问题：** 模态框没有 `role="dialog"`、`aria-modal="true"`、`aria-label`。屏幕阅读器无法识别这是一个对话框。

**修复：**
```tsx
<div className="space-create-modal" role="dialog" aria-modal="true" aria-label={t.createSpace.title}>
```

### C3. CreateSpaceModal 和 DetailDrawer 没有焦点陷阱

**文件：** `CreateSpaceModal.tsx:50-106`、`DetailDrawer.tsx:586-902`

**问题：** 打开模态框/抽屉后，键盘用户可以 Tab 到背景内容中。`DetailDrawer` 有 `body scroll lock` 和 `Escape` 关闭，但没有焦点陷阱。

**修复：** 实现焦点陷阱组件：
```tsx
function FocusTrap({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const focusable = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    container.addEventListener('keydown', handleTab);
    first?.focus();
    return () => container.removeEventListener('keydown', handleTab);
  }, []);

  return <div ref={containerRef}>{children}</div>;
}
```

### C4. CSS 中大量 `outline: none` 移除了焦点指示器

**文件：** `src/index.css`（10+ 处）、`src/components/LandingPage.css`（1 处）

**问题：** 直接 `outline: none` 移除了所有元素的焦点轮廓，键盘用户看不到当前聚焦位置。

**修复：** 替换为 `:focus-visible` 模式：
```css
/* 旧：移除所有 outline */
outline: none;

/* 新：只在鼠标点击时移除，键盘聚焦时保留 */
:focus:not(:focus-visible) {
  outline: none;
}
:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}
```

---

## Moderate 问题（11 个）

### M1. 搜索输入框缺少 label

**文件：** `SearchHeader.tsx:144, 191`

两个搜索 `<input>` 都没有 `<label>` 或 `aria-label`，只靠 `placeholder`。

**修复：** `aria-label={t.header.searchPlaceholder}`

### M2. 密码输入框缺少 label

**文件：** `LandingPage.tsx:666`

**修复：** `aria-label="Vault password"`

### M3. Logo 可点击 div 缺少键盘支持

**文件：** `SearchHeader.tsx:103, 184`

**修复：** 改为 `<button>` 或添加 `role="button" tabIndex={0} onKeyDown`

### M4. PDF 查看器头部 div 可点击

**文件：** `DetailDrawer.tsx:222`

**修复：** 同 M3

### M5. QuickNoteCard 有 dialog role 但无焦点陷阱

**文件：** `QuickNoteCard.tsx:91-147`

**修复：** 包裹 `<FocusTrap>`

### M6. 笔记背景色与文字色可能对比度不足

**文件：** `SerendipityView.tsx:152`

`noteBgColor` 是用户可配置的，深色背景配深色文字会不可读。

**修复：** 根据背景色亮度动态计算文字颜色：
```tsx
function getContrastText(bgHex: string): string {
  const r = parseInt(bgHex.slice(1, 3), 16);
  const g = parseInt(bgHex.slice(3, 5), 16);
  const b = parseInt(bgHex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
}
```

### M7. 没有 Skip Navigation 链接

**文件：** 全局

**修复：** 在 `App.tsx` 最顶部添加：
```tsx
<a href="#main-content" className="skip-link">Skip to main content</a>
```
```css
.skip-link {
  position: absolute;
  left: -9999px;
}
.skip-link:focus {
  left: 0;
  top: 0;
  z-index: 9999;
  padding: 0.5rem 1rem;
  background: var(--bg-primary);
}
```

### M8. 没有 `prefers-reduced-motion` 支持

**文件：** 所有 CSS 文件

**修复：** 在 `index.css` 末尾添加：
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### M9. Lenis 平滑滚动忽略运动偏好

**文件：** `LandingPage.tsx:217`

**修复：**
```tsx
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const lenis = new Lenis({ smoothWheel: !prefersReducedMotion, duration: prefersReducedMotion ? 0 : 1.2 });
```

### M10. Tag 输入框缺少 label

**文件：** `DetailDrawer.tsx:851`

**修复：** `aria-label={t.drawer.tagPlaceholder}`

### M11. Space 名称输入框缺少 label

**文件：** `CreateSpaceModal.tsx:62`

**修复：** `aria-label={t.createSpace.namePlaceholder}`

---

## Minor 问题（5 个）

| # | 文件 | 问题 |
|---|------|------|
| m1 | `LandingPage.tsx:140-148` | 字符喷泉装饰效果，键盘用户无法触发（可接受为纯鼠标交互） |
| m2 | `LandingPage.tsx:964-969` | FORGET/KEEP 按钮无 onClick，疑似占位符 |
| m3 | `DetailDrawer.tsx:438-484` | 导出 HTML 模板中的硬编码颜色接近对比度下限 |
| m4 | `ContentCard.tsx:169` | `<div>` 应改为 `<article>`（语义 HTML） |
| m5 | `CreateSpaceModal.tsx:52` | 模态框应使用语义 `<dialog>` 元素 |

---

## 修复优先级建议

```
Week 1: C1 + C4（ContentCard 键盘支持 + CSS focus-visible）
Week 2: C2 + C3（Modal/Drawer dialog 语义 + 焦点陷阱）
Week 3: M1-M5（表单 label + 键盘支持）
Week 4: M6-M9（对比度 + skip nav + reduced-motion）
```
