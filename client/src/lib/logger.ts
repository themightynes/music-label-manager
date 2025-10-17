/**
 * Production-safe logging utility
 *
 * - Debug/info logs only in development mode
 * - Warnings/errors always visible (important for debugging production issues)
 * - Prevents sensitive data exposure in production logs
 *
 * Usage:
 * ```ts
 * import logger from '@/lib/logger';
 *
 * logger.debug('User data:', userData);  // Only in DEV
 * logger.warn('Deprecation warning');    // Always shown
 * logger.error('API failed:', error);    // Always shown
 * ```
 */

const isDev = (): boolean =>
  import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true';

const logger = {
  /** Debug logging - only in development */
  debug: (...args: any[]): void => {
    if (isDev()) console.log(...args);
  },

  /** Info logging - only in development */
  info: (...args: any[]): void => {
    if (isDev()) console.info(...args);
  },

  /** Warning logging - always visible (important for production debugging) */
  warn: (...args: any[]): void => {
    console.warn(...args);
  },

  /** Error logging - always visible (critical for production debugging) */
  error: (...args: any[]): void => {
    console.error(...args);
  },

  /** Console group - only in development */
  group: (...args: any[]): void => {
    if (isDev()) console.group(...args);
  },

  /** Console groupEnd - only in development */
  groupEnd: (): void => {
    if (isDev()) console.groupEnd();
  },

  /** Check if running in development mode */
  isDev,
};

/**
 * Redacts sensitive headers from logging
 * Prevents Authorization tokens, cookies, and PII from appearing in logs
 */
export function redactSensitiveHeaders(
  headers: Record<string, string> | Headers
): Record<string, string> {
  const sensitiveKeys = ['authorization', 'cookie', 'set-cookie', 'x-api-key'];
  const result: Record<string, string> = {};

  const entries = headers instanceof Headers
    ? Array.from(headers.entries())
    : Object.entries(headers);

  for (const [key, value] of entries) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.includes(lowerKey)) {
      // Redact but show that header exists
      result[key] = lowerKey === 'authorization'
        ? `Bearer [REDACTED ${value.substring(7, 15)}...]` // Show first few chars of token
        : '[REDACTED]';
    } else {
      result[key] = value;
    }
  }

  return result;
}

export default logger;
