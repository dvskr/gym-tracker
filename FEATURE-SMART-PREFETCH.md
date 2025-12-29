# Feature: Smart Pre-loading for AI Data

**Date:** December 28, 2024  
**Status:** ✅ Implemented

---

## 🎯 Overview

Implemented a smart pre-loading system that fetches AI data in the background immediately after user authentication. This dramatically improves perceived performance by showing cached data instantly while fresh data loads in the background.

---

## ✨ Key Features

### 1. **Background Pre-fetching**
- Fetches all AI data in parallel after sign-in
- Non-blocking - doesn't delay UI rendering
- Graceful degradation on failures

### 2. **In-Memory Cache**
- Fast Map-based storage
- Configurable cache durations per data type
- Automatic expiration handling

### 3. **Instant UI Loading**
- Components check cache first
- Zero loading spinner if cached
- Seamless user experience

### 4. **Smart Invalidation**
- Cache cleared after workout completion
- Optional background re-fetch
- Prevents stale data

---

## 📊 Cache Strategy

| Data Type | Cache Duration | Reason |
|-----------|---------------|--------|
| **Workout Suggestion** | 4 hours | Plans don't change rapidly |
| **Recovery Status** | 30 minutes | Needs frequent updates |
| **Plateau Alerts** | 24 hours | Slow-changing analysis |
| **Form Tips** | Forever | Static instructional content |

---

## 🏗️ Architecture

### File Structure

```
lib/ai/
├── prefetch.ts              ✅ NEW - Cache manager
└── index.ts                 ✅ Updated - Export prefetch functions

hooks/
└── usePrefetchAI.ts         ✅ NEW - Prefetch hook

app/
└── _layout.tsx              ✅ Updated - Trigger prefetch on auth

components/ai/
├── WorkoutSuggestion.tsx    ✅ Updated - Use prefetch cache
├── RecoveryStatus.tsx       ✅ Updated - Use prefetch cache
└── PlateauAlerts.tsx        ✅ Updated - Use prefetch cache

app/workout/
└── complete.tsx             ✅ Updated - Invalidate cache on save
```

---

## 🔄 Data Flow

### **1. User Signs In**

```
User Authentication
       ↓
usePrefetchAI hook triggers
       ↓
prefetchAIData(userId)
       ↓
Parallel fetch:
  - recoveryService.getRecoveryStatus(userId)
  - plateauDetectionService.detectPlateaus(userId)
  - workoutSuggestionService.getSuggestion(userId)
       ↓
Cache successful results:
  setCacheData(userId, 'recovery', data)
  setCacheData(userId, 'plateaus', data)
  setCacheData(userId, 'suggestion', data)
```

**Console Output:**
```
[AI Prefetch] Starting for user: 1234abcd...
[AI Cache] recovery stored
[AI Cache] plateaus stored
[AI Cache] suggestion stored
[AI Prefetch] ✓ recovery cached
[AI Prefetch] ✓ plateaus cached
[AI Prefetch] ✓ suggestion cached
[AI Prefetch] Complete: 3/3 succeeded in 1245ms
```

---

### **2. User Opens Home Screen**

```
Component Mounts
       ↓
useState(() => getCachedData(userId, 'recovery'))
       ↓
Cache Hit? 
  YES → Show data instantly (0ms)
  NO  → Fetch fresh data
```

**Console Output (Cache Hit):**
```
[AI Cache] ✓ recovery hit (age: 45s)
```

**Console Output (Cache Miss):**
```
[AI Cache] recovery expired (age: 1805s)
```

---

### **3. User Completes Workout**

```
handleSaveWorkout()
       ↓
Save workout to database
       ↓
invalidateCache(userId)
       ↓
prefetchAIData(userId)  [optional, background]
       ↓
Navigate to home
       ↓
Components fetch fresh data
```

