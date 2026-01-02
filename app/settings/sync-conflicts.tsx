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
import { ChevronRight, Check } from 'lucide-react-native';
import { conflictResolver, ConflictStrategy } from '@/lib/sync/conflictResolver';

const STRATEGY_OPTIONS: Array<{
  value: ConflictStrategy;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: 'latest_wins',
    label: 'Latest Wins',
    description: 'Use the most recently modified version (recommended)',
    icon: '=P',
  },
  {
    value: 'client_wins',
    label: 'This Device Wins',
    description: 'Always prefer changes made on this device',
    icon: '=',
  },
  {
    value: 'server_wins',
    label: 'Other Device Wins',
    description: 'Always prefer changes from other devices',
    icon: '',
  },
  {
    value: 'manual',
    label: 'Ask Me',
    description: 'Prompt me to resolve conflicts manually',
    icon: '=d',
  },
];

export default function SyncConflictSettingsScreen() {
  const router = useRouter();
  const [currentStrategy, setCurrentStrategy] = useState<ConflictStrategy>('latest_wins');
  const [pendingConflicts, setPendingConflicts] = useState(0);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const strategy = conflictResolver.getStrategy();
    setCurrentStrategy(strategy);
    
    const conflicts = conflictResolver.getPendingConflicts();
    setPendingConflicts(conflicts.length);
  };

  const handleStrategyChange = async (strategy: ConflictStrategy) => {
    await conflictResolver.setStrategy(strategy);
    setCurrentStrategy(strategy);
    Alert.alert(
      'Strategy Updated',
      `Conflict resolution strategy changed to: ${STRATEGY_OPTIONS.find(s => s.value === strategy)?.label}`
    );
  };

  const handleViewConflicts = () => {
    router.push('/settings/conflicts');
  };

  const handleClearResolvedConflicts = async () => {
    Alert.alert(
      'Clear Resolved Conflicts?',
      'This will remove all conflicts that have been resolved from storage.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: async () => {
            const cleared = await conflictResolver.clearResolvedConflicts();
            Alert.alert('Cleared', `Removed ${cleared} resolved conflict(s)`);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Sync Conflicts',
          headerShown: true,
          headerStyle: { backgroundColor: '#1e293b' },
          headerTintColor: '#f1f5f9',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Info Section */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>9</Text>
          <Text style={styles.infoText}>
            When the same data is modified on multiple devices, a conflict occurs.
            Choose how you want to resolve these conflicts.
          </Text>
        </View>

        {/* Pending Conflicts Alert */}
        {pendingConflicts > 0 && (
          <TouchableOpacity
            style={styles.conflictAlert}
            onPress={handleViewConflicts}
          >
            <View style={styles.conflictAlertContent}>
              <Text style={styles.conflictAlertIcon}></Text>
              <View style={styles.conflictAlertText}>
                <Text style={styles.conflictAlertTitle}>
                  {pendingConflicts} Conflict{pendingConflicts > 1 ? 's' : ''} Pending
                </Text>
                <Text style={styles.conflictAlertSubtitle}>
                  Tap to resolve manually
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#f59e0b" />
          </TouchableOpacity>
        )}

        {/* Strategy Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>RESOLUTION STRATEGY</Text>

          {STRATEGY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.strategyOption}
              onPress={() => handleStrategyChange(option.value)}
              activeOpacity={0.7}
            >
              <View style={styles.strategyContent}>
                <Text style={styles.strategyIcon}>{option.icon}</Text>
                <View style={styles.strategyText}>
                  <Text style={styles.strategyLabel}>{option.label}</Text>
                  <Text style={styles.strategyDescription}>
                    {option.description}
                  </Text>
                </View>
              </View>
              {currentStrategy === option.value && (
                <View style={styles.checkmark}>
                  <Check size={20} color="#22c55e" strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ACTIONS</Text>

          {pendingConflicts > 0 && (
            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleViewConflicts}
            >
              <Text style={styles.actionText}>View Pending Conflicts</Text>
              <View style={styles.actionRight}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingConflicts}</Text>
                </View>
                <ChevronRight size={20} color="#64748b" />
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleClearResolvedConflicts}
          >
            <Text style={styles.actionText}>Clear Resolved Conflicts</Text>
            <ChevronRight size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Strategy Explanations */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>HOW IT WORKS</Text>

          <View style={styles.explanationCard}>
            <Text style={styles.explanationTitle}>Latest Wins (Recommended)</Text>
            <Text style={styles.explanationText}>
              The version with the most recent timestamp is kept. This works well
              when you edit data on different devices at different times.
            </Text>
          </View>

          <View style={styles.explanationCard}>
            <Text style={styles.explanationTitle}>This Device Wins</Text>
            <Text style={styles.explanationText}>
              Your changes on this device always override changes from other devices.
              Useful if this is your primary device.
            </Text>
          </View>

          <View style={styles.explanationCard}>
            <Text style={styles.explanationTitle}>Other Device Wins</Text>
            <Text style={styles.explanationText}>
              Changes from other devices always override your local changes.
              Useful for secondary devices or when collaborating.
            </Text>
          </View>

          <View style={styles.explanationCard}>
            <Text style={styles.explanationTitle}>Ask Me</Text>
            <Text style={styles.explanationText}>
              You'll be prompted to review and resolve each conflict manually.
              Gives you full control but requires more interaction.
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
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
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  conflictAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#451a03',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#78350f',
  },
  conflictAlertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  conflictAlertIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  conflictAlertText: {
    flex: 1,
  },
  conflictAlertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fbbf24',
    marginBottom: 2,
  },
  conflictAlertSubtitle: {
    fontSize: 13,
    color: '#d97706',
  },
  section: {
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
  strategyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  strategyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  strategyIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  strategyText: {
    flex: 1,
  },
  strategyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  strategyDescription: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  checkmark: {
    marginLeft: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  actionText: {
    fontSize: 16,
    color: '#f1f5f9',
  },
  actionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  explanationCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  explanationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 32,
  },
});
