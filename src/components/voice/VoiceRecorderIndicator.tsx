/**
 * VoiceRecorderIndicator - Lovcore voice atmosphere.
 *
 * Immersive mode is used by the expanded editor. Compact mode stays inside
 * the small Quick Note surface so it does not cover the paper controls.
 */

import { useEffect, useRef } from 'react';
import { AudioLines, Mic } from 'lucide-react';
import type { VoiceState } from '../../hooks/useVoiceCapture';
import { useTranslation } from '../../i18n';
import { LogoIcon } from '../LogoIcon';

interface VoiceRecorderIndicatorProps {
  voiceState: VoiceState;
  onDismissRewrite?: () => void;
  onAcceptRewrite?: () => void;
  displayMode?: 'immersive' | 'compact';
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `0:${sec.toString().padStart(2, '0')}`;
}

function getMode(voiceState: VoiceState): 'push' | 'handsfree' | 'transcribing' | 'ready' | 'error' {
  if (voiceState.status === 'hands-free-recording') return 'handsfree';
  if (voiceState.status === 'transcribing') return 'transcribing';
  if (voiceState.status === 'ready') return 'ready';
  if (voiceState.status === 'error') return 'error';
  return 'push';
}

function getTranscript(voiceState: VoiceState): string {
  if (voiceState.status === 'push-to-talk-recording' || voiceState.status === 'hands-free-recording') {
    return voiceState.transcript;
  }
  if (voiceState.status === 'transcribing') return voiceState.transcript;
  if (voiceState.status === 'ready') return voiceState.transcript;
  return '';
}

export function VoiceRecorderIndicator({
  voiceState,
  onDismissRewrite,
  onAcceptRewrite,
  displayMode = 'immersive',
}: VoiceRecorderIndicatorProps) {
  const { t } = useTranslation();
  const transcriptRef = useRef<HTMLDivElement>(null);
  const transcript = getTranscript(voiceState);

  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [transcript]);

  if (!voiceState || voiceState.status === 'idle') return null;

  const mode = getMode(voiceState);
  const isRecording = voiceState.status === 'push-to-talk-recording' || voiceState.status === 'hands-free-recording';
  const duration = isRecording ? formatDuration(voiceState.duration) : '';
  const isRewrite = isRecording && voiceState.target.kind === 'rewrite-selection';
  const isHandsfree = voiceState.status === 'hands-free-recording';
  const listeningText = t.voice.recording === 'Recording' ? 'Listening, speak...' : '我在听，请说...';
  const title = isHandsfree
    ? t.voice.handsfree
    : voiceState.status === 'transcribing'
      ? t.voice.transcribing
      : voiceState.status === 'ready'
        ? (voiceState.rewritePreview ? t.voice.rewritePreview : 'Captured')
        : voiceState.status === 'error'
          ? 'Voice Error'
          : t.voice.recording;
  const fallback = voiceState.status === 'transcribing'
    ? t.voice.transcribing
    : voiceState.status === 'ready'
      ? transcript
      : isHandsfree
        ? t.voice.stopHintHandsfree
        : listeningText;
  const displayText = transcript || fallback;

  if (displayMode === 'compact') {
    return (
      <div className={`voice-compact voice-compact-${mode}`} aria-live="polite">
        <div className="voice-compact-mark">
          <LogoIcon size={22} />
        </div>
        <div className="voice-compact-copy">
          <span className="voice-compact-title">
            {title}
            {isRewrite ? ` ${t.voice.instruction}` : ''}
          </span>
          <div
            ref={transcriptRef}
            className={`voice-compact-transcript ${transcript ? 'has-transcript' : ''}`}
          >
            {displayText}
            {voiceState.status === 'transcribing' && (
              <span className="voice-transcribing-dots" />
            )}
          </div>
        </div>
        <div className="voice-compact-wave" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="voice-compact-badge">
          {duration || (voiceState.status === 'transcribing' ? <AudioLines size={15} /> : <Mic size={14} />)}
        </div>
      </div>
    );
  }

  return (
    <div className={`voice-immersive voice-immersive-${mode}`} aria-live="polite">
      <div className="voice-ambient-rim voice-ambient-rim-a" />
      <div className="voice-ambient-rim voice-ambient-rim-b" />
      <div className="voice-aurora voice-aurora-left" />
      <div className="voice-aurora voice-aurora-right" />

      {voiceState.status === 'ready' && voiceState.rewritePreview && (
        <div className="voice-rewrite-preview">
          <div className="voice-rewrite-label">
            <LogoIcon size={16} />
            {t.voice.rewritePreview}
          </div>
          <div className="voice-rewrite-text">{voiceState.rewritePreview}</div>
          <div className="voice-rewrite-actions">
            <button type="button" className="voice-rewrite-btn accept" onClick={onAcceptRewrite}>
              {t.voice.apply}
            </button>
            <button type="button" className="voice-rewrite-btn dismiss" onClick={onDismissRewrite}>
              {t.voice.cancel}
            </button>
          </div>
        </div>
      )}

      {voiceState.status === 'error' && (
        <div className="voice-error-card">
          <span>{voiceState.message ?? 'Transcription failed'}</span>
          <small>{t.voice.dismissHint}</small>
        </div>
      )}

      <div className="voice-command-dock">
        <div className="voice-plus-mark">
          <LogoIcon size={28} />
        </div>
        <div className="voice-dock-copy">
          <span className="voice-dock-title">
            {title}
            {isRewrite ? ` ${t.voice.instruction}` : ''}
          </span>
          <div
            ref={transcriptRef}
            className={`voice-dock-subtitle ${transcript ? 'has-transcript' : ''}`}
          >
            {displayText}
            {voiceState.status === 'transcribing' && (
              <span className="voice-transcribing-dots" />
            )}
          </div>
        </div>
        <div className="voice-wave-cluster" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="voice-dock-badge">
          {duration || (voiceState.status === 'transcribing' ? <AudioLines size={18} /> : <Mic size={17} />)}
        </div>
      </div>
    </div>
  );
}
