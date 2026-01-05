# Recovery Plan: From F to A

**Your personalized action plan to fix this codebase**

Based on the brutal assessment on January 5, 2026.

---

## 🚨 Current Status: F (50/100)

**Critical Issues:**
- ❌ App doesn't run (FIXED today)
- ❌ 6.7% test coverage (need 50%+)
- ❌ 1,842 console.logs
- ❌ 474 GIF files in repo
- ❌ Broken Tailwind config
- ❌ No ESLint
- ❌ Dummy App.tsx

**Goal: Get to B+ (85/100) in 4 weeks**

---

## 📅 Week 1: Stop the Bleeding (Jan 6-12)

### Day 1 (Monday) - Verify & Clean
**Time: 2-3 hours**

```bash
# 1. Verify app runs (should work now after fixes)
cd gym-tracker
npx expo start --clear
# Test on Android/iOS - make sure NOTHING crashes

# 2. Run diagnostics
npx expo-doctor
# Fix all warnings

# 3. Check TypeScript
npx tsc --noEmit
# Fix all errors (may take a while)

# 4. Delete dummy App.tsx
rm App.tsx

# Commit
git add .
git commit -m "chore: remove dummy App.tsx and fix type errors"
```

### Day 2 (Tuesday) - Add Safety Rails
**Time: 3-4 hours**

```bash
# 1. Install ESLint
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser

# 2. Create .eslintrc.js (see BUILDING_QUALITY_APPS.md)

# 3. Run lint (will show MANY errors)
npm run lint

# 4. Fix critical errors only
npm run lint:fix

# 5. Add to package.json
# "lint": "eslint . --ext .ts,.tsx"

# Commit
git commit -m "chore: add ESLint configuration"
```

### Day 3 (Wednesday) - Set Up Pre-Commit Hooks
**Time: 2 hours**

```bash
# 1. Install husky
npm install -D husky lint-staged
npx husky init

# 2. Create .husky/pre-commit
echo "npm run type-check && npm run lint" > .husky/pre-commit
chmod +x .husky/pre-commit

# 3. Test it works
# Make a change, try to commit
# Should block if errors exist

# Commit
git commit -m "chore: add pre-commit hooks"
```

### Day 4 (Thursday) - Purge Console.Logs
**Time: 3-4 hours**

```bash
# 1. Run your existing script
npm run analyze:logs

# 2. Review console-log-report.json

# 3. Replace with logger calls
# In files that need logging, use:
# import { logger } from '@/lib/utils/logger';
# Replace console.log with logger.log

# 4. Delete unnecessary logs

# 5. Add ESLint rule to block future console.logs
# In .eslintrc.js:
# 'no-console': ['error', { allow: ['error', 'warn'] }]

# Goal: Get from 1,842 to < 50 console.logs

# Commit
git commit -m "chore: remove debug console.logs"
```

### Day 5 (Friday) - Fix Tailwind or Remove It
**Time: 1 hour**

**Option A: Fix It (if you want to use it)**
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  // ... rest
}
```

**Option B: Remove It (recommended)**
```bash
npm uninstall tailwindcss
rm tailwind.config.js
# Continue using StyleSheet.create
```

```bash
# Commit
git commit -m "chore: remove unused tailwind config"
```

---

## 📅 Week 2: Add Tests (Jan 13-19)

### Goal: 20% → 40% Coverage

Focus on critical paths first.

### Day 1-2 (Mon-Tue) - Test Core Functions
**Time: 6-8 hours**

```bash
# Test these first (highest value):
# 1. lib/utils/prDetection.ts
# 2. lib/utils/calculations.ts
# 3. lib/utils/unitConversion.ts
# 4. lib/api/workouts.ts
# 5. lib/api/exercises.ts

# Example:
# __tests__/lib/utils/prDetection.test.ts
# __tests__/lib/api/workouts.test.ts

# Run tests
npm test -- --coverage

