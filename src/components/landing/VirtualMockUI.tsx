import React, { useRef, useEffect } from 'react';
import { Plus, Search, X, Music, Heart } from 'lucide-react';
import type { LandingStep } from './landing-types';
import gsap from 'gsap';
import { VirtualCursor } from './VirtualCursor';
import { QuickNoteDemo } from './QuickNoteDemo';
import { HERO_MEMORY_FRAGMENTS } from './landing-types';

interface VirtualMockUIProps {
  currentStep: LandingStep;
  isMobile: boolean;
  searchTyped: string;
  cursorVisible: boolean;
  capturedText: string | null;
  onCaptureComplete: (text: string) => void;
  isQuickNoteExpanded: boolean;
}

export const VirtualMockUI: React.FC<VirtualMockUIProps> = ({
  currentStep,
  isMobile,
  searchTyped,
  cursorVisible,
  capturedText,
  onCaptureComplete: _onCaptureComplete, // eslint-disable-line @typescript-eslint/no-unused-vars
  isQuickNoteExpanded,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const lovcorePreviewImages = [
    '/cosmos-assets/02_translucent_leaves.webp',
    '/cosmos-assets/01_concrete_corridor.webp',
    '/cosmos-assets/07_soft_petals.webp',
    '/cosmos-assets/05_monochrome_collage.webp',
  ];
  const lovcore2PreviewImages = [
    '/cosmos-assets/01_雨夜城市窗外景.webp',
    '/cosmos-assets/03_红漆宝盒与金饰.webp',
    '/cosmos-assets/02_星座与神话星图.webp',
  ];
  const colorChoices = ['#f59e0b', '#84cc16', '#2563eb', '#fb7185', '#22c55e', '#06b6d4', '#111827', '#c4b5fd'];
  const echoCards = [
    { src: '/cosmos-assets/03_underwater_light.webp', label: '水下光影' },
    { src: '/cosmos-assets/05_monochrome_collage.webp', label: '黑白拼贴' },
    { src: '/cosmos-assets/04_amber_glass.webp', label: '琥珀玻璃' },
    { src: '/cosmos-assets/02_星座与神话星图.webp', label: '星图笔记' },
    { src: '/cosmos-assets/08_rainy_street.webp', label: '雨夜街道' },
  ];

  useEffect(() => {
    if (isQuickNoteExpanded && !capturedText) {
      const handleGlobalKeyDown = () => {
        if (document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
          const ta = containerRef.current?.querySelector('.real-capture-input') as HTMLTextAreaElement | null;
          if (ta) ta.focus();
        }
      };
      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }
  }, [currentStep, capturedText, isQuickNoteExpanded]);

  // No longer using handleCaptureSubmit here

  useEffect(() => {
    if (isMobile || !containerRef.current) return;
    
    // Parallax tilt effect within the Mock UI
    const onMove = (e: MouseEvent) => {
      if (currentStep === 4) return; // Disable tilt on CTA step
      
      const rect = containerRef.current!.getBoundingClientRect();
      // Calculate mouse position relative to the center of the Mock UI
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);

      // Max tilt angle
      const maxTilt = 5;

      gsap.to(containerRef.current, {
        rotateY: dx * maxTilt,
        rotateX: -dy * maxTilt,
        duration: 0.8,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    };

    const onLeave = () => {
      gsap.to(containerRef.current, {
        rotateY: 0,
        rotateX: 0,
        duration: 1.2,
        ease: 'power3.out',
        overwrite: 'auto'
      });
    };

    window.addEventListener('mousemove', onMove);
    containerRef.current.addEventListener('mouseleave', onLeave);

    const container = containerRef.current;
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (container) {
        container.removeEventListener('mouseleave', onLeave);
      }
    };
  }, [isMobile, currentStep]);

  return (
    <div className={`virtual-mock-ui-container step-${currentStep} ${isMobile ? 'is-mobile' : ''}`}>
      <div className={`virtual-mock-ui-glass ${isQuickNoteExpanded ? 'allow-overflow' : ''}`} ref={containerRef}>
        
        {/* Header Bar */}
        <div className={`mock-ui-header ${currentStep === 1 ? 'dimmed-for-focus' : (currentStep === 3 ? 'focused-glow' : '')}`}>
           <div className="mock-ui-dots">
             <span/><span/><span/>
           </div>
           <div className="mock-ui-search-bar">
             <Search size={12} style={{ opacity: 0.5 }} />
             {currentStep === 1 ? (
               <>
                 <span key="capture-search" className="capture-search-typed">{searchTyped}</span>
                 <span className={`search-bar-cursor ${cursorVisible ? 'vis' : ''}`} />
               </>
             ) : (
               <>
                 <span key="memory-search" className="search-bar-typed" style={{opacity: 0.5}}>Search memories...</span>
                 <span className="chapter0-search-caret" />
               </>
             )}
           </div>
        </div>

        <div 
          className="masonry-target-grid" 
          style={{ 
            position: 'absolute', 
            top: 60, 
            left: 30, 
            right: 30, 
            bottom: 30, // Constrain to bottom!
            display: 'grid', 
            gridTemplateColumns: 'repeat(8, 1fr)',
            gridTemplateRows: 'repeat(10, 1fr)', // 8x10 Grid perfectly sized for 58 items!
            gridAutoFlow: 'row dense',
            gap: '12px',
            opacity: 0,
            pointerEvents: 'none',
          }}
        >
          {/* Quick Note Placeholder - 2x4 slot in the top left */}
          <div ref={placeholderRef} style={{ gridColumn: '1 / span 4', gridRow: '1 / span 2' }} />
          
          {HERO_MEMORY_FRAGMENTS.map((fragment, idx) => {
            let colSpan: number;
            let rowSpan: number;

            if (idx % 7 === 0) {
              colSpan = 2; rowSpan = 2; // large square
            } else if (idx % 11 === 0) {
              colSpan = 2; rowSpan = 1; // wide
            } else if (idx % 13 === 0) {
              colSpan = 1; rowSpan = 2; // tall
            } else {
              colSpan = 1; rowSpan = 1; // small square
            }
            
            return (
              <div 
                key={`target-${fragment.id}`} 
                id={`target-${fragment.id}`}
                className="masonry-target-slot"
                style={{ 
                  gridColumn: `span ${colSpan}`, 
                  gridRow: `span ${rowSpan}` 
                }} 
              />
            );
          })}
        </div>

        {/* Move VirtualCursor OUTSIDE masonry-target-grid so it's not opacity 0! */}
        <VirtualCursor />

        {/* Legacy Mock Detail Drawer for Ch0 Animation */}
        <div className="mock-detail-drawer" style={{ 
          position: 'absolute', top: 0, right: 0, width: '360px', height: '100%', 
          background: 'rgba(255,255,255,0.95)', borderLeft: '1px solid rgba(0,0,0,0.08)',
          padding: '24px', transform: 'translateX(100%)', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '16px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', letterSpacing: '0.05em' }}>SUMMARY</div>
          <div className="mock-ai-summary" style={{ fontSize: '14px', lineHeight: 1.6, color: '#333' }}></div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginTop: '16px' }}>KEY POINTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="mock-ai-kp-1" style={{ fontSize: '13px', color: '#555' }}></div>
            <div className="mock-ai-kp-2" style={{ fontSize: '13px', color: '#555' }}></div>
            <div className="mock-ai-kp-3" style={{ fontSize: '13px', color: '#555' }}></div>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', letterSpacing: '0.05em', marginTop: '16px' }}>TAGS</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="mock-tag-1" style={{ fontSize: '12px', padding: '4px 8px', background: '#f0f0f0', borderRadius: '4px', transform: 'scale(0)' }}>#stained-glass</span>
            <span className="mock-tag-2" style={{ fontSize: '12px', padding: '4px 8px', background: '#f0f0f0', borderRadius: '4px', transform: 'scale(0)' }}>#cats</span>
            <span className="mock-tag-3" style={{ fontSize: '12px', padding: '4px 8px', background: '#f0f0f0', borderRadius: '4px', transform: 'scale(0)' }}>#art</span>
          </div>
        </div>

        <div className="chapter0-search-result-layer" aria-hidden="true">
          <div className="chapter0-result-card">
            <img src="/cosmos-assets/02_translucent_leaves.webp" alt="" />
            <div className="chapter0-result-meta">
              <span>IMAGE</span>
              <strong>02_translucent_leaves</strong>
            </div>
          </div>
        </div>

        <div className="chapter0-detail-overlay" aria-hidden="true">
          <button className="chapter0-detail-backdrop" type="button" tabIndex={-1} aria-label="Close detail" />
          <div className="chapter0-detail-image-panel">
            <img src="/cosmos-assets/02_translucent_leaves.webp" alt="" />
          </div>
          <aside className="chapter0-detail-info-panel">
            <div className="chapter0-detail-actions">
              <span>•••</span>
              <span>×</span>
            </div>
            <span className="chapter0-detail-type">IMAGE</span>
            <h3>02_translucent_leaves</h3>
            <p className="chapter0-detail-saved">Saved 2026年5月31日 01:14 · Local file</p>
            <section>
              <h4>SUMMARY</h4>
              <p className="chapter0-detail-summary">
                A leaf from a young green plant is shown in soft backlit conditions, displaying a translucent texture with visible vein structure against a blurred green bokeh background.
              </p>
            </section>
            <section>
              <h4>KEY POINTS</h4>
              <ul>
                <li>The leaf exhibits a distinct translucent quality under backlit conditions.</li>
                <li>The vein structure is clearly visible, highlighting the plant's internal anatomy.</li>
                <li>The background features a soft green bokeh effect.</li>
              </ul>
            </section>
            <section>
              <h4>TAGS</h4>
              <div className="chapter0-detail-tags">
                <span>upload</span>
                <span>image</span>
                <span>translucent leaves</span>
                <span>backlit foliage</span>
                <span>macro botany</span>
                <span>soft focus</span>
              </div>
            </section>
          </aside>
        </div>

        {/* Dynamic Quick Note Widget (Interpolates between Small and Large) */}
      <div 
        className={`quick-note-widget absolute transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] z-[100] transform ${!isQuickNoteExpanded ? 'bg-white rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden' : 'bg-white/90 backdrop-blur-xl rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.08)]'}`}
        style={{
          ...(!isQuickNoteExpanded ? {
            top: '60px',
            left: '30px',
            width: 'calc((100% - 60px - 12px) / 2)',
            height: 'calc((100% - 90px - 9 * 12px) / 10 * 2 + 12px)', // Matches 2 rows of the 8x10 grid!
            transform: 'translateX(0) translateY(0)',
            bottom: 'auto'
          } : {
            top: '64px',
            left: '5%',
            transform: 'translateX(0) translateY(0)',
            width: '90%',
            maxWidth: '100%',
            height: 'calc(100% - 96px)',
            maxHeight: '100%',
            bottom: 'auto'
          })
        }}
      >
        {/* Unified Quick Note Content */}
        <div className="absolute inset-0">
          <QuickNoteDemo isActive={isQuickNoteExpanded} isSmall={!isQuickNoteExpanded} />
        </div>
      </div>

        <div className="ch2-folio-demo" aria-hidden="true">
          <div className="ch2-folio-topbar">
            <div className="ch2-folio-tabs">
              <span>灵感栈</span>
              <strong>收藏集</strong>
              <span>回响</span>
            </div>
          </div>
          <div className="ch2-folio-page">
            <div className="ch2-folio-heading">
              <h3>全部收藏集</h3>
              <button className="ch2-create-folio" type="button">
                <Plus size={13} />
                <span>创建新收藏集</span>
              </button>
            </div>
            <div className="ch2-folio-rule" />
            <div className="ch2-folio-grid">
              <div className="ch2-folio-card ch2-folio-card-primary">
                <div className="ch2-stack-preview">
                  {lovcorePreviewImages.map((src, index) => (
                    <img key={src} className={`ch2-stack-img ch2-stack-img-${index + 1}`} src={src} alt="" />
                  ))}
                  <span className="ch2-stack-counter">1/8</span>
                </div>
                <div className="ch2-folio-name"><span style={{ background: '#facc15' }} />lovcore</div>
                <div className="ch2-folio-count">8 张卡片</div>
              </div>
              <div className="ch2-folio-card ch2-folio-card-new">
                <button className="ch2-folio-delete" type="button">⌫</button>
                <div className="ch2-stack-preview ch2-stack-preview-small">
                  {lovcore2PreviewImages.map((src, index) => (
                    <img key={src} className={`ch2-stack-img ch2-stack-img-${index + 1}`} src={src} alt="" />
                  ))}
                </div>
                <div className="ch2-folio-name"><span style={{ background: '#f59e0b' }} />lovcore2</div>
                <div className="ch2-folio-count">11 张卡片</div>
              </div>
            </div>
          </div>

          <div className="ch2-color-modal">
            <button className="ch2-modal-close" type="button" aria-label="Close"><X size={16} /></button>
            <div className="ch2-modal-pill"><span />lovcore2</div>
            <h3>选择颜色</h3>
            <p>为收藏集配上颜色，需要时一眼就能找到它。</p>
            <div className="ch2-color-wheel">
              {colorChoices.map((color, index) => (
                <span
                  key={color}
                  className={`ch2-color-choice ch2-color-choice-${index + 1}`}
                  style={{ '--folio-color': color } as React.CSSProperties}
                />
              ))}
            </div>
            <button className="ch2-save-folio" type="button">完成并保存</button>
          </div>
        </div>

        {/* Ch2: Cluster halos + connection lines + labels */}
        {!isMobile && (
          <>
            <div className="cluster-halo halo-a" />
            <div className="cluster-halo halo-b" />
            <div className="cluster-halo halo-c" />

            <svg className="connection-svg" viewBox="-400 -300 800 600">
              <path className="connection-line-path" d="M 240 -220 Q 300 -185, 360 -150" />
              <path className="connection-line-path" d="M 200 -10 Q 270 10, 340 30" />
              <path className="connection-line-path" d="M 220 180 Q 290 210, 360 240" />
            </svg>

            <div className="folio-label label-cluster-a"><span className="folio-dot" style={{ background: '#E3594C' }} />Reading / Design</div>
            <div className="folio-label label-cluster-b"><span className="folio-dot" style={{ background: '#2EBBA6' }} />Quiet References</div>
            <div className="folio-label label-cluster-c"><span className="folio-dot" style={{ background: '#F2AB50' }} />Creative Notes</div>
          </>
        )}

        {/* Ch3: Echo / Serendipity demo */}
        {!isMobile && (
          <div className="ch3-echo-demo" aria-hidden="true">
            <div className="ch3-echo-glow ch3-echo-glow-blue" />
            <div className="ch3-echo-glow ch3-echo-glow-warm" />
            <button className="ch3-echo-back" type="button">←</button>
            <div className="ch3-sound-pill">
              <Music size={13} style={{ opacity: 0.6 }} />
              <span>氛围音景</span>
            </div>

            <div className="ch3-echo-field">
              {echoCards.slice(2).map((card, index) => (
                <div key={card.src} className={`ch3-bg-card ch3-bg-card-${index + 1}`}>
                  <img src={card.src} alt="" />
                </div>
              ))}

              <div className="ch3-main-card ch3-main-card-a">
                <img src={echoCards[0].src} alt="" />
              </div>
              <div className="ch3-main-card ch3-main-card-b">
                <img src={echoCards[1].src} alt="" />
              </div>
            </div>

            <div className="ch3-action-pill">
              <span className="ch3-action-bg" />
              <button className="ch3-action-forget" type="button" style={{display:'flex', alignItems:'center', gap:'4px'}}><X size={14} style={{opacity: 0.6}}/>遗忘</button>
              <i />
              <button className="ch3-action-keep" type="button" style={{display:'flex', alignItems:'center', gap:'4px'}}><Heart size={14} style={{opacity: 0.6}}/>保留</button>
            </div>
          </div>
        )}

        <div 
          className="masonry-target-grid" 
          style={{ 
            position: 'absolute', 
            top: 60, 
            left: 30, 
            right: 30, 
            bottom: 30, // Constrain to bottom!
            display: 'grid', 
            gridTemplateColumns: 'repeat(8, 1fr)',
            gridTemplateRows: 'repeat(10, 1fr)', // 8x10 Grid perfectly sized for 58 items!
            gridAutoFlow: 'row dense',
            gap: '12px',
            opacity: 0,
            pointerEvents: 'none'
          }}
        >
          {/* Reserved Space for Small Quick Note (4 columns x 2 rows) */}
          <div ref={placeholderRef} style={{ gridColumn: '1 / span 4', gridRow: '1 / span 2' }} />

          {HERO_MEMORY_FRAGMENTS.map((fragment, index) => {
            // Re-distribute sizes to EXACTLY fill 80 slots (8x10 grid)
            // Quick Note uses 8 slots. 58 items total. 
            // Total available slots = 80.
            // Fragments + Quick Note = 58 + 8 = 66 slots.
            // We have EXACTLY 14 extra slots to allocate for spans!
            let colSpan = 1;
            let rowSpan = 1;
            
            if (index === 0 || index === 10) {
              // 2x2 = 3 extra slots (x2 = 6)
              colSpan = 2; rowSpan = 2;
            } else if ([2, 6, 14, 18].includes(index)) {
              // 2x1 = 1 extra slot (x4 = 4)
              colSpan = 2; rowSpan = 1;
            } else if ([4, 8, 16, 20].includes(index)) {
              // 1x2 = 1 extra slot (x4 = 4)
              colSpan = 1; rowSpan = 2;
            }
            // 6 + 4 + 4 = 14 extra slots! PERFECT PACKING!

            return (
              <div 
                key={fragment.id} 
                className="masonry-cell" 
                style={{ 
                  gridColumn: `span ${colSpan}`,
                  gridRow: `span ${rowSpan}`,
                  width: '100%',
                  height: '100%'
                }}
              />
            );
          })}

          <VirtualCursor />
        </div>

      </div>
    </div>
  );
};
