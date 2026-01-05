module.exports = {
  extends: ['expo', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'warn',
    
    // Prevent console.log in production code
    // Use logger from '@/lib/utils/logger' instead
    'no-console': ['error', { 
      allow: ['warn', 'error'] 
    }],
    
    // Other recommended rules
    'no-unused-vars': 'off', // TypeScript handles this
    '@typescript-eslint/no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
  },
  overrides: [
    {
      // Allow console.log in scripts (they're CLI tools)
      files: ['scripts/**/*.ts', 'scripts/**/*.js'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      // Allow console.log in Supabase Edge Functions (Deno runtime)
      files: ['supabase/functions/**/*.ts'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      // Allow console.log in logger implementation itself
      files: ['lib/utils/logger.ts', 'lib/sentry.ts'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};

