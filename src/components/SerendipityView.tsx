import React, { useMemo, useState, useEffect, useRef, Suspense } from 'react';
import gsap from 'gsap';
import type { Item } from '../types';
import { useTranslation } from '../i18n';
import { Skeleton } from './Skeleton';

const LazyDocumentA4Page = React.lazy(() => import('./DocumentA4Page').then(m => ({ default: m.DocumentA4Page })));
import { useFileUrl } from '../lib/fileStore';

// Warm pigment palette — aged terracotta & dried linen (fallback)
const COLORS = {
  keep:   { main: '#B5816E', rgb: '181, 129, 110' },
  forget: { main: '#A3967E', rgb: '163, 150, 126' },
};

// 3D Depth levels metadata for background cards
const DEPTH_PROPS = [
  { blur: 14, opacity: 0.38, scale: 0.7,  speed: 0.45, parallax: 0.015, zIndex: 1 },  // Far
  { blur: 7,  opacity: 0.72, scale: 0.95, speed: 0.9,  parallax: 0.045, zIndex: 2 },  // Mid
  { blur: 1.5,opacity: 0.88, scale: 1.25, speed: 1.45, parallax: 0.09,  zIndex: 3 },  // Near
  { blur: 11, opacity: 0.42, scale: 0.76, speed: 0.55, parallax: 0.022, zIndex: 1 },  // Far
  { blur: 5.5,opacity: 0.78, scale: 1.02, speed: 1.0,  parallax: 0.05,  zIndex: 2 },  // Mid
  { blur: 2.5,opacity: 0.84, scale: 1.15, speed: 1.3,  parallax: 0.075, zIndex: 3 },  // Near
];

// Extract primary color from current card
function getCardPrimaryColor(item: Item): string | null {
  if (item.type === 'note' && item.noteBgColor) return item.noteBgColor;
  if (item.colorPalette && item.colorPalette.length > 0) return item.colorPalette[0];
  return null;
}

// Derive adaptive accent colors from card's primary color
function deriveAccentColors(hex: string | null): { forgetRgb: string; keepRgb: string; forgetMain: string; keepMain: string } {
  if (!hex) return { forgetRgb: COLORS.forget.rgb, keepRgb: COLORS.keep.rgb, forgetMain: COLORS.forget.main, keepMain: COLORS.keep.main };
  const hsl = hexToHSL(hex);
  if (!hsl) return { forgetRgb: COLORS.forget.rgb, keepRgb: COLORS.keep.rgb, forgetMain: COLORS.forget.main, keepMain: COLORS.keep.main };

  // Forget: cool-shift, heavy desaturate, darken slightly
  const fH = (hsl.h + 30) % 360;
  const fS = Math.max(hsl.s - 30, 8);
  const fL = Math.max(hsl.l - 10, 35);
  const forgetRGB = hslToRGB(fH, fS, fL);

  // Keep: warm-shift, moderate desaturate, brighten
  const kH = (hsl.h + 345) % 360;
  const kS = Math.max(hsl.s - 15, 15);
  const kL = Math.min(hsl.l + 15, 65);
  const keepRGB = hslToRGB(kH, kS, kL);

  return {
    forgetRgb: `${forgetRGB.r}, ${forgetRGB.g}, ${forgetRGB.b}`,
    keepRgb: `${keepRGB.r}, ${keepRGB.g}, ${keepRGB.b}`,
    forgetMain: `rgb(${forgetRGB.r}, ${forgetRGB.g}, ${forgetRGB.b})`,
    keepMain: `rgb(${keepRGB.r}, ${keepRGB.g}, ${keepRGB.b})`,
  };
}

