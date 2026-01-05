/**
 * Sync Status Integration Examples
 * Shows how to add the sync status indicator to your app
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { SyncStatus } from '@/components/sync/SyncStatus';
import { SyncStatusIndicator } from '@/components/sync/SyncStatusIndicator';

// ============================================================================
// OPTION 1: Add to Tab Bar Header (Recommended)
// ============================================================================

export function TabsLayoutWithSync() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#1e293b' },
        headerTintColor: '#f1f5f9',
        // ✅ Add sync indicator to all tab headers
        headerRight: () => (
          <View style={{ marginRight: 16 }}>
            <SyncStatus size="small" />
          </View>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Workouts' }} />
      <Tabs.Screen name="templates" options={{ title: 'Templates' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

// ============================================================================
// OPTION 2: Add to Specific Tab Only (Profile/Settings)
// ============================================================================

export function TabsLayoutProfileOnly() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{ title: 'Workouts' }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          // ✅ Only show sync status on profile tab
          headerRight: () => (
            <View style={{ marginRight: 16 }}>
              <SyncStatus size="medium" />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

// ============================================================================
// OPTION 3: Floating Indicator (Bottom Right)
// ============================================================================

export function FloatingSyncStatus() {
  return (
    <View style={styles.floating}>
      <SyncStatus showLabel={false} size="medium" />
    </View>
  );
}

// Add to your root layout:
export function RootLayoutWithFloating() {
  return (
    <View style={{ flex: 1 }}>
      <YourTabsOrStack />
      
      {/* ✅ Floating sync status */}
      <FloatingSyncStatus />
    </View>
  );
}

// ============================================================================
// OPTION 4: In Profile/Settings Screen
// ============================================================================

export function ProfileScreen() {
  return (
    <ScrollView>
      {/* User Info */}
      <UserInfo />

      {/* Settings Sections */}
      <SettingsSection title="Preferences" />
      
      {/* ✅ Sync Status Section */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionHeader}>DATA SYNC</Text>
        
        <View style={styles.settingsItem}>
          <Text style={styles.settingsItemText}>Sync Status</Text>
          <SyncStatus size="small" />
        </View>
        
        <TouchableOpacity
          style={styles.settingsItem}
          onPress={() => router.push('/settings/sync-conflicts')}
        >
          <Text style={styles.settingsItemText}>Conflict Resolution</Text>
          <ChevronRight size={20} color="#64748b" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ============================================================================
// OPTION 5: Minimal Indicator (Just Icon)
// ============================================================================

export function MinimalSyncIndicator() {
  return (
    <View style={{ marginRight: 16 }}>
      {/* ✅ Show only icon, no label */}
      <SyncStatus showLabel={false} size="small" />
    </View>
  );
}

// ============================================================================
// OPTION 6: Custom Placement in Specific Screen
// ============================================================================

export function WorkoutsScreen() {
  return (
    <View style={{ flex: 1 }}>
      {/* Custom Header */}
      <View style={styles.customHeader}>
        <Text style={styles.title}>Workouts</Text>
        
        {/* ✅ Sync indicator in custom header */}
        <SyncStatus size="small" />
      </View>

      {/* Content */}
      <WorkoutList />
    </View>
  );
}

// ============================================================================
// OPTION 7: With Additional Context
// ============================================================================

export function SyncStatusWithLastSync() {
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const loadLastSync = async () => {
      const time = await backgroundSync.getLastSyncTime();
      setLastSync(time ? new Date(time) : null);
    };
    loadLastSync();
  }, []);

  return (
    <View style={styles.syncContainer}>
      <SyncStatus size="small" />
      {lastSync && (
        <Text style={styles.lastSyncText}>
          {formatDistanceToNow(lastSync, { addSuffix: true })}
        </Text>
      )}
    </View>
  );
}

// ============================================================================
// RECOMMENDED INTEGRATION (in app/(tabs)/_layout.tsx)
// ============================================================================

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopColor: '#334155',
        },
        headerStyle: {
          backgroundColor: '#1e293b',
        },
        headerTintColor: '#f1f5f9',
        headerTitleStyle: {
          fontWeight: '600',
        },
        // ✅ Add sync indicator to all headers
        headerRight: () => (
          <View style={{ marginRight: 16 }}>
            <SyncStatus size="small" showLabel={true} />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Workouts',
          tabBarIcon: ({ color }) => <Dumbbell size={24} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="templates"
        options={{
          title: 'Templates',
          tabBarIcon: ({ color }) => <BookOpen size={24} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => <TrendingUp size={24} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floating: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  settingsSection: {
    marginTop: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  settingsItemText: {
    fontSize: 16,
    color: '#f1f5f9',
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  syncContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  lastSyncText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
});
