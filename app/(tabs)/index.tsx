import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  Play,
  Plus,
  Dumbbell,
  ChevronRight,
  Zap,
  Scale,
  Ruler,
  Camera,
  Sparkles,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { getTemplates, incrementTemplateUsage, Template } from '@/lib/api/templates';
import { fetchPreviousWorkoutData } from '@/hooks/usePreviousWorkout';
import { lightHaptic, successHaptic } from '@/lib/utils/haptics';
import { QuickWeightLog, WeightSparkline } from '@/components/home';
import { getLatestMeasurements } from '@/lib/api/measurements';
import { format } from 'date-fns';
import { NotificationBell } from '@/components/NotificationBell';
import { PlateauAlerts, RecoveryStatus, CheckinPrompt } from '@/components/ai';
import { DefaultTemplates } from '@/components/workout/DefaultTemplates';
import { DefaultTemplate } from '@/lib/templates/defaultTemplates';



// ============================================
// Helper Functions
// ============================================

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFirstName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  return fullName.split(' ')[0];
}

// ============================================
// Quick Start Card Component
// ============================================

interface QuickStartCardProps {
  template: Template;
  onStart: () => void;
  color: string;
}

const QuickStartCard: React.FC<QuickStartCardProps> = ({ template, onStart, color }) => {
  const exerciseCount = template.exercises?.length || 0;

  return (
    <TouchableOpacity
      style={[styles.quickStartCard, { borderColor: color }]}
      onPress={onStart}
      activeOpacity={0.7}
    >
      <View style={[styles.quickStartIcon, { backgroundColor: color + '20' }]}>
        <Dumbbell size={20} color={color} />
      </View>
      <Text style={styles.quickStartName} numberOfLines={2}>
        {template.name}
      </Text>
      <Text style={styles.quickStartMeta}>
        {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
      </Text>
      <View style={[styles.quickStartPlayButton, { backgroundColor: color }]}>
        <Play size={14} color="#ffffff" fill="#ffffff" />
      </View>
    </TouchableOpacity>
  );
};

// ============================================
// Continue Workout Banner
// ============================================

interface ContinueBannerProps {
  workoutName: string;
  startedAt: string;
  exerciseCount: number;
  onContinue: () => void;
}

const ContinueBanner: React.FC<ContinueBannerProps> = ({
  workoutName,
  startedAt,
  exerciseCount,
  onContinue,
}) => {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const updateElapsed = () => {
      const start = new Date(startedAt).getTime();
      const now = Date.now();
      const diffMs = now - start;
      const mins = Math.floor(diffMs / 60000);
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;

      if (hours > 0) {
        setElapsed(`${hours}h ${remainingMins}m`);
      } else {
        setElapsed(`${mins}m`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <TouchableOpacity
      style={styles.continueBanner}
      onPress={onContinue}
      activeOpacity={0.8}
    >
      <View style={styles.continuePulse} />
      <View style={styles.continueContent}>
        <View style={styles.continueLeft}>
          <Text style={styles.continueLabel}>WORKOUT IN PROGRESS</Text>
          <Text style={styles.continueName}>{workoutName}</Text>
          <Text style={styles.continueMeta}>
            {elapsed} • {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.continueButton}>
          <Text style={styles.continueButtonText}>Continue</Text>
          <ChevronRight size={18} color="#ffffff" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ============================================
// Empty State Component
// ============================================

const EmptyTemplates: React.FC<{ onCreateTemplate: () => void; onStartEmpty: () => void }> = ({
  onCreateTemplate,
  onStartEmpty,
}) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIcon}>
      <Zap size={32} color="#3b82f6" />
    </View>
    <Text style={styles.emptyTitle}>Ready to Get Started?</Text>
    <Text style={styles.emptyDescription}>
      Create a template for quick workout starts, or jump right in with an empty workout.
    </Text>

    <TouchableOpacity
      style={styles.emptyPrimaryButton}
      onPress={onCreateTemplate}
      activeOpacity={0.8}
    >
      <Plus size={18} color="#ffffff" />
      <Text style={styles.emptyPrimaryText}>Create Template</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.emptySecondaryButton}
      onPress={onStartEmpty}
      activeOpacity={0.7}
    >
      <Text style={styles.emptySecondaryText}>Start Empty Workout</Text>
    </TouchableOpacity>
  </View>
);

// ============================================
// Main Screen Component
// ============================================

export default function HomeScreen() {
  const { user, session } = useAuthStore();
  
  // Use selectors for optimized re-renders
  const activeWorkout = useWorkoutStore((state) => state.activeWorkout);
  const isWorkoutActive = useWorkoutStore((state) => state.isWorkoutActive);
  const startWorkout = useWorkoutStore((state) => state.startWorkout);
  const addExerciseWithSets = useWorkoutStore((state) => state.addExerciseWithSets);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [weightRefreshTrigger, setWeightRefreshTrigger] = useState(0);
  const [lastMeasurementDate, setLastMeasurementDate] = useState<string | null>(null);

  // Get user's name from profile
  useEffect(() => {
    const fetchUserName = async () => {
      if (user?.user_metadata?.full_name) {
        setUserName(getFirstName(user.user_metadata.full_name));
      } else if (user?.email) {
        setUserName(user.email.split('@')[0]);
      }
    };
    fetchUserName();
  }, [user]);

  // Fetch data
  const fetchData = useCallback(async () => {
    // KEY FIX: If no session, stop loading immediately
    if (!session) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }
    
    if (!user?.id) return;

    try {
      // Fetch templates (sorted by times_used)
      const templatesData = await getTemplates(user.id);
      // Sort by times_used descending, take top 6
      const sortedTemplates = [...templatesData]
        .sort((a, b) => (b.times_used || 0) - (a.times_used || 0))
        .slice(0, 6);
      setTemplates(sortedTemplates);

      // Fetch last measurement date
      try {
        const latestMeasurement = await getLatestMeasurements(user.id);
        if (latestMeasurement?.measured_at) {
          setLastMeasurementDate(latestMeasurement.measured_at);
        }
      } catch (e) {
        // Silently ignore if no measurements
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id, session]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleStartTemplate = async (template: Template) => {
    if (!template.id || !user?.id) return;

    successHaptic();

    try {
      await incrementTemplateUsage(template.id);
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
      console.error('Error starting template:', error);
    }
  };

  const handleStartDefaultTemplate = async (template: DefaultTemplate) => {
    successHaptic();

    try {
      startWorkout(template.name);

      // Add exercises from default template
      for (const exercise of template.exercises) {
        // Fetch previous workout data if user is logged in
        let prefillSets: Array<{ weight?: number; reps?: number }> = [];
        
        if (user?.id) {
          const previousData = await fetchPreviousWorkoutData(
            user.id,
            exercise.id // Use the exercise ID from database
          );

          if (previousData && previousData.sets.length > 0) {
            // Use previous workout data
            prefillSets = previousData.sets.map((s) => ({
              weight: s.weight,
              reps: s.reps,
            }));
          }
        }

        // Add exercise to workout
        addExerciseWithSets(
          {
            id: exercise.id,
            name: exercise.name,
            bodyPart: '',
            equipment: '',
            target: '',
            gifUrl: exercise.gif_url,
          },
          prefillSets,
          exercise.sets
        );
      }

      router.push('/workout/active');
    } catch (error) {
      console.error('Error starting default template:', error);
    }
  };

  const handleStartEmptyWorkout = () => {
    lightHaptic();
    startWorkout();
    router.push('/workout/active');
  };

  const handleContinueWorkout = () => {
    lightHaptic();
    router.push('/workout/active');
  };

  const handleCreateTemplate = () => {
    lightHaptic();
    router.push('/template/create');
  };

  const handleViewAllTemplates = () => {
    lightHaptic();
    router.push('/template');
  };

  const handleWeightLogged = () => {
    setWeightRefreshTrigger(prev => prev + 1);
  };

  const handleBodyStats = (route: string) => {
    lightHaptic();
    router.push(route as any);
  };

  // Colors for quick start cards
  const cardColors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

  // Loading state
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

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
        {/* Greeting */}
        <View style={styles.greetingSection}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}{userName ? `, ${userName}` : ''}! 👋
            </Text>
            <Text style={styles.greetingSubtext}>
              {isWorkoutActive ? "You have a workout in progress" : "Ready to crush your workout?"}
            </Text>
          </View>
          <NotificationBell />
        </View>

        {/* Continue Workout Banner */}
        {isWorkoutActive && activeWorkout && (
          <ContinueBanner
            workoutName={activeWorkout.name}
            startedAt={activeWorkout.startedAt}
            exerciseCount={activeWorkout.exercises.length}
            onContinue={handleContinueWorkout}
          />
        )}

        {/* Recovery Status */}
        {/* Daily Check-in Prompt */}
        {session && <CheckinPrompt />}

        {/* Recovery Status */}
        {session && <RecoveryStatus />}

        {/* Plateau Detection Alerts */}
        {session && <PlateauAlerts />}

        {/* Quick Start Section - Always show */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Zap size={18} color="#f59e0b" />
              <Text style={styles.sectionTitle}>QUICK START</Text>
            </View>
            <TouchableOpacity onPress={handleViewAllTemplates}>
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          </View>

          {/* Show user templates if they have any, otherwise show defaults */}
          {templates.length > 0 ? (
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickStartRow}
            >
              {templates.slice(0, 6).map((template, index) => (
                <QuickStartCard
                  key={template.id}
                  template={template}
                  color={cardColors[index % cardColors.length]}
                  onStart={() => handleStartTemplate(template)}
                />
              ))}
            </ScrollView>
          ) : (
            <>
              <Text style={styles.defaultTemplatesHint}>
                Get started with these popular routines • Scroll for more
              </Text>
              <DefaultTemplates onStartWorkout={handleStartDefaultTemplate} maxItems={6} />
            </>
          )}

          {/* Start Empty Workout */}
          <TouchableOpacity
            style={styles.startEmptyButton}
            onPress={handleStartEmptyWorkout}
            activeOpacity={0.7}
          >
            <Plus size={18} color="#3b82f6" />
            <Text style={styles.startEmptyText}>Or start empty workout</Text>
            <ChevronRight size={16} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* Body Stats Section */}
        {user?.id && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Scale size={18} color="#3b82f6" />
                <Text style={styles.sectionTitle}>BODY TRACKING</Text>
              </View>
            </View>

            {/* Quick Weight Log */}
            <View style={styles.bodyStatsGrid}>
              {session && user?.id && (
                <View style={styles.bodyStatsLeft}>
                  <QuickWeightLog
                    userId={user.id}
                    onWeightLogged={handleWeightLogged}
                  />
                </View>
              )}
            </View>

            {/* Weight Sparkline */}
            {session && user?.id && (
              <View style={styles.sparklineSection}>
                <WeightSparkline
                  userId={user.id}
                  goalType="lose"
                  refreshTrigger={weightRefreshTrigger}
                />
              </View>
            )}

            {/* Quick Links */}
            <View style={styles.quickLinksRow}>
              <TouchableOpacity
                style={styles.quickLinkCard}
                onPress={() => handleBodyStats('/body/measurements')}
                activeOpacity={0.7}
              >
                <View style={[styles.quickLinkIcon, { backgroundColor: '#8b5cf620' }]}>
                  <Ruler size={18} color="#8b5cf6" />
                </View>
                <View style={styles.quickLinkInfo}>
                  <Text style={styles.quickLinkTitle}>Measurements</Text>
                  <Text style={styles.quickLinkSubtitle}>
                    {lastMeasurementDate
                      ? format(new Date(lastMeasurementDate), 'MMM d')
                      : 'Not logged'}
                  </Text>
                </View>
                <ChevronRight size={16} color="#475569" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickLinkCard}
                onPress={() => handleBodyStats('/body/photos')}
                activeOpacity={0.7}
              >
                <View style={[styles.quickLinkIcon, { backgroundColor: '#22c55e20' }]}>
                  <Camera size={18} color="#22c55e" />
                </View>
                <View style={styles.quickLinkInfo}>
                  <Text style={styles.quickLinkTitle}>Photos</Text>
                  <Text style={styles.quickLinkSubtitle}>Progress pics</Text>
                </View>
                <ChevronRight size={16} color="#475569" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating Coach Button */}
      <TouchableOpacity
        style={styles.coachFloatingButton}
        onPress={() => router.push('/coach')}
        activeOpacity={0.8}
      >
        <Sparkles size={20} color="#f59e0b" />
        <Text style={styles.coachButtonText}>Coach</Text>
      </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },

  bottomSpacer: {
    height: 100,
  },

  // Floating Coach Button
  coachFloatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  coachButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },

  // Greeting
  greetingSection: {
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  greeting: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },

  greetingSubtext: {
    fontSize: 15,
    color: '#64748b',
  },

  // Continue Banner
  continueBanner: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#22c55e',
  },

  continuePulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#22c55e',
  },

  continueContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },

  continueLeft: {
    flex: 1,
  },

  continueLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#22c55e',
    letterSpacing: 1,
    marginBottom: 4,
  },

  continueName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },

  continueMeta: {
    fontSize: 13,
    color: '#94a3b8',
  },

  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 4,
  },

  continueButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Section
  section: {
    marginBottom: 24,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: 1,
  },

  sectionLink: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: 'bold',
  },

  // Quick Start Cards
  quickStartRow: {
    gap: 12,
    paddingRight: 16, // Match the left padding for consistency
  },

  quickStartCard: {
    width: 110,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },

  quickStartIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  quickStartName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
    height: 34,
  },

  quickStartMeta: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 10,
  },

  quickStartPlayButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Default Templates Hint
  defaultTemplatesHint: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
    marginTop: 4,
  },

  // Start Empty Button
  startEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 12,
    gap: 8,
  },

  startEmptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },

  // Empty State
  emptyContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3b82f620',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },

  emptyDescription: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },

  emptyPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },

  emptyPrimaryText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  emptySecondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },

  emptySecondaryText: {
    fontSize: 14,
    color: '#64748b',
  },

  // Body Stats
  bodyStatsGrid: {
    marginBottom: 12,
  },

  bodyStatsLeft: {
    flex: 1,
  },

  sparklineSection: {
    marginBottom: 12,
  },

  quickLinksRow: {
    flexDirection: 'row',
    gap: 12,
  },

  quickLinkCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },

  quickLinkIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickLinkInfo: {
    flex: 1,
  },

  quickLinkTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  quickLinkSubtitle: {
    fontSize: 11,
    color: '#64748b',
  },
});
