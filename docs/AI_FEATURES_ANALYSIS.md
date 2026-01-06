# AI Features Analysis - What Actually Uses OpenAI API

**Last Updated:** January 6, 2026

This document definitively identifies which "AI features" actually call the OpenAI API (costs money) versus which are rule-based algorithms (free).

---

## 🔍 **Summary**

| Feature | Type | OpenAI Cost |
|---------|------|-------------|
| AI Coach Chat | **CALLS API** ✅ | Yes - $0.03/request |
| Workout Suggestions | **CALLS API** ✅ (with fallback) | Yes - $0.03/request |
| Post-Workout Analysis | **CALLS API** ✅ (with fallback) | Yes - $0.03/request |
| Progressive Overload | **RULE-BASED** 🔧 | No - Pure math |
| Plateau Detection | **RULE-BASED** 🔧 | No - Pure algorithm |
| Recovery Status | **RULE-BASED** 🔧 | No - Time calculations |
| Form Tips | **DATABASE** 💾 | No - Pre-written content |

---

## ✅ **Features That CALL OpenAI API** (3 features)

### 1. **AI Coach Chat** 
**File:** `app/coach.tsx:266`

```typescript
const response = await aiService.complete(
  [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: textToSend },
  ],
  {
    temperature: 0.7,
    maxTokens: 500,
    requestType: 'chat',
  }
);
```

**Evidence:**
- Direct call to `aiService.complete()` 
- Passes conversation history to GPT-4o-mini
- Generates dynamic, contextual responses
- **Cost:** ~$0.03 per message

**When Called:**
- User sends message in AI Coach screen (`app/coach.tsx`)
- Every message = 1 API call

---

### 2. **Workout Suggestions**
**File:** `lib/ai/workoutSuggestions.ts:241`

```typescript
const response = await aiService.askWithContext(
  FITNESS_COACH_SYSTEM_PROMPT,
  prompt,
  { 
    temperature: 0.7, 
    maxTokens: 500,
    requestType: 'workout_suggestion',
  }
);
```

**Evidence:**
- Calls `aiService.askWithContext()` (line 241)
- Builds complex context with workout history, PRs, equipment
- Generates personalized workout suggestions
- **Has fallback:** If API fails, uses `getRuleBasedSuggestion()` (line 276)
- **Cost:** ~$0.03 per suggestion

