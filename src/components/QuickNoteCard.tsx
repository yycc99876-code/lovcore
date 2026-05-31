import { Maximize2, Minimize2, X } from 'lucide-react';
import React, { useEffect, useRef, useState, Suspense, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { LovcoreDocumentBody } from '../types';
import { Skeleton } from './Skeleton';

const LazyLovcoreEditor = React.lazy(() => import('./editor/LovcoreEditor').then(m => ({ default: m.LovcoreEditor })));
import { useTranslation } from '../i18n';

interface QuickNoteCardProps {
  onSaveNote: (content: string, body?: LovcoreDocumentBody, noteBgColor?: string) => void;
}

const PAPER_COLORS = [
  { name: 'Warm linen', value: 'rgba(238, 233, 224, 0.78)' },
  { name: 'Lavender mist', value: 'rgba(226, 215, 244, 0.72)' },
  { name: 'Blush paper', value: 'rgba(246, 213, 217, 0.7)' },
  { name: 'Blue wash', value: 'rgba(215, 228, 244, 0.72)' },
  { name: 'Sage veil', value: 'rgba(219, 232, 218, 0.74)' },
  { name: 'Apricot note', value: 'rgba(248, 220, 195, 0.72)' },
  { name: 'Grey cotton', value: 'rgba(226, 228, 226, 0.76)' },
  { name: 'Mint quiet', value: 'rgba(211, 236, 228, 0.72)' },
];

export const QuickNoteCard = ({ onSaveNote }: QuickNoteCardProps) => {
  const { t } = useTranslation();
  const isChineseUi = t.header.theStack !== 'The Stack';
  const compactPlaceholder = isChineseUi ? '在此开始书写...' : 'Start writing...';
  const shortcutHint = isChineseUi
    ? '/ 命令 · Insert 语音 · Ctrl+Insert 免提'
    : '/ commands · Insert voice · Ctrl+Insert hands-free';
  const shortcutHintTitle = isChineseUi
    ? '/ 唤出快捷命令，Insert 唤起语音输入，Ctrl + Insert 切换免提模式'
    : '/ opens shortcuts. Insert starts voice input. Ctrl+Insert toggles hands-free mode.';
  const [contentPreview, setContentPreview] = useState('');
  const [editorBody, setEditorBody] = useState<LovcoreDocumentBody | null>(null);
  const [paperColor, setPaperColor] = useState(PAPER_COLORS[0].value);
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panelOrigin, setPanelOrigin] = useState({ left: 96, top: 220 });
  const cardRef = useRef<HTMLDivElement>(null);
  const latestEditorDataRef = useRef<{ text: string; json: any; html: string } | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setIsFullscreen(false);
    }, 220); // 220ms animation delay
  };

  const handleSave = (data?: { text: string; json: any; html: string }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const textToSave = data ? data.text : contentPreview;
    const trimmed = textToSave.trim();
    if (!trimmed) return;

    const bodyToSave: LovcoreDocumentBody = data
      ? { kind: 'tiptap', json: data.json, text: data.text, html: data.html }
      : (editorBody || { kind: 'tiptap', json: {}, text: trimmed, html: trimmed });

    onSaveNote(trimmed, bodyToSave, paperColor);
    setContentPreview('');
    setEditorBody(null);
    latestEditorDataRef.current = null;
    setPaperColor(PAPER_COLORS[0].value);
    handleClose();
  };

  useEffect(() => {
    if (!isOpen || isClosing) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && (event.key === 'Enter' || event.code === 'Enter')) {
        event.preventDefault();
        event.stopPropagation();
        handleSave(latestEditorDataRef.current ?? undefined);
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
    latestEditorDataRef.current = data;
    setContentPreview(data.text);
    setEditorBody({
      kind: 'tiptap',
      json: data.json,
      text: data.text,
      html: data.html,
    });
  };

  const panelStyle = {
    '--quick-note-panel-left': `${panelOrigin.left}px`,
    '--quick-note-panel-top': `${panelOrigin.top}px`,
    '--quick-note-paper': paperColor,
  } as CSSProperties;

  const quickNoteEditor = (isOpen || isClosing)
    ? createPortal(
        <div
          className={`quick-note-overlay ${isClosing ? 'is-closing' : ''}`}
          onMouseDown={handleClose}
        >
          <section
            className={`quick-note-editor-panel ${isFullscreen ? 'is-fullscreen' : ''} ${isClosing ? 'is-closing' : ''}`}
            style={panelStyle}
            aria-modal="true"
            role="dialog"
            aria-label={t.quickNote.newNote}
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

            <Suspense fallback={<Skeleton variant="editor" />}>
              <LazyLovcoreEditor
                initialContent={contentPreview}
                onChange={handleEditorChange}
                onSave={handleSave}
                placeholder={isFullscreen ? undefined : compactPlaceholder}
                voiceDisplay={isFullscreen ? 'immersive' : 'compact'}
              />
            </Suspense>

            {!isFullscreen && (
              <div
                className="quick-note-shortcut-hint"
                title={shortcutHintTitle}
              >
                {shortcutHint}
              </div>
            )}

            <div className="quick-note-paper-row" aria-label="Paper color">
              <span className="quick-note-paper-label">Paper</span>
              {PAPER_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`quick-note-paper-swatch ${paperColor === color.value ? 'is-selected' : ''}`}
                  style={{ '--paper-color': color.value } as CSSProperties}
                  onClick={() => setPaperColor(color.value)}
                  aria-label={color.name}
                  title={color.name}
                />
              ))}
            </div>

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
          <span>{t.quickNote.newNote}</span>
          <button
            type="button"
            className="quick-note-inline-expand"
            onClick={openEditor}
            aria-label={t.quickNote.expand}
            title={t.quickNote.expand}
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
