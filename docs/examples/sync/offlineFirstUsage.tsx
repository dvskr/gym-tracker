/**
 * Offline-First Architecture - Usage Examples
 * 
 * This file demonstrates how to use the offline-first system in your app.
 */

import { useOfflineFirst } from '@/hooks/useOfflineFirst';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { localDB } from '@/lib/storage/localDatabase';
import { syncQueue } from '@/lib/sync/syncQueue';
import { supabase } from '@/lib/supabase';

// ============================================================================
// EXAMPLE 1: Using useOfflineFirst hook for workouts
// ============================================================================

export function WorkoutsScreen() {
  const { user } = useAuthStore();

  // Offline-first hook automatically:
  // 1. Loads local data immediately (instant UI)
  // 2. Fetches from cloud in background if online
  // 3. Merges and updates local cache
  const {
    data: workouts,
    isLoading,
    isOnline,
    refresh,
    addItem,
    updateItem,
    deleteItem,
  } = useOfflineFirst(
    '@gym/workouts',
    async () => {
      // Fetch from Supabase
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user?.id)
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    {
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnMount: true,
      refetchOnReconnect: true,
    }
  );

  // Create workout (writes local first, syncs later)
  const handleCreateWorkout = async () => {
    const newWorkout = {
      id: crypto.randomUUID(),
      user_id: user?.id,
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    // This writes to local storage immediately (instant)
    // Then queues for background sync
    await addItem(newWorkout);
  };

  return (
    <View>
      {!isOnline && <OfflineBanner />}
      {isLoading ? <Loader /> : <WorkoutList workouts={workouts} />}
    </View>
  );
}

// ============================================================================
// EXAMPLE 2: Manual local database usage
// ============================================================================

export async function saveWorkoutOffline(workout: LocalWorkout) {
  // Write to local database first (instant)
  await localDB.saveWorkoutLocally(workout);
  
  // Background sync will handle uploading to Supabase
  // No need to wait for network!
}

export async function getWorkoutsOffline() {
  // Always instant - no network wait
  return await localDB.getLocalWorkouts();
}

// ============================================================================
// EXAMPLE 3: Network status monitoring
// ============================================================================

export function MyComponent() {
  const { isOnline, connectionType, isWifi } = useNetworkStatus();

  return (
    <View>
      <Text>Status: {isOnline ? '= Online' : '=4 Offline'}</Text>
      <Text>Connection: {connectionType}</Text>
      {!isWifi && <Text> Not on WiFi - large uploads will use data</Text>}
    </View>
  );
}

// ============================================================================
// EXAMPLE 4: Starting auto-sync in App root
// ============================================================================

export function AppRoot() {
  useEffect(() => {
    // Start automatic background sync (every 30 seconds)
    syncQueue.startAutoSync(30000);

    return () => {
      syncQueue.stopAutoSync();
    };
  }, []);

  return <YourApp />;
}

// ============================================================================
// EXAMPLE 5: Manual sync trigger
// ============================================================================

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncQueue.syncAll();
      Alert.alert(
        'Sync Complete',
        `✅ ${result.synced} synced\n❌ ${result.failed} failed`
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <TouchableOpacity onPress={handleSync} disabled={syncing}>
      <Text>{syncing ? 'Syncing...' : 'Sync Now'}</Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// EXAMPLE 6: Sync queue status
// ============================================================================

export function SyncStatus() {
  const [status, setStatus] = useState({ queueLength: 0, isSyncing: false });

  useEffect(() => {
    const checkStatus = async () => {
      const s = await syncQueue.getStatus();
      setStatus(s);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  if (status.queueLength === 0) {
    return <Text>✅ All synced</Text>;
  }

  return (
    <View>
      <Text>⏳ {status.queueLength} pending</Text>
      {status.isSyncing && <ActivityIndicator />}
    </View>
  );
}

// ============================================================================
// EXAMPLE 7: Templates with offline-first
// ============================================================================

export function useTemplatesOffline() {
  return useOfflineFirst(
    '@gym/templates',
    async () => {
      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  );
}

// ============================================================================
// EXAMPLE 8: Body weight log with offline-first
// ============================================================================

export function useWeightLogOffline() {
  return useOfflineFirst(
    '@gym/weight_log',
    async () => {
      const { data, error } = await supabase
        .from('body_weight_log')
        .select('*')
        .order('logged_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  );
}

// ============================================================================
// EXAMPLE 9: Exercises caching (read-only, rarely changes)
// ============================================================================

export async function loadExercises() {
  // Check cache first
  const cached = await localDB.getCachedExercises();
  const cacheAge = await localDB.getExercisesCacheAge();

  // Use cache if less than 1 hour old
  if (cached.length > 0 && cacheAge && cacheAge < 60 * 60 * 1000) {
    return cached;
  }

  // Fetch fresh and cache
  try {
    const { data } = await supabase.from('exercises').select('*');
    if (data) {
      await localDB.cacheExercises(data);
      return data;
    }
  } catch (error) {
    // If fetch fails, return cached (even if stale)
    return cached;
  }

  return cached;
}

// ============================================================================
// EXAMPLE 10: Offline banner component
// ============================================================================

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const [status, setStatus] = useState({ queueLength: 0 });

  useEffect(() => {
    if (!isOnline) {
      syncQueue.getStatus().then(setStatus);
    }
  }, [isOnline]);

  if (isOnline) return null;

  return (
    <View style={styles.offlineBanner}>
      <Text style={styles.offlineText}>
        = Offline Mode
        {status.queueLength > 0 && ` • ${status.queueLength} pending sync`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    backgroundColor: '#f59e0b',
    padding: 8,
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

// ============================================================================
// Key Principles:
// ============================================================================
// 
// 1. ✅ WRITE LOCAL FIRST - Never wait for network
// 2. ✅ READ LOCAL FIRST - Instant UI, sync in background
// 3. ✅ QUEUE CHANGES - Auto-sync when online
// 4. ✅ MERGE INTELLIGENTLY - Cloud is source of truth for synced data
// 5. ✅ HANDLE CONFLICTS - Last write wins (can be improved)
// 6. ✅ SHOW STATUS - Let users know what's happening
// 7. ✅ GRACEFUL DEGRADATION - Full features offline
// 
// ============================================================================
