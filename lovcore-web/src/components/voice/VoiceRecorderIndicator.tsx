'use client';

/**
 * VoiceRecorderIndicator — Voice recording status UI.
 *
 * Renders based on the spec's 6-state voice machine:
 * idle | push-to-talk-recording | hands-free-recording | transcribing | ready | error
 */

import type { VoiceState } from '../../hooks/useVoiceCapture';
import { useTranslation } from '../../i18n';

interface VoiceRecorderIndicatorProps {
  voiceState: VoiceState;
  onDismissRewrite?: () => void;
  onAcceptRewrite?: () => void;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
}

export function VoiceRecorderIndicator({
  voiceState,
  onDismissRewrite,
  onAcceptRewrite,
}: VoiceRecorderIndicatorProps) {
  const { t } = useTranslation();
  if (!voiceState || voiceState.status === 'idle') return null;

  return (
    <div className="voice-recorder-indicator">
      {(voiceState.status === 'push-to-talk-recording' || voiceState.status === 'hands-free-recording') && (
        <div className={`voice-status recording ${voiceState.status === 'hands-free-recording' ? 'handsfree' : ''}`}>
          <span className="voice-dot pulse" />
          <span>
            {voiceState.status === 'hands-free-recording' ? t.voice.handsfree : t.voice.recording}
            {voiceState.target?.kind === 'rewrite-selection' && ` ${t.voice.instruction}`}
          </span>
          {(voiceState.duration ?? 0) > 0 && (
            <span className="voice-duration">{formatDuration(voiceState.duration)}</span>
          )}
          <span className="voice-hint">
            {voiceState.status === 'hands-free-recording'
              ? t.voice.stopHintHandsfree
              : t.voice.stopHintRecording}
          </span>
        </div>
      )}

      {voiceState.status === 'transcribing' && (
        <div className="voice-status transcribing">
          <span className="voice-spinner" />
          <span>{t.voice.transcribing}</span>
        </div>
      )}

      {voiceState.status === 'error' && (
        <div className="voice-status error">
          <span>{voiceState.message ?? 'Unknown error'}</span>
          <span className="voice-hint">{t.voice.dismissHint}</span>
        </div>
      )}

      {voiceState.status === 'ready' && voiceState.rewritePreview && (
        <div className="voice-rewrite-preview">
          <div className="voice-rewrite-label">{t.voice.rewritePreview}</div>
          <div className="voice-rewrite-text">{voiceState.rewritePreview}</div>
          <div className="voice-rewrite-actions">
            <button
              type="button"
              className="voice-rewrite-btn accept"
              onClick={onAcceptRewrite}
            >
              {t.voice.apply}
            </button>
            <button
              type="button"
              className="voice-rewrite-btn dismiss"
              onClick={onDismissRewrite}
            >
              {t.voice.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
