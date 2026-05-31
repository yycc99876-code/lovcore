import { aiClient } from '../../ai/client';

export interface AutocompleteRequest {
  paragraph: string;
  beforeCursor: string;
  afterCursor: string;
  fullContext: string;
}

/**
 * Request autocomplete from the AI backend.
 * Returns empty string if the response is empty or the request fails.
 */
export async function requestAutocomplete(req: AutocompleteRequest): Promise<string> {
  try {
    const result = await aiClient.autocomplete({
      paragraph: req.paragraph,
      beforeCursor: req.beforeCursor,
      afterCursor: req.afterCursor,
      fullContext: req.fullContext,
    });
    return (result.suggestion ?? '').trim();
  } catch {
    return '';
  }
}
