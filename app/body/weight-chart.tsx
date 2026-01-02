import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Calendar,
  Scale,
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { format, subDays, subMonths, subYears } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/stores/authStore';
import {
  getWeightHistory,
  getWeightStats,
  getAllWeights,
  WeightEntry,
  WeightStats,
} from '@/lib/api/bodyWeight';
import {
  calculateMovingAverageAligned,
  formatWeightChange,
  formatWeeklyRate,
} from '@/lib/utils/weightTrends';
import { useUnits } from '@/hooks/useUnits';

// ============================================
// Types
// ============================================

type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y' | 'All';

const timeRanges: TimeRange[] = ['1W', '1M', '3M', '6M', '1Y', 'All'];

const screenWidth = Dimensions.get('window').width;

// ============================================
// Stat Card Component
// ============================================

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subValue, icon, color }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, color ? { backgroundColor: color + '20' } : {}]}>
      {icon}
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {subValue && <Text style={styles.statSubValue}>{subValue}</Text>}
  </View>
);

// ============================================
// Time Range Selector Component
// ============================================

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ selected, onSelect }) => (
  <View style={styles.timeRangeContainer}>
    {timeRanges.map((range) => (
      <TouchableOpacity
        key={range}
        style={[styles.timeRangeButton, selected === range && styles.timeRangeButtonActive]}
        onPress={() => {
          Haptics.selectionAsync();
          onSelect(range);
        }}
      >
        <Text style={[styles.timeRangeText, selected === range && styles.timeRangeTextActive]}>
          {range}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ============================================
// Main Screen Component
// ============================================

export default function WeightChartScreen() {
  const { user } = useAuthStore();
  const { bodyWeight, unitSystem } = useUnits();

  const [stats, setStats] = useState<WeightStats | null>(null);
  const [chartData, setChartData] = useState<WeightEntry[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{ value: number; date: string } | null>(null);
  
  // Helper to convert weight from API unit to user's preferred unit
  const convertWeight = (weight: number, apiUnit: 'lbs' | 'kg'): number => {
    // If API unit matches user preference, no conversion needed
    if ((unitSystem === 'imperial' && apiUnit === 'lbs') || 
        (unitSystem === 'metric' && apiUnit === 'kg')) {
      return weight;
    }
    
    // Convert lbs to kg
    if (unitSystem === 'metric' && apiUnit === 'lbs') {
      return weight * 0.453592;
    }
    
    // Convert kg to lbs
    if (unitSystem === 'imperial' && apiUnit === 'kg') {
      return weight * 2.20462;
    }
    
    return weight;
  };

  // Get days for time range
  const getDaysForRange = (range: TimeRange): number => {
    switch (range) {
      case '1W': return 7;
      case '1M': return 30;
      case '3M': return 90;
      case '6M': return 180;
      case '1Y': return 365;
      case 'All': return -1; // Special case
      default: return 30;
    }
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Fetch stats (always all data)
      const statsData = await getWeightStats(user.id);
      setStats(statsData);

      // Fetch chart data based on time range
      const days = getDaysForRange(timeRange);
      let weights: WeightEntry[];

      if (days === -1) {
        weights = await getAllWeights(user.id);
      } else {
        weights = await getWeightHistory(user.id, days);
      }

      setChartData(weights);
    } catch (error) {
      logger.error('Error fetching weight data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id, timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Prepare chart data
  const prepareChartData = () => {
    if (chartData.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [0] }],
      };
    }

    // Limit labels to prevent overcrowding
    const maxLabels = 6;
    const step = Math.max(1, Math.floor(chartData.length / maxLabels));
    
    const labels = chartData
      .filter((_, i) => i % step === 0 || i === chartData.length - 1)
      .map(w => format(new Date(w.logged_at), 'M/d'));

    // Convert weights to user's preferred unit
    const weights = chartData.map(w => convertWeight(w.weight, w.weight_unit as 'lbs' | 'kg'));
    
    // Calculate moving average with converted weights
    const movingAvgRaw = calculateMovingAverageAligned(
      chartData.map(w => ({ 
        date: w.logged_at, 
        weight: convertWeight(w.weight, w.weight_unit as 'lbs' | 'kg') 
      })),
      7
    );
    
    // For chart display, replace nulls with the first valid value or the actual weight
    // This ensures both lines have the same number of points
    const firstValidAvg = movingAvgRaw.find(v => v !== null) ?? weights[0];
    const movingAvg = movingAvgRaw.map((v, i) => v ?? firstValidAvg ?? weights[i]);

    return {
      labels,
      datasets: [
        {
          data: weights,
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // Blue
          strokeWidth: 2,
        },
        {
          data: movingAvg,
          color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, // Green
          strokeWidth: 2,
          withDots: false,
        },
      ],
      legend: ['Actual', '7-Day Avg'],
    };
  };

  // Get trend icon and color
  const getTrendIndicator = (change: number) => {
    if (change === 0) {
      return { icon: <Minus size={20} color="#64748b" />, color: '#64748b' };
    }
    if (change > 0) {
      return { icon: <TrendingUp size={20} color="#22c55e" />, color: '#22c55e' };
    }
    return { icon: <TrendingDown size={20} color="#ef4444" />, color: '#ef4444' };
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

  const chartDataPrepared = prepareChartData();
  const trendIndicator = stats ? getTrendIndicator(stats.weeklyRate) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weight Progress</Text>
        <View style={{ width: 32 }} />
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
        {stats ? (
          <>
            {/* Current Stats Card */}
            <View style={styles.statsCard}>
              <Text style={styles.statsCardTitle}>Overview</Text>
              
              <View style={styles.statsGrid}>
                <StatCard
                  label="Current"
                  value={`${Math.round(convertWeight(stats.currentWeight, stats.unit) * 10) / 10}`}
                  subValue={bodyWeight.label}
                  icon={<Scale size={18} color="#3b82f6" />}
                  color="#3b82f6"
                />
                <StatCard
                  label="Starting"
                  value={`${Math.round(convertWeight(stats.startingWeight, stats.unit) * 10) / 10}`}
                  subValue={bodyWeight.label}
                  icon={<Calendar size={18} color="#8b5cf6" />}
                  color="#8b5cf6"
                />
                <StatCard
                  label="Total Change"
                  value={formatWeightChange(convertWeight(stats.totalChange, stats.unit), '')}
                  subValue={bodyWeight.label}
                  icon={stats.totalChange >= 0 
                    ? <TrendingUp size={18} color="#22c55e" />
                    : <TrendingDown size={18} color="#ef4444" />
                  }
                  color={stats.totalChange >= 0 ? '#22c55e' : '#ef4444'}
                />
                <StatCard
                  label="7-Day Avg"
                  value={`${Math.round(convertWeight(stats.average7Day, stats.unit) * 10) / 10}`}
                  subValue={bodyWeight.label}
                  icon={<Target size={18} color="#f59e0b" />}
                  color="#f59e0b"
                />
              </View>
            </View>

            {/* Time Range Selector */}
            <TimeRangeSelector selected={timeRange} onSelect={setTimeRange} />

            {/* Chart */}
            {chartData.length >= 2 ? (
              <View style={styles.chartContainer}>
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
                    <Text style={styles.legendText}>Actual</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
                    <Text style={styles.legendText}>7-Day Avg</Text>
                  </View>
                </View>

                <LineChart
                  data={chartDataPrepared}
                  width={screenWidth - 32}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#1e293b',
                    backgroundGradientFrom: '#1e293b',
                    backgroundGradientTo: '#1e293b',
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                    style: {
                      borderRadius: 12,
                    },
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: '#3b82f6',
                    },
                    propsForBackgroundLines: {
                      strokeDasharray: '',
                      stroke: '#334155',
                      strokeWidth: 1,
                    },
                  }}
                  bezier={true}
                  style={styles.chart}
                  onDataPointClick={(data) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const entry = chartData[data.index];
                    if (entry) {
                      setSelectedPoint({
                        value: Math.round(convertWeight(entry.weight, entry.weight_unit as 'lbs' | 'kg') * 10) / 10,
                        date: format(new Date(entry.logged_at), 'MMM d, yyyy'),
                      });
                    }
                  }}
                  withInnerLines={true}
                  withOuterLines={false}
                  withVerticalLines={false}
                  withHorizontalLines={true}
                  fromZero={false}
                />

                {/* Selected Point Tooltip */}
                {selectedPoint && (
                  <TouchableOpacity
                    style={styles.tooltip}
                    onPress={() => setSelectedPoint(null)}
                  >
                    <Text style={styles.tooltipValue}>
                      {selectedPoint.value} {bodyWeight.label}
                    </Text>
                    <Text style={styles.tooltipDate}>{selectedPoint.date}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.noChartData}>
                <Text style={styles.noChartText}>
                  Need at least 2 entries to show chart
                </Text>
              </View>
            )}

            {/* Trend Analysis Card */}
            <View style={styles.trendCard}>
              <Text style={styles.trendCardTitle}>Trend Analysis</Text>

              <View style={styles.trendRow}>
                <View style={styles.trendItem}>
                  <Text style={styles.trendLabel}>Weekly Rate</Text>
                  <View style={styles.trendValueRow}>
                    {trendIndicator?.icon}
                    <Text style={[styles.trendValue, { color: trendIndicator?.color }]}>
                      {formatWeeklyRate(convertWeight(stats.weeklyRate, stats.unit), bodyWeight.label)}
                    </Text>
                  </View>
                </View>

                <View style={styles.trendDivider} />

                <View style={styles.trendItem}>
                  <Text style={styles.trendLabel}>Projected (30d)</Text>
                  <Text style={styles.trendValue}>
                    {Math.round(convertWeight(stats.projectedWeight30Day, stats.unit) * 10) / 10} {bodyWeight.label}
                  </Text>
                </View>
              </View>

              {/* Progress Insight */}
              <View style={styles.insightContainer}>
                <Text style={styles.insightText}>
                  {stats.weeklyRate === 0
                    ? "ðŸ“Š Your weight has been stable"
                    : stats.weeklyRate > 0
                    ? `ðŸ“ˆ You're gaining about ${Math.abs(Math.round(convertWeight(stats.weeklyRate, stats.unit) * 10) / 10)} ${bodyWeight.label} per week`
                    : `ðŸ“‰ You're losing about ${Math.abs(Math.round(convertWeight(stats.weeklyRate, stats.unit) * 10) / 10)} ${bodyWeight.label} per week`}
                </Text>
              </View>
            </View>

            {/* 30-Day Average Card */}
            <View style={styles.averageCard}>
              <View style={styles.averageRow}>
                <View style={styles.averageItem}>
                  <Text style={styles.averageLabel}>30-Day Average</Text>
                  <Text style={styles.averageValue}>
                    {Math.round(convertWeight(stats.average30Day, stats.unit) * 10) / 10} {bodyWeight.label}
                  </Text>
                </View>
                <View style={styles.averageItem}>
                  <Text style={styles.averageLabel}>Total Entries</Text>
                  <Text style={styles.averageValue}>{stats.totalEntries}</Text>
                </View>
              </View>
              {stats.firstEntryDate && (
                <Text style={styles.firstEntryText}>
                  Tracking since {format(new Date(stats.firstEntryDate), 'MMMM d, yyyy')}
                </Text>
              )}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Scale size={48} color="#475569" />
            <Text style={styles.emptyTitle}>No Data Yet</Text>
            <Text style={styles.emptySubtitle}>
              Start logging your weight to see trends and progress
            </Text>
            <TouchableOpacity
              style={styles.logButton}
              onPress={() => router.push('/body/weight')}
            >
              <Text style={styles.logButtonText}>Log Weight</Text>
            </TouchableOpacity>
          </View>
        )}

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

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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

  // Scroll
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
  },

  bottomSpacer: {
    height: 40,
  },

  // Stats Card
  statsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  statsCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 16,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  statSubValue: {
    fontSize: 12,
    color: '#94a3b8',
  },

  // Time Range Selector
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },

  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },

  timeRangeButtonActive: {
    backgroundColor: '#3b82f6',
  },

  timeRangeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748b',
  },

  timeRangeTextActive: {
    color: '#ffffff',
  },

  // Chart
  chartContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 12,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  legendText: {
    fontSize: 12,
    color: '#94a3b8',
  },

  chart: {
    borderRadius: 12,
    marginLeft: -16,
  },

  tooltip: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  tooltipValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  tooltipDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },

  noChartData: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },

  noChartText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },

  // Trend Card
  trendCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  trendCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 16,
  },

  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  trendItem: {
    flex: 1,
    alignItems: 'center',
  },

  trendLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },

  trendValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  trendValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  trendDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#334155',
    marginHorizontal: 16,
  },

  insightContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },

  insightText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Average Card
  averageCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  averageRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },

  averageItem: {
    alignItems: 'center',
  },

  averageLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },

  averageValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  firstEntryText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Empty State
  emptyState: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
  },

  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },

  logButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },

  logButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});

