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

type MeasurementType = 'reps_weight' | 'reps_only' | 'time' | 'time_distance' | 'time_weight' | 'assisted';

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
  // New props for flexible measurements
  measurementType?: MeasurementType;
  durationSeconds?: number;
  distanceMeters?: number;
  assistanceWeight?: number;
  onDurationChange?: (value: number) => void;
  onDistanceChange?: (value: number) => void;
  onAssistanceChange?: (value: number) => void;
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
  measurementType = 'reps_weight',
  durationSeconds,
  distanceMeters,
  assistanceWeight,
  onDurationChange,
  onDistanceChange,
  onAssistanceChange,
}: SetRowProps) {
  // Local state for immediate UI feedback
  const [weightInput, setWeightInput] = useState(weight);
  const [repsInput, setRepsInput] = useState(reps);
  const [durationInput, setDurationInput] = useState(durationSeconds?.toString() || '');
  const [distanceInput, setDistanceInput] = useState(distanceMeters ? (distanceMeters / 1609.34).toFixed(2) : '');
  const [assistanceInput, setAssistanceInput] = useState(assistanceWeight?.toString() || '');

  // Track if user is actively editing to prevent external updates
  const [isEditingWeight, setIsEditingWeight] = useState(false);
  const [isEditingReps, setIsEditingReps] = useState(false);
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [isEditingDistance, setIsEditingDistance] = useState(false);
  const [isEditingAssistance, setIsEditingAssistance] = useState(false);

  // Sync local state when props change (from outside updates like "copy previous")
  // BUT only when user is not actively editing
  useEffect(() => {
    if (!isEditingWeight) {
      setWeightInput(weight);
    }
  }, [weight, isEditingWeight]);

  useEffect(() => {
    if (!isEditingReps) {
      setRepsInput(reps);
    }
  }, [reps, isEditingReps]);

  useEffect(() => {
    if (!isEditingDuration) {
      setDurationInput(durationSeconds?.toString() || '');
    }
  }, [durationSeconds, isEditingDuration]);

  useEffect(() => {
    if (!isEditingDistance) {
      setDistanceInput(distanceMeters ? (distanceMeters / 1609.34).toFixed(2) : '');
    }
  }, [distanceMeters, isEditingDistance]);

  useEffect(() => {
    if (!isEditingAssistance) {
      setAssistanceInput(assistanceWeight?.toString() || '');
    }
  }, [assistanceWeight, isEditingAssistance]);

  // Format previous text based on measurement type
  const getPreviousText = () => {
    if (measurementType === 'time') {
      return durationSeconds ? `${durationSeconds}s` : '—';
    }
    if (measurementType === 'time_distance') {
      return durationSeconds && distanceMeters 
        ? `${durationSeconds}s / ${(distanceMeters / 1609.34).toFixed(2)}mi` 
        : '—';
    }
    if (measurementType === 'time_weight') {
      return durationSeconds && previousWeight
        ? `${durationSeconds}s × ${previousWeight}`
        : '—';
    }
    if (measurementType === 'assisted') {
      return previousReps && assistanceWeight
        ? `${previousReps} @ -${assistanceWeight}`
        : '—';
    }
    if (measurementType === 'reps_only') {
      return previousReps || '—';
    }
    // Default: reps_weight
    return previousWeight && previousReps
      ? `${previousWeight}×${previousReps}`
      : '—';
  };

  const previousText = getPreviousText();
  const hasPrevious = previousText !== '—';

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
    setIsEditingWeight(false);
    onWeightChange(weightInput);
  }, [weightInput, onWeightChange]);

  // Handle reps blur - sync to store
  const handleRepsBlur = useCallback(() => {
    setIsEditingReps(false);
    onRepsChange(repsInput);
  }, [repsInput, onRepsChange]);

  // Handle duration input
  const handleDurationChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setDurationInput(cleaned);
  }, []);

  const handleDurationBlur = useCallback(() => {
    setIsEditingDuration(false);
    if (onDurationChange) {
      onDurationChange(parseInt(durationInput) || 0);
    }
  }, [durationInput, onDurationChange]);

  // Handle distance input
  const handleDistanceChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const sanitized = parts.length > 2 
      ? parts[0] + '.' + parts.slice(1).join('')
      : cleaned;
    setDistanceInput(sanitized);
  }, []);

  const handleDistanceBlur = useCallback(() => {
    setIsEditingDistance(false);
    if (onDistanceChange) {
      const miles = parseFloat(distanceInput) || 0;
      onDistanceChange(miles * 1609.34); // Convert miles to meters
    }
  }, [distanceInput, onDistanceChange]);

  // Handle assistance input
  const handleAssistanceChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const sanitized = parts.length > 2 
      ? parts[0] + '.' + parts.slice(1).join('')
      : cleaned;
    setAssistanceInput(sanitized);
  }, []);

  const handleAssistanceBlur = useCallback(() => {
    setIsEditingAssistance(false);
    if (onAssistanceChange) {
      onAssistanceChange(parseFloat(assistanceInput) || 0);
    }
  }, [assistanceInput, onAssistanceChange]);

  // Render input fields based on measurement type
  const renderInputs = () => {
    switch (measurementType) {
      case 'time':
        return (
          <View style={styles.inputColumn}>
            <TextInput
              style={styles.input}
              value={durationInput}
              onChangeText={handleDurationChange}
              onFocus={() => setIsEditingDuration(true)}
              onBlur={handleDurationBlur}
              keyboardType="number-pad"
              placeholder="sec"
              placeholderTextColor="#64748b"
              selectTextOnFocus={true}
              editable={!isCompleted}
            />
          </View>
        );

      case 'time_distance':
        return (
          <>
            <View style={styles.inputColumn}>
              <TextInput
                style={styles.input}
                value={durationInput}
                onChangeText={handleDurationChange}
                onFocus={() => setIsEditingDuration(true)}
                onBlur={handleDurationBlur}
                keyboardType="number-pad"
                placeholder="sec"
                placeholderTextColor="#64748b"
                editable={!isCompleted}
              />
            </View>
            <View style={styles.inputColumn}>
              <TextInput
                style={styles.input}
                value={distanceInput}
                onChangeText={handleDistanceChange}
                onFocus={() => setIsEditingDistance(true)}
                onBlur={handleDistanceBlur}
                keyboardType="decimal-pad"
                placeholder="mi"
                placeholderTextColor="#64748b"
                editable={!isCompleted}
              />
            </View>
          </>
        );

      case 'time_weight':
        return (
          <>
            <View style={styles.inputColumn}>
              <TextInput
                style={styles.input}
                value={durationInput}
                onChangeText={handleDurationChange}
                onFocus={() => setIsEditingDuration(true)}
                onBlur={handleDurationBlur}
                keyboardType="number-pad"
                placeholder="sec"
                placeholderTextColor="#64748b"
                editable={!isCompleted}
              />
            </View>
            <View style={styles.inputColumn}>
              <TextInput
                style={styles.input}
                value={weightInput}
                onChangeText={handleWeightInputChange}
                onFocus={() => setIsEditingWeight(true)}
                onBlur={handleWeightBlur}
                keyboardType="decimal-pad"
                placeholder="lbs"
                placeholderTextColor="#64748b"
                editable={!isCompleted}
              />
            </View>
          </>
        );

      case 'assisted':
        return (
          <>
            <View style={styles.inputColumn}>
              <TextInput
                style={styles.input}
                value={repsInput}
                onChangeText={handleRepsInputChange}
                onFocus={() => setIsEditingReps(true)}
                onBlur={handleRepsBlur}
                keyboardType="number-pad"
                placeholder="reps"
                placeholderTextColor="#64748b"
                editable={!isCompleted}
              />
            </View>
            <View style={styles.inputColumn}>
              <TextInput
                style={styles.input}
                value={assistanceInput}
                onChangeText={handleAssistanceChange}
                onFocus={() => setIsEditingAssistance(true)}
                onBlur={handleAssistanceBlur}
                keyboardType="decimal-pad"
                placeholder="assist"
                placeholderTextColor="#64748b"
                editable={!isCompleted}
              />
            </View>
          </>
        );

      case 'reps_only':
        return (
          <View style={styles.inputColumn}>
            <TextInput
              style={styles.input}
              value={repsInput}
              onChangeText={handleRepsInputChange}
              onFocus={() => setIsEditingReps(true)}
              onBlur={handleRepsBlur}
              keyboardType="number-pad"
              placeholder="reps"
              placeholderTextColor="#64748b"
              selectTextOnFocus={true}
              editable={!isCompleted}
            />
          </View>
        );

      default: // 'reps_weight'
        return (
          <>
            <View style={styles.inputColumn}>
              <TextInput
                style={styles.input}
                value={weightInput}
                onChangeText={handleWeightInputChange}
                onFocus={() => setIsEditingWeight(true)}
                onBlur={handleWeightBlur}
                keyboardType="decimal-pad"
                placeholder="lbs"
                placeholderTextColor="#64748b"
                editable={!isCompleted}
              />
            </View>
            <View style={styles.inputColumn}>
              <TextInput
                style={styles.input}
                value={repsInput}
                onChangeText={handleRepsInputChange}
                onFocus={() => setIsEditingReps(true)}
                onBlur={handleRepsBlur}
                keyboardType="number-pad"
                placeholder="reps"
                placeholderTextColor="#64748b"
                editable={!isCompleted}
              />
            </View>
          </>
        );
    }
  };

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

      {/* DYNAMIC INPUTS */}
      {renderInputs()}

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
    prev.previousReps === next.previousReps &&
    prev.measurementType === next.measurementType &&
    prev.durationSeconds === next.durationSeconds &&
    prev.distanceMeters === next.distanceMeters &&
    prev.assistanceWeight === next.assistanceWeight
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
