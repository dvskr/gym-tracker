import React, { useEffect, useState, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  Dumbbell,
  Clock,
  Flame,
  Target,
  Calendar,
  BarChart3,
  ChevronRight,
  Zap,
} from 'lucide-react-native';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '@/stores/authStore';
import { Skeleton } from '@/components/ui';
import { lightHaptic } from '@/lib/utils/haptics';
import {
  getWeeklyStats,
  getAllTimeStats,
  getRecentPRs,
  getMuscleDistribution,
  formatPRType,
  formatPRValue,
  WeeklyStats,
  AllTimeStats,
  RecentPR,
  MuscleDistribution,
} from '@/lib/api/stats';
import {
  getRecentAchievements,
  getAchievementStats,
  Achievement,
} from '@/lib/api/achievements';
import { AchievementCard } from '@/components/AchievementCard';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { AuthPromptModal } from '@/components/modals/AuthPromptModal';
import { tabDataCache } from '@/lib/cache/tabDataCache';
import { useUnits } from '@/hooks/useUnits';

// ============================================
// Types
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// Components
// ============================================

// Change Indicator
const ChangeIndicator: React.FC<{ value: number; suffix?: string }> = ({ value, suffix = '%' }) => {
  if (value === 0) return null;
  
  const isPositive = value > 0;
  const color = isPositive ? '#22c55e' : '#ef4444';
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <View style={[styles.changeIndicator, { backgroundColor: `${color}20` }]}>
      <Icon size={12} color={color} />
      <Text style={[styles.changeText, { color }]}>
        {isPositive ? '+' : ''}{value}{suffix}
      </Text>
    </View>
  );
};

// Stat Card for Grid
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subtext }) => (
  <View style={styles.statCard}>
    <View style={styles.statIconContainer}>
      {icon}
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {subtext && <Text style={styles.statSubtext}>{subtext}</Text>}
  </View>
);

// PR Item
interface PRItemProps {
  pr: RecentPR;
  onPress: () => void;
}

const PRItem: React.FC<PRItemProps> = ({ pr, onPress }) => {
  const timeAgo = formatDistanceToNow(new Date(pr.achievedAt), { addSuffix: true });

  return (
    <TouchableOpacity style={styles.prItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.prIcon}>
        <Trophy size={16} color="#fbbf24" fill="#fbbf24" />
      </View>
      <View style={styles.prContent}>
        <Text style={styles.prExercise} numberOfLines={1}>{pr.exerciseName}</Text>
        <Text style={styles.prDetails}>
          {formatPRType(pr.recordType)}: {formatPRValue(pr.recordType, pr.value)}
        </Text>
      </View>
      <Text style={styles.prTime}>{timeAgo}</Text>
    </TouchableOpacity>
  );
};

// Muscle Bar
interface MuscleBarProps {
  muscle: MuscleDistribution;
  maxPercentage: number;
}

const MuscleBar: React.FC<MuscleBarProps> = ({ muscle, maxPercentage }) => {
  const barWidth = maxPercentage > 0 ? (muscle.percentage / maxPercentage) * 100 : 0;

  return (
    <View style={styles.muscleBarContainer}>
      <View style={styles.muscleBarHeader}>
        <Text style={styles.muscleBarLabel}>{muscle.muscle}</Text>
        <Text style={styles.muscleBarValue}>{muscle.percentage}%</Text>
      </View>
      <View style={styles.muscleBarTrack}>
        <View
          style={[
            styles.muscleBarFill,
            { width: `${barWidth}%`, backgroundColor: muscle.color },
          ]}
        />
      </View>
    </View>
  );
};

// Skeleton Loaders
const WeeklySummarySkeleton = () => (
  <View style={styles.weeklyCard}>
    <Skeleton width="40%" height={18} />
    <View style={styles.weeklyStats}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.weeklyStat}>
          <Skeleton width={48} height={48} borderRadius={24} />
          <Skeleton width={40} height={24} style={{ marginTop: 8 }} />
          <Skeleton width={60} height={12} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  </View>
);