**Console Output:**
```
[WorkoutComplete] Invalidating AI cache
[AI Cache] Invalidated 3 entries for user
[AI Prefetch] Starting for user: 1234abcd...
```

---

## 💻 Code Implementation

### **Core Prefetch Manager** (`lib/ai/prefetch.ts`)

```typescript
// In-memory cache
const prefetchCache = new Map<string, CacheEntry<any>>();

// Cache durations
export const CACHE_DURATIONS = {
  recovery: 30 * 60 * 1000,      // 30 minutes
  plateaus: 24 * 60 * 60 * 1000, // 24 hours
  suggestion: 4 * 60 * 60 * 1000, // 4 hours
  formTips: Infinity,             // Forever
};

// Pre-fetch all AI data
export async function prefetchAIData(userId: string): Promise<void> {
  const results = await Promise.allSettled([
    recoveryService.getRecoveryStatus(userId),
    plateauDetectionService.detectPlateaus(userId),
    workoutSuggestionService.getSuggestion(userId),
  ]);
  
  // Cache successful results
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      setCacheData(userId, keys[index], result.value);
    }
  });
}

// Get cached data with expiration check
export function getCachedData<T>(
  userId: string, 
  key: string
): T | null {
  const cached = prefetchCache.get(`${userId}:${key}`);
  if (!cached) return null;
  
  const age = Date.now() - cached.timestamp;
  const maxAge = CACHE_DURATIONS[key] || 60000;
  
  if (age > maxAge) {
    prefetchCache.delete(`${userId}:${key}`);
    return null;
  }
  
  return cached.data as T;
}
```

---

### **Prefetch Hook** (`hooks/usePrefetchAI.ts`)

```typescript
export function usePrefetchAI() {
  const { user } = useAuthStore();
  
  useEffect(() => {
    if (user?.id) {
      prefetchAIData(user.id).catch((error) => {
        console.warn('[usePrefetchAI] Failed:', error);
      });
    }
  }, [user?.id]);
}
```

**Usage in `app/_layout.tsx`:**
```typescript
export default function RootLayout() {
  usePrefetchAI();  // ← Add this line
  
  return (
    // ... layout
  );
}
```

---

### **Component Integration** (Example: `RecoveryStatus.tsx`)

```typescript
export function RecoveryStatus() {
  const { user } = useAuthStore();
  
  // 🚀 Try cache first - INSTANT if cached
  const [status, setStatus] = useState<RecoveryStatusType | null>(() => {
    if (!user) return null;
    return getCachedData<RecoveryStatusType>(user.id, 'recovery');
  });
  
  // Only show loading if no cached data
  const [isLoading, setIsLoading] = useState(!status);
  
  const fetchStatus = useCallback(async (forceRefresh = false) => {
    // ... fetch logic
    const result = await recoveryService.getRecoveryStatus(user.id);
    setStatus(result);
    
    // 💾 Cache the result
    setCacheData(user.id, 'recovery', result);
  }, [user]);
  
  useEffect(() => {
    // Only fetch if we don't have cached data
    if (user && !status) {
      fetchStatus();
    }
  }, [user, status, fetchSuggestion]);
  
  // ... render
}
```

---

### **Cache Invalidation** (`app/workout/complete.tsx`)

```typescript
const handleSaveWorkout = async () => {
  // ... save workout
  
  // ❌ Invalidate cache
  if (user?.id) {
    invalidateCache(user.id);
    
    // 🔄 Optional: Pre-fetch fresh data in background
    prefetchAIData(user.id).catch(console.warn);
  }
  
  router.replace('/(tabs)');
};
```

---

## 📈 Performance Impact

### **Before Pre-loading:**

```
User opens home screen
       ↓
RecoveryStatus mounts
       ↓
Shows loading spinner (⏳ 500-2000ms)
       ↓
Fetches data from API
       ↓
Shows content
```

**User Experience:** Sees 3 loading spinners (one per AI component)

---

### **After Pre-loading:**

