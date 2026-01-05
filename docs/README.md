# Documentation

This folder contains comprehensive guides for building quality apps.

## 📚 Guides

### [BUILDING_QUALITY_APPS.md](./BUILDING_QUALITY_APPS.md)
**The Complete Guide** (9,000+ words)

A comprehensive, step-by-step guide covering:
- Project setup from scratch
- Daily development workflow
- Testing strategies
- Code quality standards
- Common pitfalls and solutions
- Production deployment checklist

**Read this when:** Starting a new project or establishing team standards.

---

### [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
**One-Page Cheat Sheet**

Quick reference covering:
- Daily workflow checklist
- Before-commit checklist
- Common commands
- Never/Always rules
- Debugging process

**Read this when:** Working day-to-day, need a quick reminder.

---

## 🎯 Start Here

### If You're New to React Native:
1. Read the [React Native docs](https://reactnative.dev/docs/getting-started)
2. Complete the [Expo tutorial](https://docs.expo.dev/tutorial/introduction/)
3. Then read [BUILDING_QUALITY_APPS.md](./BUILDING_QUALITY_APPS.md)

### If You're Starting a New Project:
1. Follow [BUILDING_QUALITY_APPS.md](./BUILDING_QUALITY_APPS.md) Phase 0
2. Set up tooling (ESLint, Prettier, Husky)
3. Write your first test before your first feature
4. Use [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) daily

### If You're Joining This Project:
1. Read the root [README.md](../README.md)
2. Check [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
3. Run `npx expo-doctor` to check your setup
4. Start with a small PR to learn the workflow

---

## 🔥 Quick Setup (5 minutes)

```bash
# 1. Clone and install
git clone <repo-url>
cd gym-tracker
npm install

# 2. Set up environment
cp .env.example .env
# Fill in your values in .env

# 3. Verify it works
npm run validate
npm start

# 4. Read the docs
cat docs/QUICK_REFERENCE.md
```

---

## 📖 Other Documentation

- [lessons.md](../lessons.md) - Debugging lessons learned (523 lines of pain)
- [EXERCISES_LIST.md](../EXERCISES_LIST.md) - Exercise database (423 exercises)
- Individual feature docs:
  - [AI_EDGE_FUNCTION_DEBUGGING.md](./AI_EDGE_FUNCTION_DEBUGGING.md)
  - [TESTING_EDGE_FUNCTIONS.md](./TESTING_EDGE_FUNCTIONS.md)
  - [ERROR_FIXES_SUMMARY.md](./ERROR_FIXES_SUMMARY.md)

---

## 🆘 Getting Help

### Documentation Not Clear?
Open an issue or create a PR to improve it.

### Found a Bug?
1. Check if it's already in [lessons.md](../lessons.md)
2. Try to reproduce it
3. Create an issue with reproduction steps

### Need to Add Documentation?
1. Choose the right place:
   - General principles → [BUILDING_QUALITY_APPS.md](./BUILDING_QUALITY_APPS.md)
   - Quick reference → [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
   - Debugging lessons → [../lessons.md](../lessons.md)
   - Feature-specific → Create new doc in this folder
2. Follow existing format
3. Keep it concise and actionable

---

## ✅ Documentation Standards

Good documentation is:
- **Actionable** - Tell people what to DO, not just what to know
- **Scannable** - Use headers, bullets, code blocks
- **Tested** - Code examples should actually work
- **Updated** - Fix outdated docs when you notice them
- **Concise** - Respect the reader's time

Bad documentation:
- Walls of text with no structure
- Outdated information
- Vague advice ("make it better")
- No code examples
- Too theoretical, not practical

---

## 📝 Contributing to Docs

When adding documentation:

1. **Check if it exists** - Don't duplicate
2. **Choose the right place** - See structure above
3. **Use clear examples** - Show, don't just tell
4. **Test your examples** - Make sure they work
5. **Keep it updated** - Update docs when code changes

---

**Remember: Good documentation saves hours of debugging.**

