import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Play, Trash2, Dumbbell, Zap, ChevronRight, Calendar, TrendingUp } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useAuthStore } from '@/stores/authStore';
import { Button, Card } from '@/components/ui';
import { getWorkoutHistory } from '@/lib/api/workouts';
import { lightHaptic } from '@/lib/utils/haptics';
import { WorkoutSuggestion } from '@/components/ai';

// ============================================
// Types
// ============================================

interface RecentWorkout {
  id: string;
  name: string;
  started_at: string;
  duration_seconds: number;
  total_sets: number;
}

// ============================================
// Recent Workout Row Component
// ============================================

interface RecentWorkoutRowProps {
  workout: RecentWorkout;
  onPress: () => void;
}

const RecentWorkoutRow: React.FC<RecentWorkoutRowProps> = ({ workout, onPress }) => {
  const timeAgo = formatDistanceToNow(new Date(workout.started_at), { addSuffix: true });

  return (
    <TouchableOpacity
      style={styles.recentRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.recentIcon}>
        <Calendar size={16} color="#64748b" />
      </View>
      <View style={styles.recentInfo}>
        <Text style={styles.recentName} numberOfLines={1}>
          {workout.name || 'Workout'}
        </Text>
        <Text style={styles.recentMeta}>
          {timeAgo} • {workout.total_sets} sets
        </Text>
      </View>
      <ChevronRight size={18} color="#475569" />
    </TouchableOpacity>
  );
};

// ============================================
// Main Screen Component
// ============================================

