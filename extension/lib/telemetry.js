/**
 * Lovcore Clipper — Lightweight telemetry / error logging
 * Logs to console. Can be extended to report to an error service.
 */

import { EXTENSION_VERSION } from './constants.js';

const PREFIX = '[Lovcore Clipper]';

/**
 * Log an error with context.
 * @param {string} module
 * @param {string} message
 * @param {Error} [error]
 */
export function logError(module, message, error) {
  console.error(`${PREFIX} [${module}] ${message}`, error || '');
}

/**
 * Log an info message.
 * @param {string} module
 * @param {string} message
 */
export function logInfo(module, message) {
  console.log(`${PREFIX} [${module}] ${message}`);
}

/**
 * Log a warning.
 * @param {string} module
 * @param {string} message
 */
export function logWarn(module, message) {
  console.warn(`${PREFIX} [${module}] ${message}`);
}
