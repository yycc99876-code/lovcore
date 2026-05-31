'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { SlashCommand, runSlashCommand } from '../../extensions/slashCommand';
import { filterSlashCommands } from './slashCommands';
import { useGhostAutocomplete } from '../../hooks/useGhostAutocomplete';
import { useGhostCorrection } from '../../hooks/useGhostCorrection';
import { useVoiceCapture } from '../../hooks/useVoiceCapture';
import { useEditorShortcutRouter } from '../../hooks/useEditorShortcutRouter';
import { useAudioCue } from '../../hooks/useAudioCue';
import { GhostOverlay } from '../ghost/GhostOverlay';
import { VoiceRecorderIndicator } from '../voice/VoiceRecorderIndicator';
import { InlineAICommand } from './InlineAICommand';
import { useTranslation } from '../../i18n';

interface LovcoreEditorProps {
  initialContent?: string | object;
  onChange?: (data: { text: string; json: unknown; html: string }) => void;
  onSave?: (data: { text: string; json: unknown; html: string }) => void;
  placeholder?: string;
  autoFocus?: boolean;
  enableGhost?: boolean;
}

export const LovcoreEditor = ({
  initialContent,
  onChange,
  onSave,
  placeholder,
  autoFocus = true,
  enableGhost = true,
}: LovcoreEditorProps) => {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t.editor.placeholder;
  const isFirstRender = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);

  const getParsedContent = (content: string | object | undefined) => {
    if (!content) return '';
    if (typeof content === 'object') return content;
    const trimmed = content.trim();
    if (trimmed.startsWith('<')) return content;
    return `<p>${content}</p>`;
  };

  const editor = useEditor({
    immediatelyRender: true,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: resolvedPlaceholder }),
      Image.configure({ allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      SlashCommand.configure({
        suggestion: {
          char: '/',
          allowSpaces: false,
          items: ({ query }) => filterSlashCommands(query),
          command: ({ editor: commandEditor, range, props }) => {
            runSlashCommand(props, commandEditor, range);
          },
        },
      }),
    ],
    content: getParsedContent(initialContent),
    editorProps: {
      attributes: { class: 'quick-note-prosemirror' },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      onChange?.({
        text: updatedEditor.getText(),
        json: updatedEditor.getJSON(),
        html: updatedEditor.getHTML(),
      });
    },
  });

  // Audio cues
  const audioCue = useAudioCue();

  // Voice capture
  const handleVoiceInsert = useCallback((text: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(text).run();
  }, [editor]);

  const {
    voiceState,
    isVoiceActive,
    rewritePreview,
    handleKeyDown: voiceKeyDown,
    handleKeyUp: voiceKeyUp,
    acceptRewrite,
    dismissRewrite,
  } = useVoiceCapture({ editor, onInsert: handleVoiceInsert, audioCue });

  // Ghost autocomplete
  const {
    ghost,
    acceptedFlash,
    accept: ghostAccept,
    acceptAtBlockEnd: ghostAcceptAtBlockEnd,
    dismiss: ghostDismiss,
  } = useGhostAutocomplete({
    editor,
    enabled: enableGhost,
    isSlashMenuOpen,
    isVoiceActive,
  });

  // Ghost correction
  const {
    correctionState,
    cycleNext: correctionCycleNext,
    acceptActive: correctionAccept,
    clear: correctionClear,
  } = useGhostCorrection({
    editor,
    enabled: enableGhost,
    isSlashMenuOpen,
    isVoiceActive,
  });

  // Shortcut router
  const { handleKeyDown: routerKeyDown } = useEditorShortcutRouter({
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
  });

  // Listen for slash menu open/close events
  useEffect(() => {
    const el = editor?.view?.dom;
    if (!el) return;

    const onOpen = () => setIsSlashMenuOpen(true);
    const onClose = () => setIsSlashMenuOpen(false);

    el.addEventListener('lovcore:slash-menu-open', onOpen);
    el.addEventListener('lovcore:slash-menu-close', onClose);
    return () => {
      el.removeEventListener('lovcore:slash-menu-open', onOpen);
      el.removeEventListener('lovcore:slash-menu-close', onClose);
    };
  }, [editor]);

  // Global keydown handler
  useEffect(() => {
    const el = editor?.view?.dom;
    if (!el) return;

    const handler = (event: KeyboardEvent) => {
      // Handle rewrite accept via Enter
      if (event.key === 'Enter' && rewritePreview) {
        event.preventDefault();
        acceptRewrite();
        return;
      }
      routerKeyDown(event);
    };

    el.addEventListener('keydown', handler);
    return () => el.removeEventListener('keydown', handler);
  }, [editor, routerKeyDown, rewritePreview, acceptRewrite]);

  // Voice keyup handler — attached to window so Insert release is captured
  // even when focus changes during recording
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      voiceKeyUp(event);
    };

    window.addEventListener('keyup', handler);
    return () => window.removeEventListener('keyup', handler);
  }, [voiceKeyUp]);

  // Auto-focus
  useEffect(() => {
    if (!editor || !autoFocus) return;
    const t = window.setTimeout(() => editor.chain().focus('end').run(), 40);
    return () => window.clearTimeout(t);
  }, [editor, autoFocus]);

  // Sync external content changes
  useEffect(() => {
    if (!editor) return;
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (initialContent !== undefined && !editor.isFocused) {
      editor.commands.setContent(getParsedContent(initialContent));
    }
  }, [initialContent, editor]);

  if (!editor) return null;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <EditorContent editor={editor} className="quick-note-editor-content" />
      <GhostOverlay
        editor={editor}
        containerRef={containerRef}
        ghost={ghost}
        acceptedFlash={acceptedFlash}
        correctionState={correctionState}
      />
      <InlineAICommand editor={editor} containerRef={containerRef} />
      <VoiceRecorderIndicator
        voiceState={voiceState}
        onAcceptRewrite={acceptRewrite}
        onDismissRewrite={dismissRewrite}
      />
    </div>
  );
};
