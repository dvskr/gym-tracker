import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Target,
  TrendingDown,
  TrendingUp,
  Minus,
  Calendar,
  Check,
  AlertCircle,
  Info,
  Trash2,
  Scale,
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/stores/authStore';
import { getLatestWeight, getWeightHistory } from '@/lib/api/bodyWeight';
import {
  setWeightGoal,
  getWeightGoal,
  clearGoal,
  WeightGoal,
} from '@/lib/api/goals';
import {
  GoalType,
  calculateProgress,
  calculateWeeklyRate,
  getProjection,
  getRecommendedRate,
  formatWeightChange,
  formatTimeToGoal,
} from '@/lib/utils/goalCalculations';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { AuthPromptModal } from '@/components/modals/AuthPromptModal';

// ============================================
// Types
// ============================================

interface GoalTypeOption {
  type: GoalType;
  label: string;
  icon: React.ReactNode;
}

const GOAL_TYPES: GoalTypeOption[] = [
  { type: 'lose', label: 'Lose', icon: <TrendingDown size={18} color="#ffffff" /> },
  { type: 'maintain', label: 'Maintain', icon: <Minus size={18} color="#ffffff" /> },
  { type: 'gain', label: 'Gain', icon: <TrendingUp size={18} color="#ffffff" /> },
];

// ============================================
// Progress Bar Component
// ============================================

