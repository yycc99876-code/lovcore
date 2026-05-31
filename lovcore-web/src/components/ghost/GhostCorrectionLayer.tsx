'use client';

/**
 * GhostCorrectionLayer — Renders correction underlines and inline replacement previews.
 *
 * Positioned absolutely within the editor container.
 * Uses coordsAtPos for precise positioning.
 */

import type { Editor } from '@tiptap/react';
import type { GhostCorrectionState } from './ghostTypes';
import { findTextInRange, getBlockTextAtCursor } from '../../services/editor/editorRangeUtils';

interface GhostCorrectionLayerProps {
  editor: Editor;
  correctionState: GhostCorrectionState;
}

interface PositionedSuggestion {
  id: string;
  original: string;
  replacement: string;
  severity: 'minor' | 'moderate' | 'major';
  isActive: boolean;
  rect: { top: number; left: number; width: number; height: number };
}

function getSuggestionRects(
  editor: Editor,
  correctionState: GhostCorrectionState,
): PositionedSuggestion[] {
  const { view } = editor;
  const block = getBlockTextAtCursor(editor);
  if (!block) return [];

  const results: PositionedSuggestion[] = [];

  for (let i = 0; i < correctionState.suggestions.length; i++) {
    const s = correctionState.suggestions[i];
    const id = `${s.original}__${s.replacement}`;

    // Find position of original text in the block
    const range = findTextInRange(editor, block.from, block.to, s.original);
    if (!range) continue;

    try {
      const fromCoords = view.coordsAtPos(range.from);
      const toCoords = view.coordsAtPos(range.to);

      results.push({
        id,
        original: s.original,
        replacement: s.replacement,
        severity: s.severity,
        isActive: i === correctionState.activeIndex,
        rect: {
          top: fromCoords.top,
          left: fromCoords.left,
          width: toCoords.right - fromCoords.left,
          height: fromCoords.bottom - fromCoords.top,
        },
      });
    } catch {
      // coordsAtPos can throw if position is invalid
    }
  }

  return results;
}

export function GhostCorrectionLayer({ editor, correctionState }: GhostCorrectionLayerProps) {
  if (!correctionState.visible || correctionState.suggestions.length === 0) return null;

  const positioned = getSuggestionRects(editor, correctionState);
  if (positioned.length === 0) return null;

  return (
    <>
      {positioned.map(p => (
        <div
          key={p.id}
          className={`ghost-correction-range ${p.severity} ${p.isActive ? 'active' : ''}`}
          style={{
            position: 'fixed',
            left: p.rect.left,
            top: p.rect.top,
            width: p.rect.width,
            height: p.rect.height,
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          {p.isActive && (
            <span
              className="ghost-correction-replacement"
              style={{
                position: 'absolute',
                left: '100%',
                top: 0,
                paddingLeft: 3,
                opacity: 0.75,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                lineHeight: 'inherit',
              }}
            >
              {p.replacement}
            </span>
          )}
        </div>
      ))}

      {/* Keyboard hint */}
      {correctionState.suggestions.length > 0 && (
        <div className="ghost-kbd-hint">
          <kbd>Tab</kbd> <span>切换</span>
          <kbd>Enter</kbd> <span>接受</span>
          <kbd>Esc</kbd> <span>忽略</span>
        </div>
      )}
    </>
  );
}