function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  const m = hex.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})/i);
  if (!m) return null;
  const r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToRGB(h: number, s: number, l: number): { r: number; g: number; b: number } {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

interface SerendipityViewProps {
  items: Item[];
  onSelectCard: (item: Item) => void;
  onForgetCard?: (id: string) => void;
  onBack?: () => void;
  onStarted?: () => void;
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

  // Wind simulator nodes
  private windSource: AudioBufferSourceNode[] = [];
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windLFO: OscillatorNode | null = null;
  private windLFOGain: GainNode | null = null;

  // Generative melody nodes
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private noteTimeout: number | null = null;

  // Master gain + analyser for visualization
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  start() {
    try {
      const AudioContextClass = window.AudioContext
        || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();

      const now = this.ctx.currentTime;

      // Master gain → Analyser → destination (all audio routes through here)
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1, now);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.85;
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      // Warm low pass filter for drone
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(260, now);
      this.filter.Q.setValueAtTime(1.2, now);
      this.filter.connect(this.masterGain);

      // Relaxing major 9th pad chord drone (F3, C4, G4, A4)
      const frequencies = [174.61, 261.63, 392.00, 440.00];
      
      frequencies.forEach((freq, idx) => {
        if (!this.ctx || !this.filter) return;
        
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle'; 
        osc.frequency.setValueAtTime(freq, now);
        
        // Detune for warm chorus texture
        osc.detune.setValueAtTime((idx - 1.5) * 5, now);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0, now);
        
        osc.connect(oscGain);
        oscGain.connect(this.filter);
        
        // Fade-in
        oscGain.gain.linearRampToValueAtTime(0.04, now + 3.0);
        
        osc.start();
        this.oscillators.push(osc);
        this.gainNodes.push(oscGain);
      });

      // LFO filter modulator
      this.lfo = this.ctx.createOscillator();
      this.lfo.type = 'sine';
      this.lfo.frequency.setValueAtTime(0.08, now); // 12.5s period

      this.lfoGain = this.ctx.createGain();
      this.lfoGain.gain.setValueAtTime(40, now); 

      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.filter.frequency);
      this.lfo.start();

      // Pink Noise Wind Generator
      const sampleRate = this.ctx.sampleRate;
      const bufferSize = 2 * sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.08;
        b6 = white * 0.115926;
      }

      const windSrc = this.ctx.createBufferSource();
      windSrc.buffer = noiseBuffer;
      windSrc.loop = true;

      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'lowpass';
      this.windFilter.frequency.setValueAtTime(160, now);
      this.windFilter.Q.setValueAtTime(1.0, now);

      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0, now);

      // Slow sweeping wind filter LFO
      this.windLFO = this.ctx.createOscillator();
      this.windLFO.type = 'sine';
      this.windLFO.frequency.setValueAtTime(0.04, now); // 25s sweep

      this.windLFOGain = this.ctx.createGain();
      this.windLFOGain.gain.setValueAtTime(60, now);

      this.windLFO.connect(this.windLFOGain);
      this.windLFOGain.connect(this.windFilter.frequency);

      windSrc.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.masterGain);

      this.windLFO.start();
      windSrc.start();
      this.windSource.push(windSrc);
      this.windGain.gain.linearRampToValueAtTime(0.12, now + 3.5);

      // Delay Line for Spatial Ambient Notes
      this.delayNode = this.ctx.createDelay(5.0);
      this.delayNode.delayTime.setValueAtTime(1.2, now);

      this.delayFeedback = this.ctx.createGain();
      this.delayFeedback.gain.setValueAtTime(0.42, now);

      this.delayNode.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      this.delayNode.connect(this.masterGain);

      this.scheduleNextNote();

    } catch (err) {
      console.warn('Audio Context failed to start:', err);
    }
  }

  private scheduleNextNote() {
    if (!this.ctx) return;
    const delay = 6000 + Math.random() * 8000; // 6s - 14s
    this.noteTimeout = window.setTimeout(() => {
      this.playRandomNote();
      this.scheduleNextNote();
    }, delay);
  }

  private playRandomNote() {
    if (!this.ctx || !this.delayNode || !this.masterGain) return;
    const now = this.ctx.currentTime;
    
    // F Major Pentatonic scale notes
    const scale = [349.23, 392.00, 440.00, 523.25, 587.33, 698.46];
    const freq = scale[Math.floor(Math.random() * scale.length)];

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, now); // woodwind bell overtone

    const g1 = this.ctx.createGain();
    const g2 = this.ctx.createGain();

    osc1.connect(g1);
    osc2.connect(g2);

    g1.connect(this.masterGain);
    g1.connect(this.delayNode);
    g2.connect(this.masterGain);
    g2.connect(this.delayNode);

    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(0.016, now + 0.8);
    g1.gain.exponentialRampToValueAtTime(0.0001, now + 7.5);

    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(0.003, now + 0.5);
    g2.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);

    osc1.start(now);
    osc2.start(now);

    osc1.stop(now + 8.0);
    osc2.stop(now + 3.5);
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  stop() {
    if (this.noteTimeout) {
      clearTimeout(this.noteTimeout);
      this.noteTimeout = null;
    }
    const now = this.ctx ? this.ctx.currentTime : 0;
    this.gainNodes.forEach((gainNode) => {
      if (this.ctx) {
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.8);
      }
    });

    if (this.windGain && this.ctx) {
      this.windGain.gain.cancelScheduledValues(now);
      this.windGain.gain.setValueAtTime(this.windGain.gain.value, now);
      this.windGain.gain.linearRampToValueAtTime(0, now + 0.8);
    }

    setTimeout(() => {
      this.oscillators.forEach((osc) => {
        try { osc.stop(); } catch { /* ignore */ }
      });
      if (this.lfo) {
        try { this.lfo.stop(); } catch { /* ignore */ }
      }
      this.windSource.forEach((src) => {
        try { src.stop(); } catch { /* ignore */ }
      });
      if (this.windLFO) {
        try { this.windLFO.stop(); } catch { /* ignore */ }
      }
      if (this.ctx) {
        this.ctx.close();
      }
      this.oscillators = [];
      this.gainNodes = [];
      this.windSource = [];
      this.ctx = null;
      this.filter = null;
      this.lfo = null;
      this.lfoGain = null;
      this.windGain = null;
      this.windFilter = null;
      this.windLFO = null;
      this.windLFOGain = null;
      this.delayNode = null;
      this.delayFeedback = null;
      this.masterGain = null;
      this.analyser = null;
    }, 900);
  }
}

