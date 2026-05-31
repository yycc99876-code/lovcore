'use client';

/**
 * useGhostCorrection — AI-powered writing correction with inline underlines.
 *
 * Scans the current paragraph after a pause, returns 1-3 suggestions.
 * Supports Tab to cycle, Enter to accept, Esc to clear.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { scanParagraph } from '../services/editor/ghostCorrectionScanner';
import { getBlockTextAtCursor, findTextInRange } from '../services/editor/editorRangeUtils';
import type { GhostCorrectionState, GhostSuggestion } from '../components/ghost/ghostTypes';

const EMPTY_STATE: GhostCorrectionState = {
  suggestions: [],
  activeIndex: -1,
  visible: false,
  loading: false,
  paragraphText: '',
};

const DEBOUNCE_MS = 650;
const MIN_PARAGRAPH_LENGTH = 8;

interface UseGhostCorrectionOptions {
  editor: Editor | null;
  enabled: boolean;
  isSlashMenuOpen: boolean;
  isVoiceActive: boolean;
}

export function useGhostCorrection({
  editor,
  enabled,
  isSlashMenuOpen,
  isVoiceActive,
}: UseGhostCorrectionOptions) {
  const [state, setState] = useState<GhostCorrectionState>(EMPTY_STATE);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanIdRef = useRef(0);
  const paragraphCacheRef = useRef<Map<string, GhostSuggestion[]>>(new Map());
  const ignoredRef = useRef<Set<string>>(new Set());
  const stateRef = useRef(state);

  useEffect(() => { stateRef.current = state; }, [state]);

  const clear = useCallback(() => {
    setState(EMPTY_STATE);
  }, []);

  // Cycle to next suggestion
  const cycleNext = useCallback((): boolean => {
    const s = stateRef.current;
    if (s.suggestions.length === 0) return false;
    const next = (s.activeIndex + 1) % s.suggestions.length;
    setState(prev => ({ ...prev, activeIndex: next }));
    return true;
  }, []);

  // Accept the active suggestion
  const acceptActive = useCallback((): boolean => {
    const s = stateRef.current;
    if (s.activeIndex < 0 || s.activeIndex >= s.suggestions.length) return false;
    if (!editor) return false;

    const suggestion = s.suggestions[s.activeIndex];
    const block = getBlockTextAtCursor(editor);
    if (!block) return false;

    // Try to find the original text in the current block
    const range: { from: number; to: number } | null =
      suggestion.from !== undefined && suggestion.to !== undefined
        ? { from: suggestion.from, to: suggestion.to }
        : findTextInRange(editor, block.from, block.to, suggestion.original);

    if (!range) return false;

    // Verify the text still matches
    const currentText = editor.state.doc.textBetween(range.from, range.to);
    if (currentText !== suggestion.original) return false;

    editor.chain().focus().deleteRange(range).insertContentAt(range.from, suggestion.replacement).run();

    // Remove accepted suggestion and re-scan
    const remaining = s.suggestions.filter((_, i) => i !== s.activeIndex);
    setState(prev => ({
      ...prev,
      suggestions: remaining,
      activeIndex: Math.min(prev.activeIndex, remaining.length - 1),
      visible: remaining.length > 0,
    }));

    return true;
  }, [editor]);

  // Ignore current suggestion for this session
  const ignoreActive = useCallback(() => {
    const s = stateRef.current;
    if (s.activeIndex < 0 || s.activeIndex >= s.suggestions.length) return;

    const suggestion = s.suggestions[s.activeIndex];
    ignoredRef.current.add(`${suggestion.original}__${suggestion.replacement}`);

    const remaining = s.suggestions.filter((_, i) => i !== s.activeIndex);
    setState(prev => ({
      ...prev,
      suggestions: remaining,
      activeIndex: Math.min(prev.activeIndex, remaining.length - 1),
      visible: remaining.length > 0,
    }));
  }, []);

  // Scan current paragraph
  const scanCurrentParagraph = useCallback(async () => {
    if (!editor || !enabled) return;
    if (isSlashMenuOpen || isVoiceActive) return;

    const block = getBlockTextAtCursor(editor);
    if (!block) { clear(); return; }

    const text = block.text.trim();
    if (text.length < MIN_PARAGRAPH_LENGTH) { clear(); return; }

    // Check cache
    const cached = paragraphCacheRef.current.get(text);
    if (cached) {
      const filtered = cached.filter(s => !ignoredRef.current.has(`${s.original}__${s.replacement}`));
      setState({
        suggestions: filtered,
        activeIndex: filtered.length > 0 ? 0 : -1,
        visible: filtered.length > 0,
        loading: false,
        paragraphText: text,
      });
      return;
    }

    const currentScan = ++scanIdRef.current;
    setState(prev => ({ ...prev, loading: true }));

    try {
      const fullContext = editor.getText();
      const result = await scanParagraph(text, fullContext);

      if (currentScan !== scanIdRef.current) return;

      // Filter ignored suggestions
      const filtered = result.suggestions.filter(
        s => !ignoredRef.current.has(`${s.original}__${s.replacement}`),
      );

      paragraphCacheRef.current.set(text, result.suggestions);

      setState({
        suggestions: filtered,
        activeIndex: filtered.length > 0 ? 0 : -1,
        visible: filtered.length > 0,
        loading: false,
        paragraphText: text,
      });
    } catch {
      if (currentScan === scanIdRef.current) {
        setState(prev => ({ ...prev, loading: false }));
      }
    }
  }, [editor, enabled, isSlashMenuOpen, isVoiceActive, clear]);

  // Debounced trigger on editor changes
  useEffect(() => {
    if (!editor || !enabled) return;

    const handler = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(scanCurrentParagraph, DEBOUNCE_MS);
    };

    editor.on('update', handler);
    editor.on('selectionUpdate', handler);
    return () => {
      editor.off('update', handler);
      editor.off('selectionUpdate', handler);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [editor, enabled, scanCurrentParagraph]);

  return {
    correctionState: state,
    cycleNext,
    acceptActive,
    ignoreActive,
    clear,
  };
}
