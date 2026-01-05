# Building Quality Apps: A Disciplined Approach

**The Complete Guide to Building Production-Ready React Native Apps**

*Last Updated: January 5, 2026*

---

## 📋 Table of Contents

1. [Philosophy: Quality Over Speed](#philosophy)
2. [Phase 0: Project Setup (Day 1)](#phase-0-setup)
3. [Phase 1: Foundation (Week 1)](#phase-1-foundation)
4. [Phase 2: Core Features (Weeks 2-4)](#phase-2-core)
5. [Phase 3: Polish & Production (Weeks 5-6)](#phase-3-production)
6. [Daily Workflow](#daily-workflow)
7. [Code Quality Standards](#code-quality)
8. [Testing Strategy](#testing-strategy)
9. [Common Pitfalls & Solutions](#pitfalls)
10. [Checklist: Before Every Commit](#commit-checklist)

---

## 🎯 Philosophy: Quality Over Speed {#philosophy}

### **The Iron Triangle of Development**

```
      SPEED
       /\
      /  \
     /    \
    /______\
 QUALITY  SCOPE
```

**Pick Two. You Can't Have All Three.**

Most developers pick **Speed + Scope** and sacrifice **Quality**.  
Result: Technical debt spiral, unmaintainable code, constant firefighting.

**The Right Choice: Quality + Scope**  
Accept that it takes time, but build something sustainable.

### **Core Principles**

1. **Test Before You Ship** - If it's not tested, it's broken
2. **Run Before You Commit** - If the app doesn't start, don't commit
3. **Fail Fast, Fail Loud** - Catch errors early, not in production
4. **Automate Everything** - Humans forget, machines don't
5. **Document While Fresh** - Future you will thank present you

---

## 🚀 Phase 0: Project Setup (Day 1) {#phase-0-setup}

### **Step 1: Initialize Project Correctly**

```bash
# Create project with TypeScript template
npx create-expo-app@latest my-app --template blank-typescript

cd my-app

# Verify it runs IMMEDIATELY
npx expo start
# Press 'i' or 'a' to open on simulator
# STOP and fix if anything breaks
```

### **Step 2: Set Up Version Control**

```bash
git init
git add .
git commit -m "Initial commit from create-expo-app"

# Create GitHub repo and push
git remote add origin <your-repo-url>
git push -u origin main
```

### **Step 3: Configure TypeScript Strictly**

```json
// tsconfig.json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

### **Step 4: Install ESLint + Prettier**

```bash
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser prettier eslint-config-prettier eslint-plugin-react eslint-plugin-react-hooks
```

**Create `.eslintrc.js`:**

```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  rules: {
    // Prevent common React Native mistakes
    'react/jsx-boolean-value': ['error', 'always'], // No shorthand booleans on Android
    'no-console': ['warn', { allow: ['error', 'warn'] }], // Block console.log
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
```

**Create `.prettierrc`:**

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### **Step 5: Set Up Testing from Day 1**

```bash
npm install -D jest @testing-library/react-native @testing-library/jest-native react-test-renderer @types/jest
```

**Create `jest.config.js`:**

```javascript
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|@unimodules|unimodules)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
```

**Add to `package.json`:**

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
    "validate": "npm run type-check && npm run lint && npm run test"
  }
}
```

### **Step 6: Set Up Git Hooks (Prevent Bad Commits)**

```bash
npm install -D husky lint-staged

# Initialize husky
npx husky init

# Create pre-commit hook
echo "npm run lint && npm run type-check" > .husky/pre-commit
chmod +x .husky/pre-commit
```

**Add to `package.json`:**

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

### **Step 7: Create Environment Setup**

```bash
# Install dotenv support
npm install react-native-dotenv
npm install -D @types/react-native-dotenv
```

**Create `.env.example`:**

```bash
# Copy this to .env and fill in your values

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Analytics, APIs, etc
EXPO_PUBLIC_ANALYTICS_ID=
```

**Add to `.gitignore`:**

```
.env
.env.local
```

### **Step 8: Create Project Structure**

```bash
mkdir -p src/{components,screens,lib,hooks,stores,types,utils}
mkdir -p __tests__/{components,lib,integration}
mkdir -p docs
```

**Create `src/lib/README.md`:**

```markdown
# lib/

Core business logic and utilities. No React components here.

- `api/` - API client functions
- `utils/` - Pure utility functions
- `services/` - Business logic services
- `constants/` - App constants

All functions should be:
- Pure (no side effects when possible)
- Tested (minimum 80% coverage)
- Documented (JSDoc comments)
```

### **Step 9: Set Up GitHub Actions CI**

**Create `.github/workflows/ci.yml`:**

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run type-check
      
      - name: Lint
        run: npm run lint
      
      - name: Test
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false
```

### **Step 10: Verify Everything Works**

```bash
# This should all pass
npm run validate
npm run test
npx expo start

# Git commit should trigger pre-commit hook
git add .
git commit -m "Add tooling and quality gates"
# Should run lint + type-check automatically
```

**If ANYTHING fails, stop and fix it NOW.**

---

## 🏗️ Phase 1: Foundation (Week 1) {#phase-1-foundation}

### **Day 1-2: Core Architecture**

#### **1. Set Up Navigation**

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens
```

**Create `app/_layout.tsx`:**

```typescript
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  );
}
```

#### **2. Set Up State Management**

```bash
npm install zustand
```

**Create `src/stores/authStore.ts`:**

```typescript
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      // TODO: Implement
    } finally {
      set({ isLoading: false });
    }
  },
  
  logout: async () => {
    set({ user: null });
  },
}));
```

**Write the test IMMEDIATELY:**

```typescript
// __tests__/stores/authStore.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useAuthStore } from '@/stores/authStore';

describe('authStore', () => {
  it('should initialize with null user', () => {
    const { result } = renderHook(() => useAuthStore());
    expect(result.current.user).toBeNull();
  });
  
  it('should set loading state during login', async () => {
    const { result } = renderHook(() => useAuthStore());
    
    act(() => {
      result.current.login('test@test.com', 'password');
    });
    
    expect(result.current.isLoading).toBe(true);
  });
});
```

**Run test before moving on:**

```bash
npm test -- authStore.test.ts
```

### **Day 3-4: Backend Integration**

```bash
npm install @supabase/supabase-js
```

**Create `src/lib/supabase.ts`:**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Create error handling utility:**

```typescript
// src/lib/utils/errorHandling.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public userMessage?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleSupabaseError(error: any): AppError {
  if (error?.code === 'PGRST116') {
    return new AppError(error.message, error.code, 'Item not found');
  }
  // Add more cases
  return new AppError(error.message, error.code, 'Something went wrong');
}
```

### **Day 5: Testing Strategy**

**Write integration test for auth flow:**

```typescript
// __tests__/integration/authFlow.test.ts
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

describe('Auth Flow', () => {
  beforeEach(() => {
    // Clear store
    useAuthStore.setState({ user: null });
  });
  
  it('should handle login flow', async () => {
    const { login } = useAuthStore.getState();
    
    await expect(login('test@test.com', 'password')).resolves.not.toThrow();
    
    const { user } = useAuthStore.getState();
    expect(user).not.toBeNull();
  });
});
```

### **Day 6-7: UI Foundation**

Create reusable components with tests:

```typescript
// src/components/Button.tsx
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({ title, onPress, variant = 'primary', disabled = false }: ButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, styles[variant], disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      testID="button"
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: '#007AFF',
  },
  secondary: {
    backgroundColor: '#6B7280',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

**Test it:**

```typescript
// __tests__/components/Button.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/Button';

describe('Button', () => {
  it('should render title', () => {
    const { getByText } = render(<Button title="Click me" onPress={() => {}} />);
    expect(getByText('Click me')).toBeTruthy();
  });
  
  it('should call onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<Button title="Click" onPress={onPress} />);
    
    fireEvent.press(getByTestId('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  
  it('should not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <Button title="Click" onPress={onPress} disabled={true} />
    );
    
    fireEvent.press(getByTestId('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

---

## 💪 Phase 2: Core Features (Weeks 2-4) {#phase-2-core}

### **Feature Development Process**

**FOR EVERY FEATURE, Follow This Exact Process:**

#### **Step 1: Write Spec (30 min)**

```markdown
# Feature: User Workout Logging

## User Story
As a user, I want to log my workouts so I can track my progress.

## Acceptance Criteria
- [ ] User can start a new workout
- [ ] User can add exercises to workout
- [ ] User can log sets (weight, reps)
- [ ] User can complete workout
- [ ] Data persists to database

## Technical Plan
1. Create workout store
2. Create workout API functions
3. Build workout screen UI
4. Add tests for core logic
5. Test on device

## Edge Cases
- What if network fails during save?
- What if user closes app mid-workout?
- What if user adds 0 exercises?
```

#### **Step 2: Create Tests (1-2 hours)**

Write tests BEFORE implementation:

```typescript
// __tests__/lib/api/workouts.test.ts
import { createWorkout, addExerciseToWorkout } from '@/lib/api/workouts';

describe('Workout API', () => {
  it('should create workout with name and timestamp', async () => {
    const workout = await createWorkout('Morning Workout');
    
    expect(workout).toHaveProperty('id');
    expect(workout.name).toBe('Morning Workout');
    expect(workout.started_at).toBeTruthy();
  });
  
  it('should handle network errors gracefully', async () => {
    // Mock network failure
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
    
    await expect(createWorkout('Test')).rejects.toThrow('Network error');
  });
});
```

**Run tests (they should fail):**

```bash
npm test -- workouts.test.ts
# FAIL - createWorkout is not defined
```

#### **Step 3: Implement Minimum (2-4 hours)**

```typescript
// src/lib/api/workouts.ts
import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/utils/errorHandling';

export async function createWorkout(name: string) {
  const { data, error } = await supabase
    .from('workouts')
    .insert({ name, started_at: new Date().toISOString() })
    .select()
    .single();
  
  if (error) throw handleSupabaseError(error);
  return data;
}
```

**Run tests (should pass):**

```bash
npm test -- workouts.test.ts
# PASS - 2 tests passed
```

#### **Step 4: Build UI (2-3 hours)**

```typescript
// src/screens/WorkoutScreen.tsx
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '@/components/Button';
import { createWorkout } from '@/lib/api/workouts';

export function WorkoutScreen() {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleStart = async () => {
    setIsLoading(true);
    try {
      const workout = await createWorkout('New Workout');
      // Navigate to workout detail
    } catch (error) {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ready to work out?</Text>
      <Button
        title={isLoading ? 'Starting...' : 'Start Workout'}
        onPress={handleStart}
        disabled={isLoading}
      />
    </View>
  );
}
```

#### **Step 5: Test on Device (30 min)**

```bash
npx expo start
# Press 'a' for Android or 'i' for iOS

# Manual testing checklist:
# [ ] Screen renders correctly
# [ ] Button tap creates workout
# [ ] Loading state works
# [ ] Error handling works (turn off wifi)
# [ ] Data appears in database
```

#### **Step 6: Run Full Validation**

```bash
npm run validate
# Should pass:
# ✓ Type check
# ✓ Lint
# ✓ Tests

npm test -- --coverage
# Coverage should be > 50%
```

#### **Step 7: Commit**

```bash
git add .
git commit -m "feat: add workout creation

- Create workout API function
- Add workout screen UI
- Handle loading and error states
- Add tests for core functionality

Tests: 8 passing
Coverage: 62%"

git push
```

### **Week 2: Feature Velocity**

**Build features in this order:**

1. **Auth (Days 1-2)**: Login, Signup, Logout
2. **Profile (Day 3)**: View/edit user profile
3. **Core Domain (Days 4-5)**: Main feature (e.g., workout logging)

**Key Rules:**
- Test coverage must stay > 50%
- No feature ships without tests
- Run `npm run validate` before every commit
- Test on device at least twice per day

### **Week 3-4: Advanced Features**

Add polish features:
- Offline support
- Caching
- Optimistic updates
- Error recovery

**But maintain discipline:**
- Every feature gets tests
- Coverage threshold increases to 60%
- Add integration tests for critical paths

---

## 🎨 Phase 3: Polish & Production (Weeks 5-6) {#phase-3-production}

### **Week 5: Hardening**

#### **Day 1: Error Monitoring**

```bash
npm install @sentry/react-native sentry-expo
npx @sentry/wizard -s -i reactNative
```

**Initialize Sentry:**

```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  enabled: !__DEV__, // Only in production
  tracesSampleRate: 1.0,
});

export function captureError(error: Error, context?: Record<string, any>) {
  if (__DEV__) {
    console.error('[Error]', error, context);
  } else {
    Sentry.captureException(error, { extra: context });
  }
}
```

#### **Day 2: Performance Monitoring**

Add performance tracking:

```typescript
// src/lib/performance.ts
export function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const start = Date.now();
  
  const result = fn();
  
  if (result instanceof Promise) {
    return result.finally(() => {
      const duration = Date.now() - start;
      console.log(`[Perf] ${name}: ${duration}ms`);
    }) as Promise<T>;
  }
  
  const duration = Date.now() - start;
  console.log(`[Perf] ${name}: ${duration}ms`);
  return result;
}
```

#### **Day 3: Code Quality Audit**

```bash
# Run full audit
npm run lint
npm run type-check
npm test -- --coverage

# Check for console.logs
grep -r "console\.log" src/

# Check for TODO comments
grep -r "TODO\|FIXME\|HACK" src/

# Check bundle size
npx expo export

# Check for unused dependencies
npx depcheck
```

#### **Day 4-5: Documentation**

**Create comprehensive README:**

```markdown
# MyApp

## Setup

1. Clone repo: `git clone ...`
2. Install: `npm install`
3. Copy env: `cp .env.example .env`
4. Fill in `.env` with your values
5. Start: `npm start`

## Development

- `npm start` - Start dev server
- `npm test` - Run tests
- `npm run lint` - Check code style
- `npm run type-check` - Check types
- `npm run validate` - Run all checks

## Testing

Run tests:
```bash
npm test
npm run test:coverage
```

Coverage requirements:
- Minimum: 50%
- Target: 70%
- Critical paths: 90%

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Contributing

1. Create feature branch
2. Write tests first
3. Implement feature
4. Run `npm run validate`
5. Create PR
```

### **Week 6: Pre-Launch**

#### **Launch Checklist**

```markdown
# Pre-Launch Checklist

## Code Quality
- [ ] Test coverage > 60%
- [ ] All lint errors fixed
- [ ] No TypeScript errors
- [ ] No console.logs in production code
- [ ] All TODOs resolved or documented

## Security
- [ ] All API keys in environment variables
- [ ] .env not committed to git
- [ ] Supabase RLS policies enabled
- [ ] Auth tokens properly secured

## Performance
- [ ] Bundle size optimized
- [ ] Images compressed
- [ ] No memory leaks
- [ ] Smooth 60fps scrolling

## Testing
- [ ] All critical paths tested
- [ ] Integration tests pass
- [ ] Tested on physical devices (iOS + Android)
- [ ] Offline mode works
- [ ] Error states work

## Documentation
- [ ] README complete
- [ ] API documented
- [ ] Architecture documented
- [ ] Deployment guide written

## Monitoring
- [ ] Sentry configured
- [ ] Analytics configured
- [ ] Error alerts set up
- [ ] Performance monitoring enabled
```

---

## 🔄 Daily Workflow {#daily-workflow}

### **Every Morning (15 min)**

```bash
# Pull latest changes
git pull origin main

# Check for dependency updates
npx expo-doctor

# Install any new deps
npm install

# Verify everything works
npm start
npm run validate
```

### **During Development (Per Feature)**

```bash
# 1. Create branch
git checkout -b feature/user-profile

# 2. Write tests first
# Create __tests__/feature.test.ts

# 3. Run tests (should fail)
npm test -- feature.test.ts

# 4. Implement feature
# Create src/feature.ts

# 5. Run tests (should pass)
npm test -- feature.test.ts

# 6. Test on device
npm start

# 7. Validate all
npm run validate

# 8. Commit
git add .
git commit -m "feat: add user profile"

# 9. Push
git push origin feature/user-profile
```

### **Before Every Commit (Auto-runs via husky)**

```bash
# These run automatically in pre-commit hook:
npm run type-check  # TypeScript
npm run lint        # ESLint
npm test           # Jest

# If any fail, commit is blocked
```

### **End of Day (10 min)**

```bash
# Run full test suite
npm test -- --coverage

# Check coverage report
open coverage/lcov-report/index.html

# Commit and push
git push origin feature/your-feature

# Plan tomorrow's tasks
```

---

## ✅ Code Quality Standards {#code-quality}

### **File Organization**

```
src/
├── components/        # Reusable UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   └── Button.test.tsx
├── screens/          # Full screen views
│   └── HomeScreen.tsx
├── lib/              # Business logic (NO React)
│   ├── api/          # API functions
│   ├── utils/        # Pure utilities
│   └── services/     # Business services
├── stores/           # Zustand stores
├── hooks/            # Custom React hooks
└── types/            # TypeScript types
```

### **Naming Conventions**

```typescript
// Components: PascalCase
export function UserProfile() {}

// Files: Match component name
// UserProfile.tsx

// Hooks: camelCase with 'use' prefix
export function useAuth() {}

// Utilities: camelCase
export function formatDate() {}

// Constants: SCREAMING_SNAKE_CASE
export const API_URL = 'https://...';

// Types/Interfaces: PascalCase
export interface User {}
export type UserRole = 'admin' | 'user';
```

### **Function Guidelines**

```typescript
// ✅ GOOD: Pure, testable, single responsibility
export function calculateBMI(weight: number, height: number): number {
  if (height === 0) throw new Error('Height cannot be zero');
  return weight / (height * height);
}

// ❌ BAD: Side effects, multiple responsibilities
export function updateUserBMI(userId: string) {
  const user = getUser(userId); // Side effect
  const bmi = user.weight / (user.height * user.height);
  updateDatabase(userId, bmi); // Side effect
  sendNotification(user.email); // Side effect
  return bmi;
}
```

### **Error Handling**

```typescript
// ✅ GOOD: Specific errors, user-friendly messages
export async function fetchUser(id: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select()
      .eq('id', id)
      .single();
    
    if (error) {
      throw new AppError(
        error.message,
        'USER_FETCH_FAILED',
        'Could not load user profile. Please try again.'
      );
    }
    
    return data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error.message,
      'UNKNOWN_ERROR',
      'Something went wrong. Please try again.'
    );
  }
}

// ❌ BAD: Silent failure, generic errors
export async function fetchUser(id: string) {
  try {
    const { data } = await supabase.from('users').select().eq('id', id).single();
    return data;
  } catch (error) {
    console.log('Error:', error); // Don't just log!
    return null; // Silent failure!
  }
}
```

### **Component Guidelines**

```typescript
// ✅ GOOD: Typed props, testable, accessible
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  testID?: string;
}

export function Button({ title, onPress, variant = 'primary', testID }: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={title}
      testID={testID || 'button'}
    >
      <Text>{title}</Text>
    </TouchableOpacity>
  );
}

// ❌ BAD: Untyped props, not testable, not accessible
export function Button(props) {
  return (
    <TouchableOpacity onPress={props.onClick}>
      <Text>{props.label}</Text>
    </TouchableOpacity>
  );
}
```

---

## 🧪 Testing Strategy {#testing-strategy}

### **Testing Pyramid**

```
       /\
      /  \    10% E2E Tests (Critical user flows)
     /----\
    /      \  30% Integration Tests (Feature flows)
   /--------\
  /          \ 60% Unit Tests (Functions, components)
 /____________\
```

### **Unit Tests (60% of tests)**

Test individual functions and components:

```typescript
// __tests__/lib/utils/calculations.test.ts
import { calculateBMI } from '@/lib/utils/calculations';

describe('calculateBMI', () => {
  it('should calculate BMI correctly', () => {
    expect(calculateBMI(70, 1.75)).toBeCloseTo(22.86);
  });
  
  it('should throw error for zero height', () => {
    expect(() => calculateBMI(70, 0)).toThrow('Height cannot be zero');
  });
  
  it('should handle decimal values', () => {
    expect(calculateBMI(70.5, 1.755)).toBeCloseTo(22.9);
  });
});
```

### **Integration Tests (30% of tests)**

Test feature workflows:

```typescript
// __tests__/integration/workoutFlow.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useWorkoutStore } from '@/stores/workoutStore';
import { createWorkout, addExercise } from '@/lib/api/workouts';

describe('Workout Flow', () => {
  it('should complete full workout flow', async () => {
    const { result } = renderHook(() => useWorkoutStore());
    
    // Start workout
    await act(async () => {
      await result.current.startWorkout('Leg Day');
    });
    
    expect(result.current.activeWorkout).not.toBeNull();
    
    // Add exercise
    await act(async () => {
      await result.current.addExercise({ id: '1', name: 'Squat' });
    });
    
    expect(result.current.activeWorkout?.exercises).toHaveLength(1);
    
    // Complete workout
    await act(async () => {
      await result.current.completeWorkout();
    });
    
    expect(result.current.activeWorkout).toBeNull();
  });
});
```

### **E2E Tests (10% of tests)**

Test critical user journeys:

```typescript
// e2e/auth.test.ts (using Detox)
describe('Authentication', () => {
  it('should allow user to sign up and log in', async () => {
    await device.launchApp();
    
    // Navigate to signup
    await element(by.id('signup-button')).tap();
    
    // Fill form
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    
    // Submit
    await element(by.id('submit-button')).tap();
    
    // Verify logged in
    await expect(element(by.id('home-screen'))).toBeVisible();
  });
});
```

### **Test Coverage Rules**

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 50,
    functions: 50,
    lines: 50,
    statements: 50,
  },
  // Critical files need higher coverage
  'src/lib/api/*.ts': {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

---

## ⚠️ Common Pitfalls & Solutions {#pitfalls}

### **Pitfall 1: Adding Dependencies Without Checking**

**❌ Bad:**
```bash
npm install some-random-package
# Hope it works!
```

**✅ Good:**
```bash
# Check Expo compatibility first
npx expo install --check

# For Expo packages, use expo install
npx expo install react-native-reanimated

# Verify it works immediately
npm start
```

### **Pitfall 2: Ignoring Warnings**

**❌ Bad:**
```
⚠️ Warning: Package version mismatch
⚠️ Warning: Deprecated package
⚠️ Warning: TypeScript error

# "I'll fix it later" 😅
```

**✅ Good:**
```bash
# Fix warnings immediately
npx expo-doctor
npx expo install --fix

# Update deprecated packages
npm outdated
npm update
```

### **Pitfall 3: No Testing**

**❌ Bad:**
```typescript
// Just write code and ship it 🤞
export function calculateTax(amount: number) {
  return amount * 0.08;
}
```

**✅ Good:**
```typescript
// Write test first
it('should calculate tax', () => {
  expect(calculateTax(100)).toBe(8);
});

// Then implement
export function calculateTax(amount: number) {
  return amount * 0.08;
}
```

### **Pitfall 4: Feature Branches Living Too Long**

**❌ Bad:**
```bash
# Work on feature for 3 weeks
# 500+ line diff
# Merge conflicts everywhere
# Too risky to merge
```

**✅ Good:**
```bash
# Break into small PRs
# PR 1: Add API function (50 lines)
# PR 2: Add UI component (80 lines)
# PR 3: Connect UI to API (30 lines)

# Each PR:
# - Reviewed in 1 day
# - Low risk
# - Easy to revert
```

### **Pitfall 5: Not Testing on Real Devices**

**❌ Bad:**
```bash
# Only test in simulator
# Ship to App Store
# Crash reports flood in 📱💥
```

**✅ Good:**
```bash
# Test on real devices DAILY
# Test on oldest supported device
# Test on different screen sizes
# Test offline mode
# Test with slow network
```

---

## 📋 Checklist: Before Every Commit {#commit-checklist}

### **Automatic Checks (via pre-commit hook)**

These run automatically:
- ✅ TypeScript compiles (`tsc --noEmit`)
- ✅ ESLint passes (`eslint .`)
- ✅ Tests pass (`jest`)

### **Manual Checks**

Before committing, verify:

```bash
# 1. App runs without errors
npx expo start
# Open on device, navigate through your changes

# 2. No console.logs left behind
git diff | grep "console.log"

# 3. Tests cover your changes
npm test -- --coverage --changedSince=main

# 4. No TypeScript errors
npx tsc --noEmit

# 5. Documentation updated (if needed)
# Update README, add comments, etc.

# 6. Commit message follows convention
# feat: Add user profile
# fix: Fix login bug
# docs: Update setup guide
# test: Add workout tests
```

### **Before Creating PR**

```bash
# 1. Pull latest main
git checkout main
git pull
git checkout your-branch
git rebase main

# 2. Run full validation
npm run validate
npm test -- --coverage

# 3. Check bundle size impact
npx expo export
# Note the bundle size before/after

# 4. Update CHANGELOG.md (if applicable)

# 5. Screenshot/video for UI changes

# 6. Create PR with:
# - Clear title
# - Description of changes
# - Testing notes
# - Screenshots (if UI change)
```

---

## 🎯 Summary: The Golden Rules

1. **Test Before You Ship** - No tests = broken code
2. **Run Before You Commit** - If it doesn't run, don't commit
3. **One Feature at a Time** - Small PRs ship faster
4. **Fix Warnings Immediately** - They compound into bugs
5. **Document While Fresh** - Future you will thank you
6. **Automate Everything** - Humans forget, machines don't
7. **Quality Over Speed** - Fast code that's broken is worthless
8. **Review Your Own Code** - Read your diff before committing
9. **Test on Real Devices** - Simulators lie
10. **Keep Learning** - Every bug is a lesson

---

## 📚 Further Reading

- [React Native Best Practices](https://reactnative.dev/docs/performance)
- [Testing Best Practices](https://kentcdodds.com/blog/write-tests)
- [Clean Code Principles](https://github.com/ryanmcdermott/clean-code-javascript)
- [Git Commit Messages](https://www.conventionalcommits.org/)
- [API Design Guidelines](https://github.com/microsoft/api-guidelines)

---

**Remember: Building quality apps takes time, but maintaining broken apps takes forever.**

Good luck! 🚀

