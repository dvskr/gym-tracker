import React, { memo, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Plus,
  X,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash2,
  Lightbulb,
  Timer,
} from 'lucide-react-native';
import { WorkoutExercise, WorkoutSet } from '@/stores/workoutStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { SetRow } from './SetRow';
import { InlineRestTimer } from './InlineRestTimer';
import { Card } from '@/components/ui';
import { usePreviousWorkout } from '@/hooks/usePreviousWorkout';
import { lightHaptic, mediumHaptic } from '@/lib/utils/haptics';
import { FormTips, FormTipsContent } from './FormTips';
import { WeightSuggestion } from '@/components/ai/WeightSuggestion';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { getThumbnailUrl } from '@/lib/utils/exerciseImages';

// ============================================
// Types
// ============================================

interface ExerciseCardProps {
  workoutExercise: WorkoutExercise;
  index: number;
  totalExercises: number;
  onAddSet: () => void;
  onUpdateSet: (setId: string, data: Partial<WorkoutSet>) => void;
  onCompleteSet: (setId: string) => void;
  onDeleteSet: (setId: string) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

// ============================================
// Component
// ============================================

const ExerciseCardComponent: React.FC<ExerciseCardProps> = ({
  workoutExercise,
  index,
  totalExercises,
  onAddSet,
  onUpdateSet,
  onCompleteSet,
  onDeleteSet,
  onRemove,
  onMoveUp,
  onMoveDown,
}) => {
  const { exercise, sets } = workoutExercise;
  const { user } = useAuthStore();
  const { showFormTips: showFormTipsEnabled, showProgressiveOverload } = useSettingsStore();
  const weightUnit = useSettingsStore((state) => state.weightUnit);
  const autoStartTimer = useSettingsStore((state) => state.autoStartTimer);
  const showPreviousWorkout = useSettingsStore((state) => state.showPreviousWorkout);
  
  // Get rest timer state and actions
  const { restTimer, startRestTimer } = useWorkoutStore();

  // State for reorder menu
  const [showReorderMenu, setShowReorderMenu] = useState(false);

  // State for form tips collapse
  const [formTipsExpanded, setFormTipsExpanded] = useState(false);

  // State for exercise detail modal
  const [showExerciseDetail, setShowExerciseDetail] = useState(false);

  // Fetch previous workout data for this exercise
  const { data: previousWorkout, getPreviousSet, daysAgo } = usePreviousWorkout(exercise.id);

  // Get completed sets count
  const completedSets = sets.filter((s) => s.isCompleted).length;
  const totalSets = sets.length;
  
  // Check if there are any completed sets and timer is not running
  const hasCompletedSets = completedSets > 0;
  const isTimerActive = restTimer.exerciseId === workoutExercise.id && restTimer.isRunning;
  const showManualStartButton = !autoStartTimer && hasCompletedSets && !isTimerActive;

  // Can move up/down
  const canMoveUp = index > 0;
  const canMoveDown = index < totalExercises - 1;

  // Format days ago text
  const getDaysAgoText = (): string => {
    if (daysAgo === null) return '';
    if (daysAgo === 0) return 'today';
    if (daysAgo === 1) return 'yesterday';
    return `${daysAgo}d ago`;
  };

  // ==========================================
  // Handlers
  // ==========================================

  const handleDragHandlePress = useCallback(() => {
    lightHaptic();
    setShowReorderMenu(true);
  }, []);

  const handleMoveUp = useCallback(() => {
    if (onMoveUp && canMoveUp) {
      mediumHaptic();
      onMoveUp();
    }
    setShowReorderMenu(false);
  }, [onMoveUp, canMoveUp]);

  const handleMoveDown = useCallback(() => {
    if (onMoveDown && canMoveDown) {
      mediumHaptic();
      onMoveDown();
    }
    setShowReorderMenu(false);
  }, [onMoveDown, canMoveDown]);

  const handleRemove = useCallback(() => {
    setShowReorderMenu(false);
    onRemove();
  }, [onRemove]);

  const handleAddSet = useCallback(() => {
    lightHaptic();
    onAddSet();
  }, [onAddSet]);
  
  // Handle manual rest timer start
  const handleStartRestTimer = useCallback(() => {
    lightHaptic();
    startRestTimer(workoutExercise.id);
  }, [startRestTimer, workoutExercise.id]);

  // Handle copying previous values
  const handleCopyPrevious = useCallback((setId: string, setNumber: number) => {
    const prevSet = getPreviousSet(setNumber);
    if (prevSet) {
      if (prevSet.weight != null) {
        onUpdateSet(setId, { weight: prevSet.weight });
      }
      if (prevSet.reps != null) {
        onUpdateSet(setId, { reps: prevSet.reps });
      }
    }
  }, [getPreviousSet, onUpdateSet]);

  // Handle opening exercise detail
  const handleExercisePress = useCallback(() => {
    lightHaptic();
    setShowExerciseDetail(true);
  }, []);

  // Toggle form tips
  const handleToggleFormTips = useCallback(() => {
    lightHaptic();
    setFormTipsExpanded(prev => !prev);
  }, []);

  // Close exercise detail modal
  const handleCloseExerciseDetail = useCallback(() => {
    setShowExerciseDetail(false);
  }, []);

  // Close reorder menu
  const handleCloseReorderMenu = useCallback(() => {
    setShowReorderMenu(false);
  }, []);

  return (
    <Card variant="default" style={styles.card}>
      {/* Exercise Header */}
      <View style={styles.exerciseHeader}>
        {/* Drag Handle */}
        <TouchableOpacity
          style={styles.dragHandle}
          onPress={handleDragHandlePress}
          onLongPress={handleDragHandlePress}
          delayLongPress={200}
          activeOpacity={0.6}
          accessible={true}
          accessibilityLabel={`Reorder ${exercise.name}`}
          accessibilityHint="Opens menu to move exercise up or down"
          accessibilityRole="button"
        >
          <GripVertical size={20} color="#6b7280" />
        </TouchableOpacity>

        {/* Exercise Thumbnail (PNG, not GIF) - Tappable */}
        {exercise.gifUrl && (
          <TouchableOpacity 
            onPress={handleExercisePress} 
            activeOpacity={0.7}
            accessible={true}
            accessibilityLabel={`View ${exercise.name} demonstration`}
            accessibilityRole="button"
          >
            <Image
              source={{ uri: getThumbnailUrl(exercise.gifUrl) }}
              style={styles.gif}
              contentFit="cover"
              cachePolicy="memory-disk"
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
              transition={150}
              accessible={true}
              accessibilityLabel={`${exercise.name} exercise thumbnail`}
            />
          </TouchableOpacity>
        )}

        {/* Exercise Info - Make name tappable */}
        <View 
          style={styles.exerciseInfo}
          accessible={true}
          accessibilityLabel={`${exercise.name}, ${exercise.bodyPart}, ${exercise.equipment}. ${completedSets} of ${totalSets} sets completed`}
        >
          <TouchableOpacity 
            onPress={handleExercisePress} 
            activeOpacity={0.7}
            accessible={true}
            accessibilityLabel={`${exercise.name}. Double tap for exercise details`}
            accessibilityRole="button"
          >
            <Text style={styles.exerciseName} numberOfLines={2}>
              {exercise.name}
            </Text>
          </TouchableOpacity>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {exercise.bodyPart} • {exercise.equipment}
            </Text>
          </View>

          {/* Previous Workout Hint */}
          {showPreviousWorkout && previousWorkout && previousWorkout.sets.length > 0 && (
            <View style={styles.previousHintRow}>
              <Text style={styles.previousHintText}>
                Last: {previousWorkout.sets[0].weight} {weightUnit}  {previousWorkout.sets[0].reps} reps
                {daysAgo !== null && ` (${getDaysAgoText()})`}
              </Text>
            </View>
          )}

          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              {completedSets}/{totalSets} sets
            </Text>
          </View>
        </View>

        {/* Header Actions */}
        <View style={styles.headerActions}>
          {/* Form Tips Button */}
          {showFormTipsEnabled && (
            <TouchableOpacity
              style={styles.formTipsButton}
              onPress={handleToggleFormTips}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessible={true}
              accessibilityLabel={formTipsExpanded ? 'Hide form tips' : 'Show form tips'}
              accessibilityRole="button"
              accessibilityState={{ expanded: formTipsExpanded }}
            >
              <Lightbulb 
                size={20} 
                color="#F59E0B"
                fill={formTipsExpanded ? '#F59E0B' : 'transparent'}
              />
            </TouchableOpacity>
          )}

          {/* Remove Button */}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={onRemove}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessible={true}
            accessibilityLabel={`Remove ${exercise.name} from workout`}
            accessibilityRole="button"
          >
            <X size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Form Tips Dropdown - Expands inline */}
      {showFormTipsEnabled && formTipsExpanded && (
        <FormTipsContent exerciseId={exercise.dbId || exercise.id} />
      )}

      {/* Column Headers */}
      <View style={styles.columnHeader}>
        <Text style={[styles.columnHeaderText, styles.colSet]}>SET</Text>
        {showPreviousWorkout && (
          <Text style={[styles.columnHeaderText, styles.colPrevious]}>PREVIOUS</Text>
        )}
        {/* Dynamic column headers based on measurement type */}
        {(() => {
          const measurementType = exercise.measurementType || 'reps_weight';
          switch (measurementType) {
            case 'time':
              return <Text style={[styles.columnHeaderText, styles.colWeight]}>SEC</Text>;
            case 'time_distance':
              return (
                <>
                  <Text style={[styles.columnHeaderText, styles.colWeight]}>SEC</Text>
                  <Text style={[styles.columnHeaderText, styles.colReps]}>MILES</Text>
                </>
              );
            case 'time_weight':
              return (
                <>
                  <Text style={[styles.columnHeaderText, styles.colWeight]}>SEC</Text>
                  <Text style={[styles.columnHeaderText, styles.colReps]}>LBS</Text>
                </>
              );
            case 'assisted':
              return (
                <>
                  <Text style={[styles.columnHeaderText, styles.colWeight]}>REPS</Text>
                  <Text style={[styles.columnHeaderText, styles.colReps]}>ASSIST</Text>
                </>
              );
            case 'reps_only':
              return <Text style={[styles.columnHeaderText, styles.colWeight]}>REPS</Text>;
            default: // 'reps_weight'
              return (
                <>
                  <Text style={[styles.columnHeaderText, styles.colWeight]}>{weightUnit.toUpperCase()}</Text>
                  <Text style={[styles.columnHeaderText, styles.colReps]}>REPS</Text>
                </>
              );
          }
        })()}
        <View style={styles.colCheck} />
      </View>

      {/* Sets List */}
      <View style={styles.setsContainer}>
        {sets.map((set, idx) => {
          const prevSet = getPreviousSet(set.setNumber);

          return (
            <React.Fragment key={set.id}>
              {/* Show weight suggestion only for first set */}
              {idx === 0 && user && showProgressiveOverload && (
                <View style={styles.suggestionWrapper}>
                  <WeightSuggestion
                    exerciseId={exercise.id}
                    exerciseName={exercise.name}
                    setNumber={set.setNumber}
                    currentWeight={set.weight || 0}
                    onApplyWeight={(weight) => onUpdateSet(set.id, { weight })}
                    onApplyReps={(reps) => onUpdateSet(set.id, { reps })}
                    userId={user.id}
                    units={weightUnit as 'lbs' | 'kg'}
                  />
                </View>
              )}
              
              <SetRow
                setNumber={set.setNumber}
                weight={set.weight?.toString() || ''}
                reps={set.reps?.toString() || ''}
                previousWeight={prevSet?.weight?.toString()}
                previousReps={prevSet?.reps?.toString()}
                isCompleted={set.isCompleted}
                measurementType={exercise.measurementType || 'reps_weight'}
                durationSeconds={set.durationSeconds}
                distanceMeters={set.distanceMeters}
                assistanceWeight={set.assistanceWeight}
                onWeightChange={(value) => {
                  const numValue = parseFloat(value) || 0;
                  // Cap at database max to prevent overflow (precision 7, scale 2 = max 99999.99)
                  const cappedValue = Math.min(numValue, 99999.99);
                  onUpdateSet(set.id, { weight: cappedValue });
                }}
                onRepsChange={(value) => {
                  const numValue = parseInt(value, 10) || 0;
                  // Cap at reasonable max
                  const cappedValue = Math.min(numValue, 9999);
                  onUpdateSet(set.id, { reps: cappedValue });
                }}
                onDurationChange={(value) => {
                  onUpdateSet(set.id, { durationSeconds: value });
                }}
                onDistanceChange={(value) => {
                  onUpdateSet(set.id, { distanceMeters: value });
                }}
                onAssistanceChange={(value) => {
                  onUpdateSet(set.id, { assistanceWeight: value });
                }}
                onPreviousTap={() => handleCopyPrevious(set.id, set.setNumber)}
                onComplete={() => onCompleteSet(set.id)}
                onDelete={() => onDeleteSet(set.id)}
              />
            </React.Fragment>
          );
        })}
      </View>

      {/* Add Set Button */}
      <TouchableOpacity
        style={styles.addSetButton}
        onPress={handleAddSet}
        activeOpacity={0.7}
        accessible={true}
        accessibilityLabel={`Add set to ${exercise.name}. Currently ${totalSets} sets`}
        accessibilityRole="button"
      >
        <Plus size={16} color="#3b82f6" />
        <Text style={styles.addSetText}>Add Set</Text>
      </TouchableOpacity>

      {/* Manual Start Rest Timer Button - Shows only when auto-start is OFF */}
      {showManualStartButton && (
        <TouchableOpacity
          style={styles.startRestButton}
          onPress={handleStartRestTimer}
          activeOpacity={0.7}
        >
          <Timer size={16} color="#22c55e" />
          <Text style={styles.startRestText}>Start Rest Timer</Text>
        </TouchableOpacity>
      )}

      {/* Inline Rest Timer */}
      <InlineRestTimer exerciseId={workoutExercise.id} />

      {/* Exercise Detail Modal */}
      <Modal
        visible={showExerciseDetail}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseExerciseDetail}
      >
        <View style={styles.detailModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleCloseExerciseDetail}
          />
          <View style={styles.detailModalContent}>
            {/* Header */}
            <View style={styles.detailModalHeader}>
              <Text style={styles.detailModalTitle} numberOfLines={2}>
                {exercise.name}
              </Text>
              <TouchableOpacity
                onPress={handleCloseExerciseDetail}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* GIF */}
            {exercise.gifUrl && (
              <Image
                source={{ uri: exercise.gifUrl }}
                style={styles.detailModalGif}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            )}

            {/* Meta Info */}
            <View style={styles.detailModalMeta}>
              <Text style={styles.detailModalMetaText}>
                {exercise.bodyPart} • {exercise.target} • {exercise.equipment}
              </Text>
            </View>

            {/* Instructions */}
            {exercise.instructions && exercise.instructions.length > 0 && (
              <View style={styles.detailModalInstructions}>
                <Text style={styles.detailModalInstructionsTitle}>Instructions</Text>
                {exercise.instructions.map((instruction, idx) => (
                  <Text key={idx} style={styles.detailModalInstructionText}>
                    {idx + 1}. {instruction}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Reorder Menu Modal */}
      <Modal
        visible={showReorderMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseReorderMenu}
      >
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setShowReorderMenu(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle} numberOfLines={1}>
                {exercise.name}
              </Text>
              <Text style={styles.menuSubtitle}>
                Exercise {index + 1} of {totalExercises}
              </Text>
            </View>

            {/* Move Up */}
            <TouchableOpacity
              style={[styles.menuItem, !canMoveUp && styles.menuItemDisabled]}
              onPress={handleMoveUp}
              disabled={!canMoveUp}
            >
              <ChevronUp
                size={20}
                color={canMoveUp ? '#3b82f6' : '#475569'}
              />
              <Text
                style={[
                  styles.menuItemText,
                  !canMoveUp && styles.menuItemTextDisabled,
                ]}
              >
                Move Up
              </Text>
            </TouchableOpacity>

            {/* Move Down */}
            <TouchableOpacity
              style={[styles.menuItem, !canMoveDown && styles.menuItemDisabled]}
              onPress={handleMoveDown}
              disabled={!canMoveDown}
            >
              <ChevronDown
                size={20}
                color={canMoveDown ? '#3b82f6' : '#475569'}
              />
              <Text
                style={[
                  styles.menuItemText,
                  !canMoveDown && styles.menuItemTextDisabled,
                ]}
              >
                Move Down
              </Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            {/* Remove Exercise */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleRemove}
            >
              <Trash2 size={20} color="#ef4444" />
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
                Remove Exercise
              </Text>
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemCancel]}
              onPress={() => setShowReorderMenu(false)}
            >
              <Text style={styles.menuItemTextCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </Card>
  );
};

// ============================================
// Memoization
// ============================================

// Memoize with custom comparison that checks exercise and sets
export const ExerciseCard = memo(ExerciseCardComponent, (prevProps, nextProps) => {
  // Check if exercise data changed
  if (prevProps.workoutExercise.id !== nextProps.workoutExercise.id) return false;
  if (prevProps.workoutExercise.exercise.id !== nextProps.workoutExercise.exercise.id) return false;
  
  // Check if sets changed (length or any set's data)
  const prevSets = prevProps.workoutExercise.sets;
  const nextSets = nextProps.workoutExercise.sets;
  if (prevSets.length !== nextSets.length) return false;
  
  for (let i = 0; i < prevSets.length; i++) {
    if (prevSets[i].id !== nextSets[i].id) return false;
    if (prevSets[i].weight !== nextSets[i].weight) return false;
    if (prevSets[i].reps !== nextSets[i].reps) return false;
    if (prevSets[i].isCompleted !== nextSets[i].isCompleted) return false;
  }
  
  // Check position
  if (prevProps.index !== nextProps.index) return false;
  if (prevProps.totalExercises !== nextProps.totalExercises) return false;
  
  // Callbacks don't need deep comparison - they're stable via useCallback in parent
  return true;
});

ExerciseCard.displayName = 'ExerciseCard';

export default ExerciseCard;

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    padding: 0,
    overflow: 'hidden',
  },

  // Exercise Header
  exerciseHeader: {
    flexDirection: 'row',
    padding: 16,
    paddingLeft: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  dragHandle: {
    width: 32,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },

  gif: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },

  exerciseInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },

  exerciseName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    marginBottom: 2,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  metaText: {
    color: '#64748b',
    fontSize: 12,
    textTransform: 'capitalize',
  },

  previousHintRow: {
    marginTop: 4,
  },

  previousHintText: {
    color: '#6b7280',
    fontSize: 11,
  },

  progressRow: {
    marginTop: 4,
  },

  progressText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: 'bold',
  },

  formTipsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },

  removeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header Actions
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },

  // Column Header
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  columnHeaderText: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  colSet: {
    width: 36,
    textAlign: 'center',
  },

  colPrevious: {
    width: 72,
    textAlign: 'center',
  },

  colWeight: {
    flex: 1,
    textAlign: 'center',
  },

  colReps: {
    flex: 1,
    textAlign: 'center',
  },

  colCheck: {
    width: 40,
  },

  // Sets Container
  setsContainer: {},

  // Suggestion Wrapper
  suggestionWrapper: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  // Add Set Button
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#0f172a',
    gap: 6,
  },

  addSetText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Start Rest Timer Button (Manual)
  startRestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    gap: 8,
  },

  startRestText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  },

  // Reorder Menu
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  menuContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    overflow: 'hidden',
  },

  menuHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    alignItems: 'center',
  },

  menuTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    textAlign: 'center',
  },

  menuSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },

  menuItemDisabled: {
    opacity: 0.5,
  },

  menuItemText: {
    color: '#ffffff',
    fontSize: 15,
  },

  menuItemTextDisabled: {
    color: '#64748b',
  },

  menuItemTextDanger: {
    color: '#ef4444',
  },

  menuDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginHorizontal: 16,
  },

  menuItemCancel: {
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginTop: 8,
  },

  menuItemTextCancel: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
  },

  // Exercise Detail Modal
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  detailModalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },

  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  detailModalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    flex: 1,
    marginRight: 8,
  },

  detailModalGif: {
    width: '100%',
    height: 250,
    backgroundColor: '#0f172a',
  },

  detailModalMeta: {
    padding: 16,
    backgroundColor: '#0f172a',
  },

  detailModalMetaText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    textTransform: 'capitalize',
  },

  detailModalInstructions: {
    padding: 16,
    maxHeight: 200,
  },

  detailModalInstructionsTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  detailModalInstructionText: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
});


