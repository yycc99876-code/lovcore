import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, Moon, Sun, ArrowUp, ArrowDown, Download, X } from 'lucide-react';
import { LogoIcon } from '../LogoIcon';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextPlugin } from 'gsap/TextPlugin';
import { CanvasGrainNoise, calculateMagneticPull } from '../../lib/aesthetic';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';

import type { LandingPageProps, LandingStep } from './landing-types';
import { SEARCH_DEMO } from './landing-types';
import { HeroScene } from './scenes/HeroScene';
import { CaptureScene } from './scenes/CaptureScene';
import { OrganizeScene } from './scenes/OrganizeScene';
import { SerendipityScene } from './scenes/SerendipityScene';
import { CTAScene } from './scenes/CTAScene';
import { VirtualMockUI } from './VirtualMockUI';

import '../LandingPage.css'; // Adjust the import path for CSS

gsap.registerPlugin(ScrollTrigger, TextPlugin);

const CHAPTER_TARGET_TIMES: Record<number, number> = {
  0: 0,
  1: 11.45,
  2: 15.05,
  3: 20.9,
  4: 25.9,
};

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter, isDark, onThemeToggle }) => {
  const { t } = useTranslation();
  const { signIn, signUp, resetPassword } = useAuth();

  /* 閳光偓閳光偓 Auth 閳光偓閳光偓 */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  /* 閳光偓閳光偓 Chapter 閳光偓閳光偓 */
  const [currentStep, setCurrentStep] = useState<LandingStep>(0);
  const currentStepRef = useRef<LandingStep>(0);

  /* 鈹€ Ghost typing 鈹€ */
  const [cursorVisible, setCursorVisible] = useState(true);

  /* ─ Search typing ─ */
  const [searchTyped, setSearchTyped] = useState('');
  const [capturedText, setCapturedText] = useState<string | null>(null);

  // Disable interaction scroll locks since the demos now play automatically
  const interactionLocksRef = useRef({ capture: false, swipe: false });


  const unlockCapture = useCallback((text: string) => {
    setCapturedText(text);
    interactionLocksRef.current.capture = false;
  }, []);



  /* 閳光偓閳光偓 Responsive 閳光偓閳光偓 */
  /* 鈹€ Responsive 鈹€ */
  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isQuickNoteExpanded, setIsQuickNoteExpanded] = useState(false);

  /* 鈹€ Refs 鈹€ */
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollSpacerRef = useRef<HTMLDivElement>(null);
  const noiseCanvasRef = useRef<HTMLCanvasElement>(null);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  // cardRefs was removed, orbit fragments are managed in HeroScene
  const magnetContainerRef = useRef<HTMLDivElement>(null);
  const magnetBtnRef = useRef<HTMLButtonElement>(null);
  const virtualUIRef = useRef<HTMLDivElement>(null);

  // Shared state to communicate scroll-driven suction progress to HeroScene's requestAnimationFrame
  const sharedState = useRef({
    suction: 0,
    c4Progress: 0,
    c1BlurProgress: 0,
    orbitReveal: 0,
    logoReveal: 0
  });

  // dynamicCards is removed as we now use HeroScene fragments directly.

  /* 閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵?
     Particles & Interaction
     閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵?*/
  // particles logic removed





  /* Ghost Typing & Cursor */
  useEffect(() => {
    if (currentStep !== 1 || isMobile) return;
    let ci = 0;
    setSearchTyped(''); // eslint-disable-line react-hooks/set-state-in-effect
    const iv = setInterval(() => {
      if (ci < SEARCH_DEMO.length) { setSearchTyped(SEARCH_DEMO.substring(0, ci + 1)); ci++; }
      else clearInterval(iv);
    }, 65);
    return () => clearInterval(iv);
  }, [currentStep, isMobile]);

  useEffect(() => {
    const iv = setInterval(() => setCursorVisible(p => !p), 530);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!isAuthModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAuthModalOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isAuthModalOpen]);

  /* Responsive & Reduced Motion */
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    onResize();
    window.addEventListener('resize', onResize);
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => { window.removeEventListener('resize', onResize); mq.removeEventListener('change', sync); };
  }, []);

  /* Magnetic Button */
  useEffect(() => {
    if (isMobile) return;
    const c = magnetContainerRef.current, b = magnetBtnRef.current;
    if (!c || !b) return;
    const onMove = (e: MouseEvent) => {
      const r = c.getBoundingClientRect();
      const pull = calculateMagneticPull(e.clientX - r.left, e.clientY - r.top, r.width, r.height, 80, 0.5);
      gsap.to(b, { x: pull.x, y: pull.y, duration: 0.3, ease: 'power2.out' });
    };
    const onLeave = () => gsap.to(b, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1.2,0.4)' });
    c.addEventListener('mousemove', onMove);
    c.addEventListener('mouseleave', onLeave);
    return () => { c.removeEventListener('mousemove', onMove); c.removeEventListener('mouseleave', onLeave); };
  }, [isMobile]);

  /* Grain Noise */
  useEffect(() => {
    const canvas = noiseCanvasRef.current;
    if (!canvas) return;
    const grain = new CanvasGrainNoise(canvas, { opacity: 0.035 });
    grain.start();
    return () => grain.destroy();
  }, []);

  /* Navigation */
  const scrollToChapter = (ch: number) => {
    if (ch < 0 || ch > 4) return;
    if (isMobile) { document.querySelector(`.narrative-slide:nth-child(${ch + 1})`)?.scrollIntoView({ behavior: 'smooth' }); return; }
    const trigger = ScrollTrigger.getById('mainScrollTrigger');
    if (!trigger) return;
    const { start, end } = trigger;
    const animationDuration = trigger.animation?.duration() || 1;
    const targetTime = CHAPTER_TARGET_TIMES[ch] ?? (ch / 4) * animationDuration;
    const target = start + (targetTime / animationDuration) * (end - start);
    window.scrollTo({ top: target, behavior: 'smooth' });
  };

  /* 閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵?
     GSAP Master Timeline & Pinning
     閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵鎰ㄦ櫜閽版劏鏅查挵?*/
  useEffect(() => {
    if (isMobile || reducedMotion) {
      setCurrentStep(0); // eslint-disable-line react-hooks/set-state-in-effect
      currentStepRef.current = 0;
      setIsQuickNoteExpanded(false);
      return;
    }
    if (!containerRef.current || !scrollSpacerRef.current || !virtualUIRef.current) return;

    let localQuickNoteExpanded = false;
    const quickNoteHold = {
      startTime: 12.1,
      endTime: 14.8,
      durationMs: 2800,
      startedAt: 0,
      released: false,
      correcting: false,
    };
    let driveQuickNoteHold: (() => void) | null = null;

    const ctx = gsap.context(() => {
      // Pin the Virtual UI during chapters 1-4
      ScrollTrigger.create({
        id: 'virtualUIPin',
        trigger: scrollSpacerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        pin: virtualUIRef.current,
        pinSpacing: false,
      });

      // mockCards GSAP set removed

      gsap.set('.chapter-0-content', { opacity: 1 });
      gsap.set('.hero-dot', { scale: 0, opacity: 0 });
      gsap.set('.fountain-char', { opacity: 0, y: 40, rotationX: -90 });
      gsap.set('.hero-memory-card', { opacity: 0, y: 28, scale: 0.92, filter: 'blur(8px)' });
      gsap.set('.virtual-mock-ui-glass', { opacity: 0, scale: 0.95, y: 40 });
      gsap.set('.gsap-desc-hero', { opacity: 0, y: 20 });
      gsap.set('.chapter0-search-caret', { opacity: 0 });
      gsap.set('.chapter0-search-result-layer', { autoAlpha: 0 });
      gsap.set('.chapter0-result-card', { autoAlpha: 0, scale: 0.82, y: 18 });
      gsap.set('.chapter0-detail-overlay', { autoAlpha: 0 });
      gsap.set('.chapter0-detail-image-panel', { x: -28, opacity: 0 });
      gsap.set('.chapter0-detail-info-panel', { x: 36, opacity: 0 });
      gsap.set('.chapter0-prologue-copy', { autoAlpha: 0 });
      gsap.set('.mock-detail-drawer', { autoAlpha: 0, x: '100%' });
      gsap.set('.ch2-folio-demo', { autoAlpha: 0 });
      gsap.set('.ch2-color-modal', { autoAlpha: 0, scale: 0.88 });
      gsap.set('.ch2-folio-card-new', { autoAlpha: 0, y: 18, scale: 0.86 });
      gsap.set('.ch2-folio-delete', { autoAlpha: 0 });
      gsap.set('.ch2-stack-counter', { autoAlpha: 0 });
      gsap.set('.ch3-echo-demo', { autoAlpha: 0 });
      gsap.set('.ch3-echo-back, .ch3-sound-pill, .ch3-action-pill', { autoAlpha: 0, y: 10 });
      gsap.set('.ch3-bg-card', { autoAlpha: 0, scale: 0.72 });
      gsap.set('.ch3-main-card-a', { autoAlpha: 0, xPercent: -50, yPercent: -50, x: 0, y: 20, rotation: 0, scale: 0.86 });
      gsap.set('.ch3-main-card-b', { autoAlpha: 0, xPercent: -50, yPercent: -50, x: 0, y: 24, rotation: -3, scale: 0.86 });
      gsap.set('.ch3-action-bg', { opacity: 0, x: 0, width: 92 });

      // Entrance animation
      const entry = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          document.querySelectorAll('.hero-memory-card').forEach(el => el.classList.add('is-interactive'));
        }
      });
      entry
        .to('.hero-dot', { scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(2)' })
        .to('.hero-dot', { scale: 1.5, opacity: 0.5, duration: 0.5, yoyo: true, repeat: 2, ease: 'sine.inOut' })
        .to('.fountain-char', { opacity: 1, y: 0, rotationX: 0, duration: 0.8, stagger: 0.045, ease: 'back.out(1.45)' }, '-=0.25')
        .to('.gsap-desc-hero', { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.2')
        .to(sharedState.current, { orbitReveal: 1, duration: 3.0, ease: 'power2.out' }, '+=1.0')
        .to(sharedState.current, { logoReveal: 1, duration: 1.3, ease: 'power3.out' }, '+=1.0');

      // Scroll Narrative Timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          id: 'mainScrollTrigger',
          trigger: scrollSpacerRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
          onUpdate: (self) => {
            const p = self.progress;
            const duration = tl.duration() || 1;
            const targetTime = p * duration;

            if (targetTime < quickNoteHold.startTime - 0.15) {
              quickNoteHold.startedAt = 0;
              quickNoteHold.released = false;
            }

            if (
              !quickNoteHold.correcting &&
              !quickNoteHold.released &&
              targetTime >= quickNoteHold.startTime &&
              self.direction >= 0
            ) {
              if (!quickNoteHold.startedAt) {
                quickNoteHold.startedAt = performance.now();
              }

              const elapsed = performance.now() - quickNoteHold.startedAt;
              const holdProgress = Math.min(elapsed / quickNoteHold.durationMs, 1);
              const allowedTime = quickNoteHold.startTime + (quickNoteHold.endTime - quickNoteHold.startTime) * holdProgress;

              if (holdProgress >= 1) {
                quickNoteHold.released = true;
              } else if (targetTime > allowedTime) {
                const targetScroll = self.start + (allowedTime / duration) * (self.end - self.start);
                quickNoteHold.correcting = true;
                self.scroll(targetScroll);
                quickNoteHold.correcting = false;
                return;
              }
            }

            // Block at Chapter 1
            if (interactionLocksRef.current.capture && p > 0.25) {
               self.scroll(self.start + 0.25 * (self.end - self.start));
               return; // Skip step calculation to keep it locked
            }

            // Block at Chapter 3
            if (interactionLocksRef.current.swipe && p > 0.65) {
               self.scroll(self.start + 0.65 * (self.end - self.start));
               return; // Skip step calculation to keep it locked
            }

            const displayTime = targetTime;
            let nextStep: LandingStep;

            if (displayTime < 11.0) {
              nextStep = 0; // Phase 0
            } else if (displayTime >= 11.0 && displayTime < 14.8) {
              nextStep = 1; // Phase 1
            } else if (displayTime >= 14.8 && displayTime < 20.6) {
              nextStep = 2; // Phase 2
            } else if (displayTime >= 20.6 && displayTime < 25.6) {
              nextStep = 3; // Phase 3
            } else {
              nextStep = 4; // Phase 4
            }

            if (currentStepRef.current !== nextStep) {
              currentStepRef.current = nextStep;
              setCurrentStep(nextStep);
            }

            const nextQuickNoteExpanded = displayTime >= 12.1 && displayTime < 14.8;
            if (localQuickNoteExpanded !== nextQuickNoteExpanded) {
              localQuickNoteExpanded = nextQuickNoteExpanded;
              setIsQuickNoteExpanded(nextQuickNoteExpanded);
            }
          },
        },
      });

      // Threshold -> Capture
      // 1. Flap flips down like a page and text fades out (0 to 0.15)
      tl.fromTo('.envelope-flap',
        { rotationX: 0, opacity: 0.3 },
        { rotationX: -180, opacity: 0, duration: 0.15, immediateRender: false, ease: 'power2.in' },
        0
      );
      tl.to('.cosmos-center-block', { opacity: 0, duration: 0.15 }, 0);
      tl.to('.cosmos-scroll-hint', { opacity: 0, duration: 0.1 }, 0);

      // 2. The main Stack Card (Mock UI Glass) springs up from the bottom (0.05 to 0.25)
      tl.fromTo('.virtual-mock-ui-glass',
        { y: window.innerHeight * 0.8, scale: 0.5, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: 0.2, ease: 'back.out(1.5)' },
        0.05
      );

      // Ensure chapter-0-content doesn't block clicks, but don't hide it so the orbit field can be animated!
      tl.set('.chapter-0-content', { pointerEvents: 'none' }, 0.20);

      // The Tornado Effect!
      // As the user scrubs from 0.15 to 3.65, the orbit cards get sucked into the center.
      // We use 'none' ease so the 3D tornado is completely 1:1 responsive to the scroll wheel.
      // It spans almost the entire 800vh scroll!
      tl.to(sharedState.current, { suction: 1, duration: 3.5, ease: 'none' }, 0.15);
      tl.to('.chapter0-prologue-copy', { autoAlpha: 1, duration: 0.55, ease: 'power2.out' }, 3.55);

      // --- Chapter 0: Search -> Leaf result -> Detail preview ---
      tl.fromTo('.virtual-cursor-main',
        { opacity: 0, x: '82%', y: '78%', scale: 1 },
        { opacity: 1, x: '126px', y: '18px', duration: 0.45, ease: 'power2.out' },
        4.0
      );
      tl.to('.virtual-cursor-main', { scale: 0.78, duration: 0.06 }, 4.48);
      tl.to('.virtual-cursor-main', { scale: 1, duration: 0.06 }, 4.54);
      tl.to('.mock-ui-search-bar', {
        boxShadow: '0 0 0 1px rgba(227, 89, 76, 0.26), 0 10px 28px rgba(227, 89, 76, 0.08)',
        backgroundColor: 'rgba(255, 255, 255, 0.72)',
        duration: 0.18
      }, 4.48);
      tl.set('.chapter0-search-caret', { opacity: 1 }, 4.55);
      tl.to('.search-bar-typed', { text: 'translucent_leaves', opacity: 1, duration: 0.85, ease: 'none' }, 4.65);

      tl.to('.chapter0-search-result-layer', { autoAlpha: 1, duration: 0.35, ease: 'power2.out' }, 5.45);
      tl.to(sharedState.current, { c1BlurProgress: 1, duration: 0.35, ease: 'power2.out' }, 5.45);
      tl.to('.virtual-cursor-main', { x: '340px', y: '402px', duration: 0.78, ease: 'power2.out' }, 5.48);
      tl.to('.chapter0-result-card', { autoAlpha: 1, scale: 1, y: 0, duration: 0.45, ease: 'back.out(1.25)' }, 5.58);

      tl.to('.chapter0-result-card', { scale: 1.025, duration: 0.18, ease: 'power2.out' }, 6.22);
      tl.to('.virtual-cursor-main', { scale: 0.78, duration: 0.06 }, 6.42);
      tl.to('.chapter0-result-card', { scale: 0.98, duration: 0.06, ease: 'power2.out' }, 6.42);
      tl.to('.virtual-cursor-main', { scale: 1, duration: 0.06 }, 6.50);
      tl.to('.chapter0-result-card', { scale: 1, duration: 0.16, ease: 'back.out(1.6)' }, 6.50);

      tl.to('.chapter0-detail-overlay', { autoAlpha: 1, duration: 0.34, ease: 'power2.out' }, 6.78);
      tl.to('.chapter0-detail-image-panel', { x: 0, opacity: 1, duration: 0.42, ease: 'power3.out' }, 6.89);
      tl.to('.chapter0-detail-info-panel', { x: 0, opacity: 1, duration: 0.42, ease: 'power3.out' }, 6.93);

      tl.to('.virtual-cursor-main', { x: '34px', y: 'calc(50% + 8px)', duration: 0.48, ease: 'power2.out' }, 8.95);
      tl.to('.virtual-cursor-main', { scale: 0.78, duration: 0.06 }, 9.45);
      tl.to('.virtual-cursor-main', { scale: 1, duration: 0.06 }, 9.51);

      tl.to('.chapter0-detail-info-panel', { x: 36, opacity: 0, duration: 0.25, ease: 'power2.in' }, 9.58);
      tl.to('.chapter0-detail-image-panel', { x: -28, opacity: 0, duration: 0.25, ease: 'power2.in' }, 9.58);
      tl.to('.chapter0-detail-overlay', { autoAlpha: 0, duration: 0.2 }, 9.78);
      tl.to('.chapter0-result-card', { autoAlpha: 0, scale: 0.9, y: 10, duration: 0.25, ease: 'power2.in' }, 9.82);
      tl.to('.chapter0-search-result-layer', { autoAlpha: 0, duration: 0.25 }, 9.88);
      tl.to(sharedState.current, { c1BlurProgress: 0, duration: 0.35, ease: 'power2.out' }, 9.88);
      tl.to('.search-bar-typed', { text: 'Search memories...', opacity: 0.5, duration: 0.18 }, 9.92);
      tl.set('.chapter0-search-caret', { opacity: 0 }, 10.05);
      tl.to('.mock-ui-search-bar', { boxShadow: 'none', duration: 0.18, clearProps: 'backgroundColor,boxShadow' }, 10.05);
      tl.to('.virtual-cursor-main', { opacity: 0, duration: 0.18 }, 10.12);
      tl.to('.chapter0-prologue-copy', { autoAlpha: 0, duration: 0.34, ease: 'power2.inOut' }, 10.22);
      tl.set('.mock-detail-drawer', { autoAlpha: 0, x: '100%' }, 10.2);
      tl.set('.chapter0-detail-overlay, .chapter0-search-result-layer, .chapter0-result-card', { autoAlpha: 0 }, 10.75);

      // --- CHAPTER 1 ---
      // 2. Scroll once: Left text appears
      tl.fromTo('.chapter-1-content', { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.3 }, 11.0);

      // Huge pause for reading

      // 3. Cursor moves to Quick Note
      tl.fromTo('.virtual-cursor-element',
        { opacity: 0, x: '80%', y: '80%' },
        { opacity: 1, x: 'calc(50% - 38px)', y: '84px', duration: 0.2, ease: 'power2.out' },
        11.8
      );
      // Click simulation (press down)
      tl.to('.virtual-cursor-element', { scale: 0.8, duration: 0.03 }, 12.05);
      tl.to('.qn-expand-btn', { scale: 0.8, duration: 0.03, transformOrigin: 'center' }, 12.05);
      // Release click
      tl.to('.virtual-cursor-element', { scale: 1, duration: 0.05 }, 12.08);
      tl.to('.qn-expand-btn', { scale: 1, duration: 0.05 }, 12.08);
      // Cursor fades out and moves away
      tl.to('.virtual-cursor-element', { opacity: 0, x: 'calc(50% - 20px)', y: '100px', duration: 0.1 }, 12.13);

      // 4. Quick Note expands & Images disappear
      tl.to(sharedState.current, { c1BlurProgress: 1, duration: 0.4, ease: 'power2.out' }, 12.1);

      // Chapter 1 -> Chapter 2 (Organize)
      tl.to('.chapter-1-content', { opacity: 0, x: -40, duration: 0.4 }, 14.8);
      tl.fromTo('.chapter-2-content', { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.4 }, 15.0);

      // Chapter 2: Folio collection demo
      tl.to('.quick-note-widget', { autoAlpha: 0, scale: 0.92, duration: 0.35, ease: 'power2.inOut' }, 14.8);
      tl.to('.ch2-folio-demo', { autoAlpha: 1, duration: 0.45, ease: 'power2.out' }, 14.95);
      tl.fromTo('.ch2-folio-heading, .ch2-folio-rule, .ch2-folio-card-primary',
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.42, stagger: 0.08, ease: 'power3.out' },
        15.05
      );
      tl.to('.virtual-mock-ui-glass > .virtual-cursor-main', { opacity: 1, x: '34px', y: '206px', duration: 0.2, ease: 'power2.out' }, 15.3);
      tl.to('.virtual-mock-ui-glass > .virtual-cursor-main', { x: '464px', y: '132px', duration: 0.75, ease: 'power2.inOut' }, 15.48);
      tl.to('.virtual-mock-ui-glass > .virtual-cursor-main', { scale: 0.78, duration: 0.06 }, 16.24);
      tl.to('.ch2-create-folio', { scale: 0.96, duration: 0.06, transformOrigin: 'center' }, 16.24);
      tl.to('.virtual-mock-ui-glass > .virtual-cursor-main', { scale: 1, duration: 0.08 }, 16.32);
      tl.to('.ch2-create-folio', { scale: 1, duration: 0.12, ease: 'back.out(1.6)' }, 16.32);
      tl.to('.ch2-color-modal', { autoAlpha: 1, scale: 1, duration: 0.42, ease: 'back.out(1.35)' }, 16.42);
      tl.to('.virtual-mock-ui-glass > .virtual-cursor-main', { x: '312px', y: '408px', duration: 0.5, ease: 'power2.inOut' }, 16.76);
      tl.to('.virtual-mock-ui-glass > .virtual-cursor-main', { scale: 0.78, duration: 0.06 }, 17.28);
      tl.to('.ch2-color-choice-1', { scale: 1.12, duration: 0.08, transformOrigin: 'center' }, 17.28);
      tl.to('.virtual-mock-ui-glass > .virtual-cursor-main', { scale: 1, duration: 0.08 }, 17.36);
      tl.to('.ch2-color-choice-1', { scale: 1, duration: 0.14, ease: 'back.out(1.7)' }, 17.36);
      tl.to('.virtual-mock-ui-glass > .virtual-cursor-main', { x: '294px', y: '660px', duration: 0.45, ease: 'power2.inOut' }, 17.58);
      tl.to('.virtual-mock-ui-glass > .virtual-cursor-main', { scale: 0.78, duration: 0.06 }, 18.06);
      tl.to('.ch2-save-folio', { scale: 0.96, duration: 0.06, transformOrigin: 'center' }, 18.06);
      tl.to('.virtual-mock-ui-glass > .virtual-cursor-main', { scale: 1, duration: 0.08 }, 18.14);
      tl.to('.ch2-save-folio', { scale: 1, duration: 0.12, ease: 'back.out(1.6)' }, 18.14);
      tl.to('.ch2-color-modal', { autoAlpha: 0, scale: 0.94, duration: 0.28, ease: 'power2.in' }, 18.24);
      tl.to('.ch2-folio-card-new', { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.45)' }, 18.38);
      tl.to('.ch2-folio-delete', { autoAlpha: 1, duration: 0.2 }, 18.48);
      tl.to('.virtual-mock-ui-glass > .virtual-cursor-main', { x: '92px', y: '308px', duration: 0.58, ease: 'power2.inOut' }, 18.42);
      tl.to('.ch2-folio-card-primary', { scale: 1.2, y: -10, duration: 0.32, ease: 'power3.out' }, 18.72);
      tl.to('.ch2-folio-card-primary .ch2-stack-counter', { autoAlpha: 1, duration: 0.18 }, 18.72);
      tl.to('.ch2-folio-card-primary .ch2-stack-counter', { text: '2/8', duration: 0.01 }, 19.0);
      tl.to('.ch2-folio-card-primary .ch2-stack-img-1', { opacity: 0.5, xPercent: -73, yPercent: -45, rotation: -5, scale: 0.78, zIndex: 1, duration: 0.28, ease: 'power3.out' }, 19.0);
      tl.to('.ch2-folio-card-primary .ch2-stack-img-2', { opacity: 1, xPercent: -58, yPercent: -50, rotation: -1, scale: 1.18, zIndex: 5, duration: 0.28, ease: 'back.out(1.25)' }, 19.0);
      tl.to('.ch2-folio-card-primary .ch2-stack-img-3', { opacity: 0.76, xPercent: -31, yPercent: -47, rotation: 4, scale: 0.86, zIndex: 3, duration: 0.28, ease: 'power3.out' }, 19.0);
      tl.to('.ch2-folio-card-primary .ch2-stack-counter', { text: '3/8', duration: 0.01 }, 19.38);
      tl.to('.ch2-folio-card-primary .ch2-stack-img-2', { opacity: 0.5, xPercent: -73, yPercent: -45, rotation: -5, scale: 0.78, zIndex: 1, duration: 0.28, ease: 'power3.out' }, 19.38);
      tl.to('.ch2-folio-card-primary .ch2-stack-img-3', { opacity: 1, xPercent: -58, yPercent: -50, rotation: -1, scale: 1.18, zIndex: 5, duration: 0.28, ease: 'back.out(1.25)' }, 19.38);
      tl.to('.ch2-folio-card-primary .ch2-stack-img-4', { opacity: 0.76, xPercent: -31, yPercent: -47, rotation: 4, scale: 0.86, zIndex: 3, duration: 0.28, ease: 'power3.out' }, 19.38);
      tl.to('.ch2-folio-card-primary .ch2-stack-counter', { text: '4/8', duration: 0.01 }, 19.88);
      tl.to('.ch2-folio-card-primary .ch2-stack-img-3', { opacity: 0.5, xPercent: -73, yPercent: -45, rotation: -5, scale: 0.78, zIndex: 1, duration: 0.28, ease: 'power3.out' }, 19.88);
      tl.to('.ch2-folio-card-primary .ch2-stack-img-4', { opacity: 1, xPercent: -58, yPercent: -50, rotation: -1, scale: 1.18, zIndex: 5, duration: 0.28, ease: 'back.out(1.25)' }, 19.88);
      tl.to('.ch2-folio-card-primary .ch2-stack-img-1', { opacity: 0.76, xPercent: -31, yPercent: -47, rotation: 4, scale: 0.86, zIndex: 3, duration: 0.28, ease: 'power3.out' }, 19.88);

      // Chapter 2 -> Chapter 3 (Serendipity)
      tl.to('.chapter-2-content', { opacity: 0, x: -40, duration: 0.4 }, 20.6);
      tl.to('.ch2-folio-demo', { autoAlpha: 0, duration: 0.32, ease: 'power2.inOut' }, 20.75);
      tl.to('.virtual-mock-ui-glass > .virtual-cursor-main', { opacity: 0, duration: 0.18 }, 20.75);
      tl.to('.virtual-mock-ui-glass', {
        backgroundColor: 'rgba(0, 135, 204, 0.12)',
        duration: 0.55,
      }, 20.6);
      tl.to('.mock-ui-header', { autoAlpha: 0, duration: 0.24 }, 20.65);
      tl.to('.ch3-echo-demo', { autoAlpha: 1, duration: 0.5, ease: 'power2.out' }, 20.78);
      tl.fromTo('.chapter-3-content', { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.42 }, 20.85);
      tl.to('.ch3-bg-card', { autoAlpha: 1, scale: 1, duration: 0.65, stagger: 0.08, ease: 'power3.out' }, 20.95);
      tl.to('.ch3-echo-back, .ch3-sound-pill, .ch3-action-pill', { autoAlpha: 1, y: 0, duration: 0.42, stagger: 0.06, ease: 'power2.out' }, 21.05);
      tl.to('.ch3-main-card-a', { autoAlpha: 1, y: 0, scale: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 24px 48px rgba(0,135,204,0.25)', duration: 0.7, ease: 'back.out(1.25)' }, 21.12);
      tl.to('.ch3-main-card-a', { x: 16, y: -10, rotation: 1.2, duration: 0.72, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 21.85);

      // Keep: right swipe lights the keep side, then the next card arrives.
      tl.to('.ch3-action-bg', { opacity: 1, x: 46, width: 98, backgroundColor: 'rgba(104, 184, 198, 0.44)', duration: 0.28, ease: 'power2.out' }, 22.45);
      tl.to('.ch3-action-keep', { color: 'rgba(41, 105, 118, 0.95)', scale: 1.08, duration: 0.24 }, 22.45);
      tl.to('.ch3-main-card-a', { x: 145, y: -18, rotation: 8, scale: 1.04, duration: 0.55, ease: 'power3.inOut' }, 22.5);
      tl.to('.ch3-main-card-a', { x: 360, opacity: 0, filter: 'blur(5px)', duration: 0.38, ease: 'power3.in' }, 22.95);
      tl.to('.ch3-action-bg', { opacity: 0, x: 0, duration: 0.24 }, 23.05);
      tl.to('.ch3-action-keep', { color: 'rgba(53, 57, 61, 0.7)', scale: 1, duration: 0.18 }, 23.05);
      tl.to('.ch3-main-card-b', { autoAlpha: 1, y: 0, rotation: -2, scale: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 24px 48px rgba(138,131,124,0.25)', duration: 0.58, ease: 'back.out(1.2)' }, 23.18);
      tl.to('.virtual-mock-ui-glass', {
        backgroundColor: 'rgba(138, 131, 124, 0.12)',
        duration: 0.58,
      }, 23.18);

      // Forget: left swipe shows the opposite decision.
      tl.to('.ch3-action-bg', { opacity: 1, x: -46, width: 98, backgroundColor: 'rgba(163, 150, 126, 0.38)', duration: 0.28, ease: 'power2.out' }, 24.0);
      tl.to('.ch3-action-forget', { color: 'rgba(105, 93, 72, 0.95)', scale: 1.08, duration: 0.24 }, 24.0);
      tl.to('.ch3-main-card-b', { x: -130, y: -12, rotation: -8, scale: 1.03, duration: 0.5, ease: 'power3.inOut' }, 24.05);
      tl.to('.ch3-main-card-b', { x: -350, opacity: 0, filter: 'blur(5px)', duration: 0.36, ease: 'power3.in' }, 24.48);
      tl.to('.ch3-action-bg', { opacity: 0, x: 0, duration: 0.22 }, 24.58);
      tl.to('.ch3-action-forget', { color: 'rgba(53, 57, 61, 0.7)', scale: 1, duration: 0.18 }, 24.58);
      tl.to('.ch3-main-card-a', { autoAlpha: 1, x: 0, y: 0, rotation: 0, scale: 0.96, filter: 'blur(0px)', boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 24px 48px rgba(0,135,204,0.25)', duration: 0.5, ease: 'power3.out' }, 24.8);
      tl.to('.virtual-mock-ui-glass', {
        backgroundColor: 'rgba(0, 135, 204, 0.12)',
        duration: 0.5,
      }, 24.8);

      // Chapter 3 -> CTA (Chapter 4)
      tl.to('.chapter-3-content', { opacity: 0, x: -40, duration: 0.4 }, 25.6);
      tl.to('.ch3-echo-demo', { autoAlpha: 0, duration: 0.45 }, 25.6);
      tl.to(sharedState.current, { c4Progress: 1, duration: 0.6 }, 25.6);
      tl.to('.virtual-mock-ui-glass', { opacity: 0, scale: 0.9, duration: 0.6 }, 25.6);
      tl.fromTo('.chapter-4-content', { opacity: 0, y: 60, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.2)' }, 25.8);

      driveQuickNoteHold = () => {
        const trigger = tl.scrollTrigger;
        if (!trigger || !quickNoteHold.startedAt || quickNoteHold.released || quickNoteHold.correcting) return;

        const duration = tl.duration() || 1;
        const targetTime = trigger.progress * duration;
        if (targetTime < quickNoteHold.startTime - 0.15) return;

        const elapsed = performance.now() - quickNoteHold.startedAt;
        const holdProgress = Math.min(elapsed / quickNoteHold.durationMs, 1);
        const allowedTime = quickNoteHold.startTime + (quickNoteHold.endTime - quickNoteHold.startTime) * holdProgress;
        const targetScroll = trigger.start + (allowedTime / duration) * (trigger.end - trigger.start);

        if (targetTime < allowedTime || holdProgress >= 1) {
          quickNoteHold.correcting = true;
          trigger.scroll(targetScroll);
          quickNoteHold.correcting = false;
        }

        if (holdProgress >= 1) {
          quickNoteHold.released = true;
        }
      };
      gsap.ticker.add(driveQuickNoteHold);
    }, containerRef);

    return () => {
      if (driveQuickNoteHold) gsap.ticker.remove(driveQuickNoteHold);
      ctx.revert();
    };
  }, [isMobile, reducedMotion]);

  /* Auth Forms */
  const handleVaultAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEntering) return;
    setAuthError(null);
    if (!email.trim()) { setAuthError(t.auth.errorEmailRequired); return; }

    if (authMode === 'reset') {
      setIsEntering(true);
      const r = await resetPassword(email.trim());
      setIsEntering(false);
      if (r.error) { setAuthError(r.error); return; }
      setResetSent(true);
      return;
    }

    if (!password) { setAuthError(t.auth.errorPasswordRequired); return; }
    if (password.length < 6) { setAuthError(t.auth.errorPasswordTooShort); return; }
    setIsEntering(true);

    if (authMode === 'signin') {
      const r = await signIn(email.trim(), password);
      if (r.error) { setAuthError(r.error); setIsEntering(false); return; }
    } else {
      const r = await signUp(email.trim(), password);
      if (r.error) { setAuthError(r.error); setIsEntering(false); return; }
      if (r.needsEmailConfirmation) { setAuthError(t.landing.emailConfirmationSent); setAuthMode('signin'); setIsEntering(false); return; }
    }
    setIsUnlocked(true);
    setTimeout(onEnter, 850);
  };

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthError(null);
    setResetSent(false);
    setIsAuthModalOpen(true);
  };

  const authModalTitle = authMode === 'signup'
    ? t.landing.authModalTitleSignUp
    : authMode === 'reset'
      ? t.landing.authModalTitleReset
      : t.landing.authModalTitleSignIn;

  const renderVaultForm = () => {
    if (authMode === 'reset' && resetSent) {
      return (
        <div className="vault-auth-toggle" style={{ marginTop: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{t.auth.resetSuccess}</p>
          <button type="button" className="vault-auth-toggle-btn" onClick={() => { setAuthMode('signin'); setResetSent(false); setAuthError(null); }}>
            {t.auth.backToSignIn}
          </button>
        </div>
      );
    }

    return (
      <form onSubmit={handleVaultAccess}>
        <div className="vault-portal-row">
          <span className="portal-brand-dot" />
          <input type="email" placeholder={t.auth.emailPlaceholder} aria-label="email" value={email} onChange={(e) => { setEmail(e.target.value); setAuthError(null); }} className="vault-pass-input" disabled={isEntering} autoComplete="email" />
        </div>
        {authMode !== 'reset' && (
          <div className="vault-portal-row">
            <span className="portal-brand-dot" />
            <input type="password" placeholder={t.auth.passwordPlaceholder} aria-label="password" value={password} onChange={(e) => { setPassword(e.target.value); setAuthError(null); }} className="vault-pass-input" disabled={isEntering} autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'} />
            <div className="magnet-btn-container" ref={!isMobile ? magnetContainerRef : undefined}>
              <button ref={!isMobile ? magnetBtnRef : undefined} type="submit" className="magnet-btn" disabled={isEntering}>
                <span>{authMode === 'signin' ? t.auth.signInBtn : t.auth.signUpBtn}</span>
                <span className="btn-red-dot" />
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}
        {authMode === 'reset' && (
          <div className="vault-portal-row">
            <div className="magnet-btn-container" ref={!isMobile ? magnetContainerRef : undefined}>
              <button ref={!isMobile ? magnetBtnRef : undefined} type="submit" className="magnet-btn" disabled={isEntering}>
                <span>{t.auth.resetBtn}</span>
                <span className="btn-red-dot" />
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}
        {authError && <div className="vault-auth-error">{authError}</div>}
        <div className="vault-auth-toggle">
          {authMode === 'signin' && (
            <button type="button" className="vault-auth-toggle-btn" onClick={() => { setAuthMode('reset'); setAuthError(null); setResetSent(false); }}>
              {t.auth.forgotPassword}
            </button>
          )}
          <button type="button" className="vault-auth-toggle-btn" onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError(null); setResetSent(false); }}>
            {authMode === 'signin' ? t.auth.toggleToSignUp : t.auth.toggleToSignIn}
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className={`gsap-landing-wrapper ${isUnlocked ? 'vault-unlocked' : ''} ${isDark ? 'dark-theme' : ''}`} ref={containerRef}>
      <canvas className="gsap-noise-canvas" ref={noiseCanvasRef} />

      {isMobile ? (
        <>
          {/* Mobile Header */}
          <header className="gsap-header floating-islands mobile-landing-header">
            <div className="gsap-header-logo-wrapper">
              <div className="gsap-logo">
                <LogoIcon size={30} className="gsap-logo-svg" />
                <span className="gsap-logo-text">LOVCORE</span>
              </div>
            </div>
            <div className="gsap-header-actions-wrapper">
              <a href="/downloads/lovcore-clipper.zip" className="download-extension-btn" download aria-label="Download browser extension">
                <Download size={14} />
                <span>{t.landing.downloadExtension}</span>
              </a>
              <button className="theme-toggle-icon" onClick={onThemeToggle} aria-label="Toggle theme">
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button type="button" className="login-text-btn" onClick={() => openAuthModal('signin')}>{t.landing.login}</button>
              <button type="button" className="signup-solid-btn" onClick={() => openAuthModal('signup')}>{t.landing.signup}</button>
            </div>
          </header>

          {isAuthModalOpen && (
            <div className="auth-modal-layer" role="presentation" onMouseDown={() => setIsAuthModalOpen(false)}>
              <div className="auth-modal-panel" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title" onMouseDown={(event) => event.stopPropagation()}>
                <div className="auth-modal-header">
                  <div>
                    <p className="auth-modal-kicker">LOVCORE</p>
                    <h2 id="auth-modal-title">{authModalTitle}</h2>
                  </div>
                  <button type="button" className="auth-modal-close" aria-label={t.landing.closeAuthModal} onClick={() => setIsAuthModalOpen(false)}>
                    <X size={18} />
                  </button>
                </div>
                <div className="auth-modal-body">{renderVaultForm()}</div>
              </div>
            </div>
          )}

          <main className="mobile-landing-flow">
            <section className="mobile-hero-section">
              <LogoIcon size={56} className="mobile-hero-logo" />
              <h1>{t.landing.heroLine1}<br />{t.landing.heroLine2}</h1>
              <p>{t.landing.heroSubtitle}</p>
              <button type="button" className="mobile-cta-btn" onClick={() => openAuthModal('signup')}>{t.landing.createMemory}</button>
            </section>

            <section className="mobile-feature-section">
              <p className="mobile-section-label">{t.landing.ch1Label}</p>
              <h2>{t.landing.captureTitle}</h2>
              <p>{t.landing.captureDesc}</p>
              <ul className="mobile-feature-list">
                <li><span className="mobile-feature-index">01</span><span>{t.landing.feature1}</span></li>
                <li><span className="mobile-feature-index">02</span><span>{t.landing.feature2}</span></li>
                <li><span className="mobile-feature-index">03</span><span>{t.landing.feature3}</span></li>
              </ul>
            </section>

            <section className="mobile-feature-section">
              <p className="mobile-section-label">{t.landing.organizeLabel}</p>
              <h2>{t.landing.organizeTitle}</h2>
              <p>{t.landing.organizeDesc}</p>
            </section>

            <section className="mobile-feature-section">
              <p className="mobile-section-label">{t.landing.ch3Label}</p>
              <h2>{t.landing.rediscoverTitle}</h2>
              <p>{t.landing.rediscoverDesc}</p>
            </section>

            <section className="mobile-auth-section">
              <h2>{t.landing.roomNotFeed}</h2>
              <div className="gsap-vault-panel">
                <div className="vault-card-body">{renderVaultForm()}</div>
              </div>
            </section>
          </main>

          <footer className="gsap-footer">
            <p>&copy; 2026 Lovcore. Saved quietly, recalled when needed.</p>
            <p style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--accent)' }} />
              <span>{t.landing.privateByDefault}</span>
            </p>
          </footer>
        </>
      ) : (
        <>
          {/* Desktop Header */}
          <header className="gsap-header floating-islands">
            <div className="gsap-header-logo-wrapper">
              <div className="gsap-logo">
                <LogoIcon size={30} className="gsap-logo-svg" />
                <span className="gsap-logo-text">LOVCORE</span>
              </div>
            </div>
            <div className="gsap-header-island island-center">
              <nav className="gsap-header-nav">
                <button type="button" className={`nav-link ${currentStep === 1 ? 'active' : ''}`} onClick={() => scrollToChapter(1)}>{t.landing.navCapture}</button>
                <button type="button" className={`nav-link ${currentStep === 2 ? 'active' : ''}`} onClick={() => scrollToChapter(2)}>{t.landing.navOrganize}</button>
                <button type="button" className={`nav-link ${currentStep === 3 ? 'active' : ''}`} onClick={() => scrollToChapter(3)}>{t.landing.navRediscover}</button>
              </nav>
            </div>
            <div className="gsap-header-actions-wrapper">
              <a href="/downloads/lovcore-clipper.zip" className="download-extension-btn" download aria-label="Download browser extension">
                <Download size={14} />
                <span>{t.landing.downloadExtension}</span>
              </a>
              <button className="theme-toggle-icon" onClick={onThemeToggle} aria-label="Toggle theme" title={isDark ? t.landing.themeLightTitle : t.landing.themeDarkTitle}>
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button type="button" className="login-text-btn" onClick={() => openAuthModal('signin')}>{t.landing.login}</button>
              <button type="button" className="signup-solid-btn" onClick={() => openAuthModal('signup')}>{t.landing.signup}</button>
            </div>
          </header>

          {isAuthModalOpen && (
            <div className="auth-modal-layer" role="presentation" onMouseDown={() => setIsAuthModalOpen(false)}>
              <div className="auth-modal-panel" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title" onMouseDown={(event) => event.stopPropagation()}>
                <div className="auth-modal-header">
                  <div>
                    <p className="auth-modal-kicker">LOVCORE</p>
                    <h2 id="auth-modal-title">{authModalTitle}</h2>
                  </div>
                  <button type="button" className="auth-modal-close" aria-label={t.landing.closeAuthModal} onClick={() => setIsAuthModalOpen(false)}>
                    <X size={18} />
                  </button>
                </div>
                <div className="auth-modal-body">{renderVaultForm()}</div>
              </div>
            </div>
          )}

          {/* Side nav */}
          {currentStep > 0 && (
            <div className="gsap-side-navigation">
              <div className="gsap-step-counter">
                <span className="current-step-num">{String(currentStep).padStart(2, '0')}</span>
                <span className="step-total">/ 05</span>
              </div>
              <div className="gsap-nav-dots">
                {[0, 1, 2, 3, 4].map(i => (
                  <button key={i} className={`gsap-nav-dot-btn ${currentStep === i ? 'active' : ''}`} onClick={() => scrollToChapter(i)} aria-label={`Chapter ${i}`} />
                ))}
              </div>
            </div>
          )}

          {/* Arrow nav */}
          {currentStep > 0 && (
            <div className="gsap-arrow-navigation">
              <button className="nav-arrow-btn" onClick={() => scrollToChapter(currentStep - 1)} disabled={currentStep === 0}><ArrowUp size={14} /></button>
              <button className="nav-arrow-btn" onClick={() => scrollToChapter(currentStep + 1)} disabled={currentStep === 4}><ArrowDown size={14} /></button>
            </div>
          )}

          {/* The Scroll Narrative */}
          <div className="gsap-scroll-spacer" ref={scrollSpacerRef}>
            <div className="gsap-narrative-container">
              <div className="ambient-aurora aurora-1" />
              <div className="ambient-aurora aurora-2" />
              <div className="gsap-grid-overlay" />

              <div className={`chapter-0-slide ${currentStep === 0 ? 'is-active' : ''}`}>
                <HeroScene heroTitleRef={heroTitleRef} sharedState={sharedState} virtualUIRef={virtualUIRef} />
              </div>

              <div className="scroll-content-layout">
                <div className="narrative-left-col">
                   <div className={`chapter0-prologue-copy ${currentStep === 0 ? 'is-active' : ''}`} aria-hidden={currentStep !== 0}>
                     <span className="chapter0-prologue-kicker">THE STACK</span>
                     <h2>所有碎片，<br />先被安静收好。</h2>
                     <p>
                       Lovcore 把图片、笔记、链接和文件放进同一个灵感栈。<br />你不用先分类，只需要记得它曾经出现过。
                     </p>
                     <div className="chapter0-prologue-flow">
                       <span>搜索一段记忆</span>
                       <i />
                       <span>找到相关卡片</span>
                       <i />
                       <span>打开详情</span>
                     </div>
                   </div>
                   <div className={`narrative-slide chapter-1-slide ${currentStep === 1 ? 'is-active' : ''}`}>
                     <CaptureScene isActive={currentStep === 1} />
                   </div>
                   <div className={`narrative-slide ${currentStep === 2 ? 'is-active' : ''}`}>
                     <OrganizeScene isActive={currentStep === 2} />
                   </div>
                   <div className={`narrative-slide ${currentStep === 3 ? 'is-active' : ''}`}>
                     <SerendipityScene isActive={currentStep === 3} swipeResult={null} />
                   </div>
                </div>
                <div className="narrative-right-col">
                  <div className={`virtual-ui-pin-wrapper ${currentStep > 0 ? 'is-active' : ''}`} ref={virtualUIRef}>
                      <VirtualMockUI
                        currentStep={currentStep}
                        isMobile={isMobile}
                        searchTyped={searchTyped}
                        cursorVisible={cursorVisible}
                        capturedText={capturedText}
                        onCaptureComplete={unlockCapture}
                        isQuickNoteExpanded={isQuickNoteExpanded}
                      />
                  </div>
                </div>
                
                <div className={`narrative-slide chapter-4-slide ${currentStep === 4 ? 'is-active' : ''}`}>
                  <CTAScene isActive={currentStep === 4} renderVaultForm={renderVaultForm} />
                </div>
              </div>
            </div>
          </div>

          <footer className="gsap-footer">
            <p>&copy; 2026 Lovcore. Saved quietly, recalled when needed.</p>
            <p style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--accent)' }} />
              <span>{t.landing.privateByDefault}</span>
            </p>
          </footer>
        </>
      )}
    </div>
  );
};
