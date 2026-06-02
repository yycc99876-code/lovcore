import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Play, Trash2, MoreHorizontal, ChevronRight, Check, File, Headphones, Download } from 'lucide-react';
import gsap from 'gsap';
import type { Item, LovcoreSpace } from '../types';
import { useTranslation, useTranslatedSpace } from '../i18n';
import { aiClient } from '../ai/client';
import { Skeleton } from './Skeleton';

const LazyDocumentA4Page = React.lazy(() => import('./DocumentA4Page').then(m => ({ default: m.DocumentA4Page })));
const LazyLovcoreEditor = React.lazy(() => import('./editor/LovcoreEditor').then(m => ({ default: m.LovcoreEditor })));
import { useFileUrl, loadFile, fileRefKey, isFileRef } from '../lib/fileStore';
import { isPlainDocumentItem } from '../lib/itemTypeGuards';
import { isVisibleFolio } from '../lib/spaceVisibility';
import { useFocusTrap } from '../hooks/useFocusTrap';

function toggleFolioAssignment(item: Item, folioId: string): string[] {
  const current = item.assignedSpaceIds ?? [];
  return current.includes(folioId)
    ? current.filter((id) => id !== folioId)
    : [...current, folioId];
}

function FolioPickerRow({ space, isAssigned, onToggle }: { space: LovcoreSpace; isAssigned: boolean; onToggle: () => void }) {
  const { name } = useTranslatedSpace(space);
  return (
    <button className={`drawer-folio-picker-row ${isAssigned ? 'assigned' : ''}`} onClick={onToggle} type="button">
      <span className="drawer-folio-picker-dot" style={{ background: space.color || 'var(--accent)' }} />
      <span className="drawer-folio-picker-name">{name}</span>
      {isAssigned && <Check size={14} strokeWidth={2} className="drawer-folio-picker-check" />}
    </button>
  );
}

interface DetailDrawerProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateItem: (updatedItem: Item) => void;
  onDeleteItem?: (id: string) => void;
  spaces?: LovcoreSpace[];
}

