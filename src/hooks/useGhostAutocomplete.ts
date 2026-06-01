/**
 * useGhostAutocomplete — Cursor-like inline ghost text completion.
 *
 * Improvements:
 * - requestKey based on stable context (paragraph tail + cursor + doc size)
 * - IME composition guard
 * - Voice recording guard
 * - isSlashMenuOpen auto-reset safety
 * - Debug logging for development
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { requestAutocomplete } from '../services/editor/autocompleteScanner';
import { getCursorContext, isCursorNearBlockEnd } from '../services/editor/editorRangeUtils';
import { getEditorDom } from '../services/editor/editorView';
import type { GhostAcceptedFlash, GhostAutocompleteState } from '../components/ghost/ghostTypes';

const EMPTY_GHOST: GhostAutocompleteState = { text: '', from: 0, visible: false, requestKey: '' };
const DEBOUNCE_MS = 420;
const MIN_PARAGRAPH_LENGTH = 4;
const SLASH_MENU_TIMEOUT_MS = 3000;

const DEBUG = import.meta.env.DEV;

function ghostDebug(...args: unknown[]) {
  if (DEBUG) console.debug('[Ghost]', ...args);
}

interface UseGhostAutocompleteOptions {
  editor: Editor | null;
  enabled: boolean;
  isSlashMenuOpen: boolean;
  isVoiceActive: boolean;
}

export function useGhostAutocomplete({
  editor,
  enabled,
  isSlashMenuOpen,
  isVoiceActive,
}: UseGhostAutocompleteOptions) {
  const [ghost, setGhost] = useState<GhostAutocompleteState>(EMPTY_GHOST);
  const [acceptedFlash, setAcceptedFlash] = useState<GhostAcceptedFlash | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const composingRef = useRef(false);
  const ghostRef = useRef(ghost);
  const slashMenuOpenRef = useRef(isSlashMenuOpen);
  const slashMenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { ghostRef.current = ghost; }, [ghost]);

  // Track slash menu state with auto-reset safety
  useEffect(() => {
    slashMenuOpenRef.current = isSlashMenuOpen;
    if (slashMenuOpenRef.current) {
      // Safety: auto-reset slash menu flag after timeout
      if (slashMenuTimerRef.current) clearTimeout(slashMenuTimerRef.current);
      slashMenuTimerRef.current = setTimeout(() => {
        if (slashMenuOpenRef.current) {
          ghostDebug('isSlashMenuOpen auto-reset (timeout)');
          slashMenuOpenRef.current = false;
        }
      }, SLASH_MENU_TIMEOUT_MS);
    } else {
      if (slashMenuTimerRef.current) { clearTimeout(slashMenuTimerRef.current); slashMenuTimerRef.current = null; }
    }
    return () => { if (slashMenuTimerRef.current) clearTimeout(slashMenuTimerRef.current); };
  }, [isSlashMenuOpen]);

  const clearGhost = useCallback(() => {
    setGhost(EMPTY_GHOST);
  }, []);

  const dismiss = useCallback(() => {
    abortRef.current?.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    clearGhost();
  }, [clearGhost]);

  const accept = useCallback((): boolean => {
    const g = ghostRef.current;
    if (!editor || !g.visible || !g.text) return false;
    const { state } = editor;
    const pos = Math.min(g.from, state.doc.content.size);
    const flashId = Date.now();
    setAcceptedFlash({ id: flashId, text: g.text, from: pos });
    editor.chain().focus().insertContentAt(pos, g.text).run();
    ghostDebug('accepted:', g.text);
    clearGhost();
    window.setTimeout(() => {
      setAcceptedFlash((current) => (current?.id === flashId ? null : current));
    }, 520);
    return true;
  }, [editor, clearGhost]);

  const acceptAtBlockEnd = useCallback((): boolean => {
    if (!editor || !isCursorNearBlockEnd(editor)) return false;
    return accept();
  }, [editor, accept]);

  // Build requestKey from stable context
  const buildRequestKey = useCallback((paragraph: string, cursorOffset: number, docSize: number): string => {
    return `${paragraph.slice(-30)}|${cursorOffset}|${docSize}`;
  }, []);

  // Debounced autocomplete trigger
  useEffect(() => {
    if (!editor || !enabled) return;

    const handler = () => {
      dismiss();

      if (composingRef.current) return;
      if (slashMenuOpenRef.current) return;
      if (isVoiceActive) return;

      if (!editor.state.selection.empty) return;

      const ctx = getCursorContext(editor);
      if (!ctx) return;
      if (ctx.beforeCursor.trim().length < MIN_PARAGRAPH_LENGTH) return;
      if (ctx.beforeCursor.trimEnd().endsWith('/')) return;

      // Don't trigger mid-word
      const charBefore = ctx.beforeCursor[ctx.beforeCursor.length - 1];
      if (charBefore && /\w/.test(charBefore) && ctx.afterCursor && /\w/.test(ctx.afterCursor[0])) return;

      const fullContext = editor.getText();
      const docSize = editor.state.doc.content.size;
      const reqKey = buildRequestKey(ctx.paragraph, ctx.beforeCursor.length, docSize);

      ghostDebug('debounce fired, key:', reqKey);

      debounceRef.current = setTimeout(async () => {
        ghostDebug('request sent');
        try {
          const suggestion = await requestAutocomplete({
            paragraph: ctx.paragraph,
            beforeCursor: ctx.beforeCursor,
            afterCursor: ctx.afterCursor,
            fullContext,
          });

          if (!suggestion) {
            ghostDebug('empty suggestion');
            return;
          }

          // Stale response check
          const currentCtx = getCursorContext(editor);
          if (!currentCtx) return;
          const currentKey = buildRequestKey(currentCtx.paragraph, currentCtx.beforeCursor.length, editor.state.doc.content.size);
          if (currentKey !== reqKey) {
            ghostDebug('stale response, discarding');
            return;
          }

          ghostDebug('suggestion received:', suggestion);
          setGhost({
            text: suggestion,
            from: editor.state.selection.anchor,
            visible: true,
            requestKey: reqKey,
          });
          ghostDebug('ghost set visible');
        } catch (err) {
          ghostDebug('request error:', err);
        }
      }, DEBOUNCE_MS);
    };

    editor.on('update', handler);
    return () => {
      editor.off('update', handler);
      dismiss();
    };
  }, [editor, enabled, isSlashMenuOpen, isVoiceActive, dismiss, buildRequestKey]);

  // Dismiss on cursor move
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      if (ghostRef.current.visible) {
        ghostDebug('cursor moved, dismissing ghost');
        clearGhost();
      }
    };
    editor.on('selectionUpdate', handler);
    return () => { editor.off('selectionUpdate', handler); };
  }, [editor, clearGhost]);

  // IME composition tracking
  useEffect(() => {
    const el = getEditorDom(editor);
    if (!el) return;

    const onStart = () => { composingRef.current = true; dismiss(); };
    const onEnd = () => { composingRef.current = false; };

    el.addEventListener('compositionstart', onStart);
    el.addEventListener('compositionend', onEnd);
    return () => {
      el.removeEventListener('compositionstart', onStart);
      el.removeEventListener('compositionend', onEnd);
    };
  }, [editor, dismiss]);

  return {
    ghost,
    acceptedFlash,
    accept,
    acceptAtBlockEnd,
    dismiss,
    clearGhost,
  };
}
