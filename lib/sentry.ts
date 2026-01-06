/**
 * Sentry Crash Reporting Configuration
 * 
 * To use Sentry, add EXPO_PUBLIC_SENTRY_DSN to your .env file:
 * EXPO_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
 * 
 * Note: Sentry is only imported if DSN is configured to avoid loading
 * the package unnecessarily in development.
 */

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/**
 * Whether Sentry is enabled (DSN is configured)
 */
export const isSentryEnabled = !!SENTRY_DSN && !__DEV__;

// Lazy-load Sentry only if DSN is configured
let Sentry: typeof import('sentry-expo') | null = null;
if (SENTRY_DSN) {
  try {
    Sentry = require('sentry-expo');
  } catch (error: unknown) {
    console.warn('[Sentry] Failed to load sentry-expo package:', error);
  }
}

/**
 * Initialize Sentry
 * Call this at app startup (before any components render)
 */
export function initSentry(): void {
  if (!SENTRY_DSN || !Sentry) {
    if (__DEV__) {
      console.log('[Sentry] DSN not configured, skipping initialization');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    // Disable in development by default
    enableInExpoDevelopment: false,
    // Enable debug mode in dev for testing
    debug: __DEV__,
    // Sample rate for performance monitoring
    // 1.0 = 100% in dev, 20% in production
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    // Environment tag
    environment: __DEV__ ? 'development' : 'production',
    // Attach stack traces to messages
    attachStacktrace: true,
    // Release version (set from app.json version)
    // release: 'gymtracker@1.0.0',
    // Ignore certain errors
    ignoreErrors: [
      // Ignore network errors that are expected
      'Network request failed',
      'AbortError',
      // Ignore cancelled async operations
      'Cancelled',
    ],
    // Before sending event, can modify or drop it
    beforeSend(event, hint) {
      // Don't send events in dev
      if (__DEV__) {
        console.log('[Sentry] Would send event:', event);
        return null;
      }
      return event;
    },
  });

  console.log('[Sentry] Initialized successfully');
}

/**
 * Capture an exception to Sentry
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (!isSentryEnabled || !Sentry) {
    return;
  }

  try {
    Sentry.Native.captureException(error, {
      extra: context,
    });
  } catch (e: unknown) {
    // Silently fail if Sentry has issues
    console.error('[Sentry] Failed to capture exception:', e);
  }
}

/**
 * Capture a message to Sentry
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>
): void {
  if (!isSentryEnabled || !Sentry) {
    return;
  }

  try {
    Sentry.Native.captureMessage(message, {
      level: level as 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug',
      extra: context,
    });
  } catch (e: unknown) {
    console.error('[Sentry] Failed to capture message:', e);
  }
}

/**
 * Set the current user for error context
 * Call this after successful login
 */
export function setUser(user: { 
  id: string; 
  email?: string;
  username?: string;
}): void {
  if (!SENTRY_DSN || !Sentry) {
    return;
  }

  try {
    Sentry.Native.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } catch (e: unknown) {
    console.error('[Sentry] Failed to set user:', e);
  }
}

/**
 * Clear user data from Sentry
 * Call this on logout
 */
export function clearUser(): void {
  if (!SENTRY_DSN || !Sentry) {
    return;
  }

  try {
    Sentry.Native.setUser(null);
  } catch (e: unknown) {
    console.error('[Sentry] Failed to clear user:', e);
  }
}

/**
 * Add a breadcrumb for debugging
 * Breadcrumbs are included with error reports
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info'
): void {
  if (!SENTRY_DSN || !Sentry) {
    return;
  }

  try {
    Sentry.Native.addBreadcrumb({
      message,
      category,
      data,
      level: level as 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug',
      timestamp: Date.now() / 1000,
    });
  } catch (e: unknown) {
    console.error('[Sentry] Failed to add breadcrumb:', e);
  }
}

/**
 * Set a tag for all subsequent events
 */
export function setTag(key: string, value: string): void {
  if (!SENTRY_DSN || !Sentry) {
    return;
  }

  try {
    Sentry.Native.setTag(key, value);
  } catch (e: unknown) {
    console.error('[Sentry] Failed to set tag:', e);
  }
}

/**
 * Set extra context for all subsequent events
 */
export function setExtra(key: string, value: unknown): void {
  if (!SENTRY_DSN || !Sentry) {
    return;
  }

  try {
    Sentry.Native.setExtra(key, value);
  } catch (e: unknown) {
    console.error('[Sentry] Failed to set extra:', e);
  }
}

/**
 * Wrap an async function with Sentry error reporting
 */
export async function withSentry<T>(
  fn: () => Promise<T>,
  context?: { operation?: string; extra?: Record<string, unknown> }
): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    captureException(error, {
      operation: context?.operation,
      ...context?.extra,
    });
    throw error;
  }
}

/**
 * Start a performance transaction
 */
export function startTransaction(
  name: string,
  operation: string
): { finish: () => void } | null {
  if (!SENTRY_DSN || !Sentry) {
    return null;
  }

  try {
    const transaction = Sentry.Native.startTransaction({
      name,
      op: operation,
    });
    
    return {
      finish: () => {
        try {
          transaction.finish();
        } catch (e: unknown) {
          console.error('[Sentry] Failed to finish transaction:', e);
        }
      },
    };
  } catch (e: unknown) {
    console.error('[Sentry] Failed to start transaction:', e);
    return null;
  }
}


