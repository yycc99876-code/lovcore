/** Shared types for Ghost autocomplete and correction system. */

export interface GhostSuggestion {
  original: string;
  replacement: string;
  reason: string;
  severity: 'minor' | 'moderate' | 'major';
  from?: number;
  to?: number;
}

export interface GhostCorrectionState {
  suggestions: GhostSuggestion[];
  activeIndex: number;
  visible: boolean;
  loading: boolean;
  paragraphText: string;
}

export interface GhostAutocompleteState {
  text: string;
  from: number;
  visible: boolean;
  /** Used to discard stale responses */
  requestKey: string;
}

export interface GhostAcceptedFlash {
  id: number;
  text: string;
  from: number;
}
