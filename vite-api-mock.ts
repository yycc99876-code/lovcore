/**
 * Vite Dev Server API Router
 *
 * Intercepts /api/* requests during development and routes them to real
 * backend handlers. Falls back to safe stubs when BAILIAN_API_KEY is missing.
 *
 * This plugin ONLY runs in the Vite dev server (Node side).
 * API keys are never exposed to the client bundle.
 */

import type { Plugin } from 'vite';

// --- Dynamic imports for backend handlers ---
// These are imported lazily so they only load in the dev server context.

async function callHandler(route: string, body: Record<string, unknown>): Promise<unknown> {
  switch (route) {
    case '/api/ai/autocomplete': {
      const { handleAutocomplete } = await import('./api/ai/autocomplete');
      return handleAutocomplete(body as unknown as import('./api/ai/autocomplete').AutocompleteRequest);
    }
    case '/api/ai/ghost-correct': {
      const { handleGhostCorrect } = await import('./api/ai/ghost-correct');
      return handleGhostCorrect(body as unknown as import('./api/ai/ghost-correct').GhostCorrectRequest);
    }
    case '/api/ai/rewrite': {
      const { handleRewrite } = await import('./api/ai/rewrite');
      return handleRewrite(body as unknown as import('./api/ai/rewrite').RewriteRequest);
    }
    case '/api/ai/summarize': {
      const { handleSummarize } = await import('./api/ai/summarize');
      return handleSummarize(body as unknown as import('./api/ai/summarize').SummarizeRequest);
    }
    case '/api/ai/transcribe': {
      const { handleTranscribe } = await import('./api/ai/transcribe');
      return handleTranscribe(body as unknown as import('./api/ai/transcribe').TranscribeRequest);
    }
    case '/api/ai/scrape-url': {
      const { handleScrapeUrl } = await import('./api/ai/scrape-url');
      return handleScrapeUrl(body as unknown as import('./api/ai/scrape-url').ScrapeUrlRequest);
    }
    case '/api/ai/analyze-card': {
      const { handleAnalyzeCard } = await import('./api/ai/analyze-card');
      return handleAnalyzeCard(body as unknown as import('./api/ai/analyze-card').AnalyzeCardRequest);
    }
    case '/api/ai/embed': {
      const { handleEmbed } = await import('./api/ai/embed');
      return handleEmbed(body as unknown as import('./api/ai/embed').EmbedRequest);
    }
    case '/api/ai/analyze-image': {
      const { handleAnalyzeImage } = await import('./api/ai/analyze-image');
      return handleAnalyzeImage(body as unknown as import('./api/ai/analyze-image').AnalyzeImageRequest);
    }
    case '/api/ai/space-rule': {
      const { handleSpaceRule } = await import('./api/ai/space-rule');
      return handleSpaceRule(body as unknown as import('./api/ai/space-rule').SpaceRuleRequest);
    }
    case '/api/ai/analyze-video': {
      const { handleAnalyzeVideo } = await import('./api/ai/analyze-video');
      return handleAnalyzeVideo(body as unknown as import('./api/ai/analyze-video').AnalyzeVideoRequest);
    }
    case '/api/files/convert-office': {
      const { handleConvertOffice } = await import('./api/files/convert-office');
      return handleConvertOffice(body as unknown as import('./api/files/convert-office').ConvertOfficeRequest);
    }
    default:
      return null;
  }
}

// --- Safe fallback stubs (used only when BAILIAN_API_KEY is missing) ---

function getFallbackResponse(route: string): unknown {
  switch (route) {
    case '/api/ai/autocomplete':
      return { suggestion: '', confidence: 0 };
    case '/api/ai/ghost-correct':
      return { suggestions: [] };
    case '/api/ai/rewrite':
      return { rewritten: '' };
    case '/api/ai/summarize':
      return { summary: '' };
    case '/api/ai/transcribe':
      return { text: '', language: 'zh' };
    case '/api/ai/scrape-url':
      return { title: '', description: '', image: '', favicon: '', siteName: '' };
    case '/api/ai/analyze-card':
      return { summary: '', tags: [], keyClaims: [], whyItMatters: '', suggestedSpaceIds: [], contentKind: 'reference' };
    case '/api/ai/embed':
      return { embedding: [] };
    case '/api/ai/analyze-image':
      return { summary: '', tags: [], colorPalette: [], visualStyle: 'other', subjects: [], whyItMatters: '' };
    case '/api/ai/space-rule':
      return { tags: [], selectedType: 'all', semanticQuery: '', description: '' };
    case '/api/ai/analyze-video':
      return { summary: '', tags: [], subjects: [], whyItMatters: '' };
    case '/api/files/convert-office':
      return { error: 'LibreOffice conversion is unavailable in mock mode.' };
    default:
      return null;
  }
}

// --- Plugin ---

export function mockApiPlugin(): Plugin {
  let hasWarnedMissingKey = false;

  return {
    name: 'lovcore-dev-api-router',
    configureServer(server) {
      server.httpServer?.on('upgrade', async (req, socket, head) => {
          const { handleRealtimeAsrUpgrade } = await import('./server/unused-api/ai/realtime-asr-proxy');
        const handled = await handleRealtimeAsrUpgrade(req, socket, head);
        if (!handled) return;
      });

      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/') || req.method !== 'POST') {
          return next();
        }

        const route = req.url.split('?')[0];

        // Read request body
        let body = '';
        req.on('data', (chunk: Buffer) => {
          body += String(chunk);
        });
        req.on('end', async () => {
          let parsed: Record<string, unknown> = {};
          try {
            parsed = body ? JSON.parse(body) : {};
          } catch {
            // invalid JSON
          }

          const hasKey = !!process.env.BAILIAN_API_KEY;
          const shouldAlwaysUseRealHandler = route === '/api/files/convert-office';

          if (!hasKey && !hasWarnedMissingKey) {
            console.warn('[dev-api] BAILIAN_API_KEY missing, using dev mock.');
            hasWarnedMissingKey = true;
          }

          try {
            let result: unknown;

            if (hasKey || shouldAlwaysUseRealHandler) {
              // Route to real handler
              console.log(`[dev-api] ${route} → real handler`);
              result = await callHandler(route, parsed);
            } else {
              // Fallback to safe stub
              console.log(`[dev-api] ${route} → fallback stub`);
              result = getFallbackResponse(route);
            }

            if (result === null) {
              res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ error: `No handler for ${route}` }));
              return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(result));
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`[dev-api] ${route} error:`, message);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: message }));
          }
        });
      });
    },
  };
}
