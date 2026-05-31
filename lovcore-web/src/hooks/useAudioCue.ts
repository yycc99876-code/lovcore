'use client';

/**
 * useAudioCue — Web Audio API synthesized audio cues for voice interactions.
 *
 * All sounds are generated programmatically — no audio files needed.
 * Respects prefers-reduced-motion. AudioContext is unlocked on first user interaction.
 */

import { useCallback, useEffect, useRef } from 'react';

type CueType = 'push-start' | 'push-stop' | 'handsfree-start' | 'handsfree-stop' | 'transcribing' | 'error';

interface CueParams {
  frequencies: number[];
  duration: number;
  gainPeak: number;
  attack: number;
  decay: number;
  filterFreq?: number;
  delayTime?: number;
  delayFeedback?: number;
}

const CUE_CONFIGS: Record<CueType, CueParams> = {
  'push-start': {
    frequencies: [587, 740],
    duration: 110,
    gainPeak: 0.045,
    attack: 8,
    decay: 90,
    filterFreq: 4200,
    delayTime: 45,
    delayFeedback: 0.12,
  },
  'push-stop': {
    frequencies: [520, 392],
    duration: 120,
    gainPeak: 0.035,
    attack: 8,
    decay: 110,
    filterFreq: 3800,
  },
  'handsfree-start': {
    frequencies: [261.63, 392, 523.25],
    duration: 500,
    gainPeak: 0.035,
    attack: 30,
    decay: 420,
    filterFreq: 3600,
    delayTime: 90,
    delayFeedback: 0.18,
  },
  'handsfree-stop': {
    frequencies: [523, 392, 261],
    duration: 380,
    gainPeak: 0.032,
    attack: 15,
    decay: 300,
    filterFreq: 3200,
  },
  transcribing: {
    frequencies: [880],
    duration: 160,
    gainPeak: 0.018,
    attack: 10,
    decay: 140,
    filterFreq: 5000,
  },
  error: {
    frequencies: [180, 140],
    duration: 180,
    gainPeak: 0.035,
    attack: 8,
    decay: 160,
    filterFreq: 900,
  },
};

export function useAudioCue() {
  const ctxRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);
  const mutedRef = useRef(false);

  // Check reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) mutedRef.current = true;

    const handler = (e: MediaQueryListEvent) => {
      mutedRef.current = e.matches;
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Unlock AudioContext on first user interaction
  useEffect(() => {
    const unlock = () => {
      if (unlockedRef.current) return;
      try {
        const ctx = new AudioContext();
        // Play a silent buffer to unlock
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        ctxRef.current = ctx;
        unlockedRef.current = true;
      } catch {
        // Audio not available
      }
    };

    document.addEventListener('keydown', unlock, { once: true });
    document.addEventListener('pointerdown', unlock, { once: true });
    return () => {
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('pointerdown', unlock);
    };
  }, []);

  const play = useCallback((type: CueType) => {
    try {
    if (mutedRef.current) return;
    const ctx = ctxRef.current;
    if (!ctx || ctx.state === 'closed') return;

    // Resume if suspended
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const config = CUE_CONFIGS[type];
    const now = ctx.currentTime;
    const endAt = now + config.duration / 1000;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = config.filterFreq ?? 5000;
    filter.connect(ctx.destination);

    // Optional delay
    let outputNode: AudioNode = filter;
    if (config.delayTime && config.delayFeedback) {
      const delay = ctx.createDelay(1);
      delay.delayTime.value = config.delayTime / 1000;
      const feedback = ctx.createGain();
      feedback.gain.value = config.delayFeedback;
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(filter);
      outputNode = delay;
    }

    for (const freq of config.frequencies) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      // Slight frequency sweep for character
      if (config.frequencies.length > 1) {
        const lastFreq = config.frequencies[config.frequencies.length - 1];
        if (freq !== lastFreq) {
          osc.frequency.linearRampToValueAtTime(lastFreq, endAt);
        }
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(config.gainPeak, now + config.attack / 1000);
      gain.gain.linearRampToValueAtTime(0, endAt);

      osc.connect(gain);
      gain.connect(outputNode);

      osc.start(now);
      osc.stop(endAt + 0.01);
    }
    } catch {
      // AudioContext not unlocked or unavailable — silent fail
    }
  }, []);

  return { play, setMuted: (m: boolean) => { mutedRef.current = m; } };
}
