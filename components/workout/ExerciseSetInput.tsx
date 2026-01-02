/**
 * Flexible Exercise Set Input Component
 * 
 * Dynamically adapts input fields based on exercise measurement type:
 * - Traditional: Reps + Weight
 * - Bodyweight: Reps only
 * - Timed: Duration
 * - Cardio: Duration + Distance
 * - Assisted: Reps + Assistance Weight
 * - AMRAP: Reps + Time Limit
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { Check, X, Clock, Weight, Ruler, Users } from 'lucide-react-native';
import type { Exercise, ExerciseSet } from '@/types/exercise-measurements';
import { getMeasurementConfig, validateSetData } from '@/lib/utils/exerciseMeasurements';
import { useUnits } from '@/hooks/useUnits';

interface ExerciseSetInputProps {
  exercise: Exercise;
  set: ExerciseSet;
  setNumber: number;
  onUpdate: (set: ExerciseSet) => void;
  onComplete: () => void;
  onDelete: () => void;
}

export const ExerciseSetInput: React.FC<ExerciseSetInputProps> = ({
  exercise,
  set,
  setNumber,
  onUpdate,
  onComplete,
  onDelete
}) => {
  const config = getMeasurementConfig(exercise);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { weightUnit } = useUnits();

  const handleFieldUpdate = (field: string, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    const updatedSet = { ...set, [field]: numValue };
    onUpdate(updatedSet);

    // Clear validation errors on input
    setValidationErrors([]);
  };

  const handleComplete = () => {
    const validation = validateSetData(set, config);
    if (validation.valid) {
      onComplete();
    } else {
      setValidationErrors(validation.errors);
    }
  };

  return (
    <View style={styles.container}>
      {/* Set Number Badge */}
      <View style={styles.setNumberBadge}>
        <Text style={styles.setNumberText}>{setNumber}</Text>
      </View>

      {/* Dynamic Input Fields */}
      <View style={styles.inputsContainer}>
        {/* Reps Input */}
        {config.tracks.reps && (
          <View style={styles.inputWrapper}>
            <TextInput
              placeholder={config.placeholder?.reps || 'Reps'}
              placeholderTextColor="#64748b"
              value={set.reps?.toString() || ''}
              onChangeText={(value) => handleFieldUpdate('reps', value)}
              keyboardType="numeric"
              style={[
                styles.input,
                set.is_completed && styles.inputCompleted
              ]}
            />
            <Text style={styles.inputLabel}>reps</Text>
          </View>
        )}

        {/* Weight Input */}
        {config.tracks.weight && (
          <View style={styles.inputWrapper}>
            <Weight size={16} color="#64748b" style={styles.inputIcon} />
            <TextInput
              placeholder={config.placeholder?.weight || 'Weight'}
              placeholderTextColor="#64748b"
              value={set.weight?.toString() || ''}
              onChangeText={(value) => handleFieldUpdate('weight', value)}
              keyboardType="decimal-pad"
              style={[
                styles.input,
                set.is_completed && styles.inputCompleted
              ]}
            />
            <Text style={styles.inputLabel}>{weightUnit}</Text>
          </View>
        )}

        {/* Time Input */}
        {config.tracks.time && (
          <View style={styles.inputWrapper}>
            <Clock size={16} color="#64748b" style={styles.inputIcon} />
            <TextInput
              placeholder={config.placeholder?.time || 'Time'}
              placeholderTextColor="#64748b"
              value={set.duration_seconds?.toString() || ''}
              onChangeText={(value) => handleFieldUpdate('duration_seconds', value)}
              keyboardType="numeric"
              style={[
                styles.input,
                set.is_completed && styles.inputCompleted
              ]}
            />
            <Text style={styles.inputLabel}>
              {config.defaultUnit === 'minutes' ? 'min' : 'sec'}
            </Text>
          </View>
        )}

        {/* Distance Input */}
        {config.tracks.distance && (
          <View style={styles.inputWrapper}>
            <Ruler size={16} color="#64748b" style={styles.inputIcon} />
            <TextInput
              placeholder={config.placeholder?.distance || 'Distance'}
              placeholderTextColor="#64748b"}
              value={
                set.distance_meters 
                  ? (set.distance_meters / 1000).toFixed(2) 
                  : ''
              }
              onChangeText={(value) => {
                const meters = value === '' ? '' : (parseFloat(value) * 1000).toString();
                handleFieldUpdate('distance_meters', meters);
              }}
              keyboardType="decimal-pad"
              style={[
                styles.input,
                set.is_completed && styles.inputCompleted
              ]}
            />
            <Text style={styles.inputLabel}>km</Text>
          </View>
        )}

        {/* Assistance Weight Input */}
        {config.tracks.assistance && (
          <View style={styles.inputWrapper}>
            <Users size={16} color="#64748b" style={styles.inputIcon} />
            <TextInput
              placeholder={config.placeholder?.assistance || 'Assistance'}
              placeholderTextColor="#64748b"
              value={set.assistance_weight?.toString() || ''}
              onChangeText={(value) => handleFieldUpdate('assistance_weight', value)}
              keyboardType="decimal-pad"
              style={[
                styles.input,
                set.is_completed && styles.inputCompleted
              ]}
            />
            <Text style={styles.inputLabel}>{weightUnit}</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {!set.is_completed ? (
          <Pressable 
            style={styles.completeButton}
            onPress={handleComplete}
          >
            <Check size={20} color="#22c55e" />
          </Pressable>
        ) : (
          <Pressable 
            style={styles.completedBadge}
            onPress={() => onUpdate({ ...set, is_completed: false })}
          >
            <Check size={16} color="#22c55e" />
            <Text style={styles.completedText}>Done</Text>
          </Pressable>
        )}

        <Pressable 
          style={styles.deleteButton}
          onPress={onDelete}
        >
          <X size={20} color="#ef4444" />
        </Pressable>
      </View>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <View style={styles.errorsContainer}>
          {validationErrors.map((error, index) => (
            <Text key={index} style={styles.errorText}>
              • {error}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },

  setNumberBadge: {
    position: 'absolute',
    top: -8,
    left: 12,
    backgroundColor: '#3b82f6',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#020617',
  },

  setNumberText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  inputsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
  },

  inputWrapper: {
    flex: 1,
    minWidth: 100,
    position: 'relative',
  },

  inputIcon: {
    position: 'absolute',
    left: 12,
    top: '50%',
    marginTop: -8,
    zIndex: 1,
  },

  input: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 2,
    borderColor: '#334155',
  },

  inputCompleted: {
    borderColor: '#22c55e',
    backgroundColor: '#14532d',
  },

  inputLabel: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -10,
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },

  actions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },

  completeButton: {
    flex: 1,
    backgroundColor: '#14532d',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#22c55e',
  },

  completedBadge: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#14532d',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: '#22c55e',
  },

  completedText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '700',
  },

  deleteButton: {
    backgroundColor: '#450a0a',
    borderRadius: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ef4444',
  },

  errorsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },

  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginBottom: 2,
  },
});
