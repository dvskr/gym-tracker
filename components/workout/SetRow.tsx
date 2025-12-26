import React, { memo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Platform,
} from 'react-native';
import { Check, Trash2 } from 'lucide-react-native';
import { WorkoutSet } from '@/stores/workoutStore';

interface PreviousSet {
  weight: number | null;
  reps: number | null;
}

interface SetRowProps {
  set: WorkoutSet;
  previousSet: PreviousSet | null;
  onUpdate: (data: Partial<WorkoutSet>) => void;
  onComplete: () => void;
  onDelete: () => void;
  isOnly?: boolean; // Prevent deletion if only set
}

const SET_TYPE_LABELS: Record<string, string> = {
  normal: '',
  warmup: 'W',
  dropset: 'D',
  failure: 'F',
};

const SetRowComponent: React.FC<SetRowProps> = ({
  set,
  previousSet,
  onUpdate,
  onComplete,
  onDelete,
  isOnly = false,
}) => {
  const weightInputRef = useRef<TextInput>(null);
  const repsInputRef = useRef<TextInput>(null);

  // Pre-fill from previous set when focusing empty input
  const handleWeightFocus = useCallback(() => {
    if (set.weight === null && previousSet?.weight) {
      onUpdate({ weight: previousSet.weight });
    }
  }, [set.weight, previousSet?.weight, onUpdate]);

  const handleRepsFocus = useCallback(() => {
    if (set.reps === null && previousSet?.reps) {
      onUpdate({ reps: previousSet.reps });
    }
  }, [set.reps, previousSet?.reps, onUpdate]);

  // Handle weight change
  const handleWeightChange = useCallback(
    (text: string) => {
      const value = text === '' ? null : parseFloat(text) || 0;
      onUpdate({ weight: value });
    },
    [onUpdate]
  );

  // Handle reps change
  const handleRepsChange = useCallback(
    (text: string) => {
      const value = text === '' ? null : parseInt(text, 10) || 0;
      onUpdate({ reps: value });
    },
    [onUpdate]
  );

  // Handle complete with haptic feedback
  const handleComplete = useCallback(() => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(50);
    }
    onComplete();
  }, [onComplete]);

  // Move to reps input after weight
  const handleWeightSubmit = useCallback(() => {
    repsInputRef.current?.focus();
  }, []);

  // Complete set after reps
  const handleRepsSubmit = useCallback(() => {
    if (set.weight !== null && set.reps !== null) {
      handleComplete();
    }
  }, [set.weight, set.reps, handleComplete]);

  // Format previous set hint
  const previousHint = previousSet
    ? `${previousSet.weight ?? '-'} × ${previousSet.reps ?? '-'}`
    : '-';

  const setTypeLabel = SET_TYPE_LABELS[set.setType] || '';

  return (
    <View style={[styles.container, set.isCompleted && styles.containerCompleted]}>
      {/* Set Number */}
      <View style={styles.setNumberContainer}>
        <Text style={[styles.setNumber, set.isCompleted && styles.textCompleted]}>
          {setTypeLabel || set.setNumber}
        </Text>
      </View>

      {/* Previous Set Hint */}
      <View style={styles.previousContainer}>
        <Text style={styles.previousText}>{previousHint}</Text>
      </View>

      {/* Weight Input */}
      <View style={styles.inputContainer}>
        <TextInput
          ref={weightInputRef}
          style={[
            styles.input,
            set.isCompleted && styles.inputCompleted,
          ]}
          value={set.weight?.toString() ?? ''}
          onChangeText={handleWeightChange}
          onFocus={handleWeightFocus}
          onSubmitEditing={handleWeightSubmit}
          placeholder="-"
          placeholderTextColor="#475569"
          keyboardType="decimal-pad"
          returnKeyType="next"
          selectTextOnFocus
          editable={!set.isCompleted}
        />
        <Text style={styles.unitLabel}>{set.weightUnit}</Text>
      </View>

      {/* Reps Input */}
      <View style={styles.inputContainer}>
        <TextInput
          ref={repsInputRef}
          style={[
            styles.input,
            set.isCompleted && styles.inputCompleted,
          ]}
          value={set.reps?.toString() ?? ''}
          onChangeText={handleRepsChange}
          onFocus={handleRepsFocus}
          onSubmitEditing={handleRepsSubmit}
          placeholder="-"
          placeholderTextColor="#475569"
          keyboardType="number-pad"
          returnKeyType="done"
          selectTextOnFocus
          editable={!set.isCompleted}
        />
        <Text style={styles.unitLabel}>reps</Text>
      </View>

      {/* Complete Button */}
      <TouchableOpacity
        style={[
          styles.completeButton,
          set.isCompleted && styles.completeButtonActive,
        ]}
        onPress={handleComplete}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Check
          size={20}
          color={set.isCompleted ? '#ffffff' : '#64748b'}
          strokeWidth={3}
        />
      </TouchableOpacity>

      {/* Delete Button - Long press or swipe in future */}
      {!isOnly && !set.isCompleted && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onDelete}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={16} color="#ef4444" />
        </TouchableOpacity>
      )}
    </View>
  );
};

// Memoize to prevent unnecessary re-renders
export const SetRow = memo(SetRowComponent, (prevProps, nextProps) => {
  return (
    prevProps.set.id === nextProps.set.id &&
    prevProps.set.weight === nextProps.set.weight &&
    prevProps.set.reps === nextProps.set.reps &&
    prevProps.set.isCompleted === nextProps.set.isCompleted &&
    prevProps.set.setType === nextProps.set.setType &&
    prevProps.previousSet?.weight === nextProps.previousSet?.weight &&
    prevProps.previousSet?.reps === nextProps.previousSet?.reps &&
    prevProps.isOnly === nextProps.isOnly
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    minHeight: 56,
    gap: 8,
  },

  containerCompleted: {
    backgroundColor: '#14532d20',
  },

  setNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },

  setNumber: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
  },

  textCompleted: {
    color: '#22c55e',
  },

  previousContainer: {
    width: 60,
    alignItems: 'center',
  },

  previousText: {
    color: '#475569',
    fontSize: 12,
  },

  inputContainer: {
    flex: 1,
    alignItems: 'center',
  },

  input: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },

  inputCompleted: {
    backgroundColor: '#14532d40',
    color: '#22c55e',
  },

  unitLabel: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },

  completeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },

  completeButtonActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },

  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