// ---------------------------------------------------------
// Helpers for particles
// ---------------------------------------------------------
function hexToRGB(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})/i);
  if (m) {
    return {
      r: parseInt(m[1], 16),
      g: parseInt(m[2], 16),
      b: parseInt(m[3], 16),
    };
  }
  const rgbaMatch = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1], 10),
      g: parseInt(rgbaMatch[2], 10),
      b: parseInt(rgbaMatch[3], 10),
    };
  }
  return null;
}

// Organic dust & petal particles on card throw
function spawnParticles(
  container: HTMLElement,
  direction: 'left' | 'right',
  cardElement: HTMLElement | null,
  colorHex: string | null
) {
  const primaryColor = colorHex || (direction === 'right' ? COLORS.keep.main : COLORS.forget.main);
  const rgb = hexToRGB(primaryColor);
  const rgbStr = rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : (direction === 'right' ? COLORS.keep.rgb : COLORS.forget.rgb);

  if (direction === 'left') {
    // Ash/disintegration effect for Left (Forget)
    const count = 35;
    const cardRect = cardElement ? cardElement.getBoundingClientRect() : null;
    const containerRect = container.getBoundingClientRect();
    
    const startX = cardRect ? (cardRect.left + cardRect.width / 2) - containerRect.left : containerRect.width / 2;
    const startY = cardRect ? (cardRect.top + cardRect.height / 2) - containerRect.top : containerRect.height / 2;

    for (let i = 0; i < count; i++) {
      const dot = document.createElement('div');
      dot.className = 'serendipity-particle';
      const size = 3 + Math.random() * 8;
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.background = `rgba(${rgbStr}, ${0.45 + Math.random() * 0.45})`;
      dot.style.borderRadius = Math.random() > 0.45 ? '50%' : '3px';
      
      const offsetX = cardRect ? (Math.random() - 0.5) * cardRect.width * 0.9 : (Math.random() - 0.5) * 300;
      const offsetY = cardRect ? (Math.random() - 0.5) * cardRect.height * 0.9 : (Math.random() - 0.5) * 400;
      
      gsap.set(dot, {
        x: startX + offsetX,
        y: startY + offsetY,
        opacity: 0.95,
        scale: 1,
        filter: 'blur(0.5px)',
      });

      container.appendChild(dot);

      // Float left and drift with turbulences
      const tx = offsetX - (150 + Math.random() * 220);
      const ty = offsetY + (Math.random() - 0.5) * 160 - 40;

      gsap.to(dot, {
        x: startX + tx,
        y: startY + ty,
        opacity: 0,
        scale: 0.1 + Math.random() * 0.25,
        rotation: -120 + Math.random() * 240,
        duration: 1.0 + Math.random() * 0.7,
        ease: 'power2.out',
        onComplete: () => dot.remove(),
      });
    }
  } else {
    // Sparkling tail effect for Right (Keep)
    const count = 25;
    const cardRect = cardElement ? cardElement.getBoundingClientRect() : null;
    const containerRect = container.getBoundingClientRect();
    
    const startX = cardRect ? (cardRect.left + cardRect.width / 2) - containerRect.left : containerRect.width / 2;
    const startY = cardRect ? (cardRect.bottom) - containerRect.top : containerRect.height / 2;

    for (let i = 0; i < count; i++) {
      const dot = document.createElement('div');
      dot.className = 'serendipity-particle';
      const size = 2.5 + Math.random() * 6;
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.background = `rgba(${rgbStr}, ${0.55 + Math.random() * 0.45})`;
      dot.style.borderRadius = '50%';
      dot.style.boxShadow = `0 0 8px rgba(${rgbStr}, 0.5)`;
      
      const offsetX = cardRect ? (Math.random() - 0.5) * cardRect.width * 0.7 : (Math.random() - 0.5) * 200;
      const offsetY = (Math.random() - 0.5) * 20;

      gsap.set(dot, {
        x: startX + offsetX,
        y: startY + offsetY,
        opacity: 0.9,
        scale: 1,
      });

      container.appendChild(dot);

      // Trailing tail upwards
      const tx = offsetX + (Math.random() - 0.5) * 120 + 60;
      const ty = offsetY - (120 + Math.random() * 180);

      gsap.to(dot, {
        x: startX + tx,
        y: startY + ty,
        opacity: 0,
        scale: 0.15 + Math.random() * 0.25,
        duration: 1.1 + Math.random() * 0.5,
        ease: 'power1.out',
        onComplete: () => dot.remove(),
      });
    }
  }
}

