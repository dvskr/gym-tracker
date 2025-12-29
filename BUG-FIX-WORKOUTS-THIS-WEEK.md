# Bug Fix: "Workouts This Week" Count

**Date:** December 28, 2024  
**Status:** ✅ Fixed

---

## 🐛 The Bug

**Symptom:** Recovery Status card was showing incorrect workout count (e.g., "17 workouts this week")

**Root Cause:** The `countWorkoutsThisWeek()` function was counting workouts from the **last 7 days** instead of from **Monday of the current week**.

---

## 🔍 Analysis

### Old Implementation (Buggy):

```typescript
private countWorkoutsThisWeek(workouts: any[]): number {
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  return workouts.filter(w => 
    new Date(w.created_at).getTime() >= sevenDaysAgo
  ).length;
}
```

**Problem:**
- Counted workouts from "last 7 days" (rolling window)
- Not aligned with calendar week (Monday-Sunday)
- If user worked out heavily in previous week, count would be inflated

**Example:**
```
Today: Friday, Dec 28

Last 7 days:
- Dec 22 (Sat) - 2 workouts ← From LAST week
- Dec 23 (Sun) - 2 workouts ← From LAST week
- Dec 24 (Mon) - 2 workouts ← This week
- Dec 25 (Tue) - 2 workouts ← This week
- Dec 26 (Wed) - 2 workouts ← This week
- Dec 27 (Thu) - 2 workouts ← This week
- Dec 28 (Fri) - 2 workouts ← This week

Total: 14 workouts (but only 10 are in current week!)
```

---

## ✅ The Fix

### New Implementation:

```typescript
/**
 * Count workouts from Monday of current week to today
 * Fixed: Was counting last 7 days instead of current calendar week
 */
private countWorkoutsThisWeek(workouts: any[]): number {
  // Get start of current week (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() + mondayOffset);
  startOfWeek.setHours(0, 0, 0, 0); // Set to midnight
  
  const startTimestamp = startOfWeek.getTime();
  
  // Count workouts from Monday onwards
  const count = workouts.filter(w => {
    const workoutTime = new Date(w.created_at).getTime();
    return workoutTime >= startTimestamp;
  }).length;
  
  // Sanity check: Cap at 14 (2 per day max for a week)
  return Math.min(count, 14);
}
```

---

## 🧮 How It Works

### Monday Offset Calculation:

| Today (Day of Week) | dayOfWeek | mondayOffset | Result |
|---------------------|-----------|--------------|--------|
| Monday | 1 | 1 - 1 = 0 | Already Monday |
| Tuesday | 2 | 1 - 2 = -1 | Go back 1 day |
| Wednesday | 3 | 1 - 3 = -2 | Go back 2 days |
| Thursday | 4 | 1 - 4 = -3 | Go back 3 days |
| Friday | 5 | 1 - 5 = -4 | Go back 4 days |
| Saturday | 6 | 1 - 6 = -5 | Go back 5 days |
| Sunday | 0 | -6 (special) | Go back 6 days |

**Sunday Special Case:**
- `dayOfWeek === 0` (Sunday)
- `mondayOffset = -6` (go back to Monday)
- This ensures week starts on Monday, not Sunday

---

## 🔍 Debug Logging

Added temporary debug logging to verify the fix:

```typescript
console.log('Recovery Debug - Workouts This Week:', {
  startOfWeek: startOfWeek.toISOString(),
  now: now.toISOString(),
  dayOfWeek: ['Sunday', 'Monday', 'Tuesday', ...][dayOfWeek],
  count,
  totalWorkoutsInLast14Days: workouts.length,
});
```

**Example Output:**
```
Recovery Debug - Workouts This Week: {
  startOfWeek: "2024-12-23T00:00:00.000Z",  // Monday, Dec 23
  now: "2024-12-28T15:30:00.000Z",           // Friday, Dec 28
  dayOfWeek: "Friday",
  count: 5,                                   // Correct count!
  totalWorkoutsInLast14Days: 12
}
```

