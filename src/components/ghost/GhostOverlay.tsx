/**
 * GhostOverlay — Combined ghost autocomplete + correction overlay.
 *
 * Renders inside LovcoreEditor. Handles:
 * - Inline ghost text completion (Cursor-style)
 * - Correction underlines with replacement preview
 * - Keyboard hints
 *
 * Uses container-relative positioning (not fixed) so it works inside modals.
 */

import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { GhostAcceptedFlash, GhostAutocompleteState, GhostCorrectionState } from './ghostTypes';
import { findTextInRange, getBlockTextAtCursor } from '../../services/editor/editorRangeUtils';
import { hasEditorView } from '../../services/editor/editorView';
import { useTranslation } from '../../i18n';

interface GhostOverlayProps {
  editor: Editor;
  containerRef: React.RefObject<HTMLDivElement | null>;
  ghost: GhostAutocompleteState;
  acceptedFlash?: GhostAcceptedFlash | null;
  correctionState: GhostCorrectionState;
}

interface CompletionPos {
  top: number;
  left: number;
  height: number;
}

interface CorrectionPos {
  id: string;
  original: string;
  replacement: string;
  severity: string;
  isActive: boolean;
  rect: { top: number; left: number; width: number; height: number };
}

export function GhostOverlay({ editor, containerRef, ghost, acceptedFlash, correctionState }: GhostOverlayProps) {
  const { t } = useTranslation();
  const showAutocomplete = ghost.visible && !!ghost.text;
  const showAcceptedFlash = !!acceptedFlash?.text;
  const showCorrections = correctionState.visible && correctionState.suggestions.length > 0;

  const [completionPos, setCompletionPos] = useState<CompletionPos | null>(null);
  const [acceptedPos, setAcceptedPos] = useState<CompletionPos | null>(null);
  const [corrections, setCorrections] = useState<CorrectionPos[]>([]);
  const activeCorrection = corrections.find((p) => p.isActive);

  // Sync positions when ghost/correction state changes
  useEffect(() => {
    const container = containerRef.current;
    if (!hasEditorView(editor)) return;

    if (showAutocomplete && container) {
      const pos = Math.min(ghost.from, editor.view.state.doc.content.size);
      setCompletionPos(getContainerOffset(container, editor, pos));
    } else {
      setCompletionPos(null);
    }

    if (showAcceptedFlash && acceptedFlash && container) {
      const pos = Math.min(acceptedFlash.from, editor.view.state.doc.content.size);
      setAcceptedPos(getContainerOffset(container, editor, pos));
    } else {
      setAcceptedPos(null);
    }

    if (showCorrections && container) {
      setCorrections(computeCorrectionPositions(editor, container, correctionState));
    } else {
      setCorrections([]);
    }
  }, [showAutocomplete, showAcceptedFlash, showCorrections, ghost.from, ghost.text, acceptedFlash, correctionState, containerRef, editor]);

  // Recompute on scroll/resize
  useEffect(() => {
    if (!showAutocomplete && !showAcceptedFlash && !showCorrections) return;
    const container = containerRef.current;
    if (!container) return;
    if (!hasEditorView(editor)) return;

    const recalc = () => {
      if (showAutocomplete) {
        const pos = Math.min(ghost.from, editor.view.state.doc.content.size);
        setCompletionPos(getContainerOffset(container, editor, pos));
      }
      if (showCorrections) {
        setCorrections(computeCorrectionPositions(editor, container, correctionState));
      }
      if (showAcceptedFlash && acceptedFlash) {
        const pos = Math.min(acceptedFlash.from, editor.view.state.doc.content.size);
        setAcceptedPos(getContainerOffset(container, editor, pos));
      }
    };
    container.addEventListener('scroll', recalc, { passive: true });
    window.addEventListener('resize', recalc);
    return () => { container.removeEventListener('scroll', recalc); window.removeEventListener('resize', recalc); };
  }, [showAutocomplete, showAcceptedFlash, showCorrections, ghost.from, acceptedFlash, correctionState, containerRef, editor]);

  if (!showAutocomplete && !showAcceptedFlash && !showCorrections && !correctionState.loading) return null;

  return (
    <>
      {showAutocomplete && completionPos && (
        <span
          className="ghost-inline-completion"
          style={{
            position: 'absolute',
            left: completionPos.left + 2,
            top: completionPos.top,
            pointerEvents: 'none',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            lineHeight: 'inherit',
            whiteSpace: 'pre',
            userSelect: 'none',
          }}
        >
          {ghost.text}
        </span>
      )}

      {showAcceptedFlash && acceptedFlash && acceptedPos && (
        <span
          key={acceptedFlash.id}
          className="ghost-accepted-flash"
          style={{
            position: 'absolute',
            left: acceptedPos.left + 2,
            top: acceptedPos.top,
            pointerEvents: 'none',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            lineHeight: 'inherit',
            whiteSpace: 'pre',
            userSelect: 'none',
          }}
        >
          {acceptedFlash.text}
        </span>
      )}

      {corrections.map(p => (
        <div
          key={p.id}
          className={`ghost-correction-range ${p.severity} ${p.isActive ? 'active' : ''}`}
          style={{
            position: 'absolute',
            left: p.rect.left,
            top: p.rect.top,
            width: p.rect.width,
            height: p.rect.height,
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
      ))}

      {activeCorrection && (
        <div
          className="ghost-correction-popover"
          style={{
            position: 'absolute',
            left: Math.max(0, activeCorrection.rect.left),
            top: activeCorrection.rect.top + activeCorrection.rect.height + 8,
            pointerEvents: 'none',
            zIndex: 20,
          }}
        >
          <span className="ghost-correction-popover-label">{t.ghost.replaceWith}</span>
          <span className="ghost-correction-popover-text">{activeCorrection.replacement}</span>
        </div>
      )}

      {correctionState.loading && (
        <div className="ghost-loading-hint">
          <span className="ghost-loading-dot" />
          <span>{t.ghost.scanning}</span>
        </div>
      )}

      {(showCorrections || showAutocomplete) && (
        <div className="ghost-kbd-hint">
          {showAutocomplete && <><kbd>{t.ghost.tabAccept}</kbd> {t.ghost.acceptCompletion} </>}
          {showCorrections && <><kbd>{t.ghost.tabAccept}</kbd> {t.ghost.acceptCorrection}</>}
        </div>
      )}
    </>
  );
}

// --- Helpers ---

function getContainerOffset(
  container: HTMLDivElement,
  editor: Editor,
  pos: number,
): CompletionPos | null {
  try {
    const coords = editor.view.coordsAtPos(pos);
    const rect = container.getBoundingClientRect();
    return {
      top: coords.top - rect.top + container.scrollTop,
      left: coords.left - rect.left,
      height: coords.bottom - coords.top,
    };
  } catch {
    return null;
  }
}

function computeCorrectionPositions(
  editor: Editor,
  container: HTMLDivElement,
  correctionState: GhostCorrectionState,
): CorrectionPos[] {
  try {
    const block = getBlockTextAtCursor(editor);
    if (!block) return [];

    const containerRect = container.getBoundingClientRect();
    const positioned: CorrectionPos[] = [];

    for (let i = 0; i < correctionState.suggestions.length; i++) {
      const s = correctionState.suggestions[i];
      const range = findTextInRange(editor, block.from, block.to, s.original);
      if (!range) continue;

      try {
        const fromCoords = editor.view.coordsAtPos(range.from);
        const toCoords = editor.view.coordsAtPos(range.to);

        positioned.push({
          id: `${s.original}__${s.replacement}`,
          original: s.original,
          replacement: s.replacement,
          severity: s.severity,
          isActive: i === correctionState.activeIndex,
          rect: {
            top: fromCoords.top - containerRect.top + container.scrollTop,
            left: fromCoords.left - containerRect.left,
            width: Math.max(1, toCoords.right - fromCoords.left),
            height: fromCoords.bottom - fromCoords.top,
          },
        });
      } catch {
        // skip invalid positions
      }
    }

    return positioned;
  } catch {
    return [];
  }
}
