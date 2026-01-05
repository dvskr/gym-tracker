# Quick Reference: Quality Development Checklist

A one-page reference for building apps with discipline and quality.

---

## 🚀 Starting a New Project

```bash
# 1. Create project
npx create-expo-app@latest my-app --template blank-typescript

# 2. Set up tooling
npm install -D eslint prettier husky lint-staged jest @testing-library/react-native

# 3. Configure TypeScript (strict mode)
# 4. Set up ESLint + Prettier
# 5. Create .env.example
# 6. Set up pre-commit hooks
# 7. Add GitHub Actions CI

# 8. Verify everything works
npm run validate
npm start
```

---

## 📝 Daily Workflow

### Every Morning (5 min)
```bash
git pull origin main
npx expo-doctor
npm start  # Verify it runs
```

### Per Feature (2-4 hours)
```bash
# 1. Create branch
git checkout -b feature/name

# 2. Write tests FIRST
# Create __tests__/feature.test.ts

# 3. Implement feature
# Tests should pass

# 4. Test on device
npm start

# 5. Validate
npm run validate

# 6. Commit & push
git commit -m "feat: add feature"
git push
```

---

## ✅ Before Every Commit

**Auto-runs via pre-commit hook:**
- ✅ `tsc --noEmit` (TypeScript)
- ✅ `eslint .` (Linting)
- ✅ `jest` (Tests)

**Manual checks:**
- ✅ App runs without errors
- ✅ No console.logs left behind
- ✅ Tests cover your changes
- ✅ Documentation updated

---

## 🧪 Testing Requirements

```
         E2E (10%)     - Critical user flows
    Integration (30%)  - Feature workflows
   Unit Tests (60%)    - Functions & components
```

**Minimum Coverage: 50%**
**Target Coverage: 70%**
**Critical Code: 90%**

```bash
npm test -- --coverage
# Check coverage/lcov-report/index.html
```

---

## 📦 Managing Dependencies

```bash
# DON'T: npm install random-package
# DO:
npx expo install package-name

# Check compatibility
npx expo-doctor

# Fix issues
npx expo install --fix

# Always test immediately
npm start
```

---

## 🔥 Handling Errors

### When Things Break

1. **Read the error message completely**
2. **Check terminal for stack trace**
3. **Google the exact error**
4. **Fix ONE thing at a time**
5. **Test after each fix**

### Common Fixes

```bash
# Dependency issues
rm -rf node_modules package-lock.json
npm install

# Metro bundler cache
npx expo start --clear

# TypeScript issues
npx tsc --noEmit

# Check compatibility
npx expo-doctor
```

---

## 📋 PR Checklist

Before creating PR:

- [ ] Pull latest main & rebase
- [ ] All tests pass
- [ ] Coverage > 50%
- [ ] No TypeScript errors
- [ ] No lint errors
- [ ] Tested on real device
- [ ] Screenshots (if UI change)
- [ ] Documentation updated
- [ ] Clear commit messages

---

## 🚫 Never Do This

❌ Ship code without tests  
❌ Commit broken code  
❌ Ignore warnings  
❌ Leave console.logs  
❌ Work without running app  
❌ Use `any` type in TypeScript  
❌ Skip pre-commit hooks  
❌ Merge without reviewing  
❌ Deploy without testing  
❌ Add dependencies without checking  

---

## ✅ Always Do This

✅ Write tests before code  
✅ Run app after every change  
✅ Fix warnings immediately  
✅ Use logger instead of console  
✅ Test on real devices daily  
✅ Use strict TypeScript  
✅ Review your own code  
✅ Keep PRs small (<300 lines)  
✅ Document as you go  
✅ Use `npx expo install`  

---

## 🎯 Code Quality Standards

### File Structure
```
src/
├── components/      # Reusable UI
├── screens/        # Full screens
├── lib/            # Business logic (NO React)
│   ├── api/        # API calls
│   ├── utils/      # Pure functions
│   └── services/   # Business services
├── stores/         # State management
├── hooks/          # Custom hooks
└── types/          # TypeScript types
```

### Naming Conventions
- Components: `UserProfile.tsx` (PascalCase)
- Hooks: `useAuth.ts` (camelCase with 'use')
- Utils: `formatDate.ts` (camelCase)
- Constants: `API_URL` (SCREAMING_SNAKE_CASE)

### Function Rules
- **Pure functions** when possible
- **Single responsibility**
- **Throw specific errors**
- **Return typed values**
- **Handle edge cases**

---

## 📊 Coverage Commands

```bash
# Run tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage

# Test specific file
npm test -- UserProfile.test.ts

# Test changed files
npm test -- --changedSince=main
```

---

## 🔧 Useful Commands

```bash
# Development
npm start                    # Start dev server
npm run validate             # Run all checks
npx expo-doctor             # Check health

# Code Quality
npm run lint                 # Check linting
npm run lint:fix            # Fix linting
npm run type-check          # Check TypeScript
npm run format              # Format code

# Testing
npm test                     # Run tests
npm run test:coverage       # With coverage
npm run test:watch          # Watch mode

# Debugging
npx expo start --clear      # Clear cache
npx react-devtools          # React DevTools
npx expo start --tunnel     # Expose to internet
```

---

## 📞 Getting Help

### When Stuck

1. **Read the docs** - [docs.expo.dev](https://docs.expo.dev)
2. **Check issues** - GitHub issues for the package
3. **Ask AI** - Provide full error message + context
4. **Stack Overflow** - Search by exact error
5. **Expo Discord** - [expo.dev/discord](https://expo.dev/discord)

### Debugging Process

```
1. Reproduce the error
2. Read error message carefully
3. Check what changed recently
4. Isolate the problem
5. Test one fix at a time
6. Document the solution
```

---

## 🎓 Key Principles

1. **Test Before Ship** - No tests = broken code
2. **Run Before Commit** - If it doesn't run, don't commit
3. **Fix Warnings Now** - They compound into bugs
4. **Automate Checks** - Humans forget, machines don't
5. **Keep PRs Small** - <300 lines is ideal
6. **Document Early** - Future you will thank you
7. **Quality Over Speed** - Fast broken code is worthless
8. **Test Real Devices** - Simulators lie
9. **Learn from Bugs** - Every error is a lesson
10. **Stay Humble** - We all write bugs

---

## 🏆 Success Metrics

Track these weekly:

- **Test Coverage**: Target 70%
- **Build Time**: < 60 seconds
- **PR Size**: < 300 lines average
- **Time to Merge**: < 2 days
- **Bugs in Production**: < 1 per week
- **Code Review Time**: < 24 hours

---

**Remember: Quality is not an act, it's a habit.**

For full guide, see [BUILDING_QUALITY_APPS.md](./BUILDING_QUALITY_APPS.md)

