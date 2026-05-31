/**
 * Voice recorder service for Lovcore.
 *
 * Uses Bailian Realtime ASR for live transcription and MediaRecorder as a
 * fallback for final backend transcription.
 */

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type VoiceTranscriptPayload = {
  transcript: string;
  finalTranscript: string;
  interimTranscript: string;
};

const SpeechRecognitionAPI: SpeechRecognitionConstructor | null =
  typeof window !== 'undefined'
    ? ((window as Window & {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      }).SpeechRecognition
      || (window as Window & {
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      }).webkitSpeechRecognition
      || null)
    : null;

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let recordingStartTime = 0;
let isRecordingActive = false;
let recognition: SpeechRecognitionLike | null = null;
let recognitionTranscript = '';
let recognitionFinalTranscript = '';
let recognitionInterimTranscript = '';
let recognitionVisibleTranscript = '';
let transcriptListener: ((payload: VoiceTranscriptPayload) => void) | null = null;
let realtimeSocket: WebSocket | null = null;
let audioContext: AudioContext | null = null;
let audioSource: MediaStreamAudioSourceNode | null = null;
let audioProcessor: ScriptProcessorNode | null = null;
let realtimeTranscript = '';
let realtimeFinalTranscript = '';
let realtimeInterimTranscript = '';
let realtimeFailed = false;

export interface VoiceRecorderState {
  isRecording: boolean;
  duration: number;
}

function emitTranscript() {
  const realtimeLive = realtimeTranscript.trim()
    || `${realtimeFinalTranscript}${realtimeInterimTranscript}`.trim();
  const liveTranscript =
    realtimeLive
    || `${recognitionFinalTranscript}${recognitionInterimTranscript}`.trim();
  if (liveTranscript) {
    recognitionVisibleTranscript = liveTranscript;
  }
  const transcript = liveTranscript || recognitionVisibleTranscript;
  recognitionTranscript = transcript;
  transcriptListener?.({
    transcript,
    finalTranscript: realtimeFinalTranscript.trim() || recognitionFinalTranscript.trim(),
    interimTranscript: realtimeInterimTranscript.trim() || recognitionInterimTranscript.trim(),
  });
}

function getVoiceLanguage(): string {
  const lang = document.documentElement.lang || navigator.language || 'zh-CN';
  return lang.startsWith('zh') ? 'zh-CN' : 'en-US';
}

function startSpeechRecognitionSession() {
  if (!SpeechRecognitionAPI || !isRecordingActive) return;

  try {
    recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = getVoiceLanguage();

    recognition.onresult = (event) => {
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          recognitionFinalTranscript += text;
        } else {
          interim += text;
        }
      }

      recognitionInterimTranscript = interim;
      emitTranscript();
    };

    recognition.onerror = () => {
      emitTranscript();
    };

    recognition.onend = () => {
      recognition = null;
      emitTranscript();

      // Chrome can stop continuous recognition after silence. Keep listening
      // while Lovcore is still in a recording state.
      if (isRecordingActive) {
        window.setTimeout(startSpeechRecognitionSession, 120);
      }
    };

    recognition.start();
  } catch {
    recognition = null;
  }
}

function getRealtimeAsrUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const language = getVoiceLanguage().startsWith('zh') ? 'zh' : 'en';
  return `${protocol}//${window.location.host}/api/ai/realtime-asr?language=${language}`;
}

function floatTo16BitPcm(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return buffer;
}

function downsampleBuffer(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (outputRate === inputRate) return input;
  if (outputRate > inputRate) return input;

  const ratio = inputRate / outputRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), input.length);
    let sum = 0;
    let count = 0;

    for (let j = start; j < end; j += 1) {
      sum += input[j];
      count += 1;
    }

    output[i] = count > 0 ? sum / count : 0;
  }

  return output;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return window.btoa(binary);
}

function startRealtimeAsrSession(stream: MediaStream): void {
  if (!isRecordingActive) return;

  try {
    realtimeSocket = new WebSocket(getRealtimeAsrUrl());
  } catch {
    realtimeFailed = true;
    startSpeechRecognitionSession();
    return;
  }

  realtimeSocket.onopen = () => emitTranscript();

  realtimeSocket.onmessage = (event) => {
    let data: { type?: string; transcript?: string; isFinal?: boolean; message?: string };
    try {
      data = JSON.parse(String(event.data));
    } catch {
      return;
    }

    if (data.type === 'error') {
      realtimeFailed = true;
      if (!recognition) startSpeechRecognitionSession();
      return;
    }

    if (data.type !== 'transcript' || typeof data.transcript !== 'string') return;

    realtimeTranscript = data.transcript;
    if (data.isFinal) {
      realtimeFinalTranscript = data.transcript;
      realtimeInterimTranscript = '';
    } else {
      realtimeInterimTranscript = data.transcript;
    }
    emitTranscript();
  };

  realtimeSocket.onerror = () => {
    realtimeFailed = true;
    if (!recognition) startSpeechRecognitionSession();
  };

  realtimeSocket.onclose = () => {
    if (isRecordingActive && realtimeFailed && !recognition) {
      startSpeechRecognitionSession();
    }
  };

  const AudioContextCtor = window.AudioContext
    || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) {
    realtimeFailed = true;
    startSpeechRecognitionSession();
    return;
  }

  audioContext = new AudioContextCtor();
  void audioContext.resume().catch(() => undefined);
  audioSource = audioContext.createMediaStreamSource(stream);
  audioProcessor = audioContext.createScriptProcessor(4096, 1, 1);

  audioProcessor.onaudioprocess = (event) => {
    if (!isRecordingActive || !realtimeSocket || realtimeSocket.readyState !== WebSocket.OPEN) return;

    const input = event.inputBuffer.getChannelData(0);
    const downsampled = downsampleBuffer(input, audioContext?.sampleRate || 48000, 16000);
    const audio = arrayBufferToBase64(floatTo16BitPcm(downsampled));
    realtimeSocket.send(JSON.stringify({ type: 'audio', audio }));
  };

  audioSource.connect(audioProcessor);
  audioProcessor.connect(audioContext.destination);
}

