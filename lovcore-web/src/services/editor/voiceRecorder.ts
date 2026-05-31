/**
 * Voice recorder service for Lovcore.
 *
 * Phase 2: Real transcription using Web Speech API (primary)
 * and MediaRecorder + /api/ai/transcribe (fallback).
 */

const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition // eslint-disable-line @typescript-eslint/no-explicit-any
    : null;

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let recordingStartTime = 0;
let isRecordingActive = false;
let recognition: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
let recognitionTranscript = '';

export interface VoiceRecorderState {
  isRecording: boolean;
  duration: number;
}

export function startVoiceRecording(): void {
  isRecordingActive = true;
  recordingStartTime = Date.now();
  recognitionTranscript = '';
  audioChunks = [];

  // Start Web Speech API recognition if available
  if (SpeechRecognitionAPI) {
    try {
      recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';

      recognition.onresult = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        let final = '';
        for (let i = 0; i < event.results.length; i++) {
          final += event.results[i][0].transcript;
        }
        recognitionTranscript = final;
      };

      recognition.onerror = () => {
        // Fall back silently — MediaRecorder will handle it
      };

      recognition.start();
    } catch {
      recognition = null;
    }
  }

  // Also start MediaRecorder as fallback
  if (navigator.mediaDevices?.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      if (!isRecordingActive) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      try {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm',
        });

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.start(250);
      } catch {
        // MediaRecorder not supported — rely on Speech API only
      }
    }).catch(() => {
      // Microphone permission denied
    });
  }
}

export async function stopVoiceRecording(): Promise<string> {
  const elapsed = recordingStartTime ? Date.now() - recordingStartTime : 0;
  const MIN_RECORDING_MS = 600;

  if (elapsed < MIN_RECORDING_MS && isRecordingActive) {
    await new Promise((r) => setTimeout(r, MIN_RECORDING_MS - elapsed));
  }

  isRecordingActive = false;
  recordingStartTime = 0;

  // Stop Web Speech API
  if (recognition) {
    try { recognition.stop(); } catch { /* ignore */ }
    recognition = null;
  }

  // Stop MediaRecorder
  const audioBlob = await new Promise<Blob | null>((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      resolve(null);
      return;
    }

    mediaRecorder.onstop = () => {
      const blob = audioChunks.length > 0 ? new Blob(audioChunks, { type: 'audio/webm' }) : null;
      audioChunks = [];
      resolve(blob);
    };

    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach((t) => t.stop());
    mediaRecorder = null;
  });

  // Use Web Speech API result if available
  if (recognitionTranscript.trim()) {
    return recognitionTranscript.trim();
  }

  // Fallback: send audio to backend ASR
  if (audioBlob && audioBlob.size > 0) {
    return transcribeViaBackend(audioBlob);
  }

  return '';
}

async function transcribeViaBackend(blob: Blob): Promise<string> {
  const reader = new FileReader();
  const base64 = await new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  if (!base64) return '';

  try {
    const response = await fetch('/api/ai/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: base64 }),
    });

    if (!response.ok) return '';

    const data = await response.json();
    return data.text || '';
  } catch {
    return '';
  }
}

export function cancelVoiceRecording(): void {
  isRecordingActive = false;
  recordingStartTime = 0;
  recognitionTranscript = '';

  if (recognition) {
    try { recognition.stop(); } catch { /* ignore */ }
    recognition = null;
  }

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach((t) => t.stop());
    mediaRecorder = null;
  }

  audioChunks = [];
}

export function getRecordingDuration(): number {
  if (!isRecordingActive || !recordingStartTime) return 0;
  return Date.now() - recordingStartTime;
}

export function isVoiceRecording(): boolean {
  return isRecordingActive;
}
