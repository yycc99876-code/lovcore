interface SkeletonProps {
  variant: 'document' | 'editor' | 'card';
  className?: string;
}

/**
 * Skeleton placeholder shown while lazy-loaded components are loading.
 * Uses the existing shimmer animation from index.css (.stack-loading-shimmer).
 */
export function Skeleton({ variant, className = '' }: SkeletonProps) {
  if (variant === 'document') {
    return (
      <div className={`skeleton-document ${className}`}>
        <div className="skeleton-doc-page">
          <div className="skeleton-doc-line skeleton-doc-line-title" />
          <div className="skeleton-doc-line" />
          <div className="skeleton-doc-line" />
          <div className="skeleton-doc-line skeleton-doc-line-short" />
          <div className="skeleton-doc-spacer" />
          <div className="skeleton-doc-line" />
          <div className="skeleton-doc-line" />
          <div className="skeleton-doc-line skeleton-doc-line-medium" />
          <div className="skeleton-doc-line skeleton-doc-line-short" />
        </div>
      </div>
    );
  }

  if (variant === 'editor') {
    return (
      <div className={`skeleton-editor ${className}`}>
        <div className="skeleton-editor-toolbar">
          <div className="skeleton-toolbar-btn" />
          <div className="skeleton-toolbar-btn" />
          <div className="skeleton-toolbar-btn" />
          <div className="skeleton-toolbar-divider" />
          <div className="skeleton-toolbar-btn" />
          <div className="skeleton-toolbar-btn" />
        </div>
        <div className="skeleton-editor-body">
          <div className="skeleton-doc-line skeleton-doc-line-title" />
          <div className="skeleton-doc-line" />
          <div className="skeleton-doc-line" />
          <div className="skeleton-doc-line skeleton-doc-line-short" />
        </div>
      </div>
    );
  }

  // card variant — compact placeholder for ContentCard
  return (
    <div className={`skeleton-card ${className}`}>
      <div className="skeleton-doc-line" />
      <div className="skeleton-doc-line" />
      <div className="skeleton-doc-line skeleton-doc-line-short" />
    </div>
  );
}
