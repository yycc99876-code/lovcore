/**
 * In-memory sliding-window rate limiter for Vercel serverless functions.
 *
 * Each function instance maintains its own counter map, so limits reset on
 * cold starts. This is sufficient for burst protection with 500 users 鈥? * for stricter guarantees, swap to Redis/Upstash.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent memory leaks from stale entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000).unref();

function getKey(req: any): string {
  // Prefer authenticated user ID; fall back to IP
  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  if (authHeader) return authHeader.slice(-32); // last 32 chars of token as fingerprint

  const forwarded = req.headers?.['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '127.0.0.1';
  return ip;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number; // seconds until the window resets
}

/**
 * Check rate limit for a request.
 * @param req  The incoming request (Vercel handler `req`)
 * @param limit  Max requests per window
 * @param windowMs  Window duration in milliseconds (default 60s)
 */
export function checkRateLimit(
  req: any,
  limit: number,
  windowMs: number = 60_000,
): RateLimitResult {
  const key = `${limit}:${getKey(req)}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: Math.ceil(windowMs / 1000) };
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
}

/**
 * Express/Vercel-style middleware: returns 429 if rate limit exceeded.
 * Call at the top of your handler:
 *
 *   const limited = rateLimit(req, res, 10);
 *   if (!limited) return;
 */
export function rateLimit(
  req: any,
  res: any,
  limit: number,
  windowMs?: number,
): boolean {
  const result = checkRateLimit(req, limit, windowMs);

  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));

  if (!result.allowed) {
    res.setHeader('Retry-After', String(result.retryAfter));
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return false;
  }

  return true;
}

// Preset limits
export const AI_RATE_LIMIT = 10;   // 10 AI calls per minute per user
export const API_RATE_LIMIT = 30;  // 30 general API calls per minute per user
