import React, { useState } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Plus, X, CheckCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { lightHaptic } from '@/lib/utils/haptics';
import type { MeasurementType } from '@/types/exercise-measurements';
import { getCurrentTab } from '@/lib/navigation/navigationState';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';

const CATEGORIES = [
  'chest',
  'back',
  'shoulders',
  'upper legs',
  'lower legs',
  'upper arms',
  'lower arms',
  'waist',
  'cardio',
];

const EQUIPMENT_OPTIONS = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'body weight',
  'kettlebell',
  'band',
  'weighted',
  'other',
];

const MEASUREMENT_TYPES: { value: MeasurementType; label: string }[] = [
  { value: 'reps_weight', label: 'Reps + Weight (Standard)' },
  { value: 'reps_only', label: 'Reps Only (Bodyweight)' },
  { value: 'time', label: 'Time Only (Holds/Planks)' },
  { value: 'time_weight', label: 'Time + Weight (Carries)' },
  { value: 'distance', label: 'Distance + Time (Cardio)' },
  { value: 'assisted', label: 'Assisted (Assistance Weight)' },
];

export default function AddCustomExerciseScreen() {
  useBackNavigation(); // Enable Android back gesture support

  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    equipment: '',
    category: '',
    primary_muscles: [] as string[],
    instructions: [''],
    notes: '',
    measurement_type: 'reps_weight' as MeasurementType,
  });

  const [muscleInput, setMuscleInput] = useState('');

  const addMuscle = () => {
    if (muscleInput.trim() && !formData.primary_muscles.includes(muscleInput.trim())) {
      setFormData({
        ...formData,
        primary_muscles: [...formData.primary_muscles, muscleInput.trim().toLowerCase()],
      });
      setMuscleInput('');
      lightHaptic();
    }
  };

  const removeMuscle = (muscle: string) => {
    setFormData({
      ...formData,
      primary_muscles: formData.primary_muscles.filter(m => m !== muscle),
    });
    lightHaptic();
  };

  const addInstructionStep = () => {
    setFormData({
      ...formData,
      instructions: [...formData.instructions, ''],
    });
    lightHaptic();
  };

  const updateInstruction = (index: number, value: string) => {
    const newInstructions = [...formData.instructions];
    newInstructions[index] = value;
    setFormData({ ...formData, instructions: newInstructions });
  };

  const removeInstruction = (index: number) => {
    if (formData.instructions.length > 1) {
      setFormData({
        ...formData,
        instructions: formData.instructions.filter((_, i) => i !== index),
      });
      lightHaptic();
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      Alert.alert('Required Field', 'Please enter an exercise name');
      return false;
    }
    if (!formData.equipment) {
      Alert.alert('Required Field', 'Please select equipment');
      return false;
    }
    if (!formData.category) {
      Alert.alert('Required Field', 'Please select a category');
      return false;
    }
    if (formData.primary_muscles.length === 0) {
      Alert.alert('Required Field', 'Please add at least one primary muscle');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to add custom exercises');
      return;
    }

    setIsSubmitting(true);
    lightHaptic();

    try {
      const { data, error } = await supabase
        .from('custom_exercises')
        .insert({
          user_id: user.id,
          name: formData.name.trim(),
          equipment: formData.equipment,
          category: formData.category,
          primary_muscles: formData.primary_muscles,
          instructions: formData.instructions.filter(i => i.trim()),
          notes: formData.notes.trim() || null,
          measurement_type: formData.measurement_type,
          is_pending_review: true,
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Success! 🎉',
        'Your custom exercise has been added and is ready to use!',
        [
          {
            text: 'OK',
            onPress: () => router.push(getCurrentTab() || '/(tabs)'),
          },
        ]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
 logger.error('Error adding custom exercise:', error);
      
      if (error.code === '23505') {
        Alert.alert('Duplicate', 'You already have an exercise with this name');
      } else {
        Alert.alert('Error', 'Failed to add exercise. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.push(getCurrentTab() || '/(tabs)')}>
          <ArrowLeft size={24} color="#ffffff" />
        </Pressable>
        <Text style={styles.headerTitle}>Add Custom Exercise</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Exercise Name */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Exercise Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(value) => setFormData({ ...formData, name: value })}
            placeholder="e.g., My Custom Squat Variation"
            placeholderTextColor="#64748b"
          />
        </View>

        {/* Equipment */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Equipment <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.optionsGrid}>
            {EQUIPMENT_OPTIONS.map((equipment) => (
              <Pressable
                key={equipment}
                style={[
                  styles.optionButton,
                  formData.equipment === equipment && styles.optionButtonActive,
                ]}
                onPress={() => {
                  setFormData({ ...formData, equipment });
                  lightHaptic();
                }}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    formData.equipment === equipment && styles.optionButtonTextActive,
                  ]}
                >
                  {equipment}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Category <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.optionsGrid}>
            {CATEGORIES.map((category) => (
              <Pressable
                key={category}
                style={[
                  styles.optionButton,
                  formData.category === category && styles.optionButtonActive,
                ]}
                onPress={() => {
                  setFormData({ ...formData, category });
                  lightHaptic();
                }}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    formData.category === category && styles.optionButtonTextActive,
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Primary Muscles */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Primary Muscles <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.muscleInputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={muscleInput}
              onChangeText={setMuscleInput}
              placeholder="e.g., quadriceps, biceps"
              placeholderTextColor="#64748b"
              onSubmitEditing={addMuscle}
            />
            <Pressable style={styles.addButton} onPress={addMuscle}>
              <Plus size={20} color="#3b82f6" />
            </Pressable>
          </View>
          <View style={styles.muscleList}>
            {formData.primary_muscles.map((muscle) => (
              <View key={muscle} style={styles.muscleChip}>
                <Text style={styles.muscleChipText}>{muscle}</Text>
                <Pressable onPress={() => removeMuscle(muscle)}>
                  <X size={16} color="#64748b" />
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* Measurement Type */}
        <View style={styles.section}>
          <Text style={styles.label}>Measurement Type</Text>
          <Text style={styles.hint}>How will you track this exercise?</Text>
          {MEASUREMENT_TYPES.map((type) => (
            <Pressable
              key={type.value}
              style={[
                styles.measurementOption,
                formData.measurement_type === type.value && styles.measurementOptionActive,
              ]}
              onPress={() => {
                setFormData({ ...formData, measurement_type: type.value });
                lightHaptic();
              }}
            >
              <View
                style={[
                  styles.radio,
                  formData.measurement_type === type.value && styles.radioActive,
                ]}
              />
              <Text style={styles.measurementLabel}>{type.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.label}>Instructions (Optional)</Text>
          {formData.instructions.map((instruction, index) => (
            <View key={index} style={styles.instructionRow}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={instruction}
                onChangeText={(value) => updateInstruction(index, value)}
                placeholder={`Step ${index + 1}`}
                placeholderTextColor="#64748b"
                multiline
              />
              {formData.instructions.length > 1 && (
                <Pressable
                  style={styles.removeButton}
                  onPress={() => removeInstruction(index)}
                >
                  <X size={20} color="#ef4444" />
                </Pressable>
              )}
            </View>
          ))}
          <Pressable style={styles.addStepButton} onPress={addInstructionStep}>
            <Plus size={20} color="#3b82f6" />
            <Text style={styles.addStepText}>Add Step</Text>
          </Pressable>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(value) => setFormData({ ...formData, notes: value })}
            placeholder="Any additional information, tips, or variations..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Submit Button */}
        <Pressable
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <CheckCircle size={24} color="#ffffff" />
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Adding...' : 'Add Exercise'}
          </Text>
        </Pressable>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },

  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },

  content: {
    flex: 1,
    padding: 16,
  },

  section: {
    marginBottom: 24,
  },

  label: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },

  required: {
    color: '#ef4444',
  },

  hint: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 12,
  },

  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#334155',
  },

  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  optionButton: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#334155',
  },

  optionButtonActive: {
    backgroundColor: '#1e3a5f',
    borderColor: '#3b82f6',
  },

  optionButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  optionButtonTextActive: {
    color: '#3b82f6',
  },

  muscleInputRow: {
    flexDirection: 'row',
    gap: 8,
  },

  addButton: {
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },

  muscleList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },

  muscleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#14532d',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#22c55e',
  },

  muscleChipText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  measurementOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#334155',
  },

  measurementOptionActive: {
    backgroundColor: '#1e3a5f',
    borderColor: '#3b82f6',
  },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#64748b',
    marginRight: 12,
  },

  radioActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#3b82f6',
  },

  measurementLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },

  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
  },

  removeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#450a0a',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ef4444',
  },

  addStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
  },

  addStepText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '700',
  },

  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },

  submitButtonDisabled: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },

  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },

  bottomSpacer: {
    height: 40,
  },
});

