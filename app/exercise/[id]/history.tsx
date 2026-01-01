import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  Trophy,
  Target,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  BarChart3,
  ListFilter,
} from 'lucide-react-native';
import { format, formatDistanceToNow } from 'date-fns';
import { LineChart } from 'react-native-chart-kit';
import { useAuthStore } from '@/stores/authStore';
import { LoadingSpinner, Skeleton } from '@/components/ui';
import { lightHaptic } from '@/lib/utils/haptics';
import {
  calculate1RM,
  filterByTimeRange,
  formatChartLabels,
} from '@/lib/utils/calculations';
import {
  getExerciseById,
  getExerciseHistory,
  getExerciseStats,
  Exercise,
  ExerciseHistoryEntry,
  ExerciseStats,
} from '@/lib/api/exercises';
import { useUnits } from '@/hooks/useUnits';

// ============================================
// Types
// ============================================

type TabType = 'history' | 'charts';
type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'All';

interface ExpandedSets {
  [workoutId: string]: boolean;
}

interface ChartDataPoint {
  date: string;
  maxWeight: number;
  totalVolume: number;
  estimated1RM: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32;

// ============================================
// Stats Card Component
// ============================================

interface StatItemProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}

const StatItem: React.FC<StatItemProps> = ({ label, value, icon, color = '#3b82f6' }) => (
  <View style={styles.statItem}>
    <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
      {icon}
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ============================================
// History Entry Component
// ============================================

interface HistoryEntryProps {
  entry: ExerciseHistoryEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigateWorkout: () => void;
}

const HistoryEntry: React.FC<HistoryEntryProps> = ({
  entry,
  isExpanded,
  onToggle,
  onNavigateWorkout,
}) => {
  const handleToggle = () => {
    lightHaptic();
    onToggle();
  };

  return (
    <View style={styles.historyEntry}>
      {/* Header - Always visible */}
      <TouchableOpacity
        style={styles.historyEntryHeader}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <View style={styles.historyEntryLeft}>
          <Text style={styles.historyDate}>
            {format(new Date(entry.date), 'MMM d, yyyy')}
          </Text>
          <Text style={styles.historySummary}>
            {entry.totalSets} set{entry.totalSets !== 1 ? 's' : ''} • Best: {convertWeight(entry.bestSet.weight, entry.bestSet.weight_unit).toFixed(1)} × {entry.bestSet.reps}
          </Text>
          <Text style={styles.historyVolume}>
            Volume: {entry.sets.reduce((sum, s) => sum + (convertWeight(s.weight, s.weight_unit) * s.reps), 0).toLocaleString()} {weightUnit}
          </Text>
        </View>
        <View style={styles.historyEntryRight}>
          {isExpanded ? (
            <ChevronUp size={20} color="#64748b" />
          ) : (
            <ChevronDown size={20} color="#64748b" />
          )}
        </View>
      </TouchableOpacity>

      {/* Expanded Sets */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Sets Table Header */}
          <View style={styles.setsTableHeader}>
            <Text style={[styles.setsTableHeaderText, { width: 50 }]}>SET</Text>
            <Text style={[styles.setsTableHeaderText, { flex: 1 }]}>WEIGHT</Text>
            <Text style={[styles.setsTableHeaderText, { flex: 1 }]}>REPS</Text>
            <Text style={[styles.setsTableHeaderText, { width: 80 }]}>VOLUME</Text>
          </View>

          {/* Sets */}
          {entry.sets.map((set, index) => (
            <View key={index} style={styles.setRow}>
              <Text style={[styles.setRowText, { width: 50 }]}>{set.set_number}</Text>
              <Text style={[styles.setRowText, { flex: 1 }]}>{convertWeight(set.weight, set.weight_unit).toFixed(1)} {weightUnit}</Text>
              <Text style={[styles.setRowText, { flex: 1 }]}>{set.reps}</Text>
              <Text style={[styles.setRowText, { width: 80 }]}>
                {(convertWeight(set.weight, set.weight_unit) * set.reps).toLocaleString()}
              </Text>
            </View>
          ))}

          {/* View Workout Button */}
          <TouchableOpacity
            style={styles.viewWorkoutButton}
            onPress={onNavigateWorkout}
          >
            <Text style={styles.viewWorkoutText}>View Full Workout</Text>
            <ChevronRight size={16} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ============================================
// Time Range Selector
// ============================================

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
}

const TIME_RANGES: TimeRange[] = ['1M', '3M', '6M', '1Y', 'All'];

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ selected, onSelect }) => (
  <View style={styles.timeRangeContainer}>
    {TIME_RANGES.map((range) => (
      <TouchableOpacity
        key={range}
        style={[
          styles.timeRangeButton,
          selected === range && styles.timeRangeButtonActive,
        ]}
        onPress={() => {
          lightHaptic();
          onSelect(range);
        }}
      >
        <Text
          style={[
            styles.timeRangeText,
            selected === range && styles.timeRangeTextActive,
          ]}
        >
          {range}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ============================================
// Chart Configuration
// ============================================

const chartConfig = {
  backgroundColor: 'transparent',
  backgroundGradientFrom: '#1e293b',
  backgroundGradientTo: '#1e293b',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  labelColor: () => '#94a3b8',
  style: {
    borderRadius: 12,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#3b82f6',
  },
  propsForBackgroundLines: {
    stroke: '#334155',
    strokeWidth: 1,
  },
};

const volumeChartConfig = {
  ...chartConfig,
  color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#22c55e',
  },
};

const oneRMChartConfig = {
  ...chartConfig,
  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#ef4444',
  },
};

// ============================================
// Charts Tab Component
// ============================================

interface ChartsTabProps {
  history: ExerciseHistoryEntry[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

const ChartsTab: React.FC<ChartsTabProps> = ({
  history,
  timeRange,
  onTimeRangeChange,
}) => {
  const [touchedPoint, setTouchedPoint] = useState<{
    chart: string;
    value: number;
    label: string;
  } | null>(null);

  // Filter and prepare chart data
  const chartData = useMemo(() => {
    const filtered = filterByTimeRange(history, timeRange);
    
    // Reverse to show oldest first (left to right)
    const reversed = [...filtered].reverse();
    
    if (reversed.length === 0) {
      return null;
    }

    const dataPoints: ChartDataPoint[] = reversed.map((entry) => {
      const maxWeight = Math.max(...entry.sets.map((s) => convertWeight(s.weight, s.weight_unit)));
      const best1RM = Math.max(
        ...entry.sets.map((s) => calculate1RM(convertWeight(s.weight, s.weight_unit), s.reps))
      );
      const totalVolume = entry.sets.reduce((sum, s) => sum + (convertWeight(s.weight, s.weight_unit) * s.reps), 0);
      
      return {
        date: entry.date,
        maxWeight,
        totalVolume,
        estimated1RM: best1RM,
      };
    });

    const labels = formatChartLabels(dataPoints.map((d) => d.date), 6);

    return {
      labels,
      weight: {
        labels,
        datasets: [
          {
            data: dataPoints.map((d) => d.maxWeight),
            color: () => '#3b82f6',
            strokeWidth: 2,
          },
        ],
      },
      volume: {
        labels,
        datasets: [
          {
            data: dataPoints.map((d) => d.totalVolume),
            color: () => '#22c55e',
            strokeWidth: 2,
          },
        ],
      },
      oneRM: {
        labels,
        datasets: [
          {
            data: dataPoints.map((d) => d.estimated1RM),
            color: () => '#ef4444',
            strokeWidth: 2,
          },
        ],
      },
      rawData: dataPoints,
    };
  }, [history, timeRange]);

  const handleDataPointClick = (
    chart: string,
    data: { index: number; value: number }
  ) => {
    if (!chartData?.rawData[data.index]) return;
    
    const point = chartData.rawData[data.index];
    const label = format(new Date(point.date), 'MMM d, yyyy');
    
    setTouchedPoint({
      chart,
      value: data.value,
      label,
    });
    
    // Clear after 2 seconds
    setTimeout(() => setTouchedPoint(null), 2000);
  };

  if (!chartData || history.length < 2) {
    return (
      <View style={styles.chartsEmptyState}>
        <BarChart3 size={48} color="#334155" />
        <Text style={styles.emptyTitle}>Not enough data</Text>
        <Text style={styles.emptySubtitle}>
          Complete at least 2 workouts to see progress charts
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.chartsContainer}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.chartsContent}
    >
      {/* Time Range Selector */}
      <TimeRangeSelector selected={timeRange} onSelect={onTimeRangeChange} />

      {/* Touched Point Indicator */}
      {touchedPoint && (
        <View style={styles.touchedPointContainer}>
          <Text style={styles.touchedPointText}>
            {touchedPoint.label}: {touchedPoint.value.toLocaleString()}
            {touchedPoint.chart === 'weight' || touchedPoint.chart === 'oneRM'
              ? ` ${weightUnit}`
              : ` ${weightUnit} vol`}
          </Text>
        </View>
      )}

      {/* Weight Progress Chart */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Trophy size={20} color="#3b82f6" />
          <Text style={styles.chartTitle}>Weight Progress</Text>
        </View>
        <Text style={styles.chartSubtitle}>Max weight per session</Text>
        <LineChart
          data={chartData.weight}
          width={CHART_WIDTH}
          height={200}
          chartConfig={chartConfig}
          bezier={true}
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={false}
          withHorizontalLines={true}
          withDots={true}
          withShadow={false}
          onDataPointClick={(data) => handleDataPointClick('weight', data)}
          segments={4}
        />
      </View>

      {/* Volume Progress Chart */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <TrendingUp size={20} color="#22c55e" />
          <Text style={styles.chartTitle}>Volume Progress</Text>
        </View>
        <Text style={styles.chartSubtitle}>Total volume per session</Text>
        <LineChart
          data={chartData.volume}
          width={CHART_WIDTH}
          height={200}
          chartConfig={volumeChartConfig}
          bezier={true}
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={false}
          withHorizontalLines={true}
          withDots={true}
          withShadow={false}
          onDataPointClick={(data) => handleDataPointClick('volume', data)}
          segments={4}
        />
      </View>

      {/* Estimated 1RM Chart */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Target size={20} color="#ef4444" />
          <Text style={styles.chartTitle}>Estimated 1RM</Text>
        </View>
        <Text style={styles.chartSubtitle}>1 rep max progression</Text>
        <LineChart
          data={chartData.oneRM}
          width={CHART_WIDTH}
          height={200}
          chartConfig={oneRMChartConfig}
          bezier={true}
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={false}
          withHorizontalLines={true}
          withDots={true}
          withShadow={false}
          onDataPointClick={(data) => handleDataPointClick('oneRM', data)}
          segments={4}
        />
      </View>

      <View style={styles.chartFooter} />
    </ScrollView>
  );
};

// ============================================
// Skeleton Components
// ============================================

const StatsSkeleton = () => (
  <View style={styles.statsCard}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.statItem}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <Skeleton width={60} height={24} style={{ marginTop: 8 }} />
          <Skeleton width={80} height={12} style={{ marginTop: 4 }} />
        </View>
      ))}
    </ScrollView>
  </View>
);

// ============================================
// Main Component
// ============================================

export default function ExerciseHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { weightUnit, unitSystem } = useUnits();
  
  // Helper to convert weight from DB unit to user's preferred unit
  const convertWeight = (weight: number, dbUnit?: string): number => {
    const targetUnit = unitSystem === 'metric' ? 'kg' : 'lbs';
    const sourceUnit = dbUnit || 'lbs';
    if (sourceUnit === targetUnit) return weight;
    if (targetUnit === 'kg' && sourceUnit === 'lbs') return weight * 0.453592;
    if (targetUnit === 'lbs' && sourceUnit === 'kg') return weight * 2.20462;
    return weight;
  };

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [stats, setStats] = useState<ExerciseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedSets, setExpandedSets] = useState<ExpandedSets>({});
  const [activeTab, setActiveTab] = useState<TabType>('history');
  const [timeRange, setTimeRange] = useState<TimeRange>('All');

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!id || !user?.id) return;

    try {
      const [exerciseData, historyData, statsData] = await Promise.all([
        getExerciseById(id),
        getExerciseHistory(user.id, id),
        getExerciseStats(user.id, id),
      ]);

      setExercise(exerciseData);
      setHistory(historyData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch exercise history:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  const toggleExpanded = (workoutId: string) => {
    setExpandedSets((prev) => ({
      ...prev,
      [workoutId]: !prev[workoutId],
    }));
  };

  const handleTabChange = (tab: TabType) => {
    lightHaptic();
    setActiveTab(tab);
  };

  // Format last performed text
  const getLastPerformedText = () => {
    if (!stats?.lastPerformed) return 'Never';
    try {
      return formatDistanceToNow(new Date(stats.lastPerformed), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <LoadingSpinner fullScreen message="Loading history..." />
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
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {exercise.name}
          </Text>
          <Text style={styles.headerSubtitle}>
            {exercise.primary_muscles?.[0] || 'Exercise'}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Stats Summary Card */}
      {stats ? (
        <View style={styles.statsCard}>
          <ScrollView 
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsScrollContent}
          >
            <StatItem
              label="Times Performed"
              value={stats.totalTimesPerformed}
              icon={<Calendar size={20} color="#3b82f6" />}
              color="#3b82f6"
            />
            <StatItem
              label="Last Performed"
              value={getLastPerformedText()}
              icon={<Clock size={20} color="#22c55e" />}
              color="#22c55e"
            />
            <StatItem
              label="Best Weight"
              value={stats.bestWeight ? `${stats.bestWeight.value} ${weightUnit}` : '—'}
              icon={<Trophy size={20} color="#fbbf24" />}
              color="#fbbf24"
            />
            <StatItem
              label="Best Volume"
              value={stats.bestVolume ? `${stats.bestVolume.value.toLocaleString()}` : '—'}
              icon={<TrendingUp size={20} color="#a855f7" />}
              color="#a855f7"
            />
            <StatItem
              label="Est. 1RM"
              value={stats.estimated1RM ? `${stats.estimated1RM} ${weightUnit}` : '—'}
              icon={<Target size={20} color="#ef4444" />}
              color="#ef4444"
            />
          </ScrollView>
        </View>
      ) : (
        <StatsSkeleton />
      )}

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => handleTabChange('history')}
        >
          <ListFilter size={18} color={activeTab === 'history' ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'charts' && styles.tabActive]}
          onPress={() => handleTabChange('charts')}
        >
          <BarChart3 size={18} color={activeTab === 'charts' ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'charts' && styles.tabTextActive]}>
            Charts
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'history' ? (
        <>
          {/* Section Title */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>WORKOUT HISTORY</Text>
            <Text style={styles.sectionCount}>
              {history.length} workout{history.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* History List */}
          {history.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar size={48} color="#334155" />
              <Text style={styles.emptyTitle}>No history yet</Text>
              <Text style={styles.emptySubtitle}>
                Complete a workout with this exercise to see your history
              </Text>
            </View>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item) => item.workoutId}
              contentContainerStyle={styles.historyList}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor="#3b82f6"
                  colors={['#3b82f6']}
                />
              }
              renderItem={({ item }) => (
                <HistoryEntry
                  entry={item}
                  isExpanded={expandedSets[item.workoutId] || false}
                  onToggle={() => toggleExpanded(item.workoutId)}
                  onNavigateWorkout={() => router.push(`/workout/${item.workoutId}`)}
                />
              )}
              ListFooterComponent={<View style={styles.listFooter} />}
            />
          )}
        </>
      ) : (
        <ChartsTab
          history={history}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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

  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },

  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },

  headerSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },

  headerSpacer: {
    width: 44,
  },

  // Stats Card
  statsCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 16,
  },

  statsScrollContent: {
    paddingHorizontal: 8,
    gap: 8,
  },

  statItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
    minWidth: 100,
  },

  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  statValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  statLabel: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
  },

  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },

  tabActive: {
    backgroundColor: '#334155',
  },

  tabText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: 'bold',
  },

  tabTextActive: {
    color: '#3b82f6',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },

  sectionTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  sectionCount: {
    color: '#64748b',
    fontSize: 12,
  },

  // History List
  historyList: {
    paddingHorizontal: 16,
  },

  historyEntry: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },

  historyEntrySkeleton: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  historyEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },

  historyEntryLeft: {
    flex: 1,
  },

  historyEntryRight: {
    paddingLeft: 12,
  },

  historyDate: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },

  historySummary: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 2,
  },

  historyVolume: {
    color: '#64748b',
    fontSize: 12,
  },

  // Expanded Content
  expandedContent: {
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    padding: 16,
  },

  setsTableHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  setsTableHeaderText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  setRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },

  setRowText: {
    color: '#f1f5f9',
    fontSize: 14,
  },

  viewWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 10,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    gap: 4,
  },

  viewWorkoutText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Charts Tab
  chartsContainer: {
    flex: 1,
  },

  chartsContent: {
    padding: 16,
  },

  chartsEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },

  // Time Range Selector
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },

  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },

  timeRangeButtonActive: {
    backgroundColor: '#334155',
  },

  timeRangeText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: 'bold',
  },

  timeRangeTextActive: {
    color: '#ffffff',
  },

  // Touched Point
  touchedPointContainer: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'center',
  },

  touchedPointText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Chart Cards
  chartCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },

  chartTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  chartSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 12,
  },

  chart: {
    marginLeft: -16,
    borderRadius: 12,
  },

  chartFooter: {
    height: 40,
  },

  // Empty State
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

  listFooter: {
    height: 40,
  },
});
