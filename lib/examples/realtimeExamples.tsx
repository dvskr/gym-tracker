import { logger } from '@/lib/utils/logger';
/**
 * Real-time Sync Usage Examples
 * 
 * Shows how to use the real-time subscription system in your components
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useRealtimeWorkouts, useRealtimeStatus, useConflictDetection } from '@/hooks/useRealtime';
import { realtimeSync } from '@/lib/sync/realtime';
import { eventEmitter, Events } from '@/lib/utils/eventEmitter';

// ============================================================================
// EXAMPLE 1: Initialize real-time on login
// ============================================================================

export function LoginScreen() {
  const handleLogin = async (email: string, password: string) => {
    // Sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (data.user) {
      // âœ… Initialize real-time subscriptions
      await realtimeSync.init(data.user.id);
      
      // Navigate to app
      router.replace('/(tabs)');
    }
  };

  return <View>{/* Login form */}</View>;
}

// ============================================================================
// EXAMPLE 2: Cleanup real-time on logout
// ============================================================================

export function ProfileScreen() {
  const handleLogout = async () => {
    // âœ… Cleanup real-time subscriptions
    await realtimeSync.cleanup();
    
    // Sign out
    await supabase.auth.signOut();
    
    // Navigate to login
    router.replace('/login');
  };

  return (
    <TouchableOpacity onPress={handleLogout}>
      <Text>Logout</Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// EXAMPLE 3: Auto-refresh workouts when updated
// ============================================================================

export function WorkoutsScreen() {
  const [workouts, setWorkouts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadWorkouts = async () => {
    // Load from local storage
    const data = await localDB.getLocalWorkouts();
    setWorkouts(data);
  };

  // Initial load
  useEffect(() => {
    loadWorkouts();
  }, []);

  // âœ… Auto-refresh when real-time update occurs
  useRealtimeWorkouts(() => {
    logger.log('ðŸ“¡ Workouts updated - refreshing...');
    loadWorkouts();
  });

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadWorkouts();
    setRefreshing(false);
  };

  return (
    <FlatList
      data={workouts}
      onRefresh={handleManualRefresh}
      refreshing={refreshing}
      renderItem={({ item }) => <WorkoutCard workout={item} />}
    />
  );
}

// ============================================================================
// EXAMPLE 4: Show real-time connection status
// ============================================================================

export function SyncStatusIndicator() {
  const { isConnected, subscriptionCount } = useRealtimeStatus();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: isConnected ? '#22c55e' : '#64748b',
          marginRight: 6,
        }}
      />
      <Text style={{ fontSize: 12, color: '#94a3b8' }}>
        {isConnected ? `Live (${subscriptionCount})` : 'Offline'}
      </Text>
    </View>
  );
}

// ============================================================================
// EXAMPLE 5: Listen for specific events
// ============================================================================