# Check coverage/lcov-report/index.html
```

### Day 3-4 (Wed-Thu) - Test Stores
**Time: 6-8 hours**

```bash
# Test critical stores:
# 1. stores/workoutStore.ts (most critical!)
# 2. stores/authStore.ts
# 3. stores/exerciseStore.ts

# Focus on:
# - State changes
# - API calls
# - Error handling
```

### Day 5 (Fri) - Integration Tests
**Time: 4 hours**

```bash
# Write 3 integration tests:
# 1. Auth flow (signup → login → logout)
# 2. Workout flow (start → add exercise → complete)
# 3. Template flow (create → use → edit)

# Location: __tests__/integration/

# Goal: 40% coverage by EOD
npm test -- --coverage
```

---

## 📅 Week 3: Clean Up Repo (Jan 20-26)

### Day 1-2 (Mon-Tue) - Move GIFs to Supabase
**Time: 4-6 hours**

```bash
# 1. Create Supabase storage bucket (if not exists)
# 2. Upload all GIFs to Supabase Storage
# 3. Update database to use Supabase URLs
# 4. Test that GIFs load in app
# 5. Delete local GIF folders
# 6. Add to .gitignore

# Add to .gitignore:
echo "exercise-gifs/" >> .gitignore
echo "exercise-gifs-1080p/" >> .gitignore
echo "exercise-thumbnails/" >> .gitignore

# Delete local files
rm -rf exercise-gifs/
rm -rf exercise-gifs-1080p/
rm -rf exercise-thumbnails/

# Commit
git commit -m "chore: move media to Supabase Storage"
```

**Expected Impact:** Repo size from ~1GB → ~50MB

### Day 3 (Wed) - Create .env.example
**Time: 1 hour**

```bash
# Create .env.example
cat > .env.example << 'EOF'
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# APIs
EXPO_PUBLIC_EXERCISEDB_API_KEY=your-api-key

# Optional
EXPO_PUBLIC_SENTRY_DSN=
EOF

# Commit
git commit -m "docs: add .env.example"
```

### Day 4 (Thu) - Clean Up Scripts
**Time: 2-3 hours**

```bash
# 1. Delete deprecated folder
rm -rf scripts/deprecated/

# 2. Document remaining scripts in README
# Add section explaining each script

# 3. Remove unused scripts from package.json

# Commit
git commit -m "chore: clean up deprecated scripts"
```

### Day 5 (Fri) - Fix Migration Timestamps
**Time: 2 hours**

```bash
# 1. Rename fix_template_exercises_rls.sql
cd supabase/migrations
mv fix_template_exercises_rls.sql 20250105000000_fix_template_exercises_rls.sql

# 2. Verify no duplicate timestamps
ls -la | grep ".sql"

# 3. Commit
git commit -m "fix: standardize migration naming"
```

---

## 📅 Week 4: Refactor & Polish (Jan 27 - Feb 2)

### Day 1-3 (Mon-Wed) - Split workoutStore.ts
**Time: 8-12 hours**

**Current:** 1,168 lines in one file  
**Goal:** Split into 4 files, each < 300 lines

```
stores/
├── workoutStore.ts (200 lines - state + basic actions)
├── workoutService.ts (250 lines - business logic)
├── prService.ts (150 lines - PR detection)
└── restTimerService.ts (100 lines - timer logic)
```

**Process:**
1. Create new files
2. Move functions
3. Update imports
4. Run tests (should still pass)
5. Test app thoroughly

```bash
# After split, verify:
npm test
npm run validate
npm start
# Test workout flow end-to-end
```

### Day 4 (Thu) - Increase Test Coverage
**Time: 4-6 hours**

```bash
# Goal: 40% → 60% coverage

# Focus on:
# 1. Components that crashed on Android
# 2. API functions
# 3. Critical user flows

npm test -- --coverage
```

### Day 5 (Fri) - Documentation & Review
**Time: 3-4 hours**

```bash
# 1. Update README.md
# - Remove outdated info
# - Add setup instructions
# - Link to docs/

