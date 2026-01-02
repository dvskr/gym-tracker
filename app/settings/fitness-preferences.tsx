import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Target,
  Calendar,
  TrendingUp,
  Dumbbell,
  Check,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { successHaptic, lightHaptic } from '@/lib/utils/haptics';

type FitnessGoal = 'build_muscle' | 'lose_fat' | 'maintain' | 'strength' | 'endurance' | 'general_fitness';
type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
type TrainingSplit = 'full_body' | 'upper_lower' | 'push_pull_legs' | 'bro_split' | 'custom';

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const FITNESS_GOALS: { value: FitnessGoal; label: string; description: string; icon: string }[] = [
  { value: 'build_muscle', label: 'Build Muscle', description: 'Hypertrophy & size gains', icon: '�x�' },
  { value: 'lose_fat', label: 'Lose Fat', description: 'Fat loss & definition', icon: '�x�' },
  { value: 'strength', label: 'Get Stronger', description: 'Maximal strength focus', icon: '�x�9️' },
  { value: 'endurance', label: 'Endurance', description: 'Stamina & conditioning', icon: '�x��' },
  { value: 'maintain', label: 'Maintain', description: 'Keep current fitness', icon: '�S&' },
  { value: 'general_fitness', label: 'General Fitness', description: 'Overall health', icon: '�xRx' },
];

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string; description: string }[] = [
  { value: 'beginner', label: 'Beginner', description: 'Less than 1 year' },
  { value: 'intermediate', label: 'Intermediate', description: '1-3 years' },
  { value: 'advanced', label: 'Advanced', description: '3+ years' },
];

const TRAINING_SPLITS: { value: TrainingSplit; label: string; description: string }[] = [
  { value: 'full_body', label: 'Full Body', description: 'Train all muscles each session' },
  { value: 'upper_lower', label: 'Upper/Lower', description: 'Split by body section' },
  { value: 'push_pull_legs', label: 'Push/Pull/Legs', description: 'Classic 3-day split' },
  { value: 'bro_split', label: 'Bro Split', description: 'One muscle per day' },
  { value: 'custom', label: 'Custom', description: 'Your own routine' },
];

