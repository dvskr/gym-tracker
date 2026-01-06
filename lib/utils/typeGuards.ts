/**
 * Type guard utilities for runtime type checking
 */

/**
 * Checks if a value is an object (not null, not array)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Checks if a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Checks if a value is a number (and not NaN)
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Checks if a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Checks if an object has a specific property
 */
export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

/**
 * Checks if a value is an Error instance
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Checks if a value has a message property (Error-like)
 */
export function hasMessage(value: unknown): value is { message: string } {
  return hasProperty(value, 'message') && isString(value.message);
}

/**
 * Safely extracts an error message from unknown error types
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  
  if (hasMessage(error)) {
    return error.message;
  }
  
  if (isString(error)) {
    return error;
  }
  
  return 'An unknown error occurred';
}

/**
 * Safely extracts error details for logging
 */
export function getErrorDetails(error: unknown): {
  message: string;
  stack?: string;
  code?: string;
  name?: string;
} {
  if (isError(error)) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }

  if (hasProperty(error, 'code') && isString(error.code)) {
    return {
      message: getErrorMessage(error),
      code: error.code,
    };
  }

  return {
    message: getErrorMessage(error),
  };
}

/**
 * Type guard for Supabase errors
 */
export function isSupabaseError(
  error: unknown
): error is { message: string; code?: string; details?: string } {
  return (
    isObject(error) &&
    hasProperty(error, 'message') &&
    isString(error.message)
  );
}

/**
 * Type guard for network errors
 */
export function isNetworkError(error: unknown): error is Error & { code: string } {
  return (
    isError(error) &&
    hasProperty(error, 'code') &&
    isString(error.code) &&
    (error.code === 'NETWORK_ERROR' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNREFUSED')
  );
}

/**
 * Type guard for arrays
 */
export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Type guard for non-null values
 */
export function isNonNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}


