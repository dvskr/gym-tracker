/**
 * Production-safe logger utility
 * Only logs in development mode (__DEV__)
 * 
 * Usage:
 *   import { logger } from '@/lib/utils/logger';
 * logger.log('message');
 * logger.warn('warning');
 * logger.error('error');
 */

type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

interface Logger {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  info: (...args: any[]) => void;
  debug: (...args: any[]) => void;
  group: (label: string) => void;
  groupEnd: () => void;
  time: (label: string) => void;
  timeEnd: (label: string) => void;
}

const noop = () => {};

const createLogger = (): Logger => {
  // In production, return no-op functions
  if (!__DEV__) {
    return {
      log: noop,
      warn: noop,
      error: noop,
      info: noop,
      debug: noop,
      group: noop,
      groupEnd: noop,
      time: noop,
      timeEnd: noop,
    };
  }

  // In development, use actual console methods
  return {
    log: (...args: any[]) => console.log(...args),
    warn: (...args: any[]) => console.warn(...args),
    error: (...args: any[]) => console.error(...args),
    info: (...args: any[]) => console.info(...args),
    debug: (...args: any[]) => console.debug(...args),
    group: (label: string) => console.group(label),
    groupEnd: () => console.groupEnd(),
    time: (label: string) => console.time(label),
    timeEnd: (label: string) => console.timeEnd(label),
  };
};

export const logger = createLogger();

// Optional: Tagged logger for specific modules
export const createTaggedLogger = (tag: string): Logger => {
  if (!__DEV__) {
    return {
      log: noop,
      warn: noop,
      error: noop,
      info: noop,
      debug: noop,
      group: noop,
      groupEnd: noop,
      time: noop,
      timeEnd: noop,
    };
  }

  return {
    log: (...args: any[]) => console.log(`[${tag}]`, ...args),
    warn: (...args: any[]) => console.warn(`[${tag}]`, ...args),
    error: (...args: any[]) => console.error(`[${tag}]`, ...args),
    info: (...args: any[]) => console.info(`[${tag}]`, ...args),
    debug: (...args: any[]) => console.debug(`[${tag}]`, ...args),
    group: (label: string) => console.group(`[${tag}] ${label}`),
    groupEnd: () => console.groupEnd(),
    time: (label: string) => console.time(`[${tag}] ${label}`),
    timeEnd: (label: string) => console.timeEnd(`[${tag}] ${label}`),
  };
};
