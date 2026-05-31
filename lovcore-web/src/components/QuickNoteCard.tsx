'use client';

import { Maximize2, Minimize2, X } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { LovcoreEditor } from './editor/LovcoreEditor';
import type { LovcoreDocumentBody } from '../types';
import { useTranslation } from '../i18n';

interface QuickNoteCardProps {
  onSaveNote: (content: string, body?: LovcoreDocumentBody) => void;
}

export const QuickNoteCard = ({ onSaveNote }: QuickNoteCardProps) => {
  const { t } = useTranslation();
  const [contentPreview, setContentPreview] = useState('');
  const [editorBody, setEditorBody] = useState<LovcoreDocumentBody | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panelOrigin, setPanelOrigin] = useState({ left: 96, top: 220 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setIsFullscreen(false);
    }, 220); // 220ms animation delay
  };

  useEffect(() => {
    if (!isOpen || isClosing) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isClosing]);

  const openEditor = () => {
    const rect = cardRef.current?.getBoundingClientRect();

    if (rect) {
      setPanelOrigin({
        left: Math.max(18, Math.min(rect.left, window.innerWidth - 530)),
        top: Math.max(18, Math.min(rect.top, window.innerHeight - 558)),
      });
    }

    setIsOpen(true);
    setIsClosing(false);
  };

  const handleEditorChange = (data: { text: string; json: any; html: string }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    setContentPreview(data.text);
    setEditorBody({
      kind: 'tiptap',
      json: data.json,
      text: data.text,
      html: data.html,
    });
  };

  const handleSave = (data?: { text: string; json: any; html: string }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const textToSave = data ? data.text : contentPreview;
    const trimmed = textToSave.trim();
    if (!trimmed) return;

    const bodyToSave: LovcoreDocumentBody = data
      ? { kind: 'tiptap', json: data.json, text: data.text, html: data.html }
      : (editorBody || { kind: 'tiptap', json: {}, text: trimmed, html: trimmed });

    onSaveNote(trimmed, bodyToSave);
    setContentPreview('');
    setEditorBody(null);
    handleClose();
  };

  const panelStyle = {
    '--quick-note-panel-left': `${panelOrigin.left}px`,
    '--quick-note-panel-top': `${panelOrigin.top}px`,
  } as CSSProperties;

  const quickNoteEditor = (isOpen || isClosing)
    ? createPortal(
        <div
          className={`quick-note-overlay ${isClosing ? 'is-closing' : ''}`}
          onMouseDown={handleClose}
        >
          <section
            className={`quick-note-editor-panel ${isFullscreen ? 'is-fullscreen' : ''} ${isClosing ? 'is-closing' : ''}`}
            style={isFullscreen ? undefined : panelStyle}
            aria-modal="true"
            role="dialog"
            aria-label="New quick note"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="quick-note-editor-topline">
              <span>{t.quickNote.newNote}</span>
              <div className="quick-note-editor-controls">
                <button
                  type="button"
                  className="quick-note-icon-button"
                  onClick={() => setIsFullscreen((current) => !current)}
                  aria-label={isFullscreen ? t.quickNote.collapse : t.quickNote.expand}
                  title={isFullscreen ? t.quickNote.collapse : t.quickNote.expand}
                >
                  {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>
                <button
                  type="button"
                  className="quick-note-icon-button"
                  onClick={handleClose}
                  aria-label={t.quickNote.close}
                  title={t.quickNote.close}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <LovcoreEditor
              initialContent={contentPreview}
              onChange={handleEditorChange}
              onSave={handleSave}
            />

            <button
              type="button"
              className="quick-note-save"
              onClick={() => handleSave()}
              disabled={!contentPreview.trim()}
            >
              {t.quickNote.save}
            </button>
          </section>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="masonry-item quick-note-item">
      <div ref={cardRef} className="quick-note-card">
        <div className="quick-note-topline">
          <span>New Quick Note</span>
          <button
            type="button"
            className="quick-note-inline-expand"
            onClick={openEditor}
            aria-label="Open quick note"
            title="Open"
          >
            <Maximize2 size={13} />
          </button>
        </div>
        <button
          type="button"
          className="quick-note-inline-input"
          onClick={openEditor}
        >
          {contentPreview.trim() || t.quickNote.startTyping}
        </button>
      </div>

      {quickNoteEditor}
    </div>
  );
};
