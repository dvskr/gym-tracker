// Minimal setup - no React Native Testing Library for now
import { vi, beforeAll } from 'vitest';

beforeAll(() => {
  global.fetch = vi.fn();
});

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));
