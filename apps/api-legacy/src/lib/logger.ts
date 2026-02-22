/**
 * API Server Logger
 * Simple logger wrapper for server-side logging
 */

/* eslint-disable no-console */

export const logger = {
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[API:DEBUG]', ...args);
    }
  },
  info: (...args: unknown[]) => {
    console.info('[API:INFO]', ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn('[API:WARN]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[API:ERROR]', ...args);
  }
};