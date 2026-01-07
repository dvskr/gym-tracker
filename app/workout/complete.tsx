import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Trophy,
  Clock,
  TrendingUp,
  Dumbbell,
  Flame,
  Repeat,
  Star,
  ChevronDown,
  ChevronUp,
  Check,
  Trash2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { getWorkoutById, WorkoutDetail } from '@/lib/api/workouts';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';
import { PRConfetti } from '@/components/workout/PRConfetti';

export default function WorkoutCompleteScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [workoutName, setWorkoutName] = useState('Workout');
  const [rating, setRating] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch workout data and trigger celebration if there are PRs
  useEffect(() => {
    if (workoutId) {
      fetchWorkout();
    }
  }, [workoutId]);

  // Trigger celebration when workout data is loaded and has PRs
  useEffect(() => {
    logger.log('[Complete] Celebration useEffect triggered', { 
      hasWorkout: !!workout, 
      hasPRs, 
      workoutId: workout?.id 
    });
    
    if (workout && hasPRs) {
      logger.log('[Complete] PRs DETECTED! Starting celebration in 500ms...', { 
        workoutId: workout.id,
        exerciseCount: workout.workout_exercises?.length || 0,
      });
      
      // Small delay to ensure PRConfetti component is mounted
      const timer = setTimeout(async () => {
        logger.log('[Complete] Timer fired - calling celebratePR()');
        const { celebratePR } = await import('@/lib/utils/celebrations');
        await celebratePR();
        logger.log('[Complete] celebratePR() completed');
      }, 500);
      return () => clearTimeout(timer);
    } else {
      logger.log('[Complete] No celebration - hasPRs:', hasPRs, 'hasWorkout:', !!workout);
    }
  }, [workout, hasPRs]);

  const fetchWorkout = async () => {
    if (!workoutId) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await getWorkoutById(workoutId);
      setWorkout(data);
      if (data) {
        setWorkoutName(data.name || 'Workout');
      }
    } catch (error: unknown) {
      logger.error('Failed to fetch completed workout:', error);
      Alert.alert('Error', 'Failed to load workout details');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate stats
  const stats = {
    duration: workout?.duration_seconds || 0,
    volume: workout?.total_volume || 0,
    exercises: workout?.workout_exercises?.length || 0,
    sets: workout?.total_sets || 0,
    reps: workout?.total_reps || 0,
  };

  // Check for PRs in the workout data
  const hasPRs = workout?.workout_exercises?.some((ex) =>
    ex.workout_sets?.some((set) => set.is_pr)
  ) || false;
  
  // Log PR detection for debugging
  useEffect(() => {
    if (workout) {
      const prSets = workout.workout_exercises?.flatMap(ex => 
        ex.workout_sets?.filter(set => set.is_pr).map(set => ({
          exercise: ex.exercises?.name,
          weight: set.weight,
          reps: set.reps,
          prType: set.pr_type,
        })) || []
      ) || [];
      
      logger.log('[Complete] PR Detection Result:', {
        hasPRs,
        prCount: prSets.length,
        prSets: prSets,
      });
    }
  }, [workout, hasPRs]);

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hrs > 0 ? (mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`) : `${mins}m`;
  };

  const formatVolume = (lbs: number): string => {
    if (lbs >= 1000000) return `${(lbs / 1000000).toFixed(1)}M`;
    if (lbs >= 1000) return `${Math.round(lbs / 1000)}K`;
    return `${lbs.toLocaleString()}`;
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);

    try {
      // Update workout with rating and name
      const updates: { rating?: number; name?: string } = {};
      if (rating > 0) updates.rating = rating;
      if (workoutName !== workout?.name) updates.name = workoutName;

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('workouts')
          .update(updates)
          .eq('id', workoutId);

        if (error) throw error;
      }

      // Save as template if requested
      if (saveAsTemplate && workout) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Create template
        const { data: template, error: templateError } = await supabase
          .from('workout_templates')
          .insert({
            user_id: user.id,
            name: workoutName,
          })
          .select()
          .single();

        if (templateError) throw templateError;

        // Add exercises to template
        for (const workoutExercise of workout.workout_exercises || []) {
          const { error: exerciseError } = await supabase
            .from('template_exercises')
            .insert({
              template_id: template.id,
              exercise_id: workoutExercise.exercises?.id,
              order_index: workoutExercise.order_index,
              target_sets: workoutExercise.workout_sets?.length || 3,
            });

          if (exerciseError) throw exerciseError;
        }
      }

      // Navigate to history
      router.replace('/(tabs)');
    } catch (error: unknown) {
      logger.error('Failed to save workout metadata:', error);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Discard Workout?',
      'This workout will be permanently deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('workouts')
                .delete()
                .eq('id', workoutId);

              if (error) throw error;
              router.replace('/(tabs)');
            } catch (error: unknown) {
              logger.error('Failed to delete workout:', error);
              Alert.alert('Error', 'Failed to delete workout');
            }
          },
        },
      ]
    );
  };

  // Stat cell component
  const StatCell = ({
    icon,
    value,
    label,
  }: {
    icon: React.ReactNode;
    value: string;
    label: string;
  }) => (
    <View style={styles.statCell}>
      {icon}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  // Rating cell component
  const RatingCell = () => (
    <View style={styles.statCell}>
      <Text style={styles.ratingCellLabel}>Rate</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((i) => (
          <TouchableOpacity
            key={i}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setRating(i);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Star
              size={18}
              color={i <= rating ? '#fbbf24' : '#4b5563'}
              fill={i <= rating ? '#fbbf24' : 'transparent'}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading workout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!workout) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Workout not found</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.errorButtonText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Compact Horizontal Header */}
        <View style={styles.header}>
          <View style={styles.trophyCircle}>
            <Trophy size={28} color={hasPRs ? '#fbbf24' : '#3b82f6'} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>
              {hasPRs ? 'New PR! 🎉' : 'Workout Complete!'}
            </Text>
            <Text style={styles.subtitle}>
              {hasPRs ? 'You crushed it!' : 'Amazing work! 💪'}
            </Text>
          </View>
        </View>

        {/* 2x3 Stats Grid */}
        <View style={styles.statsCard}>
          <View style={styles.statsGrid}>
            {/* Row 1 */}
            <StatCell
              icon={<Clock size={16} color="#60a5fa" />}
              value={formatDuration(stats.duration)}
              label="Duration"
            />
            <StatCell
              icon={<TrendingUp size={16} color="#22c55e" />}
              value={formatVolume(stats.volume)}
              label="Volume"
            />
            <StatCell
              icon={<Dumbbell size={16} color="#a855f7" />}
              value={String(stats.exercises)}
              label="Exercises"
            />
            {/* Row 2 */}
            <StatCell
              icon={<Flame size={16} color="#f97316" />}
              value={String(stats.sets)}
              label="Sets"
            />
            <StatCell
              icon={<Repeat size={16} color="#06b6d4" />}
              value={String(stats.reps)}
              label="Reps"
            />
            <RatingCell />
          </View>
        </View>

        {/* Exercise Breakdown - Collapsible */}
        <TouchableOpacity
          style={styles.breakdownToggle}
          onPress={() => setShowBreakdown(!showBreakdown)}
          activeOpacity={0.7}
        >
          <Text style={styles.breakdownToggleText}>Exercise Breakdown</Text>
          {showBreakdown ? (
            <ChevronUp size={20} color="#94a3b8" />
          ) : (
            <ChevronDown size={20} color="#94a3b8" />
          )}
        </TouchableOpacity>

        {showBreakdown && (
          <View style={styles.breakdownContent}>
            {workout.workout_exercises
              ?.sort((a, b) => a.order_index - b.order_index)
              .map((exercise, index) => {
                const completedSets = exercise.workout_sets?.filter(
                  (s) => s.is_completed
                );
                const hasPR = exercise.workout_sets?.some((s) => s.is_pr);

                return (
                  <View
                    key={exercise.id || index}
                    style={[
                      styles.exerciseRow,
                      index === (workout.workout_exercises?.length ?? 0) - 1 &&
                        styles.exerciseRowLast,
                    ]}
                  >
                    <View style={styles.exerciseNameContainer}>
                      <Text style={styles.exerciseName} numberOfLines={1}>
                        {exercise.exercises?.name || 'Unknown Exercise'}
                      </Text>
                      {hasPR && (
                        <View style={styles.prBadge}>
                          <Trophy size={12} color="#fbbf24" />
                          <Text style={styles.prBadgeText}>PR</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.exerciseSets}>
                      {completedSets?.length || 0} sets
                    </Text>
                  </View>
                );
              })}
          </View>
        )}

        {/* Workout Name Input */}
        <View style={styles.nameSection}>
          <Text style={styles.nameLabel}>Workout Name</Text>
          <TextInput
            style={styles.nameInput}
            value={workoutName}
            onChangeText={setWorkoutName}
            placeholder="Enter workout name"
            placeholderTextColor="#4b5563"
            selectTextOnFocus
          />
        </View>

        {/* Save as Template Checkbox */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSaveAsTemplate(!saveAsTemplate);
          }}
          activeOpacity={0.7}
        >
          <View
            style={[styles.checkbox, saveAsTemplate && styles.checkboxChecked]}
          >
            {saveAsTemplate && (
              <Check size={14} color="#ffffff" strokeWidth={3} />
            )}
          </View>
          <Text style={styles.checkboxLabel}>
            Save as template for future workouts
          </Text>
        </TouchableOpacity>

        {/* Spacer to push buttons to bottom */}
        <View style={styles.spacer} />

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>

        {/* Discard Link */}
        <TouchableOpacity
          style={styles.discardLink}
          onPress={handleDiscard}
          activeOpacity={0.6}
        >
          <Trash2 size={16} color="#ef4444" />
          <Text style={styles.discardLinkText}>Discard Workout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    <PRConfetti />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  // Compact Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  trophyCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 2,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    marginTop: 2,
  },
  // Stats Grid
  statsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statCell: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Rating in Grid
  ratingCellLabel: {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  // Breakdown Toggle
  breakdownToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  breakdownToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  breakdownContent: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  exerciseRowLast: {
    borderBottomWidth: 0,
  },
  exerciseNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  exerciseName: {
    fontSize: 14,
    color: '#e2e8f0',
    textTransform: 'capitalize',
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
    gap: 2,
  },
  prBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fbbf24',
  },
  exerciseSets: {
    fontSize: 13,
    color: '#64748b',
  },
  // Workout Name
  nameSection: {
    marginBottom: 12,
    marginTop: 4,
  },
  nameLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 6,
  },
  nameInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#334155',
  },
  // Checkbox
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4b5563',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#94a3b8',
    flex: 1,
  },
  // Spacer
  spacer: {
    flex: 1,
    minHeight: 8,
  },
  // Save Button
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Discard Link
  discardLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  discardLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ef4444',
  },
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  // Error
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  errorButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});



