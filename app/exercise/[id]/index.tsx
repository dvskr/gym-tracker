import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Dumbbell,
  Target,
  Trophy,
  TrendingUp,
  Calendar,
  ChevronRight,
  Star,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { useAuthStore } from '@/stores/authStore';
import { useExerciseStore } from '@/stores/exerciseStore';
import { lightHaptic } from '@/lib/utils/haptics';
import { Card, LoadingSpinner, Skeleton } from '@/components/ui';
import {
  getExerciseById,
  getExerciseHistory,
  getExerciseStats,
  Exercise,
  ExerciseHistoryEntry,
  ExerciseStats,
} from '@/lib/api/exercises';

// ============================================
// Types
// ============================================

type TabType = 'about' | 'history' | 'charts' | 'records';

// ============================================
// Tab Components
// ============================================

const AboutTab: React.FC<{ exercise: Exercise }> = ({ exercise }) => (
  <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
    {/* Instructions */}
    {exercise.instructions && exercise.instructions.length > 0 && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        {exercise.instructions.map((instruction, index) => (
          <View key={index} style={styles.instructionItem}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.instructionText}>{instruction}</Text>
          </View>
        ))}
      </View>
    )}

    {/* Primary Muscles */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Primary Muscles</Text>
      <View style={styles.muscleList}>
        {exercise.primary_muscles?.map((muscle, index) => (
          <View key={index} style={styles.muscleBadgePrimary}>
            <Target size={14} color="#22c55e" />
            <Text style={styles.muscleBadgeText}>{muscle}</Text>
          </View>
        ))}
      </View>
    </View>

    {/* Secondary Muscles */}
    {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Secondary Muscles</Text>
        <View style={styles.muscleList}>
          {exercise.secondary_muscles.map((muscle, index) => (
            <View key={index} style={styles.muscleBadgeSecondary}>
              <Text style={styles.muscleBadgeTextSecondary}>{muscle}</Text>
            </View>
          ))}
        </View>
      </View>
    )}

    {/* Equipment */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Equipment</Text>
      <View style={styles.equipmentContainer}>
        <Dumbbell size={20} color="#3b82f6" />
        <Text style={styles.equipmentText}>{exercise.equipment}</Text>
      </View>
    </View>

    {/* Category */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Category</Text>
      <Text style={styles.categoryText}>{exercise.category}</Text>
    </View>

    <View style={styles.bottomSpacer} />
  </ScrollView>
);

const HistoryTab: React.FC<{
  history: ExerciseHistoryEntry[];
  isLoading: boolean;
  exerciseId: string;
}> = ({ history, isLoading, exerciseId }) => {
  if (isLoading) {
    return (
      <View style={styles.tabContent}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.historyItemSkeleton}>
            <Skeleton width="40%" height={16} />
            <Skeleton width="60%" height={14} style={{ marginTop: 8 }} />
            <Skeleton width="80%" height={12} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Calendar size={48} color="#334155" />
        <Text style={styles.emptyTitle}>No history yet</Text>
        <Text style={styles.emptySubtitle}>
          Complete a workout with this exercise to see your history
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {/* View Full History Link */}
      <TouchableOpacity
        style={styles.viewFullHistoryButton}
        onPress={() => router.push(`/exercise/${exerciseId}/history`)}
      >
        <Text style={styles.viewFullHistoryText}>View Full History</Text>
        <ChevronRight size={18} color="#3b82f6" />
      </TouchableOpacity>

      <View>
        {history.slice(0, 5).map((item) => (
          <TouchableOpacity
            key={item.workoutId}
            style={styles.historyItem}
            onPress={() => router.push(`/workout/${item.workoutId}`)}
            activeOpacity={0.7}
          >
            <View style={styles.historyHeader}>
              <Text style={styles.historyDate}>
                {format(new Date(item.date), 'MMM d, yyyy')}
              </Text>
              <ChevronRight size={18} color="#475569" />
            </View>
            <Text style={styles.historyWorkoutName}>{item.workoutName}</Text>
            <View style={styles.historySets}>
              {item.sets.slice(0, 4).map((set, index) => (
                <Text key={index} style={styles.historySetText}>
                  {set.weight} lbs × {set.reps}
                  {index < Math.min(item.sets.length, 4) - 1 ? '  •  ' : ''}
                </Text>
              ))}
              {item.sets.length > 4 && (
                <Text style={styles.historySetText}> +{item.sets.length - 4} more</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const ChartsTab: React.FC<{ history: ExerciseHistoryEntry[] }> = ({ history }) => {
  if (history.length < 2) {
    return (
      <View style={styles.emptyState}>
        <TrendingUp size={48} color="#334155" />
        <Text style={styles.emptyTitle}>Not enough data</Text>
        <Text style={styles.emptySubtitle}>
          Complete at least 2 workouts to see progress charts
        </Text>
      </View>
    );
  }

  const chartData = history
    .slice(0, 10) // Last 10 sessions
    .slice()
    .reverse()
    .map((h) => {
      const maxWeight = Math.max(...h.sets.map((s) => s.weight));
      return {
        date: format(new Date(h.date), 'M/d'),
        maxWeight,
        totalVolume: h.totalVolume,
      };
    });

  const maxWeightPeak = Math.max(...chartData.map((d) => d.maxWeight));
  const maxVolumePeak = Math.max(...chartData.map((d) => d.totalVolume));

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Max Weight Chart */}
      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>Max Weight Over Time</Text>
        <View style={styles.chartContainer}>
          <View style={styles.chartYAxis}>
            <Text style={styles.chartYLabel}>{maxWeightPeak} lbs</Text>
            <Text style={styles.chartYLabel}>{Math.round(maxWeightPeak / 2)} lbs</Text>
            <Text style={styles.chartYLabel}>0</Text>
          </View>
          <View style={styles.chartBars}>
            {chartData.map((d, i) => (
              <View key={i} style={styles.chartBarContainer}>
                <View
                  style={[
                    styles.chartBar,
                    {
                      height: `${(d.maxWeight / maxWeightPeak) * 100}%`,
                      backgroundColor: '#3b82f6',
                    },
                  ]}
                />
                <Text style={styles.chartXLabel}>{d.date}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Volume Chart */}
      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>Total Volume Per Session</Text>
        <View style={styles.chartContainer}>
          <View style={styles.chartYAxis}>
            <Text style={styles.chartYLabel}>{maxVolumePeak.toLocaleString()}</Text>
            <Text style={styles.chartYLabel}>{Math.round(maxVolumePeak / 2).toLocaleString()}</Text>
            <Text style={styles.chartYLabel}>0</Text>
          </View>
          <View style={styles.chartBars}>
            {chartData.map((d, i) => (
              <View key={i} style={styles.chartBarContainer}>
                <View
                  style={[
                    styles.chartBar,
                    {
                      height: `${(d.totalVolume / maxVolumePeak) * 100}%`,
                      backgroundColor: '#22c55e',
                    },
                  ]}
                />
                <Text style={styles.chartXLabel}>{d.date}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const RecordsTab: React.FC<{
  stats: ExerciseStats;
  isLoading: boolean;
}> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <View style={styles.tabContent}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.recordCardSkeleton}>
            <Skeleton width={40} height={40} borderRadius={20} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Skeleton width="50%" height={14} />
              <Skeleton width="70%" height={24} style={{ marginTop: 4 }} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  const hasRecords = stats.bestWeight || stats.bestVolume || stats.bestReps;

  if (!hasRecords) {
    return (
      <View style={styles.emptyState}>
        <Trophy size={48} color="#334155" />
        <Text style={styles.emptyTitle}>No records yet</Text>
        <Text style={styles.emptySubtitle}>
          Complete workouts to set personal records
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Max Weight */}
      {stats.bestWeight && (
        <Card style={styles.recordCard}>
          <View style={styles.recordIcon}>
            <Trophy size={24} color="#fbbf24" />
          </View>
          <View style={styles.recordInfo}>
            <Text style={styles.recordLabel}>Max Weight</Text>
            <Text style={styles.recordValue}>{stats.bestWeight.value} lbs</Text>
            <Text style={styles.recordDate}>
              {format(new Date(stats.bestWeight.date), 'MMM d, yyyy')}
            </Text>
          </View>
        </Card>
      )}

      {/* Max Volume */}
      {stats.bestVolume && (
        <Card style={styles.recordCard}>
          <View style={[styles.recordIcon, { backgroundColor: '#1e3a5f' }]}>
            <TrendingUp size={24} color="#3b82f6" />
          </View>
          <View style={styles.recordInfo}>
            <Text style={styles.recordLabel}>Max Volume (Single Session)</Text>
            <Text style={styles.recordValue}>
              {stats.bestVolume.value.toLocaleString()} lbs
            </Text>
            <Text style={styles.recordDate}>
              {format(new Date(stats.bestVolume.date), 'MMM d, yyyy')}
            </Text>
          </View>
        </Card>
      )}

      {/* Max Reps */}
      {stats.bestReps && (
        <Card style={styles.recordCard}>
          <View style={[styles.recordIcon, { backgroundColor: '#14532d' }]}>
            <Dumbbell size={24} color="#22c55e" />
          </View>
          <View style={styles.recordInfo}>
            <Text style={styles.recordLabel}>
              Max Reps at {stats.bestReps.weight} lbs
            </Text>
            <Text style={styles.recordValue}>{stats.bestReps.value} reps</Text>
            <Text style={styles.recordDate}>
              {format(new Date(stats.bestReps.date), 'MMM d, yyyy')}
            </Text>
          </View>
        </Card>
      )}

      {/* Estimated 1RM */}
      {stats.estimated1RM && (
        <Card style={styles.recordCard}>
          <View style={[styles.recordIcon, { backgroundColor: '#4c1d95' }]}>
            <Target size={24} color="#a855f7" />
          </View>
          <View style={styles.recordInfo}>
            <Text style={styles.recordLabel}>Estimated 1RM</Text>
            <Text style={styles.recordValue}>{stats.estimated1RM} lbs</Text>
            <Text style={styles.recordDate}>Based on Brzycki formula</Text>
          </View>
        </Card>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

// ============================================
// Main Component
// ============================================

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { isFavorite, toggleFavorite, loadFavorites } = useExerciseStore();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [stats, setStats] = useState<ExerciseStats | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('about');
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  // Fetch exercise details
  useEffect(() => {
    if (id) {
      fetchExercise();
    }
  }, [id]);

  // Fetch history when tab changes or user available
  useEffect(() => {
    if (exercise && user?.id && (activeTab === 'history' || activeTab === 'charts' || activeTab === 'records')) {
      fetchHistoryAndStats();
    }
  }, [exercise, user?.id, activeTab]);

  const fetchExercise = async () => {
    setIsLoading(true);
    try {
      const data = await getExerciseById(id!);
      setExercise(data);
    } catch (error) {
      console.error('Failed to fetch exercise:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistoryAndStats = async () => {
    if (!id || !user?.id) return;

    setIsHistoryLoading(true);
    try {
      const [historyData, statsData] = await Promise.all([
        getExerciseHistory(user.id, id),
        getExerciseStats(user.id, id),
      ]);
      setHistory(historyData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'about', label: 'About' },
    { key: 'history', label: 'History' },
    { key: 'charts', label: 'Charts' },
    { key: 'records', label: 'Records' },
  ];

  // Handle toggle favorite
  const handleToggleFavorite = () => {
    if (id) {
      lightHaptic();
      toggleFavorite(id);
    }
  };

  const favorited = id ? isFavorite(id) : false;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <LoadingSpinner fullScreen message="Loading exercise..." />
      </SafeAreaView>
    );
  }

  if (!exercise) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Exercise not found</Text>
          <TouchableOpacity style={styles.backButtonError} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={handleToggleFavorite}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Star
            size={24}
            color={favorited ? '#fbbf24' : '#64748b'}
            fill={favorited ? '#fbbf24' : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      {/* Exercise GIF Card - Prominent Display */}
      <View style={styles.gifSection}>
        <View style={styles.gifCard}>
          {exercise.gif_url ? (
            <Image
              source={{ uri: exercise.gif_url }}
              style={styles.exerciseGif}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.gifPlaceholder}>
              <Dumbbell size={48} color="#64748b" />
              <Text style={styles.gifPlaceholderText}>No preview available</Text>
            </View>
          )}
        </View>

        {/* Exercise Info Below GIF */}
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          
          <View style={styles.badgeRow}>
            <View style={styles.badgePrimary}>
              <Target size={14} color="#22c55e" />
              <Text style={styles.badgeText}>{exercise.primary_muscles?.[0]}</Text>
            </View>
            <View style={styles.badgeSecondary}>
              <Dumbbell size={12} color="#8b5cf6" />
              <Text style={styles.badgeTextSecondary}>{exercise.equipment}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.tabContentContainer}>
        {activeTab === 'about' && <AboutTab exercise={exercise} />}
        {activeTab === 'history' && (
          <HistoryTab 
            history={history} 
            isLoading={isHistoryLoading} 
            exerciseId={id!}
          />
        )}
        {activeTab === 'charts' && <ChartsTab history={history} />}
        {activeTab === 'records' && (
          <RecordsTab 
            stats={stats || { totalTimesPerformed: 0, lastPerformed: null, bestWeight: null, bestVolume: null, bestReps: null, estimated1RM: null, totalVolume: 0, averageSetsPerSession: 0 }} 
            isLoading={isHistoryLoading} 
          />
        )}
      </View>
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  favoriteButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  gifSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  gifCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },

  exerciseGif: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#0f172a',
  },

  gifPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  gifPlaceholderText: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 8,
  },

  exerciseInfo: {
    paddingHorizontal: 4,
  },

  exerciseName: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    marginBottom: 12,
  },

  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },

  badgePrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14532d',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },

  badgeText: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  badgeSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e1065',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },

  badgeTextSecondary: {
    color: '#8b5cf6',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },

  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },

  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },

  tabText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: 'bold',
  },

  tabTextActive: {
    color: '#3b82f6',
  },

  tabContentContainer: {
    flex: 1,
  },

  tabContent: {
    flex: 1,
    padding: 16,
  },

  // About Tab
  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  instructionItem: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },

  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  instructionNumberText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  instructionText: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },

  muscleList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  muscleBadgePrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14532d',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },

  muscleBadgeText: {
    color: '#22c55e',
    fontSize: 13,
    textTransform: 'capitalize',
  },

  muscleBadgeSecondary: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },

  muscleBadgeTextSecondary: {
    color: '#94a3b8',
    fontSize: 13,
    textTransform: 'capitalize',
  },

  equipmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  equipmentText: {
    color: '#ffffff',
    fontSize: 15,
    textTransform: 'capitalize',
  },

  categoryText: {
    color: '#94a3b8',
    fontSize: 15,
    textTransform: 'capitalize',
  },

  // History Tab
  viewFullHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 4,
  },

  viewFullHistoryText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
  },

  historyItem: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  historyItemSkeleton: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  historyDate: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  historyWorkoutName: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 8,
  },

  historySets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  historySetText: {
    color: '#94a3b8',
    fontSize: 13,
  },

  // Charts Tab
  chartSection: {
    marginBottom: 32,
  },

  chartTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },

  chartContainer: {
    flexDirection: 'row',
    height: 200,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },

  chartYAxis: {
    width: 50,
    justifyContent: 'space-between',
    paddingRight: 8,
  },

  chartYLabel: {
    color: '#64748b',
    fontSize: 10,
    textAlign: 'right',
  },

  chartBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },

  chartBarContainer: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },

  chartBar: {
    width: '80%',
    borderRadius: 4,
    minHeight: 4,
  },

  chartXLabel: {
    color: '#64748b',
    fontSize: 9,
    marginTop: 4,
  },

  // Records Tab
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
  },

  recordCardSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
  },

  recordIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#422006',
    alignItems: 'center',
    justifyContent: 'center',
  },

  recordInfo: {
    flex: 1,
    marginLeft: 16,
  },

  recordLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 2,
  },

  recordValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },

  recordDate: {
    color: '#475569',
    fontSize: 11,
    marginTop: 2,
  },

  // Empty States
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },

  emptyTitle: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },

  emptySubtitle: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
  },

  // Error
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorText: {
    color: '#94a3b8',
    fontSize: 16,
    marginBottom: 16,
  },

  backButtonError: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },

  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  bottomSpacer: {
    height: 40,
  },
});

