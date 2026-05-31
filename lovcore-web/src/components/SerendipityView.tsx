'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { Item } from '../types';
import { DocumentA4Page } from './DocumentA4Page';
import { useTranslation } from '../i18n';
import { useFileUrl } from '../lib/fileStore';

interface SerendipityViewProps {
  items: Item[];
  onSelectCard: (item: Item) => void;
}

// ---------------------------------------------------------
// Meditative Soundscape Engine using Browser Web Audio API
// ---------------------------------------------------------
class AmbientEngine {
  private ctx: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private gainNodes: GainNode[] = [];
  private filter: BiquadFilterNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;

  start() {
    try {
      const AudioContextClass = window.AudioContext
        || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();
      
      // Warm low pass filter
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(260, this.ctx.currentTime);
      this.filter.Q.setValueAtTime(1.2, this.ctx.currentTime);
      this.filter.connect(this.ctx.destination);

      // Relaxing major 9th pad chord drone (F3, C4, G4, A4)
      const frequencies = [174.61, 261.63, 392.00, 440.00];
      
      frequencies.forEach((freq, idx) => {
        if (!this.ctx || !this.filter) return;
        
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle'; 
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        // Slight detune for warm analog chorus texture
        osc.detune.setValueAtTime((idx - 1.5) * 5, this.ctx.currentTime);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0, this.ctx.currentTime);
        
        osc.connect(oscGain);
        oscGain.connect(this.filter);
        
        // Meditative fade-in
        oscGain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 2.5);
        
        osc.start();
        this.oscillators.push(osc);
        this.gainNodes.push(oscGain);
      });

      // LFO filter modulator to make the sound breathe organically
      this.lfo = this.ctx.createOscillator();
      this.lfo.type = 'sine';
      this.lfo.frequency.setValueAtTime(0.1, this.ctx.currentTime); // 10s period

      this.lfoGain = this.ctx.createGain();
      this.lfoGain.gain.setValueAtTime(45, this.ctx.currentTime); 

      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.filter.frequency);
      this.lfo.start();

    } catch (err) {
      console.warn('Audio Context failed to start:', err);
    }
  }

  stop() {
    const now = this.ctx ? this.ctx.currentTime : 0;
    this.gainNodes.forEach((gainNode) => {
      if (this.ctx) {
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 1.0);
      }
    });

    setTimeout(() => {
      this.oscillators.forEach((osc) => {
        try { osc.stop(); } catch { /* oscillator may already be stopped */ }
      });
      if (this.lfo) {
        try { this.lfo.stop(); } catch { /* oscillator may already be stopped */ }
      }
      if (this.ctx) {
        this.ctx.close();
      }
      this.oscillators = [];
      this.gainNodes = [];
      this.ctx = null;
      this.filter = null;
      this.lfo = null;
      this.lfoGain = null;
    }, 1100);
  }
}

// ---------------------------------------------------------
// Helper to calculate adaptive pastel background colors
// ---------------------------------------------------------
const getAdaptiveBgColor = (item: Item, isDark: boolean): string => {
  if (isDark) {
    if (item.type === 'note' && item.noteBgColor) return 'rgba(32, 28, 24, 0.45)';
    if (item.type === 'image' && item.colorPalette && item.colorPalette.length > 0) {
      return `${item.colorPalette[0]}15`; // blend hex with dark alpha
    }
    return '#141414';
  } else {
    if (item.type === 'note' && item.noteBgColor) return item.noteBgColor;
    if (item.type === 'image' && item.colorPalette && item.colorPalette.length > 0) {
      return `${item.colorPalette[0]}0B`; // 4% opacity tint for light mode
    }
    return '#F5F6F8';
  }
};

