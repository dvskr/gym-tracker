import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { conflictResolver, Conflict } from '@/lib/sync/conflictResolver';

export default function ConflictsScreen() {
  const router = useRouter();
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  useEffect(() => {
    loadConflicts();
  }, []);

  const loadConflicts = () => {
    const pending = conflictResolver.getPendingConflicts();
    setConflicts(pending);
  };

  const handleResolve = (conflict: Conflict) => {
    Alert.alert(
      'Resolve Conflict',
      `Choose which version to keep for this ${conflict.table}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'This Device',
          onPress: async () => {
            await conflictResolver.resolveManually(conflict.id, 'local');
            loadConflicts();
            Alert.alert('Resolved', 'Local version kept');
          },
        },
        {
          text: 'Other Device',
          onPress: async () => {
            await conflictResolver.resolveManually(conflict.id, 'server');
            loadConflicts();
            Alert.alert('Resolved', 'Server version kept');
          },
        },
      ]
    );
  };

  const handleDismiss = async (conflictId: string) => {
    await conflictResolver.dismissConflict(conflictId);
    loadConflicts();
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Conflicts?',
      'This will dismiss all pending conflicts and use the server version.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            for (const conflict of conflicts) {
              await conflictResolver.dismissConflict(conflict.id);
            }
            loadConflicts();
          },
        },
      ]
    );
  };

  if (conflicts.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Conflicts',
            headerShown: true,
            headerStyle: { backgroundColor: '#1e293b' },
            headerTintColor: '#f1f5f9',
          }}
        />
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>No Conflicts</Text>
          <Text style={styles.emptyText}>
            All your data is in sync across devices
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: `${conflicts.length} Conflict${conflicts.length > 1 ? 's' : ''}`,
          headerShown: true,
          headerStyle: { backgroundColor: '#1e293b' },
          headerTintColor: '#f1f5f9',
          headerRight: () => (
            <TouchableOpacity onPress={handleClearAll}>
              <Text style={styles.headerButton}>Clear All</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView}>
        {conflicts.map((conflict) => (
          <View key={conflict.id} style={styles.conflictCard}>
            <View style={styles.conflictHeader}>
              <Text style={styles.conflictTable}>{conflict.table}</Text>
              <Text style={styles.conflictDate}>
                {new Date(conflict.detectedAt).toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.versions}>
              <View style={styles.version}>
                <Text style={styles.versionLabel}>📱 This Device</Text>
                <Text style={styles.versionTime}>
                  {new Date(conflict.localUpdatedAt).toLocaleString()}
                </Text>
                <Text style={styles.versionData}>
                  {JSON.stringify(conflict.localData.name || conflict.localData, null, 2).substring(0, 100)}...
                </Text>
              </View>

              <Text style={styles.vs}>VS</Text>

              <View style={styles.version}>
                <Text style={styles.versionLabel}>☁️ Other Device</Text>
                <Text style={styles.versionTime}>
                  {new Date(conflict.serverUpdatedAt).toLocaleString()}
                </Text>
                <Text style={styles.versionData}>
                  {JSON.stringify(conflict.serverData.name || conflict.serverData, null, 2).substring(0, 100)}...
                </Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.buttonLocal]}
                onPress={() => handleResolve(conflict)}
              >
                <Text style={styles.buttonText}>Resolve</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.buttonDismiss]}
                onPress={() => handleDismiss(conflict.id)}
              >
                <Text style={styles.buttonText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  headerButton: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  conflictCard: {
    backgroundColor: '#1e293b',
    margin: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f59e0b',
    overflow: 'hidden',
  },
  conflictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#451a03',
    borderBottomWidth: 1,
    borderBottomColor: '#78350f',
  },
  conflictTable: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fbbf24',
  },
  conflictDate: {
    fontSize: 13,
    color: '#d97706',
  },
  versions: {
    padding: 16,
  },
  version: {
    marginBottom: 16,
  },
  versionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  versionTime: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  versionData: {
    fontSize: 12,
    color: '#cbd5e1',
    fontFamily: 'monospace',
    backgroundColor: '#0f172a',
    padding: 8,
    borderRadius: 6,
  },
  vs: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
    marginVertical: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonLocal: {
    backgroundColor: '#3b82f6',
  },
  buttonDismiss: {
    backgroundColor: '#64748b',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

