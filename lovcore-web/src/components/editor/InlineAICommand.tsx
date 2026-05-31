'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { Editor } from '@tiptap/react';
import { ChevronDown, Mic, Sparkles, X } from 'lucide-react';
import gsap from 'gsap';
import { aiClient } from '../../ai/client';
import { useTranslation } from '../../i18n';

interface InlineAICommandProps {
  editor: Editor;
  containerRef: RefObject<HTMLDivElement | null>;
}

interface SelectionState {
  from: number;
  to: number;
  text: string;
  rect: { top: number; left: number; width: number; height: number };
}

interface DiffState extends SelectionState {
  replacement: string;
  instruction: string;
}

export function InlineAICommand({ editor, containerRef }: InlineAICommandProps) {
  const { t } = useTranslation();
  const PRESETS = t.inlineAI.presets;
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [compactOpen, setCompactOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [commandText, setCommandText] = useState('');
  const [pendingDiff, setPendingDiff] = useState<DiffState | null>(null);
  const [status, setStatus] = useState<'idle' | 'thinking' | 'ready' | 'error'>('idle');
  const panelRef = useRef<HTMLDivElement>(null);
  const compactRef = useRef<HTMLDivElement>(null);
  const diffRef = useRef<HTMLDivElement>(null);
  const compactInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const requestIdRef = useRef(0);

  const readSelection = useCallback((): SelectionState | null => {
    const container = containerRef.current;
    if (!container || !editor.state.selection || editor.state.selection.empty) return null;

    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');
    if (!text.trim()) return null;

    try {
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      const containerRect = container.getBoundingClientRect();
      return {
        from,
        to,
        text,
        rect: {
          top: start.top - containerRect.top + container.scrollTop,
          left: start.left - containerRect.left,
          width: Math.max(28, end.right - start.left),
          height: start.bottom - start.top,
        },
      };
    } catch {
      return null;
    }
  }, [containerRef, editor]);

  const closeAll = useCallback(() => {
    setCompactOpen(false);
    setPanelOpen(false);
    setCommandText('');
    setPendingDiff(null);
    setStatus('idle');
    setSelection(readSelection());
  }, [readSelection]);

  const openPanel = useCallback(() => {
    const current = readSelection();
    if (!current) return;
    setSelection(current);
    setPendingDiff(null);
    setStatus('idle');
    setCompactOpen(false);
    setPanelOpen(true);
  }, [readSelection]);

  const syncSelection = useCallback(() => {
    if (compactOpen || panelOpen || pendingDiff || status === 'thinking') return;
    const current = readSelection();
    setSelection(current);
    if (current) {
      setCompactOpen(true);
    }
  }, [compactOpen, panelOpen, pendingDiff, readSelection, status]);

  useEffect(() => {
    editor.on('selectionUpdate', syncSelection);
    editor.on('update', syncSelection);
    return () => {
      editor.off('selectionUpdate', syncSelection);
      editor.off('update', syncSelection);
    };
  }, [editor, syncSelection]);

  useEffect(() => {
    if (compactOpen && compactRef.current) {
      gsap.fromTo(
        compactRef.current,
        { opacity: 0, y: 5, scale: 0.985 },
        { opacity: 1, y: 0, scale: 1, duration: 0.16, ease: 'power2.out' },
      );
    }
  }, [compactOpen]);

  useEffect(() => {
    if (panelOpen && panelRef.current) {
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, y: 10, scale: 0.985 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
    }
  }, [panelOpen]);

  useEffect(() => {
    if (pendingDiff && diffRef.current) {
      gsap.fromTo(diffRef.current, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' });
    }
  }, [pendingDiff]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        const current = readSelection();
        if (!current) return;
        event.preventDefault();
        openPanel();
        window.setTimeout(() => textareaRef.current?.focus(), 30);
      }

      if (event.key === 'Escape') {
        if (compactOpen || panelOpen || pendingDiff || status === 'error') {
          event.preventDefault();
          closeAll();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeAll, compactOpen, openPanel, panelOpen, pendingDiff, readSelection, status]);

  const runRewrite = useCallback(async (instruction: string) => {
    const target = selection || readSelection();
    if (!target || !instruction.trim()) return;

    const requestId = ++requestIdRef.current;
    setSelection(target);
    setCompactOpen(false);
    setPanelOpen(false);
    setPendingDiff(null);
    setStatus('thinking');

    try {
      const result = await aiClient.rewrite({ text: target.text, instruction });
      if (requestId !== requestIdRef.current) return;

      const replacement = result.rewritten?.trim();
      if (!replacement || replacement === target.text.trim()) {
        setStatus('idle');
        return;
      }

      setPendingDiff({ ...target, replacement, instruction });
      setStatus('ready');
    } catch {
      if (requestId === requestIdRef.current) setStatus('error');
    }
  }, [readSelection, selection]);

  const acceptDiff = useCallback(() => {
    if (!pendingDiff) return;

    const { state } = editor;
    const from = Math.max(0, Math.min(pendingDiff.from, state.doc.content.size));
    const to = Math.max(from, Math.min(pendingDiff.to, state.doc.content.size));
    const tr = state.tr.delete(from, to).insertText(pendingDiff.replacement, from);
    editor.view.dispatch(tr);
    editor.commands.focus();
    closeAll();
  }, [closeAll, editor, pendingDiff]);

  const rejectDiff = useCallback(() => {
    closeAll();
    editor.commands.focus();
  }, [closeAll, editor]);

  const submitCommand = useCallback(() => {
    const instruction = commandText.trim();
    if (!instruction) return;
    void runRewrite(instruction);
  }, [commandText, runRewrite]);

  const appendVoiceHint = useCallback(() => {
    setCommandText((current) => current || t.inlineAI.presets[0]);
    textareaRef.current?.focus();
    compactInputRef.current?.focus();
  }, [t.inlineAI.presets]);

  const panelTop = selection ? selection.rect.top + selection.rect.height + 14 : 0;
  const panelLeft = selection ? Math.max(0, selection.rect.left) : 0;
  const compactTop = selection ? selection.rect.top + selection.rect.height + 8 : 0;
  const compactLeft = selection ? Math.max(0, selection.rect.left) : 0;
  const diffTop = pendingDiff ? pendingDiff.rect.top + pendingDiff.rect.height + 10 : 0;

  return (
    <>
      {compactOpen && selection && !panelOpen && !pendingDiff && status !== 'thinking' && (
        <div
          ref={compactRef}
          className="inline-ai-compact"
          style={{ top: compactTop, left: compactLeft }}
          onMouseDown={(event) => event.preventDefault()}
        >
          <Sparkles size={14} className="inline-ai-compact-spark" />
          <input
            ref={compactInputRef}
            value={commandText}
            placeholder={t.inlineAI.placeholder}
            onChange={(event) => setCommandText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submitCommand();
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                closeAll();
              }
            }}
          />
          <button
            type="button"
            className="inline-ai-compact-icon"
            onClick={appendVoiceHint}
            title={t.inlineAI.voiceHint}
          >
            <Mic size={15} />
          </button>
          <button
            type="button"
            className="inline-ai-compact-icon"
            onClick={openPanel}
            title={t.inlineAI.customEdit}
          >
            <ChevronDown size={16} />
          </button>
        </div>
      )}

      {panelOpen && selection && !pendingDiff && status !== 'thinking' && (
        <div
          ref={panelRef}
          className="inline-ai-panel"
          style={{ top: panelTop, left: panelLeft }}
          onMouseDown={(event) => event.preventDefault()}
        >
          <div className="inline-ai-panel-header">
            <div className="inline-ai-panel-title">
              <Sparkles size={17} />
              <span>{t.inlineAI.customEdit}</span>
            </div>
            <button type="button" className="inline-ai-close" onClick={closeAll} aria-label={t.inlineAI.close}>
              <X size={18} />
            </button>
          </div>

          <div className="inline-ai-panel-body">
            <h3>{t.inlineAI.howToEdit}</h3>
            <div className="inline-ai-presets">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setCommandText(preset);
                    textareaRef.current?.focus();
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="inline-ai-textbox">
              <textarea
                ref={textareaRef}
                value={commandText}
                placeholder={t.inlineAI.placeholder}
                onChange={(event) => setCommandText(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                    event.preventDefault();
                    submitCommand();
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    closeAll();
                  }
                }}
              />
              <div className="inline-ai-textbox-footer">
                <button
                  type="button"
                  className="inline-ai-mic"
                  onClick={appendVoiceHint}
                  title={t.inlineAI.voiceHint}
                >
                  <Mic size={17} />
                </button>
                <span>{t.inlineAI.voiceHint}</span>
              </div>
            </div>

            <button
              type="button"
              className="inline-ai-generate"
              disabled={!commandText.trim()}
              onClick={submitCommand}
            >
              <span>&rarr;</span>
              {t.inlineAI.generate}
            </button>
          </div>
        </div>
      )}

      {status === 'thinking' && selection && (
        <div className="inline-ai-status" style={{ top: panelTop, left: panelLeft }}>
          {t.inlineAI.editing}
        </div>
      )}

      {status === 'error' && selection && (
        <div className="inline-ai-status error" style={{ top: panelTop, left: panelLeft }}>
          {t.inlineAI.failed}
        </div>
      )}

      {pendingDiff && (
        <div
          ref={diffRef}
          className="inline-ai-diff"
          style={{ top: diffTop, left: Math.max(0, pendingDiff.rect.left), width: 'min(560px, calc(100% - 24px))' }}
          onMouseDown={(event) => event.preventDefault()}
        >
          <div className="inline-ai-diff-body">
            <span className="inline-ai-diff-old">{pendingDiff.text}</span>
            <span className="inline-ai-diff-new">{pendingDiff.replacement}</span>
          </div>
          <div className="inline-ai-diff-actions">
            <button type="button" className="accept" onClick={acceptDiff}>{t.inlineAI.accept}</button>
            <button type="button" className="reject" onClick={rejectDiff}>{t.inlineAI.reject}</button>
          </div>
        </div>
      )}
    </>
  );
}
