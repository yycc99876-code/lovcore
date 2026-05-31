import { aiClient } from '../../ai/client';
import type { GhostSuggestion } from '../../components/ghost/ghostTypes';

export interface GhostScanResult {
  suggestions: GhostSuggestion[];
}

/**
 * Request ghost correction suggestions from the AI backend.
 * Falls back to empty suggestions on error.
 */
export async function scanParagraph(
  paragraphText: string,
  fullContext: string,
): Promise<GhostScanResult> {
  try {
    const result = await aiClient.ghostCorrect({
      paragraphText,
      fullContext,
    });

    const raw = result.suggestions ?? [];
    const cleaned: GhostSuggestion[] = [];

    for (const s of raw) {
      if (!s.original || !s.replacement) continue;
      if (s.original === s.replacement) continue;
      if (!paragraphText.includes(s.original)) continue;

      const severity =
        s.severity === 'minor' || s.severity === 'moderate' || s.severity === 'major'
          ? s.severity
          : 'minor';

      cleaned.push({
        original: s.original.trim(),
        replacement: s.replacement.trim(),
        reason: s.reason?.trim() ?? '',
        severity,
        from: s.from,
        to: s.to,
      });

      if (cleaned.length >= 3) break;
    }

    return { suggestions: cleaned };
  } catch {
    return { suggestions: [] };
  }
}
