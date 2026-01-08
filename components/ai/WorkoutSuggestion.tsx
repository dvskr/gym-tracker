import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { RefreshCw, Check, Star, ChevronDown, ChevronUp, Play, Info, TrendingUp } from 'lucide-react-native';
import { recoveryService, RecoveryStatus, MuscleRecoveryDetail } from '@/lib/ai/recoveryService';
import { getCachedData, setCacheData } from '@/lib/ai/prefetch';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { getPersonalizedExercises, PersonalizedExercise } from '@/lib/ai/exerciseSuggestions';
import { WorkoutSuggestionSkeleton } from './WorkoutSuggestionSkeleton';
import { lightHaptic, successHaptic } from '@/lib/utils/haptics';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

// Goal labels for display
const GOAL_LABELS: Record<string, string> = {
  strength: 'Strength Training',
  build_muscle: 'Muscle Building',
  lose_fat: 'Fat Loss',
  endurance: 'Endurance',
  general_fitness: 'General Fitness',
  maintain: 'Maintenance',
};

// Workout type definitions
const WORKOUT_TYPES = {
  Push: {
    name: 'Push Day',
    emoji: '💪',
    muscles: ['Chest', 'Shoulders', 'Triceps'],
  },
  Pull: {
    name: 'Pull Day',
    emoji: '🏋️',
    muscles: ['Back', 'Biceps', 'Lats'],
  },
  Legs: {
    name: 'Leg Day',
    emoji: '🦵',
    muscles: ['Quads', 'Hamstrings', 'Glutes'],
  },
  'Full Body': {
    name: 'Full Body',
    emoji: '🔥',
    muscles: ['All muscle groups'],
  },
};

type WorkoutType = keyof typeof WORKOUT_TYPES;