// Warm ember particles on sound toggle
function spawnSoundParticles(container: HTMLElement) {
  const btn = container.parentElement;
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const cx = rect.left + rect.width / 2 - containerRect.left;
  const cy = rect.top + rect.height / 2 - containerRect.top;

  const warmColors = ['#FF6B5B', '#E8967D', '#D4A574', '#C49B7A', '#B88A6E'];

  for (let i = 0; i < 10; i++) {
    const dot = document.createElement('div');
    dot.className = 'sound-particle';
    const size = 3 + Math.random() * 4;
    dot.style.width = `${size}px`;
    dot.style.height = `${size}px`;
    dot.style.background = warmColors[Math.floor(Math.random() * warmColors.length)];
    dot.style.borderRadius = '50%';

    gsap.set(dot, {
      x: cx,
      y: cy,
      opacity: 0.9,
      scale: 1,
    });

    container.appendChild(dot);

    const angle = (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.6;
    const dist = 28 + Math.random() * 36;

    gsap.to(dot, {
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      opacity: 0,
      scale: 0.2,
      duration: 0.8 + Math.random() * 0.5,
      ease: 'power2.out',
      onComplete: () => dot.remove(),
    });
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
  item, idx, onMouseEnter, onMouseLeave, onClick, depth,
}: {
  item: Item; idx: number;
  onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onClick: () => void;
  depth: typeof DEPTH_PROPS[0];
}) {
  const resolved = useFileUrl(item.thumbnail, item.thumbnailStoragePath);
  const isDocType = item.type === 'pdf' || item.type === 'article' || (item.type === 'link' && !resolved);
  return (
    <div
      className={`serendipity-bg-card-wrapper bg-card-${idx + 1} type-${item.type}`}
      style={{ zIndex: depth.zIndex }}
    >
      <button
        className={`serendipity-bg-card type-${item.type}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        style={{
          backgroundImage: resolved ? `url(${resolved})` : undefined,
          filter: `blur(${depth.blur}px)`,
          opacity: depth.opacity,
          transform: `scale(${depth.scale})`,
        }}
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
            <Suspense fallback={<Skeleton variant="card" />}><LazyDocumentA4Page item={item} isCard={true} /></Suspense>
          </div>
        )}
        {!resolved && item.type !== 'note' && !isDocType && (
          <div className="bg-card-generic-text">{item.title}</div>
        )}
      </button>
    </div>
  );
}

function SerendipityActiveCard({ item }: { item: Item }) {
  const resolvedThumbnail = useFileUrl(item.thumbnail, item.thumbnailStoragePath);
  let content;

  if (item.type === 'note') {
    content = (
      <div
        className="serendipity-note-preview"
        style={{
          backgroundColor: item.noteBgColor || undefined,
          color: item.noteBgColor ? '#201c18' : undefined
        }}
      >
        <div className="serendipity-note-content">
          {item.content.length > 320 ? `${item.content.slice(0, 320)}...` : item.content}
        </div>
      </div>
    );
  } else if (item.type === 'pdf' || item.type === 'article' || (item.type === 'link' && !resolvedThumbnail)) {
    content = (
      <div className="document-page-preview serendipity-doc-preview">
        <Suspense fallback={<Skeleton variant="card" />}><LazyDocumentA4Page item={item} isCard={true} /></Suspense>
      </div>
    );
  } else if (resolvedThumbnail) {
    content = <img src={resolvedThumbnail} alt={item.title} draggable="false" />;
  } else {
    content = (
      <div className="serendipity-fallback-card">
        <span>{item.title}</span>
      </div>
    );
  }

  return (
    <div className="serendipity-active-card-container" style={{ position: 'relative', display: 'inline-block', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <div className="card-glare-overlay" />
      {content}
    </div>
  );
}

export const SerendipityView = ({ items, onSelectCard, onForgetCard, onBack, onStarted }: SerendipityViewProps) => {
  const { t } = useTranslation();
  const [hasStarted, setHasStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [isSoundOn, setIsSoundOn] = useState(false);
  const [dragX, setDragX] = useState(0);

  const blurSpansRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
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

  // Particle & button refs for premium interactions
  const particleContainerRef = useRef<HTMLDivElement>(null);
  const forgetBtnRef = useRef<HTMLButtonElement>(null);
  const keepBtnRef = useRef<HTMLButtonElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const isPulsingRef = useRef<boolean>(false);
  const soundDotRefs = useRef<HTMLDivElement[]>([]);
  const soundGlowRef = useRef<HTMLDivElement>(null);
  const soundParticlesRef = useRef<HTMLDivElement>(null);
  const stageGlowRef = useRef<HTMLDivElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

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

  // ESC to exit serendipity stage
  useEffect(() => {
    if (!hasStarted) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, onBack]);

  const toggleSound = () => {
    if (!audioEngineRef.current) return;
    if (isSoundOn) {
      audioEngineRef.current.stop();
      analyserRef.current = null;
      setIsSoundOn(false);
    } else {
      audioEngineRef.current.start();
      analyserRef.current = audioEngineRef.current.getAnalyser();
      setIsSoundOn(true);
    }
  };

  // Audio-reactive breathing: dots + glow driven by AnalyserNode
  useEffect(() => {
    const dots = soundDotRefs.current.filter(Boolean);
    const glow = soundGlowRef.current;
    const stageGlow = stageGlowRef.current;
    const freqData = analyserRef.current
      ? new Uint8Array(analyserRef.current.frequencyBinCount)
      : null;

    dots.forEach((dot) => gsap.killTweensOf(dot));
    if (glow) gsap.killTweensOf(glow);
    if (stageGlow) gsap.killTweensOf(stageGlow);

    if (!isSoundOn || !analyserRef.current || !freqData) {
      // Wind down to rest
      dots.forEach((dot, i) => {
        gsap.to(dot, {
          scale: 0.5,
          opacity: 0.3,
          duration: 0.7 + i * 0.1,
          ease: 'power2.out',
        });
      });
      if (glow) gsap.to(glow, { opacity: 0, scale: 1, duration: 0.8, ease: 'power2.out' });
      if (stageGlow) gsap.to(stageGlow, { opacity: 0, duration: 1, ease: 'power2.out' });
      gsap.ticker.remove(audioTick);
      return;
    }

    // Smoothed audio level (0–1)
    let smoothLevel = 0;

    function audioTick() {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(freqData!);

      // Average of low-mid frequencies (most audible in our ambient engine)
      let sum = 0;
      const count = Math.min(48, freqData!.length);
      for (let i = 0; i < count; i++) sum += freqData![i];
      const raw = sum / count / 255;

      // Smooth with exponential moving average
      smoothLevel += (raw - smoothLevel) * 0.08;

      // Map to dot scale: base 0.6 + audio contribution up to 0.9
      const level = Math.min(smoothLevel * 3.5, 1); // amplify for visibility

      dots.forEach((dot, i) => {
        const baseScale = 0.6 + i * 0.05;
        const targetScale = baseScale + level * (0.5 + i * 0.15);
        gsap.set(dot, {
          scale: targetScale,
          opacity: 0.3 + level * (0.5 + i * 0.1),
        });
      });

      // Glow intensity follows audio
      if (glow) {
        gsap.set(glow, {
          opacity: 0.08 + level * 0.35,
          scale: 1 + level * 0.06,
        });
      }

      // Stage background glow — very subtle
      if (stageGlow) {
        gsap.set(stageGlow, {
          opacity: level * 0.18,
        });
      }
    }

    gsap.ticker.add(audioTick);

    // Spawn particles on toggle-on
    if (soundParticlesRef.current) {
      spawnSoundParticles(soundParticlesRef.current);
    }

    return () => {
      gsap.ticker.remove(audioTick);
    };
  }, [isSoundOn]);

  // Hover magnet effect for sound dots
  const handleSoundDotMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const dot = e.currentTarget;
    const rect = dot.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) * 0.4;
    const dy = (e.clientY - cy) * 0.4;
    gsap.to(dot, { x: dx, y: dy, scale: 1.3, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
  };

  const handleSoundDotMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    gsap.to(e.currentTarget, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' });
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

        const depth = DEPTH_PROPS[idx % DEPTH_PROPS.length] || DEPTH_PROPS[0];
        const rx = (35 + Math.random() * 25) * (depth.scale * 0.85); // scaled radius
        const ry = (25 + Math.random() * 20) * (depth.scale * 0.85);
        const startAngle = Math.random() * Math.PI * 2;
        const dir = Math.random() > 0.5 ? 1 : -1;
        const duration = (12 + Math.random() * 9) / depth.speed; // speed based on depth

        const angleObj = { angle: startAngle };

        // Set initial random position along the orbital path (using depth properties)
        gsap.set(span, {
          x: Math.cos(startAngle) * rx,
          y: Math.sin(startAngle) * ry,
          rotation: startAngle * (180 / Math.PI) * 0.1,
          filter: `blur(${depth.blur}px)`,
          opacity: depth.opacity,
          scale: depth.scale,
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

  // Mouse Move Parallax for Background Wrappers
  useEffect(() => {
    if (!hasStarted) return;
    const stage = stageRef.current;
    if (!stage) return;

    const handleMouseMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;

      // Select wrapper elements to apply parallax offset
      const wrappers = blurSpansRef.current?.querySelectorAll('.serendipity-bg-card-wrapper');
      if (wrappers) {
        wrappers.forEach((wrapper, idx) => {
          const depth = DEPTH_PROPS[idx % DEPTH_PROPS.length] || DEPTH_PROPS[0];
          // Opposite direction movement for 3D depth feeling
          const px = -dx * depth.parallax;
          const py = -dy * depth.parallax;

          // Quick interpolate to position
          gsap.to(wrapper, {
            x: px,
            y: py,
            duration: 0.8,
            ease: 'power2.out',
            overwrite: 'auto',
          });
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
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
    const primaryColor = getCardPrimaryColor(currentItem);
    const primaryRgb = hexToRGB(primaryColor || '') || { r: 181, g: 129, b: 110 };
    const stage = stageRef.current;

    if (stage) {
      const { forgetRgb, keepRgb } = deriveAccentColors(primaryColor);
      stage.style.setProperty('--echo-primary', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
      stage.style.setProperty('--echo-forget', forgetRgb);
      stage.style.setProperty('--echo-keep', keepRgb);
    }
    
    gsap.to('.serendipity-stage', {
      backgroundColor: targetColor,
      duration: 1.2,
      ease: 'power2.out',
    });
  }, [currentItem, hasStarted]);

  // Adaptive accent colors: derive from current card's primary color
  useEffect(() => {
    const actions = actionsRef.current;
    if (!actions || !currentItem) return;

    const primaryColor = getCardPrimaryColor(currentItem);
    const { forgetRgb, keepRgb, forgetMain, keepMain } = deriveAccentColors(primaryColor);

    actions.style.setProperty('--accent-forget', forgetRgb);
    actions.style.setProperty('--accent-keep', keepRgb);
    actions.style.setProperty('--accent-forget-main', forgetMain);
    actions.style.setProperty('--accent-keep-main', keepMain);
  }, [currentItem, hasStarted]);

  // Button + glow linkage: drive emphasis from dragX
  useEffect(() => {
    const absX = Math.abs(dragX);
    const intensity = Math.min(absX / 180, 1);
    const glow = glowRef.current;
    const actions = actionsRef.current;

    const activeBtn = dragX > 0 ? keepBtnRef.current : dragX < 0 ? forgetBtnRef.current : null;
    const inactiveBtn = dragX > 0 ? forgetBtnRef.current : dragX < 0 ? keepBtnRef.current : null;

    const threshold = 140;
    const isPastThreshold = absX >= threshold;

    if (dragX === 0) {
      isPulsingRef.current = false;
      [forgetBtnRef.current, keepBtnRef.current].forEach((btn) => {
        if (!btn) return;
        gsap.to(btn, { x: 0, y: 0, scale: 1, opacity: 0.65, color: 'var(--text-primary)', duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
      });
      if (bubbleRef.current) {
        gsap.to(bubbleRef.current, { x: 0, width: 0, opacity: 0, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
      }
      if (glow) {
        gsap.to(glow, { x: 0, width: 220, height: 36, opacity: 0.75, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
      }
      if (actions) {
        gsap.to(actions, { boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.15)', duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
      }
      return;
    }

    // Active button: translate X/Y towards drag, scale up, change color
    if (activeBtn) {
      const colorVar = dragX > 0 ? 'var(--accent-keep-main)' : 'var(--accent-forget-main)';
      const bx = dragX > 0 ? intensity * 14 : -intensity * 14;
      const by = -intensity * 8;
      
      if (isPastThreshold) {
        if (!isPulsingRef.current) {
          isPulsingRef.current = true;
          // Pulse loop for emphasis
          gsap.to(activeBtn, {
            x: bx,
            y: by - 3,
            scale: 1.18,
            color: colorVar,
            opacity: 1,
            duration: 0.3,
            repeat: -1,
            yoyo: true,
            ease: 'sine.easeInOut',
            overwrite: 'auto',
          });
        }
      } else {
        isPulsingRef.current = false;
        // Normal mouse-tracking attraction
        gsap.to(activeBtn, {
          x: bx,
          y: by,
          scale: 1 + intensity * 0.10,
          color: colorVar,
          opacity: 1,
          duration: 0.15,
          ease: 'power1.out',
          overwrite: 'auto',
        });
      }
    }

    // Inactive button: translate away slightly, scale down, dim
    if (inactiveBtn) {
      const bx = dragX > 0 ? -intensity * 6 : intensity * 6;
      gsap.to(inactiveBtn, {
        x: bx,
        y: 0,
        scale: 1 - intensity * 0.08,
        opacity: 0.22,
        color: 'var(--text-primary)',
        duration: 0.15,
        ease: 'power1.out',
        overwrite: 'auto',
      });
    }

    // Bubble sliding indicator
    if (bubbleRef.current) {
      const shift = dragX > 0 ? 56 : -56;
      const bubbleColor = dragX > 0 
        ? `rgba(var(--accent-keep), ${0.12 + intensity * 0.12})` 
        : `rgba(var(--accent-forget), ${0.12 + intensity * 0.12})`;
      
      gsap.to(bubbleRef.current, {
        x: shift,
        width: 96,
        opacity: intensity,
        backgroundColor: bubbleColor,
        duration: 0.18,
        ease: 'power1.out',
        overwrite: 'auto',
      });
    }

    // Glow shifts toward active side, expands with intensity
    if (glow) {
      const shift = dragX > 0 ? intensity * 50 : -intensity * 50;
      const w = 220 + intensity * 60;
      const h = 36 + intensity * 14;
      gsap.to(glow, {
        x: shift,
        width: w,
        height: h,
        opacity: 0.75 + intensity * 0.25,
        duration: 0.15,
        ease: 'power1.out',
        overwrite: 'auto',
      });
    }

    // Capsule border glows with drag direction color
    if (actions) {
      const rgb = dragX > 0 ? COLORS.keep.rgb : COLORS.forget.rgb;
      gsap.to(actions, {
        boxShadow: `0 8px 32px rgba(${rgb}, ${0.05 + intensity * 0.15}), 0 0 ${15 + intensity * 15}px rgba(${rgb}, ${intensity * 0.2}), inset 0 0 0 1.5px rgba(${rgb}, ${0.15 + intensity * 0.35})`,
        duration: 0.15,
        ease: 'power1.out',
        overwrite: 'auto',
      });
    }
  }, [dragX]);

  // Card Swiping Throw Animation
  const throwCard = (direction: 'left' | 'right') => {
    const card = cardRef.current;
    if (!card) return;

    if (cardTweenRef.current) {
      cardTweenRef.current.kill();
    }

    const primaryColor = getCardPrimaryColor(currentItem);

    setDragX(0);

    // Spawn premium particle burst
    if (particleContainerRef.current) {
      spawnParticles(particleContainerRef.current, direction, card, primaryColor);
    }

    // Forget: delete item from stack
    if (direction === 'left' && onForgetCard && currentItem) {
      onForgetCard(currentItem.id);
    }

    if (direction === 'left') {
      // Evaporating dissolve: fly left and tilt in 3D
      gsap.to(card, {
        x: -480,
        y: -100,
        scale: 0.72,
        rotation: -28,
        rotationY: -42,
        opacity: 0,
        duration: 0.52,
        ease: 'power2.in',
        onComplete: () => {
          next();
          animateIncomingCard();
        }
      });
    } else {
      // Parabolic absorption: sink down into bottom center actions console
      gsap.to(card, {
        x: 0,
        y: 420,
        scale: 0.12,
        rotation: 15,
        rotationX: 45,
        opacity: 0,
        duration: 0.58,
        ease: 'power2.in',
        onComplete: () => {
          next();
          animateIncomingCard();
        }
      });
    }
  };

  const animateIncomingCard = () => {
    const card = cardRef.current;
    if (!card) return;

    gsap.killTweensOf(card);
    gsap.set(card, {
      x: 0,
      y: 100,
      rotation: 0,
      rotationX: 0,
      rotationY: 0,
      opacity: 0,
      scale: 0.88,
    });

    gsap.to(card, {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 0.65,
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
    });
  };

  // Magnet effect for bottom console buttons
  const handleMagnetMove = (e: React.MouseEvent<HTMLButtonElement>, btnRef: React.RefObject<HTMLButtonElement | null>) => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);

    gsap.to(btn, {
      x: x * 0.35,
      y: y * 0.35,
      scale: 1.06,
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  };

  const handleMagnetLeave = (btnRef: React.RefObject<HTMLButtonElement | null>) => {
    const btn = btnRef.current;
    if (!btn) return;
    gsap.to(btn, {
      x: 0,
      y: 0,
      scale: 1,
      duration: 0.45,
      ease: 'power3.out',
      overwrite: 'auto',
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

    const intensity = Math.min(Math.abs(dx) / 180, 1);
    const c = dx > 0 ? COLORS.keep : COLORS.forget;

    gsap.set(card, {
      x: dx,
      rotation: dx * 0.04,
      boxShadow: dx === 0
        ? '0 24px 60px rgba(28, 29, 27, 0.12), 0 8px 24px rgba(28, 29, 27, 0.06)'
        : `0 24px 60px rgba(28, 29, 27, 0.12), 0 0 ${20 + intensity * 30}px rgba(${c.rgb}, ${intensity * 0.3}), 0 0 ${40 + intensity * 60}px rgba(${c.rgb}, ${intensity * 0.15}), inset 0 0 0 1.5px rgba(${c.rgb}, ${intensity * 0.25})`,
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
        rotationX: 0,
        rotationY: 0,
        scale: 1,
        boxShadow: '0 24px 60px rgba(28, 29, 27, 0.12), 0 8px 24px rgba(28, 29, 27, 0.06)',
        duration: 0.6,
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

  const handleCardMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDraggingRef.current) return;
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const nx = (x / rect.width) - 0.5;
    const ny = (y / rect.height) - 0.5;

    // Subtle 3D tilt
    const tiltX = -ny * 10;
    const tiltY = nx * 10;

    // Shift shadow in opposite direction of mouse
    const sx = -nx * 15;
    const sy = -ny * 15;

    gsap.to(card, {
      rotationX: tiltX,
      rotationY: tiltY,
      boxShadow: `${sx}px ${24 + sy}px 60px rgba(28, 29, 27, 0.16), 0 8px 24px rgba(28, 29, 27, 0.08)`,
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto',
    });

    card.style.setProperty('--glare-x', `${(x / rect.width) * 100}%`);
    card.style.setProperty('--glare-y', `${(y / rect.height) * 100}%`);
    card.style.setProperty('--glare-opacity', '1');
  };

  const handleMouseLeave = () => {
    if (isDraggingRef.current) return;
    const card = cardRef.current;
    if (card) {
      gsap.to(card, {
        scale: 1,
        rotationX: 0,
        rotationY: 0,
        boxShadow: '0 24px 60px rgba(28, 29, 27, 0.12), 0 8px 24px rgba(28, 29, 27, 0.06)',
        duration: 0.5,
        ease: 'power3.out',
        overwrite: 'auto',
        onComplete: () => {
          if (cardTweenRef.current && hasStarted && !isDraggingRef.current) {
            cardTweenRef.current.resume();
          }
        },
      });
      card.style.setProperty('--glare-opacity', '0');
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
      boxShadow: '0 20px 45px rgba(0, 0, 0, 0.15)',
      duration: 0.45,
      ease: 'power2.out',
      overwrite: 'auto',
    });
    // Set z-index of wrapper to 10 to bring hovered card to front
    const wrapper = e.currentTarget.parentElement;
    if (wrapper) {
      wrapper.style.zIndex = '10';
    }
  };

  const handleBgCardMouseLeave = (e: React.MouseEvent<HTMLButtonElement>, idx: number) => {
    const depth = DEPTH_PROPS[idx % DEPTH_PROPS.length] || DEPTH_PROPS[0];
    gsap.to(e.currentTarget, {
      filter: `blur(${depth.blur}px)`,
      opacity: depth.opacity,
      scale: depth.scale,
      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
      duration: 0.6,
      ease: 'power2.out',
      overwrite: 'auto',
      onComplete: () => {
        if (spanTweensRef.current[idx] && hasStarted) {
          spanTweensRef.current[idx].resume();
        }
      },
    });
    // Restore original wrapper z-index
    const wrapper = e.currentTarget.parentElement;
    if (wrapper) {
      wrapper.style.zIndex = String(depth.zIndex);
    }
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
        <h1>{t.serendipity.introTitleLine1}<br />{t.serendipity.introTitleLine2}</h1>
        <div className="serendipity-divider" />
        <p>{t.serendipity.introDesc}</p>
        <button onClick={() => { setHasStarted(true); onStarted?.(); }}>{t.serendipity.showMe}</button>
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
    <main className="serendipity-stage" ref={stageRef}>
      {/* Minimal back button — top-left */}
      {onBack && (
        <button className="serendipity-back-btn" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Moving fluid gradient blobs in the background */}
      <div className="serendipity-glow-blob blob-pink" ref={blobPinkRef}></div>
      <div className="serendipity-glow-blob blob-blue" ref={blobBlueRef}></div>
      <div className="serendipity-glow-blob blob-purple" ref={blobPurpleRef}></div>

      {/* Stage background glow — subtle warm diffusion */}
      <div className="serendipity-stage-glow" ref={stageGlowRef} />

      {/* Soundscape control toggle in top-right */}
      <button
        className={`ambient-audio-toggle ${isSoundOn ? 'active' : ''}`}
        onClick={toggleSound}
        title={isSoundOn ? t.serendipity.muteAmbient : t.serendipity.playAmbient}
      >
        <div className="ambient-audio-glow" ref={soundGlowRef} />
        <span className="sound-text">
          {isSoundOn ? t.serendipity.listening : t.serendipity.soundscape}
        </span>
        <div className="audio-breathing-dots">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="audio-dot"
              ref={(el) => { if (el) soundDotRefs.current[i] = el; }}
              onMouseMove={handleSoundDotMouseMove}
              onMouseLeave={handleSoundDotMouseLeave}
            />
          ))}
        </div>
        <div className="sound-particles" ref={soundParticlesRef} />
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
            depth={DEPTH_PROPS[idx % DEPTH_PROPS.length]}
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
        onMouseMove={handleCardMouseMove}
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
        {/* Premium edge-glow swipe feedback */}
        {dragX !== 0 && (() => {
          const dir = dragX > 0 ? 'right' : 'left';
          const c = dir === 'right' ? COLORS.keep : COLORS.forget;
          const intensity = Math.min(Math.abs(dragX) / 180, 1);
          const pct = Math.min(Math.abs(dragX) / 3, 50); // gradient stop %
          return (
            <>
              {/* Edge glow gradient - warm pigment seeping from drag side */}
              <div
                className="drag-edge-glow"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 'var(--radius-md)',
                  pointerEvents: 'none',
                  zIndex: 10,
                  background: dir === 'right'
                    ? `linear-gradient(to left, rgba(${c.rgb}, ${intensity * 0.2}), transparent ${pct}%)`
                    : `linear-gradient(to right, rgba(${c.rgb}, ${intensity * 0.2}), transparent ${pct}%)`,
                  opacity: intensity,
                }}
              />
            </>
          );
        })()}

        <SerendipityActiveCard item={currentItem} />
      </button>

      {/* Particle container for throw effects */}
      <div className="serendipity-particles" ref={particleContainerRef} />

      <div className="serendipity-actions" ref={actionsRef}>
        <div className="serendipity-actions-bubble" ref={bubbleRef} />
        <button
          className="serendipity-btn btn-forget"
          ref={forgetBtnRef}
          onClick={() => throwCard('left')}
          onMouseMove={(e) => handleMagnetMove(e, forgetBtnRef)}
          onMouseLeave={() => handleMagnetLeave(forgetBtnRef)}
          title={t.serendipity.forgetBtn}
        >
          {t.serendipity.forgetBtn}
        </button>

        <span className="serendipity-actions-divider" />

        <button
          className="serendipity-btn btn-keep"
          ref={keepBtnRef}
          onClick={() => throwCard('right')}
          onMouseMove={(e) => handleMagnetMove(e, keepBtnRef)}
          onMouseLeave={() => handleMagnetLeave(keepBtnRef)}
          title={t.serendipity.keepBtn}
        >
          {t.serendipity.keepBtn}
        </button>

        {/* Ambient glow beneath the actions capsule */}
        <div className="serendipity-actions-glow" ref={glowRef} />
      </div>
    </main>
  );
};