async function stopRealtimeAsrSession(): Promise<void> {
  if (audioProcessor) {
    audioProcessor.disconnect();
    audioProcessor.onaudioprocess = null;
    audioProcessor = null;
  }

  if (audioSource) {
    audioSource.disconnect();
    audioSource = null;
  }

  if (audioContext) {
    await audioContext.close().catch(() => undefined);
    audioContext = null;
  }

  if (!realtimeSocket) return;

  const socket = realtimeSocket;
  realtimeSocket = null;

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'commit' }));
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    socket.send(JSON.stringify({ type: 'close' }));
    socket.close();
  }
}

function cancelRealtimeAsrSession(): void {
  if (audioProcessor) {
    audioProcessor.disconnect();
    audioProcessor.onaudioprocess = null;
    audioProcessor = null;
  }

  if (audioSource) {
    audioSource.disconnect();
    audioSource = null;
  }

  if (audioContext) {
    void audioContext.close().catch(() => undefined);
    audioContext = null;
  }

  if (realtimeSocket) {
    realtimeSocket.close();
    realtimeSocket = null;
  }
}

export function startVoiceRecording(
  onTranscript?: (payload: VoiceTranscriptPayload) => void,
): void {
  isRecordingActive = true;
  recordingStartTime = Date.now();
  recognitionTranscript = '';
  recognitionFinalTranscript = '';
  recognitionInterimTranscript = '';
  recognitionVisibleTranscript = '';
  realtimeTranscript = '';
  realtimeFinalTranscript = '';
  realtimeInterimTranscript = '';
  realtimeFailed = false;
  transcriptListener = onTranscript ?? null;
  audioChunks = [];

  // Also start MediaRecorder as fallback.
  if (navigator.mediaDevices?.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      if (!isRecordingActive) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      startRealtimeAsrSession(stream);

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
        stream.getTracks().forEach((t) => t.stop());
        if (!recognition) startSpeechRecognitionSession();
      }
    }).catch(() => {
      startSpeechRecognitionSession();
    });
  } else {
    startSpeechRecognitionSession();
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
  // Keep recognitionInterimTranscript for display during backend transcription.
  // It will be included in recognitionTranscript via emitTranscript.
  emitTranscript();

  if (recognition) {
    try { recognition.stop(); } catch { /* ignore */ }
    recognition = null;
  }

  await stopRealtimeAsrSession();

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

  if (recognitionTranscript.trim()) {
    transcriptListener = null;
    return recognitionTranscript.trim();
  }

  if (audioBlob && audioBlob.size > 0) {
    const transcript = await transcribeViaBackend(audioBlob);
    transcriptListener = null;
    return transcript;
  }

  transcriptListener = null;
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

  const voiceLang = getVoiceLanguage().startsWith('zh') ? 'zh' : 'en';

  try {
    const response = await fetch('/api/ai/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64: base64,
        audioMimeType: blob.type || 'audio/webm',
        language: voiceLang,
      }),
    });

    if (!response.ok) return '';

    const data = await response.json() as { text?: string };
    return data.text || '';
  } catch {
    return '';
  }
}

export function cancelVoiceRecording(): void {
  isRecordingActive = false;
  recordingStartTime = 0;
  recognitionTranscript = '';
  recognitionFinalTranscript = '';
  recognitionInterimTranscript = '';
  recognitionVisibleTranscript = '';
  transcriptListener = null;

  if (recognition) {
    try { recognition.stop(); } catch { /* ignore */ }
    recognition = null;
  }

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach((t) => t.stop());
    mediaRecorder = null;
  }

  cancelRealtimeAsrSession();

  audioChunks = [];
}

export function getRecordingDuration(): number {
  if (!isRecordingActive || !recordingStartTime) return 0;
  return Date.now() - recordingStartTime;
}

export function getLiveTranscript(): string {
  return recognitionTranscript.trim();
}

export function isVoiceRecording(): boolean {
  return isRecordingActive;
}