const StatsGridSkeleton = () => (
  <View style={styles.statsGrid}>
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <View key={i} style={styles.statCard}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <Skeleton width={50} height={24} style={{ marginTop: 8 }} />
        <Skeleton width={70} height={12} style={{ marginTop: 4 }} />
      </View>
    ))}
  </View>
);

// ============================================
// Main Component
// ============================================

export default function ProgressScreen() {
  const { user, session } = useAuthStore();
  const { weightUnit } = useUnits();
  
  // Auth guard
  const { requireAuth, showAuthModal, authMessage, closeAuthModal } = useAuthGuard();

  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [allTimeStats, setAllTimeStats] = useState<AllTimeStats | null>(null);
  const [recentPRs, setRecentPRs] = useState<RecentPR[]>([]);
  const [muscleDistribution, setMuscleDistribution] = useState<MuscleDistribution[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementStats, setAchievementStats] = useState<{ unlocked: number; total: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Start false, only load if cache miss
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async (force = false) => {
    const CACHE_KEY = 'progress-data';
    
    // Check global cache (survives component unmount)
    if (!force) {
      const cachedData = tabDataCache.get(CACHE_KEY);
      if (cachedData) {
        setWeeklyStats(cachedData.weeklyStats);
        setAllTimeStats(cachedData.allTimeStats);
        setRecentPRs(cachedData.recentPRs);
        setMuscleDistribution(cachedData.muscleDistribution);
        setAchievements(cachedData.achievements);
        setAchievementStats(cachedData.achievementStats);
        // No need to set isLoading to false - it's already false
        setIsRefreshing(false);
        return;
      }
    }
    
    // KEY FIX: If no session, stop immediately
    if (!session) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }
    
    if (!user?.id) return;

    setIsLoading(true); // Only show loading on cache miss

    try {
      const [weekly, allTime, prs, muscles, recentAchievements, achStats] = await Promise.all([
        getWeeklyStats(user.id),
        getAllTimeStats(user.id),
        getRecentPRs(user.id, 5),
        getMuscleDistribution(user.id, 30),
        getRecentAchievements(user.id, 4),
        getAchievementStats(user.id),
      ]);

      setWeeklyStats(weekly);
      setAllTimeStats(allTime);
      setRecentPRs(prs);
      setMuscleDistribution(muscles);
      setAchievements(recentAchievements);
      setAchievementStats(achStats);
      
      // Store in global cache
      tabDataCache.set(CACHE_KEY, {
        weeklyStats: weekly,
        allTimeStats: allTime,
        recentPRs: prs,
        muscleDistribution: muscles,
        achievements: recentAchievements,
        achievementStats: achStats,
      });
      
      logger.log('[Progress] Data fetched successfully');
    } catch (error) {
      logger.error('Failed to fetch progress stats:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id, session]); // Stable dependencies

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData(true); // Force refresh
  }, [fetchData]);

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toLocaleString();
  };

  const maxMusclePercentage = muscleDistribution.length > 0 
    ? Math.max(...muscleDistribution.map(m => m.percentage))
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Progress</Text>
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
        {/* This Week Summary */}
        {isLoading ? (
          <WeeklySummarySkeleton />
        ) : weeklyStats ? (
          <View style={styles.weeklyCard}>
            <View style={styles.weeklyHeader}>
              <Text style={styles.weeklyTitle}>This Week</Text>
              <ChangeIndicator value={weeklyStats.volumeChange} />
            </View>
            <View style={styles.weeklyStats}>
              <View style={styles.weeklyStat}>
                <View style={[styles.weeklyStatIcon, { backgroundColor: '#3b82f620' }]}>
                  <Dumbbell size={24} color="#3b82f6" />
                </View>
                <Text style={styles.weeklyStatValue}>{weeklyStats.workoutsCompleted}</Text>
                <Text style={styles.weeklyStatLabel}>Workouts</Text>
              </View>
              <View style={styles.weeklyStat}>
                <View style={[styles.weeklyStatIcon, { backgroundColor: '#22c55e20' }]}>
                  <Clock size={24} color="#22c55e" />
                </View>
                <Text style={styles.weeklyStatValue}>{formatDuration(weeklyStats.totalMinutes)}</Text>
                <Text style={styles.weeklyStatLabel}>Time</Text>
              </View>
              <View style={styles.weeklyStat}>
                <View style={[styles.weeklyStatIcon, { backgroundColor: '#f59e0b20' }]}>
                  <TrendingUp size={24} color="#f59e0b" />
                </View>
                <Text style={styles.weeklyStatValue}>{formatVolume(weeklyStats.totalVolume)}</Text>
                <Text style={styles.weeklyStatLabel}>Volume</Text>
              </View>
            </View>
            {weeklyStats.volumeChange !== 0 && (
              <Text style={styles.weeklyComparison}>
                {weeklyStats.volumeChange > 0 ? '� ' : '� '} {Math.abs(weeklyStats.volumeChange)}% vs last week
              </Text>
            )}
          </View>
        ) : null}

        {/* Stats Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ALL TIME STATS</Text>
        </View>

        {isLoading ? (
          <StatsGridSkeleton />
        ) : allTimeStats ? (
          <View style={styles.statsGrid}>
            <StatCard
              icon={<Calendar size={20} color="#3b82f6" />}
              label="Total Workouts"
              value={allTimeStats.totalWorkouts}
            />
            <StatCard
              icon={<TrendingUp size={20} color="#22c55e" />}
              label="Total Volume"
              value={formatVolume(allTimeStats.totalVolume)}
              subtext={`${weightUnit} lifted`}
            />
            <StatCard
              icon={<Flame size={20} color="#ef4444" />}
              label="Current Streak"
              value={allTimeStats.currentStreak}
              subtext={allTimeStats.currentStreak === 1 ? 'day' : 'days'}
            />
            <StatCard
              icon={<Zap size={20} color="#f59e0b" />}
              label="Longest Streak"
              value={allTimeStats.longestStreak}
              subtext={allTimeStats.longestStreak === 1 ? 'day' : 'days'}
            />
            <StatCard
              icon={<Clock size={20} color="#a855f7" />}
              label="Avg Duration"
              value={formatDuration(allTimeStats.avgDuration)}
              subtext="per workout"
            />
            <StatCard
              icon={<Target size={20} color="#ec4899" />}
              label="Most Trained"
              value={allTimeStats.mostTrainedMuscle ? 
                allTimeStats.mostTrainedMuscle.charAt(0).toUpperCase() + allTimeStats.mostTrainedMuscle.slice(1) 
                : '�'}
            />
          </View>
        ) : null}

        {/* Recent PRs */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>RECENT PRs</Text>
          {recentPRs.length > 0 && (
            <TouchableOpacity 
              onPress={() => {
                lightHaptic();
                // Navigate to full PR list (future feature)
              }}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <View style={styles.prList}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.prItem}>
                <Skeleton width={32} height={32} borderRadius={16} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Skeleton width="60%" height={14} />
                  <Skeleton width="40%" height={12} style={{ marginTop: 4 }} />
                </View>
                <Skeleton width={60} height={12} />
              </View>
            ))}
          </View>
        ) : recentPRs.length > 0 ? (
          <View style={styles.prList}>
            {recentPRs.map((pr) => (
              <PRItem
                key={pr.id}
                pr={pr}
                onPress={() => {
                  requireAuth(() => {
                    lightHaptic();
                    router.push(`/exercise/${pr.exerciseId}`);
                  }, 'Sign in to view your personal records and exercise details.');
                }}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyPRs}>
            <Trophy size={32} color="#334155" />
            <Text style={styles.emptyPRsText}>No PRs yet</Text>
            <Text style={styles.emptyPRsSubtext}>Complete workouts to set records!</Text>
          </View>
        )}

        {/* Achievements */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
            {achievementStats && (
              <View style={styles.achievementBadge}>
                <Text style={styles.achievementBadgeText}>
                  {achievementStats.unlocked}/{achievementStats.total}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => {
              lightHaptic();
              // Navigate to full achievements screen (future feature)
            }}
          >
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.achievementsList}>
            {[1, 2].map((i) => (
              <View key={i} style={styles.achievementSkeletonCard}>
                <Skeleton width={44} height={44} borderRadius={12} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Skeleton width="60%" height={16} />
                  <Skeleton width="80%" height={12} style={{ marginTop: 6 }} />
                </View>
              </View>
            ))}
          </View>
        ) : achievements.length > 0 ? (
          <View style={styles.achievementsList}>
            {achievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                size="medium"
                showProgress={false}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyAchievements}>
            <Text style={styles.emptyAchievementIcon}>�x� </Text>
            <Text style={styles.emptyPRsText}>Start unlocking achievements!</Text>
            <Text style={styles.emptyPRsSubtext}>Complete workouts to earn badges</Text>
          </View>
        )}

        {/* Muscle Distribution */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>MUSCLE DISTRIBUTION</Text>
          <Text style={styles.sectionSubtitle}>Last 30 days</Text>
        </View>

        {isLoading ? (
          <View style={styles.muscleCard}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={styles.muscleBarContainer}>
                <View style={styles.muscleBarHeader}>
                  <Skeleton width={80} height={14} />
                  <Skeleton width={30} height={14} />
                </View>
                <Skeleton width="100%" height={8} borderRadius={4} style={{ marginTop: 6 }} />
              </View>
            ))}
          </View>
        ) : muscleDistribution.length > 0 ? (
          <View style={styles.muscleCard}>
            {muscleDistribution.slice(0, 6).map((muscle) => (
              <MuscleBar
                key={muscle.muscle}
                muscle={muscle}
                maxPercentage={maxMusclePercentage}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyMuscle}>
            <BarChart3 size={32} color="#334155" />
            <Text style={styles.emptyPRsText}>No data yet</Text>
            <Text style={styles.emptyPRsSubtext}>Complete workouts to see distribution</Text>
          </View>
        )}

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

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  // Weekly Card
  weeklyCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },

  weeklyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  weeklyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  weeklyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  weeklyStat: {
    alignItems: 'center',
  },

  weeklyStatIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  weeklyStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  weeklyStatLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },

  weeklyComparison: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 16,
  },

  // Change Indicator
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },

  changeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: 1,
  },

  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },

  seeAllText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: 'bold',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },

  statCard: {
    width: (SCREEN_WIDTH - 40) / 2,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },

  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },

  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },

  statSubtext: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },

  // PR List
  prList: {
    marginHorizontal: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
  },

  prItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  prIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#422006',
    alignItems: 'center',
    justifyContent: 'center',
  },

  prContent: {
    flex: 1,
    marginLeft: 12,
  },

  prExercise: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'capitalize',
  },

  prDetails: {
    fontSize: 12,
    color: '#fbbf24',
    marginTop: 2,
  },

  prTime: {
    fontSize: 11,
    color: '#64748b',
  },

  emptyPRs: {
    alignItems: 'center',
    padding: 32,
    marginHorizontal: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
  },

  emptyPRsText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: 'bold',
    marginTop: 12,
  },

  emptyPRsSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },

  // Achievements
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  achievementBadge: {
    backgroundColor: '#422006',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },

  achievementBadgeText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: 'bold',
  },

  achievementsList: {
    marginHorizontal: 16,
    gap: 12,
  },

  achievementSkeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },

  emptyAchievements: {
    alignItems: 'center',
    padding: 32,
    marginHorizontal: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
  },

  emptyAchievementIcon: {
    fontSize: 32,
  },

  // Muscle Distribution
  muscleCard: {
    marginHorizontal: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },

  muscleBarContainer: {
    marginBottom: 14,
  },

  muscleBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },

  muscleBarLabel: {
    fontSize: 13,
    color: '#f1f5f9',
    fontWeight: 'bold',
  },

  muscleBarValue: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: 'bold',
  },

  muscleBarTrack: {
    height: 8,
    backgroundColor: '#0f172a',
    borderRadius: 4,
    overflow: 'hidden',
  },

  muscleBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  emptyMuscle: {
    alignItems: 'center',
    padding: 32,
    marginHorizontal: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
  },

  bottomSpacer: {
    height: 40,
  },
});
