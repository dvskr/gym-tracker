/**
 * Production-aware logger utility
 * Debug/info logs are stripped in production builds
 * Warnings and errors always show (and should go to error reporting)
 * 
 * Usage:
 *   import { logger, navLogger, workoutLogger } from '@/lib/utils/logger';
 *   logger.debug('message');
 *   logger.warn('warning');
 *   logger.error('error', errorObject);
 *   navLogger.debug('tab pressed');
 */

import { captureException, addBreadcrumb } from '@/lib/sentry';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enableDebug: boolean;
  enableInfo: boolean;
  prefix: string;
}

const config: LoggerConfig = {
  enableDebug: __DEV__,
  enableInfo: __DEV__,
  prefix: '[GymApp]',
};

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
  return `${config.prefix} [${timestamp}] [${level.toUpperCase()}] ${message}`;
}

interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, error?: unknown, ...args: unknown[]) => void;
  log: (message: string, ...args: unknown[]) => void;
  group: (label: string) => void;
  groupEnd: () => void;
  time: (label: string) => void;
  timeEnd: (label: string) => void;
}

interface ScopedLogger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, error?: unknown, ...args: unknown[]) => void;
}

const noop = () => {};

export const logger: Logger & { scope: (scope: string) => ScopedLogger } = {
  /**
   * Debug logs - only in development
   */
  debug: (message: string, ...args: unknown[]) => {
    if (config.enableDebug) {
      console.log(formatMessage('debug', message), ...args);
    }
  },

  /**
   * Info logs - only in development
   */
  info: (message: string, ...args: unknown[]) => {
    if (config.enableInfo) {
      console.info(formatMessage('info', message), ...args);
    }
  },

  /**
   * Warning logs - always shown
   */
  warn: (message: string, ...args: unknown[]) => {
    console.warn(formatMessage('warn', message), ...args);
  },

  /**
   * Error logs - always shown, sent to Sentry in production
   */
  error: (message: string, error?: unknown, ...args: unknown[]) => {
    console.error(formatMessage('error', message), error, ...args);
    
    // Send to Sentry in production
    if (!__DEV__ && error) {
      captureException(error, { 
        message, 
        args: args.length > 0 ? JSON.stringify(args).slice(0, 1000) : undefined,
      });
    }
    
    // Add breadcrumb for debugging
    addBreadcrumb(message, 'error', { hasError: !!error }, 'error');
  },

  /**
   * General log - only in development (alias for debug)
   */
  log: (message: string, ...args: unknown[]) => {
    if (config.enableDebug) {
      console.log(formatMessage('debug', message), ...args);
    }
  },

  /**
   * Console group - only in development
   */
  group: (label: string) => {
    if (config.enableDebug) {
      console.group(`${config.prefix} ${label}`);
    }
  },

  /**
   * Console groupEnd - only in development
   */
  groupEnd: () => {
    if (config.enableDebug) {
      console.groupEnd();
    }
  },

  /**
   * Console time - only in development
   */
  time: (label: string) => {
    if (config.enableDebug) {
      console.time(`${config.prefix} ${label}`);
    }
  },

  /**
   * Console timeEnd - only in development
   */
  timeEnd: (label: string) => {
    if (config.enableDebug) {
      console.timeEnd(`${config.prefix} ${label}`);
    }
  },

  /**
   * Create a scoped logger with a prefix
   */
  scope: (scope: string): ScopedLogger => ({
    debug: (message: string, ...args: unknown[]) => logger.debug(`[${scope}] ${message}`, ...args),
    info: (message: string, ...args: unknown[]) => logger.info(`[${scope}] ${message}`, ...args),
    warn: (message: string, ...args: unknown[]) => logger.warn(`[${scope}] ${message}`, ...args),
    error: (message: string, error?: unknown, ...args: unknown[]) => logger.error(`[${scope}] ${message}`, error, ...args),
  }),
};

// Convenience exports for common scopes
export const navLogger = logger.scope('NAV');
export const workoutLogger = logger.scope('WORKOUT');
export const syncLogger = logger.scope('SYNC');
export const aiLogger = logger.scope('AI');
export const authLogger = logger.scope('AUTH');

// Legacy export for backwards compatibility
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
    } as Logger;
  }

  return {
    log: (...args: unknown[]) => console.log(`[${tag}]`, ...args),
    warn: (...args: unknown[]) => console.warn(`[${tag}]`, ...args),
    error: (...args: unknown[]) => console.error(`[${tag}]`, ...args),
    info: (...args: unknown[]) => console.info(`[${tag}]`, ...args),
    debug: (...args: unknown[]) => console.debug(`[${tag}]`, ...args),
    group: (label: string) => console.group(`[${tag}] ${label}`),
    groupEnd: () => console.groupEnd(),
    time: (label: string) => console.time(`[${tag}] ${label}`),
    timeEnd: (label: string) => console.timeEnd(`[${tag}] ${label}`),
  } as Logger;
};