export function WorkoutSuggestion() {
  const { user } = useAuthStore();
  const { preferredSplit } = useSettingsStore();
  const { startWorkout, addExerciseWithSets } = useWorkoutStore();
  
  const [selectedType, setSelectedType] = useState<WorkoutType | null>(null);
  const [suggestedType, setSuggestedType] = useState<WorkoutType>('Push');
  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryStatus | null>(null);
  const [exercises, setExercises] = useState<PersonalizedExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);
  const [noEquipmentWarning, setNoEquipmentWarning] = useState(false);
  const [userGoal, setUserGoal] = useState<string>('build_muscle');

  // Get suggestion based on recovery status
  const getSuggestionFromRecovery = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Check cache first
      const cached = getCachedData<RecoveryStatus>(user.id, 'recovery');
      
      let status: RecoveryStatus;
      if (cached) {
        status = cached;
      } else {
        status = await recoveryService.getRecoveryStatus(user.id);
        setCacheData(user.id, 'recovery', status);
      }
      
      setRecoveryStatus(status);
      
      // Determine suggested type from recovery
      const focus = status.suggestedFocus;
      if (focus === 'Push' || focus === 'Pull' || focus === 'Legs') {
        setSuggestedType(focus);
        setSelectedType(focus);
      } else if (focus === 'Rest Day') {
        // Still show options but highlight rest
        setSuggestedType('Full Body');
        setSelectedType(null);
      } else {
        setSuggestedType('Full Body');
        setSelectedType('Full Body');
      }
    } catch (err: unknown) {
      logger.error('Error getting recovery status:', err);
      // Default to Push
      setSuggestedType('Push');
      setSelectedType('Push');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load exercises when type changes
  const loadExercises = useCallback(async (type: WorkoutType) => {
    if (!user?.id) return;
    
    setIsLoadingExercises(true);
    try {
      // Pass recovery data for enhanced explanations
      const personalized = await getPersonalizedExercises(
        user.id, 
        type,
        recoveryStatus || undefined
      );
      setExercises(personalized);
      
      // Check if user has equipment set
      if (personalized.length === 0) {
        setNoEquipmentWarning(true);
      } else {
        setNoEquipmentWarning(false);
      }
      
      // Get user's fitness goal for display
      const { data: profile } = await supabase
        .from('profiles')
        .select('fitness_goal')
        .eq('id', user.id)
        .single();
      
      if (profile?.fitness_goal) {
        setUserGoal(profile.fitness_goal);
      }
    } catch (error: unknown) {
      logger.error('Failed to load personalized exercises:', error);
    } finally {
      setIsLoadingExercises(false);
    }
  }, [user, recoveryStatus]);

  // OPTIMIZATION C: Start workout with suggested exercises
  const handleStartWorkout = useCallback(() => {
    if (!currentWorkout || exercises.length === 0) return;
    
    successHaptic();
    
    try {
      // Start workout with current workout type name
      startWorkout(currentWorkout.name);
      
      // Add all suggested exercises
      exercises.forEach((ex) => {
        // Prepare pre-fill sets
        const prefillSets: Array<{ weight?: number; reps?: number }> = [];
        
        // Use suggested weight if available (progressive overload)
        const weight = ex.suggestedWeight || ex.lastWeight;
        
        if (weight && weight > 0) {
          // Pre-fill with suggested weight for all sets
          for (let i = 0; i < ex.sets; i++) {
            prefillSets.push({ weight, reps: undefined });
          }
        }
        
        // Add exercise with pre-filled sets
        addExerciseWithSets(
          {
            id: ex.exerciseId,      // External ID (for compatibility)
            dbId: ex.exerciseId,    // Database UUID (needed for GIF fetching)
            name: ex.name,
            bodyPart: '',
            equipment: ex.equipment || '',
            target: '',
            gifUrl: ex.gifUrl || '',  // Pass the actual GIF URL from database (required field)
            secondaryMuscles: [],
            instructions: [],
          },
          prefillSets,
          ex.sets
        );
      });
      
      // Navigate to active workout
      router.push('/workout/active');
      
    } catch (error: unknown) {
      logger.error('Error starting suggested workout:', error);
      Alert.alert('Error', 'Failed to start workout. Please try again.');
    }
  }, [currentWorkout, exercises, startWorkout, addExerciseWithSets]);

  useEffect(() => {
    getSuggestionFromRecovery();
  }, [getSuggestionFromRecovery]);

  useEffect(() => {
    if (selectedType) {
      loadExercises(selectedType);
    }
  }, [selectedType, loadExercises]);

  const handleTypeSelect = (type: WorkoutType) => {
    lightHaptic();
    setSelectedType(type);
  };

  if (!user) return null;

  if (isLoading) {
    return <WorkoutSuggestionSkeleton />;
  }

  const currentWorkout = selectedType ? WORKOUT_TYPES[selectedType] : null;
  const isRestDay = recoveryStatus?.suggestedFocus === 'Rest Day';

  // Get relevant muscles for the selected workout
  const getRelevantMuscles = (): MuscleRecoveryDetail[] => {
    if (!recoveryStatus?.muscleDetails || !selectedType) return [];
    
    const muscleGroups = WORKOUT_TYPES[selectedType].muscles.map(m => m.toLowerCase());
    return recoveryStatus.muscleDetails.filter(m => 
      muscleGroups.some(group => m.name.toLowerCase().includes(group))
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.label}>TODAY'S SUGGESTION</Text>
        <TouchableOpacity 
          onPress={getSuggestionFromRecovery}
          style={styles.refreshButton}
        >
          <RefreshCw size={16} color="#60a5fa" />
        </TouchableOpacity>
      </View>

      {/* Rest day warning */}
      {isRestDay && (
        <View style={styles.restWarning}>
          <Text style={styles.restWarningText}>
            💤 Rest day recommended, but you can still train
          </Text>
        </View>
      )}
      
      {/* Workout Type Selector - User picks */}
      <View style={styles.typeSelector}>
        {(Object.keys(WORKOUT_TYPES) as WorkoutType[]).map((type) => {
          const workout = WORKOUT_TYPES[type];
          const isSelected = selectedType === type;
          const isSuggested = suggestedType === type && !isRestDay;
          const isPreferred = preferredSplit === type && !isSuggested;
          
          return (
            <Pressable
              key={type}
              style={[
                styles.typeButton,
                isSelected && styles.typeButtonSelected,
                isSuggested && !isSelected && styles.typeButtonSuggested,
              ]}
              onPress={() => handleTypeSelect(type)}
            >
              {isSuggested && !isSelected && (
                <View style={styles.suggestedBadge}>
                  <Check size={10} color="#10b981" strokeWidth={3} />
                </View>
              )}
              {isPreferred && (
                <View style={styles.preferredBadge}>
                  <Star size={8} color="#eab308" fill="#eab308" />
                </View>
              )}
              <Text style={styles.typeEmoji}>{workout.emoji}</Text>
              <Text style={[
                styles.typeName,
                isSelected && styles.typeNameSelected,
              ]}>
                {type}
              </Text>
            </Pressable>
          );
        })}
      </View>


      {/* Selected workout preview */}
      {currentWorkout && (
        <>
          <View style={styles.workoutPreview}>
            <Text style={styles.previewTitle}>{currentWorkout.name}</Text>
            <Text style={styles.previewMuscles}>
              {currentWorkout.muscles.join(' • ')}
            </Text>
          </View>
          
          {/* Goal Context Banner */}
          {userGoal && (
            <View style={styles.goalBanner}>
              <Text style={styles.goalText}>
                🎯 {GOAL_LABELS[userGoal] || userGoal} • Sets/reps optimized for your goal
              </Text>
            </View>
          )}

          {/* Exercise list */}
          {isLoadingExercises ? (
            <View style={styles.loadingExercises}>
              <ActivityIndicator size="small" color="#3b82f6" />
            </View>
          ) : exercises.length > 0 ? (
            <>
              <View style={styles.exercises}>
                {exercises.map((ex, i) => (
                  <View key={i} style={styles.exerciseCard}>
                    {/* Exercise Name with Compound Badge */}
                    <View style={styles.exerciseHeader}>
                      <View style={styles.exerciseNameRow}>
                        <Text style={styles.exerciseName} numberOfLines={1}>
                          {ex.name}
                        </Text>
                        {ex.isCompound && (
                          <View style={styles.compoundBadge}>
                            <Text style={styles.compoundText}>C</Text>
                          </View>
                        )}
                      </View>
                      {ex.progressionNote && (
                        <View style={[
                          styles.progressionBadge,
                          ex.progressionNote.startsWith('↑') && styles.progressionUp,
                          ex.progressionNote.startsWith('↓') && styles.progressionDown,
                        ]}>
                          <TrendingUp size={10} color="#fff" />
                          <Text style={styles.progressionText}>{ex.progressionNote}</Text>
                        </View>
                      )}
                    </View>
                    
                    {/* Sets/Reps and Weight */}
                    <View style={styles.exerciseDetails}>
                      <View style={styles.setsRepsRow}>
                        <Text style={styles.exerciseSets}>
                          {ex.sets} × {ex.reps}
                        </Text>
                        {ex.restTime && (
                          <>
                            <Text style={styles.restSeparator}> • </Text>
                            <Text style={styles.restTime}>Rest: {ex.restTime}</Text>
                          </>
                        )}
                      </View>
                      {ex.suggestedWeight && ex.suggestedWeight > 0 ? (
                        <Text style={[
                          styles.suggestedWeight,
                          ex.progressionNote?.startsWith('↑') && styles.weightUp,
                          ex.progressionNote?.startsWith('↓') && styles.weightDown,
                        ]}>
                          {ex.suggestedWeight} lbs
                        </Text>
                      ) : ex.lastWeight && ex.lastWeight > 0 ? (
                        <Text style={styles.lastWeight}>{ex.lastWeight} lbs</Text>
                      ) : null}
                    </View>
                    
                    {/* Explanation (if enabled) */}
                    {showExplanations && ex.explanation && (
                      <Text style={styles.explanation}>{ex.explanation}</Text>
                    )}
                  </View>
                ))}
              </View>
              
              {/* Toggle Explanations */}
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => {
                  lightHaptic();
                  setShowExplanations(!showExplanations);
                }}
              >
                <Info size={14} color="#64748b" />
                <Text style={styles.toggleText}>
                  {showExplanations ? 'Hide' : 'Show'} Exercise Info
                </Text>
              </TouchableOpacity>
              
              {/* OPTIMIZATION C: Start Workout Button */}
              <TouchableOpacity
                style={styles.startWorkoutButton}
                onPress={handleStartWorkout}
                activeOpacity={0.8}
              >
                <Play size={18} color="#ffffff" fill="#ffffff" />
                <Text style={styles.startWorkoutText}>Start This Workout</Text>
              </TouchableOpacity>
            </>
          ) : noEquipmentWarning ? (
            <View style={styles.noEquipmentWarning}>
              <Text style={styles.noEquipmentText}>
                No exercises found. Set your available equipment in Settings for better recommendations.
              </Text>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => router.push('/settings/profile')}
              >
                <Text style={styles.settingsButtonText}>Go to Settings</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noExercises}>
              <Text style={styles.noExercisesText}>
                No exercises found for this workout type
              </Text>
            </View>
          )}

          {/* Muscle Recovery (Expandable) */}
          {recoveryStatus?.muscleDetails && recoveryStatus.muscleDetails.length > 0 && (
            <>
              <TouchableOpacity
                style={styles.recoveryToggle}
                onPress={() => {
                  lightHaptic();
                  setShowRecovery(!showRecovery);
                }}
              >
                <Text style={styles.recoveryToggleText}>Muscle Recovery</Text>
                {showRecovery ? (
                  <ChevronUp size={16} color="#64748b" />
                ) : (
                  <ChevronDown size={16} color="#64748b" />
                )}
              </TouchableOpacity>

              {showRecovery && (
                <View style={styles.recoverySection}>
                  {getRelevantMuscles().map(muscle => (
                    <View key={muscle.name} style={styles.muscleRow}>
                      <Text style={styles.muscleName}>{muscle.name}</Text>
                      <View style={styles.barContainer}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              width: `${muscle.recoveryPercent}%`,
                              backgroundColor: getRecoveryColor(muscle.recoveryPercent),
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.percentText}>
                        {muscle.recoveryPercent >= 100 ? '✓' : `${muscle.recoveryPercent}%`}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </>
      )}

      {/* No selection prompt */}
      {!selectedType && (
        <View style={styles.noSelectionPrompt}>
          <Text style={styles.noSelectionText}>
            Pick a workout type above to get started
          </Text>
        </View>
      )}
    </View>
  );
}

function getRecoveryColor(percent: number): string {
  if (percent >= 100) return '#22c55e'; // Green
  if (percent >= 75) return '#eab308';  // Yellow
  if (percent >= 40) return '#f97316';  // Orange
  return '#ef4444';                      // Red
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    marginHorizontal: 0,
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  refreshButton: {
    padding: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  restWarning: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  restWarningText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  typeButtonSelected: {
    backgroundColor: '#1e3a5f',
    borderColor: '#3b82f6',
  },
  typeButtonSuggested: {
    borderColor: '#10b981',
    borderStyle: 'dashed',
  },
  suggestedBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  preferredBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 2,
  },
  typeEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  typeNameSelected: {
    color: '#fff',
  },
  workoutPreview: {
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  previewMuscles: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  goalBanner: {
    backgroundColor: '#1e3a5f',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  goalText: {
    fontSize: 12,
    color: '#93c5fd',
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingExercises: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  exercises: {
    gap: 12,
    marginBottom: 12,
  },
  exerciseCard: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseNameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exerciseName: {
    flex: 1,
    fontSize: 14,
    color: '#f1f5f9',
    fontWeight: '600',
  },
  compoundBadge: {
    backgroundColor: '#3b82f6',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compoundText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  progressionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#64748b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  progressionUp: {
    backgroundColor: '#10b981',
  },
  progressionDown: {
    backgroundColor: '#f59e0b',
  },
  progressionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  exerciseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setsRepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseSets: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  restSeparator: {
    fontSize: 13,
    color: '#475569',
  },
  restTime: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
  },
  suggestedWeight: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
  },
  weightUp: {
    color: '#10b981',
  },
  weightDown: {
    color: '#f59e0b',
  },
  lastWeight: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  explanation: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 6,
    fontStyle: 'italic',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 12,
  },
  toggleText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
  },
  startWorkoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  noEquipmentWarning: {
    backgroundColor: '#451a1a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  noEquipmentText: {
    fontSize: 13,
    color: '#fca5a5',
    textAlign: 'center',
    lineHeight: 18,
  },
  settingsButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  settingsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  noExercises: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  noExercisesText: {
    fontSize: 13,
    color: '#64748b',
  },
  recoveryToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  recoveryToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  recoverySection: {
    gap: 8,
    paddingBottom: 12,
  },
  muscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  muscleName: {
    width: 90,
    fontSize: 12,
    color: '#cbd5e1',
  },
  barContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#0f172a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  percentText: {
    width: 32,
    fontSize: 11,
    color: '#64748b',
    textAlign: 'right',
  },
  noSelectionPrompt: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noSelectionText: {
    fontSize: 14,
    color: '#64748b',
  },
});


