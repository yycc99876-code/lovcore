/**
 * useEditorShortcutRouter — Unified keyboard event router for the editor.
 *
 * Priority chain:
 * 1. Ctrl+Enter → save
 * 2. Slash menu open → let Tiptap handle
 * 3. Voice shortcuts (Insert, Ctrl+Insert, Esc during recording)
 * 4. Voice recording blocks other shortcuts
 * 5. Rewrite preview active → Enter accepts, Esc dismisses
 * 6. Ghost autocomplete visible → Tab/ArrowRight accept, Esc dismiss
 * 7. Ghost correction visible → Tab accepts current suggestion, Esc clears
 * 8. Normal editor behavior
 */

import type { Editor } from '@tiptap/react';
import type { GhostAutocompleteState } from '../components/ghost/ghostTypes';
import type { GhostCorrectionState } from '../components/ghost/ghostTypes';
import type { VoiceState } from './useVoiceCapture';

interface ShortcutRouterParams {
  editor: Editor | null;
  isSlashMenuOpen: boolean;
  ghost: GhostAutocompleteState;
  ghostAccept: () => boolean;
  ghostAcceptAtBlockEnd: () => boolean;
  ghostDismiss: () => void;
  correctionState: GhostCorrectionState;
  correctionCycleNext: () => boolean;
  correctionAccept: () => boolean;
  correctionClear: () => void;
  voiceState: VoiceState;
  voiceKeyDown: (event: KeyboardEvent) => boolean;
  onSave?: (data: { text: string; json: unknown; html: string }) => void;
}

export function useEditorShortcutRouter(params: ShortcutRouterParams) {
  const {
    editor,
    isSlashMenuOpen,
    ghost,
    ghostAccept,
    ghostAcceptAtBlockEnd,
    ghostDismiss,
    correctionState,
    correctionCycleNext,
    correctionAccept,
    correctionClear,
    voiceState,
    voiceKeyDown,
    onSave,
  } = params;

  const handleKeyDown = (event: KeyboardEvent): boolean => {
    // Skip IME composition
    if (event.isComposing) return false;

    // Skip repeat events for modifier combos
    if (event.repeat && (event.key === 'Insert' || event.key === 'Tab')) return false;

    // Don't steal keys from non-editor inputs (search, title, textarea, etc.)
    const target = event.target as HTMLElement | null;
    if (target) {
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return false;
      // Allow contenteditable only if it's inside our editor
      if (target.isContentEditable && !target.closest('.quick-note-prosemirror')) return false;
    }

    // 1. Ctrl+Enter always saves
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      if (editor) {
        onSave?.({
          text: editor.getText(),
          json: editor.getJSON(),
          html: editor.getHTML(),
        });
      }
      return true;
    }

    // 2. Slash menu is open — let Tiptap suggestion handle it
    if (isSlashMenuOpen) return false;

    // 3. Voice shortcuts (Insert key)
    if (event.key === 'Insert') {
      return voiceKeyDown(event);
    }

    // 4. Voice is active (recording/transcribing/ready/error) — route to voice handler
    if (voiceState.status !== 'idle') {
      if (event.key === 'Escape' || event.key === 'Enter') {
        return voiceKeyDown(event);
      }
      // Block other shortcuts during recording/transcribing
      if (voiceState.status === 'push-to-talk-recording'
        || voiceState.status === 'hands-free-recording'
        || voiceState.status === 'transcribing') {
        return false;
      }
      // In ready/error state, block most keys except handled above
      return false;
    }

    // 6. Ghost autocomplete active
    if (ghost.visible) {
      if (event.key === 'Tab') {
        event.preventDefault();
        ghostAccept();
        return true;
      }
      if (event.key === 'ArrowRight') {
        if (ghostAcceptAtBlockEnd()) {
          event.preventDefault();
          return true;
        }
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        ghostDismiss();
        return true;
      }
      // Any printable key clears autocomplete (user is typing)
      if (event.key.length === 1 || event.key === 'Backspace') {
        ghostDismiss();
        return false;
      }
    }

    // 7. Ghost correction active (only when autocomplete is NOT visible)
    if (correctionState.visible) {
      if (event.key === 'Tab') {
        event.preventDefault();
        if (correctionState.activeIndex < 0) {
          correctionCycleNext();
          return true;
        }
        correctionAccept();
        return true;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        correctionClear();
        return true;
      }
    }

    // 8. Normal editor behavior
    return false;
  };

  return { handleKeyDown };
}
