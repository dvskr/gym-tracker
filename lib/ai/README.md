# AI Services Directory

## Overview

This directory contains both **real AI services** (using OpenAI API) and **smart algorithm services** (rule-based, no API calls).

**Important:** Most features labeled "AI" in this app are actually **rule-based algorithms** that don't use OpenAI. Only the AI Coach Chat uses real AI.

---

## 🤖 Real AI Services (Use OpenAI API)

### `aiService.ts` - Core OpenAI API Client
- **What it does:** Handles all OpenAI API calls
- **Used by:** AI Coach Chat only (`app/coach.tsx`)
- **Cost:** ~$0.01-0.05 per message depending on context length
- **Methods:**
  - `complete(messages, options)` - Main completion method
  - `checkLimits()` - Check usage limits
  - `getUsageStats()` - Get current month stats

### `coachService.ts` (if exists)
- **What it does:** Business logic for AI Coach chat
- **Cost:** Uses `aiService.complete()` - see above

---

## 📊 Smart Algorithm Services (NO AI - Rule-Based)

These are named "AI" historically but use **pure calculations, database queries, and statistical analysis**. They don't call OpenAI and cost $0.

### `recoveryService.ts` - Muscle Recovery Calculations
- **What it does:** Tracks muscle recovery based on workout timestamps
- **How it works:**
  - Queries recent workouts from database
  - Calculates days since each muscle group was trained
  - Compares against optimal recovery times (24-72 hours)
  - Returns recovery percentage per muscle
- **Used by:** `RecoveryStatus` component on home screen
- **Cost:** $0 (database queries only)

### `plateauDetection.ts` - Training Stagnation Analysis
- **What it does:** Detects when you stop making progress
- **How it works:**
  - Analyzes volume (weight × reps) over 3+ weeks
  - Flags exercises with no improvement
  - Generates rule-based suggestions (deload, change rep range, etc.)
- **Used by:** `PlateauAlerts` component on home screen
- **Cost:** $0 (statistical analysis only)

### `progressiveOverload.ts` - Weight/Rep Recommendations
- **What it does:** Suggests weight and reps for your next set
- **How it works:**
  - Analyzes last 10 sessions of an exercise
  - If hitting target reps 2+ times → increase weight
  - If not → increase reps or maintain
  - Adjusts for fatigue (later sets get lower recommendations)
- **Used by:** `WeightRecommendation` component during workout
- **Cost:** $0 (mathematical formulas only)

### `exerciseSuggestions.ts` - Exercise History Queries
- **What it does:** Suggests exercises based on your history
- **How it works:**
  - Queries your last 60 days of workouts
  - Finds exercises you've done for target muscles
  - Returns with average weights used
  - Falls back to exercise library if no history
- **Used by:** `WorkoutSuggestion` component
- **Cost:** $0 (database queries only)

### `workoutSuggestions.ts` - Workout Plan Generation (HYBRID)
- **What it does:** Generates complete workout plans
- **How it works:**
  1. **Tries AI first** - Calls OpenAI for personalized plan
  2. **Falls back to rule-based** - Uses recovery + exercise history
  3. Validates all suggestions (equipment, injuries, exercise existence)
  4. Caches for 4 hours
- **Used by:** Prefetch service (but UI component doesn't use it directly)
- **Cost:** 
  - AI path: ~$0.01-0.02 per suggestion (usually cached)
  - Fallback path: $0
- **Note:** The `WorkoutSuggestion` component on the Workout tab uses `recoveryService` + `exerciseSuggestions` directly, not this service, so AI is rarely triggered.

---

## 🔧 Supporting Services

### `contextBuilder.ts` - User Context for AI
- **What it does:** Gathers user data to send to AI
- **Cost:** $0 (data aggregation)

### `prompts.ts` - AI Prompts
- **What it does:** System prompts for AI Coach
- **Cost:** $0 (just text templates)

### `validation.ts` - Response Validation
- **What it does:** Validates AI responses, filters invalid exercises
- **Cost:** $0 (validation logic)

### `prefetch.ts` - Cache Management
- **What it does:** Prefetches and caches data after login
- **Cost:** Depends on what's prefetched (mostly $0 algorithms)

### `analytics.ts` - AI Quality Monitoring
- **What it does:** Tracks AI response quality
- **Cost:** $0 (logging only)

---

## 💰 Cost Summary

| Feature | Service | Real AI? | Cost per Use |
|---------|---------|----------|--------------|
| **AI Coach Chat** | `aiService.ts` | ✅ YES | ~$0.01-0.05 |
| Recovery Status | `recoveryService.ts` | ❌ No | $0 |
| Plateau Detection | `plateauDetection.ts` | ❌ No | $0 |
| Weight Recommendations | `progressiveOverload.ts` | ❌ No | $0 |
| Workout Suggestions (UI) | `exerciseSuggestions.ts` | ❌ No | $0 |
| Workout Suggestions (Prefetch) | `workoutSuggestions.ts` | ⚠️ Hybrid | $0.01 if AI, $0 if fallback |

**Monthly AI Cost:** Depends entirely on AI Coach usage. If you use the coach 20 times/month, expect ~$0.50-1.00.

---

## 🎯 Where Is Real AI Actually Used?

**In the UI:**
1. **AI Coach Chat** (`app/coach.tsx`) - Only place that calls `aiService.complete()`

**Behind the scenes:**
2. **Workout Suggestion Prefetch** - Tries AI but almost always falls back to algorithms

**Not used anywhere:**
- `workoutAnalysisService` - Dead code, component was removed

---

## 🔍 For Developers

### To add a new AI feature:
```typescript
import { aiService } from '@/lib/ai/aiService';

const response = await aiService.complete([
  { role: 'system', content: 'You are a fitness coach' },
  { role: 'user', content: 'What should I do today?' }
], {
  temperature: 0.7,
  maxTokens: 500,
  requestType: 'my_feature' // for tracking
});
```

### To add a new algorithm feature:
Just add it to this directory and **don't** call `aiService`. It will be $0.

### To check if a feature uses real AI:
```bash
# Search for aiService calls
grep -r "aiService\." --include="*.ts" --include="*.tsx" .

# Should only show:
# - app/coach.tsx (AI Coach)
# - lib/ai/workoutSuggestions.ts (hybrid, rarely triggers)
# - lib/ai/helpers.ts (helper functions for coach)
```

---

## 📝 Naming Clarification

The directory is called `/ai` because:
1. It started as an AI-first feature set
2. Some services are AI-capable (even if rarely used)
3. It groups "smart" features together

But be aware: **most services here are NOT AI** - they're smart algorithms that are free and always available.
