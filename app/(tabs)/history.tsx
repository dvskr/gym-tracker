import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Calendar, Clock, Dumbbell, TrendingUp, ChevronRight } from 'lucide-react-native';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '@/stores/authStore';
import { getWorkoutHistory, WorkoutSummary } from '@/lib/api/workouts';
import { Card, LoadingSpinner } from '@/components/ui';
import { Skeleton } from '@/components/ui';

// Skeleton for workout item
const WorkoutItemSkeleton = () => (
  <View style={styles.workoutCard}>
    <View style={styles.workoutHeader}>
      <Skeleton width="60%" height={18} borderRadius={4} />
      <Skeleton width={80} height={14} borderRadius={4} />
    </View>
    <View style={styles.workoutStats}>
      <Skeleton width={60} height={14} borderRadius={4} />
      <Skeleton width={60} height={14} borderRadius={4} />
      <Skeleton width={80} height={14} borderRadius={4} />
    </View>
  </View>
);

export default function HistoryScreen() {
  const { user } = useAuthStore();
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch workouts
  const fetchWorkouts = useCallback(async (showRefreshing = false) => {
    if (!user?.id) return;

    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await getWorkoutHistory(user.id, 50);
      setWorkouts(data);
    } catch (err) {
      console.error('Failed to fetch workouts:', err);
      setError('Failed to load workout history');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Format date
  const formatWorkoutDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else {
      return format(date, 'MMM d, yyyy');
    }
  };

  // Handle workout press
  const handleWorkoutPress = (workoutId: string) => {
    router.push(`/workout/${workoutId}`);
  };

  // Render workout item
  const renderWorkoutItem = ({ item }: { item: WorkoutSummary }) => (
    <TouchableOpacity
      style={styles.workoutCard}
      onPress={() => handleWorkoutPress(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.workoutHeader}>
        <Text style={styles.workoutName} numberOfLines={1}>
          {item.name || 'Workout'}
        </Text>
        <View style={styles.dateContainer}>
          <Calendar size={12} color="#64748b" />
          <Text style={styles.workoutDate}>{formatWorkoutDate(item.started_at)}</Text>
        </View>
      </View>

      <View style={styles.workoutStats}>
        <View style={styles.statItem}>
          <Clock size={14} color="#3b82f6" />
          <Text style={styles.statText}>{formatDuration(item.duration_seconds)}</Text>
        </View>

        <View style={styles.statItem}>
          <Dumbbell size={14} color="#22c55e" />
          <Text style={styles.statText}>{item.total_sets} sets</Text>
        </View>

        <View style={styles.statItem}>
          <TrendingUp size={14} color="#a855f7" />
          <Text style={styles.statText}>{item.total_volume.toLocaleString()} lbs</Text>
        </View>

        <ChevronRight size={18} color="#475569" style={styles.chevron} />
      </View>

      {/* Rating stars if exists */}
      {item.rating && item.rating > 0 && (
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Text
              key={star}
              style={[
                styles.ratingStar,
                star <= item.rating! && styles.ratingStarFilled,
              ]}
            >
              ★
            </Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );

  // Empty state
  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Dumbbell size={64} color="#334155" />
      <Text style={styles.emptyTitle}>No workouts yet</Text>
      <Text style={styles.emptySubtitle}>
        Complete your first workout to see it here
      </Text>
      <TouchableOpacity
        style={styles.startButton}
        onPress={() => router.push('/(tabs)/workout')}
      >
        <Text style={styles.startButtonText}>Start Workout</Text>
      </TouchableOpacity>
    </View>
  );

  // Error state
  const ErrorState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => fetchWorkouts()}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // Loading skeletons
  const LoadingSkeletons = () => (
    <View style={styles.skeletonContainer}>
      <WorkoutItemSkeleton />
      <WorkoutItemSkeleton />
      <WorkoutItemSkeleton />
      <WorkoutItemSkeleton />
      <WorkoutItemSkeleton />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Workout History</Text>
        <Text style={styles.subtitle}>
          {workouts.length > 0
            ? `${workouts.length} workout${workouts.length !== 1 ? 's' : ''}`
            : 'Track your progress'}
        </Text>
      </View>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeletons />
      ) : error ? (
        <ErrorState />
      ) : (
        <FlatList
          data={workouts}
          renderItem={renderWorkoutItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={EmptyState}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchWorkouts(true)}
              tintColor="#3b82f6"
              colors={['#3b82f6']}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },

  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },

  subtitle: {
    color: '#64748b',
    fontSize: 14,
  },

  listContent: {
    padding: 16,
    paddingBottom: 100,
  },

  workoutCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },

  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  workoutName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },

  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  workoutDate: {
    color: '#64748b',
    fontSize: 12,
  },

  workoutStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  statText: {
    color: '#94a3b8',
    fontSize: 13,
  },

  chevron: {
    marginLeft: 'auto',
  },

  ratingContainer: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 2,
  },

  ratingStar: {
    fontSize: 14,
    color: '#334155',
  },

  ratingStarFilled: {
    color: '#fbbf24',
  },

  separator: {
    height: 10,
  },

  skeletonContainer: {
    padding: 16,
    gap: 10,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },

  emptyTitle: {
    color: '#94a3b8',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },

  emptySubtitle: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },

  startButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },

  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },

  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },

  retryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
