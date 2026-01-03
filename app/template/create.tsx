import React, { useState, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  X,
  Flame,
  Target,
  TrendingDown,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { createTemplate, TemplateExercise, TemplateSet } from '@/lib/api/templates';
import { ExerciseSearch } from '@/components/exercise/ExerciseSearch';
import { ExerciseDBExercise } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { lightHaptic, successHaptic, mediumHaptic } from '@/lib/utils/haptics';
import { useUnits } from '@/hooks/useUnits';
import { getCurrentTab } from '@/lib/navigation/navigationState';

// ============================================
// Types
// ============================================

interface NewSet {
  id: string;
  set_number: number;
  target_weight: string;
  target_reps: string;
  set_type: 'normal' | 'warmup' | 'dropset' | 'failure';
}

interface NewExercise {
  id: string;
  exercise: ExerciseDBExercise;
  rest_seconds: number;
  sets: NewSet[];
}

// ============================================
// Set Type Picker Modal
// ============================================

interface SetTypePickerProps {
  visible: boolean;
  currentType: NewSet['set_type'];
  onSelect: (type: NewSet['set_type']) => void;
  onClose: () => void;
}

const setTypeOptions: Array<{
  type: NewSet['set_type'];
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}> = [
  {
    type: 'normal',
    label: 'Normal',
    description: 'Standard working set',
    icon: <Target size={20} color="#3b82f6" />,
    color: '#3b82f6',
  },
  {
    type: 'warmup',
    label: 'Warm-up',
    description: 'Lower weight to prepare muscles',
    icon: <Flame size={20} color="#f59e0b" />,
    color: '#f59e0b',
  },
  {
    type: 'dropset',
    label: 'Drop Set',
    description: 'Reduce weight and continue',
    icon: <TrendingDown size={20} color="#8b5cf6" />,
    color: '#8b5cf6',
  },
  {
    type: 'failure',
    label: 'To Failure',
    description: 'Push until muscle failure',
    icon: <Flame size={20} color="#ef4444" />,
    color: '#ef4444',
  },
];

const SetTypePicker: React.FC<SetTypePickerProps> = ({
  visible,
  currentType,
  onSelect,
  onClose,
}) => (
  <Modal visible={visible} transparent={true} animationType="fade">
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <Pressable style={styles.setTypeModal} onPress={(e) => e.stopPropagation()}>
        <View style={styles.setTypeHeader}>
          <Text style={styles.setTypeTitle}>Set Type</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {setTypeOptions.map((option) => (
          <TouchableOpacity
            key={option.type}
            style={[
              styles.setTypeOption,
              currentType === option.type && styles.setTypeOptionSelected,
            ]}
            onPress={() => {
              lightHaptic();
              onSelect(option.type);
              onClose();
            }}
          >
            <View style={[styles.setTypeIcon, { backgroundColor: option.color + '20' }]}>
              {option.icon}
            </View>
            <View style={styles.setTypeInfo}>
              <Text style={styles.setTypeLabel}>{option.label}</Text>
              <Text style={styles.setTypeDescription}>{option.description}</Text>
            </View>
            {currentType === option.type && (
              <View style={[styles.setTypeCheck, { backgroundColor: option.color }]}>
                <Text style={styles.setTypeCheckText}>S</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </Pressable>
    </Pressable>
  </Modal>
);

// ============================================
// Set Row Component
// ============================================

interface SetRowProps {
  set: NewSet;
  onUpdate: (updates: Partial<NewSet>) => void;
  onDelete: () => void;
  onTypePress: () => void;
}

const SetRow: React.FC<SetRowProps> = ({ set, onUpdate, onDelete, onTypePress }) => {
  const typeInfo = setTypeOptions.find((o) => o.type === set.set_type) || setTypeOptions[0];

  return (
    <View style={styles.setRow}>
      {/* Set Number with Type Badge */}
      <TouchableOpacity style={styles.setNumberContainer} onPress={onTypePress}>
        <Text style={styles.setNumber}>{set.set_number}</Text>
        {set.set_type !== 'normal' && (
          <View style={[styles.setTypeBadge, { backgroundColor: typeInfo.color }]}>
            <Text style={styles.setTypeBadgeText}>
              {set.set_type === 'warmup' ? 'W' : set.set_type === 'dropset' ? 'D' : 'F'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Weight Input */}
      <View style={styles.setInputGroup}>
        <TextInput
          style={styles.setInput}
          value={set.target_weight}
          onChangeText={(text) => onUpdate({ target_weight: text.replace(/[^0-9.]/g, '') })}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor="#64748b"
          selectTextOnFocus={true}
        />
        <Text style={styles.setInputUnit}>{weightUnit}</Text>
      </View>

      {/* Reps Input */}
      <View style={styles.setInputGroup}>
        <TextInput
          style={styles.setInput}
          value={set.target_reps}
          onChangeText={(text) => onUpdate({ target_reps: text.replace(/[^0-9]/g, '') })}
          keyboardType="number-pad"
          placeholder="10"
          placeholderTextColor="#64748b"
          selectTextOnFocus={true}
        />
        <Text style={styles.setInputUnit}>reps</Text>
      </View>

      {/* Delete Button */}
      <TouchableOpacity style={styles.setDeleteButton} onPress={onDelete}>
        <X size={16} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );
};

// ============================================
// Exercise Row Component
// ============================================

interface ExerciseRowProps {
  exercise: NewExercise;
  index: number;
  totalCount: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onUpdate: (updates: Partial<NewExercise>) => void;
  onAddSet: () => void;
  onUpdateSet: (setIndex: number, updates: Partial<NewSet>) => void;
  onDeleteSet: (setIndex: number) => void;
  onSetTypePress: (setIndex: number) => void;
}

const ExerciseRow: React.FC<ExerciseRowProps> = ({
  exercise,
  index,
  totalCount,
  onMoveUp,
  onMoveDown,
  onRemove,
  onUpdate,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onSetTypePress,
}) => (
  <View style={styles.exerciseRow}>
    {/* Exercise Header */}
    <View style={styles.exerciseHeader}>
      <View style={styles.exerciseOrderButtons}>
        <TouchableOpacity
          onPress={onMoveUp}
          disabled={index === 0}
          style={[styles.orderButton, index === 0 && styles.orderButtonDisabled]}
        >
          <ChevronUp size={16} color={index === 0 ? '#475569' : '#94a3b8'} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onMoveDown}
          disabled={index === totalCount - 1}
          style={[styles.orderButton, index === totalCount - 1 && styles.orderButtonDisabled]}
        >
          <ChevronDown size={16} color={index === totalCount - 1 ? '#475569' : '#94a3b8'} />
        </TouchableOpacity>
      </View>

      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseNumber}>{index + 1}.</Text>
        <Text style={styles.exerciseName} numberOfLines={1}>
          {exercise.exercise.name}
        </Text>
      </View>

      <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
        <Trash2 size={18} color="#ef4444" />
      </TouchableOpacity>
    </View>

    {/* Rest Time */}
    <View style={styles.restTimeRow}>
      <Text style={styles.restTimeLabel}>Rest between sets:</Text>
      <TextInput
        style={styles.restTimeInput}
        value={exercise.rest_seconds.toString()}
        onChangeText={(text) => onUpdate({ rest_seconds: parseInt(text) || 90 })}
        keyboardType="number-pad"
        selectTextOnFocus={true}
      />
      <Text style={styles.restTimeUnit}>sec</Text>
    </View>

    {/* Sets Header */}
    <View style={styles.setsHeader}>
      <Text style={styles.setsHeaderText}>SET</Text>
      <Text style={[styles.setsHeaderText, styles.setsHeaderWeight]}>WEIGHT</Text>
      <Text style={[styles.setsHeaderText, styles.setsHeaderReps]}>REPS</Text>
      <View style={{ width: 24 }} />
    </View>

    {/* Sets List */}
    {exercise.sets.map((set, setIndex) => (
      <SetRow
        key={set.id}
        set={set}
        onUpdate={(updates) => onUpdateSet(setIndex, updates)}
        onDelete={() => onDeleteSet(setIndex)}
        onTypePress={() => onSetTypePress(setIndex)}
      />
    ))}

    {/* Add Set Button */}
    <TouchableOpacity style={styles.addSetButton} onPress={onAddSet}>
      <Plus size={16} color="#3b82f6" />
      <Text style={styles.addSetText}>Add Set</Text>
    </TouchableOpacity>
  </View>
);

// ============================================
// Main Screen Component
// ============================================

export default function CreateTemplateScreen() {
  const { user } = useAuthStore();
  const { weightUnit } = useUnits();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<NewExercise[]>([]);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Set type picker state
  const [setTypePickerVisible, setSetTypePickerVisible] = useState(false);
  const [selectedSetInfo, setSelectedSetInfo] = useState<{
    exerciseIndex: number;
    setIndex: number;
  } | null>(null);

  // Generate unique ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Create default set
  const createDefaultSet = (setNumber: number): NewSet => ({
    id: generateId(),
    set_number: setNumber,
    target_weight: '',
    target_reps: '10',
    set_type: 'normal',
  });

  // Add exercise
  const handleAddExercise = useCallback(async (exercise: ExerciseDBExercise) => {
    lightHaptic();

    // First, ensure exercise exists in DB
    let exerciseId: string;

    const { data: existingExercise } = await supabase
      .from('exercises')
      .select('id')
      .eq('external_id', exercise.id)
      .single();

    if (existingExercise) {
      exerciseId = existingExercise.id;
    } else {
      const { data: newExercise, error } = await supabase
        .from('exercises')
        .insert({
          external_id: exercise.id,
          name: exercise.name,
          primary_muscles: [exercise.target],
          secondary_muscles: exercise.secondaryMuscles || [],
          equipment: exercise.equipment,
          category: exercise.bodyPart,
          gif_url: exercise.gifUrl,
          instructions: exercise.instructions || [],
          is_custom: false,
        })
        .select()
        .single();

      if (error) {
 logger.error('Error creating exercise:', error);
        return;
      }
      exerciseId = newExercise.id;
    }

    const newExercise: NewExercise = {
      id: exerciseId,
      exercise,
      rest_seconds: 90,
      sets: [
        createDefaultSet(1),
        createDefaultSet(2),
        createDefaultSet(3),
      ],
    };

    setExercises((prev) => [...prev, newExercise]);
    setShowExerciseSearch(false);
  }, []);

  // Remove exercise
  const handleRemoveExercise = useCallback((index: number) => {
    mediumHaptic();
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Move exercise
  const handleMoveExercise = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= exercises.length) return;

    lightHaptic();
    setExercises((prev) => {
      const newExercises = [...prev];
      const [moved] = newExercises.splice(fromIndex, 1);
      newExercises.splice(toIndex, 0, moved);
      return newExercises;
    });
  }, [exercises.length]);

  // Update exercise
  const handleUpdateExercise = useCallback((index: number, updates: Partial<NewExercise>) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, ...updates } : ex))
    );
  }, []);

  // Add set to exercise
  const handleAddSet = useCallback((exerciseIndex: number) => {
    lightHaptic();
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exerciseIndex) return ex;

        const lastSet = ex.sets[ex.sets.length - 1];
        const newSet: NewSet = {
          id: generateId(),
          set_number: ex.sets.length + 1,
          target_weight: lastSet?.target_weight || '',
          target_reps: lastSet?.target_reps || '10',
          set_type: 'normal',
        };

        return { ...ex, sets: [...ex.sets, newSet] };
      })
    );
  }, []);

  // Update set
  const handleUpdateSet = useCallback(
    (exerciseIndex: number, setIndex: number, updates: Partial<NewSet>) => {
      setExercises((prev) =>
        prev.map((ex, i) => {
          if (i !== exerciseIndex) return ex;
          const newSets = ex.sets.map((set, si) =>
            si === setIndex ? { ...set, ...updates } : set
          );
          return { ...ex, sets: newSets };
        })
      );
    },
    []
  );

  // Delete set
  const handleDeleteSet = useCallback((exerciseIndex: number, setIndex: number) => {
    lightHaptic();
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exerciseIndex) return ex;
        if (ex.sets.length <= 1) return ex; // Keep at least one set

        const newSets = ex.sets
          .filter((_, si) => si !== setIndex)
          .map((set, idx) => ({ ...set, set_number: idx + 1 }));

        return { ...ex, sets: newSets };
      })
    );
  }, []);

  // Open set type picker
  const handleSetTypePress = useCallback((exerciseIndex: number, setIndex: number) => {
    lightHaptic();
    setSelectedSetInfo({ exerciseIndex, setIndex });
    setSetTypePickerVisible(true);
  }, []);

  // Select set type
  const handleSelectSetType = useCallback((type: NewSet['set_type']) => {
    if (!selectedSetInfo) return;
    handleUpdateSet(selectedSetInfo.exerciseIndex, selectedSetInfo.setIndex, { set_type: type });
    setSelectedSetInfo(null);
  }, [selectedSetInfo, handleUpdateSet]);

  // Save template
  const handleSave = async () => {
    if (!user?.id) return;

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }

    if (exercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }

    setIsSaving(true);

    try {
      // Calculate target muscles from exercises
      const targetMuscles = [...new Set(
        exercises.map((ex) => ex.exercise.target).filter(Boolean)
      )];

      // Estimate duration
      const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
      const totalRestTime = exercises.reduce(
        (acc, ex) => acc + (ex.sets.length * ex.rest_seconds),
        0
      );
      const estimatedDuration = Math.round((totalSets * 1.5) + (totalRestTime / 60));

      const templateExercises: TemplateExercise[] = exercises.map((ex, index) => ({
        exercise_id: ex.id,
        order_index: index,
        target_sets: ex.sets.length,
        rest_seconds: ex.rest_seconds,
        sets: ex.sets.map((set) => ({
          set_number: set.set_number,
          target_weight: set.target_weight ? parseFloat(set.target_weight) : undefined,
          target_reps: parseInt(set.target_reps) || 10,
          set_type: set.set_type,
        })),
      }));

      const template = await createTemplate({
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || undefined,
        target_muscles: targetMuscles,
        estimated_duration: estimatedDuration,
        exercises: templateExercises,
      });

      successHaptic();
      router.replace(`/template/${template.id}`);
    } catch (error) {
 logger.error('Error creating template:', error);
      Alert.alert('Error', 'Failed to create template');
    } finally {
      setIsSaving(false);
    }
  };

  // Get current set type for picker
  const getCurrentSetType = (): NewSet['set_type'] => {
    if (!selectedSetInfo) return 'normal';
    const exercise = exercises[selectedSetInfo.exerciseIndex];
    if (!exercise) return 'normal';
    const set = exercise.sets[selectedSetInfo.setIndex];
    return set?.set_type || 'normal';
  };

  // Show exercise search
  if (showExerciseSearch) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        <ExerciseSearch
          onSelectExercise={handleAddExercise}
          onClose={() => setShowExerciseSearch(false)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Set Type Picker Modal */}
      <SetTypePicker
        visible={setTypePickerVisible}
        currentType={getCurrentSetType()}
        onSelect={handleSelectSetType}
        onClose={() => {
          setSetTypePickerVisible(false);
          setSelectedSetInfo(null);
        }}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push(getCurrentTab() || '/(tabs)')}
        >
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>New Template</Text>

        <TouchableOpacity
          style={[styles.saveButton, (!name.trim() || exercises.length === 0) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!name.trim() || exercises.length === 0 || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Template Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Template Name *</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Push Day, Upper Body, etc."
            placeholderTextColor="#64748b"
            autoFocus={true}
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Description (optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Brief description of this workout..."
            placeholderTextColor="#64748b"
            multiline={true}
            numberOfLines={3}
          />
        </View>

        {/* Exercises Section */}
        <View style={styles.exercisesSection}>
          <Text style={styles.sectionTitle}>EXERCISES</Text>

          {exercises.length > 0 ? (
            <View style={styles.exercisesList}>
              {exercises.map((exercise, index) => (
                <ExerciseRow
                  key={`${exercise.id}-${index}`}
                  exercise={exercise}
                  index={index}
                  totalCount={exercises.length}
                  onMoveUp={() => handleMoveExercise(index, index - 1)}
                  onMoveDown={() => handleMoveExercise(index, index + 1)}
                  onRemove={() => handleRemoveExercise(index)}
                  onUpdate={(updates) => handleUpdateExercise(index, updates)}
                  onAddSet={() => handleAddSet(index)}
                  onUpdateSet={(setIndex, updates) => handleUpdateSet(index, setIndex, updates)}
                  onDeleteSet={(setIndex) => handleDeleteSet(index, setIndex)}
                  onSetTypePress={(setIndex) => handleSetTypePress(index, setIndex)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.noExercises}>
              <Text style={styles.noExercisesText}>No exercises added yet</Text>
              <Text style={styles.noExercisesSubtext}>
                Add exercises and customize each set with specific weight and rep targets
              </Text>
            </View>
          )}

          {/* Add Exercise Button */}
          <TouchableOpacity
            style={styles.addExerciseButton}
            onPress={() => {
              lightHaptic();
              setShowExerciseSearch(true);
            }}
            activeOpacity={0.7}
          >
            <Plus size={20} color="#3b82f6" />
            <Text style={styles.addExerciseText}>Add Exercise</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },

  backButton: {
    padding: 4,
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  saveButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },

  saveButtonDisabled: {
    opacity: 0.5,
  },

  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },

  // Content
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
  },

  bottomSpacer: {
    height: 100,
  },

  // Input Groups
  inputGroup: {
    marginBottom: 20,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 8,
  },

  textInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
  },

  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  // Exercises Section
  exercisesSection: {
    marginTop: 8,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 12,
  },

  exercisesList: {
    gap: 12,
  },

  noExercises: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },

  noExercisesText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },

  noExercisesSubtext: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Exercise Row
  exerciseRow: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
  },

  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  exerciseOrderButtons: {
    marginRight: 10,
  },

  orderButton: {
    padding: 4,
  },

  orderButtonDisabled: {
    opacity: 0.3,
  },

  exerciseInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  exerciseNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748b',
    marginRight: 8,
  },

  exerciseName: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'capitalize',
  },

  removeButton: {
    padding: 8,
  },

  // Rest Time Row
  restTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  restTimeLabel: {
    fontSize: 13,
    color: '#94a3b8',
    marginRight: 8,
  },

  restTimeInput: {
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    minWidth: 50,
  },

  restTimeUnit: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 4,
  },

  // Sets Header
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#0f172a',
  },

  setsHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 1,
    width: 44,
    textAlign: 'center',
  },

  setsHeaderWeight: {
    flex: 1,
    marginLeft: 8,
    textAlign: 'left',
  },

  setsHeaderReps: {
    flex: 1,
    textAlign: 'left',
  },

  // Set Row
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  setNumberContainer: {
    width: 44,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },

  setNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#94a3b8',
  },

  setTypeBadge: {
    width: 14,
    height: 14,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },

  setTypeBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  setInputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },

  setInput: {
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    minWidth: 60,
    flex: 1,
    maxWidth: 80,
  },

  setInputUnit: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
    width: 24,
  },

  setDeleteButton: {
    padding: 8,
    marginLeft: 4,
  },

  // Add Set Button
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },

  addSetText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3b82f6',
  },

  // Add Exercise Button
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 12,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
    gap: 8,
  },

  addExerciseText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#3b82f6',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  setTypeModal: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    width: '100%',
    maxWidth: 340,
    overflow: 'hidden',
  },

  setTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  setTypeTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  setTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  setTypeOptionSelected: {
    backgroundColor: '#334155',
  },

  setTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  setTypeInfo: {
    flex: 1,
  },

  setTypeLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },

  setTypeDescription: {
    fontSize: 12,
    color: '#94a3b8',
  },

  setTypeCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  setTypeCheckText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});