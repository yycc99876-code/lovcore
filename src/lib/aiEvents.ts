/**
 * AI Event Logger — LOCAL
 *
 * Lightweight logger for AI API calls. Stores recent events in localStorage
 * for debugging and observability. Never stores API keys or full content.
 *
 * Events are bounded to the most recent MAX_EVENTS entries.
 */

export interface AIEvent {
  id: string;
  task: string;
  timestamp: string;
  durationMs: number;
  success: boolean;
  summary?: string;
}

const STORAGE_KEY = 'lovcore_ai_events';
const MAX_EVENTS = 100;

function loadEvents(): AIEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEvents(events: AIEvent[]): void {
  try {
    const bounded = events.slice(-MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bounded));
  } catch {
    // localStorage full or unavailable — silently skip
  }
}

export function logAIEvent(task: string, durationMs: number, success: boolean, summary?: string): void {
  const event: AIEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    task,
    timestamp: new Date().toISOString(),
    durationMs: Math.round(durationMs),
    success,
    summary: summary?.slice(0, 120),
  };

  const events = loadEvents();
  events.push(event);
  saveEvents(events);
}

export function getAIEvents(): AIEvent[] {
  return loadEvents();
}

export function clearAIEvents(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Wraps an AI call with timing and logging.
 * Returns the original result on success, rethrows on failure.
 */
export async function withAILog<T>(task: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    logAIEvent(task, performance.now() - start, true);
    return result;
  } catch (err) {
    logAIEvent(task, performance.now() - start, false, err instanceof Error ? err.message : 'unknown');
    throw err;
  }
}
