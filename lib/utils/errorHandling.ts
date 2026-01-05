import { useState, useCallback } from 'react';
import { logger } from './logger';

/**
 * Standard error types for categorization
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  PERMISSION = 'PERMISSION',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Standardized application error structure
 */
export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: unknown;
  userMessage: string;
  code?: string;
  retryable: boolean;
}

/**
 * Supabase error shape
 */
interface SupabaseError {
  code?: string;
  message: string;
  details?: string;
  hint?: string;
}

/**
 * Check if error is a Supabase error
 */
function isSupabaseError(error: unknown): error is SupabaseError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    (('code' in error) || ('details' in error))
  );
}

/**
 * Parse any error into a standardized AppError
 */
export function parseError(error: unknown): AppError {
  // Already an AppError
  if (error && typeof error === 'object' && 'type' in error && 'userMessage' in error) {
    return error as AppError;
  }

  // Supabase error
  if (isSupabaseError(error)) {
    const code = error.code || '';
    
    // Not found (row not found)
    if (code === 'PGRST116') {
      return {
        type: ErrorType.NOT_FOUND,
        message: error.message,
        originalError: error,
        userMessage: 'The requested item was not found.',
        code,
        retryable: false,
      };
    }
    
    // Authentication errors
    if (code.startsWith('AUTH') || code === '401') {
      return {
        type: ErrorType.AUTH,
        message: error.message,
        originalError: error,
        userMessage: getAuthErrorMessage(code, error.message),
        code,
        retryable: false,
      };
    }

    // Permission errors
    if (code === '403' || code === 'PGRST301' || code.includes('RLS')) {
      return {
        type: ErrorType.PERMISSION,
        message: error.message,
        originalError: error,
        userMessage: 'You don\'t have permission to perform this action.',
        code,
        retryable: false,
      };
    }

    // Rate limiting
    if (code === '429' || error.message.toLowerCase().includes('rate limit')) {
      return {
        type: ErrorType.RATE_LIMIT,
        message: error.message,
        originalError: error,
        userMessage: 'Too many requests. Please wait a moment and try again.',
        code,
        retryable: true,
      };
    }

    // Validation errors
    if (code === '400' || code === '422' || code.startsWith('PGRST')) {
      return {
        type: ErrorType.VALIDATION,
        message: error.message,
        originalError: error,
        userMessage: error.hint || 'Invalid data provided. Please check your input.',
        code,
        retryable: false,
      };
    }

    // Server errors
    if (code.startsWith('5')) {
      return {
        type: ErrorType.SERVER,
        message: error.message,
        originalError: error,
        userMessage: 'Server error. Please try again later.',
        code,
        retryable: true,
      };
    }

    // Generic Supabase error
    return {
      type: ErrorType.UNKNOWN,
      message: error.message,
      originalError: error,
      userMessage: 'Something went wrong. Please try again.',
      code,
      retryable: true,
    };
  }

  // Network/fetch error
  if (error instanceof TypeError) {
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        type: ErrorType.NETWORK,
        message: error.message,
        originalError: error,
        userMessage: 'Network error. Please check your connection.',
        retryable: true,
      };
    }
  }

  // AbortError (request cancelled)
  if (error instanceof DOMException && error.name === 'AbortError') {
    return {
      type: ErrorType.NETWORK,
      message: 'Request was cancelled',
      originalError: error,
      userMessage: 'Request timed out. Please try again.',
      retryable: true,
    };
  }

  // Standard Error
  if (error instanceof Error) {
    // Check for common patterns in error messages
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('connection') || message.includes('offline')) {
      return {
        type: ErrorType.NETWORK,
        message: error.message,
        originalError: error,
        userMessage: 'Network error. Please check your connection.',
        retryable: true,
      };
    }

    if (message.includes('unauthorized') || message.includes('not authenticated')) {
      return {
        type: ErrorType.AUTH,
        message: error.message,
        originalError: error,
        userMessage: 'Please sign in to continue.',
        retryable: false,
      };
    }

    return {
      type: ErrorType.UNKNOWN,
      message: error.message,
      originalError: error,
      userMessage: 'Something went wrong. Please try again.',
      retryable: true,
    };
  }

  // Unknown error shape
  return {
    type: ErrorType.UNKNOWN,
    message: String(error),
    originalError: error,
    userMessage: 'An unexpected error occurred.',
    retryable: true,
  };
}

