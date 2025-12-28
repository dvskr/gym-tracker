import React, { memo, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// ============================================
// Types
// ============================================

interface SetRowProps {
  setNumber: number;
  previousWeight?: string;
  previousReps?: string;
  weight: string;
  reps: string;
  isCompleted: boolean;
  onWeightChange: (value: string) => void;
  onRepsChange: (value: string) => void;
  onComplete: () => void;
  onPreviousTap: () => void;
}

// ============================================
// Component
// ============================================

function SetRowComponent({
  setNumber,
  previousWeight,
  previousReps,
  weight,
  reps,
  isCompleted,
  onWeightChange,
  onRepsChange,
  onComplete,
  onPreviousTap,
}: SetRowProps) {
  // Local state for immediate UI feedback
  const [weightInput, setWeightInput] = useState(weight);
  const [repsInput, setRepsInput] = useState(reps);

  // Sync local state when props change (from outside updates like "copy previous")
  useEffect(() => {
    setWeightInput(weight);
  }, [weight]);

  useEffect(() => {
    setRepsInput(reps);
  }, [reps]);

  // Format previous text
  const previousText =
    previousWeight && previousReps
      ? `${previousWeight}×${previousReps}`
      : '—';

  const hasPrevious = Boolean(previousWeight && previousReps);

  // Handle previous tap
  const handlePreviousTap = useCallback(() => {
    if (hasPrevious) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPreviousTap();
    }
  }, [hasPrevious, onPreviousTap]);

  // Handle complete
  const handleComplete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  }, [onComplete]);

  // Handle weight input change - update local state immediately
  const handleWeightInputChange = useCallback((text: string) => {
    // Allow empty, digits, and decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    const sanitized = parts.length > 2 
      ? parts[0] + '.' + parts.slice(1).join('')
      : cleaned;
    setWeightInput(sanitized);
  }, []);

  // Handle reps input change - update local state immediately
  const handleRepsInputChange = useCallback((text: string) => {
    // Allow only digits for reps
    const cleaned = text.replace(/[^0-9]/g, '');
    setRepsInput(cleaned);
  }, []);

  // Handle weight blur - sync to store
  const handleWeightBlur = useCallback(() => {
    onWeightChange(weightInput);
  }, [weightInput, onWeightChange]);

  // Handle reps blur - sync to store
  const handleRepsBlur = useCallback(() => {
    onRepsChange(repsInput);
  }, [repsInput, onRepsChange]);

  return (
    <View style={[styles.row, isCompleted && styles.rowCompleted]}>
      {/* SET */}
      <View style={styles.setColumn}>
        <Text style={styles.setNumber}>{setNumber}</Text>
      </View>

      {/* PREVIOUS */}
      <Pressable
        style={styles.previousColumn}
        onPress={handlePreviousTap}
        disabled={!hasPrevious}
      >
        <Text style={[styles.previousText, hasPrevious && styles.previousTextActive]}>
          {previousText}
        </Text>
      </Pressable>

      {/* WEIGHT */}
      <View style={styles.inputColumn}>
        <TextInput
          style={styles.input}
          value={weightInput}
          onChangeText={handleWeightInputChange}
          onBlur={handleWeightBlur}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor="#64748b"
          selectTextOnFocus={true}
          editable={!isCompleted}
        />
      </View>

      {/* REPS */}
      <View style={styles.inputColumn}>
        <TextInput
          style={styles.input}
          value={repsInput}
          onChangeText={handleRepsInputChange}
          onBlur={handleRepsBlur}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor="#64748b"
          selectTextOnFocus={true}
          editable={!isCompleted}
        />
      </View>

      {/* CHECKMARK */}
      <Pressable
        style={[styles.checkButton, isCompleted && styles.checkButtonCompleted]}
        onPress={handleComplete}
        hitSlop={8}
      >
        {isCompleted && <Check size={16} color="#ffffff" strokeWidth={3} />}
      </Pressable>
    </View>
  );
}

// ============================================
// Memoization
// ============================================

export const SetRow = memo(SetRowComponent, (prev, next) => {
  return (
    prev.setNumber === next.setNumber &&
    prev.weight === next.weight &&
    prev.reps === next.reps &&
    prev.isCompleted === next.isCompleted &&
    prev.previousWeight === next.previousWeight &&
    prev.previousReps === next.previousReps
  );
});

export default SetRow;

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#475569',
  },

  rowCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },

  // SET Column
  setColumn: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  setNumber: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#9ca3af',
  },

  // PREVIOUS Column
  previousColumn: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },

  previousText: {
    fontSize: 13,
    color: '#4b5563',
  },

  previousTextActive: {
    color: '#6b7280',
  },

  // Input Columns
  inputColumn: {
    flex: 1,
    paddingHorizontal: 4,
  },

  input: {
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f1f5f9',
    textAlign: 'center',
  },

  // Checkmark
  checkButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginRight: 4,
  },

  checkButtonCompleted: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
});
