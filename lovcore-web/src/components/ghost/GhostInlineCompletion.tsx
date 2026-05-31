'use client';

/**
 * @deprecated Use GhostOverlay instead. Kept for backwards compatibility.
 */
import type { Editor } from '@tiptap/react';
import type { GhostAutocompleteState } from './ghostTypes';

interface GhostInlineCompletionProps {
  editor: Editor;
  ghost: GhostAutocompleteState;
}

export function GhostInlineCompletion({ editor, ghost }: GhostInlineCompletionProps) {
  if (!ghost.visible || !ghost.text) return null;

  const { view } = editor;
  const coords = view.coordsAtPos(Math.min(ghost.from, view.state.doc.content.size));

  return (
    <span
      className="ghost-inline-completion"
      style={{
        position: 'fixed',
        left: coords.right + 2,
        top: coords.top,
        pointerEvents: 'none',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        lineHeight: 'inherit',
        color: 'var(--text-secondary)',
        opacity: 0.45,
        whiteSpace: 'pre',
        userSelect: 'none',
      }}
    >
      {ghost.text}
    </span>
  );
}