/**
 * Get user-friendly message for auth errors
 */
function getAuthErrorMessage(code: string, message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('invalid login') || lowerMessage.includes('invalid credentials')) {
    return 'Invalid email or password.';
  }
  
  if (lowerMessage.includes('email not confirmed')) {
    return 'Please verify your email address.';
  }
  
  if (lowerMessage.includes('user already registered')) {
    return 'An account with this email already exists.';
  }
  
  if (lowerMessage.includes('password')) {
    return 'Password must be at least 6 characters.';
  }
  
  if (lowerMessage.includes('expired') || lowerMessage.includes('refresh')) {
    return 'Your session has expired. Please sign in again.';
  }
  
  return 'Authentication error. Please sign in again.';
}

/**
 * Wrapper for async functions with standardized error handling
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  options?: {
    onError?: (error: AppError) => void;
    fallback?: T;
    logError?: boolean;
    context?: string;
  }
): Promise<T | undefined> {
  const { onError, fallback, logError = true, context } = options ?? {};
  
  try {
    return await fn();
  } catch (error) {
    const appError = parseError(error);
    
    if (logError) {
      const logMessage = context 
        ? `[${context}] ${appError.message}` 
        : appError.message;
      logger.error(logMessage, error);
    }
    
    onError?.(appError);
    return fallback;
  }
}

/**
 * Type guard for checking if value is an AppError
 */
export function isAppError(value: unknown): value is AppError {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    'userMessage' in value &&
    'retryable' in value
  );
}

/**
 * Create a typed error
 */
export function createError(
  type: ErrorType,
  userMessage: string,
  options?: {
    message?: string;
    code?: string;
    retryable?: boolean;
  }
): AppError {
  return {
    type,
    message: options?.message ?? userMessage,
    userMessage,
    code: options?.code,
    retryable: options?.retryable ?? false,
  };
}

/**
 * Hook for error state management in components
 */
export function useErrorHandler() {
  const [error, setError] = useState<AppError | null>(null);
  
  const handleError = useCallback((error: unknown, options?: { context?: string }) => {
    const appError = parseError(error);
    setError(appError);
    
    const logMessage = options?.context 
      ? `[${options.context}] ${appError.message}` 
      : appError.message;
    logger.error(logMessage, error);
    
    return appError;
  }, []);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const setCustomError = useCallback((type: ErrorType, userMessage: string) => {
    const appError = createError(type, userMessage);
    setError(appError);
    return appError;
  }, []);
  
  return { 
    error, 
    handleError, 
    clearError, 
    setCustomError,
    hasError: error !== null,
  };
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = AppError> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Create a success result
 */
export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Create an error result
 */
export function err(error: unknown): Result<never> {
  return { success: false, error: parseError(error) };
}

/**
 * Wrap a promise in a Result type (never throws)
 */
export async function tryCatch<T>(
  promise: Promise<T>,
  context?: string
): Promise<Result<T>> {
  try {
    const data = await promise;
    return ok(data);
  } catch (error) {
    const appError = parseError(error);
    if (context) {
      logger.error(`[${context}] ${appError.message}`, error);
    }
    return err(error);
  }
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, error: AppError) => void;
  }
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    onRetry,
  } = options ?? {};

  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const appError = parseError(error);
      
      // Don't retry non-retryable errors
      if (!appError.retryable || attempt === maxAttempts) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelayMs * Math.pow(2, attempt - 1),
        maxDelayMs
      );
      
      onRetry?.(attempt, appError);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

