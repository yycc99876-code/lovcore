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
    frequencies: [659.25, 987.77, 1318.51],
    duration: 260,
    gainPeak: 0.028,
    attack: 18,
    decay: 230,
    filterFreq: 6200,
    delayTime: 70,
    delayFeedback: 0.2,
  },
  'push-stop': {
    frequencies: [987.77, 739.99],
    duration: 220,
    gainPeak: 0.022,
    attack: 12,
    decay: 190,
    filterFreq: 5200,
    delayTime: 55,
    delayFeedback: 0.12,
  },
  'handsfree-start': {
    frequencies: [329.63, 493.88, 783.99, 1174.66],
    duration: 720,
    gainPeak: 0.026,
    attack: 42,
    decay: 620,
    filterFreq: 7000,
    delayTime: 120,
    delayFeedback: 0.24,
  },
  'handsfree-stop': {
    frequencies: [1174.66, 783.99, 493.88],
    duration: 520,
    gainPeak: 0.022,
    attack: 24,
    decay: 460,
    filterFreq: 5600,
    delayTime: 100,
    delayFeedback: 0.16,
  },
  transcribing: {
    frequencies: [1046.5, 1567.98],
    duration: 340,
    gainPeak: 0.018,
    attack: 28,
    decay: 300,
    filterFreq: 6800,
    delayTime: 80,
    delayFeedback: 0.18,
  },
  error: {
    frequencies: [220, 174.61],
    duration: 240,
    gainPeak: 0.026,
    attack: 10,
    decay: 220,
    filterFreq: 1200,
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
