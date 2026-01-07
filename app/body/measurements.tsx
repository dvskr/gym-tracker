import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import { supabase } from '@/lib/supabase';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Activity,
  List,
  Edit3,
  X,
  Save,
  Clock,
  Trash2,
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { format, addDays, subDays, isToday, parseISO, differenceInDays, differenceInMonths, subMonths, subYears } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/stores/authStore';
import { MeasurementInput } from '@/components/body/MeasurementInput';
import {
  saveMeasurements,
  getMeasurements,
  getLatestMeasurements,
  getMeasurementHistory,
  getMeasurementTimeline,
  getFirstMeasurements,
  getPreviousMeasurements,
  compareMeasurements,
  deleteMeasurementById,
  updateMeasurementById,
  MeasurementData,
  MeasurementEntry,
  MeasurementComparison,
  MeasurementTimelinePoint,
  CHARTABLE_FIELDS,
  MEASUREMENT_FIELDS,
} from '@/lib/api/measurements';
import { getTodayWeight } from '@/lib/api/bodyWeight';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { AuthPromptModal } from '@/components/modals/AuthPromptModal';
import { useUnits } from '@/hooks/useUnits';
import { getCurrentTab } from '@/lib/navigation/navigationState';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';
import {
  calculateAllRatios,
  calculateBodyComposition,
  getBodyFatCategory,
  getMeasurementColor,
  Gender,
} from '@/lib/utils/bodyRatios';

// ============================================
// Types & Constants
// ============================================

type Tab = 'log' | 'summary' | 'charts' | 'history';
type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'All';
type MeasurementUnit = 'in' | 'cm';

const timeRanges: TimeRange[] = ['1M', '3M', '6M', '1Y', 'All'];
const screenWidth = Dimensions.get('window').width;
const EDITABLE_ENTRIES_COUNT = 7;

interface FormData {
  weight: string;
  body_fat_percentage: string;
  chest: string;
  shoulders: string;
  neck: string;
  bicep_left: string;
  bicep_right: string;
  forearm_left: string;
  forearm_right: string;
  waist: string;
  hips: string;
  thigh_left: string;
  thigh_right: string;
  calf_left: string;
  calf_right: string;
  notes: string;
}

const emptyFormData: FormData = {
  weight: '',
  body_fat_percentage: '',
  chest: '',
  shoulders: '',
  neck: '',
  bicep_left: '',
  bicep_right: '',
  forearm_left: '',
  forearm_right: '',
  waist: '',
  hips: '',
  thigh_left: '',
  thigh_right: '',
  calf_left: '',
  calf_right: '',
  notes: '',
};

const MEASUREMENT_SECTIONS = [
  { title: 'General', emoji: '⚖️', fields: ['weight', 'body_fat_percentage'] as (keyof MeasurementData)[] },
  { title: 'Upper Body', emoji: '💪', fields: ['chest', 'shoulders', 'neck', 'bicep_left', 'bicep_right', 'forearm_left', 'forearm_right'] as (keyof MeasurementData)[] },
  { title: 'Core', emoji: '🎯', fields: ['waist', 'hips'] as (keyof MeasurementData)[] },
  { title: 'Lower Body', emoji: '🦵', fields: ['thigh_left', 'thigh_right', 'calf_left', 'calf_right'] as (keyof MeasurementData)[] },
];

// ============================================
// Main Tab Selector
// ============================================

interface MainTabSelectorProps {
  selected: Tab;
  onSelect: (tab: Tab) => void;
}