export default function FitnessPreferencesScreen() {
  const { user } = useAuthStore();
  
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal>('general_fitness');
  const [weeklyTarget, setWeeklyTarget] = useState(4);
  const [preferredRestDays, setPreferredRestDays] = useState<string[]>(['sunday']);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('intermediate');
  const [trainingSplit, setTrainingSplit] = useState<TrainingSplit>('upper_lower');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('fitness_goal, weekly_workout_target, preferred_rest_days, experience_level, training_split')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        if (data.fitness_goal) setFitnessGoal(data.fitness_goal);
        if (data.weekly_workout_target) setWeeklyTarget(data.weekly_workout_target);
        if (data.preferred_rest_days) setPreferredRestDays(data.preferred_rest_days);
        if (data.experience_level) setExperienceLevel(data.experience_level);
        if (data.training_split) setTrainingSplit(data.training_split);
      }
    } catch (error) {
      logger.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          fitness_goal: fitnessGoal,
          weekly_workout_target: weeklyTarget,
          preferred_rest_days: preferredRestDays,
          experience_level: experienceLevel,
          training_split: trainingSplit,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      successHaptic();
      router.back();
    } catch (error) {
      logger.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleRestDay = (day: string) => {
    lightHaptic();
    setPreferredRestDays(prev => 
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#f1f5f9" />
        </Pressable>
        <Text style={styles.headerTitle}>Fitness Preferences</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Fitness Goal */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Target size={20} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Primary Goal</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Your main fitness objective. This personalizes your recommendations.
          </Text>

          <View style={styles.optionsGrid}>
            {FITNESS_GOALS.map((goal) => (
              <TouchableOpacity
                key={goal.value}
                style={[
                  styles.goalCard,
                  fitnessGoal === goal.value && styles.goalCardSelected,
                ]}
                onPress={() => {
                  lightHaptic();
                  setFitnessGoal(goal.value);
                }}
              >
                <Text style={styles.goalEmoji}>{goal.icon}</Text>
                <Text style={styles.goalLabel}>{goal.label}</Text>
                <Text style={styles.goalDescription}>{goal.description}</Text>
                {fitnessGoal === goal.value && (
                  <View style={styles.checkBadge}>
                    <Check size={14} color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Weekly Workout Target */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color="#22c55e" />
            <Text style={styles.sectionTitle}>Weekly Workout Target</Text>
          </View>
          <Text style={styles.sectionDescription}>
            How many days per week do you want to train?
          </Text>

          <View style={styles.targetSelector}>
            {[1, 2, 3, 4, 5, 6, 7].map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.targetButton,
                  weeklyTarget === num && styles.targetButtonSelected,
                ]}
                onPress={() => {
                  lightHaptic();
                  setWeeklyTarget(num);
                }}
              >
                <Text
                  style={[
                    styles.targetButtonText,
                    weeklyTarget === num && styles.targetButtonTextSelected,
                  ]}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preferred Rest Days */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred Rest Days</Text>
          <Text style={styles.sectionDescription}>
            Select the days you prefer to rest (optional)
          </Text>

          <View style={styles.daysGrid}>
            {DAYS_OF_WEEK.map((day) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  preferredRestDays.includes(day) && styles.dayButtonSelected,
                ]}
                onPress={() => toggleRestDay(day)}
              >
                <Text
                  style={[
                    styles.dayButtonText,
                    preferredRestDays.includes(day) && styles.dayButtonTextSelected,
                  ]}
                >
                  {day.slice(0, 3).toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Experience Level */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color="#f59e0b" />
            <Text style={styles.sectionTitle}>Experience Level</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Your training experience affects recovery recommendations
          </Text>

          {EXPERIENCE_LEVELS.map((level) => (
            <TouchableOpacity
              key={level.value}
              style={[
                styles.listItem,
                experienceLevel === level.value && styles.listItemSelected,
              ]}
              onPress={() => {
                lightHaptic();
                setExperienceLevel(level.value);
              }}
            >
              <View style={styles.listItemContent}>
                <Text style={styles.listItemLabel}>{level.label}</Text>
                <Text style={styles.listItemDescription}>{level.description}</Text>
              </View>
              {experienceLevel === level.value && (
                <View style={styles.listItemCheck}>
                  <Check size={20} color="#3b82f6" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Training Split */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Dumbbell size={20} color="#8b5cf6" />
            <Text style={styles.sectionTitle}>Training Split</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Your preferred workout organization
          </Text>

          {TRAINING_SPLITS.map((split) => (
            <TouchableOpacity
              key={split.value}
              style={[
                styles.listItem,
                trainingSplit === split.value && styles.listItemSelected,
              ]}
              onPress={() => {
                lightHaptic();
                setTrainingSplit(split.value);
              }}
            >
              <View style={styles.listItemContent}>
                <Text style={styles.listItemLabel}>{split.label}</Text>
                <Text style={styles.listItemDescription}>{split.description}</Text>
              </View>
              {trainingSplit === split.value && (
                <View style={styles.listItemCheck}>
                  <Check size={20} color="#3b82f6" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={savePreferences}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
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
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
    lineHeight: 20,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  goalCard: {
    width: '47%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  goalCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a8a',
  },
  goalEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  goalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  goalDescription: {
    fontSize: 12,
    color: '#94a3b8',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  targetButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  targetButtonSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#14532d',
  },
  targetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
  targetButtonTextSelected: {
    color: '#22c55e',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayButtonSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a8a',
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  dayButtonTextSelected: {
    color: '#60a5fa',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  listItemSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a8a',
  },
  listItemContent: {
    flex: 1,
  },
  listItemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 2,
  },
  listItemDescription: {
    fontSize: 13,
    color: '#94a3b8',
  },
  listItemCheck: {
    marginLeft: 12,
  },
  bottomSpacer: {
    height: 40,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