function SerendipityBgCard({
  item, idx, onMouseEnter, onMouseLeave, onClick,
}: {
  item: Item; idx: number;
  onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onClick: () => void;
}) {
  const resolved = useFileUrl(item.thumbnail);
  const isDocType = item.type === 'pdf' || item.type === 'article' || (item.type === 'link' && !resolved);
  return (
    <button
      className={`serendipity-bg-card bg-card-${idx + 1} type-${item.type}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      style={{ backgroundImage: resolved ? `url(${resolved})` : undefined }}
    >
      {item.type === 'note' && (
        <div
          className="bg-card-note-text"
          style={{ backgroundColor: item.noteBgColor || undefined, color: item.noteBgColor ? '#2c2824' : undefined }}
        >
          {item.content}
        </div>
      )}
      {isDocType && (
        <div className="bg-card-pdf-preview-container">
          <DocumentA4Page item={item} isCard={true} />
        </div>
      )}
      {!resolved && item.type !== 'note' && !isDocType && (
        <div className="bg-card-generic-text">{item.title}</div>
      )}
    </button>
  );
}

export const SerendipityView = ({ items, onSelectCard }: SerendipityViewProps) => {
  const { t } = useTranslation();
  const [hasStarted, setHasStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [isSoundOn, setIsSoundOn] = useState(false);
  const [dragX, setDragX] = useState(0);

  const blurSpansRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLButtonElement>(null);
  const cardTweenRef = useRef<gsap.core.Tween | null>(null);
  const spanTweensRef = useRef<Array<gsap.core.Tween | undefined>>([]);
  const audioEngineRef = useRef<AmbientEngine | null>(null);

  // Drag state refs
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef<boolean>(false);

  // Glow blobs refs
  const blobPinkRef = useRef<HTMLDivElement>(null);
  const blobBlueRef = useRef<HTMLDivElement>(null);
  const blobPurpleRef = useRef<HTMLDivElement>(null);

  const reviewItems = useMemo(() => items.filter((item) => item.status === 'ready'), [items]);
  const currentItem = reviewItems[index % Math.max(reviewItems.length, 1)];

  // 6 other background cards, distinct from the active one
  const backgroundItems = useMemo(() => {
    if (reviewItems.length <= 1) return [];
    const list: Item[] = [];
    for (let i = 1; i <= Math.min(6, reviewItems.length - 1); i++) {
      const itemIdx = (index + i) % reviewItems.length;
      list.push(reviewItems[itemIdx]);
    }
    return list;
  }, [reviewItems, index]);

  const next = () => {
    setIndex((current) => (current + 1) % Math.max(reviewItems.length, 1));
  };

  // Instantiation & Cleanup of Web Audio Pad
  useEffect(() => {
    audioEngineRef.current = new AmbientEngine();
    return () => {
      if (audioEngineRef.current) {
        audioEngineRef.current.stop();
      }
    };
  }, []);

  const toggleSound = () => {
    if (!audioEngineRef.current) return;
    if (isSoundOn) {
      audioEngineRef.current.stop();
      setIsSoundOn(false);
    } else {
      audioEngineRef.current.start();
      setIsSoundOn(true);
    }
  };

  // Moving fluid gradient blobs animation
  useEffect(() => {
    if (!hasStarted) return;

    const pBlob = blobPinkRef.current;
    const bBlob = blobBlueRef.current;
    const purpBlob = blobPurpleRef.current;

    const tweens: gsap.core.Tween[] = [];

    if (pBlob) {
      tweens.push(
        gsap.to(pBlob, {
          x: 'random(-120, 120)',
          y: 'random(-100, 100)',
          scale: 'random(0.9, 1.25)',
          duration: 16,
          repeat: -1,
          yoyo: true,
          ease: 'sine.easeInOut',
        })
      );
    }

    if (bBlob) {
      tweens.push(
        gsap.to(bBlob, {
          x: 'random(-100, 100)',
          y: 'random(-130, 130)',
          scale: 'random(0.85, 1.2)',
          duration: 20,
          repeat: -1,
          yoyo: true,
          ease: 'sine.easeInOut',
        })
      );
    }

    if (purpBlob) {
      tweens.push(
        gsap.to(purpBlob, {
          x: 'random(-140, 140)',
          y: 'random(-80, 80)',
          scale: 'random(0.9, 1.15)',
          duration: 14,
          repeat: -1,
          yoyo: true,
          ease: 'sine.easeInOut',
        })
      );
    }

    return () => {
      tweens.forEach((t) => t.kill());
    };
  }, [hasStarted]);

  // Cosmic Drift Animation for Background Cards and Central Card
  useEffect(() => {
    if (!hasStarted) return;

    // Background cards drifting slowly in orbital paths
    const spans = blurSpansRef.current?.querySelectorAll('.serendipity-bg-card');

    if (spans && spans.length > 0) {
      spans.forEach((span, idx) => {
        // If a drift tween already exists for this index, let it run continuously!
        if (spanTweensRef.current[idx]) {
          return;
        }

        const rx = 35 + Math.random() * 25; // 35px to 60px horizontal orbit radius
        const ry = 25 + Math.random() * 20; // 25px to 45px vertical orbit radius
        const startAngle = Math.random() * Math.PI * 2;
        const dir = Math.random() > 0.5 ? 1 : -1;
        const duration = 12 + Math.random() * 9; // speed up orbit by 50% (12s to 21s)

        const angleObj = { angle: startAngle };

        // Set initial random position along the orbital path (with improved 8px blur / 0.7 opacity)
        gsap.set(span, {
          x: Math.cos(startAngle) * rx,
          y: Math.sin(startAngle) * ry,
          rotation: startAngle * (180 / Math.PI) * 0.1,
          filter: 'blur(8px)',
          opacity: 0.7,
          scale: 1,
        });

        // Loop the orbital rotation drift
        const tween = gsap.to(angleObj, {
          angle: startAngle + Math.PI * 2 * dir,
          duration: duration,
          repeat: -1,
          ease: 'none',
          onUpdate: () => {
            gsap.set(span, {
              x: Math.cos(angleObj.angle) * rx,
              y: Math.sin(angleObj.angle) * ry,
              rotation: angleObj.angle * (180 / Math.PI) * 0.08, // Slow spin/sway as it orbits
            });
          }
        });
        spanTweensRef.current[idx] = tween;
      });

      // Cleanup extra tweens if backgroundItems length shrank
      if (spanTweensRef.current.length > spans.length) {
        for (let i = spans.length; i < spanTweensRef.current.length; i++) {
          const tween = spanTweensRef.current[i];
          tween?.kill();
        }
        spanTweensRef.current = spanTweensRef.current.slice(0, spans.length);
      }
    }

    // Central card floating slowly (only set up once or when dragging stops)
    const card = cardRef.current;
    if (card && !isDraggingRef.current && !cardTweenRef.current) {
      gsap.set(card, { x: 0, y: 0, rotation: 0, scale: 1 });
      cardTweenRef.current = gsap.to(card, {
        x: 'random(-14, 14)',
        y: 'random(-10, 10)',
        rotation: 'random(-1.5, 1.5)',
        duration: 5.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.easeInOut',
      });
    }
  }, [hasStarted, backgroundItems.length]);

  // Clean up all GSAP tweens on unmount
  useEffect(() => {
    return () => {
      spanTweensRef.current.forEach((t) => t?.kill());
      if (cardTweenRef.current) {
        cardTweenRef.current.kill();
      }
    };
  }, []);

  // Adaptive Background Color Transition
  useEffect(() => {
    if (!hasStarted || !currentItem) return;
    const isDark = document.documentElement.classList.contains('dark');
    const targetColor = getAdaptiveBgColor(currentItem, isDark);
    
    gsap.to('.serendipity-stage', {
      backgroundColor: targetColor,
      duration: 1.2,
      ease: 'power2.out',
    });
  }, [currentItem, hasStarted]);

  // Card Swiping Throw Animation
  const throwCard = (direction: 'left' | 'right') => {
    const card = cardRef.current;
    if (!card) return;

    if (cardTweenRef.current) {
      cardTweenRef.current.kill();
    }

    const targetX = direction === 'right' ? 650 : -650;
    const targetRot = direction === 'right' ? 24 : -24;

    setDragX(0);

    // Throw card off-screen
    gsap.to(card, {
      x: targetX,
      rotation: targetRot,
      opacity: 0,
      scale: 0.85,
      duration: 0.45,
      ease: 'power2.in',
      onComplete: () => {
        next();
        
        // Animate incoming card popping up from the bottom with elastic bounce
        gsap.fromTo(card,
          { y: 80, x: 0, rotation: 0, opacity: 0, scale: 0.9 },
          {
            y: 0,
            x: 0,
            rotation: 0,
            opacity: 1,
            scale: 1,
            duration: 0.6,
            ease: 'back.out(1.2)',
            onComplete: () => {
              // Re-enable cosmic drift loop
              if (!isDraggingRef.current) {
                cardTweenRef.current = gsap.to(card, {
                  x: 'random(-14, 14)',
                  y: 'random(-10, 10)',
                  rotation: 'random(-1.5, 1.5)',
                  duration: 5.5,
                  repeat: -1,
                  yoyo: true,
                  ease: 'sine.easeInOut',
                });
              }
            }
          }
        );
      }
    });
  };

  // Drag Gesture Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return; // left click only
    const card = cardRef.current;
    if (!card) return;

    card.setPointerCapture(e.pointerId);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = true;

    if (cardTweenRef.current) {
      cardTweenRef.current.pause();
    }

    gsap.killTweensOf(card);
    gsap.to(card, { scale: 0.98, duration: 0.2, ease: 'power2.out' });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingRef.current) return;
    const card = cardRef.current;
    if (!card) return;

    const dx = e.clientX - dragStartRef.current.x;
    setDragX(dx);

    gsap.set(card, {
      x: dx,
      rotation: dx * 0.04,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    
    const card = cardRef.current;
    if (card) {
      card.releasePointerCapture(e.pointerId);
    }

    const dx = e.clientX - dragStartRef.current.x;

    if (dx > 140) {
      throwCard('right');
    } else if (dx < -140) {
      throwCard('left');
    } else {
      // Spring back to center
      setDragX(0);
      gsap.to(card, {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        duration: 0.5,
        ease: 'back.out(1.4)',
        onComplete: () => {
          if (cardTweenRef.current && hasStarted) {
            cardTweenRef.current.resume();
          }
        }
      });
    }
  };

  const handleMouseEnter = () => {
    if (isDraggingRef.current) return;
    if (cardTweenRef.current) {
      cardTweenRef.current.pause();
    }
    const card = cardRef.current;
    if (card) {
      gsap.to(card, {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1.04,
        duration: 0.45,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
  };

  const handleMouseLeave = () => {
    if (isDraggingRef.current) return;
    const card = cardRef.current;
    if (card) {
      gsap.to(card, {
        scale: 1,
        duration: 0.5,
        ease: 'power3.out',
        overwrite: 'auto',
        onComplete: () => {
          if (cardTweenRef.current && hasStarted && !isDraggingRef.current) {
            cardTweenRef.current.resume();
          }
        },
      });
    }
  };

  // Hover unblur handlers for background cards
  const handleBgCardMouseEnter = (e: React.MouseEvent<HTMLButtonElement>, idx: number) => {
    if (spanTweensRef.current[idx]) {
      spanTweensRef.current[idx].pause();
    }
    gsap.to(e.currentTarget, {
      filter: 'blur(0px)',
      opacity: 1,
      scale: 1.08,
      zIndex: 10,
      boxShadow: '0 20px 45px rgba(0, 0, 0, 0.15)',
      duration: 0.4,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  };

  const handleBgCardMouseLeave = (e: React.MouseEvent<HTMLButtonElement>, idx: number) => {
    gsap.to(e.currentTarget, {
      filter: 'blur(16px)',
      opacity: 0.45,
      scale: 1,
      zIndex: 2,
      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
      duration: 0.5,
      ease: 'power3.out',
      overwrite: 'auto',
      onComplete: () => {
        if (spanTweensRef.current[idx] && hasStarted) {
          spanTweensRef.current[idx].resume();
        }
      },
    });
  };

  const handleSelectBackgroundItem = (targetItem: Item) => {
    const targetIdx = reviewItems.findIndex((x) => x.id === targetItem.id);
    if (targetIdx !== -1) {
      const card = cardRef.current;
      if (card) {
        if (cardTweenRef.current) cardTweenRef.current.kill();
        
        // Play shrink and drop animation, then swap
        gsap.to(card, {
          y: 40,
          scale: 0.8,
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: () => {
            setIndex(targetIdx);
            
            // Pop the new card up with bounce
            gsap.fromTo(card,
              { y: 60, scale: 0.9, opacity: 0 },
              {
                y: 0,
                scale: 1,
                opacity: 1,
                duration: 0.5,
                ease: 'back.out(1.2)',
                onComplete: () => {
                  cardTweenRef.current = gsap.to(card, {
                    x: 'random(-14, 14)',
                    y: 'random(-10, 10)',
                    rotation: 'random(-1.5, 1.5)',
                    duration: 5.5,
                    repeat: -1,
                    yoyo: true,
                    ease: 'sine.easeInOut',
                  });
                }
              }
            );
          }
        });
      } else {
        setIndex(targetIdx);
      }
    }
  };

  if (!hasStarted) {
    return (
      <main className="serendipity-intro">
        <span className="serendipity-eyebrow">{t.serendipity.eyebrow}</span>
        <h1>{t.serendipity.introTitle}</h1>
        <p>{t.serendipity.introDesc}</p>
        <button onClick={() => setHasStarted(true)}>{t.serendipity.showMe}</button>
      </main>
    );
  }

  if (!currentItem) {
    return (
      <main className="serendipity-intro">
        <h1>{t.serendipity.emptyTitle}</h1>
        <p>{t.serendipity.emptyDesc}</p>
      </main>
    );
  }

  return (
    <main className="serendipity-stage">
      {/* Soundwaves control toggle in top-right */}
      <button 
        className={`ambient-audio-toggle ${isSoundOn ? 'active' : ''}`}
        onClick={toggleSound}
        title={isSoundOn ? t.serendipity.muteAmbient : t.serendipity.playAmbient}
      >
        <span className="sound-text">{t.serendipity.soundscape}</span>
        <div className="audio-wave-bars">
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
        </div>
      </button>

      {/* Floating background cards that unblur on hover */}
      <div className="serendipity-blur-field" aria-hidden="true" ref={blurSpansRef}>
        {backgroundItems.map((item, idx) => (
          <SerendipityBgCard
            key={idx}
            item={item}
            idx={idx}
            onMouseEnter={(e) => handleBgCardMouseEnter(e, idx)}
            onMouseLeave={(e) => handleBgCardMouseLeave(e, idx)}
            onClick={() => handleSelectBackgroundItem(item)}
          />
        ))}
      </div>

      {/* Central active focused card */}
      <button 
        className="serendipity-card" 
        ref={cardRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          // If dragged, click is ignored
          if (Math.abs(e.clientX - dragStartRef.current.x) > 5) {
            e.stopPropagation();
          } else {
            onSelectCard(currentItem);
          }
        }}
        style={{ touchAction: 'none' }}
      >
        {/* Swiping visual feedback indicators */}
        {dragX !== 0 && (
          <div 
            className="drag-indicator-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: '700',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              pointerEvents: 'none',
              zIndex: 10,
              opacity: Math.min(Math.abs(dragX) / 200, 0.75),
              backgroundColor: dragX > 0 ? 'rgba(37, 99, 235, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: dragX > 0 ? '#2563eb' : '#ef4444',
              border: `2px solid ${dragX > 0 ? '#2563eb' : '#ef4444'}`,
            }}
          >
            {dragX > 0 ? t.serendipity.keep : t.serendipity.forget}
          </div>
        )}

        {/* Polymorphic card content layout */}
        {currentItem.type === 'note' ? (
          <div 
            className="serendipity-note-preview"
            style={{ 
              backgroundColor: currentItem.noteBgColor || undefined,
              color: currentItem.noteBgColor ? '#201c18' : undefined
            }}
          >
            <div className="serendipity-note-content">
              {currentItem.content.length > 320 ? `${currentItem.content.slice(0, 320)}...` : currentItem.content}
            </div>
          </div>
        ) : (currentItem.type === 'pdf' || currentItem.type === 'article' || (currentItem.type === 'link' && !currentItem.thumbnail)) ? (
          <div className="document-page-preview serendipity-doc-preview">
            <DocumentA4Page item={currentItem} isCard={true} />
          </div>
        ) : (
          currentItem.thumbnail && (
            <img src={currentItem.thumbnail} alt={currentItem.title} draggable="false" />
          )
        )}
        <strong>{currentItem.title}</strong>
      </button>

      <div className="serendipity-actions">
        <button
          className="serendipity-btn btn-forget"
          onClick={() => throwCard('left')}
          title={t.serendipity.forgetBtn}
        >
          <svg className="btn-logo-svg" viewBox="-14 -14 148 148" fill="none">
            <path
              d="M49.5 106.5C35.2 107.8 22.9 101.4 18.2 90.5C13.2 78.8 17.8 64.9 30.5 53.6C40.4 44.8 54.4 38.4 68.2 32.8C82 27.2 91.5 19 89.9 8.8C88.1 -2.6 73.2 -4.5 61.9 3.4C48.9 12.5 39.4 30.1 37.3 51.2C34.6 77.5 43.2 103.5 61.2 113.1C76.6 121.3 95.8 115.2 104.5 99.2C113 83.7 109.1 64.3 96 53.2C88.8 47.1 80.6 44.1 72.5 44.5"
              stroke="currentColor"
              strokeWidth="7.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="61.5" cy="67.5" r="9.5" fill="#FF4F3F" />
          </svg>
          <span>{t.serendipity.forgetBtn}</span>
        </button>

        <button
          className="serendipity-btn btn-keep"
          onClick={() => throwCard('right')}
          title={t.serendipity.keepBtn}
        >
          <svg className="btn-logo-svg" viewBox="-14 -14 148 148" fill="none">
            <path
              d="M49.5 106.5C35.2 107.8 22.9 101.4 18.2 90.5C13.2 78.8 17.8 64.9 30.5 53.6C40.4 44.8 54.4 38.4 68.2 32.8C82 27.2 91.5 19 89.9 8.8C88.1 -2.6 73.2 -4.5 61.9 3.4C48.9 12.5 39.4 30.1 37.3 51.2C34.6 77.5 43.2 103.5 61.2 113.1C76.6 121.3 95.8 115.2 104.5 99.2C113 83.7 109.1 64.3 96 53.2C88.8 47.1 80.6 44.1 72.5 44.5"
              stroke="currentColor"
              strokeWidth="7.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="61.5" cy="67.5" r="9.5" fill="#2563EB" />
          </svg>
          <span>{t.serendipity.keepBtn}</span>
        </button>
      </div>
    </main>
  );
};