export function TemplatesScreen() {
  const [templates, setTemplates] = useState([]);

  const loadTemplates = async () => {
    const data = await localDB.getLocalTemplates();
    setTemplates(data);
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // âœ… Listen for template updates
  useRealtimeTemplates(() => {
    loadTemplates();
  });

  return <View>{/* Templates list */}</View>;
}

// ============================================================================
// EXAMPLE 6: Show toast on real-time updates
// ============================================================================

export function WorkoutsWithToast() {
  const [workouts, setWorkouts] = useState([]);

  useEffect(() => {
    loadWorkouts();
  }, []);

  // âœ… Show toast when workout added/updated/deleted
  useRealtimeWorkouts((payload) => {
    const { eventType, data } = payload;
    
    switch (eventType) {
      case 'INSERT':
        Toast.show({
          type: 'success',
          text1: 'New Workout',
          text2: 'A workout was added from another device',
        });
        break;
      case 'UPDATE':
        Toast.show({
          type: 'info',
          text1: 'Workout Updated',
          text2: `${data.name} was modified`,
        });
        break;
      case 'DELETE':
        Toast.show({
          type: 'info',
          text1: 'Workout Deleted',
          text2: 'A workout was removed',
        });
        break;
    }
    
    loadWorkouts();
  });

  const loadWorkouts = async () => {
    const data = await localDB.getLocalWorkouts();
    setWorkouts(data);
  };

  return <View>{/* Workouts list */}</View>;
}

// ============================================================================
// EXAMPLE 7: Monitor conflicts
// ============================================================================

export function ConflictMonitor() {
  const { conflictCount, latestConflict } = useConflictDetection((conflict) => {
    // Show alert when conflict detected
    Alert.alert(
      'Sync Conflict Detected',
      `A conflict was detected for ${conflict.table}. Resolve in settings.`,
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Resolve', onPress: () => router.push('/settings/conflicts') },
      ]
    );
  });

  if (conflictCount === 0) return null;

  return (
    <TouchableOpacity
      style={styles.conflictBanner}
      onPress={() => router.push('/settings/conflicts')}
    >
      <Text style={styles.conflictText}>
        âš ï¸ {conflictCount} Conflict{conflictCount > 1 ? 's' : ''} Detected - Tap to Resolve
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// EXAMPLE 8: Use event emitter directly
// ============================================================================

export function CustomEventListener() {
  useEffect(() => {
    // âœ… Listen to multiple events
    const unsubWorkouts = eventEmitter.on(Events.WORKOUTS_UPDATED, () => {
      logger.log('Workouts updated');
    });

    const unsubTemplates = eventEmitter.on(Events.TEMPLATES_UPDATED, () => {
      logger.log('Templates updated');
    });

    const unsubSync = eventEmitter.on(Events.SYNC_COMPLETED, () => {
      logger.log('Sync completed');
    });

    // Cleanup
    return () => {
      unsubWorkouts();
      unsubTemplates();
      unsubSync();
    };
  }, []);

  return null;
}

// ============================================================================
// EXAMPLE 9: Emit custom events
// ============================================================================

export function WorkoutCompleteButton({ workout }: { workout: any }) {
  const handleComplete = async () => {
    // Save workout
    await saveWorkout(workout);
    
    // âœ… Emit custom event
    eventEmitter.emit('workout-completed', workout);
  };

  return (
    <TouchableOpacity onPress={handleComplete}>
      <Text>Complete Workout</Text>
    </TouchableOpacity>
  );
}

// Listen for custom event elsewhere
export function WorkoutCompletionListener() {
  useEffect(() => {
    const unsubscribe = eventEmitter.on('workout-completed', (workout) => {
      // Show celebration animation
      showConfetti();
      
      // Play sound
      playSound('success.mp3');
      
      // Check for PRs
      checkForPersonalRecords(workout);
    });

    return () => unsubscribe();
  }, []);

  return null;
}

// ============================================================================
// EXAMPLE 10: Real-time status panel (for settings/debug)
// ============================================================================

export function RealtimeStatusPanel() {
  const { isConnected, subscriptionCount, status } = useRealtimeStatus();
  const [channelStatus, setChannelStatus] = useState<any>({});

  useEffect(() => {
    const interval = setInterval(() => {
      setChannelStatus(realtimeSync.getStatus());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Real-time Status</Text>
      
      <View style={styles.row}>
        <Text style={styles.label}>Connection:</Text>
        <Text style={[styles.value, isConnected && styles.valueSuccess]}>
          {isConnected ? 'ðŸŸ¢ Connected' : 'ðŸ”´ Disconnected'}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Subscriptions:</Text>
        <Text style={styles.value}>{subscriptionCount}</Text>
      </View>

      {Object.entries(channelStatus).map(([name, state]) => (
        <View key={name} style={styles.row}>
          <Text style={styles.label}>{name}:</Text>
          <Text style={styles.value}>{state}</Text>
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// EXAMPLE 11: Initialize in app root
// ============================================================================

export function AppRoot() {
  const { user } = useAuthStore();

  useEffect(() => {
    // âœ… Initialize real-time when user is authenticated
    if (user?.id) {
      realtimeSync.init(user.id);
    }

    // âœ… Cleanup when user logs out
    return () => {
      if (user?.id) {
        realtimeSync.cleanup();
      }
    };
  }, [user?.id]);

  return <YourApp />;
}

// ============================================================================
// EXAMPLE 12: Weight log with real-time updates
// ============================================================================

export function WeightLogScreen() {
  const [entries, setEntries] = useState([]);

  const loadEntries = async () => {
    const data = await localDB.getLocalWeights();
    setEntries(data.sort((a, b) => 
      new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
    ));
  };

  useEffect(() => {
    loadEntries();
  }, []);

  // âœ… Auto-refresh on real-time updates
  useRealtimeWeightLog(() => {
    loadEntries();
  });

  const handleAddEntry = async (weight: number) => {
    const entry = {
      id: crypto.randomUUID(),
      user_id: user.id,
      logged_at: new Date().toISOString().split('T')[0],
      weight,
      weight_unit: 'lbs',
      created_at: new Date().toISOString(),
    };

    // Save locally (instant)
    await localDB.saveWeightLocally(entry);
    
    // Reload (will show immediately)
    await loadEntries();
    
    // Background sync will upload and notify other devices
  };

  return <View>{/* Weight log UI */}</View>;
}

// ============================================================================
// Key Benefits:
// ============================================================================
//
// 1. âœ… Instant updates across devices
// 2. âœ… No polling needed
// 3. âœ… Efficient (only notified on changes)
// 4. âœ… Works with offline-first (local data updates instantly)
// 5. âœ… Automatic conflict detection
// 6. âœ… Easy to use hooks
// 7. âœ… Event-driven architecture
//
// ============================================================================

