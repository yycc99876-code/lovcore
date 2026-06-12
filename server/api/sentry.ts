/**
 * Sentry initialization for Vercel serverless functions.
 * Import this at the top of any handler that should report errors.
 *
 * Usage:
 *   import '../_sentry';  // just import for side effects
 *   import { captureError } from '../_sentry';
 *   catch (err) { captureError(err); }
 */
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1, // 10% of transactions
    enabled: !!process.env.VERCEL, // only in production
  });
}

/**
 * Capture an error in Sentry. No-op if SENTRY_DSN is not set.
 */
export function captureError(err: unknown, context?: Record<string, unknown>) {
  if (!dsn) return;
  if (context) {
    Sentry.setExtras(context);
  }
  Sentry.captureException(err);
}

export { Sentry };
