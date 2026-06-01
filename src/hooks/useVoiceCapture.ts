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
  stopVoiceRecordingDetailed,
  cancelVoiceRecording,
  getRecordingDuration,
} from '../services/editor/voiceRecorder';
import type { VoiceMode } from '../services/editor/voiceRecorder';
import { hasEditorView } from '../services/editor/editorView';
import type { useAudioCue } from './useAudioCue';

export type VoiceTarget =
  | { kind: 'insert-at-cursor'; cursorPos: number }
  | { kind: 'rewrite-selection'; from: number; to: number; selectedText: string };

export type VoiceState =
  | { status: 'idle' }
  | { status: 'push-to-talk-recording'; startedAt: number; target: VoiceTarget; duration: number; transcript: string }
  | { status: 'hands-free-recording'; startedAt: number; target: VoiceTarget; duration: number; transcript: string }
  | { status: 'transcribing'; target: VoiceTarget; transcript: string }
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
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('accurate');
  const handsFreeRef = useRef(false);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  const voiceModeRef = useRef(voiceMode);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);

  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) { clearInterval(durationIntervalRef.current); durationIntervalRef.current = null; }
  }, []);

  const buildTarget = useCallback((): VoiceTarget => {
    if (!editor) return { kind: 'insert-at-cursor', cursorPos: 0 };
    const { from } = editor.state.selection;
    return { kind: 'insert-at-cursor', cursorPos: from };
  }, [editor]);

  const startRecording = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== 'idle' && s.status !== 'error') return;

    const target = buildTarget();
    const now = Date.now();
    startVoiceRecording(({ transcript }) => {
      setState(prev => {
        if (prev.status !== 'push-to-talk-recording' && prev.status !== 'hands-free-recording') return prev;
        return { ...prev, transcript };
      });
    });
    audioCue.play(handsFreeRef.current ? 'handsfree-start' : 'push-start');

    if (handsFreeRef.current) {
      setState({ status: 'hands-free-recording', startedAt: now, target, duration: 0, transcript: '' });
    } else {
      setState({ status: 'push-to-talk-recording', startedAt: now, target, duration: 0, transcript: '' });
    }

    // Duration timer
    durationIntervalRef.current = setInterval(() => {
      setState(prev => {
        if (prev.status !== 'push-to-talk-recording' && prev.status !== 'hands-free-recording') return prev;
        return { ...prev, duration: getRecordingDuration() };
      });
    }, 140);
  }, [buildTarget, audioCue]);

  const stopAndTranscribe = useCallback(async () => {
    const s = stateRef.current;
    if (s.status !== 'push-to-talk-recording' && s.status !== 'hands-free-recording') return;

    const recordingTranscript = s.transcript.trim();
    cleanup();
    audioCue.play(s.status === 'hands-free-recording' ? 'handsfree-stop' : 'push-stop');
    // Enter transcribing state, preserving any transcript captured during recording
    setState({ status: 'transcribing', target: s.target, transcript: recordingTranscript });
    audioCue.play('transcribing');

    try {
      const selectedMode = voiceModeRef.current;
      const result = await stopVoiceRecordingDetailed({ mode: selectedMode });
      let transcript = result.text.trim() || recordingTranscript;

      if (!transcript.trim()) {
        setState(IDLE);
        return;
      }

      if (selectedMode === 'accurate' && result.source === 'backend') {
        transcript = normalizeFinalTranscript(transcript);
      }

      // Update transcribing state with the final transcript so UI shows it
      setState(prev => {
        if (prev.status !== 'transcribing') return prev;
        return { ...prev, transcript };
      });

      // Brief pause so user can see the final transcript in the transcribing state
      await new Promise(r => setTimeout(r, 400));

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
        }, 2000);
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
    if (!hasEditorView(editor)) return;
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

  const toggleVoiceMode = useCallback(() => {
    setVoiceMode((mode) => (mode === 'accurate' ? 'fast' : 'accurate'));
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
    voiceMode,
    setVoiceMode,
    toggleVoiceMode,
  };
}

function normalizeFinalTranscript(transcript: string): string {
  const source = transcript.trim();
  if (!source) return '';

  return source
    .replace(/\s+/g, ' ')
    .replace(/\s+([，。！？；：、])/g, '$1')
    .replace(/([，。！？；：、])\s+/g, '$1')
    .replace(/([。！？]){2,}/g, '$1')
    .replace(/([，、]){2,}/g, '$1')
    .trim();
}
