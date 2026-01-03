import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { logger } from '@/lib/utils/logger';
import {
  ArrowLeft,
  MoreVertical,
  Edit3,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Play,
  Clock,
  Calendar,
  X,
  Check,
  Copy,
  Share2,
  Clipboard,
  FileJson,
  MessageSquare,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { useAuthStore } from '@/stores/authStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import {
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  Template,
  TemplateExercise,
} from '@/lib/api/templates';
import { fetchPreviousWorkoutData } from '@/hooks/usePreviousWorkout';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui';
import { lightHaptic, mediumHaptic, successHaptic } from '@/lib/utils/haptics';
import {
  copyTemplateToClipboard,
  shareTemplate,
  shareTemplateAsJSON,
} from '@/lib/utils/templateShare';
import { useUnits } from '@/hooks/useUnits';
import { getCurrentTab } from '@/lib/navigation/navigationState';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';

// ============================================
// Exercise Row Component
// ============================================

interface ExerciseRowProps {
  exercise: TemplateExercise;
  index: number;
  totalCount: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
  weightUnit: string;
}

const ExerciseRow: React.FC<ExerciseRowProps> = ({
  exercise,
  index,
  totalCount,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
  weightUnit,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Check if exercise has individual sets
  const hasIndividualSets = exercise.sets && exercise.sets.length > 0;

  const repsText = exercise.target_reps_min && exercise.target_reps_max
    ? `${exercise.target_reps_min}-${exercise.target_reps_max}`
    : exercise.target_reps_min || exercise.target_reps_max || '8-12';

  const setTypeColors: Record<string, string> = {
    normal: '#3b82f6',
    warmup: '#f59e0b',
    dropset: '#8b5cf6',
    failure: '#ef4444',
  };

  return (
    <>
      <TouchableOpacity
        style={styles.exerciseRow}
        onPress={() => hasIndividualSets ? setExpanded(!expanded) : onEdit()}
        onLongPress={() => {
          lightHaptic();
          setShowMenu(true);
        }}
        activeOpacity={0.7}
      >
        <TouchableOpacity
          style={styles.dragHandle}
          onPress={() => {
            lightHaptic();
            setShowMenu(true);
          }}
        >
          <GripVertical size={20} color="#6b7280" />
        </TouchableOpacity>

        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName} numberOfLines={1}>
            {exercise.exercise?.name || 'Unknown Exercise'}
          </Text>
          {exercise.notes && (
            <Text style={styles.exerciseNotes} numberOfLines={1}>
              {exercise.notes}
            </Text>
          )}
        </View>

        <View style={styles.setsInfo}>
          <Text style={styles.setsText}>
            {hasIndividualSets ? exercise.sets!.length : (exercise.target_sets || 3)} sets
          </Text>
          {hasIndividualSets && (
            <Text style={styles.expandHint}>{expanded ? '▲' : '▼'}</Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Individual Sets (when expanded) */}
      {expanded && hasIndividualSets && (
        <View style={styles.setsExpanded}>
          {exercise.sets!.map((set, setIdx) => (
            <View key={setIdx} style={styles.setDetailRow}>
              <View style={styles.setNumberBadge}>
                <Text style={styles.setNumberText}>{set.set_number}</Text>
                {set.set_type !== 'normal' && (
                  <View style={[styles.setTypeDot, { backgroundColor: setTypeColors[set.set_type] }]} />
                )}
              </View>
              <Text style={styles.setDetailText}>
                {set.target_weight ? `${set.target_weight} ${weightUnit}` : '—'}  {set.target_reps} reps
              </Text>
              {set.set_type !== 'normal' && (
                <Text style={[styles.setTypeLabel, { color: setTypeColors[set.set_type] }]}>
                  {set.set_type === 'warmup' ? 'Warm-up' : 
                   set.set_type === 'dropset' ? 'Drop' : 'Failure'}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Reorder Menu */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle} numberOfLines={1}>
                {exercise.exercise?.name}
              </Text>
              <Text style={styles.menuSubtitle}>
                Exercise {index + 1} of {totalCount}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.menuItem, index === 0 && styles.menuItemDisabled]}
              onPress={() => {
                setShowMenu(false);
                onMoveUp();
              }}
              disabled={index === 0}
            >
              <ChevronUp size={20} color={index === 0 ? '#475569' : '#3b82f6'} />
              <Text style={[styles.menuItemText, index === 0 && styles.menuItemTextDisabled]}>
                Move Up
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, index === totalCount - 1 && styles.menuItemDisabled]}
              onPress={() => {
                setShowMenu(false);
                onMoveDown();
              }}
              disabled={index === totalCount - 1}
            >
              <ChevronDown size={20} color={index === totalCount - 1 ? '#475569' : '#3b82f6'} />
              <Text style={[styles.menuItemText, index === totalCount - 1 && styles.menuItemTextDisabled]}>
                Move Down
              </Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                onDelete();
              }}
            >
              <Trash2 size={20} color="#ef4444" />
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
                Remove Exercise
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemCancel]}
              onPress={() => setShowMenu(false)}
            >
              <Text style={styles.menuItemTextCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

// ============================================
// Edit Exercise Modal
// ============================================

interface EditExerciseModalProps {
  exercise: TemplateExercise | null;
  visible: boolean;
  onClose: () => void;
  onSave: (updates: Partial<TemplateExercise>) => void;
}

const EditExerciseModal: React.FC<EditExerciseModalProps> = ({
  exercise,
  visible,
  onClose,
  onSave,
}) => {
  const [targetSets, setTargetSets] = useState('3');
  const [repsMin, setRepsMin] = useState('8');
  const [repsMax, setRepsMax] = useState('12');
  const [restSeconds, setRestSeconds] = useState('90');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (exercise) {
      setTargetSets(exercise.target_sets?.toString() || '3');
      setRepsMin(exercise.target_reps_min?.toString() || '8');
      setRepsMax(exercise.target_reps_max?.toString() || '12');
      setRestSeconds(exercise.rest_seconds?.toString() || '90');
      setNotes(exercise.notes || '');
    }
  }, [exercise]);

  const handleSave = () => {
    onSave({
      target_sets: parseInt(targetSets) || 3,
      target_reps_min: parseInt(repsMin) || undefined,
      target_reps_max: parseInt(repsMax) || undefined,
      rest_seconds: parseInt(restSeconds) || 90,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  if (!exercise) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.editModalContainer}>
        <View style={styles.editModalContent}>
          {/* Header */}
          <View style={styles.editModalHeader}>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#94a3b8" />
            </TouchableOpacity>
            <Text style={styles.editModalTitle} numberOfLines={1}>
              {exercise.exercise?.name}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Check size={24} color="#3b82f6" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.editModalBody}>
            {/* Target Sets */}
            <View style={styles.editField}>
              <Text style={styles.editLabel}>Target Sets</Text>
              <TextInput
                style={styles.editInput}
                value={targetSets}
                onChangeText={setTargetSets}
                keyboardType="number-pad"
                placeholder="3"
                placeholderTextColor="#64748b"
              />
            </View>

            {/* Rep Range */}
            <View style={styles.editField}>
              <Text style={styles.editLabel}>Rep Range</Text>
              <View style={styles.repRangeRow}>
                <TextInput
                  style={[styles.editInput, styles.repInput]}
                  value={repsMin}
                  onChangeText={setRepsMin}
                  keyboardType="number-pad"
                  placeholder="8"
                  placeholderTextColor="#64748b"
                />
                <Text style={styles.repDash}>–</Text>
                <TextInput
                  style={[styles.editInput, styles.repInput]}
                  value={repsMax}
                  onChangeText={setRepsMax}
                  keyboardType="number-pad"
                  placeholder="12"
                  placeholderTextColor="#64748b"
                />
              </View>
            </View>

            {/* Rest Time */}
            <View style={styles.editField}>
              <Text style={styles.editLabel}>Rest Time (seconds)</Text>
              <TextInput
                style={styles.editInput}
                value={restSeconds}
                onChangeText={setRestSeconds}
                keyboardType="number-pad"
                placeholder="90"
                placeholderTextColor="#64748b"
              />
            </View>

            {/* Notes */}
            <View style={styles.editField}>
              <Text style={styles.editLabel}>Notes</Text>
              <TextInput
                style={[styles.editInput, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes..."
                placeholderTextColor="#64748b"
                multiline={true}
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ============================================
// Main Screen Component
// ============================================

export default function TemplateDetailScreen() {
  useBackNavigation(); // Enable Android back gesture support

  const { id } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const { user } = useAuthStore();
  const { startWorkout, addExerciseWithSets, isWorkoutActive } = useWorkoutStore();
  const { weightUnit } = useUnits();

  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempDescription, setTempDescription] = useState('');
  const [editingExercise, setEditingExercise] = useState<TemplateExercise | null>(null);

  // Fetch template
  const fetchTemplate = useCallback(async () => {
    if (!id) return;

    try {
      const data = await getTemplateById(id);
      setTemplate(data);
      setTempName(data.name);
      setTempDescription(data.description || '');
    } catch (error) {
 logger.error('Error fetching template:', error);
      Alert.alert('Error', 'Failed to load template');
      router.push(getCurrentTab() || '/(tabs)');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  // Save template updates
  const saveTemplate = useCallback(async (updates: Partial<Template>) => {
    if (!id) return;

    setIsSaving(true);
    try {
      await updateTemplate(id, updates);
      setTemplate((prev) => prev ? { ...prev, ...updates } : prev);
    } catch (error) {
 logger.error('Error saving template:', error);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [id]);

  // Save name
  const handleSaveName = () => {
    if (tempName.trim() && tempName !== template?.name) {
      saveTemplate({ name: tempName.trim() });
    }
    setEditingName(false);
  };

  // Save description
  const handleSaveDescription = () => {
    if (tempDescription !== template?.description) {
      saveTemplate({ description: tempDescription.trim() || undefined });
    }
    setEditingDescription(false);
  };

  // Delete template
  const handleDeleteTemplate = () => {
    Alert.alert(
      'Delete Template?',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTemplate(id!);
              router.push(getCurrentTab() || '/(tabs)');
            } catch (error) {
 logger.error('Error deleting template:', error);
              Alert.alert('Error', 'Failed to delete template');
            }
          },
        },
      ]
    );
  };

  // Duplicate template
  const handleDuplicateTemplate = async () => {
    if (!id) return;

    try {
      const copy = await duplicateTemplate(id);
      successHaptic();
      // Navigate to the new template
      router.replace(`/template/${copy.id}`);
    } catch (error) {
 logger.error('Error duplicating template:', error);
      Alert.alert('Error', 'Failed to duplicate template');
    }
  };

  // Share handlers
  const handleCopyToClipboard = async () => {
    if (!template) return;

    const success = await copyTemplateToClipboard(template);
    setShowShareMenu(false);
    
    if (success) {
      successHaptic();
      Alert.alert('Copied!', 'Template copied to clipboard');
    } else {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const handleShareTemplate = async () => {
    if (!template) return;

    setShowShareMenu(false);
    await shareTemplate(template);
  };

  const handleExportJSON = async () => {
    if (!template) return;

    setShowShareMenu(false);
    await shareTemplateAsJSON(template);
  };

  // Reorder exercise
  const handleMoveExercise = async (fromIndex: number, toIndex: number) => {
    if (!template?.exercises) return;

    mediumHaptic();
    const exercises = [...template.exercises];
    const [moved] = exercises.splice(fromIndex, 1);
    exercises.splice(toIndex, 0, moved);

    // Update order indices
    const reordered = exercises.map((ex, idx) => ({
      ...ex,
      order_index: idx,
    }));

    setTemplate({ ...template, exercises: reordered });

    // Save to database
    try {
      for (const ex of reordered) {
        await supabase
          .from('template_exercises')
          .update({ order_index: ex.order_index })
          .eq('id', ex.id);
      }
    } catch (error) {
 logger.error('Error saving order:', error);
    }
  };

  // Delete exercise from template
  const handleDeleteExercise = async (exerciseId: string) => {
    if (!template?.exercises) return;

    Alert.alert(
      'Remove Exercise?',
      'Remove this exercise from the template?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase
                .from('template_exercises')
                .delete()
                .eq('id', exerciseId);

              setTemplate((prev) =>
                prev
                  ? {
                      ...prev,
                      exercises: prev.exercises?.filter((e) => e.id !== exerciseId),
                    }
                  : prev
              );
            } catch (error) {
 logger.error('Error deleting exercise:', error);
            }
          },
        },
      ]
    );
  };

  // Edit exercise
  const handleEditExercise = (exercise: TemplateExercise) => {
    lightHaptic();
    setEditingExercise(exercise);
  };

  // Save exercise edits
  const handleSaveExercise = async (updates: Partial<TemplateExercise>) => {
    if (!editingExercise?.id) return;

    try {
      await supabase
        .from('template_exercises')
        .update(updates)
        .eq('id', editingExercise.id);

      setTemplate((prev) =>
        prev
          ? {
              ...prev,
              exercises: prev.exercises?.map((e) =>
                e.id === editingExercise.id ? { ...e, ...updates } : e
              ),
            }
          : prev
      );
    } catch (error) {
 logger.error('Error saving exercise:', error);
    }
  };

  // Add exercise
  const handleAddExercise = () => {
    lightHaptic();
    // Navigate to exercise search with callback
    router.push({
      pathname: '/template/add-exercise',
      params: { templateId: id },
    });
  };

  // Start workout from template
  const handleStartWorkout = async () => {
    if (!template?.id || !user?.id) return;

    if (isWorkoutActive) {
      Alert.alert(
        'Workout in Progress',
        'You have an active workout. Finish or discard it first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Workout', onPress: () => router.push('/workout/active') },
        ]
      );
      return;
    }

    successHaptic();

    try {
      // Start workout
      startWorkout(template.name, template.id);

      // Add exercises with auto-fill
      if (template.exercises && template.exercises.length > 0) {
        for (const templateExercise of template.exercises) {
          if (templateExercise.exercise) {
            // Fetch previous workout data for this exercise
            const previousData = await fetchPreviousWorkoutData(
              user.id,
              templateExercise.exercise.external_id
            );

            let prefillSets: Array<{ weight?: number; reps?: number }> = [];

            // Priority: 1) Template sets, 2) Previous workout, 3) Legacy target_weight
            if (templateExercise.sets && templateExercise.sets.length > 0) {
              // Use individual template set targets
              prefillSets = templateExercise.sets.map((templateSet, idx) => {
                // Check if previous workout has data for this set number
                const prevSet = previousData?.sets[idx];
                return {
                  // Previous workout takes priority over template targets
                  weight: prevSet?.weight ?? templateSet.target_weight,
                  reps: prevSet?.reps ?? templateSet.target_reps,
                };
              });
            } else if (previousData && previousData.sets.length > 0) {
              // Fallback to previous workout data
              prefillSets = previousData.sets.map((s) => ({
                weight: s.weight,
                reps: s.reps,
              }));
            } else if (templateExercise.target_weight) {
              // Fallback to legacy target_weight/reps
              prefillSets = [{
                weight: templateExercise.target_weight,
                reps: templateExercise.target_reps_min || templateExercise.target_reps_max || undefined,
              }];
            }

            const targetSets = templateExercise.sets?.length || templateExercise.target_sets || 3;

            addExerciseWithSets(
              {
                id: templateExercise.exercise.external_id,
                name: templateExercise.exercise.name,
                bodyPart: templateExercise.exercise.primary_muscles?.[0] || '',
                equipment: templateExercise.exercise.equipment || '',
                gifUrl: templateExercise.exercise.gif_url || undefined,
                target: templateExercise.exercise.primary_muscles?.[0] || '',
              },
              prefillSets,
              targetSets
            );
          }
        }
      }

      router.push('/workout/active');
    } catch (error) {
 logger.error('Error starting workout:', error);
    }
  };

  // Loading
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  if (!template) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Template not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push(getCurrentTab() || '/(tabs)')}
        >
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Template</Text>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              lightHaptic();
              setShowShareMenu(true);
            }}
          >
            <Share2 size={22} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setShowMenu(true)}
          >
            <MoreVertical size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Template Name */}
        <View style={styles.nameSection}>
          {editingName ? (
            <View style={styles.editNameRow}>
              <TextInput
                style={styles.nameInput}
                value={tempName}
                onChangeText={setTempName}
                autoFocus={true}
                onBlur={handleSaveName}
                onSubmitEditing={handleSaveName}
              />
              <TouchableOpacity onPress={handleSaveName}>
                <Check size={24} color="#3b82f6" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.nameRow}
              onPress={() => {
                setTempName(template.name);
                setEditingName(true);
              }}
            >
              <Text style={styles.templateName}>{template.name}</Text>
              <Edit3 size={18} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        {/* Description */}
        <TouchableOpacity
          style={styles.descriptionSection}
          onPress={() => {
            setTempDescription(template.description || '');
            setEditingDescription(true);
          }}
        >
          {template.description ? (
            <Text style={styles.description}>{template.description}</Text>
          ) : (
            <Text style={styles.descriptionPlaceholder}>Add description...</Text>
          )}
        </TouchableOpacity>

        {/* Info Row */}
        <View style={styles.infoRow}>
          {template.estimated_duration && (
            <View style={styles.infoBadge}>
              <Clock size={14} color="#94a3b8" />
              <Text style={styles.infoText}>~{template.estimated_duration} min</Text>
            </View>
          )}

          <View style={styles.infoBadge}>
            <Calendar size={14} color="#94a3b8" />
            <Text style={styles.infoText}>
              Used {template.times_used || 0}×
            </Text>
          </View>

          {template.created_at && (
            <Text style={styles.createdText}>
              Created {format(new Date(template.created_at), 'MMM d, yyyy')}
            </Text>
          )}
        </View>

        {/* Target Muscles */}
        {template.target_muscles && template.target_muscles.length > 0 && (
          <View style={styles.musclesSection}>
            {template.target_muscles.map((muscle, index) => (
              <View key={index} style={styles.muscleBadge}>
                <Text style={styles.muscleBadgeText}>{muscle}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Exercises Section */}
        <View style={styles.exercisesSection}>
          <Text style={styles.sectionTitle}>EXERCISES</Text>

          {template.exercises && template.exercises.length > 0 ? (
            <Card variant="default" style={styles.exercisesList}>
              {template.exercises.map((exercise, index) => (
                <ExerciseRow
                  key={exercise.id}
                  exercise={exercise}
                  index={index}
                  totalCount={template.exercises!.length}
                  onMoveUp={() => handleMoveExercise(index, index - 1)}
                  onMoveDown={() => handleMoveExercise(index, index + 1)}
                  onEdit={() => handleEditExercise(exercise)}
                  onDelete={() => handleDeleteExercise(exercise.id!)}
                  weightUnit={weightUnit}
                />
              ))}
            </Card>
          ) : (
            <View style={styles.noExercises}>
              <Text style={styles.noExercisesText}>No exercises yet</Text>
            </View>
          )}

          {/* Add Exercise Button */}
          <TouchableOpacity
            style={styles.addExerciseButton}
            onPress={handleAddExercise}
            activeOpacity={0.7}
          >
            <Plus size={20} color="#3b82f6" />
            <Text style={styles.addExerciseText}>Add Exercise</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Start Workout Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartWorkout}
          activeOpacity={0.8}
        >
          <Play size={20} color="#ffffff" fill="#ffffff" />
          <Text style={styles.startButtonText}>
            Start {template.name} Workout
          </Text>
        </TouchableOpacity>
      </View>

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                handleDuplicateTemplate();
              }}
            >
              <Copy size={20} color="#3b82f6" />
              <Text style={styles.menuItemText}>Duplicate Template</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                handleDeleteTemplate();
              }}
            >
              <Trash2 size={20} color="#ef4444" />
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
                Delete Template
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemCancel]}
              onPress={() => setShowMenu(false)}
            >
              <Text style={styles.menuItemTextCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Share Modal */}
      <Modal
        visible={showShareMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowShareMenu(false)}
      >
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setShowShareMenu(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.shareHeader}>
              <Share2 size={24} color="#3b82f6" />
              <Text style={styles.shareTitle}>Share Template</Text>
            </View>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleCopyToClipboard}
            >
              <Clipboard size={20} color="#3b82f6" />
              <View style={styles.shareItemContent}>
                <Text style={styles.menuItemText}>Copy to Clipboard</Text>
                <Text style={styles.shareItemDescription}>
                  Copy template as text
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleShareTemplate}
            >
              <MessageSquare size={20} color="#3b82f6" />
              <View style={styles.shareItemContent}>
                <Text style={styles.menuItemText}>Share</Text>
                <Text style={styles.shareItemDescription}>
                  Send via messages, email, etc.
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleExportJSON}
            >
              <FileJson size={20} color="#64748b" />
              <View style={styles.shareItemContent}>
                <Text style={styles.menuItemText}>Export as JSON</Text>
                <Text style={styles.shareItemDescription}>
                  For backup or import later
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemCancel]}
              onPress={() => setShowShareMenu(false)}
            >
              <Text style={styles.menuItemTextCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Edit Description Modal */}
      <Modal
        visible={editingDescription}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditingDescription(false)}
      >
        <View style={styles.editModalContainer}>
          <View style={styles.editModalContent}>
            <View style={styles.editModalHeader}>
              <TouchableOpacity onPress={() => setEditingDescription(false)}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
              <Text style={styles.editModalTitle}>Description</Text>
              <TouchableOpacity onPress={handleSaveDescription}>
                <Check size={24} color="#3b82f6" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.descriptionInput}
              value={tempDescription}
              onChangeText={setTempDescription}
              placeholder="Add a description..."
              placeholderTextColor="#64748b"
              multiline={true}
              autoFocus={true}
            />
          </View>
        </View>
      </Modal>

      {/* Edit Exercise Modal */}
      <EditExerciseModal
        exercise={editingExercise}
        visible={editingExercise !== null}
        onClose={() => setEditingExercise(null)}
        onSave={handleSaveExercise}
      />

      {/* Saving Indicator */}
      {isSaving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}
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

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorText: {
    color: '#94a3b8',
    fontSize: 16,
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

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  headerButton: {
    padding: 8,
  },

  menuButton: {
    padding: 4,
  },

  // Content
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
  },

  // Name Section
  nameSection: {
    marginBottom: 12,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  templateName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  nameInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
    paddingVertical: 4,
  },

  // Description
  descriptionSection: {
    marginBottom: 16,
  },

  description: {
    fontSize: 15,
    color: '#94a3b8',
    lineHeight: 22,
  },

  descriptionPlaceholder: {
    fontSize: 15,
    color: '#475569',
    fontStyle: 'italic',
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },

  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  infoText: {
    color: '#94a3b8',
    fontSize: 13,
  },

  createdText: {
    color: '#64748b',
    fontSize: 12,
  },

  // Muscles Section
  musclesSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },

  muscleBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },

  muscleBadgeText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },

  // Exercises Section
  exercisesSection: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 12,
  },

  exercisesList: {
    padding: 0,
    overflow: 'hidden',
  },

  noExercises: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },

  noExercisesText: {
    color: '#64748b',
    fontSize: 14,
  },

  // Exercise Row
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  dragHandle: {
    padding: 4,
    marginRight: 8,
  },

  exerciseInfo: {
    flex: 1,
  },

  exerciseName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'capitalize',
  },

  exerciseNotes: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  setsInfo: {
    marginLeft: 12,
  },

  setsText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: 'bold',
  },

  expandHint: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },

  // Expanded Sets
  setsExpanded: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 48,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  setDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 12,
  },

  setNumberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 28,
    justifyContent: 'center',
    gap: 4,
  },

  setNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
  },

  setTypeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  setDetailText: {
    flex: 1,
    fontSize: 14,
    color: '#e2e8f0',
  },

  setTypeLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'capitalize',
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

  // Footer
  footer: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#020617',
  },

  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },

  startButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  bottomSpacer: {
    height: 20,
  },

  // Menu Modal
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
  },

  menuTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'capitalize',
  },

  menuSubtitle: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
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

  // Share Modal
  shareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 10,
  },

  shareTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  shareItemContent: {
    flex: 1,
  },

  shareItemDescription: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  // Edit Modal
  editModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },

  editModalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },

  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  editModalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'capitalize',
  },

  editModalBody: {
    padding: 16,
  },

  editField: {
    marginBottom: 20,
  },

  editLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 8,
  },

  editInput: {
    backgroundColor: '#334155',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#ffffff',
  },

  repRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  repInput: {
    flex: 1,
    textAlign: 'center',
  },

  repDash: {
    fontSize: 20,
    color: '#64748b',
  },

  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },

  descriptionInput: {
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    minHeight: 120,
    textAlignVertical: 'top',
  },

  // Saving Overlay
  savingOverlay: {
    position: 'absolute',
    top: 60,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
  },

  savingText: {
    color: '#94a3b8',
    fontSize: 12,
  },
});