const MainTabSelector: React.FC<MainTabSelectorProps> = ({ selected, onSelect }) => {
  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: 'log', label: 'Log', emoji: '✏️' },
    { key: 'summary', label: 'Summary', emoji: '📊' },
    { key: 'charts', label: 'Charts', emoji: '📈' },
    { key: 'history', label: 'History', emoji: '📋' },
  ];

  return (
    <View style={styles.mainTabContainer}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.mainTabButton, selected === tab.key && styles.mainTabButtonActive]}
          onPress={() => {
            Haptics.selectionAsync();
            onSelect(tab.key);
          }}
        >
          <Text style={styles.mainTabEmoji}>{tab.emoji}</Text>
          <Text style={[styles.mainTabText, selected === tab.key && styles.mainTabTextActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ============================================
// Measurement Filter Panel
// ============================================

interface MeasurementFilterProps {
  selected: (keyof MeasurementData)[];
  onToggle: (key: keyof MeasurementData) => void;
}

const MeasurementFilter: React.FC<MeasurementFilterProps> = ({ selected, onToggle }) => {
  const allSelected = selected.length === CHARTABLE_FIELDS.length;
  
  return (
    <View style={styles.filterPanel}>
      <View style={styles.filterHeader}>
        <BarChart3 size={16} color="#94a3b8" />
        <Text style={styles.filterTitle}>Measurements</Text>
        <Text style={styles.filterSubtitle}>({selected.length} selected)</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
        <View style={styles.filterChips}>
          {/* All chip */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              allSelected && styles.filterChipActive,
              allSelected && { borderColor: '#3b82f6' }
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              // If all selected, keep all selected. If not all, select all.
              if (!allSelected) {
                CHARTABLE_FIELDS.forEach(field => {
                  if (!selected.includes(field.key)) {
                    onToggle(field.key);
                  }
                });
              }
            }}
          >
            <Text style={[styles.filterChipText, allSelected && { color: '#3b82f6' }]}>All</Text>
            {allSelected && <Check size={14} color="#3b82f6" style={styles.filterCheckIcon} />}
          </TouchableOpacity>
          
          {/* Individual measurement chips */}
          {CHARTABLE_FIELDS.map((field) => {
            const isSelected = selected.includes(field.key);
            const color = getMeasurementColor(field.key);
            return (
              <TouchableOpacity
                key={field.key}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipActive,
                  isSelected && { borderColor: color }
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  onToggle(field.key);
                }}
              >
                <View style={[styles.measurementChipDot, { backgroundColor: color }]} />
                <Text style={[styles.filterChipText, isSelected && { color }]}>{field.label}</Text>
                {isSelected && <Check size={14} color={color} style={styles.filterCheckIcon} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

// ============================================
// Time Range Filter Panel
// ============================================

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ selected, onSelect }) => (
  <View style={styles.filterPanel}>
    <View style={styles.filterHeader}>
      <Activity size={16} color="#94a3b8" />
      <Text style={styles.filterTitle}>Time Range</Text>
    </View>
    <View style={styles.filterChips}>
      {timeRanges.map((range) => (
        <TouchableOpacity
          key={range}
          style={[styles.filterChip, selected === range && styles.filterChipActive]}
          onPress={() => {
            Haptics.selectionAsync();
            onSelect(range);
          }}
        >
          <Text style={[styles.filterChipText, selected === range && styles.filterChipTextActive]}>
            {range}
          </Text>
          {selected === range && <Check size={14} color="#3b82f6" style={styles.filterCheckIcon} />}
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

// ============================================
// Comparison Card
// ============================================

interface ComparisonCardProps {
  comparisons: MeasurementComparison[];
  timeSpan: string;
  unit: string;
  weightUnit: string;
}

const ComparisonCard: React.FC<ComparisonCardProps> = ({ comparisons, timeSpan, unit, weightUnit }) => {
  const validComparisons = comparisons.filter(
    c => c.firstValue !== null && c.latestValue !== null && c.change !== null
  );

  if (validComparisons.length === 0) {
    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📊 Progress Summary</Text>
        <Text style={styles.noDataText}>Not enough data to compare yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>📊 Progress Summary</Text>
        <Text style={styles.timeSpan}>{timeSpan}</Text>
      </View>

      <View style={styles.comparisonGrid}>
        {validComparisons.map((comp) => {
          const isPositive = (comp.change || 0) > 0;
          const isGood = comp.isLossGood ? !isPositive : isPositive;
          const color = comp.change === 0 ? '#64748b' : isGood ? '#22c55e' : '#ef4444';
          
          // Determine the correct unit for this measurement
          let displayUnit = unit;
          if (comp.key === 'body_fat_percentage') {
            displayUnit = '%';
          } else if (comp.key === 'weight') {
            displayUnit = weightUnit;
          }

          return (
            <View key={comp.key} style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>{comp.label}</Text>
              <View style={styles.comparisonValues}>
                <Text style={styles.comparisonOld}>{comp.firstValue}</Text>
                <Text style={styles.comparisonArrow}>→</Text>
                <Text style={styles.comparisonNew}>{comp.latestValue}</Text>
              </View>
              <View style={[styles.comparisonChange, { backgroundColor: color + '20' }]}>
                {comp.change === 0 ? <Minus size={12} color={color} /> : isPositive ? <TrendingUp size={12} color={color} /> : <TrendingDown size={12} color={color} />}
                <Text style={[styles.comparisonChangeText, { color }]}>
                  {comp.change !== null && comp.change > 0 ? '+' : ''}{comp.change}
                  {displayUnit}
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
// Body Ratios Card
// ============================================

interface RatiosCardProps {
  measurements: MeasurementEntry | null;
  gender: Gender;
}

const RatiosCard: React.FC<RatiosCardProps> = ({ measurements, gender }) => {
  if (!measurements) return null;

  const ratios = calculateAllRatios(
    { waist: measurements.waist ?? undefined, hips: measurements.hips ?? undefined, chest: measurements.chest ?? undefined, shoulders: measurements.shoulders ?? undefined },
    gender
  );

  const validRatios = Object.entries(ratios).filter(([_, r]) => r !== null);
  if (validRatios.length === 0) return null;

  return (
    <View style={styles.ratiosCard}>
      <Text style={styles.ratiosTitle}>📐 Body Ratios</Text>
      <View style={styles.ratiosGrid}>
        {validRatios.map(([key, ratio]) => {
          if (!ratio || ratio.value === null || ratio.value === undefined) return null;
          return (
            <View key={key} style={styles.ratioItem}>
              <Text style={styles.ratioValue}>{ratio.value.toFixed(2)}</Text>
              <Text style={styles.ratioLabel}>{ratio.label}</Text>
              <View style={[styles.ratioBadge, { backgroundColor: ratio.color + '30' }]}>
                <Text style={[styles.ratioBadgeText, { color: ratio.color }]}>{ratio.status}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ============================================
// Body Composition Card
// ============================================

interface BodyCompositionCardProps {
  weight: number | null;
  bodyFatPercent: number | null;
  gender: Gender;
}

const BodyCompositionCard: React.FC<BodyCompositionCardProps> = ({ weight, bodyFatPercent, gender }) => {
  if (!weight || !bodyFatPercent) return null;

  const composition = calculateBodyComposition(weight, bodyFatPercent);
  const category = getBodyFatCategory(bodyFatPercent, gender);

  return (
    <View style={styles.compositionCard}>
      <Text style={styles.compositionTitle}>🏋️ Body Composition</Text>
      <View style={styles.compositionRow}>
        <View style={styles.compositionItem}>
          <Text style={styles.compositionValue}>{composition.leanMass.toFixed(1)}</Text>
          <Text style={styles.compositionLabel}>Lean Mass (lbs)</Text>
        </View>
        <View style={styles.compositionDivider} />
        <View style={styles.compositionItem}>
          <Text style={styles.compositionValue}>{composition.fatMass.toFixed(1)}</Text>
          <Text style={styles.compositionLabel}>Fat Mass (lbs)</Text>
        </View>
      </View>
      <View style={[styles.categoryBadge, { backgroundColor: category.color + '20' }]}>
        <Text style={[styles.categoryText, { color: category.color }]}>{category.label}</Text>
      </View>
    </View>
  );
};

// ============================================
// Chart Selector
// ============================================

interface ChartSelectorProps {
  selected: keyof MeasurementData;
  onSelect: (key: keyof MeasurementData) => void;
}

const ChartSelector: React.FC<ChartSelectorProps> = ({ selected, onSelect }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartSelectorContainer}>
    {CHARTABLE_FIELDS.map((field) => {
      const isSelected = selected === field.key;
      const color = getMeasurementColor(field.key);
      return (
        <TouchableOpacity
          key={field.key}
          style={[styles.chartSelectorChip, isSelected && { backgroundColor: color + '30', borderColor: color }]}
          onPress={() => { Haptics.selectionAsync(); onSelect(field.key); }}
        >
          <Text style={[styles.chartSelectorText, isSelected && { color }]}>{field.label}</Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

// ============================================
// History Entry Card
// ============================================

interface HistoryEntryCardProps {
  entry: MeasurementEntry;
  index: number;
  isEditable: boolean;
  unit: string;
  onUpdate: (id: string, data: Partial<MeasurementData>) => Promise<void>;
  onDelete: (id: string) => void;
}

const HistoryEntryCard: React.FC<HistoryEntryCardProps> = ({ entry, index, isEditable, unit, onUpdate, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(index === 0);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<MeasurementData>>({});
  const [isSaving, setIsSaving] = useState(false);

  const date = parseISO(entry.measured_at);
  const dateText = format(date, 'EEE, MMM d, yyyy');
  const isRecent = index === 0;

  const getMeasurementCount = () => {
    let count = 0;
    MEASUREMENT_FIELDS.forEach(field => {
      if (entry[field.key] !== null && entry[field.key] !== undefined) count++;
    });
    return count;
  };

  const handleSave = async () => {
    if (Object.keys(editData).length === 0) { setIsEditing(false); return; }
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await onUpdate(entry.id, editData);
      setIsEditing(false);
      setEditData({});
    } catch (error: unknown) {
      logger.error('Failed to update measurement:', error);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (fieldKey: keyof MeasurementData) => {
    const field = MEASUREMENT_FIELDS.find(f => f.key === fieldKey);
    if (!field) return null;
    const value = entry[field.key];
    const editValue = editData[field.key];
    const displayValue = editValue !== undefined ? editValue : value;
    const isWeight = field.key === 'weight';
    const isBodyFat = field.key === 'body_fat_percentage';
    const fieldUnit = isBodyFat ? '%' : isWeight ? 'lbs' : unit;
    if (!isEditing && (value === null || value === undefined)) return null;

    return (
      <View key={field.key} style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        {isEditing ? (
          <View style={styles.fieldInputContainer}>
            <TextInput
              style={styles.fieldInput}
              value={displayValue?.toString() ?? ''}
              onChangeText={(text) => { const num = parseFloat(text); setEditData(prev => ({ ...prev, [field.key]: isNaN(num) ? undefined : num })); }}
              keyboardType="decimal-pad"
              placeholder={value?.toString() ?? '-'}
              placeholderTextColor="#475569"
            />
            <Text style={styles.fieldUnit}>{fieldUnit}</Text>
          </View>
        ) : (
          <Text style={styles.fieldValue}>{value}{fieldUnit}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.historyCard, isRecent && styles.historyCardRecent, isEditing && styles.historyCardEditing]}>
      <TouchableOpacity style={styles.historyCardHeader} onPress={() => { if (!isEditing) { Haptics.selectionAsync(); setIsExpanded(!isExpanded); } }} activeOpacity={0.7}>
        <View style={styles.historyCardDate}>
          <Calendar size={16} color={isRecent ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.historyCardDateText, isRecent && styles.historyCardDateTextRecent]}>{dateText}</Text>
          {isRecent && <View style={styles.recentBadge}><Text style={styles.recentBadgeText}>Latest</Text></View>}
        </View>
        <View style={styles.historyCardActions}>
          <Text style={styles.measurementCount}>{getMeasurementCount()} logged</Text>
          {isExpanded ? <ChevronUp size={20} color="#64748b" /> : <ChevronDown size={20} color="#64748b" />}
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.historyCardContent}>
          {isEditable && (
            <View style={styles.editActions}>
              {isEditing ? (
                <>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => { Haptics.selectionAsync(); setEditData({}); setIsEditing(false); }} disabled={isSaving}>
                    <X size={16} color="#94a3b8" /><Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveEditButton} onPress={handleSave} disabled={isSaving}>
                    {isSaving ? <ActivityIndicator size="small" color="#ffffff" /> : <><Save size={16} color="#ffffff" /><Text style={styles.saveEditButtonText}>Save</Text></>}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.editButton} onPress={() => { Haptics.selectionAsync(); setEditData({}); setIsEditing(true); setIsExpanded(true); }}>
                    <Edit3 size={16} color="#3b82f6" /><Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteEntryButton} onPress={() => Alert.alert('Delete Entry', `Delete all measurements from ${dateText}?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onDelete(entry.id); } }])}>
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {!isEditable && (
            <View style={styles.readOnlyBadge}>
              <Clock size={12} color="#64748b" />
              <Text style={styles.readOnlyText}>View only (older than 7 entries)</Text>
            </View>
          )}

          {MEASUREMENT_SECTIONS.map((section) => {
            const hasData = section.fields.some(field => entry[field] !== null && entry[field] !== undefined);
            if (!hasData && !isEditing) return null;
            return (
              <View key={section.title} style={styles.sectionContainer}>
                <Text style={styles.historySectionTitle}>{section.emoji} {section.title}</Text>
                <View style={styles.fieldsGrid}>
                  {section.fields.map(fieldKey => renderField(fieldKey))}
                </View>
              </View>
            );
          })}

          {entry.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesText}>{entry.notes}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// ============================================
// Section Header Component
// ============================================

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

// ============================================
// Main Screen Component
// ============================================

export default function MeasurementsScreen() {
  useBackNavigation();

  const { user } = useAuthStore();
  const { measurementUnit, weightUnit } = useUnits();
  const { requireAuth, showAuthModal, authMessage, closeAuthModal } = useAuthGuard();

  // Main tab state
  const [activeTab, setActiveTab] = useState<Tab>('log');

  // Log tab state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [previousData, setPreviousData] = useState<MeasurementEntry | null>(null);
  const [unit, setUnit] = useState<MeasurementUnit>(measurementUnit);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExistingEntry, setHasExistingEntry] = useState(false);

  // Analytics state
  const [history, setHistory] = useState<MeasurementEntry[]>([]);
  const [comparisons, setComparisons] = useState<MeasurementComparison[]>([]);
  const [timeSpan, setTimeSpan] = useState('');
  const [allChartsData, setAllChartsData] = useState<Record<keyof MeasurementData, MeasurementTimelinePoint[]>>({} as Record<keyof MeasurementData, MeasurementTimelinePoint[]>);
  const [chartData, setChartData] = useState<MeasurementTimelinePoint[]>([]);
  const [selectedMeasurements, setSelectedMeasurements] = useState<(keyof MeasurementData)[]>(
    CHARTABLE_FIELDS.map(f => f.key) // Select ALL measurements by default
  );
  const [selectedMeasurement, setSelectedMeasurement] = useState<keyof MeasurementData>('waist');
  const [timeRange, setTimeRange] = useState<TimeRange>('All');
  const [latestMeasurements, setLatestMeasurements] = useState<MeasurementEntry | null>(null);
  const [gender, setGender] = useState<Gender>('male');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => { setUnit(measurementUnit); }, [measurementUnit]);

  const dateString = format(selectedDate, 'yyyy-MM-dd');
  const displayDate = isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEE, MMM d');

  // Filter chart data by time range
  const filterByTimeRange = useCallback((data: MeasurementTimelinePoint[]): MeasurementTimelinePoint[] => {
    if (timeRange === 'All' || data.length === 0) return data;
    const now = new Date();
    let cutoffDate: Date;
    switch (timeRange) {
      case '1M': cutoffDate = subMonths(now, 1); break;
      case '3M': cutoffDate = subMonths(now, 3); break;
      case '6M': cutoffDate = subMonths(now, 6); break;
      case '1Y': cutoffDate = subYears(now, 1); break;
      default: return data;
    }
    return data.filter(d => new Date(d.date) >= cutoffDate);
  }, [timeRange]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      // Fetch gender
      const { data: profile } = await supabase.from('profiles').select('gender').eq('id', user.id).single();
      if (profile?.gender && (profile.gender === 'male' || profile.gender === 'female')) setGender(profile.gender);

      // Fetch form data for selected date
      const measurements = await getMeasurements(user.id, dateString);
      
      // Get the previous measurement (chronologically before selected date)
      const previous = await getPreviousMeasurements(user.id, dateString);
      setPreviousData(previous);

      if (measurements) {
        setFormData({
          weight: measurements.weight?.toString() || '', body_fat_percentage: measurements.body_fat_percentage?.toString() || '',
          chest: measurements.chest?.toString() || '', shoulders: measurements.shoulders?.toString() || '',
          neck: measurements.neck?.toString() || '', bicep_left: measurements.bicep_left?.toString() || '',
          bicep_right: measurements.bicep_right?.toString() || '', forearm_left: measurements.forearm_left?.toString() || '',
          forearm_right: measurements.forearm_right?.toString() || '', waist: measurements.waist?.toString() || '',
          hips: measurements.hips?.toString() || '', thigh_left: measurements.thigh_left?.toString() || '',
          thigh_right: measurements.thigh_right?.toString() || '', calf_left: measurements.calf_left?.toString() || '',
          calf_right: measurements.calf_right?.toString() || '', notes: measurements.notes || '',
        });
        setUnit(measurements.unit as MeasurementUnit || 'in');
        setHasExistingEntry(true);
      } else {
        setFormData(emptyFormData);
        setHasExistingEntry(false);
        if (isToday(selectedDate)) {
          const todayWeight = await getTodayWeight(user.id);
          if (todayWeight) setFormData(prev => ({ ...prev, weight: todayWeight.weight.toString() }));
        }
      }

      // Fetch history data
      const historyData = await getMeasurementHistory(user.id);
      setHistory(historyData);

      if (historyData.length > 0 && historyData[0].unit) setUnit(historyData[0].unit as 'in' | 'cm');

      // Get latest measurements for summary tab
      const latest = await getLatestMeasurements(user.id);
      setLatestMeasurements(latest);
      const first = await getFirstMeasurements(user.id);

      const comparisonData = compareMeasurements(first, latest);
      setComparisons(comparisonData);

      if (first && latest && first.measured_at !== latest.measured_at) {
        const months = differenceInMonths(parseISO(latest.measured_at), parseISO(first.measured_at));
        const days = differenceInDays(parseISO(latest.measured_at), parseISO(first.measured_at));
        setTimeSpan(months > 0 ? `Over ${months} month${months > 1 ? 's' : ''}` : `Over ${days} day${days > 1 ? 's' : ''}`);
      }

      // Fetch timeline data for all chartable fields
      const chartsDataMap: Record<keyof MeasurementData, MeasurementTimelinePoint[]> = {} as Record<keyof MeasurementData, MeasurementTimelinePoint[]>;
      
      await Promise.all(
        CHARTABLE_FIELDS.map(async (field) => {
          try {
            const timeline = await getMeasurementTimeline(user.id, field.key);
            chartsDataMap[field.key] = timeline;
          } catch (error) {
            chartsDataMap[field.key] = [];
          }
        })
      );
      
      setAllChartsData(chartsDataMap);
      
      const timeline = await getMeasurementTimeline(user.id, selectedMeasurement);
      setChartData(timeline);
    } catch (error: unknown) {
      logger.error('Error fetching measurements:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id, dateString, selectedDate, selectedMeasurement]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch chart data when measurement changes
  useEffect(() => {
    const fetchChartData = async () => {
      if (!user?.id) return;
      try {
        const timeline = await getMeasurementTimeline(user.id, selectedMeasurement);
        setChartData(timeline);
      } catch (error: unknown) {
        logger.error('Error fetching chart data:', error);
      }
    };
    fetchChartData();
  }, [user?.id, selectedMeasurement]);

  const handleRefresh = useCallback(() => { setIsRefreshing(true); fetchData(); }, [fetchData]);

  const toggleMeasurementSelection = (key: keyof MeasurementData) => {
    setSelectedMeasurements(prev => {
      if (prev.includes(key)) {
        // Deselect - but keep at least one selected
        if (prev.length > 1) {
          return prev.filter(k => k !== key);
        }
        return prev;
      } else {
        // Select
        return [...prev, key];
      }
    });
  };

  const updateField = (field: keyof FormData, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  const goToPreviousDay = () => { Haptics.selectionAsync(); setSelectedDate(prev => subDays(prev, 1)); };
  const goToNextDay = () => { Haptics.selectionAsync(); const nextDay = addDays(selectedDate, 1); if (nextDay <= new Date()) setSelectedDate(nextDay); };
  const goToToday = () => { Haptics.selectionAsync(); setSelectedDate(new Date()); };

  const handleSave = async () => {
    if (!user?.id) { requireAuth(() => {}, 'Sign in to save your body measurements.'); return; }
    const hasData = Object.entries(formData).some(([key, value]) => key !== 'notes' && value !== '');
    if (!hasData) { Alert.alert('No Data', 'Please enter at least one measurement'); return; }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const data: MeasurementData = {
        weight: formData.weight ? parseFloat(formData.weight) : undefined, body_fat_percentage: formData.body_fat_percentage ? parseFloat(formData.body_fat_percentage) : undefined,
        chest: formData.chest ? parseFloat(formData.chest) : undefined, shoulders: formData.shoulders ? parseFloat(formData.shoulders) : undefined,
        neck: formData.neck ? parseFloat(formData.neck) : undefined, bicep_left: formData.bicep_left ? parseFloat(formData.bicep_left) : undefined,
        bicep_right: formData.bicep_right ? parseFloat(formData.bicep_right) : undefined, forearm_left: formData.forearm_left ? parseFloat(formData.forearm_left) : undefined,
        forearm_right: formData.forearm_right ? parseFloat(formData.forearm_right) : undefined, waist: formData.waist ? parseFloat(formData.waist) : undefined,
        hips: formData.hips ? parseFloat(formData.hips) : undefined, thigh_left: formData.thigh_left ? parseFloat(formData.thigh_left) : undefined,
        thigh_right: formData.thigh_right ? parseFloat(formData.thigh_right) : undefined, calf_left: formData.calf_left ? parseFloat(formData.calf_left) : undefined,
        calf_right: formData.calf_right ? parseFloat(formData.calf_right) : undefined, notes: formData.notes || undefined, unit,
      };
      await saveMeasurements(user.id, dateString, data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved!', 'Measurements saved successfully');
      fetchData();
    } catch (error: unknown) {
      logger.error('Error saving measurements:', error);
      Alert.alert('Error', 'Failed to save measurements');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try { await deleteMeasurementById(id); fetchData(); } catch (error: unknown) { logger.error('Error deleting measurement:', error); Alert.alert('Error', 'Failed to delete measurement'); }
  };

  const handleUpdate = async (id: string, data: Partial<MeasurementData>) => { await updateMeasurementById(id, data); await fetchData(); };

  const getPreviousValue = (field: keyof FormData): number | null => {
    if (!previousData) return null;
    const value = previousData[field as keyof MeasurementEntry];
    return typeof value === 'number' ? value : null;
  };

  const toggleUnit = () => { Haptics.selectionAsync(); setUnit(prev => prev === 'in' ? 'cm' : 'in'); };

  const prepareChartData = () => {
    const filteredData = filterByTimeRange(chartData);
    if (filteredData.length === 0) return { labels: [], datasets: [{ data: [0] }] };
    const maxLabels = 6;
    const step = Math.max(1, Math.floor(filteredData.length / maxLabels));
    const labels = filteredData.filter((_, i) => i % step === 0 || i === filteredData.length - 1).map(d => format(parseISO(d.date), 'M/d'));
    const color = getMeasurementColor(selectedMeasurement);
    return { labels, datasets: [{ data: filteredData.map(d => d.value), color: (opacity = 1) => color, strokeWidth: 3 }] };
  };

  const prepareChartDataForField = (data: MeasurementTimelinePoint[], fieldKey: keyof MeasurementData) => {
    if (data.length === 0) return { labels: [], datasets: [{ data: [0] }] };
    const maxLabels = 6;
    const step = Math.max(1, Math.floor(data.length / maxLabels));
    const labels = data.filter((_, i) => i % step === 0 || i === data.length - 1).map(d => format(parseISO(d.date), 'M/d'));
    const color = getMeasurementColor(fieldKey);
    return { labels, datasets: [{ data: data.map(d => d.value), color: (opacity = 1) => color, strokeWidth: 3 }] };
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#3b82f6" /></View>
      </SafeAreaView>
    );
  }

  const chartDataPrepared = prepareChartData();
  const filteredChartData = filterByTimeRange(chartData);
  const selectedField = CHARTABLE_FIELDS.find(f => f.key === selectedMeasurement);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Measurements</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Main Tab Selector */}
      <MainTabSelector selected={activeTab} onSelect={setActiveTab} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#3b82f6" colors={['#3b82f6']} />}
        >
          {/* LOG TAB */}
          {activeTab === 'log' && (
            <>
              {/* Date Selector */}
              <View style={styles.dateSelector}>
                <TouchableOpacity style={styles.dateArrow} onPress={goToPreviousDay}><ChevronLeft size={24} color="#94a3b8" /></TouchableOpacity>
                <TouchableOpacity style={styles.dateDisplay} onPress={goToToday}>
                  <Calendar size={18} color="#3b82f6" />
                  <Text style={styles.dateText}>{displayDate}</Text>
                  {hasExistingEntry && <View style={styles.existingBadge}><Check size={12} color="#22c55e" /></View>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateArrow} onPress={goToNextDay} disabled={isToday(selectedDate)}><ChevronRight size={24} color={isToday(selectedDate) ? '#334155' : '#94a3b8'} /></TouchableOpacity>
              </View>

              {/* Unit Toggle */}
              <View style={styles.unitToggleContainer}>
                <Text style={styles.unitLabel}>Unit:</Text>
                <TouchableOpacity style={styles.unitToggle} onPress={toggleUnit}>
                  <View style={[styles.unitOption, unit === 'in' && styles.unitOptionActive]}><Text style={[styles.unitOptionText, unit === 'in' && styles.unitOptionTextActive]}>in</Text></View>
                  <View style={[styles.unitOption, unit === 'cm' && styles.unitOptionActive]}><Text style={[styles.unitOptionText, unit === 'cm' && styles.unitOptionTextActive]}>cm</Text></View>
                </TouchableOpacity>
              </View>

              {/* Form Sections */}
              <SectionHeader title="GENERAL" />
              <View style={styles.row}>
                <View style={styles.halfWidth}><MeasurementInput label="Weight" value={formData.weight} onChangeText={(v) => updateField('weight', v)} unit={weightUnit} previousValue={getPreviousValue('weight')} /></View>
                <View style={styles.halfWidth}><MeasurementInput label="Body Fat" value={formData.body_fat_percentage} onChangeText={(v) => updateField('body_fat_percentage', v)} unit="%" previousValue={getPreviousValue('body_fat_percentage')} isPercentage /></View>
              </View>

              <SectionHeader title="UPPER BODY" />
              <View style={styles.row}>
                <View style={styles.halfWidth}><MeasurementInput label="Chest" value={formData.chest} onChangeText={(v) => updateField('chest', v)} unit={unit} previousValue={getPreviousValue('chest')} /></View>
                <View style={styles.halfWidth}><MeasurementInput label="Shoulders" value={formData.shoulders} onChangeText={(v) => updateField('shoulders', v)} unit={unit} previousValue={getPreviousValue('shoulders')} /></View>
              </View>
              <MeasurementInput label="Neck" value={formData.neck} onChangeText={(v) => updateField('neck', v)} unit={unit} previousValue={getPreviousValue('neck')} />
              <View style={styles.row}>
                <View style={styles.halfWidth}><MeasurementInput label="Bicep (L)" value={formData.bicep_left} onChangeText={(v) => updateField('bicep_left', v)} unit={unit} previousValue={getPreviousValue('bicep_left')} /></View>
                <View style={styles.halfWidth}><MeasurementInput label="Bicep (R)" value={formData.bicep_right} onChangeText={(v) => updateField('bicep_right', v)} unit={unit} previousValue={getPreviousValue('bicep_right')} /></View>
              </View>
              <View style={styles.row}>
                <View style={styles.halfWidth}><MeasurementInput label="Forearm (L)" value={formData.forearm_left} onChangeText={(v) => updateField('forearm_left', v)} unit={unit} previousValue={getPreviousValue('forearm_left')} /></View>
                <View style={styles.halfWidth}><MeasurementInput label="Forearm (R)" value={formData.forearm_right} onChangeText={(v) => updateField('forearm_right', v)} unit={unit} previousValue={getPreviousValue('forearm_right')} /></View>
              </View>

              <SectionHeader title="CORE" />
              <View style={styles.row}>
                <View style={styles.halfWidth}><MeasurementInput label="Waist" value={formData.waist} onChangeText={(v) => updateField('waist', v)} unit={unit} previousValue={getPreviousValue('waist')} /></View>
                <View style={styles.halfWidth}><MeasurementInput label="Hips" value={formData.hips} onChangeText={(v) => updateField('hips', v)} unit={unit} previousValue={getPreviousValue('hips')} /></View>
              </View>

              <SectionHeader title="LOWER BODY" />
              <View style={styles.row}>
                <View style={styles.halfWidth}><MeasurementInput label="Thigh (L)" value={formData.thigh_left} onChangeText={(v) => updateField('thigh_left', v)} unit={unit} previousValue={getPreviousValue('thigh_left')} /></View>
                <View style={styles.halfWidth}><MeasurementInput label="Thigh (R)" value={formData.thigh_right} onChangeText={(v) => updateField('thigh_right', v)} unit={unit} previousValue={getPreviousValue('thigh_right')} /></View>
              </View>
              <View style={styles.row}>
                <View style={styles.halfWidth}><MeasurementInput label="Calf (L)" value={formData.calf_left} onChangeText={(v) => updateField('calf_left', v)} unit={unit} previousValue={getPreviousValue('calf_left')} /></View>
                <View style={styles.halfWidth}><MeasurementInput label="Calf (R)" value={formData.calf_right} onChangeText={(v) => updateField('calf_right', v)} unit={unit} previousValue={getPreviousValue('calf_right')} /></View>
              </View>

              <SectionHeader title="NOTES" />
              <View style={styles.notesInputContainer}>
                <TextInput style={styles.notesInput} value={formData.notes} onChangeText={(v) => updateField('notes', v)} placeholder="Add notes (optional)" placeholderTextColor="#475569" multiline numberOfLines={3} textAlignVertical="top" />
              </View>

              {/* Save Button */}
              <TouchableOpacity style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#ffffff" /> : <><Check size={20} color="#ffffff" /><Text style={styles.saveButtonText}>{hasExistingEntry ? 'Update' : 'Save'} Measurements</Text></>}
              </TouchableOpacity>
            </>
          )}

          {/* SUMMARY TAB */}
          {activeTab === 'summary' && (
            history.length > 0 ? (
              <>
                <ComparisonCard comparisons={comparisons} timeSpan={timeSpan} unit={unit} weightUnit={weightUnit} />
                <RatiosCard measurements={latestMeasurements} gender={gender} />
                <BodyCompositionCard weight={latestMeasurements?.weight ?? null} bodyFatPercent={latestMeasurements?.body_fat_percentage ?? null} gender={gender} />
                <View style={styles.quickStats}>
                  <View style={styles.quickStatItem}><Text style={styles.quickStatValue}>{history.length}</Text><Text style={styles.quickStatLabel}>Total Entries</Text></View>
                  <View style={styles.quickStatDivider} />
                  <View style={styles.quickStatItem}><Text style={styles.quickStatValue}>{history.length > 0 ? format(parseISO(history[0].measured_at), 'MMM d') : '-'}</Text><Text style={styles.quickStatLabel}>Last Logged</Text></View>
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📏</Text>
                <Text style={styles.emptyTitle}>No Measurements Yet</Text>
                <Text style={styles.emptySubtitle}>Switch to the Log tab to start tracking</Text>
              </View>
            )
          )}

          {/* CHARTS TAB */}
          {activeTab === 'charts' && (
            <>
              {history.length > 0 ? (
                <>
                  <MeasurementFilter 
                    selected={selectedMeasurements} 
                    onToggle={toggleMeasurementSelection} 
                  />
                  <TimeRangeSelector selected={timeRange} onSelect={setTimeRange} />
                  
                  {CHARTABLE_FIELDS.filter(field => selectedMeasurements.includes(field.key)).map((field) => {
                    const fieldData = allChartsData[field.key] || [];
                    const filteredData = filterByTimeRange(fieldData);
                    
                    if (filteredData.length < 2) {
                      return (
                        <View key={field.key} style={styles.noChartData}>
                          <BarChart3 size={32} color="#334155" />
                          <Text style={styles.noChartTitle}>{field.label}</Text>
                          <Text style={styles.noChartText}>Need at least 2 entries to show chart</Text>
                        </View>
                      );
                    }

                    const chartDataForField = prepareChartDataForField(filteredData, field.key);
                    const color = getMeasurementColor(field.key);
                    const displayUnit = field.key === 'body_fat_percentage' ? '%' : field.key === 'weight' ? ` ${weightUnit}` : ` ${unit}`;

                    return (
                      <View key={field.key} style={styles.chartCard}>
                        <View style={styles.chartHeader}>
                          <View style={styles.chartTitleRow}>
                            <View style={[styles.chartColorDot, { backgroundColor: color }]} />
                            <Text style={styles.chartTitle}>{field.label}</Text>
                          </View>
                          {filteredData.length > 0 && (
                            <View style={styles.chartStats}>
                              <Text style={styles.chartStatLabel}>Current:</Text>
                              <Text style={[styles.chartStatValue, { color }]}>
                                {filteredData[filteredData.length - 1].value}{displayUnit}
                              </Text>
                            </View>
                          )}
                        </View>
                        <LineChart
                          data={chartDataForField}
                          width={screenWidth - 48}
                          height={200}
                          chartConfig={{
                            backgroundColor: '#1e293b',
                            backgroundGradientFrom: '#1e293b',
                            backgroundGradientTo: '#1e293b',
                            decimalPlaces: 1,
                            color: (opacity = 1) => color,
                            labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                            style: { borderRadius: 12 },
                            propsForDots: { r: '4', strokeWidth: '2', stroke: color },
                            propsForBackgroundLines: { strokeDasharray: '', stroke: '#334155', strokeWidth: 1 }
                          }}
                          bezier
                          style={styles.chart}
                          withInnerLines
                          withOuterLines={false}
                          withVerticalLines={false}
                          withHorizontalLines
                          fromZero={false}
                        />
                        <View style={styles.chartMinMax}>
                          <View style={styles.chartStatBadge}>
                            <TrendingDown size={12} color="#64748b" />
                            <Text style={styles.chartMinMaxText}>Min: {Math.min(...filteredData.map(d => d.value)).toFixed(1)}</Text>
                          </View>
                          <View style={styles.chartStatBadge}>
                            <TrendingUp size={12} color="#64748b" />
                            <Text style={styles.chartMinMaxText}>Max: {Math.max(...filteredData.map(d => d.value)).toFixed(1)}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                  
                  {selectedMeasurements.length === 0 && (
                    <View style={styles.noChartData}>
                      <BarChart3 size={48} color="#334155" />
                      <Text style={styles.noChartTitle}>No Measurements Selected</Text>
                      <Text style={styles.noChartText}>Select measurements above to view charts</Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>📈</Text>
                  <Text style={styles.emptyTitle}>No Data to Chart</Text>
                  <Text style={styles.emptySubtitle}>Add measurements to see trends</Text>
                </View>
              )}
            </>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            history.length > 0 ? (
              <>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyTitle}>All Entries</Text>
                  <Text style={styles.historySubtitle}>Last {EDITABLE_ENTRIES_COUNT} entries are editable</Text>
                </View>
                <View style={styles.historyList}>
                  {history.map((entry, index) => (
                    <HistoryEntryCard key={entry.id} entry={entry} index={index} isEditable={index < EDITABLE_ENTRIES_COUNT} unit={unit} onUpdate={handleUpdate} onDelete={handleDelete} />
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📋</Text>
                <Text style={styles.emptyTitle}>No History</Text>
                <Text style={styles.emptySubtitle}>Start logging measurements</Text>
              </View>
            )
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      <AuthPromptModal visible={showAuthModal} onClose={closeAuthModal} message={authMessage} />
    </SafeAreaView>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  bottomSpacer: { height: 40 },

  // Main Tabs
  mainTabContainer: { flexDirection: 'row', backgroundColor: '#0f172a', marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 4 },
  mainTabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 4 },
  mainTabButtonActive: { backgroundColor: '#3b82f6' },
  mainTabEmoji: { fontSize: 14 },
  mainTabText: { fontSize: 12, fontWeight: 'bold', color: '#64748b' },
  mainTabTextActive: { color: '#ffffff' },

  // Date Selector
  dateSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1e293b', borderRadius: 12, padding: 8, marginBottom: 16 },
  dateArrow: { padding: 8 },
  dateDisplay: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#0f172a', borderRadius: 10 },
  dateText: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  existingBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#14532d', alignItems: 'center', justifyContent: 'center' },

  // Unit Toggle
  unitToggleContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 12 },
  unitLabel: { fontSize: 14, color: '#94a3b8' },
  unitToggle: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 8, padding: 4 },
  unitOption: { paddingVertical: 6, paddingHorizontal: 20, borderRadius: 6 },
  unitOptionActive: { backgroundColor: '#3b82f6' },
  unitOptionText: { fontSize: 14, fontWeight: 'bold', color: '#64748b' },
  unitOptionTextActive: { color: '#ffffff' },

  // Section
  sectionHeader: { marginTop: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#64748b', letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 12 },
  halfWidth: { flex: 1 },

  // Notes
  notesInputContainer: { marginBottom: 16 },
  notesInput: { backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 2, borderColor: '#334155', padding: 14, fontSize: 16, color: '#ffffff', minHeight: 80, textAlignVertical: 'top' },

  // Save Button
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 12, gap: 8, marginTop: 8 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 17, fontWeight: 'bold', color: '#ffffff' },

  // Time Range
  // Time Range Filter (new design)
  filterPanel: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16 },
  filterHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  filterTitle: { fontSize: 14, fontWeight: '600', color: '#cbd5e1' },
  filterSubtitle: { fontSize: 12, color: '#64748b', marginLeft: 4 },
  filterScrollContent: { paddingRight: 16 },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#0f172a', borderWidth: 1.5, borderColor: '#334155', gap: 6 },
  filterChipActive: { backgroundColor: '#1e3a8a' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  filterChipTextActive: { color: '#3b82f6' },
  filterCheckIcon: { marginLeft: 2 },
  measurementChipDot: { width: 8, height: 8, borderRadius: 4 },

  // Old time range styles (can be removed if not used elsewhere)
  timeRangeContainer: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  timeRangeButton: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#1e293b', alignItems: 'center' },
  timeRangeButtonActive: { backgroundColor: '#3b82f6' },
  timeRangeText: { fontSize: 13, fontWeight: 'bold', color: '#64748b' },
  timeRangeTextActive: { color: '#ffffff' },

  // Summary Card
  summaryCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  timeSpan: { fontSize: 12, color: '#64748b' },
  noDataText: { fontSize: 14, color: '#64748b', textAlign: 'center', paddingVertical: 20 },
  comparisonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  comparisonItem: { width: (screenWidth - 64 - 12) / 2, backgroundColor: '#0f172a', borderRadius: 12, padding: 12 },
  comparisonLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 6 },
  comparisonValues: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  comparisonOld: { fontSize: 13, color: '#64748b' },
  comparisonArrow: { fontSize: 12, color: '#475569', marginHorizontal: 6 },
  comparisonNew: { fontSize: 14, fontWeight: 'bold', color: '#ffffff' },
  comparisonChange: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, gap: 4 },
  comparisonChangeText: { fontSize: 12, fontWeight: 'bold' },

  // Ratios Card
  ratiosCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16 },
  ratiosTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', marginBottom: 16 },
  ratiosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  ratioItem: { width: (screenWidth - 64 - 12) / 2, backgroundColor: '#0f172a', borderRadius: 12, padding: 12, alignItems: 'center' },
  ratioValue: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  ratioLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4, marginBottom: 8 },
  ratioBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  ratioBadgeText: { fontSize: 11, fontWeight: 'bold' },

  // Composition Card
  compositionCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16 },
  compositionTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', marginBottom: 16 },
  compositionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  compositionItem: { flex: 1, alignItems: 'center' },
  compositionValue: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  compositionLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  compositionDivider: { width: 1, height: 40, backgroundColor: '#334155' },
  categoryBadge: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 16 },
  categoryText: { fontSize: 13, fontWeight: 'bold' },

  // Quick Stats
  quickStats: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16 },
  quickStatItem: { flex: 1, alignItems: 'center' },
  quickStatValue: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  quickStatLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  quickStatDivider: { width: 1, backgroundColor: '#334155', marginHorizontal: 16 },

  // Chart Selector
  chartSelectorContainer: { paddingBottom: 12, gap: 8 },
  chartSelectorChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', marginRight: 8 },
  chartSelectorText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },

  // Chart Card
  chartCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  chartTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chartColorDot: { width: 10, height: 10, borderRadius: 5 },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  chartStats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chartStatLabel: { fontSize: 12, color: '#64748b' },
  chartStatValue: { fontSize: 14, fontWeight: 'bold' },
  chart: { marginLeft: -16, borderRadius: 12 },
  chartMinMax: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155' },
  chartStatBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chartMinMaxText: { fontSize: 12, color: '#64748b' },
  noChartData: { backgroundColor: '#1e293b', borderRadius: 16, padding: 32, alignItems: 'center', marginBottom: 16 },
  noChartTitle: { fontSize: 16, fontWeight: 'bold', color: '#94a3b8', marginTop: 12 },
  noChartText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8 },

  // History
  historyHeader: { marginBottom: 16 },
  historyTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  historySubtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },
  historyList: { gap: 12 },
  historyCard: { backgroundColor: '#1e293b', borderRadius: 16, overflow: 'hidden' },
  historyCardRecent: { borderWidth: 1, borderColor: '#3b82f6' },
  historyCardEditing: { borderWidth: 2, borderColor: '#22c55e' },
  historyCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  historyCardDate: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyCardDateText: { fontSize: 14, fontWeight: '600', color: '#e2e8f0' },
  historyCardDateTextRecent: { color: '#3b82f6' },
  recentBadge: { backgroundColor: '#3b82f620', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8 },
  recentBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#3b82f6' },
  historyCardActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  measurementCount: { fontSize: 12, color: '#64748b' },
  historyCardContent: { padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#334155' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginBottom: 16, paddingTop: 12 },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#3b82f620', borderRadius: 8 },
  editButtonText: { fontSize: 13, fontWeight: '600', color: '#3b82f6' },
  deleteEntryButton: { padding: 8, backgroundColor: '#ef444420', borderRadius: 8 },
  cancelButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#334155', borderRadius: 8 },
  cancelButtonText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  saveEditButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#22c55e', borderRadius: 8 },
  saveEditButtonText: { fontSize: 13, fontWeight: 'bold', color: '#ffffff' },
  readOnlyBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, marginBottom: 12, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#0f172a', borderRadius: 8, alignSelf: 'flex-start' },
  readOnlyText: { fontSize: 11, color: '#64748b' },
  sectionContainer: { marginTop: 12 },
  historySectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#94a3b8', marginBottom: 10 },
  fieldsGrid: { gap: 8 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#0f172a', borderRadius: 8 },
  fieldLabel: { fontSize: 13, color: '#94a3b8', flex: 1 },
  fieldValue: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  fieldInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldInput: { width: 70, backgroundColor: '#1e293b', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10, fontSize: 14, fontWeight: '600', color: '#ffffff', textAlign: 'right' },
  fieldUnit: { fontSize: 12, color: '#64748b', width: 24 },
  notesContainer: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155' },
  notesLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  notesText: { fontSize: 13, color: '#cbd5e1', fontStyle: 'italic' },

  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center' },
});


