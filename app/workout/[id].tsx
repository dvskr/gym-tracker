import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { logger } from '@/lib/utils/logger';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Dumbbell,
  TrendingUp,
  Star,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Play,
  Trash2,
  Share2,
  FileText,
  Edit3,
  Trophy,
  Repeat,
} from 'lucide-react-native';
import { format } from 'date-fns';
import {
  getWorkoutById,
  deleteWorkout,
  updateWorkout,
  WorkoutDetail,
} from '@/lib/api/workouts';
import { LoadingSpinner } from '@/components/ui';
import { useWorkoutStore } from '@/stores/workoutStore';
import { lightHaptic, successHaptic, mediumHaptic } from '@/lib/utils/haptics';
import {
  exportWorkout,
  shareWorkout,
  convertToExportable,
} from '@/lib/utils/export';
import { useUnits } from '@/hooks/useUnits';

// ============================================
// Types
// ============================================

interface ExerciseCardProps {
  exercise: WorkoutDetail['workout_exercises'][0];
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  weightUnit: string;
}

// ============================================
// Exercise Card Component
// ============================================

const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  index,
  isExpanded,
  onToggle,
  weightUnit,
}) => {
  const [heightAnim] = useState(new Animated.Value(isExpanded ? 1 : 0));

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);

  const completedSets = exercise.workout_sets?.filter((s) => s.is_completed) || [];
  const totalVolume = completedSets.reduce(
    (sum, set) => sum + (set.weight || 0) * (set.reps || 0),
    0
  );

  return (
    <View style={styles.exerciseCard}>
      <TouchableOpacity
        style={styles.exerciseHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.exerciseNumberBadge}>
          <Text style={styles.exerciseNumber}>{index + 1}</Text>
        </View>

        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName} numberOfLines={1}>
            {exercise.exercises?.name || 'Unknown Exercise'}
          </Text>
          <Text style={styles.exerciseMeta}>
            {exercise.exercises?.equipment || 'No equipment'} •{' '}
            {completedSets.length} sets • {totalVolume.toLocaleString()} {weightUnit}
          </Text>
        </View>

        {isExpanded ? (
          <ChevronUp size={20} color="#64748b" />
        ) : (
          <ChevronDown size={20} color="#64748b" />
        )}
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.exerciseContent}>
          {/* Sets Table */}
          <View style={styles.setsContainer}>
            <View style={styles.setsHeader}>
              <Text style={[styles.setHeaderText, styles.setColumn]}>SET</Text>
              <Text style={[styles.setHeaderText, styles.weightColumn]}>WEIGHT</Text>
              <Text style={[styles.setHeaderText, styles.repsColumn]}>REPS</Text>
            </View>

            {completedSets
              .sort((a, b) => a.set_number - b.set_number)
              .map((set) => (
                <View key={set.id} style={styles.setRow}>
                  <View style={[styles.setColumn, styles.setNumberCell]}>
                    <Text style={styles.setNumberText}>{set.set_number}</Text>
                    {set.set_type && set.set_type !== 'normal' && (
                      <View
                        style={[
                          styles.setTypeBadge,
                          set.set_type === 'warmup' && styles.warmupBadge,
                          set.set_type === 'failure' && styles.failureBadge,
                          set.set_type === 'dropset' && styles.dropsetBadge,
                        ]}
                      >
                        <Text style={styles.setTypeText}>
                          {set.set_type === 'warmup'
                            ? 'W'
                            : set.set_type === 'failure'
                            ? 'F'
                            : 'D'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.setValue, styles.weightColumn]}>
                    {set.weight || 0} {set.weight_unit}
                  </Text>
                  <Text style={[styles.setValue, styles.repsColumn]}>
                    {set.reps || 0}
                  </Text>
                </View>
              ))}
          </View>

          {/* Notes */}
          {exercise.notes && (
            <View style={styles.exerciseNotes}>
              <Text style={styles.exerciseNotesText}>{exercise.notes}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// ============================================
// Main Component
// ============================================

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { startWorkout, addExerciseWithSets } = useWorkoutStore();
  const { weightUnit } = useUnits();

  // State
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  // Fetch workout
  useEffect(() => {
    if (id) {
      // Validate UUID format before fetching
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
 logger.warn(`Invalid workout ID: ${id}`);
        setIsLoading(false);
        setWorkout(null);
        return;
      }
      fetchWorkout();
    }
  }, [id]);

  const fetchWorkout = async () => {
    try {
      const data = await getWorkoutById(id!);
      setWorkout(data);
      if (data) {
        setEditedName(data.name || 'Workout');
        // Expand first exercise by default
        if (data.workout_exercises?.length > 0) {
          setExpandedExercises(new Set([data.workout_exercises[0].id]));
        }
      }
    } catch (error) {
 logger.error('Failed to fetch workout:', error);
      Alert.alert('Error', 'Failed to load workout');
    } finally {
      setIsLoading(false);
    }
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins} min`;
  };

  // Toggle exercise expansion
  const toggleExercise = (exerciseId: string) => {
    lightHaptic();
    setExpandedExercises((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
      }
      return newSet;
    });
  };

  // Handle name edit
  const handleSaveName = async () => {
    if (!workout || !editedName.trim()) return;

    try {
      await updateWorkout(id!, { name: editedName.trim() });
      setWorkout({ ...workout, name: editedName.trim() });
      setIsEditingName(false);
      successHaptic();
    } catch (error) {
 logger.error('Failed to update name:', error);
      Alert.alert('Error', 'Failed to update workout name');
    }
  };

  // Handle delete
  const handleDelete = () => {
    setShowMenu(false);
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            mediumHaptic();
            try {
              await deleteWorkout(id!);
              router.back();
            } catch (error) {
 logger.error('Failed to delete workout:', error);
              Alert.alert('Error', 'Failed to delete workout');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Handle repeat workout
  const handleRepeatWorkout = () => {
    if (!workout) return;

    successHaptic();
    startWorkout(workout.name || 'Workout');

    // Add all exercises with their sets
    workout.workout_exercises
      ?.sort((a, b) => a.order_index - b.order_index)
      .forEach((we) => {
        if (we.exercises) {
          const prefillSets = we.workout_sets
            ?.filter((s) => s.is_completed)
            .sort((a, b) => a.set_number - b.set_number)
            .map((s) => ({
              weight: s.weight || undefined,
              reps: s.reps || undefined,
            })) || [];

          addExerciseWithSets(
            {
              id: we.exercises.id,
              name: we.exercises.name,
              bodyPart: '',
              equipment: we.exercises.equipment || '',
              gifUrl: we.exercises.gif_url || undefined,
              target: '',
            },
            prefillSets,
            prefillSets.length || 3
          );
        }
      });

    router.push('/workout/active');
  };

  // Handle share
  const handleShare = async () => {
    if (!workout) return;
    setShowMenu(false);

    try {
      const exportable = convertToExportable(workout);
      await shareWorkout(exportable, 'text');
    } catch (error) {
 logger.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share workout');
    }
  };

  // Handle export CSV
  const handleExportCSV = async () => {
    if (!workout) return;
    setShowMenu(false);

    try {
      const exportable = convertToExportable(workout);
      await exportWorkout(exportable, 'csv');
    } catch (error) {
 logger.error('Error exporting CSV:', error);
      Alert.alert('Error', 'Failed to export workout');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <LoadingSpinner fullScreen message="Loading workout..." />
      </SafeAreaView>
    );
  }

  // Not found state
  if (!workout) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Workout not found</Text>
          <TouchableOpacity style={styles.backButtonLarge} onPress={() => router.back()}>
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
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() => {
            lightHaptic();
            setIsEditingName(true);
          }}
        >
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {workout.name || 'Workout'}
            </Text>
            <Edit3 size={14} color="#64748b" />
          </View>
          <Text style={styles.headerDate}>
            {format(new Date(workout.started_at), 'EEEE, MMMM d, yyyy')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            lightHaptic();
            setShowMenu(true);
          }}
        >
          <MoreVertical size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>WORKOUT SUMMARY</Text>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Calendar size={18} color="#3b82f6" />
              <Text style={styles.summaryValue}>
                {format(new Date(workout.started_at), 'MMM d, yyyy')}
              </Text>
              <Text style={styles.summaryLabel}>Date</Text>
            </View>

            <View style={styles.summaryItem}>
              <Clock size={18} color="#22c55e" />
              <Text style={styles.summaryValue}>
                {formatDuration(workout.duration_seconds)}
              </Text>
              <Text style={styles.summaryLabel}>Duration</Text>
            </View>

            <View style={styles.summaryItem}>
              <TrendingUp size={18} color="#a855f7" />
              <Text style={styles.summaryValue}>
                {workout.total_volume.toLocaleString()}
              </Text>
              <Text style={styles.summaryLabel}>Volume ({weightUnit})</Text>
            </View>

            <View style={styles.summaryItem}>
              <Dumbbell size={18} color="#f59e0b" />
              <Text style={styles.summaryValue}>{workout.total_sets}</Text>
              <Text style={styles.summaryLabel}>Total Sets</Text>
            </View>
          </View>

          {/* Rating */}
          {workout.rating && workout.rating > 0 && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Rating:</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={18}
                    color={star <= workout.rating! ? '#fbbf24' : '#334155'}
                    fill={star <= workout.rating! ? '#fbbf24' : 'transparent'}
                  />
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Exercises Section */}
        <View style={styles.exercisesSection}>
          <Text style={styles.sectionTitle}>
            EXERCISES ({workout.workout_exercises?.length || 0})
          </Text>

          {workout.workout_exercises
            ?.sort((a, b) => a.order_index - b.order_index)
            .map((we, index) => (
              <ExerciseCard
                key={we.id}
                exercise={we}
                index={index}
                isExpanded={expandedExercises.has(we.id)}
                onToggle={() => toggleExercise(we.id)}
                weightUnit={weightUnit}
              />
            ))}
        </View>

        {/* Notes */}
        {workout.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>NOTES</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{workout.notes}</Text>
            </View>
          </View>
        )}

        {/* Bottom Spacer for button */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.repeatButton}
          onPress={handleRepeatWorkout}
          activeOpacity={0.8}
        >
          <Repeat size={20} color="#ffffff" />
          <Text style={styles.repeatButtonText}>Repeat Workout</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Name Modal */}
      <Modal
        visible={isEditingName}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEditingName(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsEditingName(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Workout Name</Text>

            <TextInput
              style={styles.modalInput}
              value={editedName}
              onChangeText={setEditedName}
              placeholder="Workout name"
              placeholderTextColor="#64748b"
              autoFocus={true}
              selectTextOnFocus={true}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setIsEditingName(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveName}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContent}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setIsEditingName(true);
              }}
            >
              <Edit3 size={20} color="#f1f5f9" />
              <Text style={styles.menuItemText}>Edit Workout</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleShare}>
              <Share2 size={20} color="#f1f5f9" />
              <Text style={styles.menuItemText}>Share Workout</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleExportCSV}>
              <FileText size={20} color="#f1f5f9" />
              <Text style={styles.menuItemText}>Export to CSV</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDestructive]}
              onPress={handleDelete}
            >
              <Trash2 size={20} color="#ef4444" />
              <Text style={[styles.menuItemText, styles.menuItemTextDestructive]}>
                Delete Workout
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },

  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  headerDate: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },

  summaryTitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 16,
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },

  summaryItem: {
    width: '45%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    gap: 6,
  },

  summaryValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  summaryLabel: {
    color: '#64748b',
    fontSize: 11,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 12,
  },

  ratingLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },

  ratingStars: {
    flexDirection: 'row',
    gap: 4,
  },

  // Exercises Section
  exercisesSection: {
    marginBottom: 24,
  },

  sectionTitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 12,
  },

  // Exercise Card
  exerciseCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },

  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },

  exerciseNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  exerciseNumber: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  exerciseInfo: {
    flex: 1,
  },

  exerciseName: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },

  exerciseMeta: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },

  exerciseContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Sets Table
  setsContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    overflow: 'hidden',
  },

  setsHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#334155',
  },

  setHeaderText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  setColumn: {
    width: 60,
    textAlign: 'center',
  },

  weightColumn: {
    flex: 1,
    textAlign: 'center',
  },

  repsColumn: {
    width: 60,
    textAlign: 'center',
  },

  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  setNumberCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  setNumberText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
  },

  setTypeBadge: {
    width: 18,
    height: 18,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  warmupBadge: {
    backgroundColor: '#f59e0b',
  },

  failureBadge: {
    backgroundColor: '#ef4444',
  },

  dropsetBadge: {
    backgroundColor: '#a855f7',
  },

  setTypeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  setValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  exerciseNotes: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },

  exerciseNotesText: {
    color: '#94a3b8',
    fontSize: 13,
    fontStyle: 'italic',
  },

  // Notes Section
  notesSection: {
    marginBottom: 24,
  },

  notesCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },

  notesText: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },

  bottomSpacer: {
    height: 80,
  },

  // Bottom Actions
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#020617',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },

  repeatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },

  repeatButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Edit Name Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },

  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },

  modalInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },

  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },

  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
  },

  modalCancelText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: 'bold',
  },

  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },

  modalSaveText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Menu Modal
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },

  menuContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 8,
    paddingBottom: 40,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    borderRadius: 12,
  },

  menuItemText: {
    color: '#f1f5f9',
    fontSize: 16,
  },

  menuItemDestructive: {
    marginTop: 4,
  },

  menuItemTextDestructive: {
    color: '#ef4444',
  },

  menuDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 8,
    marginHorizontal: 16,
  },

  // Error State
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

  backButtonLarge: {
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
});