# 2. Review all changes from past 4 weeks
git log --oneline --since="4 weeks ago"

# 3. Create summary PR
# Title: "Codebase quality improvements"
# Description: List all improvements

# 4. Celebrate! 🎉
```

---

## 📊 Expected Progress

| Week | Test Coverage | Grade | Key Improvements |
|------|---------------|-------|------------------|
| 0 (Start) | 6.7% | F (50%) | App doesn't run |
| 1 | 15% | D (60%) | App runs, safety rails added |
| 2 | 40% | C (70%) | Core functionality tested |
| 3 | 50% | C+ (75%) | Repo cleaned up |
| 4 | 60% | B+ (85%) | Code refactored, maintainable |

---

## ✅ Success Criteria (End of Week 4)

### Must Have:
- ✅ App runs without errors
- ✅ Test coverage > 60%
- ✅ Console.logs < 50
- ✅ GIFs in Supabase (not in repo)
- ✅ Pre-commit hooks working
- ✅ ESLint configured
- ✅ TypeScript errors = 0
- ✅ .env.example exists

### Nice to Have:
- ✅ workoutStore split into services
- ✅ CI passes on all PRs
- ✅ Documentation updated
- ✅ Migration timestamps fixed

---

## 🚨 When You Get Stuck

### Problem: "I broke something"
```bash
# 1. Don't panic
# 2. Read the error message
# 3. Check what changed
git diff

# 4. Revert if needed
git checkout -- <file>

# 5. Try one fix at a time
```

### Problem: "Tests are failing"
```bash
# 1. Run specific test
npm test -- <file>.test.ts

# 2. Read failure message
# 3. Add console.logs to debug
# 4. Fix one test at a time
```

### Problem: "Running out of time"
```bash
# PRIORITY ORDER:
# 1. App must run ✅ (DONE)
# 2. Safety rails (pre-commit)
# 3. Console.logs purge
# 4. Test coverage
# 5. Everything else

# If short on time, skip Week 4 refactoring
# Focus on getting coverage to 50%+
```

---

## 📞 Getting Help

1. **Read the error** - Most answers are in the error message
2. **Check docs/** - [BUILDING_QUALITY_APPS.md](./BUILDING_QUALITY_APPS.md), [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
3. **Check lessons.md** - You've debugged similar issues before
4. **Google it** - Someone else hit this error
5. **Ask AI** - Provide full context + error

---

## 🎯 After Week 4

### Monthly Maintenance (1-2 hours/month):
- Run `npx expo-doctor`
- Update dependencies: `npx expo install --fix`
- Review test coverage
- Fix any new warnings

### Quarterly Deep Clean (1 day/quarter):
- Audit dependencies: `npx depcheck`
- Review bundle size
- Update documentation
- Refactor oldest code

### Continuous Improvement:
- Every new feature: Write tests FIRST
- Every commit: Pre-commit hook passes
- Every PR: Review your own code
- Every bug: Add to lessons.md

---

## 💪 You Got This!

**You built an impressive app with tons of features.**

Now you're adding the discipline to make it maintainable.

**4 weeks from now, you'll have:**
- A codebase you're proud of
- Tests that give you confidence
- A development process that scales
- Skills that transfer to any project

**Let's go! 🚀**

---

**Track your progress:**
```bash
# Week 1
[ ] App runs
[ ] ESLint added
[ ] Pre-commit hooks
[ ] Console.logs < 200
[ ] Tailwind fixed/removed

# Week 2
[ ] Test coverage 20%
[ ] Test coverage 30%
[ ] Test coverage 40%

# Week 3
[ ] GIFs moved to Supabase
[ ] .env.example created
[ ] Scripts cleaned up
[ ] Test coverage 50%

# Week 4
[ ] workoutStore refactored
[ ] Test coverage 60%
[ ] Documentation updated
[ ] CELEBRATE! 🎉
```

