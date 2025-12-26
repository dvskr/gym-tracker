import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Plus, X, MessageSquare } from 'lucide-react-native';
import { WorkoutExercise, WorkoutSet } from '@/stores/workoutStore';
import { SetRow } from './SetRow';
import { Card } from '@/components/ui';
import { usePreviousWorkout } from '@/hooks/usePreviousWorkout';
import { lightHaptic } from '@/lib/utils/haptics';

interface ExerciseCardProps {
  workoutExercise: WorkoutExercise;
  previousSets?: { weight: number | null; reps: number | null }[];
  onAddSet: () => void;
  onUpdateSet: (setId: string, data: Partial<WorkoutSet>) => void;
  onCompleteSet: (setId: string) => void;
  onDeleteSet: (setId: string) => void;
  onRemove: () => void;
  onUpdateNotes?: (notes: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const ExerciseCardComponent: React.FC<ExerciseCardProps> = ({
  workoutExercise,
  onAddSet,
  onUpdateSet,
  onCompleteSet,
  onDeleteSet,
  onRemove,
  isExpanded = true,
}) => {
  const { exercise, sets, notes } = workoutExercise;

  // Fetch previous workout data for this exercise
  const previousWorkout = usePreviousWorkout(exercise.id);

  // Get completed sets count
  const completedSets = sets.filter((s) => s.isCompleted).length;
  const totalSets = sets.length;

  // Handle add set with haptic
  const handleAddSet = useCallback(() => {
    lightHaptic();
    onAddSet();
  }, [onAddSet]);

  return (
    <Card variant="default" style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        {/* Exercise GIF */}
        {exercise.gifUrl && (
          <Image
            source={{ uri: exercise.gifUrl }}
            style={styles.gif}
            resizeMode="cover"
          />
        )}

        {/* Exercise Info */}
        <View style={styles.headerInfo}>
          <Text style={styles.exerciseName} numberOfLines={2}>
            {exercise.name}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {exercise.bodyPart} • {exercise.equipment}
            </Text>
          </View>
          
          {/* Previous Workout Hint */}
          {previousWorkout && (
            <View style={styles.previousHintRow}>
              <Text style={styles.previousHintText}>
                Last: {previousWorkout.lastWeight} lbs × {previousWorkout.lastReps} reps
                {previousWorkout.lastDate && ` (${previousWorkout.lastDate})`}
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

      {/* Notes (if any) */}
      {notes ? (
        <View style={styles.notesContainer}>
          <MessageSquare size={14} color="#64748b" />
          <Text style={styles.notesText} numberOfLines={2}>
            {notes}
          </Text>
        </View>
      ) : null}

      {/* Sets List */}
      <View style={styles.setsContainer}>
        {sets.map((set, index) => {
          // For first set, use previous workout data; for others, use previous set in current workout
          const prevWeight = index === 0 
            ? previousWorkout?.lastWeight?.toString() 
            : sets[index - 1]?.weight?.toString();
          const prevReps = index === 0 
            ? previousWorkout?.lastReps?.toString() 
            : sets[index - 1]?.reps?.toString();
          
          return (
            <SetRow
              key={set.id}
              setNumber={set.setNumber}
              weight={set.weight?.toString() ?? ''}
              reps={set.reps?.toString() ?? ''}
              previousWeight={prevWeight}
              previousReps={prevReps}
              isCompleted={set.isCompleted}
              onWeightChange={(value) => onUpdateSet(set.id, { weight: parseFloat(value) || 0 })}
              onRepsChange={(value) => onUpdateSet(set.id, { reps: parseInt(value) || 0 })}
              onComplete={() => onCompleteSet(set.id)}
              onDelete={sets.length > 1 ? () => onDeleteSet(set.id) : undefined}
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
        <Plus size={18} color="#3b82f6" />
        <Text style={styles.addSetText}>Add Set</Text>
      </TouchableOpacity>
    </Card>
  );
};

// Memoize for performance
export const ExerciseCard = memo(ExerciseCardComponent, (prevProps, nextProps) => {
  // Deep comparison for sets
  if (prevProps.workoutExercise.sets.length !== nextProps.workoutExercise.sets.length) {
    return false;
  }

  // Check if any set changed
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
    prevProps.workoutExercise.exercise.id === nextProps.workoutExercise.exercise.id &&
    prevProps.workoutExercise.notes === nextProps.workoutExercise.notes &&
    prevProps.isExpanded === nextProps.isExpanded
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    padding: 0,
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  gif: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },

  headerInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },

  exerciseName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    marginBottom: 4,
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
    color: '#64748b',
    fontSize: 11,
    fontStyle: 'italic',
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

  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0f172a',
    gap: 8,
  },

  notesText: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 12,
    fontStyle: 'italic',
  },

  setsContainer: {
    padding: 12,
    paddingTop: 8,
  },

  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 8,
  },

  addSetText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
