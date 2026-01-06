import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Environment
    environment: 'jsdom',
    
    // Global setup
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    
    // Only test these folders (critical paths)
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
    ],
    
    // Skip these entirely
    exclude: [
      'node_modules',
      'scripts',
      '.expo',
      'android',
      'ios',
    ],
    
    // Coverage - only for critical files
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: [
        'lib/utils/calculations.ts',
        'lib/utils/validation.ts',
        'lib/sync/**/*.ts',
        'stores/workoutStore.ts',
        'stores/authStore.ts',
      ],
      exclude: [
        'lib/health/**',  // Platform-specific, skip
        '**/*.d.ts',
        '**/types/**',
        'scripts/**',
      ],
      thresholds: {
        // Only enforce on critical files
        'lib/utils/calculations.ts': {
          lines: 90,
          functions: 90,
        },
        'lib/sync/**/*.ts': {
          lines: 80,
          functions: 80,
        },
        'stores/workoutStore.ts': {
          lines: 70,
          functions: 70,
        },
      },
    },
    
    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});

