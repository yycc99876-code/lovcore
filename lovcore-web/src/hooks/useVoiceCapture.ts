'use client';

/**
 * useVoiceCapture — Voice input hook with spec-compliant state machine.
 *
 * Phase 1: Mock transcripts with real keyboard interaction.
 * Phase 2: MediaRecorder + /api/ai/transcribe.
 *
 * States (per GHOST_VOICE_IMPLEMENTATION_GOAL.md):
 *   idle → push-to-talk-recording → transcribing → ready → idle
 *   idle → hands-free-recording → transcribing → ready → idle
 *   any → error → idle
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { aiClient } from '../ai/client';
import {
  startVoiceRecording,
  stopVoiceRecording,
  cancelVoiceRecording,
  getRecordingDuration,
} from '../services/editor/voiceRecorder';
import type { useAudioCue } from './useAudioCue';

export type VoiceTarget =
  | { kind: 'insert-at-cursor'; cursorPos: number }
  | { kind: 'rewrite-selection'; from: number; to: number; selectedText: string };

export type VoiceState =
  | { status: 'idle' }
  | { status: 'push-to-talk-recording'; startedAt: number; target: VoiceTarget; duration: number }
  | { status: 'hands-free-recording'; startedAt: number; target: VoiceTarget; duration: number }
  | { status: 'transcribing'; target: VoiceTarget }
  | { status: 'ready'; transcript: string; target: VoiceTarget; rewritePreview: string | null }
  | { status: 'error'; message: string };

const IDLE: VoiceState = { status: 'idle' };

interface UseVoiceCaptureOptions {
  editor: Editor | null;
  onInsert: (text: string) => void;
  audioCue: ReturnType<typeof useAudioCue>;
}

export function useVoiceCapture({ editor, onInsert, audioCue }: UseVoiceCaptureOptions) {
  const [state, setState] = useState<VoiceState>(IDLE);
  const handsFreeRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);

  useEffect(() => { stateRef.current = state; }, [state]);

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (durationIntervalRef.current) { clearInterval(durationIntervalRef.current); durationIntervalRef.current = null; }
  }, []);

  const buildTarget = useCallback((): VoiceTarget => {
    if (!editor) return { kind: 'insert-at-cursor', cursorPos: 0 };
    const { from, to, empty } = editor.state.selection;
    if (!empty) {
      const selectedText = editor.state.doc.textBetween(from, to);
      return { kind: 'rewrite-selection', from, to, selectedText };
    }
    return { kind: 'insert-at-cursor', cursorPos: from };
  }, [editor]);

  const startRecording = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== 'idle' && s.status !== 'error') return;

    const target = buildTarget();
    const now = Date.now();
    startVoiceRecording();
    audioCue.play(handsFreeRef.current ? 'handsfree-start' : 'push-start');

    if (handsFreeRef.current) {
      setState({ status: 'hands-free-recording', startedAt: now, target, duration: 0 });
    } else {
      setState({ status: 'push-to-talk-recording', startedAt: now, target, duration: 0 });
    }

    // Duration timer
    durationIntervalRef.current = setInterval(() => {
      setState(prev => {
        if (prev.status !== 'push-to-talk-recording' && prev.status !== 'hands-free-recording') return prev;
        return { ...prev, duration: getRecordingDuration() };
      });
    }, 200);
  }, [buildTarget, audioCue]);

  const stopAndTranscribe = useCallback(async () => {
    const s = stateRef.current;
    if (s.status !== 'push-to-talk-recording' && s.status !== 'hands-free-recording') return;

    cleanup();
    audioCue.play('push-stop');
    setState({ status: 'transcribing', target: s.target });
    audioCue.play('transcribing');

    try {
      const transcript = await stopVoiceRecording();

      if (!transcript.trim()) {
        setState(IDLE);
        return;
      }

      if (s.target.kind === 'rewrite-selection' && editor) {
        // Rewrite mode: send to AI
        try {
          const result = await aiClient.rewrite({
            text: s.target.selectedText,
            instruction: transcript,
          });
          setState({
            status: 'ready',
            transcript,
            target: s.target,
            rewritePreview: result.rewritten,
          });
        } catch {
          setState({ status: 'error', message: 'Rewrite failed' });
          audioCue.play('error');
        }
      } else {
        // Dictation mode: go to ready, then auto-insert
        setState({
          status: 'ready',
          transcript,
          target: s.target,
          rewritePreview: null,
        });
        // Auto-insert dictation after a brief moment
        onInsert(transcript);
        setTimeout(() => {
          if (stateRef.current.status === 'ready' && !stateRef.current.rewritePreview) {
            setState(IDLE);
          }
        }, 50);
      }
    } catch {
      cancelVoiceRecording();
      audioCue.play('error');
      setState({ status: 'error', message: 'Transcription failed' });
    }
  }, [cleanup, editor, onInsert, audioCue]);

  const stopHandsFree = useCallback(() => {
    handsFreeRef.current = false;
    stopAndTranscribe();
  }, [stopAndTranscribe]);

  const cancelRecording = useCallback(() => {
    cleanup();
    handsFreeRef.current = false;
    cancelVoiceRecording();
    setState(IDLE);
  }, [cleanup]);

  const acceptRewrite = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== 'ready' || !s.rewritePreview || !editor) return;
    if (s.target.kind !== 'rewrite-selection') return;
    const { from, to } = s.target;
    try {
      // Use direct transaction to avoid chain instability
      const { state } = editor;
      const safeFrom = Math.min(from, state.doc.content.size);
      const safeTo = Math.min(to, state.doc.content.size);
      if (safeFrom >= safeTo) { setState(IDLE); return; }
      const tr = state.tr.delete(safeFrom, safeTo).insertText(s.rewritePreview, safeFrom);
      editor.view.dispatch(tr);
      editor.commands.focus();
    } catch (err) {
      console.error('[Voice] acceptRewrite failed:', err);
    }
    setState(IDLE);
  }, [editor]);

  const dismissRewrite = useCallback(() => {
    setState(IDLE);
  }, []);

  // Keydown handler
  const handleKeyDown = useCallback((event: KeyboardEvent): boolean => {
    const s = stateRef.current;

    if (event.key === 'Insert') {
      // Block repeated keydown events from re-triggering
      if (event.repeat) return true;
      event.preventDefault();

      // Ctrl+Insert: toggle hands-free
      if (event.ctrlKey || event.metaKey) {
        if (handsFreeRef.current) {
          stopHandsFree();
        } else {
          // Only start from idle or error
          if (s.status !== 'idle' && s.status !== 'error') return true;
          handsFreeRef.current = true;
          startRecording();
          // Auto-stop after 60s
          timerRef.current = setTimeout(() => stopHandsFree(), 60000);
        }
        return true;
      }

      // Insert: start push-to-talk (only from idle or error)
      if (s.status === 'idle' || s.status === 'error') {
        handsFreeRef.current = false;
        startRecording();
      }
      return true;
    }

    // Esc: cancel or dismiss
    if (event.key === 'Escape') {
      if (s.status === 'ready' && s.rewritePreview) {
        dismissRewrite();
        return true;
      }
      if (s.status === 'push-to-talk-recording' || s.status === 'hands-free-recording') {
        cancelRecording();
        return true;
      }
      if (s.status === 'error') {
        setState(IDLE);
        return true;
      }
    }

    // Enter: accept rewrite preview
    if (event.key === 'Enter' && s.status === 'ready' && s.rewritePreview) {
      event.preventDefault();
      acceptRewrite();
      return true;
    }

    return false;
  }, [startRecording, stopHandsFree, cancelRecording, dismissRewrite, acceptRewrite]);

  // Keyup handler for Insert release (push-to-talk stop)
  const handleKeyUp = useCallback((event: KeyboardEvent): boolean => {
    if (event.key === 'Insert' && !handsFreeRef.current) {
      const s = stateRef.current;
      if (s.status === 'push-to-talk-recording') {
        stopAndTranscribe();
        return true;
      }
    }
    return false;
  }, [stopAndTranscribe]);

  useEffect(() => cleanup, [cleanup]);

  // Derive convenience fields for consumers
  const isVoiceActive = state.status === 'push-to-talk-recording'
    || state.status === 'hands-free-recording'
    || state.status === 'transcribing';

  const rewritePreview = state.status === 'ready' ? state.rewritePreview : null;
  const errorMessage = state.status === 'error' ? state.message : null;

  return {
    voiceState: state,
    // Convenience accessors for components that need them
    isVoiceActive,
    rewritePreview,
    errorMessage,
    handleKeyDown,
    handleKeyUp,
    acceptRewrite,
    dismissRewrite,
    cancelRecording,
  };
}
