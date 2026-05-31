import React, { useLayoutEffect, useRef } from 'react';
import { HERO_MEMORY_FRAGMENTS } from '../landing-types';
import { LogoIcon } from '../../LogoIcon';
import { useTranslation } from '../../../i18n';
import gsap from 'gsap';

interface HeroSceneProps {
  heroTitleRef: React.RefObject<HTMLHeadingElement | null>;
  sharedState: React.MutableRefObject<{ suction: number; c2Progress?: number; c3Progress?: number; c4Progress?: number; c1BlurProgress?: number; orbitReveal?: number; logoReveal?: number }>;
  virtualUIRef: React.RefObject<HTMLDivElement | null>;
}

export const HeroScene: React.FC<HeroSceneProps> = ({ heroTitleRef, sharedState, virtualUIRef }) => {
  const { t } = useTranslation();
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const globalTime = useRef(0);
  const flapRef = useRef<HTMLDivElement>(null);
  const logoPathRef = useRef<SVGPathElement>(null);
  const logoPathLength = useRef(1000);

  const createLetterSplash = (e: React.MouseEvent<HTMLSpanElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const parent = el.parentElement;
    if (!parent) return;
    const pRect = parent.getBoundingClientRect();
    const ox = rect.left - pRect.left + rect.width / 2;
    const oy = rect.top - pRect.top + rect.height / 2;

    gsap.fromTo(el, { scale: 0.7, rotationX: -180 }, { scale: 1.25, rotationX: 0, duration: 0.6, ease: 'elastic.out(1.1, 0.4)' });

    const colors = ['var(--accent)', 'var(--text-secondary)', '#2ebba6', '#f2ab50', '#ea5a50'];
    for (let i = 0; i < 14; i++) {
      const p = document.createElement('div');
      p.className = 'fountain-particle';
      parent.appendChild(p);
      const size = gsap.utils.random(4, 9);
      gsap.set(p, {
        position: 'absolute', left: 0, top: 0, x: ox, y: oy,
        width: size, height: size,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        backgroundColor: gsap.utils.random(colors),
        pointerEvents: 'none', zIndex: 50,
      });
      const angle = gsap.utils.random(-140, -40) * (Math.PI / 180);
      const speed = gsap.utils.random(60, 180);
      const tx = ox + Math.cos(angle) * speed;
      const ty = oy + Math.sin(angle) * speed;
      gsap.to(p, {
        x: tx, y: ty, rotation: gsap.utils.random(-120, 120), duration: 0.4, ease: 'power2.out',
        onComplete: () => {
          gsap.to(p, { y: ty + gsap.utils.random(100, 200), x: tx + gsap.utils.random(-30, 30), opacity: 0, scale: 0.2, duration: 0.65, ease: 'sine.in', onComplete: () => p.remove() });
        },
      });
    }
  };

  const scrollVelocity = useRef(0);

  useLayoutEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    let isReducedMotion = mq.matches;
    
    const handleMotionChange = (e: MediaQueryListEvent) => {
      isReducedMotion = e.matches;
    };
    mq.addEventListener('change', handleMotionChange);

    const rings = [
      { rx: 0, ry: 0, speed: 0 },
      { rx: 0, ry: 0, speed: 0 },
      { rx: 0, ry: 0, speed: 0 },
      { rx: 0, ry: 0, speed: 0 },
    ];

    const ringStats = HERO_MEMORY_FRAGMENTS.reduce((acc, fragment) => {
      const ring = fragment.ring || 0;
      acc.counts[ring] = (acc.counts[ring] || 0) + 1;
      acc.localIndexes.push(acc.counts[ring] - 1);
      return acc;
    }, { counts: [] as number[], localIndexes: [] as number[] });


    const handleResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw < 768;
      
      // Calculate a single uniform scaling factor based on the viewport to maintain a perfect circle shape.
      const scale = isMobile 
        ? Math.max(vw / 768, vh / 812, 0.6) 
        : Math.max(vw / 1440, vh / 900, 0.8);

      // Base speed constant (adjust to make overall rotation faster/slower)
      const BASE_SPEED = 72;

      // Ring 0: Core ring under the fog
      rings[0].rx = (isMobile ? 88 : 160) * scale;
      rings[0].ry = rings[0].rx;
      rings[0].speed = BASE_SPEED / rings[0].rx;

      // Ring 1: Inner ring (perfect circle)
      rings[1].rx = (isMobile ? 180 : 320) * scale;
      rings[1].ry = rings[1].rx;
      rings[1].speed = BASE_SPEED / rings[1].rx;
      
      // Ring 2: Middle ring (perfect circle)
      rings[2].rx = (isMobile ? 290 : 500) * scale;
      rings[2].ry = rings[2].rx;
      rings[2].speed = BASE_SPEED / rings[2].rx;
      
      // Ring 3: Outer ring (perfect circle)
      rings[3].rx = (isMobile ? 420 : 700) * scale;
      rings[3].ry = rings[3].rx;
      rings[3].speed = BASE_SPEED / rings[3].rx;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const handleWheel = (e: WheelEvent) => {
      // Add to scroll velocity. Downward scroll adds positive velocity (speeds up clockwise)
      scrollVelocity.current += e.deltaY * 0.05; 
    };

    window.addEventListener('wheel', handleWheel, { passive: true });

    const updateOrbit = () => {
      if (!isReducedMotion) {
        // Apply normal time progress + scroll acceleration
        globalTime.current += 1 + scrollVelocity.current;
        // Smoothly decay the scroll velocity back to 0 (friction)
        scrollVelocity.current *= 0.92;
      }

      const globalSuction = sharedState.current.suction || 0;
      const c4 = sharedState.current.c4Progress || 0;
      const totalCards = cardsRef.current.length;

      const masonryCells = virtualUIRef.current?.querySelectorAll('.masonry-cell');
      
      let orbitRect: DOMRect | null = null;
      const orbitEl = document.querySelector('.orbit-center');
      if (orbitEl) {
        orbitRect = orbitEl.getBoundingClientRect();
      }

      // Pre-calculate target coordinates to prevent layout thrashing
      const targets: {x: number, y: number, w: number, h: number, r: number}[] = [];
      for (let i = 0; i < totalCards; i++) {
        let tx = 0;
        let ty = 0;
        let tw = HERO_MEMORY_FRAGMENTS[i].width;
        let th = HERO_MEMORY_FRAGMENTS[i].width * 0.85;
        const tr = 0; // The grid is beautifully aligned, no rotation

        if (masonryCells && masonryCells[i] && orbitRect) {
          const cellRect = masonryCells[i].getBoundingClientRect();
          tx = (cellRect.left + cellRect.width / 2) - (orbitRect.left + orbitRect.width / 2);
          ty = (cellRect.top + cellRect.height / 2) - (orbitRect.top + orbitRect.height / 2);
          tw = cellRect.width;
          th = cellRect.height;
        }
        targets.push({ x: tx, y: ty, w: tw, h: th, r: tr });
      }

      cardsRef.current.forEach((card, i) => {
        if (!card) return;
        const fragment = HERO_MEMORY_FRAGMENTS[i];
        if (!fragment) return;

        card.style.display = 'flex';

        const ringConfig = rings[fragment.ring];
        const currentAngleDeg = fragment.angle + (globalTime.current * ringConfig.speed);
        const rad = (currentAngleDeg * Math.PI) / 180;

        const x = Math.cos(rad) * ringConfig.rx;
        const y = Math.sin(rad) * ringConfig.ry;

        const angleToCenterRad = Math.atan2(-y, -x);
        const angleToCenterDeg = angleToCenterRad * (180 / Math.PI);
        const baseRotation = angleToCenterDeg;

        // Spread the tornado sequence over 0.7 of the suction process
        // This creates a long, pronounced 3D spiral as inner cards reach the UI 
        // while outer cards haven't even moved yet.
        const delay = (i / totalCards) * 0.7; 
        let cardSuction = (globalSuction - delay) / 0.3;
        cardSuction = Math.max(0, Math.min(1, cardSuction));
        // Smoothstep easing for a cinematic pull
        cardSuction = cardSuction * cardSuction * (3 - 2 * cardSuction);

        const target = targets[i];
        const targetX = target.x;
        const targetY = target.y;
        const targetW = target.w;
        const targetH = target.h;
        const targetRotation = target.r;

        let finalX = x * (1 - cardSuction) + targetX * cardSuction;
        let finalY = y * (1 - cardSuction) + targetY * cardSuction;
        let finalW = fragment.width * (1 - cardSuction) + targetW * cardSuction;
        let finalH = (fragment.width * 0.85) * (1 - cardSuction) + targetH * cardSuction;
        let finalR = (baseRotation + (fragment.tilt || 0)) * (1 - cardSuction) + targetRotation * cardSuction;
        
        let finalS = 1; // Default scale is 1, we animate w/h instead!
        const orbitReveal = sharedState.current.orbitReveal ?? 1;
        const ringCount = ringStats.counts[fragment.ring] || 1;
        const localIndex = ringStats.localIndexes[i] || 0;
        const localProgress = ringCount > 1 ? localIndex / (ringCount - 1) : 0;
        const ringRevealDelay = fragment.ring * 0.2;
        const cardRevealDelay = localProgress * 0.08;
        let cardReveal = (orbitReveal - ringRevealDelay - cardRevealDelay) / 0.36;
        cardReveal = Math.max(0, Math.min(1, cardReveal));
        cardReveal = cardReveal * cardReveal * (3 - 2 * cardReveal);
        let opacityReveal = (cardReveal - 0.08) / 0.92;
        opacityReveal = Math.max(0, Math.min(1, opacityReveal));
        opacityReveal = opacityReveal * opacityReveal * (3 - 2 * opacityReveal);

        if (cardSuction <= 0.01) {
          const spiralTightness = 0.12 + fragment.ring * 0.035;
          finalX *= spiralTightness + (1 - spiralTightness) * cardReveal;
          finalY *= spiralTightness + (1 - spiralTightness) * cardReveal;
          finalR += (1 - cardReveal) * (170 + fragment.ring * 38);
          finalW *= 0.5 + 0.5 * cardReveal;
          finalH *= 0.5 + 0.5 * cardReveal;
        }

        let finalOpacity = fragment.opacity * opacityReveal;
        let finalBlur = 0;

        // In Chapter 1 (suction), they become neat grid cards
        if (cardSuction > 0) {
          finalOpacity = (fragment.opacity * (1 - cardSuction) + 1.0 * cardSuction) * opacityReveal; // fully opaque in grid
          finalBlur = 0; // Clear and crisp!
        }

        // Apply Chapter 1 Fade Out (Plan A: Completely clean background)
        const c1Blur = sharedState.current.c1BlurProgress || 0;
        if (c1Blur > 0) {
          finalOpacity = finalOpacity * (1 - c1Blur); // Fade out to 0
          // No blur needed since they disappear
        }

        // Apply Chapter 4 fade out
        if (c4 > 0) {
          finalOpacity = finalOpacity * (1 - c4);
          finalS = finalS * (1 - c4) + (finalS * 0.7) * c4; // scale down to 0.7
        }

        gsap.set(card, {
          x: finalX,
          y: finalY,
          width: finalW,
          height: finalH,
          xPercent: -50,
          yPercent: -50,
          rotation: finalR,
          scale: finalS,
          opacity: finalOpacity,
          filter: `blur(${finalBlur}px)`
        });
      });

      const logoReveal = Math.max(0, Math.min(1, sharedState.current.logoReveal ?? 0));
      if (flapRef.current) {
        gsap.set(flapRef.current, {
          rotationX: -90 + (90 * logoReveal),
          opacity: logoReveal,
          visibility: logoReveal > 0.01 ? 'visible' : 'hidden'
        });
      }
      if (logoPathRef.current) {
        gsap.set(logoPathRef.current, {
          strokeDashoffset: logoPathLength.current * (1 - logoReveal)
        });
      }
    };

    gsap.ticker.add(updateOrbit);

    // Flap and Logo animation
    gsap.set(flapRef.current, { 
      rotationX: -90, 
      transformOrigin: "50% 100%", // Bottom center
      opacity: 0,
      visibility: 'hidden'
    });

    const pathLength = logoPathRef.current?.getTotalLength() || 1000;
    logoPathLength.current = pathLength;
    gsap.set(logoPathRef.current, { 
      strokeDasharray: pathLength, 
      strokeDashoffset: pathLength 
    });

    return () => {
      mq.removeEventListener('change', handleMotionChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('wheel', handleWheel);
      gsap.ticker.remove(updateOrbit);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="chapter-content chapter-0-content">
      <div className="cosmos-orbit-field" aria-hidden="true">
        <div className="orbit-center">
          {HERO_MEMORY_FRAGMENTS.map((fragment, index) => {
            return (
              <div
                key={fragment.id}
                ref={el => { cardsRef.current[index] = el; }}
                className="hero-memory-card cosmos-thumb is-image"
                style={{
                  width: fragment.width,
                  height: fragment.width * 0.85,
                  opacity: fragment.opacity,
                }}
                data-original-opacity={fragment.opacity}
              >
                {fragment.image && (
                  <img src={fragment.image} alt="" className="cosmos-thumb-img" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="cosmos-center-block">
        <div className="hero-dot" style={{ background: 'transparent', boxShadow: 'none', marginBottom: '60px' }}>
          <LogoIcon 
            size={80} 
            className="hero-anim-logo" 
            pathRef={logoPathRef} 
            style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-51%, -55%)', 
              color: 'var(--text-primary)' 
            }}
          />
          <div className="envelope-flap" ref={flapRef}>
            <svg 
              className="flap-stroke-svg" 
              viewBox="0 0 200 100" 
              preserveAspectRatio="none"
              style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
            >
              <polyline 
                points="0,100 100,0 200,100" 
                fill="none" 
                vectorEffect="non-scaling-stroke"
                className="flap-stroke-line"
              />
            </svg>
          </div>
        </div>
        <h1 className="cosmos-main-title hero-title-threshold" ref={heroTitleRef}>
          <span className="hero-title-line">
            {t.landing.heroLine1.split('').map((ch, i) => <span key={i} className="fountain-char" onClick={createLetterSplash}>{ch}</span>)}
          </span>
          <span className="hero-title-line">
            {t.landing.heroLine2.split('').map((ch, i) => <span key={i} className="fountain-char" onClick={createLetterSplash}>{ch}</span>)}
          </span>
        </h1>
        <p className="cosmos-subtitle gsap-desc-hero">
          {t.landing.heroSubtitle}
        </p>
      </div>

      <div className="cosmos-scroll-hint">
        <span className="hint-text">向下滑动，看灵感如何归入 The Stack</span>
      </div>
    </div>
  );
};