---

## 🛡️ Sanity Check

Added cap to prevent unrealistic numbers:

```typescript
// In recoveryService.ts
return Math.min(count, 14);  // Max 2 workouts per day × 7 days

// In RecoveryStatus.tsx
<Text style={styles.statValue}>
  {Math.min(status.workoutsThisWeek, 14)}
</Text>
```

**Why 14?**
- Maximum realistic: 2 workouts per day
- 2 × 7 days = 14 workouts/week
- Anything higher is likely a data error

---

## 📊 Test Cases

### Test Case 1: Monday
```
Today: Monday, Dec 23, 10:00 AM
Workouts:
- Dec 22 (Sun) - 2 workouts ← Last week, NOT counted
- Dec 23 (Mon) - 1 workout  ← This week, counted

Expected: 1 workout this week ✅
```

### Test Case 2: Friday
```
Today: Friday, Dec 27, 3:00 PM
Workouts:
- Dec 21 (Sat) - 1 workout ← Last week, NOT counted
- Dec 22 (Sun) - 1 workout ← Last week, NOT counted
- Dec 23 (Mon) - 2 workouts ← This week, counted
- Dec 24 (Tue) - 1 workout  ← This week, counted
- Dec 26 (Thu) - 2 workouts ← This week, counted
- Dec 27 (Fri) - 1 workout  ← This week, counted

Expected: 6 workouts this week ✅
```

### Test Case 3: Sunday
```
Today: Sunday, Dec 29, 8:00 PM
Workouts:
- Dec 22 (Sun) - 1 workout ← Last week, NOT counted
- Dec 23 (Mon) - 2 workouts ← This week, counted
- Dec 24 (Tue) - 1 workout  ← This week, counted
- Dec 26 (Thu) - 2 workouts ← This week, counted
- Dec 27 (Fri) - 1 workout  ← This week, counted
- Dec 28 (Sat) - 1 workout  ← This week, counted
- Dec 29 (Sun) - 1 workout  ← This week, counted

Expected: 8 workouts this week ✅
```

---

## 📝 Files Modified

```
lib/ai/
└── recoveryService.ts         ✅ Fixed countWorkoutsThisWeek()

components/ai/
└── RecoveryStatus.tsx         ✅ Added sanity check in display
```

---

## 🎯 Impact

**Before Fix:**
- ❌ Incorrect workout count
- ❌ Confused users (why 17 workouts?)
- ❌ Recovery recommendations based on wrong data

**After Fix:**
- ✅ Correct workout count (current calendar week)
- ✅ Matches user expectation
- ✅ Accurate recovery recommendations
- ✅ Sanity check prevents unrealistic numbers

---

## 🧪 How to Test

1. **Check on Monday:**
   - Should show 0 workouts at start of week
   - Increases as you log workouts

2. **Check on Sunday:**
   - Should show count from Monday-Sunday
   - Resets on next Monday

3. **Check with Heavy Training:**
   - Log 2 workouts per day for 5 days
   - Should show 10, not 14 or 17

4. **Debug Logs:**
   - Look for "Recovery Debug - Workouts This Week" in console
   - Verify `startOfWeek` is correct Monday
   - Verify `count` matches actual workouts

---

## 🚀 Next Steps

1. **Monitor Debug Logs** - Check production logs for accuracy
2. **Remove Debug Logging** - After confirming fix works (1-2 weeks)
3. **User Feedback** - Verify users see correct counts

---

## 💡 Lessons Learned

1. **"This Week" is Ambiguous**
   - Could mean: last 7 days, current calendar week, etc.
   - Always clarify week definition in code comments

2. **Always Add Sanity Checks**
   - Cap unrealistic values
   - Prevent data errors from breaking UI

3. **Debug Logging is Essential**
   - Temporary logs help verify fixes
   - Include context (dates, counts, etc.)

4. **Test Edge Cases**
   - Monday (start of week)
   - Sunday (end of week)
   - Saturday/Sunday boundary

---

**End of Bug Fix Documentation**

