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
  Alert,
  Modal,
  Pressable,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  ChevronDown,
  Trash2,
  Calendar,
  Check,
  BarChart3,
  Activity,
  List,
  PieChart,
  Target,
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { format, differenceInDays, differenceInMonths, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/stores/authStore';
import { useUnits } from '@/hooks/useUnits';
import {
  getMeasurementHistory,
  getMeasurementTimeline,
  getFirstMeasurements,
  getLatestMeasurements,
  compareMeasurements,
  deleteMeasurementById,
  MeasurementEntry,
  MeasurementComparison,
  MeasurementTimelinePoint,
  CHARTABLE_FIELDS,
  MeasurementData,
} from '@/lib/api/measurements';
import {
  calculateAllRatios,
  calculateBodyComposition,
  getBodyFatCategory,
  getMeasurementColor,
  Gender,
} from '@/lib/utils/bodyRatios';

// ============================================
// Types
// ============================================

type Tab = 'summary' | 'charts' | 'history';
type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'All';

const timeRanges: TimeRange[] = ['1M', '3M', '6M', '1Y', 'All'];
const screenWidth = Dimensions.get('window').width;

// ============================================
// Tab Selector Component
// ============================================

interface TabSelectorProps {
  selected: Tab;
  onSelect: (tab: Tab) => void;
}

const TabSelector: React.FC<TabSelectorProps> = ({ selected, onSelect }) => {
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'summary', label: 'Summary', icon: <Activity size={16} color={selected === 'summary' ? '#ffffff' : '#64748b'} /> },
    { key: 'charts', label: 'Charts', icon: <BarChart3 size={16} color={selected === 'charts' ? '#ffffff' : '#64748b'} /> },
    { key: 'history', label: 'History', icon: <List size={16} color={selected === 'history' ? '#ffffff' : '#64748b'} /> },
  ];

  return (
    <View style={styles.tabContainer}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tabButton, selected === tab.key && styles.tabButtonActive]}
          onPress={() => {
            Haptics.selectionAsync();
            onSelect(tab.key);
          }}
        >
          {tab.icon}
          <Text style={[styles.tabText, selected === tab.key && styles.tabTextActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ============================================
// Comparison Card Component
// ============================================

interface ComparisonCardProps {
  comparisons: MeasurementComparison[];
  timeSpan: string;
  unit: string;
}

const ComparisonCard: React.FC<ComparisonCardProps> = ({ comparisons, timeSpan, unit }) => {
  const validComparisons = comparisons.filter(
    c => c.firstValue !== null && c.latestValue !== null && c.change !== null
  );

  if (validComparisons.length === 0) {
    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Progress Summary</Text>
        <Text style={styles.noDataText}>Not enough data to compare yet</Text>
      </View>
    );
  }

  const topChanges = validComparisons.slice(0, 4);

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>Progress Summary</Text>
        <Text style={styles.timeSpan}>{timeSpan}</Text>
      </View>

      <View style={styles.comparisonGrid}>
        {topChanges.map((comp) => {
          const isPositive = (comp.change || 0) > 0;
          const isGood = comp.isLossGood ? !isPositive : isPositive;
          const color = comp.change === 0 ? '#64748b' : isGood ? '#22c55e' : '#ef4444';

          return (
            <View key={comp.key} style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>{comp.label}</Text>
              <View style={styles.comparisonValues}>
                <Text style={styles.comparisonOld}>
                  {comp.firstValue}{comp.key === 'body_fat_percentage' ? '%' : unit}
                </Text>
                <Text style={styles.comparisonArrow}> </Text>
                <Text style={styles.comparisonNew}>
                  {comp.latestValue}{comp.key === 'body_fat_percentage' ? '%' : unit}
                </Text>
              </View>
              <View style={[styles.comparisonChange, { backgroundColor: color + '20' }]}>
                {comp.change === 0 ? (
                  <Minus size={12} color={color} />
                ) : isPositive ? (
                  <TrendingUp size={12} color={color} />
                ) : (
                  <TrendingDown size={12} color={color} />
                )}
                <Text style={[styles.comparisonChangeText, { color }]}>
                  {comp.change !== null && comp.change > 0 ? '+' : ''}{comp.change}
                  {comp.key === 'body_fat_percentage' ? '%' : unit}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ============================================
// Body Ratios Card Component
// ============================================

interface RatiosCardProps {
  measurements: MeasurementEntry | null;
  gender: Gender;
}

const RatiosCard: React.FC<RatiosCardProps> = ({ measurements, gender }) => {
  if (!measurements) return null;

  const ratios = calculateAllRatios(
    {
      waist: measurements.waist ?? undefined,
      hips: measurements.hips ?? undefined,
      chest: measurements.chest ?? undefined,
      shoulders: measurements.shoulders ?? undefined,
    },
    gender
  );

  if (ratios.length === 0) return null;

  return (
    <View style={styles.ratiosCard}>
      <View style={styles.cardHeader}>
        <Target size={18} color="#8b5cf6" />
        <Text style={styles.cardTitle}>Body Ratios</Text>
      </View>
      <Text style={styles.cardSubtitle}>Based on latest measurements</Text>

      {ratios.map((ratio) => {
        if (!ratio.result) return null;
        return (
          <View key={ratio.type} style={styles.ratioRow}>
            <View style={styles.ratioInfo}>
              <Text style={styles.ratioLabel}>{ratio.label}</Text>
              <Text style={styles.ratioMessage}>{ratio.result.message}</Text>
            </View>
            <View style={[styles.ratioBadge, { backgroundColor: ratio.result.color + '20' }]}>
              <Text style={[styles.ratioValue, { color: ratio.result.color }]}>
                {ratio.result.value.toFixed(2)}
              </Text>
            </View>
          </View>
        );
      })}

      <View style={styles.ratioLegend}>
        <Text style={styles.legendText}>
          x Shoulder-to-waist golden ratio: 1.618
        </Text>
      </View>
    </View>
  );
};

// ============================================
// Body Composition Card Component
// ============================================

interface BodyCompositionCardProps {
  weight: number | null;
  bodyFatPercent: number | null;
  gender: Gender;
}

const BodyCompositionCard: React.FC<BodyCompositionCardProps> = ({
  weight,
  bodyFatPercent,
  gender,
}) => {
  if (!weight || !bodyFatPercent) return null;

  const composition = calculateBodyComposition(weight, bodyFatPercent);
  const category = getBodyFatCategory(bodyFatPercent, gender);

  const fatPercentForPie = Math.min(100, Math.max(0, bodyFatPercent));
  const leanPercentForPie = 100 - fatPercentForPie;

  return (
    <View style={styles.compositionCard}>
      <View style={styles.cardHeader}>
        <PieChart size={18} color="#ec4899" />
        <Text style={styles.cardTitle}>Body Composition</Text>
      </View>

      {/* Simple visual pie */}
      <View style={styles.pieContainer}>
        <View style={styles.pieChart}>
          <View
            style={[
              styles.pieSliceFat,
              { transform: [{ rotate: `${fatPercentForPie * 3.6}deg` }] },
            ]}
          />
          <View style={styles.pieCenter}>
            <Text style={styles.pieCenterPercent}>{bodyFatPercent}%</Text>
            <Text style={styles.pieCenterLabel}>Body Fat</Text>
          </View>
        </View>

        <View style={styles.compositionLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <View>
              <Text style={styles.legendLabel}>Fat Mass</Text>
              <Text style={styles.legendValue}>{bodyWeight.format(composition.fatMass)}</Text>
            </View>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
            <View>
              <Text style={styles.legendLabel}>Lean Mass</Text>
              <Text style={styles.legendValue}>{bodyWeight.format(composition.leanMass)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.categoryBadge, { backgroundColor: category.color + '20' }]}>
        <Text style={[styles.categoryText, { color: category.color }]}>
          {category.category}
        </Text>
      </View>
    </View>
  );
};

// ============================================
// Measurement Selector Component
// ============================================

interface MeasurementSelectorProps {
  selected: keyof MeasurementData;
  onSelect: (key: keyof MeasurementData) => void;
  showMultiSelect?: boolean;
  selectedMultiple?: (keyof MeasurementData)[];
  onMultiSelect?: (keys: (keyof MeasurementData)[]) => void;
}

const MeasurementSelector: React.FC<MeasurementSelectorProps> = ({
  selected,
  onSelect,
  showMultiSelect = false,
  selectedMultiple = [],
  onMultiSelect,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const selectedField = CHARTABLE_FIELDS.find(f => f.key === selected);

  const handleSelect = (key: keyof MeasurementData) => {
    if (showMultiSelect && onMultiSelect) {
      const isSelected = selectedMultiple.includes(key);
      if (isSelected) {
        onMultiSelect(selectedMultiple.filter(k => k !== key));
      } else if (selectedMultiple.length < 3) {
        onMultiSelect([...selectedMultiple, key]);
      }
    } else {
      onSelect(key);
      setShowPicker(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => {
          Haptics.selectionAsync();
          setShowPicker(true);
        }}
      >
        <Text style={styles.selectorLabel}>Showing:</Text>
        <Text style={styles.selectorValue}>
          {showMultiSelect && selectedMultiple.length > 0
            ? `${selectedMultiple.length} selected`
            : selectedField?.label || 'Select'}
        </Text>
        <ChevronDown size={18} color="#94a3b8" />
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <Pressable style={styles.pickerOverlay} onPress={() => setShowPicker(false)}>
          <View style={styles.pickerContent}>
            <Text style={styles.pickerTitle}>
              {showMultiSelect ? 'Compare Measurements (max 3)' : 'Select Measurement'}
            </Text>
            <FlatList
              data={CHARTABLE_FIELDS}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => {
                const isSelected = showMultiSelect
                  ? selectedMultiple.includes(item.key)
                  : item.key === selected;
                const color = getMeasurementColor(item.key);

                return (
                  <TouchableOpacity
                    style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      handleSelect(item.key);
                    }}
                  >
                    <View style={[styles.colorDot, { backgroundColor: color }]} />
                    <Text
                      style={[
                        styles.pickerOptionText,
                        isSelected && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && <Check size={18} color="#3b82f6" />}
                  </TouchableOpacity>
                );
              }}
            />
            {showMultiSelect && (
              <TouchableOpacity
                style={styles.pickerDoneButton}
                onPress={() => setShowPicker(false)}
              >
                <Text style={styles.pickerDoneText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

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
// History Entry Row Component
// ============================================

interface HistoryEntryProps {
  entry: MeasurementEntry;
  selectedMeasurement: keyof MeasurementData;
  unit: string;
  onPress: () => void;
  onDelete: () => void;
}

const HistoryEntryRow: React.FC<HistoryEntryProps> = ({
  entry,
  selectedMeasurement,
  unit,
  onPress,
  onDelete,
}) => {
  const value = entry[selectedMeasurement] as number | undefined;
  const date = parseISO(entry.measured_at);
  const dateText = format(date, 'EEE, MMM d, yyyy');

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry',
      `Delete measurements from ${dateText}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onDelete();
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity style={styles.historyRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.historyDate}>
        <Calendar size={16} color="#64748b" />
        <Text style={styles.historyDateText}>{dateText}</Text>
      </View>

      <View style={styles.historyValue}>
        {value !== undefined && value !== null ? (
          <Text style={styles.historyValueText}>
            {value}{selectedMeasurement === 'body_fat_percentage' ? '%' : ` ${unit}`}
          </Text>
        ) : (
          <Text style={styles.historyNoValue}></Text>
        )}
      </View>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Trash2 size={18} color="#ef4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// ============================================
// Multi-Measurement Chart Component
// ============================================

interface MultiChartProps {
  timelines: Map<keyof MeasurementData, MeasurementTimelinePoint[]>;
  selectedKeys: (keyof MeasurementData)[];
  timeRange: TimeRange;
}

const MultiMeasurementChart: React.FC<MultiChartProps> = ({
  timelines,
  selectedKeys,
  timeRange,
}) => {
  const filterByTimeRange = (data: MeasurementTimelinePoint[]): MeasurementTimelinePoint[] => {
    if (timeRange === 'All' || data.length === 0) return data;

    const now = new Date();
    let cutoffDate: Date;

    switch (timeRange) {
      case '1M':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case '3M':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case '6M':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 6));
        break;
      case '1Y':
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        return data;
    }

    return data.filter(d => new Date(d.date) >= cutoffDate);
  };

  // Prepare datasets
  const datasets: Array<{
    data: number[];
    color: (opacity: number) => string;
    strokeWidth: number;
  }> = [];
  let labels: string[] = [];

  selectedKeys.forEach((key, index) => {
    const timeline = timelines.get(key) || [];
    const filtered = filterByTimeRange(timeline);

    if (filtered.length > 0) {
      const color = getMeasurementColor(key);

      if (labels.length === 0) {
        const maxLabels = 6;
        const step = Math.max(1, Math.floor(filtered.length / maxLabels));
        labels = filtered
          .filter((_, i) => i % step === 0 || i === filtered.length - 1)
          .map(d => format(parseISO(d.date), 'M/d'));
      }

      datasets.push({
        data: filtered.map(d => d.value),
        color: (opacity = 1) => color,
        strokeWidth: 2,
      });
    }
  });

  if (datasets.length === 0 || labels.length === 0) {
    return (
      <View style={styles.noChartData}>
        <Text style={styles.noChartText}>Select measurements to compare</Text>
      </View>
    );
  }

  // Legend
  const legend = selectedKeys
    .filter(key => timelines.get(key)?.length)
    .map(key => {
      const field = CHARTABLE_FIELDS.find(f => f.key === key);
      return field?.label || key;
    });

  return (
    <View style={styles.chartContainer}>
      <LineChart
        data={{
          labels,
          datasets,
          legend,
        }}
        width={screenWidth - 32}
        height={220}
        chartConfig={{
          backgroundColor: '#1e293b',
          backgroundGradientFrom: '#1e293b',
          backgroundGradientTo: '#1e293b',
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
          style: { borderRadius: 12 },
          propsForDots: { r: '3', strokeWidth: '1' },
          propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: '#334155',
            strokeWidth: 1,
          },
        }}
        bezier={true}
        style={styles.chart}
        withInnerLines={true}
        withOuterLines={false}
        withVerticalLines={false}
        withHorizontalLines={true}
        fromZero={false}
      />

      {/* Color Legend */}
      <View style={styles.chartLegend}>
        {selectedKeys.map(key => {
          const field = CHARTABLE_FIELDS.find(f => f.key === key);
          const color = getMeasurementColor(key);
          return (
            <View key={key} style={styles.chartLegendItem}>
              <View style={[styles.chartLegendDot, { backgroundColor: color }]} />
              <Text style={styles.chartLegendText}>{field?.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ============================================
// Main Screen Component
// ============================================

export default function MeasurementsHistoryScreen() {
  const { user } = useAuthStore();
  const { bodyWeight } = useUnits();

  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [history, setHistory] = useState<MeasurementEntry[]>([]);
  const [comparisons, setComparisons] = useState<MeasurementComparison[]>([]);
  const [timeSpan, setTimeSpan] = useState('');
  const [chartData, setChartData] = useState<MeasurementTimelinePoint[]>([]);
  const [multiChartData, setMultiChartData] = useState<Map<keyof MeasurementData, MeasurementTimelinePoint[]>>(new Map());
  const [selectedMeasurement, setSelectedMeasurement] = useState<keyof MeasurementData>('waist');
  const [selectedMultiple, setSelectedMultiple] = useState<(keyof MeasurementData)[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const [latestMeasurements, setLatestMeasurements] = useState<MeasurementEntry | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Gender (ideally from user profile, defaulting to male)
  const gender: Gender = 'male';

  // Filter chart data by time range
  const filterByTimeRange = (data: MeasurementTimelinePoint[]): MeasurementTimelinePoint[] => {
    if (timeRange === 'All' || data.length === 0) return data;

    const now = new Date();
    let cutoffDate: Date;

    switch (timeRange) {
      case '1M':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case '3M':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case '6M':
        cutoffDate = new Date(now.setMonth(now.getMonth() - 6));
        break;
      case '1Y':
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        return data;
    }

    return data.filter(d => new Date(d.date) >= cutoffDate);
  };

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const historyData = await getMeasurementHistory(user.id);
      setHistory(historyData);

      if (historyData.length > 0 && historyData[0].unit) {
        setUnit(historyData[0].unit as 'in' | 'cm');
      }

      const [first, latest] = await Promise.all([
        getFirstMeasurements(user.id),
        getLatestMeasurements(user.id),
      ]);

      setLatestMeasurements(latest);
      const comparisonData = compareMeasurements(first, latest);
      setComparisons(comparisonData);

      if (first && latest && first.measured_at !== latest.measured_at) {
        const months = differenceInMonths(
          parseISO(latest.measured_at),
          parseISO(first.measured_at)
        );
        const days = differenceInDays(
          parseISO(latest.measured_at),
          parseISO(first.measured_at)
        );

        if (months > 0) {
          setTimeSpan(`Over ${months} month${months > 1 ? 's' : ''}`);
        } else {
          setTimeSpan(`Over ${days} day${days > 1 ? 's' : ''}`);
        }
      }

      const timeline = await getMeasurementTimeline(user.id, selectedMeasurement);
      setChartData(timeline);

      // Fetch data for multi-chart comparison
      const multiData = new Map<keyof MeasurementData, MeasurementTimelinePoint[]>();
      for (const key of selectedMultiple) {
        const data = await getMeasurementTimeline(user.id, key);
        multiData.set(key, data);
      }
      setMultiChartData(multiData);
    } catch (error) {
 logger.error('Error fetching measurement history:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id, selectedMeasurement, selectedMultiple]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    try {
      await deleteMeasurementById(id);
      fetchData();
    } catch (error) {
 logger.error('Error deleting measurement:', error);
      Alert.alert('Error', 'Failed to delete measurement');
    }
  };

  const prepareChartData = () => {
    const filteredData = filterByTimeRange(chartData);

    if (filteredData.length === 0) {
      return { labels: [], datasets: [{ data: [0] }] };
    }

    const maxLabels = 6;
    const step = Math.max(1, Math.floor(filteredData.length / maxLabels));
    const labels = filteredData
      .filter((_, i) => i % step === 0 || i === filteredData.length - 1)
      .map(d => format(parseISO(d.date), 'M/d'));

    const color = getMeasurementColor(selectedMeasurement);

    return {
      labels,
      datasets: [
        {
          data: filteredData.map(d => d.value),
          color: (opacity = 1) => color,
          strokeWidth: 2,
        },
      ],
    };
  };

  const handleAddMeasurements = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/body/measurements');
  };

  const handleEditEntry = (entry: MeasurementEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/body/measurements?date=${entry.measured_at}`);
  };

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
  const filteredChartData = filterByTimeRange(chartData);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Measurement History</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Tab Selector */}
      <TabSelector selected={activeTab} onSelect={setActiveTab} />

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
        {history.length > 0 ? (
          <>
            {/* SUMMARY TAB */}
            {activeTab === 'summary' && (
              <>
                <ComparisonCard
                  comparisons={comparisons}
                  timeSpan={timeSpan}
                  unit={unit}
                />

                <RatiosCard measurements={latestMeasurements} gender={gender} />

                <BodyCompositionCard
                  weight={latestMeasurements?.weight ?? null}
                  bodyFatPercent={latestMeasurements?.body_fat_percentage ?? null}
                  gender={gender}
                />
              </>
            )}

            {/* CHARTS TAB */}
            {activeTab === 'charts' && (
              <>
                {/* Single Measurement Chart */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>SINGLE MEASUREMENT</Text>
                </View>

                <MeasurementSelector
                  selected={selectedMeasurement}
                  onSelect={setSelectedMeasurement}
                />

                <TimeRangeSelector selected={timeRange} onSelect={setTimeRange} />

                {filteredChartData.length >= 2 ? (
                  <View style={styles.chartContainer}>
                    <LineChart
                      data={chartDataPrepared}
                      width={screenWidth - 32}
                      height={200}
                      chartConfig={{
                        backgroundColor: '#1e293b',
                        backgroundGradientFrom: '#1e293b',
                        backgroundGradientTo: '#1e293b',
                        decimalPlaces: 1,
                        color: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                        style: { borderRadius: 12 },
                        propsForDots: {
                          r: '4',
                          strokeWidth: '2',
                          stroke: getMeasurementColor(selectedMeasurement),
                        },
                        propsForBackgroundLines: {
                          strokeDasharray: '',
                          stroke: '#334155',
                          strokeWidth: 1,
                        },
                      }}
                      bezier={true}
                      style={styles.chart}
                      withInnerLines={true}
                      withOuterLines={false}
                      withVerticalLines={false}
                      withHorizontalLines={true}
                      fromZero={false}
                    />
                  </View>
                ) : (
                  <View style={styles.noChartData}>
                    <Text style={styles.noChartText}>
                      Need at least 2 entries for {CHARTABLE_FIELDS.find(f => f.key === selectedMeasurement)?.label || 'this measurement'} to show chart
                    </Text>
                  </View>
                )}

                {/* Multi-Measurement Comparison */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>COMPARE MEASUREMENTS</Text>
                  <TouchableOpacity
                    style={styles.compareToggle}
                    onPress={() => setShowComparison(!showComparison)}
                  >
                    <Text style={styles.compareToggleText}>
                      {showComparison ? 'Hide' : 'Show'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showComparison && (
                  <>
                    <MeasurementSelector
                      selected={selectedMeasurement}
                      onSelect={() => {}}
                      showMultiSelect
                      selectedMultiple={selectedMultiple}
                      onMultiSelect={async (keys) => {
                        setSelectedMultiple(keys);
                        // Fetch data for new selections
                        const multiData = new Map<keyof MeasurementData, MeasurementTimelinePoint[]>();
                        for (const key of keys) {
                          if (user?.id) {
                            const data = await getMeasurementTimeline(user.id, key);
                            multiData.set(key, data);
                          }
                        }
                        setMultiChartData(multiData);
                      }}
                    />

                    {selectedMultiple.length > 0 && (
                      <MultiMeasurementChart
                        timelines={multiChartData}
                        selectedKeys={selectedMultiple}
                        timeRange={timeRange}
                      />
                    )}
                  </>
                )}

                {/* Body Composition in Charts */}
                {latestMeasurements?.body_fat_percentage && (
                  <BodyCompositionCard
                    weight={latestMeasurements?.weight ?? null}
                    bodyFatPercent={latestMeasurements?.body_fat_percentage ?? null}
                    gender={gender}
                  />
                )}
              </>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
              <>
                <MeasurementSelector
                  selected={selectedMeasurement}
                  onSelect={setSelectedMeasurement}
                />

                <View style={styles.historySection}>
                  <Text style={styles.historySectionTitle}>ALL ENTRIES</Text>
                  <View style={styles.historyList}>
                    {history.map((entry) => (
                      <HistoryEntryRow
                        key={entry.id}
                        entry={entry}
                        selectedMeasurement={selectedMeasurement}
                        unit={unit}
                        onPress={() => handleEditEntry(entry)}
                        onDelete={() => handleDelete(entry.id)}
                      />
                    ))}
                  </View>
                </View>
              </>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Measurements Yet</Text>
            <Text style={styles.emptySubtitle}>
              Start tracking your body measurements to see your progress over time
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddMeasurements}>
              <Plus size={20} color="#ffffff" />
              <Text style={styles.emptyButtonText}>Add Measurements</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* FAB */}
      {history.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleAddMeasurements}>
          <Plus size={24} color="#ffffff" />
        </TouchableOpacity>
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

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 4,
  },

  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },

  tabButtonActive: {
    backgroundColor: '#3b82f6',
  },

  tabText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748b',
  },

  tabTextActive: {
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
    height: 100,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 1,
  },

  compareToggle: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  compareToggleText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: 'bold',
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  timeSpan: {
    fontSize: 12,
    color: '#64748b',
  },

  noDataText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 12,
  },

  comparisonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  comparisonItem: {
    width: '47%',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
  },

  comparisonLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },

  comparisonValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },

  comparisonOld: {
    fontSize: 14,
    color: '#94a3b8',
  },

  comparisonArrow: {
    fontSize: 12,
    color: '#475569',
  },

  comparisonNew: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  comparisonChange: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },

  comparisonChangeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Ratios Card
  ratiosCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  cardSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 16,
  },

  ratioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  ratioInfo: {
    flex: 1,
  },

  ratioLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },

  ratioMessage: {
    fontSize: 12,
    color: '#94a3b8',
  },

  ratioBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },

  ratioValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  ratioLegend: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },

  legendText: {
    fontSize: 12,
    color: '#64748b',
  },

  // Body Composition Card
  compositionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  pieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },

  pieChart: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#22c55e',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },

  pieSliceFat: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#ef4444',
    left: 0,
    top: 0,
    transformOrigin: '50% 100%',
  },

  pieCenter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },

  pieCenterPercent: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  pieCenterLabel: {
    fontSize: 10,
    color: '#64748b',
  },

  compositionLegend: {
    flex: 1,
    marginLeft: 20,
    gap: 12,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  legendLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },

  legendValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  categoryBadge: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },

  categoryText: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Selector
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },

  selectorLabel: {
    fontSize: 14,
    color: '#64748b',
  },

  selectorValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },

  // Picker Modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 24,
  },

  pickerContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    maxHeight: '70%',
    overflow: 'hidden',
  },

  pickerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  pickerOptionSelected: {
    backgroundColor: '#334155',
  },

  pickerOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#e2e8f0',
  },

  pickerOptionTextSelected: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },

  pickerDoneButton: {
    backgroundColor: '#3b82f6',
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  pickerDoneText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Time Range
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

  chart: {
    borderRadius: 12,
    marginLeft: -16,
  },

  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 12,
  },

  chartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  chartLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  chartLegendText: {
    fontSize: 12,
    color: '#94a3b8',
  },

  noChartData: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },

  noChartText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },

  // History List
  historySection: {
    marginBottom: 16,
  },

  historySectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 12,
  },

  historyList: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
  },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  historyDate: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  historyDateText: {
    fontSize: 14,
    color: '#e2e8f0',
  },

  historyValue: {
    marginRight: 12,
  },

  historyValueText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  historyNoValue: {
    fontSize: 16,
    color: '#475569',
  },

  deleteButton: {
    padding: 8,
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
    marginBottom: 8,
  },

  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },

  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },

  emptyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});