export const DetailDrawer: React.FC<DetailDrawerProps> = ({
  item,
  isOpen,
  onClose,
  onUpdateItem,
  onDeleteItem,
  spaces = [],
}) => {
  const { t, locale } = useTranslation();
  const resolvedThumbnail = useFileUrl(item?.thumbnail, item?.thumbnailStoragePath);
  const resolvedVideoUrl = useFileUrl(item?.originalFileRef, item?.originalStoragePath);
  const resolvedFileUrl = useFileUrl(item?.originalFileRef, item?.originalStoragePath);
  const userFolios = spaces.filter(isVisibleFolio);
  const [newTag, setNewTag] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFoliosMenu, setShowFoliosMenu] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Download handler: triggers browser download with original filename
  const handleDownload = useCallback(async () => {
    if (!item) return;

    const downloadName = item.originalFileName
      || (item.fileExtension ? `${item.title}.${item.fileExtension}` : item.title);

    // If we have a resolved URL (blob URL or signed URL), use it directly
    if (resolvedFileUrl) {
      const a = document.createElement('a');
      a.href = resolvedFileUrl;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // Fallback: try to load from IndexedDB
    if (item.originalFileRef && isFileRef(item.originalFileRef)) {
      const blob = await loadFile(fileRefKey(item.originalFileRef));
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    }
  }, [item, resolvedFileUrl]);

  // Transcribe audio handler
  const handleTranscribe = useCallback(async () => {
    if (!item || item.type !== 'audio') return;

    setIsTranscribing(true);
    try {
      // Load audio blob
      let blob: Blob | null = null;

      if (item.originalFileRef && isFileRef(item.originalFileRef)) {
        blob = await loadFile(fileRefKey(item.originalFileRef));
      }

      if (!blob && resolvedFileUrl) {
        // Try fetching from the URL
        try {
          const response = await fetch(resolvedFileUrl);
          blob = await response.blob();
        } catch { /* ignore */ }
      }

      if (!blob) {
        setIsTranscribing(false);
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1] || '');
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob!);
      });

      // Call transcription API
      const result = await aiClient.transcribe({ audioBase64: base64 });

      if (result.text) {
        onUpdateItem({
          ...item,
          content: result.text,
          summary: result.text.slice(0, 200),
        });
      }
    } catch (err) {
      console.error('[DetailDrawer] Transcription failed:', err);
    } finally {
      setIsTranscribing(false);
    }
  }, [item, resolvedFileUrl, onUpdateItem]);

  const latestChangeRef = useRef<{ text: string; json: any; html: string } | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const saveTimeoutRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  const overlayRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  const folioModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(deleteModalRef, showDeleteConfirm);
  useFocusTrap(folioModalRef, showFoliosMenu);

  // Close drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset video playback state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setIsVideoPlaying(false); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [isOpen]);

  // GSAP animation handler
  useEffect(() => {
    const drawer = drawerRef.current;
    const overlay = overlayRef.current;
    if (!drawer || !overlay) return;

    if (isOpen) {
      gsap.killTweensOf([drawer, overlay]);

      gsap.fromTo(overlay,
        { opacity: 0, backdropFilter: 'blur(0px)', webkitBackdropFilter: 'blur(0px)' },
        {
          opacity: 1,
          backdropFilter: 'blur(16px)',
          webkitBackdropFilter: 'blur(16px)',
          duration: 0.45,
          ease: 'power2.out',
        }
      );

      gsap.fromTo(drawer,
        { xPercent: 100 },
        {
          xPercent: 0,
          duration: 0.6,
          ease: 'back.out(0.65)',
          overwrite: 'auto',
        }
      );

      const elementsToFade = drawer.querySelectorAll(
        '.drawer-left-media > *, .drawer-right-meta > *'
      );
      if (elementsToFade.length > 0) {
        gsap.fromTo(elementsToFade,
          { opacity: 0, x: 20 },
          {
            opacity: 1,
            x: 0,
            duration: 0.4,
            stagger: 0.03,
            ease: 'power2.out',
            delay: 0.18,
          }
        );
      }
    } else {
      gsap.killTweensOf([drawer, overlay]);

      gsap.to(overlay, {
        opacity: 0,
        backdropFilter: 'blur(0px)',
        webkitBackdropFilter: 'blur(0px)',
        duration: 0.35,
        ease: 'power2.in',
      });

      gsap.to(drawer, {
        xPercent: 100,
        duration: 0.4,
        ease: 'power2.in',
        overwrite: 'auto',
      });
    }
  }, [isOpen, item?.id, item?.type]);

  const flushSave = () => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (item) {
      const updates: Partial<Item> = {};
      if (latestChangeRef.current) {
        const data = latestChangeRef.current;
        updates.content = data.text;
        updates.body = { kind: 'tiptap', json: data.json, text: data.text, html: data.html };
        latestChangeRef.current = null;
      }
      if (Object.keys(updates).length > 0) {
        onUpdateItem({ ...item, ...updates });
      }
    }
  };

  const handleEditorChange = (data: { text: string; json: any; html: string }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    latestChangeRef.current = data;
    setSaveStatus('saving');

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      if (item) {
        onUpdateItem({
          ...item,
          content: data.text,
          body: {
            kind: 'tiptap',
            json: data.json,
            text: data.text,
            html: data.html,
          },
        });
        latestChangeRef.current = null;
        setSaveStatus('saved');
        saveTimeoutRef.current = window.setTimeout(() => {
          setSaveStatus('idle');
        }, 1500);
      }
    }, 800);
  };

  // Flush saves when changing items or closing drawer
  useEffect(() => {
    return () => { flushSave(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  useEffect(() => {
    if (!isOpen) { flushSave(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!item) return null;

  // Format date nicely
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Tag management
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    const cleanTag = newTag.trim().toLowerCase().replace('#', '');
    if (!item.tags.includes(cleanTag)) {
      onUpdateItem({ ...item, tags: [...item.tags, cleanTag] });
    }
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateItem({ ...item, tags: item.tags.filter(t => t !== tagToRemove) });
  };

  // Title update
  const handleTitleChange = (e: React.FocusEvent<HTMLHeadingElement>) => {
    const newTitle = e.currentTarget.innerText || '';
    if (newTitle !== item.title) {
      onUpdateItem({ ...item, title: newTitle });
    }
  };

  // Delete with confirmation
  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    onClose();
    onDeleteItem?.(item.id);
  };

  // Determine if this is a document type (pdf, docx, txt, md).
  // Keep this centralized so uploaded PDFs never fall through to article/text renderers.
  const isDocument = isPlainDocumentItem(item);
  const sourceLabel = item.sourceUrl ? new URL(item.sourceUrl).hostname.replace(/^www\./, '') : t.drawer.localFile;
  const linkHasPreview = Boolean(
    resolvedThumbnail
    && !resolvedThumbnail.includes('/images/token_refraction.png')
  );
  const isImportedReference = item.content?.startsWith('Imported link reference:');
  const linkExcerpt = item.summary || (!isImportedReference ? item.content : '') || '';
  const keyPoints = (item.keyClaims && item.keyClaims.length > 0
    ? item.keyClaims
    : item.summary
      .split(/[.!?。！？]\s*/)
      .map((point) => point.trim())
      .filter(Boolean)
  ).slice(0, 4);

  const drawerContent = (
    <>
      {/* Backdrop blur overlay */}
      <div
        className={`drawer-overlay ${isOpen ? 'open' : ''}`}
        ref={overlayRef}
        onClick={onClose}
      ></div>

      {/* Slide-over panel — unified for all content types */}
      <div
        className={`detail-drawer ${isOpen ? 'open' : ''}`}
        ref={drawerRef}
      >
        {/* Left pane: Content Preview */}
        <div className={`drawer-left-media ${isDocument ? 'drawer-left-document' : ''}`}>
          {/* PDF / Document reader */}
          {isDocument && (
            <div className="document-scroll-container">
              <Suspense fallback={<Skeleton variant="document" />}><LazyDocumentA4Page key={item.id} item={item} isCard={false} /></Suspense>
            </div>
          )}

          {/* Image */}
          {item.type === 'image' && !isDocument && (
            <div className="media-container-full">
              {resolvedThumbnail ? (
                <img src={resolvedThumbnail} alt={item.title} />
              ) : (
                <div className="image-fallback-container">
                  <span className="image-fallback-title">{item.title}</span>
                </div>
              )}
            </div>
          )}

          {/* Link */}
          {item.type === 'link' && !isDocument && (
            <div className={`link-detail-view ${linkHasPreview ? '' : 'no-image'}`}>
              {linkHasPreview && (
                <img src={resolvedThumbnail} alt={item.title} className="link-detail-image" />
              )}
              <span className="link-detail-kicker">{sourceLabel}</span>
              <h2 className="link-detail-title">{item.title}</h2>
              {linkExcerpt && (
                <p className="link-detail-excerpt">
                  {linkExcerpt.length > 260 ? `${linkExcerpt.slice(0, 260)}...` : linkExcerpt}
                </p>
              )}
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="link-detail-open-btn"
              >
                {t.drawer.openBookmark} <ExternalLink size={11} />
              </a>
            </div>
          )}

          {/* Article */}
          {item.type === 'article' && !isDocument && (
            <div className="article-reader">
              <div className="article-reader-container">
                <span className="article-reader-tag">{t.drawer.articleMode}</span>
                <h1 className="article-reader-title">{item.title}</h1>
                <div className="meta-divider" style={{ marginBottom: '32px' }}></div>
                <div className="article-reader-content">
                  {item.content}
                </div>
              </div>
            </div>
          )}

          {/* Note (editable) */}
          {item.type === 'note' && !isDocument && (
            <div
              className="note-reader editable"
              style={{ backgroundColor: item.noteBgColor || 'var(--bg-secondary)', cursor: 'text' }}
            >
              <div className="note-reader-content">
                <Suspense fallback={<Skeleton variant="editor" />}>
                  <LazyLovcoreEditor
                    key={item.id}
                    initialContent={item.body?.json || item.content}
                    onChange={handleEditorChange}
                    autoFocus={false}
                    placeholder={t.drawer.startTyping}
                  />
                </Suspense>
              </div>
            </div>
          )}

          {/* Video */}
          {item.type === 'video' && !isDocument && (
            <div className="video-full-container">
              {isVideoPlaying && resolvedVideoUrl ? (
                <video
                  src={resolvedVideoUrl}
                  controls
                  autoPlay
                  style={{ width: '100%', borderRadius: '8px' }}
                  onEnded={() => setIsVideoPlaying(false)}
                />
              ) : (
                <>
                  {resolvedThumbnail ? (
                    <img src={resolvedThumbnail} alt={item.title} />
                  ) : (
                    <div className="video-fallback-container">
                      <Play size={20} strokeWidth={1.5} />
                    </div>
                  )}
                  <div className="video-full-overlay">
                    <button
                      className="video-full-play-btn"
                      onClick={() => setIsVideoPlaying(true)}
                    >
                      <Play size={18} fill="currentColor" stroke="none" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Audio */}
          {item.type === 'audio' && !isDocument && (
            <div className="file-detail-container">
              <div className="file-detail-icon-area">
                <div className="file-detail-icon">
                  <Headphones size={48} strokeWidth={1} />
                </div>
                <span className="file-detail-ext">{item.fileExtension || 'audio'}</span>
              </div>
              {resolvedFileUrl && (
                <audio
                  src={resolvedFileUrl}
                  controls
                  style={{ width: '100%', marginTop: '24px' }}
                />
              )}
              <div className="file-detail-info">
                <div className="file-detail-row">
                  <span className="file-detail-label">{t.drawer.format}</span>
                  <span className="file-detail-value">{item.mimeType || item.fileExtension || 'audio'}</span>
                </div>
                {item.fileSize && (
                  <div className="file-detail-row">
                    <span className="file-detail-label">{t.drawer.size}</span>
                    <span className="file-detail-value">{item.fileSize}</span>
                  </div>
                )}
                {item.duration && (
                  <div className="file-detail-row">
                    <span className="file-detail-label">Duration</span>
                    <span className="file-detail-value">{item.duration}</span>
                  </div>
                )}
              </div>
              <button className="file-detail-download-btn" onClick={handleDownload}>
                <Download size={14} />
                {t.drawer.downloadFile}
              </button>
              <button
                className="file-detail-download-btn"
                onClick={handleTranscribe}
                disabled={isTranscribing}
                style={{ opacity: isTranscribing ? 0.6 : 1 }}
              >
                <Headphones size={14} />
                {isTranscribing ? t.drawer.transcribing : t.drawer.transcribe}
              </button>
            </div>
          )}

          {/* Generic File */}
          {item.type === 'file' && !isDocument && (
            <div className="file-detail-container">
              <div className="file-detail-icon-area">
                <div className="file-detail-icon">
                  <File size={48} strokeWidth={1} />
                </div>
                <span className="file-detail-ext">{item.fileExtension || 'file'}</span>
              </div>
              <div className="file-detail-info">
                <div className="file-detail-row">
                  <span className="file-detail-label">{t.drawer.format}</span>
                  <span className="file-detail-value">{item.mimeType || item.fileExtension || 'file'}</span>
                </div>
                {item.fileSize && (
                  <div className="file-detail-row">
                    <span className="file-detail-label">{t.drawer.size}</span>
                    <span className="file-detail-value">{item.fileSize}</span>
                  </div>
                )}
                {item.originalFileName && item.originalFileName !== item.title && (
                  <div className="file-detail-row">
                    <span className="file-detail-label">{t.drawer.source}</span>
                    <span className="file-detail-value">{item.originalFileName}</span>
                  </div>
                )}
              </div>
              {item.fileSyncStatus === 'failed' && (
                <div className="file-sync-warning" style={{ margin: '12px 0' }}>
                  {item.fileSyncError || '原文件同步失败，请重新上传'}
                </div>
              )}
              <button className="file-detail-download-btn" onClick={handleDownload}>
                <Download size={14} />
                {t.drawer.downloadFile}
              </button>
            </div>
          )}
        </div>

        {/* Right pane: DetailMemoryPanel */}
        <div className="drawer-right-meta">
          <div className="drawer-top-actions">
            <button className="icon-btn drawer-more-btn" aria-label="More actions">
              <MoreHorizontal size={18} strokeWidth={1.6} />
            </button>
            <button className="icon-btn drawer-close-btn" onClick={onClose} aria-label="Close details">
              <X size={18} strokeWidth={1.6} />
            </button>
          </div>

          <div className="meta-section">
            {/* Type badge + save status */}
            <div className="meta-header-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="meta-type-badge">{item.type}</span>
                {saveStatus !== 'idle' && (
                  <span className={`save-status-indicator ${saveStatus}`}>
                    {saveStatus === 'saving' ? t.drawer.saving : t.drawer.saved}
                  </span>
                )}
              </div>
              {/* Editable title */}
              <h2
                className="meta-title-text"
                contentEditable
                suppressContentEditableWarning
                onBlur={handleTitleChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                title={t.drawer.editTitle}
              >
                {item.title}
              </h2>
            </div>

            {/* Saved time / source */}
            <div className="meta-saved-info">
              <span className="meta-saved-time">{t.drawer.savedPrefix}{formatDate(item.createdAt)}</span>
              {item.sourceUrl && (
                <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="meta-source-link">
                  {sourceLabel}
                </a>
              )}
              {!item.sourceUrl && <span>{sourceLabel}</span>}
            </div>

            <div className="meta-divider"></div>

            {/* TLDR / Summary */}
            <div className="ai-summary-box">
              <span className="ai-section-title">{t.drawer.summary}</span>
              <p className="ai-summary-text">{item.summary || t.drawer.aiFormulating}</p>
            </div>

            {keyPoints.length > 0 && (
              <>
                <div className="meta-divider"></div>
                <div className="drawer-key-points">
                  <span className="ai-section-title">{t.drawer.keyPoints}</span>
                  <ul>
                    {keyPoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Memory Tags */}
            <div className="meta-divider"></div>
            <div className="detail-tags-section">
              <div className="drawer-section-row">
                <span className="ai-section-title">{t.drawer.tags}</span>
                <button className="drawer-inline-link" type="button">{t.drawer.addTag}</button>
              </div>
              <div className="detail-tags-list">
                {item.tags.map((tag) => (
                  <span key={tag} className="detail-tag-pill">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} title={t.drawer.removeTag}>
                      <X size={10} strokeWidth={1.5} />
                    </button>
                  </span>
                ))}
              </div>
              <form onSubmit={handleAddTag} className="add-tag-form">
                <input
                  type="text"
                  placeholder={t.drawer.tagPlaceholder}
                  className="add-tag-input"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                />
              </form>
            </div>

            <div className="meta-divider"></div>
            <div className="drawer-folios-section">
              <span className="ai-section-title">{t.drawer.folios}</span>
              <button
                className="drawer-folio-row"
                onClick={() => setShowFoliosMenu(!showFoliosMenu)}
                type="button"
              >
                <span>{t.drawer.addToFolios}</span>
                <ChevronRight size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Bottom actions */}
          <div className="drawer-bottom-actions">
            {(item.type === 'image' || item.type === 'pdf' || item.type === 'video' || item.type === 'audio' || item.type === 'file') && (
              <button
                className="drawer-action-btn"
                onClick={handleDownload}
                title={t.drawer.downloadFile}
              >
                <Download size={13} />
                {t.drawer.downloadFile}
              </button>
            )}
            <button
              className="drawer-action-btn delete-btn"
              onClick={handleDelete}
              title={t.drawer.deleteThisItem}
            >
              <Trash2 size={13} />
              {t.drawer.delete}
            </button>
            <button className="drawer-action-btn done-btn" onClick={onClose}>
              {t.drawer.done}
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div ref={deleteModalRef} className="delete-confirm-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <p>{t.drawer.deleteConfirm(item.title)}</p>
            <div className="delete-confirm-actions">
              <button className="drawer-action-btn" onClick={() => setShowDeleteConfirm(false)}>{t.drawer.cancel}</button>
              <button className="drawer-action-btn delete-btn" onClick={confirmDelete}>{t.drawer.delete}</button>
            </div>
          </div>
        </div>
      )}

      {/* Folios picker */}
      {showFoliosMenu && (
        <div className="delete-confirm-overlay" onClick={() => setShowFoliosMenu(false)}>
          <div ref={folioModalRef} className="drawer-folio-picker" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-folio-picker-header">
              <span>Add to Folio</span>
              <button className="icon-btn" onClick={() => setShowFoliosMenu(false)} aria-label="Close">
                <X size={14} strokeWidth={1.6} />
              </button>
            </div>
            <div className="drawer-folio-picker-list">
              {userFolios.length === 0 ? (
                <p className="drawer-folio-picker-empty">Create a folio first.</p>
              ) : (
                userFolios.map((space) => (
                  <FolioPickerRow
                    key={space.id}
                    space={space}
                    isAssigned={item.assignedSpaceIds?.includes(space.id) ?? false}
                    onToggle={() => {
                      const nextIds = toggleFolioAssignment(item, space.id);
                      onUpdateItem({ ...item, assignedSpaceIds: nextIds });
                    }}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  return createPortal(drawerContent, document.body);
};