```
User opens home screen
       ↓
RecoveryStatus mounts
       ↓
Reads from cache (⚡ 0-1ms)
       ↓
Shows content INSTANTLY
```

**User Experience:** Content appears immediately

---

## 🎯 Benefits

### **Performance**
- ⚡ **Instant Loading:** 0ms vs 500-2000ms
- 🚀 **Parallel Fetching:** All data fetched simultaneously
- 💾 **Reduced API Calls:** Cache reused across navigations

### **User Experience**
- ✅ No loading spinners on navigation
- ✅ App feels faster and more responsive
- ✅ Smooth transitions between screens

### **Cost Efficiency**
- 💰 Fewer AI API calls
- 💰 Reduced Supabase database queries
- 💰 Lower bandwidth usage

### **Reliability**
- 🛡️ Graceful degradation on network issues
- 🛡️ Stale data better than no data
- 🛡️ Non-blocking failures

---

## 🧪 Testing

### **Test 1: Initial Pre-fetch**

```
1. Clear app data
2. Sign in
3. Check console logs
4. Verify:
   - "[AI Prefetch] Starting..." log
   - "✓ recovery cached" log
   - "✓ plateaus cached" log
   - "✓ suggestion cached" log
   - "Complete: 3/3 succeeded" log
```

---

### **Test 2: Cache Hit**

```
1. Sign in (triggers prefetch)
2. Navigate to home screen
3. Check console logs
4. Verify:
   - "✓ recovery hit (age: XXs)" log
   - No loading spinner
   - Content shows immediately
```

---

### **Test 3: Cache Expiration**

```
1. Sign in
2. Wait 31 minutes (recovery cache expires)
3. Navigate to home screen
4. Verify:
   - "recovery expired (age: 1860s)" log
   - Loading spinner shows
   - Fresh data fetched
```

---

### **Test 4: Cache Invalidation**

```
1. Complete a workout
2. Check console logs
3. Verify:
   - "[WorkoutComplete] Invalidating AI cache" log
   - "Invalidated 3 entries for user" log
4. Navigate to home
5. Verify:
   - Fresh data fetched (not cached)
```

---

### **Test 5: Offline Behavior**

```
1. Sign in (triggers prefetch)
2. Turn off network
3. Navigate to home screen
4. Verify:
   - Cached data still shows
   - No errors
5. Turn on network
6. Tap refresh
7. Verify:
   - Fresh data fetched successfully
```

---

## 🐛 Debugging

### **View Cache Contents**

```typescript
import { getCacheStats } from '@/lib/ai/prefetch';

// In console or dev menu
const stats = getCacheStats();
console.log('Total entries:', stats.totalEntries);
console.log('Entries:', stats.entries);
```

**Output:**
```javascript
Total entries: 3
Entries: [
  { key: "abc123:recovery", age: 45231 },
  { key: "abc123:plateaus", age: 45234 },
  { key: "abc123:suggestion", age: 45237 }
]
```

---

### **Clear All Cache**

```typescript
import { clearAllCache } from '@/lib/ai/prefetch';

clearAllCache();
// Output: [AI Cache] Cleared all 3 entries
```

---

### **Check if Cached**

```typescript
import { isCached } from '@/lib/ai/prefetch';

console.log('Recovery cached?', isCached(userId, 'recovery'));
// Output: Recovery cached? true
```

---

### **Invalidate Specific Key**

```typescript
import { invalidateCacheKey } from '@/lib/ai/prefetch';

invalidateCacheKey(userId, 'recovery');
// Output: [AI Cache] Invalidated: recovery
```

---

## 🔧 Configuration

### **Adjust Cache Durations**

Edit `lib/ai/prefetch.ts`:

```typescript
export const CACHE_DURATIONS = {
  recovery: 15 * 60 * 1000,      // 15 min (shorter)
  plateaus: 48 * 60 * 60 * 1000, // 48 hr (longer)
  suggestion: 2 * 60 * 60 * 1000, // 2 hr (shorter)
  formTips: Infinity,
};
```

