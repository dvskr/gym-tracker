import React, { memo, useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import {
  Plus,
  X,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash2,
} from 'lucide-react-native';
import { WorkoutExercise, WorkoutSet } from '@/stores/workoutStore';
import { SetRow } from './SetRow';
import { InlineRestTimer } from './InlineRestTimer';
import { Card } from '@/components/ui';
import { usePreviousWorkout } from '@/hooks/usePreviousWorkout';
import { lightHaptic, mediumHaptic } from '@/lib/utils/haptics';

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

  // State for reorder menu
  const [showReorderMenu, setShowReorderMenu] = useState(false);

  // Fetch previous workout data for this exercise
  const { data: previousWorkout, getPreviousSet, daysAgo } = usePreviousWorkout(exercise.id);

  // Get completed sets count
  const completedSets = sets.filter((s) => s.isCompleted).length;
  const totalSets = sets.length;

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
        >
          <GripVertical size={20} color="#6b7280" />
        </TouchableOpacity>

        {/* Exercise GIF */}
        {exercise.gifUrl && (
          <Image
            source={{ uri: exercise.gifUrl }}
            style={styles.gif}
            resizeMode="cover"
          />
        )}

        {/* Exercise Info */}
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName} numberOfLines={2}>
            {exercise.name}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {exercise.bodyPart} • {exercise.equipment}
            </Text>
          </View>

          {/* Previous Workout Hint */}
          {previousWorkout && previousWorkout.sets.length > 0 && (
            <View style={styles.previousHintRow}>
              <Text style={styles.previousHintText}>
                Last: {previousWorkout.sets[0].weight} lbs × {previousWorkout.sets[0].reps} reps
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

        {/* Remove Button */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={onRemove}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Column Headers */}
      <View style={styles.columnHeader}>
        <Text style={[styles.columnHeaderText, styles.colSet]}>SET</Text>
        <Text style={[styles.columnHeaderText, styles.colPrevious]}>PREVIOUS</Text>
        <Text style={[styles.columnHeaderText, styles.colWeight]}>LBS</Text>
        <Text style={[styles.columnHeaderText, styles.colReps]}>REPS</Text>
        <View style={styles.colCheck} />
      </View>

      {/* Sets List */}
      <View style={styles.setsContainer}>
        {sets.map((set) => {
          const prevSet = getPreviousSet(set.setNumber);

          return (
            <SetRow
              key={set.id}
              setNumber={set.setNumber}
              weight={set.weight?.toString() || ''}
              reps={set.reps?.toString() || ''}
              previousWeight={prevSet?.weight?.toString()}
              previousReps={prevSet?.reps?.toString()}
              isCompleted={set.isCompleted}
              onWeightChange={(value) => {
                const numValue = parseFloat(value) || 0;
                onUpdateSet(set.id, { weight: numValue });
              }}
              onRepsChange={(value) => {
                const numValue = parseInt(value, 10) || 0;
                onUpdateSet(set.id, { reps: numValue });
              }}
              onPreviousTap={() => handleCopyPrevious(set.id, set.setNumber)}
              onComplete={() => onCompleteSet(set.id)}
            />
          );
        })}
      </View>

      {/* Add Set Button */}
      <TouchableOpacity
        style={styles.addSetButton}
        onPress={handleAddSet}
        activeOpacity={0.7}
      >
        <Plus size={16} color="#3b82f6" />
        <Text style={styles.addSetText}>Add Set</Text>
      </TouchableOpacity>

      {/* Inline Rest Timer */}
      <InlineRestTimer exerciseId={workoutExercise.id} />

      {/* Reorder Menu Modal */}
      <Modal
        visible={showReorderMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReorderMenu(false)}
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

export const ExerciseCard = memo(ExerciseCardComponent, (prevProps, nextProps) => {
  if (
    prevProps.index !== nextProps.index ||
    prevProps.totalExercises !== nextProps.totalExercises
  ) {
    return false;
  }

  if (prevProps.workoutExercise.sets.length !== nextProps.workoutExercise.sets.length) {
    return false;
  }

  for (let i = 0; i < prevProps.workoutExercise.sets.length; i++) {
    const prevSet = prevProps.workoutExercise.sets[i];
    const nextSet = nextProps.workoutExercise.sets[i];

    if (
      prevSet.id !== nextSet.id ||
      prevSet.weight !== nextSet.weight ||
      prevSet.reps !== nextSet.reps ||
      prevSet.isCompleted !== nextSet.isCompleted
    ) {
      return false;
    }
  }

  return (
    prevProps.workoutExercise.id === nextProps.workoutExercise.id &&
    prevProps.workoutExercise.exercise.id === nextProps.workoutExercise.exercise.id
  );
});

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

  removeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
});
