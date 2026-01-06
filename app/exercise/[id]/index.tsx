import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { logger } from '@/lib/utils/logger';
import {
  ArrowLeft,
  Dumbbell,
  Target,
  Trophy,
  TrendingUp,
  Calendar,
  ChevronRight,
  Star,
  ChevronDown,
  ChevronUp,
  Maximize2,
  X,
  PlusCircle,
  Edit2,
  Save,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { useAuthStore } from '@/stores/authStore';
import { useExerciseStore } from '@/stores/exerciseStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { lightHaptic } from '@/lib/utils/haptics';
import { Card, LoadingSpinner, Skeleton } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import {
  getExerciseById,
  getExerciseHistory,
  getExerciseStats,
  Exercise,
  ExerciseHistoryEntry,
  ExerciseStats,
} from '@/lib/api/exercises';
import { useUnits } from '@/hooks/useUnits';
import { getCurrentTab } from '@/lib/navigation/navigationState';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';

// ============================================
// Types
// ============================================

type TabType = 'about' | 'history' | 'charts' | 'records';

// ============================================
// Tab Components
// ============================================

const AboutTab: React.FC<{ 
  exercise: Exercise; 
  stats: ExerciseStats | null;
}> = ({ exercise, stats }) => {
  const [instructionsExpanded, setInstructionsExpanded] = useState(true);
  const [fullScreenInstructions, setFullScreenInstructions] = useState(false);

  return (
    <>
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Personal Records Section */}
        {stats && (stats.bestWeight || stats.bestReps || stats.bestVolume || stats.estimated1RM) && (
          <View style={styles.prSection}>
            <Text style={styles.prSectionTitle}> Your Personal Records</Text>
            
            <View style={styles.prGrid}>
              {/* Max Weight */}
              {stats.bestWeight && (
                <View style={styles.prCard}>
                  <View style={styles.prIconContainer}>
                    <Trophy size={24} color="#fbbf24" />
                  </View>
                  <Text style={styles.prLabel}>Max Weight</Text>
                  <Text style={styles.prValue}>{stats.bestWeight.value} {weightUnit}</Text>
                  {stats.bestWeight.reps && (
                    <Text style={styles.prDetail}>× {stats.bestWeight.reps} reps</Text>
                  )}
                  <Text style={styles.prDate}>
                    {format(new Date(stats.bestWeight.date), 'MMM d, yyyy')}
                  </Text>
                </View>
              )}

              {/* Max Reps */}
              {stats.bestReps && (
                <View style={styles.prCard}>
                  <View style={[styles.prIconContainer, { backgroundColor: '#14532d' }]}>
                    <Dumbbell size={24} color="#22c55e" />
                  </View>
                  <Text style={styles.prLabel}>Max Reps</Text>
                  <Text style={styles.prValue}>{stats.bestReps.value} reps</Text>
                  {stats.bestReps.weight && (
                    <Text style={styles.prDetail}>@ {stats.bestReps.weight} {weightUnit}</Text>
                  )}
                  <Text style={styles.prDate}>
                    {format(new Date(stats.bestReps.date), 'MMM d, yyyy')}
                  </Text>
                </View>
              )}

              {/* Max Volume */}
              {stats.bestVolume && (
                <View style={styles.prCard}>
                  <View style={[styles.prIconContainer, { backgroundColor: '#1e3a5f' }]}>
                    <TrendingUp size={24} color="#3b82f6" />
                  </View>
                  <Text style={styles.prLabel}>Max Volume</Text>
                  <Text style={styles.prValue}>
                    {stats.bestVolume.value.toLocaleString()} {weightUnit}
                  </Text>
                  <Text style={styles.prDetail}>Single Session</Text>
                  <Text style={styles.prDate}>
                    {format(new Date(stats.bestVolume.date), 'MMM d, yyyy')}
                  </Text>
                </View>
              )}

              {/* Estimated 1RM */}
              {stats.estimated1RM && (
                <View style={styles.prCard}>
                  <View style={[styles.prIconContainer, { backgroundColor: '#4c1d95' }]}>
                    <Target size={24} color="#a855f7" />
                  </View>
                  <Text style={styles.prLabel}>Estimated 1RM</Text>
                  <Text style={styles.prValue}>{stats.estimated1RM} {weightUnit}</Text>
                  <Text style={styles.prDetail}>Brzycki Formula</Text>
                  <Text style={styles.prDate}>Current</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Instructions */}
        {exercise.instructions && exercise.instructions.length > 0 && (
          <View style={styles.instructionsContainer}>
            <Pressable 
              style={styles.instructionsHeader}
              onPress={() => setInstructionsExpanded(!instructionsExpanded)}
            >
              <Text style={styles.instructionsTitle}>Instructions</Text>
              <View style={styles.instructionsHeaderRight}>
                <Pressable 
                  style={styles.expandButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    setFullScreenInstructions(true);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Maximize2 size={18} color="#3B82F6" />
                </Pressable>
                {instructionsExpanded ? (
                  <ChevronUp size={24} color="#888" />
                ) : (
                  <ChevronDown size={24} color="#888" />
                )}
              </View>
            </Pressable>
            
            {instructionsExpanded && (
              <ScrollView 
                style={styles.instructionsContent}
                nestedScrollEnabled
              >
                {exercise.instructions.map((instruction, index) => (
                  <View key={index} style={styles.instructionStep}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.instructionText}>{instruction}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Primary Muscles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Primary Muscles</Text>
          <View style={styles.muscleList}>
            {exercise.primary_muscles?.map((muscle, index) => (
              <View key={index} style={styles.muscleBadgePrimary}>
                <Target size={14} color="#22c55e" />
                <Text style={styles.muscleBadgeText}>{muscle}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Secondary Muscles */}
        {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Secondary Muscles</Text>
            <View style={styles.muscleList}>
              {exercise.secondary_muscles.map((muscle, index) => (
                <View key={index} style={styles.muscleBadgeSecondary}>
                  <Text style={styles.muscleBadgeTextSecondary}>{muscle}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Equipment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipment</Text>
          <View style={styles.equipmentContainer}>
            <Dumbbell size={20} color="#3b82f6" />
            <Text style={styles.equipmentText}>{exercise.equipment}</Text>
          </View>
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category</Text>
          <Text style={styles.categoryText}>{exercise.category}</Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Full-Screen Instructions Modal */}
      <Modal 
        visible={fullScreenInstructions} 
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.fullScreenModal} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Instructions</Text>
            <Pressable 
              onPress={() => setFullScreenInstructions(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={28} color="#FFF" />
            </Pressable>
          </View>
          <ScrollView style={styles.modalContent}>
            {exercise.instructions.map((instruction, index) => (
              <View key={index} style={styles.instructionStepLarge}>
                <View style={styles.stepNumberLarge}>
                  <Text style={styles.stepNumberTextLarge}>{index + 1}</Text>
                </View>
                <Text style={styles.instructionTextLarge}>{instruction}</Text>
              </View>
            ))}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const HistoryTab: React.FC<{
  history: ExerciseHistoryEntry[];
  isLoading: boolean;
  exerciseId: string;
}> = ({ history, isLoading, exerciseId }) => {
  if (isLoading) {
    return (
      <View style={styles.tabContent}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.historyItemSkeleton}>
            <Skeleton width="40%" height={16} />
            <Skeleton width="60%" height={14} style={styles.skeletonMt8} />
            <Skeleton width="80%" height={12} style={styles.skeletonMt4} />
          </View>
        ))}
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Calendar size={48} color="#334155" />
        <Text style={styles.emptyTitle}>No history yet</Text>
        <Text style={styles.emptySubtitle}>
          Complete a workout with this exercise to see your history
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {/* View Full History Link */}
      <TouchableOpacity
        style={styles.viewFullHistoryButton}
        onPress={() => router.push(`/exercise/${exerciseId}/history`)}
      >
        <Text style={styles.viewFullHistoryText}>View Full History</Text>
        <ChevronRight size={18} color="#3b82f6" />
      </TouchableOpacity>

      <View>
        {history.slice(0, 5).map((item) => (
          <TouchableOpacity
            key={item.workoutId}
            style={styles.historyItem}
            onPress={() => router.push(`/workout/${item.workoutId}`)}
            activeOpacity={0.7}
          >
            <View style={styles.historyHeader}>
              <Text style={styles.historyDate}>
                {format(new Date(item.date), 'MMM d, yyyy')}
              </Text>
              <ChevronRight size={18} color="#475569" />
            </View>
            <Text style={styles.historyWorkoutName}>{item.workoutName}</Text>
            <View style={styles.historySets}>
              {item.sets.slice(0, 4).map((set, index) => (
                <Text key={index} style={styles.historySetText}>
                  {set.weight} {weightUnit}  {set.reps}
                  {index < Math.min(item.sets.length, 4) - 1 ? '  •  ' : ''}
                </Text>
              ))}
              {item.sets.length > 4 && (
                <Text style={styles.historySetText}> +{item.sets.length - 4} more</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const ChartsTab: React.FC<{ history: ExerciseHistoryEntry[] }> = ({ history }) => {
  if (history.length < 2) {
    return (
      <View style={styles.emptyState}>
        <TrendingUp size={48} color="#334155" />
        <Text style={styles.emptyTitle}>Not enough data</Text>
        <Text style={styles.emptySubtitle}>
          Complete at least 2 workouts to see progress charts
        </Text>
      </View>
    );
  }

  const chartData = history
    .slice(0, 10) // Last 10 sessions
    .slice()
    .reverse()
    .map((h) => {
      const maxWeight = Math.max(...h.sets.map((s) => s.weight));
      return {
        date: format(new Date(h.date), 'M/d'),
        maxWeight,
        totalVolume: h.totalVolume,
      };
    });

  const maxWeightPeak = Math.max(...chartData.map((d) => d.maxWeight));
  const maxVolumePeak = Math.max(...chartData.map((d) => d.totalVolume));

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Max Weight Chart */}
      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>Max Weight Over Time</Text>
        <View style={styles.chartContainer}>
          <View style={styles.chartYAxis}>
            <Text style={styles.chartYLabel}>{maxWeightPeak} {weightUnit}</Text>
            <Text style={styles.chartYLabel}>{Math.round(maxWeightPeak / 2)} {weightUnit}</Text>
            <Text style={styles.chartYLabel}>0</Text>
          </View>
          <View style={styles.chartBars}>
            {chartData.map((d, i) => (
              <View key={i} style={styles.chartBarContainer}>
                <View
                  style={[
                    styles.chartBar,
                    {
                      height: `${(d.maxWeight / maxWeightPeak) * 100}%`,
                      backgroundColor: '#3b82f6',
                    },
                  ]}
                />
                <Text style={styles.chartXLabel}>{d.date}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Volume Chart */}
      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>Total Volume Per Session</Text>
        <View style={styles.chartContainer}>
          <View style={styles.chartYAxis}>
            <Text style={styles.chartYLabel}>{maxVolumePeak.toLocaleString()}</Text>
            <Text style={styles.chartYLabel}>{Math.round(maxVolumePeak / 2).toLocaleString()}</Text>
            <Text style={styles.chartYLabel}>0</Text>
          </View>
          <View style={styles.chartBars}>
            {chartData.map((d, i) => (
              <View key={i} style={styles.chartBarContainer}>
                <View
                  style={[
                    styles.chartBar,
                    {
                      height: `${(d.totalVolume / maxVolumePeak) * 100}%`,
                      backgroundColor: '#22c55e',
                    },
                  ]}
                />
                <Text style={styles.chartXLabel}>{d.date}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const RecordsTab: React.FC<{
  stats: ExerciseStats;
  isLoading: boolean;
}> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <View style={styles.tabContent}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.recordCardSkeleton}>
            <Skeleton width={40} height={40} borderRadius={20} />
            <View style={styles.skeletonFlexContent}>
              <Skeleton width="50%" height={14} />
              <Skeleton width="70%" height={24} style={styles.skeletonMt4} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  const hasRecords = stats.bestWeight || stats.bestVolume || stats.bestReps;

  if (!hasRecords) {
    return (
      <View style={styles.emptyState}>
        <Trophy size={48} color="#334155" />
        <Text style={styles.emptyTitle}>No records yet</Text>
        <Text style={styles.emptySubtitle}>
          Complete workouts to set personal records
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Max Weight */}
      {stats.bestWeight && (
        <Card style={styles.recordCard}>
          <View style={styles.recordIcon}>
            <Trophy size={24} color="#fbbf24" />
          </View>
          <View style={styles.recordInfo}>
            <Text style={styles.recordLabel}>Max Weight</Text>
            <Text style={styles.recordValue}>{stats.bestWeight.value} {weightUnit}</Text>
            <Text style={styles.recordDate}>
              {format(new Date(stats.bestWeight.date), 'MMM d, yyyy')}
            </Text>
          </View>
        </Card>
      )}

      {/* Max Volume */}
      {stats.bestVolume && (
        <Card style={styles.recordCard}>
          <View style={[styles.recordIcon, { backgroundColor: '#1e3a5f' }]}>
            <TrendingUp size={24} color="#3b82f6" />
          </View>
          <View style={styles.recordInfo}>
            <Text style={styles.recordLabel}>Max Volume (Single Session)</Text>
            <Text style={styles.recordValue}>
              {stats.bestVolume.value.toLocaleString()} {weightUnit}
            </Text>
            <Text style={styles.recordDate}>
              {format(new Date(stats.bestVolume.date), 'MMM d, yyyy')}
            </Text>
          </View>
        </Card>
      )}

      {/* Max Reps */}
      {stats.bestReps && (
        <Card style={styles.recordCard}>
          <View style={[styles.recordIcon, { backgroundColor: '#14532d' }]}>
            <Dumbbell size={24} color="#22c55e" />
          </View>
          <View style={styles.recordInfo}>
            <Text style={styles.recordLabel}>
              Max Reps at {stats.bestReps.weight} {weightUnit}
            </Text>
            <Text style={styles.recordValue}>{stats.bestReps.value} reps</Text>
            <Text style={styles.recordDate}>
              {format(new Date(stats.bestReps.date), 'MMM d, yyyy')}
            </Text>
          </View>
        </Card>
      )}

      {/* Estimated 1RM */}
      {stats.estimated1RM && (
        <Card style={styles.recordCard}>
          <View style={[styles.recordIcon, { backgroundColor: '#4c1d95' }]}>
            <Target size={24} color="#a855f7" />
          </View>
          <View style={styles.recordInfo}>
            <Text style={styles.recordLabel}>Estimated 1RM</Text>
            <Text style={styles.recordValue}>{stats.estimated1RM} {weightUnit}</Text>
            <Text style={styles.recordDate}>Based on Brzycki formula</Text>
          </View>
        </Card>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

// ============================================
// Main Component
// ============================================

export default function ExerciseDetailScreen() {
  useBackNavigation(); // Enable Android back gesture support

  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const { user } = useAuthStore();
  const { isFavorite, toggleFavorite, loadFavorites } = useExerciseStore();
  const { currentWorkout, addExerciseToWorkout } = useWorkoutStore();
  const { weightUnit, unitSystem } = useUnits();
  
  // Helper to convert weight from DB unit to user's preferred unit
  const convertWeight = (weight: number, dbUnit?: string): number => {
    const targetUnit = unitSystem === 'metric' ? 'kg' : 'lbs';
    const sourceUnit = dbUnit || 'lbs';
    if (sourceUnit === targetUnit) return weight;
    if (targetUnit === 'kg' && sourceUnit === 'lbs') return weight * 0.453592;
    if (targetUnit === 'lbs' && sourceUnit === 'kg') return weight * 2.20462;
    return weight;
  };

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [stats, setStats] = useState<ExerciseStats | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('about');
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [personalNotes, setPersonalNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesId, setNotesId] = useState<string | null>(null);

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  // Fetch exercise details
  useEffect(() => {
    if (id) {
      fetchExercise();
    }
  }, [id]);

  // Fetch history when tab changes or user available
  useEffect(() => {
    if (exercise && user?.id && (activeTab === 'history' || activeTab === 'charts' || activeTab === 'records')) {
      fetchHistoryAndStats();
    }
  }, [exercise, user?.id, activeTab]);

  const fetchExercise = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await getExerciseById(id);
      setExercise(data);
    } catch (error) {
 logger.error('Failed to fetch exercise:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistoryAndStats = async () => {
    if (!id || !user?.id) return;

    setIsHistoryLoading(true);
    try {
      const [historyData, statsData] = await Promise.all([
        getExerciseHistory(user.id, id),
        getExerciseStats(user.id, id),
      ]);
      setHistory(historyData);
      setStats(statsData);
    } catch (error) {
 logger.error('Failed to fetch history:', error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'about', label: 'About' },
    { key: 'history', label: 'History' },
    { key: 'charts', label: 'Charts' },
    { key: 'records', label: 'Records' },
  ];

  // Handle toggle favorite
  const handleToggleFavorite = () => {
    if (id) {
      lightHaptic();
      toggleFavorite(id);
    }
  };

  // Load personal notes
  useEffect(() => {
    loadPersonalNotes();
  }, [exercise?.id, user?.id]);

  const loadPersonalNotes = async () => {
    if (!user?.id || !exercise?.id) return;

    try {
      const { data, error } = await supabase
        .from('exercise_notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('exercise_id', exercise.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPersonalNotes(data.notes || '');
        setNotesId(data.id);
      }
    } catch (error) {
 logger.error('Error loading notes:', error);
    }
  };

  const savePersonalNotes = async () => {
    if (!user?.id || !exercise?.id) {
      Alert.alert('Error', 'You must be logged in to save notes');
      return;
    }

    setIsSavingNotes(true);
    lightHaptic();

    try {
      if (notesId) {
        // Update existing notes
        if (personalNotes.trim()) {
          const { error } = await supabase
            .from('exercise_notes')
            .update({ notes: personalNotes.trim() })
            .eq('id', notesId);

          if (error) throw error;
        } else {
          // Delete if empty
          const { error } = await supabase
            .from('exercise_notes')
            .delete()
            .eq('id', notesId);

          if (error) throw error;
          setNotesId(null);
        }
      } else if (personalNotes.trim()) {
        // Insert new notes
        const { data, error } = await supabase
          .from('exercise_notes')
          .insert({
            user_id: user.id,
            exercise_id: exercise.id,
            notes: personalNotes.trim(),
          })
          .select()
          .single();

        if (error) throw error;
        setNotesId(data.id);
      }

      setIsNotesModalOpen(false);
      lightHaptic();
    } catch (error) {
 logger.error('Error saving notes:', error);
      Alert.alert('Error', 'Failed to save notes. Please try again.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Handle add to current workout
  const addExerciseToCurrentWorkout = () => {
    if (!exercise || !currentWorkout) return;
    lightHaptic();
    addExerciseToWorkout(exercise.id);
    router.push('/workout/active');
  };

  const favorited = id ? isFavorite(id) : false;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <LoadingSpinner fullScreen message="Loading exercise..." />
      </SafeAreaView>
    );
  }

  if (!exercise) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Exercise not found</Text>
          <TouchableOpacity style={styles.backButtonError} onPress={() => {
            const currentTab = getCurrentTab();
            const backTo = (returnTo as string) || currentTab || '/(tabs)';
            router.push(backTo);
          }}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          const currentTab = getCurrentTab();
          const backTo = (returnTo as string) || currentTab || '/(tabs)';
          router.push(backTo);
        }}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={() => {
              lightHaptic();
              setIsNotesModalOpen(true);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Edit2
              size={22}
              color={personalNotes ? '#3b82f6' : '#64748b'}
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={handleToggleFavorite}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Star
              size={24}
              color={favorited ? '#fbbf24' : '#64748b'}
              fill={favorited ? '#fbbf24' : 'transparent'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Exercise GIF Card - Prominent Display */}
      <View style={styles.gifSection}>
        <View style={styles.gifCard}>
          {exercise.gif_url ? (
            <Image
              source={{ uri: exercise.gif_url }}
              style={styles.exerciseGif}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.gifPlaceholder}>
              <Dumbbell size={48} color="#64748b" />
              <Text style={styles.gifPlaceholderText}>No preview available</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.tabContentContainer}>
        {activeTab === 'about' && (
          <AboutTab 
            exercise={exercise} 
            stats={stats}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab 
            history={history} 
            isLoading={isHistoryLoading} 
            exerciseId={id!}
          />
        )}
        {activeTab === 'charts' && <ChartsTab history={history} />}
        {activeTab === 'records' && (
          <RecordsTab 
            stats={stats || { totalTimesPerformed: 0, lastPerformed: null, bestWeight: null, bestVolume: null, bestReps: null, estimated1RM: null, totalVolume: 0, averageSetsPerSession: 0 }} 
            isLoading={isHistoryLoading} 
          />
        )}
      </View>

      {/* Quick Add Button (if workout is active) */}
      {currentWorkout && (
        <View style={styles.quickAddContainer}>
          <Pressable 
            style={styles.quickAddButton}
            onPress={addExerciseToCurrentWorkout}
          >
            <PlusCircle size={18} color="#3B82F6" />
            <Text style={styles.quickAddText}>Quick Add to Workout</Text>
          </Pressable>
        </View>
      )}

      {/* Personal Notes Modal */}
      <Modal
        visible={isNotesModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsNotesModalOpen(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Pressable
              onPress={() => setIsNotesModalOpen(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color="#ffffff" />
            </Pressable>
            <Text style={styles.modalTitle}>Personal Notes</Text>
            <Pressable
              onPress={savePersonalNotes}
              disabled={isSavingNotes}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.modalSaveButton, isSavingNotes && styles.modalSaveButtonDisabled]}>
                {isSavingNotes ? 'Saving...' : 'Save'}
              </Text>
            </Pressable>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <ScrollView>
              <Text style={styles.modalLabel}>
                Add your own form cues, setup tips, or personal reminders
              </Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Examples:&#10;• Keep elbows tucked at 45°&#10;• Drive through heels&#10;• Chest up, shoulders back&#10;• Bar should touch mid-chest"
                placeholderTextColor="#64748b"
                value={personalNotes}
                onChangeText={setPersonalNotes}
                multiline
                numberOfLines={15}
                textAlignVertical="top"
                autoFocus
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  headerIconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  gifSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  gifCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative', // Enable absolute positioning for play button
  },

  exerciseGif: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#0f172a',
  },

  gifPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  gifPlaceholderText: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 8,
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },

  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },

  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },

  tabText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: 'bold',
  },

  tabTextActive: {
    color: '#3b82f6',
  },

  tabContentContainer: {
    flex: 1,
  },

  tabContent: {
    flex: 1,
    padding: 16,
    paddingBottom: 140, // Extra space for FAB (accounts for both buttons)
  },

  // About Tab
  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  // Personal Records Section
  prSection: {
    marginBottom: 24,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#fbbf24',
  },

  prSectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },

  prGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },

  prCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 150,
    flex: 1,
    maxWidth: '48%',
    borderWidth: 1,
    borderColor: '#334155',
  },

  prIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#422006',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  prLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  prValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },

  prDetail: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },

  prDate: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '500',
  },

  // Enhanced Instructions Section
  instructionsContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },

  instructionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2A2A2A',
  },

  instructionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  instructionsHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  expandButton: {
    padding: 4,
  },

  instructionsContent: {
    maxHeight: 400,
    padding: 16,
  },

  instructionStep: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },

  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },

  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  instructionText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#E5E5E5',
    fontWeight: '400',
  },

  // Full-Screen Modal
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#020617',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  modalContent: {
    flex: 1,
    padding: 20,
  },

  instructionStepLarge: {
    flexDirection: 'row',
    marginBottom: 28,
    alignItems: 'flex-start',
  },

  stepNumberLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    flexShrink: 0,
  },

  stepNumberTextLarge: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  instructionTextLarge: {
    flex: 1,
    fontSize: 18,
    lineHeight: 28,
    color: '#E5E5E5',
    fontWeight: '400',
  },

  // Deprecated styles (kept for backwards compatibility)
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },

  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  instructionNumberText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  muscleList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  muscleBadgePrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14532d',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },

  muscleBadgeText: {
    color: '#22c55e',
    fontSize: 13,
    textTransform: 'capitalize',
  },

  muscleBadgeSecondary: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },

  muscleBadgeTextSecondary: {
    color: '#94a3b8',
    fontSize: 13,
    textTransform: 'capitalize',
  },

  equipmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  equipmentText: {
    color: '#ffffff',
    fontSize: 15,
    textTransform: 'capitalize',
  },

  categoryText: {
    color: '#94a3b8',
    fontSize: 15,
    textTransform: 'capitalize',
  },

  // History Tab
  viewFullHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 4,
  },

  viewFullHistoryText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
  },

  historyItem: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  historyItemSkeleton: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  historyDate: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  historyWorkoutName: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 8,
  },

  historySets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  historySetText: {
    color: '#94a3b8',
    fontSize: 13,
  },

  // Charts Tab
  chartSection: {
    marginBottom: 32,
  },

  chartTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },

  chartContainer: {
    flexDirection: 'row',
    height: 200,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },

  chartYAxis: {
    width: 50,
    justifyContent: 'space-between',
    paddingRight: 8,
  },

  chartYLabel: {
    color: '#64748b',
    fontSize: 10,
    textAlign: 'right',
  },

  chartBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },

  chartBarContainer: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },

  chartBar: {
    width: '80%',
    borderRadius: 4,
    minHeight: 4,
  },

  chartXLabel: {
    color: '#64748b',
    fontSize: 9,
    marginTop: 4,
  },

  // Records Tab
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
  },

  recordCardSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
  },

  recordIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#422006',
    alignItems: 'center',
    justifyContent: 'center',
  },

  recordInfo: {
    flex: 1,
    marginLeft: 16,
  },

  recordLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 2,
  },

  recordValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },

  recordDate: {
    color: '#475569',
    fontSize: 11,
    marginTop: 2,
  },

  // Empty States
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },

  emptyTitle: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },

  emptySubtitle: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
  },

  // Error
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorText: {
    color: '#94a3b8',
    fontSize: 16,
    marginBottom: 16,
  },

  backButtonError: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },

  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  bottomSpacer: {
    height: 40,
  },

  // Quick Add Button (bottom of screen)
  quickAddContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },

  quickAddButton: {
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  quickAddText: {
    color: '#3B82F6',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Personal Notes Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#020617',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },

  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },

  modalSaveButton: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },

  modalSaveButtonDisabled: {
    color: '#64748b',
  },

  modalContent: {
    flex: 1,
    padding: 16,
  },

  modalLabel: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },

  modalTextInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 24,
    minHeight: 300,
    borderWidth: 1,
    borderColor: '#334155',
  },

  // Skeleton helper styles
  skeletonMt4: {
    marginTop: 4,
  },

  skeletonMt8: {
    marginTop: 8,
  },

  skeletonFlexContent: {
    flex: 1,
    marginLeft: 12,
  },
});