export default function WorkoutScreen() {
  // Use selectors for optimized re-renders
  const activeWorkout = useWorkoutStore((state) => state.activeWorkout);
  const isWorkoutActive = useWorkoutStore((state) => state.isWorkoutActive);
  const startWorkout = useWorkoutStore((state) => state.startWorkout);
  const discardWorkout = useWorkoutStore((state) => state.discardWorkout);
  const getTotalSets = useWorkoutStore((state) => state.getTotalSets);
  const { user } = useAuthStore();

  // Recent workouts state
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);

  // Fetch recent workouts
  useEffect(() => {
    if (user?.id) {
      fetchRecentWorkouts();
    }
  }, [user?.id]);

  const fetchRecentWorkouts = async () => {
    if (!user?.id) return;
    setIsLoadingRecent(true);
    try {
      const workoutsData = await getWorkoutHistory(user.id, 5);
      setRecentWorkouts(
        workoutsData.map((w: any) => ({
          id: w.id,
          name: w.name,
          started_at: w.started_at,
          duration_seconds: w.duration_seconds || 0,
          total_sets: w.total_sets || 0,
        }))
      );
    } catch (error) {
      console.error('Failed to fetch recent workouts:', error);
    } finally {
      setIsLoadingRecent(false);
    }
  };

  // Handle start empty workout
  const handleStartWorkout = useCallback(() => {
    lightHaptic();
    startWorkout('New Workout');
    router.push('/workout/active');
  }, [startWorkout]);

  // Handle continue workout
  const handleContinueWorkout = useCallback(() => {
    lightHaptic();
    router.push('/workout/active');
  }, []);

  // Handle discard workout
  const handleDiscardWorkout = useCallback(() => {
    Alert.alert(
      'Discard Workout',
      'Are you sure you want to discard this workout? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => discardWorkout(),
        },
      ]
    );
  }, [discardWorkout]);

  // Navigate to workout detail
  const handleViewWorkout = (workoutId: string) => {
    lightHaptic();
    router.push(`/workout/${workoutId}`);
  };

  // Navigate to history
  const handleViewHistory = () => {
    lightHaptic();
    router.push('/(tabs)/history');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Workout</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isWorkoutActive && activeWorkout ? (
          // Active Workout State
          <View style={styles.activeWorkoutContainer}>
            <Card variant="elevated" style={styles.activeCard}>
              <View style={styles.activeHeader}>
                <View style={styles.activeBadge}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeBadgeText}>In Progress</Text>
                </View>
              </View>

              <Text style={styles.activeWorkoutName}>{activeWorkout.name}</Text>

              <View style={styles.activeStats}>
                <View style={styles.activeStat}>
                  <Dumbbell size={18} color="#64748b" />
                  <Text style={styles.activeStatText}>
                    {activeWorkout.exercises.length} exercises
                  </Text>
                </View>
                <View style={styles.activeStat}>
                  <Zap size={18} color="#64748b" />
                  <Text style={styles.activeStatText}>
                    {getTotalSets()} sets completed
                  </Text>
                </View>
              </View>

              <View style={styles.activeActions}>
                <Button
                  title="Continue Workout"
                  variant="primary"
                  size="lg"
                  fullWidth={true}
                  leftIcon={<Play size={20} color="#ffffff" />}
                  onPress={handleContinueWorkout}
                />

                <TouchableOpacity
                  style={styles.discardButton}
                  onPress={handleDiscardWorkout}
                >
                  <Trash2 size={18} color="#ef4444" />
                  <Text style={styles.discardText}>Discard Workout</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        ) : (
          // No Active Workout State
          <View style={styles.startContainer}>
            {/* AI Workout Suggestion - Primary Action */}
            <View style={styles.aiSection}>
              <WorkoutSuggestion />
            </View>

            {/* Start Empty Workout - Secondary Action */}
            <TouchableOpacity
              style={styles.emptyWorkoutButton}
              onPress={handleStartWorkout}
              activeOpacity={0.7}
            >
              <Dumbbell size={20} color="#64748b" />
              <Text style={styles.emptyWorkoutText}>Start Empty Workout</Text>
              <ChevronRight size={20} color="#64748b" />
            </TouchableOpacity>

            {/* Recent Activity Section */}
            <View style={styles.recentSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <TrendingUp size={18} color="#22c55e" />
                  <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
                </View>
                <TouchableOpacity onPress={handleViewHistory} style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>View All</Text>
                  <ChevronRight size={16} color="#3b82f6" />
                </TouchableOpacity>
              </View>

              {isLoadingRecent ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#3b82f6" />
                </View>
              ) : recentWorkouts.length > 0 ? (
                <View style={styles.recentList}>
                  {recentWorkouts.map((workout) => (
                    <RecentWorkoutRow
                      key={workout.id}
                      workout={workout}
                      onPress={() => handleViewWorkout(workout.id)}
                    />
                  ))}
                </View>
              ) : (
                <Card variant="outlined" style={styles.emptyCard}>
                  <View style={styles.emptyContent}>
                    <Calendar size={32} color="#475569" />
                    <Text style={styles.emptyTitle}>No workouts yet</Text>
                    <Text style={styles.emptySubtitle}>
                      Start your first workout to see your history here
                    </Text>
                  </View>
                </Card>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
  },

  scrollView: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  // Active Workout Styles
  activeWorkoutContainer: {
    paddingTop: 20,
  },

  activeCard: {
    padding: 24,
  },

  activeHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },

  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14532d',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
  },

  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },

  activeBadgeText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: 'bold',
  },

  activeWorkoutName: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },

  activeStats: {
    gap: 12,
    marginBottom: 24,
  },

  activeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  activeStatText: {
    color: '#94a3b8',
    fontSize: 15,
  },

  activeActions: {
    gap: 16,
  },

  discardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },

  discardText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'normal',
  },

  // Start Workout Styles
  startContainer: {
    paddingTop: 20,
  },

  // AI Section - New Primary Action
  aiSection: {
    marginBottom: 20,
  },

  // Empty Workout Button - New Secondary Action
  emptyWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#334155',
  },

  emptyWorkoutText: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '600',
  },

  // Recent Activity Section
  recentSection: {
    marginTop: 0,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: 1,
  },

  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  viewAllText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
  },

  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },

  // Recent List
  recentList: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    overflow: 'hidden',
  },

  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  recentInfo: {
    flex: 1,
  },

  recentName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },

  recentMeta: {
    fontSize: 12,
    color: '#64748b',
  },

  // Empty State
  emptyCard: {
    padding: 32,
  },

  emptyContent: {
    alignItems: 'center',
    gap: 8,
  },

  emptyTitle: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },

  emptySubtitle: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
});
