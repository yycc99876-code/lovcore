import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Trash2, Play, Image, File, Headphones } from 'lucide-react';
import gsap from 'gsap';
import type { Item } from '../types';
import { useTranslation } from '../i18n';
import { Skeleton } from './Skeleton';

const LazyDocumentA4Page = React.lazy(() => import('./DocumentA4Page').then(m => ({ default: m.DocumentA4Page })));
import { useFileUrl, isFileRef } from '../lib/fileStore';

interface ContentCardProps {
  item: Item;
  onSelect: (item: Item) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export const ContentCard: React.FC<ContentCardProps> = ({ item, onSelect, onDelete }) => {
  const { t } = useTranslation();
  const analyzingSteps = t.card.analyzingSteps;
  const [analyzingStep, setAnalyzingStep] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);
  const [linkImgFailed, setLinkImgFailed] = useState(false);
  const [videoImgFailed, setVideoImgFailed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const resolvedThumbnail = useFileUrl(item.thumbnail, item.thumbnailStoragePath);
  const isPresentation = ['ppt', 'pptx', 'odp'].includes(item.fileExtension?.toLowerCase() || '')
    || item.mimeType?.includes('powerpoint')
    || item.mimeType?.includes('presentation');

  // Cycle through analyzing status steps to make the loading state feel "alive" and gentle
  useEffect(() => {
    if (item.status !== 'analyzing') return;

    const interval = setInterval(() => {
      setAnalyzingStep((prev) => (prev + 1) % analyzingSteps.length);
    }, 800);

    return () => clearInterval(interval);
  }, [analyzingSteps.length, item.status]);

  const handleMouseEnter = () => {
    const card = cardRef.current;
    if (!card) return;
    card.classList.add('is-tilting');

    const btn = card.querySelector('.card-action-btn');
    if (btn) {
      gsap.fromTo(btn, { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(1.8)', overwrite: 'auto' });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;

    const xPx = e.clientX - rect.left;
    const yPx = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${xPx}px`);
    card.style.setProperty('--mouse-y', `${yPx}px`);

    const targetForShadow = item.type === 'pdf' 
      ? card.querySelector('.document-page-preview') 
      : card;

    const isDark = document.documentElement.classList.contains('dark');
    const shadowColor = isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.08)';

    gsap.to(card, {
      rotateY: xPct * 8, // limit max angle to 8 degrees
      rotateX: -yPct * 8,
      y: -8,
      duration: 0.35,
      ease: 'power2.out',
      overwrite: 'auto'
    });

    if (targetForShadow) {
      gsap.to(targetForShadow, {
        boxShadow: `0 16px 36px ${shadowColor}`,
        duration: 0.35,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }

    // Parallax effect on thumbnail image if present
    const img = card.querySelector('.image-card-container img, .link-card-preview img, .video-card-preview img');
    if (img) {
      gsap.to(img, {
        x: -xPct * 10,
        y: -yPct * 10,
        duration: 0.35,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;

    const targetForShadow = item.type === 'pdf' 
      ? card.querySelector('.document-page-preview') 
      : card;

    const btn = card.querySelector('.card-action-btn');
    if (btn) {
      gsap.to(btn, { scale: 0, duration: 0.2, ease: 'power2.in', overwrite: 'auto' });
    }

    gsap.to(card, {
      rotateY: 0,
      rotateX: 0,
      y: 0,
      duration: 0.5,
      ease: 'power3.out',
      overwrite: 'auto',
      onComplete: () => {
        card.classList.remove('is-tilting');
      }
    });

    if (targetForShadow) {
      gsap.to(targetForShadow, {
        clearProps: 'box-shadow',
        duration: 0.5,
        ease: 'power3.out',
        overwrite: 'auto'
      });
    }

    const img = card.querySelector('.image-card-container img, .link-card-preview img, .video-card-preview img');
    if (img) {
      gsap.to(img, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'power3.out',
        overwrite: 'auto'
      });
    }
  };

  if (item.status === 'analyzing') {
    return (
      <div className="masonry-item">
        <div className="lov-card analyzing">
          <div className="analyzing-container">
            <div className="analyzing-indicator">
              <div className="shimmer-dot"></div>
              <span>{analyzingSteps[analyzingStep]}</span>
            </div>
            <div className="analyzing-title">
              {item.title || t.card.archivingNew}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Helper to format dates
  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const sourceHost = (() => {
    if (!item.sourceUrl) return 'link';
    try {
      return new URL(item.sourceUrl).hostname.replace('www.', '');
    } catch {
      return 'link';
    }
  })();
  const linkHasPreview = Boolean(
    resolvedThumbnail
    && !linkImgFailed
    && !resolvedThumbnail.includes('/images/token_refraction.png')
  );
  const isImportedReference = item.content?.startsWith('Imported link reference:');
  const linkExcerpt = item.summary || (!isImportedReference ? item.content : '') || '';

  return (
    <div
      className="masonry-item"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(item); } }}
    >
      <div 
        className={`lov-card ${item.type === 'pdf' ? 'document-card-wrapper' : ''} ${item.type === 'link' && !linkHasPreview ? 'link-card-no-preview' : ''}`}
        ref={cardRef}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
      >
        {/* Interactive Mouse-tracking Light Shine Glare Overlay */}
        <div className="card-shine" />

        {/* Actions Overlay */}
        <div className="card-hover-overlay">
          <button
            className="card-action-btn"
            onClick={(e) => onDelete(item.id, e)}
            title={t.card.deleteTitle}
            aria-label="Delete"
          >
            <Trash2 size={12} strokeWidth={1.5} />
          </button>
        </div>

        {/* Polymorphic Content Render */}
        {item.type === 'image' && (
          <div className="image-card-container">
            {(!resolvedThumbnail || imgFailed) ? (
              <div className="image-fallback-container">
                <div className="image-fallback-icon">
                  <Image size={24} strokeWidth={1.2} />
                </div>
                <span className="image-fallback-title">
                  {isFileRef(item.thumbnail) && !resolvedThumbnail
                    ? 'File unavailable'
                    : item.title}
                </span>
              </div>
            ) : (
              <img
                src={resolvedThumbnail}
                alt={item.title}
                loading="lazy"
                onError={() => setImgFailed(true)}
              />
            )}
            <div className="image-card-overlay">
              <h4 className="image-title-overlay">{item.title}</h4>
              <span className="image-meta-overlay">{formatDate(item.createdAt)}</span>
            </div>
          </div>
        )}

        {item.type === 'link' && (
          <div>
            {linkHasPreview ? (
              <div className="link-card-preview">
                <img
                  src={resolvedThumbnail}
                  alt={item.title}
                  loading="lazy"
                  onError={() => setLinkImgFailed(true)}
                />
              </div>
            ) : (
              <div className="link-card-text-preview">
                <span className="link-domain">{sourceHost}</span>
                <h3 className="link-title">{item.title}</h3>
                {linkExcerpt && (
                  <p className="link-card-excerpt">
                    {linkExcerpt.length > 170 ? `${linkExcerpt.slice(0, 170)}...` : linkExcerpt}
                  </p>
                )}
              </div>
            )}
            {linkHasPreview && (
              <div className="link-card-body">
                <span className="link-domain">{sourceHost}</span>
                <h3 className="link-title">{item.title}</h3>
              </div>
            )}
          </div>
        )}

        {item.type === 'article' && (
          <div className="article-card-container">
            <span className="article-source">article</span>
            <h3 className="article-title">{item.title}</h3>
            <div className="article-divider"></div>
            <p className="article-snippet">{item.content}</p>
          </div>
        )}

        {item.type === 'note' && (
          <div
            className="note-card-container"
            style={{ '--note-paper': item.noteBgColor || 'rgba(238, 233, 224, 0.78)' } as React.CSSProperties}
          >
            <div className="note-content">
              {item.content.length > 220 ? `${item.content.slice(0, 220)}...` : item.content}
            </div>
            <div className="note-footer">
              <span className="note-date">{formatDate(item.createdAt)}</span>
              <span className="article-source">note</span>
            </div>
          </div>
        )}

        {item.type === 'pdf' && (
          <div className="document-card-container">
            <div className={`document-page-preview ${isPresentation ? 'is-landscape' : ''}`}>
              <Suspense fallback={<Skeleton variant="card" />}><LazyDocumentA4Page item={item} isCard={true} /></Suspense>
            </div>
            <div className="document-card-footer">
              <h3 className="document-card-filename">{item.title}</h3>
              <div className="document-card-meta">
                <span>{item.title.split('.').pop()?.toLowerCase() || 'pdf'}</span>
                <span>•</span>
                <span>{item.fileSize || 'document'}</span>
                {item.pageCount && (
                  <>
                    <span>•</span>
                    <span>{item.pageCount} {t.card.pages}</span>
                  </>
                )}
              </div>
              {item.fileSyncStatus === 'failed' && (
                <div className="file-sync-warning">{item.fileSyncError || '原文件同步失败，点击重新上传'}</div>
              )}
            </div>
          </div>
        )}

        {item.type === 'video' && (
          <div>
            <div className="video-card-preview">
              {(!resolvedThumbnail || videoImgFailed) ? (
                <div className="video-fallback-container">
                  <Play size={20} strokeWidth={1.5} />
                  {isFileRef(item.thumbnail) && !resolvedThumbnail && (
                    <span style={{ fontSize: '11px', opacity: 0.6, marginTop: '6px' }}>File unavailable</span>
                  )}
                </div>
              ) : (
                <img
                  src={resolvedThumbnail}
                  alt={item.title}
                  loading="lazy"
                  onError={() => setVideoImgFailed(true)}
                />
              )}
              {item.duration && <span className="video-duration">{item.duration}</span>}
              <div className="video-play-btn">
                <Play size={12} fill="currentColor" stroke="none" />
              </div>
            </div>
            <div className="video-card-body">
              <span className="video-source">
                video / {item.sourceUrl ? new URL(item.sourceUrl).hostname.replace('www.', '') : 'player'}
              </span>
              <h3 className="video-title">{item.title}</h3>
              {item.fileSyncStatus === 'failed' && (
                <div className="file-sync-warning">{item.fileSyncError || '原文件同步失败，点击重新上传'}</div>
              )}
            </div>
          </div>
        )}

        {item.type === 'audio' && (
          <div className="file-card-container">
            <div className="file-card-icon-area">
              <div className="file-card-icon">
                <Headphones size={28} strokeWidth={1.2} />
              </div>
              <span className="file-card-ext-badge">{item.fileExtension || 'audio'}</span>
            </div>
            <div className="file-card-info">
              <h3 className="file-card-filename">{item.title}</h3>
              <div className="file-card-meta">
                <span>{item.fileExtension || 'audio'}</span>
                {item.duration && (
                  <>
                    <span>•</span>
                    <span>{item.duration}</span>
                  </>
                )}
                {item.fileSize && (
                  <>
                    <span>•</span>
                    <span>{item.fileSize}</span>
                  </>
                )}
              </div>
              {item.fileSyncStatus === 'failed' && (
                <div className="file-sync-warning">{item.fileSyncError || '原文件同步失败，点击重新上传'}</div>
              )}
            </div>
          </div>
        )}

        {item.type === 'file' && (
          <div className="file-card-container">
            <div className="file-card-icon-area">
              <div className="file-card-icon">
                <File size={28} strokeWidth={1.2} />
              </div>
              <span className="file-card-ext-badge">{item.fileExtension || 'file'}</span>
            </div>
            <div className="file-card-info">
              <h3 className="file-card-filename">{item.title}</h3>
              <div className="file-card-meta">
                <span>{item.fileExtension || 'file'}</span>
                {item.fileSize && (
                  <>
                    <span>•</span>
                    <span>{item.fileSize}</span>
                  </>
                )}
              </div>
              {typeof item.uploadProgress === 'number' && item.uploadProgress < 100 && (
                <div className="upload-progress-bar">
                  <div className="upload-progress-fill" style={{ width: `${item.uploadProgress}%` }} />
                  <span className="upload-progress-text">{item.uploadProgress}%</span>
                </div>
              )}
              {item.fileSyncStatus === 'failed' && (
                <div className="file-sync-warning">{item.fileSyncError || '原文件同步失败，点击重新上传'}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
