/**
 * Environment Variable Utilities
 * 
 * Provides type-safe access to environment variables with proper validation.
 */

/**
 * Required environment variables for the app to function
 */
const REQUIRED_ENV_VARS = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
] as const;

/**
 * Optional environment variables (app works without them)
 */
const OPTIONAL_ENV_VARS = [
  'EXPO_PUBLIC_EXERCISEDB_API_KEY',
] as const;

type RequiredEnvVar = typeof REQUIRED_ENV_VARS[number];
type OptionalEnvVar = typeof OPTIONAL_ENV_VARS[number];
type EnvVar = RequiredEnvVar | OptionalEnvVar;

/**
 * Validates that all required environment variables are set.
 * Call this early in app initialization to fail fast.
 * 
 * @throws Error if any required environment variables are missing
 * 
 * @example
 * ```typescript
 * // In app/_layout.tsx or index.tsx
 * import { validateEnvironment } from '@/lib/utils/env';
 * 
 * // Will throw if required vars are missing
 * validateEnvironment();
 * ```
 */
export function validateEnvironment(): void {
  const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);

  if (missing.length > 0) {
    const missingList = missing.join(', ');
    throw new Error(
      `Missing required environment variables: ${missingList}\n\n` +
      'Please ensure your .env file exists and contains:\n' +
      missing.map(key => `  ${key}=your-value-here`).join('\n') +
      '\n\nIf using Expo, make sure to restart the development server after adding variables.'
    );
  }
}

/**
 * Gets a required environment variable with type safety.
 * Throws an error if the variable is not set.
 * 
 * @param key - The environment variable name
 * @returns The environment variable value
 * @throws Error if the variable is not set
 * 
 * @example
 * ```typescript
 * const apiUrl = getEnvVar('EXPO_PUBLIC_SUPABASE_URL');
 * ```
 */
export function getEnvVar(key: EnvVar): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing environment variable: ${key}\n` +
      'Please check your .env file and ensure it is loaded correctly.'
    );
  }
  return value;
}

/**
 * Gets an optional environment variable.
 * Returns undefined if not set (does not throw).
 * 
 * @param key - The environment variable name
 * @returns The environment variable value, or undefined if not set
 * 
 * @example
 * ```typescript
 * const apiKey = getOptionalEnvVar('EXPO_PUBLIC_EXERCISEDB_API_KEY');
 * if (apiKey) {
 *   // Use the API key
 * }
 * ```
 */
export function getOptionalEnvVar(key: string): string | undefined {
  return process.env[key];
}

/**
 * Checks if an environment variable is set.
 * 
 * @param key - The environment variable name
 * @returns True if the variable is set and non-empty
 */
export function hasEnvVar(key: string): boolean {
  return !!process.env[key];
}

/**
 * Gets environment info for debugging.
 * Only includes non-sensitive information.
 * 
 * @returns Object with environment status (not actual values)
 */
export function getEnvironmentStatus(): Record<string, boolean> {
  const allVars = [...REQUIRED_ENV_VARS, ...OPTIONAL_ENV_VARS];
  return allVars.reduce((acc, key) => {
    acc[key] = hasEnvVar(key);
    return acc;
  }, {} as Record<string, boolean>);
}