---

### **Add New Data Type**

1. **Add to `CACHE_DURATIONS`:**
```typescript
export const CACHE_DURATIONS = {
  // ... existing
  exerciseHistory: 12 * 60 * 60 * 1000, // 12 hours
};
```

2. **Add to `prefetchAIData`:**
```typescript
const results = await Promise.allSettled([
  // ... existing
  getExerciseHistory(userId),
]);
```

3. **Use in component:**
```typescript
const [history, setHistory] = useState(() => {
  return getCachedData(userId, 'exerciseHistory');
});
```

---

### **Disable Pre-fetch (Debug)**

Comment out in `app/_layout.tsx`:

```typescript
export default function RootLayout() {
  // usePrefetchAI();  // ← Disabled
  
  return (
    // ... layout
  );
}
```

---

## 🚨 Troubleshooting

### **Problem: Cache not working**

**Symptoms:** Data still loads slowly

**Solution:**
1. Check console for prefetch logs
2. Verify `usePrefetchAI()` is called in `_layout.tsx`
3. Ensure user is authenticated when prefetch runs

---

### **Problem: Stale data showing**

**Symptoms:** Old data persists after workout

**Solution:**
1. Check `invalidateCache` is called in workout save
2. Verify console logs show "Invalidated X entries"
3. Try refreshing manually (refresh button)

---

### **Problem: Prefetch failing**

**Symptoms:** Console shows "❌ X failed"

**Solution:**
1. Check network connection
2. Verify AI services are configured
3. Check if rate limits reached
4. App continues to work (graceful degradation)

---

## 📊 Monitoring

### **Key Metrics to Track**

1. **Cache Hit Rate:**
   - Count of cache hits vs misses
   - Target: >80% hit rate

2. **Prefetch Success Rate:**
   - How often all 3 services succeed
   - Target: >95% success rate

3. **Time to Content:**
   - Time from mount to content shown
   - Target: <50ms with cache, <2s without

4. **Cache Invalidation Frequency:**
   - How often cache is cleared
   - Should match workout completion rate

---

## 🎓 Best Practices

### **DO:**

✅ Use prefetch for frequently accessed data  
✅ Set appropriate cache durations for each data type  
✅ Invalidate cache when underlying data changes  
✅ Handle cache misses gracefully  
✅ Log prefetch/cache events for debugging  

### **DON'T:**

❌ Cache user-specific sensitive data insecurely  
❌ Set cache durations too long (stale data risk)  
❌ Block UI waiting for prefetch  
❌ Throw errors on prefetch failures  
❌ Prefetch data that's rarely used  

---

## 🔮 Future Enhancements

### **1. Persistent Cache (AsyncStorage)**
- Survive app restarts
- Hybrid memory + disk cache
- Longer-lived data

### **2. Background Sync**
- Refresh cache when app comes to foreground
- Periodic background updates
- Push notifications trigger refresh

### **3. Smart Invalidation**
- Track data dependencies
- Selective invalidation (only affected data)
- Timestamp-based invalidation

### **4. Cache Warming**
- Predictive prefetching
- Preload next likely screens
- Machine learning patterns

### **5. Cache Metrics Dashboard**
- Hit/miss rates
- Staleness indicators
- Memory usage
- Performance impact

---

## 📝 Summary

The smart pre-loading system provides:

- ⚡ **Instant UI** - 0ms load time from cache
- 🚀 **Parallel Fetching** - All data loaded simultaneously
- 💾 **Smart Caching** - Configurable expiration per data type
- 🔄 **Auto-Invalidation** - Fresh data after workouts
- 🛡️ **Graceful Degradation** - Non-blocking failures
- 🐛 **Debug Tools** - Console logs and cache inspection

Users experience a dramatically faster app with instant content loading on navigation!

---

**End of Feature Documentation**

