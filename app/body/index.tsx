import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  Scale,
  Ruler,
  Camera,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Plus,
  Calendar,
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { format, parseISO, differenceInDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/stores/authStore';
import { getLatestWeight, getWeightHistory, getTodayWeight } from '@/lib/api/bodyWeight';
import { getLatestMeasurements } from '@/lib/api/measurements';
import { getWeightGoal } from '@/lib/api/goals';
import { getPhotos } from '@/lib/api/photos';
import { calculateProgress } from '@/lib/utils/goalCalculations';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { AuthPromptModal } from '@/components/modals/AuthPromptModal';
import { useUnits } from '@/hooks/useUnits';

const screenWidth = Dimensions.get('window').width;

// ============================================
// Weight Section Component
// ============================================

interface WeightSectionProps {
  currentWeight: number | null;
  weekChange: number | null;
  chartData: number[];
  lastLoggedDate: string | null;
  onPress: () => void;
  onLogPress: () => void;
}

const WeightSection: React.FC<WeightSectionProps> = ({
  currentWeight,
  weekChange,
  chartData,
  lastLoggedDate,
  onPress,
  onLogPress,
}) => {
  const { weightUnit } = useUnits();
  const isGaining = weekChange !== null && weekChange > 0;
  const isLosing = weekChange !== null && weekChange < 0;
  const changeColor = isLosing ? '#22c55e' : isGaining ? '#ef4444' : '#64748b';

  return (
    <TouchableOpacity style={styles.sectionCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconContainer}>
          <Scale size={20} color="#3b82f6" />
        </View>
        <Text style={styles.sectionTitle}>Weight</Text>
        <ChevronRight size={20} color="#475569" />
      </View>

      <View style={styles.weightContent}>
        <View style={styles.weightMain}>
          {currentWeight !== null ? (
            <>
              <Text style={styles.weightValue}>{currentWeight}</Text>
              <Text style={styles.weightUnit}>{weightUnit}</Text>
            </>
          ) : (
            <Text style={styles.noDataText}>Not logged yet</Text>
          )}
        </View>

        {chartData.length >= 2 && (
          <View style={styles.miniChart}>
            <LineChart
              data={{
                labels: [],
                datasets: [{ data: chartData, color: () => '#3b82f6', strokeWidth: 2 }],
              }}
              width={100}
              height={40}
              chartConfig={{
                backgroundColor: 'transparent',
                backgroundGradientFrom: 'transparent',
                backgroundGradientTo: 'transparent',
                decimalPlaces: 0,
                color: () => '#3b82f6',
                propsForDots: { r: '0' },
                propsForBackgroundLines: { stroke: 'transparent' },
              }}
              bezier={true}
              withDots={false}
              withInnerLines={false}
              withOuterLines={false}
              withVerticalLines={false}
              withHorizontalLines={false}
              withVerticalLabels={false}
              withHorizontalLabels={false}
              style={styles.chart}
            />
          </View>
        )}
      </View>

      <View style={styles.weightFooter}>
        {weekChange !== null && (
          <View style={[styles.changeBadge, { backgroundColor: changeColor + '20' }]}>
            {weekChange === 0 ? (
              <Minus size={12} color={changeColor} />
            ) : isGaining ? (
              <TrendingUp size={12} color={changeColor} />
            ) : (
              <TrendingDown size={12} color={changeColor} />
            )}
            <Text style={[styles.changeText, { color: changeColor }]}>
              {weekChange > 0 ? '+' : ''}{weekChange.toFixed(1)} this week
            </Text>
          </View>
        )}

        {lastLoggedDate && (
          <Text style={styles.lastLogged}>
            Last: {format(parseISO(lastLoggedDate), 'MMM d')}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.logButton}
        onPress={(e) => {
          e.stopPropagation();
          onLogPress();
        }}
        activeOpacity={0.7}
      >
        <Plus size={16} color="#ffffff" />
        <Text style={styles.logButtonText}>Log Weight</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// ============================================
// Measurements Section Component
// ============================================

interface MeasurementsSectionProps {
  lastMeasuredDate: string | null;
  chest: number | null;
  waist: number | null;
  bicep: number | null;
  unit: string;
  onPress: () => void;
  onLogPress: () => void;
}

const MeasurementsSection: React.FC<MeasurementsSectionProps> = ({
  lastMeasuredDate,
  chest,
  waist,
  bicep,
  unit,
  onPress,
  onLogPress,
}) => {
  const hasMeasurements = chest !== null || waist !== null || bicep !== null;

  return (
    <TouchableOpacity style={styles.sectionCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconContainer, { backgroundColor: '#8b5cf620' }]}>
          <Ruler size={20} color="#8b5cf6" />
        </View>
        <Text style={styles.sectionTitle}>Measurements</Text>
        <ChevronRight size={20} color="#475569" />
      </View>

      {hasMeasurements ? (
        <View style={styles.measurementsGrid}>
          {chest !== null && (
            <View style={styles.measurementItem}>
              <Text style={styles.measurementValue}>{chest}</Text>
              <Text style={styles.measurementLabel}>Chest ({unit})</Text>
            </View>
          )}
          {waist !== null && (
            <View style={styles.measurementItem}>
              <Text style={styles.measurementValue}>{waist}</Text>
              <Text style={styles.measurementLabel}>Waist ({unit})</Text>
            </View>
          )}
          {bicep !== null && (
            <View style={styles.measurementItem}>
              <Text style={styles.measurementValue}>{bicep}</Text>
              <Text style={styles.measurementLabel}>Arms ({unit})</Text>
            </View>
          )}
        </View>
      ) : (
        <Text style={styles.noDataText}>No measurements logged yet</Text>
      )}

      {lastMeasuredDate && (
        <View style={styles.measurementFooter}>
          <Calendar size={14} color="#64748b" />
          <Text style={styles.lastLogged}>
            Last measured: {format(parseISO(lastMeasuredDate), 'MMM d, yyyy')}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.logButton, { backgroundColor: '#8b5cf6' }]}
        onPress={(e) => {
          e.stopPropagation();
          onLogPress();
        }}
        activeOpacity={0.7}
      >
        <Plus size={16} color="#ffffff" />
        <Text style={styles.logButtonText}>Log Measurements</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// ============================================
// Photos Section Component
// ============================================

interface PhotosSectionProps {
  recentPhotos: Array<{ id: string; local_uri: string }>;
  totalCount: number;
  onPress: () => void;
  onTakePhoto: () => void;
}

const PhotosSection: React.FC<PhotosSectionProps> = ({
  recentPhotos,
  totalCount,
  onPress,
  onTakePhoto,
}) => {
  return (
    <TouchableOpacity style={styles.sectionCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconContainer, { backgroundColor: '#22c55e20' }]}>
          <Camera size={20} color="#22c55e" />
        </View>
        <Text style={styles.sectionTitle}>Progress Photos</Text>
        <ChevronRight size={20} color="#475569" />
      </View>

      {recentPhotos.length > 0 ? (
        <View style={styles.photosGrid}>
          {recentPhotos.slice(0, 4).map((photo, index) => (
            <View key={photo.id} style={styles.photoThumbnail}>
              <Image source={{ uri: photo.local_uri }} style={styles.photoImage} />
            </View>
          ))}
          {recentPhotos.length < 4 && (
            <View style={[styles.photoThumbnail, styles.photoPlaceholder]}>
              <Camera size={20} color="#475569" />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyPhotos}>
          <Camera size={32} color="#475569" />
          <Text style={styles.emptyPhotosText}>No photos yet</Text>
        </View>
      )}

      <View style={styles.photosFooter}>
        <Text style={styles.photoCount}>
          {totalCount} photo{totalCount !== 1 ? 's' : ''}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.logButton, { backgroundColor: '#22c55e' }]}
        onPress={(e) => {
          e.stopPropagation();
          onTakePhoto();
        }}
        activeOpacity={0.7}
      >
        <Camera size={16} color="#ffffff" />
        <Text style={styles.logButtonText}>Take Photo</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// ============================================
// Goal Section Component
// ============================================

interface GoalSectionProps {
  currentWeight: number;
  targetWeight: number;
  startWeight: number;
  goalType: 'lose' | 'gain' | 'maintain';
  onPress: () => void;
}

const GoalSection: React.FC<GoalSectionProps> = ({
  currentWeight,
  targetWeight,
  startWeight,
  goalType,
  onPress,
}) => {
  const { weightUnit } = useUnits();
  const progress = calculateProgress(startWeight, currentWeight, targetWeight);
  const remaining = Math.abs(currentWeight - targetWeight).toFixed(1);

  return (
    <TouchableOpacity style={styles.goalCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.goalHeader}>
        <View style={[styles.sectionIconContainer, { backgroundColor: '#f59e0b20' }]}>
          <Target size={20} color="#f59e0b" />
        </View>
        <View style={styles.goalInfo}>
          <Text style={styles.goalTitle}>Weight Goal</Text>
          <Text style={styles.goalSubtitle}>
            {goalType === 'lose' ? 'Losing' : goalType === 'gain' ? 'Gaining' : 'Maintaining'}
          </Text>
        </View>
        <ChevronRight size={20} color="#475569" />
      </View>

      <View style={styles.goalProgress}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(100, progress.progressPercent)}%` },
            ]}
          />
        </View>
        <Text style={styles.progressPercent}>{Math.round(progress.progressPercent)}%</Text>
      </View>

      <View style={styles.goalFooter}>
        <Text style={styles.goalRemaining}>
          {progress.remaining === 0 ? '🎉 Goal reached!' : `${remaining} ${weightUnit} to go`}
        </Text>
        <Text style={styles.goalTarget}>Target: {targetWeight} {weightUnit}</Text>
      </View>
    </TouchableOpacity>
  );
};

// ============================================
// Main Screen Component
// ============================================

export default function BodyHubScreen() {
  const { user } = useAuthStore();
  const { measurementUnit: preferredUnit, unitSystem } = useUnits();
  
  // Helper to convert weight from DB unit to user's preferred unit
  const convertWeight = (weight: number, dbUnit: string): number => {
    const targetUnit = unitSystem === 'metric' ? 'kg' : 'lbs';
    if (dbUnit === targetUnit) return weight;
    if (targetUnit === 'kg' && dbUnit === 'lbs') return weight * 0.453592;
    if (targetUnit === 'lbs' && dbUnit === 'kg') return weight * 2.20462;
    return weight;
  };
  
  // Auth guard
  const { requireAuth, showAuthModal, authMessage, closeAuthModal } = useAuthGuard();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Weight data
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [weekChange, setWeekChange] = useState<number | null>(null);
  const [weightChartData, setWeightChartData] = useState<number[]>([]);
  const [lastWeightDate, setLastWeightDate] = useState<string | null>(null);

  // Measurements data
  const [lastMeasuredDate, setLastMeasuredDate] = useState<string | null>(null);
  const [chest, setChest] = useState<number | null>(null);
  const [waist, setWaist] = useState<number | null>(null);
  const [bicep, setBicep] = useState<number | null>(null);
  const [measurementUnit, setMeasurementUnit] = useState<string>(preferredUnit);

  // Photos data
  const [recentPhotos, setRecentPhotos] = useState<Array<{ id: string; local_uri: string }>>([]);
  const [totalPhotoCount, setTotalPhotoCount] = useState(0);

  // Goal data
  const [goal, setGoal] = useState<{
    currentWeight: number;
    targetWeight: number;
    startWeight: number;
    goalType: 'lose' | 'gain' | 'maintain';
  } | null>(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Fetch weight data
      const [latestWeight, weightHistory] = await Promise.all([
        getLatestWeight(user.id),
        getWeightHistory(user.id, 7),
      ]);

      if (latestWeight) {
        setCurrentWeight(convertWeight(latestWeight.weight, latestWeight.weight_unit || 'lbs'));
        setLastWeightDate(latestWeight.logged_at);
      }

      if (weightHistory.length >= 2) {
        const sorted = [...weightHistory].sort(
          (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
        );
        setWeightChartData(sorted.map(w => convertWeight(w.weight, w.weight_unit || 'lbs')));
        const firstWeight = convertWeight(sorted[0].weight, sorted[0].weight_unit || 'lbs');
        const lastWeight = convertWeight(sorted[sorted.length - 1].weight, sorted[sorted.length - 1].weight_unit || 'lbs');
        const change = lastWeight - firstWeight;
        setWeekChange(change);
      }

      // Fetch measurements
      try {
        const measurements = await getLatestMeasurements(user.id);
        if (measurements) {
          setLastMeasuredDate(measurements.measured_at);
          setChest(measurements.chest ?? null);
          setWaist(measurements.waist ?? null);
          setBicep(measurements.bicep_left ?? measurements.bicep_right ?? null);
          setMeasurementUnit(measurements.unit || 'in');
        }
      } catch (e: unknown) {
        // No measurements yet
      }

      // Fetch photos
      try {
        const photos = await getPhotos(user.id, 4);
        setRecentPhotos(photos.map(p => ({ id: p.id, local_uri: p.local_uri })));
        // Get total count
        const allPhotos = await getPhotos(user.id);
        setTotalPhotoCount(allPhotos.length);
      } catch (e: unknown) {
        // No photos yet
      }

      // Fetch goal
      try {
        const weightGoal = await getWeightGoal(user.id);
        if (weightGoal && latestWeight) {
          setGoal({
            currentWeight: convertWeight(latestWeight.weight, latestWeight.weight_unit || 'lbs'),
            targetWeight: convertWeight(weightGoal.target_weight, weightGoal.weight_unit || 'lbs'),
            startWeight: convertWeight(weightGoal.start_weight || latestWeight.weight, weightGoal.weight_unit || 'lbs'),
            goalType: weightGoal.goal_type,
          });
        }
      } catch (e: unknown) {
        // No goal set
      }
    } catch (error: unknown) {
 logger.error('Error fetching body data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  const navigate = (route: string) => {
    requireAuth(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(route as any);
    }, 'Sign in to track your body measurements and progress.');
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Body</Text>
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
        {/* Goal Section (if set) */}
        {goal && (
          <GoalSection
            currentWeight={goal.currentWeight}
            targetWeight={goal.targetWeight}
            startWeight={goal.startWeight}
            goalType={goal.goalType}
            onPress={() => navigate('/body/goal')}
          />
        )}

        {/* Weight Section */}
        <WeightSection
          currentWeight={currentWeight}
          weekChange={weekChange}
          chartData={weightChartData}
          lastLoggedDate={lastWeightDate}
          onPress={() => navigate('/body/weight-chart')}
          onLogPress={() => navigate('/body/weight')}
        />

        {/* Measurements Section */}
        <MeasurementsSection
          lastMeasuredDate={lastMeasuredDate}
          chest={chest}
          waist={waist}
          bicep={bicep}
          unit={measurementUnit}
          onPress={() => navigate('/body/measurements-history')}
          onLogPress={() => navigate('/body/measurements')}
        />

        {/* Photos Section */}
        <PhotosSection
          recentPhotos={recentPhotos}
          totalCount={totalPhotoCount}
          onPress={() => navigate('/body/photos')}
          onTakePhoto={() => navigate('/body/photos/capture')}
        />

        {/* Set Goal Link (if no goal) */}
        {!goal && (
          <TouchableOpacity
            style={styles.setGoalCard}
            onPress={() => navigate('/body/goal')}
            activeOpacity={0.7}
          >
            <Target size={24} color="#f59e0b" />
            <View style={styles.setGoalInfo}>
              <Text style={styles.setGoalTitle}>Set a Weight Goal</Text>
              <Text style={styles.setGoalSubtitle}>Track your progress towards your target</Text>
            </View>
            <ChevronRight size={20} color="#475569" />
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

  // Header
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
    gap: 16,
  },

  bottomSpacer: {
    height: 40,
  },

  // Section Card
  sectionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#3b82f620',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  sectionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Weight Section
  weightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  weightMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  weightValue: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  weightUnit: {
    fontSize: 18,
    color: '#64748b',
    marginLeft: 6,
  },

  miniChart: {
    width: 100,
    height: 40,
    overflow: 'hidden',
  },

  chart: {
    paddingRight: 0,
  },

  weightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },

  changeText: {
    fontSize: 13,
    fontWeight: 'bold',
  },

  lastLogged: {
    fontSize: 12,
    color: '#64748b',
  },

  noDataText: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 16,
  },

  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },

  logButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Measurements Section
  measurementsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },

  measurementItem: {
    alignItems: 'center',
  },

  measurementValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },

  measurementLabel: {
    fontSize: 12,
    color: '#64748b',
  },

  measurementFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },

  // Photos Section
  photosGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },

  photoThumbnail: {
    width: (screenWidth - 32 - 32 - 24) / 4,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#334155',
  },

  photoImage: {
    width: '100%',
    height: '100%',
  },

  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyPhotos: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 12,
  },

  emptyPhotosText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },

  photosFooter: {
    marginBottom: 16,
  },

  photoCount: {
    fontSize: 13,
    color: '#64748b',
  },

  // Goal Section
  goalCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f59e0b40',
  },

  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  goalInfo: {
    flex: 1,
    marginLeft: 12,
  },

  goalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  goalSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },

  goalProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },

  progressBarBackground: {
    flex: 1,
    height: 10,
    backgroundColor: '#334155',
    borderRadius: 5,
    overflow: 'hidden',
  },

  progressBarFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 5,
  },

  progressPercent: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f59e0b',
    width: 45,
    textAlign: 'right',
  },

  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  goalRemaining: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  goalTarget: {
    fontSize: 13,
    color: '#64748b',
  },

  // Set Goal Card
  setGoalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },

  setGoalInfo: {
    flex: 1,
    marginLeft: 12,
  },

  setGoalTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  setGoalSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
});



