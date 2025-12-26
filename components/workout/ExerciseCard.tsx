import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Plus, X, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react-native';
import { WorkoutExercise, WorkoutSet } from '@/stores/workoutStore';
import { SetRow } from './SetRow';
import { Card } from '@/components/ui';

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
  previousSets = [],
  onAddSet,
  onUpdateSet,
  onCompleteSet,
  onDeleteSet,
  onRemove,
  isExpanded = true,
}) => {
  const { exercise, sets, notes } = workoutExercise;

  // Get completed sets count
  const completedSets = sets.filter((s) => s.isCompleted).length;
  const totalSets = sets.length;

  // Get previous set for a given index
  const getPreviousSet = useCallback(
    (index: number) => {
      return previousSets[index] || null;
    },
    [previousSets]
  );

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

      {/* Column Headers */}
      <View style={styles.columnHeaders}>
        <Text style={[styles.columnHeader, styles.columnSet]}>SET</Text>
        <Text style={[styles.columnHeader, styles.columnPrevious]}>PREV</Text>
        <Text style={[styles.columnHeader, styles.columnWeight]}>WEIGHT</Text>
        <Text style={[styles.columnHeader, styles.columnReps]}>REPS</Text>
        <View style={styles.columnCheck} />
      </View>

      {/* Sets List */}
      <View style={styles.setsContainer}>
        {sets.map((set, index) => (
          <SetRow
            key={set.id}
            set={set}
            previousSet={getPreviousSet(index)}
            onUpdate={(data) => onUpdateSet(set.id, data)}
            onComplete={() => onCompleteSet(set.id)}
            onDelete={() => onDeleteSet(set.id)}
            isOnly={sets.length === 1}
          />
        ))}
      </View>

      {/* Add Set Button */}
      <TouchableOpacity
        style={styles.addSetButton}
        onPress={onAddSet}
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
    fontWeight: '700',
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

  progressRow: {
    marginTop: 4,
  },

  progressText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
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

  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0f172a',
    gap: 8,
  },

  columnHeader: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },

  columnSet: {
    width: 32,
  },

  columnPrevious: {
    width: 60,
  },

  columnWeight: {
    flex: 1,
  },

  columnReps: {
    flex: 1,
  },

  columnCheck: {
    width: 48,
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
    fontWeight: '600',
  },
});

