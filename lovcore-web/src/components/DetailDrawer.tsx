'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, Play } from 'lucide-react';
import gsap from 'gsap';
import type { Item } from '../types';
import { DocumentA4Page } from './DocumentA4Page';
import { LovcoreEditor } from './editor/LovcoreEditor';
import { useTranslation } from '../i18n';
import { useFileUrl } from '../lib/fileStore';

interface DetailDrawerProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateItem: (updatedItem: Item) => void;
}

export const DetailDrawer: React.FC<DetailDrawerProps> = ({
  item,
  isOpen,
  onClose,
  onUpdateItem,
}) => {
  const { t, locale } = useTranslation();
  const resolvedThumbnail = useFileUrl(item?.thumbnail);
  const [newTag, setNewTag] = useState('');
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const latestChangeRef = useRef<{ text: string; json: any; html: string } | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const saveTimeoutRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  const overlayRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

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

  // GSAP animation handler for drawer and overlay
  useEffect(() => {
    const drawer = drawerRef.current;
    const overlay = overlayRef.current;
    if (!drawer || !overlay) return;

    if (isOpen) {
      gsap.killTweensOf([drawer, overlay]);

      // Fade-in and blur the overlay backdrop
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

      // Slide in the drawer with custom elastic damping
      gsap.fromTo(drawer,
        { xPercent: 100 },
        {
          xPercent: 0,
          duration: 0.6,
          ease: 'back.out(0.65)',
          overwrite: 'auto',
        }
      );

      // Cascade details inside standard or PDF drawer content
      const elementsToFade = drawer.querySelectorAll(
        '.drawer-left-media > *, .drawer-right-meta > *, .document-scroll-container > *'
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
      // Exit animations
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

  const showActionMessage = (message: string) => {
    setActionMessage(message);
    setTimeout(() => setActionMessage(null), 2500);
  };

  const flushSave = () => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (latestChangeRef.current && item) {
      const data = latestChangeRef.current;
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
    }, 800); // 800ms autosave debounce
  };

  // Flush saves when changing items or closing drawer
  useEffect(() => {
    return () => {
      flushSave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  useEffect(() => {
    if (!isOpen) {
      flushSave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!item) return null;

  if (item.type === 'pdf') {
    return (
      <>
        {/* Backdrop blur overlay */}
        <div 
          className={`drawer-overlay document-mode ${isOpen ? 'open' : ''}`} 
          ref={overlayRef}
          onClick={onClose}
        ></div>

        {/* Full-screen centered sheet modal */}
        <div 
          className={`detail-drawer document-mode ${isOpen ? 'open' : ''}`}
          ref={drawerRef}
          onClick={(e) => {
            if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('document-scroll-container')) {
              onClose();
            }
          }}
        >
          {/* Top header */}
          <div className="document-viewer-header" onClick={onClose}>
            <span className="esc-close-text">&darr; {t.drawer.escToClose}</span>
          </div>

          {/* Centered Scrollable Document Viewer */}
          <div className="document-scroll-container">
            <DocumentA4Page item={item} isCard={false} />
          </div>

          {/* Bottom Left Action */}
          <div className="document-viewer-actions-left">
            <button
              className="download-pdf-btn"
              onClick={() => alert(`Simulated action: Download ${item.title.split('.').pop()?.toUpperCase() || 'DOCUMENT'}`)}
            >
              {t.drawer.downloadPdf}
            </button>
          </div>
        </div>
      </>
    );
  }

  // Format date nicely
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Copy hex color to clipboard
  const handleCopyColor = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 1000);
  };

  // Add tag
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    const cleanTag = newTag.trim().toLowerCase().replace('#', '');
    if (!item.tags.includes(cleanTag)) {
      const updatedTags = [...item.tags, cleanTag];
      onUpdateItem({ ...item, tags: updatedTags });
    }
    setNewTag('');
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = item.tags.filter(t => t !== tagToRemove);
    onUpdateItem({ ...item, tags: updatedTags });
  };

  // Update Title
  const handleTitleChange = (e: React.FocusEvent<HTMLHeadingElement>) => {
    const newTitle = e.currentTarget.innerText || '';
    if (newTitle !== item.title) {
      onUpdateItem({ ...item, title: newTitle });
    }
  };

  // Export handlers
  const convertHTMLToMarkdown = (html: string): string => {
    if (!html) return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const traverse = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue || '';
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();

        let childrenText = '';
        el.childNodes.forEach((child) => {
          childrenText += traverse(child);
        });

        switch (tagName) {
          case 'h1':
            return `\n# ${childrenText.trim()}\n\n`;
          case 'h2':
            return `\n## ${childrenText.trim()}\n\n`;
          case 'h3':
            return `\n### ${childrenText.trim()}\n\n`;
          case 'p':
            return `${childrenText}\n\n`;
          case 'blockquote':
            return `\n> ${childrenText.trim().replace(/\n/g, '\n> ')}\n\n`;
          case 'pre':
            return `\n\`\`\`\n${childrenText.trim()}\n\`\`\`\n\n`;
          case 'code':
            return el.parentElement?.tagName.toLowerCase() === 'pre'
              ? childrenText
              : `\`${childrenText}\``;
          case 'ul':
            return `\n${childrenText}\n`;
          case 'ol':
            return `\n${childrenText}\n`;
          case 'li': {
            const parent = el.parentElement;
            if (parent?.tagName.toLowerCase() === 'ol') {
              const index = Array.from(parent.children).indexOf(el) + 1;
              return `${index}. ${childrenText.trim()}\n`;
            }
            return `* ${childrenText.trim()}\n`;
          }
          case 'hr':
            return `\n---\n\n`;
          case 'strong':
          case 'b':
            return `**${childrenText}**`;
          case 'em':
          case 'i':
            return `*${childrenText}*`;
          case 'a':
            return `[${childrenText}](${el.getAttribute('href') || ''})`;
          case 'img': {
            const alt = el.getAttribute('alt') || 'image';
            const src = el.getAttribute('src') || '';
            return `![${alt}](${src})`;
          }
          case 'table':
            return `\n${childrenText}\n`;
          case 'thead':
            return childrenText;
          case 'tbody':
            return childrenText;
          case 'tr': {
            const cells = Array.from(el.children);
            const isHeader = cells.every(c => c.tagName.toLowerCase() === 'th');
            const rowText = `| ${cells.map(c => traverse(c).trim()).join(' | ')} |\n`;
            if (isHeader) {
              const separator = `| ${cells.map(() => '---').join(' | ')} |\n`;
              return rowText + separator;
            }
            return rowText;
          }
          case 'td':
          case 'th':
            return childrenText;
          default:
            return childrenText;
        }
      }

      return '';
    };

    return traverse(doc.body).trim();
  };

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showActionMessage(t.drawer.fileDownloaded);
  };

  const handleCopyMarkdown = () => {
    const htmlContent = item.body?.html || `<p>${item.content}</p>`;
    const markdown = convertHTMLToMarkdown(htmlContent);
    navigator.clipboard.writeText(markdown);
    showActionMessage(t.drawer.copiedMarkdown);
  };

  const handleCopyText = () => {
    const textContent = item.body?.text || item.content;
    navigator.clipboard.writeText(textContent);
    showActionMessage(t.drawer.copiedPlainText);
  };

  const handleDownloadMarkdown = () => {
    const htmlContent = item.body?.html || `<p>${item.content}</p>`;
    const markdown = convertHTMLToMarkdown(htmlContent);
    const filename = `${item.title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'note'}.md`;
    triggerDownload(markdown, filename, 'text/markdown;charset=utf-8');
  };

  const handleDownloadText = () => {
    const textContent = item.body?.text || item.content;
    const filename = `${item.title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'note'}.txt`;
    triggerDownload(textContent, filename, 'text/plain;charset=utf-8');
  };

  const handleDownloadHTML = () => {
    const htmlContent = item.body?.html || `<p>${item.content}</p>`;
    const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${item.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      max-width: 740px;
      margin: 40px auto;
      padding: 0 20px;
      color: #1f2937;
    }
    h1 { font-size: 2.25rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
    h2 { font-size: 1.5rem; margin-top: 24px; }
    h3 { font-size: 1.25rem; }
    p { margin: 16px 0; }
    blockquote { border-left: 4px solid #e5e7eb; padding-left: 16px; color: #4b5563; font-style: italic; margin: 16px 0; }
    pre { background: #f3f4f6; padding: 16px; border-radius: 6px; overflow-x: auto; }
    code { font-family: monospace; font-size: 0.9em; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
    th { background: #f9fafb; }
    img { max-width: 100%; height: auto; border-radius: 6px; }
  </style>
</head>
<body>
  <h1>${item.title}</h1>
  <div>${htmlContent}</div>
</body>
</html>`;
    const filename = `${item.title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'note'}.html`;
    triggerDownload(fullHTML, filename, 'text/html;charset=utf-8');
  };

  const handleDownloadWord = () => {
    const htmlContent = item.body?.html || `<p>${item.content}</p>`;
    const wordContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <title>${item.title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.5; }
    h1 { font-size: 24pt; font-weight: bold; margin-bottom: 12pt; color: #111111; }
    h2 { font-size: 18pt; font-weight: bold; margin-top: 18pt; margin-bottom: 6pt; color: #222222; }
    h3 { font-size: 14pt; font-weight: bold; margin-top: 14pt; margin-bottom: 4pt; }
    p { margin-bottom: 10pt; font-size: 11pt; color: #333333; }
    blockquote { border-left: 3pt solid #cccccc; padding-left: 10pt; color: #555555; margin-left: 0; }
    table { border-collapse: collapse; width: 100%; margin: 12pt 0; }
    th, td { border: 1px solid #aaaaaa; padding: 6pt; font-size: 10.5pt; }
    th { background-color: #f2f2f2; font-weight: bold; }
  </style>
</head>
<body>
  <h1>${item.title}</h1>
  ${htmlContent}
</body>
</html>`;
    const filename = `${item.title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'note'}.doc`;
    triggerDownload(wordContent, filename, 'application/msword;charset=utf-8');
  };

  const handleExportPDF = () => {
    const htmlContent = item.body?.html || `<p>${item.content}</p>`;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      alert(t.drawer.couldNotGeneratePdf);
      return;
    }

    doc.open();
    doc.write(`<html>
<head>
  <title>${item.title}</title>
  <style>
    @media print {
      body {
        margin: 20mm;
        font-family: "Georgia", serif;
        font-size: 12pt;
        line-height: 1.6;
        color: #1a1a1a;
      }
      h1 {
        font-family: -apple-system, sans-serif;
        font-size: 26pt;
        font-weight: bold;
        margin-bottom: 24pt;
        border-bottom: 1px solid #e0e0e0;
        padding-bottom: 10px;
      }
      h2 { font-family: -apple-system, sans-serif; font-size: 18pt; margin-top: 20pt; margin-bottom: 10pt; }
      h3 { font-family: -apple-system, sans-serif; font-size: 14pt; margin-top: 16pt; margin-bottom: 8pt; }
      p { margin-bottom: 12pt; }
      blockquote {
        border-left: 3px solid #999;
        padding-left: 15px;
        color: #555;
        font-style: italic;
        margin: 15pt 0;
      }
      pre {
        background: #f5f5f5;
        padding: 12px;
        border-radius: 4px;
        font-size: 10pt;
        font-family: monospace;
        page-break-inside: avoid;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 20pt 0;
        page-break-inside: avoid;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 8px 12px;
        text-align: left;
      }
      th { background-color: #f9f9f9; font-weight: bold; }
      img { max-width: 100%; height: auto; border-radius: 4px; }
    }
  </style>
</head>
<body>
  <h1>${item.title}</h1>
  <div>${htmlContent}</div>
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() {
        window.parent.document.body.removeChild(window.frameElement);
      }, 500);
    };
  </script>
</body>
</html>`);
    doc.close();
    showActionMessage(t.drawer.pdfPrintOpened);
  };

  return (
    <>
      {/* Backdrop blur overlay */}
      <div 
        className={`drawer-overlay ${isOpen ? 'open' : ''}`} 
        ref={overlayRef}
        onClick={onClose}
      ></div>

      {/* Slide-over panel */}
      <div 
        className={`detail-drawer ${isOpen ? 'open' : ''}`}
        ref={drawerRef}
      >
        {/* Left pane: Immersive Visual / Media Viewer */}
        <div className="drawer-left-media">
          {item.type === 'image' && (
            <div className="media-container-full">
              <img src={resolvedThumbnail} alt={item.title} />
            </div>
          )}

          {item.type === 'link' && (
            <div className="link-detail-view">
              {resolvedThumbnail && (
                <img
                  src={resolvedThumbnail}
                  alt={item.title}
                  className="link-detail-image"
                />
              )}
              <h2 className="link-detail-title">{item.title}</h2>
              <p className="link-detail-domain">
                {item.sourceUrl ? new URL(item.sourceUrl).hostname : 'web'}
              </p>
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="filter-tag active"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', fontSize: '11px' }}
              >
                {t.drawer.openBookmark} <ExternalLink size={11} />
              </a>
            </div>
          )}

          {item.type === 'article' && (
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

          {item.type === 'note' && (
            <div
              className="note-reader editable"
              style={{ backgroundColor: item.noteBgColor || 'var(--bg-secondary)', cursor: 'text' }}
            >
              <div className="note-reader-content">
                <LovcoreEditor
                  key={item.id}
                  initialContent={item.body?.json || item.content}
                  onChange={handleEditorChange}
                  autoFocus={false}
                  placeholder={t.drawer.startTyping}
                />
              </div>
            </div>
          )}

          {item.type === 'video' && (
            <div className="video-full-container">
              <img src={resolvedThumbnail} alt={item.title} />
              <div className="video-full-overlay">
                <button
                  className="video-full-play-btn"
                  onClick={() => alert('Simulated action: Play media content')}
                >
                  <Play size={18} fill="currentColor" stroke="none" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right pane: Exhibition Catalog Sidebar */}
        <div className="drawer-right-meta">
          <button className="icon-btn drawer-close-btn" onClick={onClose} aria-label="Close details">
            <X size={16} strokeWidth={1.5} />
          </button>

          <div className="meta-section">
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

            <div className="meta-divider"></div>

            {/* AI Summary Section */}
            <div className="ai-summary-box">
              <span className="ai-section-title">{t.drawer.analystBrief}</span>
              <p className="ai-summary-text">&ldquo;{item.summary || t.drawer.aiFormulating}&rdquo;</p>
            </div>

            {/* Key Claims Section */}
            {item.keyClaims && item.keyClaims.length > 0 && (
              <>
                <div className="meta-divider"></div>
                <div className="analyst-claims-box">
                  <span className="ai-section-title">{t.drawer.coreThesis}</span>
                  <ul className="key-claims-list">
                    {item.keyClaims.map((claim, idx) => (
                      <li key={idx} className="key-claim-item">{claim}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Why It Matters Section */}
            {item.whyItMatters && (
              <>
                <div className="meta-divider"></div>
                <div className="why-it-matters-box">
                  <span className="ai-section-title">{t.drawer.ventureOutlook}</span>
                  <p className="why-it-matters-text">“{item.whyItMatters}”</p>
                </div>
              </>
            )}

            {/* Color Palette Section (Image cards only) */}
            {item.type === 'image' && item.colorPalette && item.colorPalette.length > 0 && (
              <>
                <div className="meta-divider"></div>
                <div className="color-palette-section">
                  <span className="ai-section-title">{t.drawer.colorDna}</span>
                  <div className="color-swatch-list">
                    {item.colorPalette.map((color) => {
                      const isCopied = copiedColor === color;
                      return (
                        <button
                          key={color}
                          className={`color-swatch ${isCopied ? 'copied' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => handleCopyColor(color)}
                          title={`Copy ${color}`}
                          aria-label={`Color swatch ${color}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="meta-divider"></div>

            {/* Export Section */}
            <div className="export-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="ai-section-title">{t.drawer.exportOptions}</span>
                {actionMessage && (
                  <span className="action-success-indicator">{actionMessage}</span>
                )}
              </div>
              <div className="export-buttons-grid">
                <button
                  type="button"
                  className="export-btn"
                  onClick={handleCopyMarkdown}
                >
                  {t.drawer.copyMarkdown}
                </button>
                <button
                  type="button"
                  className="export-btn"
                  onClick={handleCopyText}
                >
                  {t.drawer.copyPlainText}
                </button>
                <button
                  type="button"
                  className="export-btn"
                  onClick={handleDownloadMarkdown}
                >
                  {t.drawer.markdownFile}
                </button>
                <button
                  type="button"
                  className="export-btn"
                  onClick={handleDownloadText}
                >
                  {t.drawer.textFile}
                </button>
                <button
                  type="button"
                  className="export-btn"
                  onClick={handleDownloadHTML}
                >
                  {t.drawer.htmlFile}
                </button>
                <button
                  type="button"
                  className="export-btn"
                  onClick={handleDownloadWord}
                >
                  {t.drawer.wordFile}
                </button>
                <button
                  type="button"
                  className="export-btn"
                  onClick={handleExportPDF}
                >
                  {t.drawer.printPdf}
                </button>
              </div>
            </div>

            <div className="meta-divider"></div>

            {/* Tags Section */}
            <div className="detail-tags-section">
              <span className="ai-section-title">{t.drawer.associatedTags}</span>
              <div className="detail-tags-list">
                {item.tags.map((tag) => (
                  <span key={tag} className="detail-tag-pill">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} title="Remove tag">
                      <X size={10} strokeWidth={1.5} />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add Tag Form */}
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

            {/* Ingestion Info */}
            <div className="source-info-section">
              <span className="ai-section-title">{t.drawer.archiveCatalog}</span>
              <dl className="catalog-details">
                <div className="catalog-row">
                  <dt className="catalog-label">{t.drawer.acquired}</dt>
                  <dd className="catalog-value">{formatDate(item.createdAt)}</dd>
                </div>
                {item.sourceUrl && (
                  <div className="catalog-row">
                    <dt className="catalog-label">{t.drawer.source}</dt>
                    <dd className="catalog-value">
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                        {new URL(item.sourceUrl).hostname}
                      </a>
                    </dd>
                  </div>
                )}
                <div className="catalog-row">
                  <dt className="catalog-label">{t.drawer.format}</dt>
                  <dd className="catalog-value">{item.type}</dd>
                </div>
                {item.fileSize && (
                  <div className="catalog-row">
                    <dt className="catalog-label">{t.drawer.size}</dt>
                    <dd className="catalog-value">{item.fileSize}</dd>
                  </div>
                )}
                {item.pageCount && (
                  <div className="catalog-row">
                    <dt className="catalog-label">{t.drawer.pages}</dt>
                    <dd className="catalog-value">{item.pageCount}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