interface ProgressBarProps {
  progress: number;
  goalType: GoalType;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, goalType }) => {
  const getColor = () => {
    if (progress >= 100) return '#22c55e';
    if (progress >= 50) return '#3b82f6';
    return '#f59e0b';
  };

  return (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarBackground}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${Math.min(100, progress)}%`, backgroundColor: getColor() },
          ]}
        />
      </View>
      <Text style={styles.progressBarText}>{Math.round(progress)}%</Text>
    </View>
  );
};

// ============================================
// Goal Type Selector Component
// ============================================

interface GoalTypeSelectorProps {
  selected: GoalType;
  onSelect: (type: GoalType) => void;
}

const GoalTypeSelector: React.FC<GoalTypeSelectorProps> = ({ selected, onSelect }) => (
  <View style={styles.goalTypeContainer}>
    {GOAL_TYPES.map((option) => (
      <TouchableOpacity
        key={option.type}
        style={[
          styles.goalTypeButton,
          selected === option.type && styles.goalTypeButtonActive,
        ]}
        onPress={() => {
          Haptics.selectionAsync();
          onSelect(option.type);
        }}
      >
        {option.icon}
        <Text
          style={[
            styles.goalTypeText,
            selected === option.type && styles.goalTypeTextActive,
          ]}
        >
          {option.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ============================================
// Main Screen Component
// ============================================

export default function WeightGoalScreen() {
  const { user } = useAuthStore();
  
  // Auth guard
  const { requireAuth, showAuthModal, authMessage, closeAuthModal } = useAuthGuard();

  // State
  const [currentGoal, setCurrentGoal] = useState<WeightGoal | null>(null);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [weeklyRate, setWeeklyRate] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [goalType, setGoalType] = useState<GoalType>('lose');
  const [targetWeight, setTargetWeight] = useState('');
  const [targetDate, setTargetDate] = useState('');

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Fetch current goal
      const goal = await getWeightGoal(user.id);
      setCurrentGoal(goal);

      // If goal exists, set form values
      if (goal) {
        setGoalType(goal.goal_type);
        setTargetWeight(goal.target_weight.toString());
        setTargetDate(goal.target_date || '');
      }

      // Fetch current weight
      const latestWeight = await getLatestWeight(user.id);
      if (latestWeight) {
        setCurrentWeight(latestWeight.weight);
        
        // If no goal and no target weight set, use current as starting point
        if (!goal && !targetWeight) {
          setTargetWeight(latestWeight.weight.toString());
        }
      }

      // Fetch weight history for rate calculation
      const history = await getWeightHistory(user.id, 30);
      if (history.length >= 2) {
        const rate = calculateWeeklyRate(
          history.map(w => ({ date: w.logged_at, weight: w.weight }))
        );
        setWeeklyRate(rate);
      }
    } catch (error) {
      console.error('Error fetching goal data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Handle save goal
  const handleSaveGoal = async () => {
    // Require auth before saving goal
    if (!user?.id) {
      requireAuth(() => {}, 'Sign in to set your weight goal.');
      return;
    }
    if (!currentWeight) return;

    const targetWeightNum = parseFloat(targetWeight);
    if (isNaN(targetWeightNum) || targetWeightNum <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid target weight');
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await setWeightGoal(user.id, {
        targetWeight: targetWeightNum,
        targetDate: targetDate || null,
        goalType,
        startWeight: currentWeight,
      });

      await fetchData();
      setIsEditing(false);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Goal Set', 'Your weight goal has been saved!');
    } catch (error) {
      console.error('Error saving goal:', error);
      Alert.alert('Error', 'Failed to save goal');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle clear goal
  const handleClearGoal = () => {
    Alert.alert(
      'Clear Goal',
      'Are you sure you want to clear your current goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            
            try {
              await clearGoal(user.id);
              setCurrentGoal(null);
              setIsEditing(false);
              setTargetWeight(currentWeight?.toString() || '');
              setTargetDate('');
            } catch (error) {
              console.error('Error clearing goal:', error);
              Alert.alert('Error', 'Failed to clear goal');
            }
          },
        },
      ]
    );
  };

  // Calculate progress and projection
  const progress = currentGoal && currentWeight
    ? calculateProgress(
        currentGoal.start_weight || currentWeight,
        currentWeight,
        currentGoal.target_weight
      )
    : null;

  const projection = currentGoal && currentWeight
    ? getProjection(
        currentWeight,
        currentGoal.target_weight,
        weeklyRate,
        currentGoal.target_date
      )
    : null;

  const recommendedRate = getRecommendedRate(goalType);

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

  const showForm = !currentGoal || isEditing;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weight Goal</Text>
        {currentGoal && !isEditing && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(true)}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
        {!currentGoal && <View style={{ width: 50 }} />}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
      >
        {/* Current Status Card */}
        {currentGoal && progress && !isEditing && (
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Target size={20} color="#3b82f6" />
              <Text style={styles.statusTitle}>Current Progress</Text>
            </View>

            <View style={styles.weightRow}>
              <View style={styles.weightItem}>
                <Text style={styles.weightLabel}>Current</Text>
                <Text style={styles.weightValue}>{currentWeight} lbs</Text>
              </View>
              <View style={styles.weightArrow}>
                {progress.direction === 'lose' ? (
                  <TrendingDown size={24} color="#22c55e" />
                ) : progress.direction === 'gain' ? (
                  <TrendingUp size={24} color="#22c55e" />
                ) : (
                  <Minus size={24} color="#64748b" />
                )}
              </View>
              <View style={styles.weightItem}>
                <Text style={styles.weightLabel}>Goal</Text>
                <Text style={styles.weightValue}>{currentGoal.target_weight} lbs</Text>
              </View>
            </View>

            <ProgressBar progress={progress.progressPercent} goalType={currentGoal.goal_type} />

            <View style={styles.remainingContainer}>
              <Text style={styles.remainingText}>
                {progress.remaining === 0
                  ? '🎉 Goal reached!'
                  : `${progress.remaining} lbs to go`}
              </Text>
            </View>
          </View>
        )}

        {/* Goal Form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {isEditing ? 'Update Goal' : 'Set Your Goal'}
            </Text>

            {/* Goal Type */}
            <Text style={styles.inputLabel}>Goal Type</Text>
            <GoalTypeSelector selected={goalType} onSelect={setGoalType} />

            {/* Target Weight */}
            <Text style={styles.inputLabel}>Target Weight</Text>
            <View style={styles.inputContainer}>
              <Scale size={20} color="#64748b" />
              <TextInput
                style={styles.input}
                value={targetWeight}
                onChangeText={setTargetWeight}
                placeholder="Enter target weight"
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
              />
              <Text style={styles.inputUnit}>lbs</Text>
            </View>

            {/* Target Date (Optional) */}
            <Text style={styles.inputLabel}>Target Date (Optional)</Text>
            <View style={styles.inputContainer}>
              <Calendar size={20} color="#64748b" />
              <TextInput
                style={styles.input}
                value={targetDate}
                onChangeText={setTargetDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#64748b"
              />
            </View>

            {/* Rate Suggestion */}
            {goalType !== 'maintain' && (
              <View style={styles.suggestionCard}>
                <Info size={16} color="#3b82f6" />
                <Text style={styles.suggestionText}>
                  Recommended rate: {recommendedRate.min}-{recommendedRate.max} {recommendedRate.unit}
                </Text>
              </View>
            )}

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSaveGoal}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Check size={20} color="#ffffff" />
                  <Text style={styles.saveButtonText}>
                    {isEditing ? 'Update Goal' : 'Set Goal'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {isEditing && (
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Progress Section */}
        {currentGoal && projection && !isEditing && (
          <View style={styles.progressCard}>
            <Text style={styles.sectionTitle}>PROGRESS DETAILS</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Started</Text>
              <Text style={styles.detailValue}>
                {format(parseISO(currentGoal.start_date), 'MMM d, yyyy')} at{' '}
                {currentGoal.start_weight} lbs
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Progress</Text>
              <Text style={styles.detailValue}>
                {progress ? formatWeightChange(progress.progressMade) : '—'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Current Rate</Text>
              <Text style={styles.detailValue}>
                {weeklyRate !== 0
                  ? `${Math.abs(weeklyRate)} lbs/week ${weeklyRate < 0 ? '(losing)' : '(gaining)'}`
                  : 'Not enough data'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Est. Completion</Text>
              <Text style={styles.detailValue}>
                {projection.projectedDateFormatted || 'Unknown'}
                {projection.weeksRemaining !== null && ` (${formatTimeToGoal(projection.weeksRemaining)})`}
              </Text>
            </View>

            {/* On Track Indicator */}
            <View
              style={[
                styles.onTrackBadge,
                projection.isOnTrack === true && styles.onTrackBadgeGreen,
                projection.isOnTrack === false && styles.onTrackBadgeRed,
              ]}
            >
              {projection.isOnTrack === true ? (
                <Check size={16} color="#22c55e" />
              ) : projection.isOnTrack === false ? (
                <AlertCircle size={16} color="#f59e0b" />
              ) : (
                <Info size={16} color="#64748b" />
              )}
              <Text
                style={[
                  styles.onTrackText,
                  projection.isOnTrack === true && styles.onTrackTextGreen,
                  projection.isOnTrack === false && styles.onTrackTextRed,
                ]}
              >
                {projection.onTrackMessage}
              </Text>
            </View>
          </View>
        )}

        {/* Tips Card */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Healthy Tips</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipText}>
              • For weight loss: 0.5-1 lb/week is sustainable
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipText}>
              • For muscle gain: 0.25-0.5 lb/week is realistic
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipText}>
              • Track consistently for accurate projections
            </Text>
          </View>
        </View>

        {/* Clear Goal Button */}
        {currentGoal && !isEditing && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearGoal}>
            <Trash2 size={18} color="#ef4444" />
            <Text style={styles.clearButtonText}>Clear Goal</Text>
          </TouchableOpacity>
        )}

        {/* Bottom spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
      
      {/* Auth Modal */}
      <AuthPromptModal
        visible={showAuthModal}
        onClose={closeAuthModal}
        message={authMessage}
      />
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

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
  },

  bottomSpacer: {
    height: 40,
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

  editButton: {
    padding: 4,
  },

  editButtonText: {
    fontSize: 15,
    color: '#3b82f6',
    fontWeight: 'bold',
  },

  // Status Card
  statusCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },

  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },

  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  weightItem: {
    alignItems: 'center',
  },

  weightLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },

  weightValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  weightArrow: {
    padding: 8,
  },

  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  progressBarBackground: {
    flex: 1,
    height: 12,
    backgroundColor: '#334155',
    borderRadius: 6,
    overflow: 'hidden',
  },

  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },

  progressBarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    width: 45,
    textAlign: 'right',
  },

  remainingContainer: {
    alignItems: 'center',
    marginTop: 16,
  },

  remainingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#94a3b8',
  },

  // Form Card
  formCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },

  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 8,
    marginTop: 16,
  },

  goalTypeContainer: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 4,
  },

  goalTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },

  goalTypeButtonActive: {
    backgroundColor: '#3b82f6',
  },

  goalTypeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748b',
  },

  goalTypeTextActive: {
    color: '#ffffff',
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
  },

  inputUnit: {
    fontSize: 14,
    color: '#64748b',
  },

  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e3a5f',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    gap: 10,
  },

  suggestionText: {
    fontSize: 13,
    color: '#93c5fd',
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },

  cancelButtonText: {
    fontSize: 15,
    color: '#94a3b8',
  },

  // Progress Card
  progressCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 16,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  detailLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },

  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },

  onTrackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 16,
    gap: 8,
  },

  onTrackBadgeGreen: {
    backgroundColor: '#14532d',
  },

  onTrackBadgeRed: {
    backgroundColor: '#451a03',
  },

  onTrackText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#94a3b8',
  },

  onTrackTextGreen: {
    color: '#22c55e',
  },

  onTrackTextRed: {
    color: '#f59e0b',
  },

  // Tips Card
  tipsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },

  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },

  tipItem: {
    marginBottom: 8,
  },

  tipText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },

  // Clear Button
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },

  clearButtonText: {
    fontSize: 15,
    color: '#ef4444',
    fontWeight: 'bold',
  },
});

