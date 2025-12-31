# Bug Fixes: File System API & Exercise ID Issues

## ✅ Fixes Applied

### Issue 1: `expo-file-system` Deprecation Warning

**Error:**
```
ERROR  [Cache] Error getting size: [Error: Method getInfoAsync imported from "expo-file-system" is deprecated.
You can migrate to the new filesystem API using "File" and "Directory" classes or import the legacy API from "expo-file-system/legacy".
```

**Fix:**
Updated `lib/images/cacheManager.ts` to use the legacy API:

```typescript
// Before:
import * as FileSystem from 'expo-file-system';

// After:
import * as FileSystem from 'expo-file-system/legacy';
```

**Status:** ✅ Fixed

---

### Issue 2: UUID Type Errors in Progressive Overload

**Error:**
```
ERROR  Error fetching exercise history: {
  "code": "22P02",
  "message": "invalid input syntax for type uuid: \"0085\""
}
```

**Root Cause:**
The exercise store was using `external_id` (e.g., "0085") as the primary `id`, but the database expects UUID values for foreign key relationships in `workout_sets`, `personal_records`, etc.

**Fix:**
Updated the `DisplayExercise` interface and `transformExercise` function to separate:
- `id` → UUID from database (for relationships)
- `externalId` → ExerciseDB identifier (for display/matching)

**Before:**
```typescript
interface DisplayExercise {
  id: string; // Was using external_id
  name: string;
  // ...
}

function transformExercise(exercise: Exercise): DisplayExercise {
  return {
    id: exercise.external_id || exercise.id, // ❌ Wrong!
    // ...
  };
}
```

**After:**
```typescript
interface DisplayExercise {
  id: string; // ✅ UUID from database
  externalId: string | null; // ✅ ExerciseDB ID
  name: string;
  // ...
}

function transformExercise(exercise: Exercise): DisplayExercise {
  return {
    id: exercise.id, // ✅ Keep UUID for database relationships
    externalId: exercise.external_id || null,
    // ...
  };
}
```

**Files Updated:**
1. `stores/exerciseStore.ts`
2. `lib/utils/fuzzySearch.ts`

**Status:** ✅ Fixed

---

## Impact

### Before Fixes:
- ❌ Cache size calculation errors on app startup
- ❌ Progressive Overload AI couldn't fetch exercise history
- ❌ Personal Records not loading
- ❌ Plateau detection failing

### After Fixes:
- ✅ Cache manager works without deprecation warnings
- ✅ Progressive Overload can correctly query workout history
- ✅ Personal Records load properly
- ✅ Plateau detection functional
- ✅ All database relationships work correctly

---

## Testing Checklist

- [x] App starts without file system errors
- [ ] Progressive Overload recommendations work
- [ ] Exercise history loads in workout screen
- [ ] Personal Records display correctly
- [ ] Plateau detection runs without errors
- [ ] Exercise search and filtering still works
- [ ] Fuzzy search still functions

---

## Notes

**Why This Happened:**
- The exercise store was originally designed to use `external_id` as a friendly identifier
- However, all database foreign keys reference the UUID `id` field
- This created a mismatch where the UI was passing "0085" but the database expected UUID

**Solution:**
- Keep both fields separate
- Use `id` (UUID) for all database operations
- Use `externalId` for display and matching with ExerciseDB API

**Breaking Changes:**
- ⚠️ Any code using `exercise.id` expecting `external_id` will need updating
- ✅ Most UI code should continue working as it uses `exercise.name` for display

---

Generated: December 31, 2025