**When Called:**
- Home screen loads (shows today's suggestion)
- User taps refresh button
- Component: `components/ai/WorkoutSuggestion.tsx`

**Fallback Logic:**
```typescript
// Line 276-324
private getRuleBasedSuggestion(recentWorkouts: LocalWorkout[]): ValidatedSuggestion {
  const muscleMap = this.analyzeRecentMuscles(recentWorkouts);
  // Uses muscle rotation algorithm
  // Recommends least-trained muscle group
}
```

---

### 3. **Post-Workout Analysis**
**File:** `lib/ai/workoutAnalysis.ts:238`

```typescript
const response = await aiService.askWithContext(
  FITNESS_COACH_SYSTEM_PROMPT,
  prompt,
  { temperature: 0.3, maxTokens: 500, requestType: 'analysis' }
);
```

**Evidence:**
- Calls `aiService.askWithContext()` (line 238)
- Analyzes completed workout with volume comparisons
- Generates encouraging feedback with specific numbers
- **Has fallback:** Uses `getRuleBasedAnalysis()` if API fails
- **Cost:** ~$0.03 per workout analyzed

**When Called:**
- Workout completion screen (`app/workout/complete.tsx`)
- Component: `components/ai/WorkoutAnalysis.tsx`

**Fallback Logic:**
```typescript
// Line 325+
private getRuleBasedAnalysis(...): WorkoutAnalysis {
  // Calculates volume differences
  // Generates templated feedback based on metrics
  // "Great workout! Volume increased by X%"
}
```

---

## 🔧 **Features That Are RULE-BASED** (3 features)

### 4. **Progressive Overload Recommendations**
**File:** `lib/ai/progressiveOverload.ts`

**Evidence - NO AI CALLS:**
```typescript
// Line 51: Uses pure calculation
return this.calculateRecommendation(history, setNumber, targetReps);

// Line 61-163: Mathematical algorithm
private calculateRecommendation(
  history: ExerciseHistory,
  setNumber: number,
  targetReps?: number
): SetRecommendation {
  // Gets last session data
  // Compares weight/reps
  // If hit target reps for 2+ sessions → increase weight
  // If didn't hit target → increase reps
  // Applies fatigue adjustment for later sets
  // Returns calculated recommendation
}
```

**Algorithm:**
1. Query last 10 sessions from database
2. Group sets by session/date
3. Find matching set number from previous session
4. **Logic:**
   - Hit target reps 2+ times? → Add 5-10 lbs (depends on current weight)
   - Didn't hit target? → Try to add 1-2 reps
   - Set 4+? → Reduce weight slightly for fatigue
5. Compare against PR to detect potential new record

**No API calls anywhere in this file!**

**Cost:** $0 (pure math)

---

### 5. **Plateau Detection**
**File:** `lib/ai/plateauDetection.ts`

**Evidence - NO AI CALLS:**
```typescript
// Line 32-55: Pure algorithm
async detectPlateaus(userId: string): Promise<PlateauAlert[]> {
  const exercises = await this.getExerciseProgress(userId);
  const plateaus: PlateauAlert[] = [];

  for (const exercise of exercises) {
    const plateau = this.analyzeExercise(exercise);  // Line 38
    if (plateau) plateaus.push(plateau);
  }
  return plateaus;
}

// Line 60-137: Stagnation detection algorithm
private analyzeExercise(exercise: ExerciseHistory): PlateauAlert | null {
  // Groups by week
  // Calculates max volume per week
  // Checks for 3+ weeks without improvement
  // Returns plateau alert if detected
}
```

**Algorithm:**
1. Fetch exercise history (last 12 weeks)
2. Group performances by week
3. Calculate max volume (weight × reps) per week
4. Check if latest 3+ weeks have no volume increase
5. Severity:
   - 3-4 weeks = "mild"
   - 4-6 weeks = "moderate"
   - 6+ weeks = "significant"
6. Generate static suggestions based on severity

**Pre-written suggestions (line 144-181):**
```typescript
private generateSuggestions(name: string, weeksStalled: number, currentWeight: number): string[] {
  const suggestions = [
    'Try a deload week (reduce weight by 20-30%)',
    'Increase training frequency for this exercise',
    'Add variation exercises (different angle/equipment)',
    // ... more static suggestions
  ];
}
```

**No API calls anywhere in this file!**

**Cost:** $0 (pure algorithm)

---

### 6. **Recovery Status**
**File:** `lib/ai/recoveryService.ts`

**Evidence - NO AI CALLS:**
```typescript
// Line 42-58: Hard-coded recovery times
private readonly RECOVERY_TIMES: Record<string, number> = {
  chest: 2,
  back: 2,
  shoulders: 2,
  biceps: 1.5,
  triceps: 1.5,
  quadriceps: 3,
  hamstrings: 3,
  glutes: 2.5,
  calves: 1,
  core: 1,
  // ...
};

// Line 65-100: Time-based calculation
async getRecoveryStatus(userId: string): Promise<RecoveryStatus> {
  const recentWorkouts = await this.getRecentWorkouts(userId, 14);
  const muscleStatus = this.calculateMuscleRecovery(recentWorkouts);
  // Pure math based on time since last workout
}
```

**Algorithm:**
1. Fetch workouts from last 14 days
2. For each muscle group:
   - Find last time it was trained
   - Calculate days since training
   - Compare to optimal recovery time (hard-coded)
3. Status:
   - `< 80% recovery` = "fatigued" (too soon)
   - `80-100%` = "recovering" (almost ready)
   - `100%+` = "fresh" (ready to train)
4. Suggest muscle groups that are 100% recovered

**Example calculation:**
```
Chest last trained: 2 days ago
Chest recovery time: 2 days
Status: 100% recovered → "ready"
```

**No API calls anywhere in this file!**

**Cost:** $0 (pure time calculation)

---

## 💾 **Features That Pull From DATABASE** (1 feature)

### 7. **Form Tips**
**File:** `hooks/useFormTips.ts:34`

```typescript
const { data, error: fetchError } = await supabase
  .from('form_tips')
  .select('*')
  .eq('exercise_id', exerciseId)
  .single();
```

**Evidence:**
- Direct database query (line 34-38)
- No AI processing
- Returns pre-written form tips from `form_tips` table

**Database Table Schema:**
```sql
CREATE TABLE form_tips (
  id UUID PRIMARY KEY,
  exercise_id UUID REFERENCES exercises(id),
  key_cues TEXT[],           -- ["Keep back straight", "Drive through heels"]
  common_mistakes TEXT[],    -- ["Rounding back", "Knees caving in"]
  breathing TEXT,            -- "Inhale down, exhale up"
  safety_tips TEXT[]         -- ["Use spotter", "Start light"]
);
```

**Content Source:**
- Pre-written by developers/fitness experts
- Stored in database during exercise seeding
- No AI generation

**Cost:** $0 (database query)

---

## 📊 **Cost Analysis**

### **Per-Request Costs:**
- AI Coach Chat: **$0.03/message**
- Workout Suggestions: **$0.03/suggestion** (or $0 if fallback)
- Post-Workout Analysis: **$0.03/analysis** (or $0 if fallback)
- All other features: **$0**

### **Free Tier Usage (10 requests/day):**
- **Scenario 1:** User chats 10 times = **$0.30/day** → 10 requests used
- **Scenario 2:** 1 suggestion + 1 analysis + 8 chat messages = **$0.30/day** → 10 requests used
- **Scenario 3:** 3 workouts analyzed + 7 chat messages = **$0.30/day** → 10 requests used

### **Premium Tier (100 requests/day):**
- Max cost: **$3.00/day** (if all 100 requests used)
- Typical: **$0.50-1.50/day** (15-50 requests)

### **Features That Don't Count Against Limit:**
- Progressive Overload recommendations: **FREE** (unlimited)
- Plateau detection: **FREE** (unlimited)
- Recovery status: **FREE** (unlimited)
- Form tips: **FREE** (unlimited)

---

## 🔍 **How to Verify**

### **Check if feature calls API:**
```bash
# Search for aiService calls in the file
grep -n "aiService\." lib/ai/feature-name.ts

# If found: CALLS API
# If not found: RULE-BASED or DATABASE
```

### **Trace API calls:**
1. Feature calls `aiService.complete()` or `aiService.askWithContext()`
2. → Goes to `lib/ai/aiService.ts:283`
3. → Checks rate limits `can_use_ai()` (line 294)
4. → Calls `supabase.functions.invoke('ai-complete')` (line 321)
5. → Edge function `supabase/functions/ai-complete/index.ts`
6. → Makes `fetch` to OpenAI API (Edge function line 120+)
7. → Logs usage to `ai_usage` table

### **Database Logging:**
Every API call creates a record:
```sql
SELECT * FROM ai_usage 
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC;

-- Shows:
-- request_type: 'chat' | 'workout_suggestion' | 'analysis'
-- tokens_used: 234
-- cost_cents: 3.5
-- created_at: timestamp
```

---

## 📝 **README Corrections Needed**

### ❌ **INACCURATE in README:**
The README currently lists "7 AI Features" implying all use AI.

### ✅ **ACCURATE Description:**
Should be:
- **3 AI-Powered Features** (use OpenAI API)
- **4 Smart Algorithms** (rule-based, no AI)

### **Suggested README Update:**

```markdown
## 🤖 AI & Smart Features

### **AI-Powered Features** (require OpenAI API)
1. **AI Coach Chat** - Real-time conversational coaching
2. **AI Workout Suggestions** - Personalized workout recommendations
3. **AI Post-Workout Analysis** - Detailed feedback on completed workouts

*Note: Free tier includes 10 AI requests/day. Falls back to rule-based algorithms if limit reached.*

### **Smart Algorithm Features** (no AI, always free)
4. **Progressive Overload** - Intelligent weight/rep recommendations based on your history
5. **Plateau Detection** - Algorithmic analysis of training stagnation
6. **Recovery Status** - Time-based muscle recovery calculations
7. **Form Tips** - Database of expert-curated exercise guidance

All smart features use sophisticated algorithms and your workout data to provide 
intelligent recommendations without requiring AI API calls.
```

---

## 🎯 **Key Takeaways**

1. **Only 3 features actually use AI:** Coach chat, suggestions, analysis
2. **4 features are smart algorithms:** Just as useful, but free
3. **All AI features have fallbacks:** Still work if limit reached
4. **Users get value even without AI:** Progressive overload, plateau detection, and recovery tracking don't need API calls

This is actually BETTER for users - they get intelligent features that work offline and don't count against their AI limit!

---

## 📚 **References**

- Main AI Service: `lib/ai/aiService.ts`
- Edge Function: `supabase/functions/ai-complete/index.ts`
- Rate Limiting: Database function `can_use_ai()`
- Usage Tracking: `ai_usage`, `ai_usage_daily` tables

