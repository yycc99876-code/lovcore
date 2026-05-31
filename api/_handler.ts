/**
 * Shared handler wrapper for Vercel serverless functions.
 * Provides: method check → rate limit → auth → timeout → error handling.
 */
import { verifyAuth } from './auth';
import { rateLimit, AI_RATE_LIMIT, API_RATE_LIMIT } from './_rate-limit';
import { captureError } from './_sentry';

const AI_TIMEOUT_MS = 30_000;
const API_TIMEOUT_MS = 15_000;

export interface HandlerOptions {
  /** Use AI rate limits (10/min) and 30s timeout. Default: true */
  isAi?: boolean;
  /** Custom timeout in ms. Overrides the default. */
  timeoutMs?: number;
}

/**
 * Wraps a handler function with rate limiting, auth, timeout, and error handling.
 *
 * Usage:
 *   export default withHandler(async (body) => {
 *     return await handleAnalyzeCard(body);
 *   }, { isAi: true });
 */
export function withHandler(
  fn: (body: any) => Promise<any>,
  options: HandlerOptions = {},
) {
  const { isAi = true, timeoutMs } = options;
  const limit = isAi ? AI_RATE_LIMIT : API_RATE_LIMIT;
  const timeout = timeoutMs ?? (isAi ? AI_TIMEOUT_MS : API_TIMEOUT_MS);

  return async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!rateLimit(req, res, limit)) return;

    const isAuthorized = await verifyAuth(req);
    if (!isAuthorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const result = await Promise.race([
        fn(req.body),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeout),
        ),
      ]);
      return res.status(200).json(result);
    } catch (err: any) {
      const tag = req.url?.split('/').pop() || 'handler';
      console.error(`[${tag}] Error:`, err);
      captureError(err, { endpoint: tag });
      return res.status(500).json({ error: 'Internal error' });
    }
  };
}
