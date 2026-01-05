/**
 * Error Handling Utilities Tests
 */

import { 
  parseError, 
  ErrorType, 
  AppError,
  safeAsync,
  createError,
  ok,
  err,
  tryCatch,
  retryAsync,
  isAppError,
} from '@/lib/utils/errorHandling';

// Mock the logger
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock Sentry
jest.mock('@/lib/sentry', () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

describe('Error Handling Utilities', () => {
  describe('parseError', () => {
    it('parses Supabase NOT_FOUND error', () => {
      const error = { code: 'PGRST116', message: 'Row not found' };
      const result = parseError(error);

      expect(result.type).toBe(ErrorType.NOT_FOUND);
      expect(result.userMessage).toBe('The requested item was not found.');
      expect(result.retryable).toBe(false);
    });

    it('parses Supabase AUTH error', () => {
      const error = { code: 'AUTH001', message: 'Invalid credentials' };
      const result = parseError(error);

      expect(result.type).toBe(ErrorType.AUTH);
      expect(result.retryable).toBe(false);
    });

    it('parses permission/RLS error', () => {
      const error = { code: '403', message: 'Permission denied' };
      const result = parseError(error);

      expect(result.type).toBe(ErrorType.PERMISSION);
      expect(result.userMessage).toContain("don't have permission");
    });

    it('parses rate limit error', () => {
      const error = { code: '429', message: 'Rate limit exceeded' };
      const result = parseError(error);

      expect(result.type).toBe(ErrorType.RATE_LIMIT);
      expect(result.retryable).toBe(true);
    });

    it('parses server error', () => {
      const error = { code: '500', message: 'Internal server error' };
      const result = parseError(error);

      expect(result.type).toBe(ErrorType.SERVER);
      expect(result.retryable).toBe(true);
    });

    it('parses network TypeError', () => {
      const error = new TypeError('fetch failed');
      const result = parseError(error);

      expect(result.type).toBe(ErrorType.NETWORK);
      expect(result.userMessage).toContain('Network error');
      expect(result.retryable).toBe(true);
    });

    it('parses generic Error', () => {
      const error = new Error('Something went wrong');
      const result = parseError(error);

      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.message).toBe('Something went wrong');
    });

    it('parses string error', () => {
      const result = parseError('String error message');

      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.message).toBe('String error message');
    });

    it('returns existing AppError unchanged', () => {
      const appError: AppError = {
        type: ErrorType.VALIDATION,
        message: 'Invalid input',
        userMessage: 'Please check your input',
        retryable: false,
      };
      const result = parseError(appError);

      expect(result).toEqual(appError);
    });

    it('parses auth errors with specific messages', () => {
      const invalidLogin = { code: 'AUTH001', message: 'Invalid login credentials' };
      expect(parseError(invalidLogin).userMessage).toBe('Invalid email or password.');

      const emailNotConfirmed = { code: 'AUTH002', message: 'Email not confirmed' };
      expect(parseError(emailNotConfirmed).userMessage).toBe('Please verify your email address.');

      const userExists = { code: 'AUTH003', message: 'User already registered' };
      expect(parseError(userExists).userMessage).toBe('An account with this email already exists.');
    });
  });

  describe('safeAsync', () => {
    it('returns result on success', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      
      const result = await safeAsync(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalled();
    });

    it('returns fallback on error', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Failed'));
      
      const result = await safeAsync(fn, { fallback: 'default' });
      
      expect(result).toBe('default');
    });

    it('returns undefined on error without fallback', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Failed'));
      
      const result = await safeAsync(fn);
      
      expect(result).toBeUndefined();
    });

    it('calls onError callback on error', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Failed'));
      const onError = jest.fn();
      
      await safeAsync(fn, { onError });
      
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        type: ErrorType.UNKNOWN,
        message: 'Failed',
      }));
    });

    it('logs errors by default', async () => {
      const { logger } = require('@/lib/utils/logger');
      const fn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      await safeAsync(fn);
      
      expect(logger.error).toHaveBeenCalled();
    });

    it('skips logging when logError is false', async () => {
      const { logger } = require('@/lib/utils/logger');
      logger.error.mockClear();
      
      const fn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      await safeAsync(fn, { logError: false });
      
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('includes context in log message', async () => {
      const { logger } = require('@/lib/utils/logger');
      logger.error.mockClear();
      
      const fn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      await safeAsync(fn, { context: 'TestOperation' });
      
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[TestOperation]'),
        expect.anything()
      );
    });
  });

  describe('createError', () => {
    it('creates error with type and message', () => {
      const error = createError(ErrorType.VALIDATION, 'Invalid input');

      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.userMessage).toBe('Invalid input');
      expect(error.message).toBe('Invalid input');
      expect(error.retryable).toBe(false);
    });

    it('creates error with custom options', () => {
      const error = createError(ErrorType.SERVER, 'Server error', {
        message: 'Internal: Database connection failed',
        code: '503',
        retryable: true,
      });

      expect(error.message).toBe('Internal: Database connection failed');
      expect(error.code).toBe('503');
      expect(error.retryable).toBe(true);
    });
  });

  describe('isAppError', () => {
    it('returns true for valid AppError', () => {
      const error: AppError = {
        type: ErrorType.NETWORK,
        message: 'Network failed',
        userMessage: 'Check connection',
        retryable: true,
      };
      
      expect(isAppError(error)).toBe(true);
    });

    it('returns false for non-AppError', () => {
      expect(isAppError(new Error('test'))).toBe(false);
      expect(isAppError({ message: 'test' })).toBe(false);
      expect(isAppError(null)).toBe(false);
      expect(isAppError('string')).toBe(false);
    });
  });

  describe('Result utilities', () => {
    describe('ok', () => {
      it('creates success result', () => {
        const result = ok({ data: 'test' });
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({ data: 'test' });
        }
      });
    });

    describe('err', () => {
      it('creates error result', () => {
        const result = err(new Error('Failed'));
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.type).toBe(ErrorType.UNKNOWN);
        }
      });
    });

    describe('tryCatch', () => {
      it('returns ok for successful promise', async () => {
        const result = await tryCatch(Promise.resolve('success'));
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe('success');
        }
      });

      it('returns err for rejected promise', async () => {
        const result = await tryCatch(Promise.reject(new Error('Failed')));
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toBe('Failed');
        }
      });
    });
  });

  describe('retryAsync', () => {
    it('succeeds on first try', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      
      const result = await retryAsync(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on failure and succeeds', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('First fail'))
        .mockRejectedValueOnce(new Error('Second fail'))
        .mockResolvedValue('success');
      
      const result = await retryAsync(fn, { maxAttempts: 3 });
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('throws after max attempts', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Always fails'));
      
      await expect(retryAsync(fn, { maxAttempts: 3 })).rejects.toThrow('Always fails');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('does not retry non-retryable errors', async () => {
      const fn = jest.fn().mockRejectedValue({ 
        code: 'PGRST116', 
        message: 'Not found' 
      });
      
      await expect(retryAsync(fn, { maxAttempts: 3 })).rejects.toBeDefined();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('calls onRetry callback', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Retry me'))
        .mockResolvedValue('success');
      const onRetry = jest.fn();
      
      await retryAsync(fn, { maxAttempts: 2, onRetry });
      
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Object));
    });

    it('respects maxDelayMs', async () => {
      // Test that delay is capped at maxDelayMs
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success');
      
      const start = Date.now();
      await retryAsync(fn, { 
        maxAttempts: 2, 
        initialDelayMs: 10, // Small for fast test
        maxDelayMs: 20,
      });
      const elapsed = Date.now() - start;
      
      // Should complete within reasonable time (with some buffer)
      expect(elapsed).toBeLessThan(500);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});

