import React, { useEffect, useState, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  Clock,
  Dumbbell,
  TrendingUp,
  ChevronRight,
  Trophy,
  List,
  CalendarDays,
  X,
} from 'lucide-react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { format } from 'date-fns';
import { useAuthStore } from '@/stores/authStore';
import {
  getWorkoutHistory,
  getWorkoutDates,
  getWorkoutsForDate,
  WorkoutHistoryItem,
  HistoryFilter,
  WorkoutDateInfo,
} from '@/lib/api/history';
import { Skeleton } from '@/components/ui';
import { lightHaptic } from '@/lib/utils/haptics';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { AuthPromptModal } from '@/components/modals/AuthPromptModal';
import { useUnits } from '@/hooks/useUnits';

// ============================================
// Constants
// ============================================

const ITEMS_PER_PAGE = 20;

const FILTER_OPTIONS: { key: HistoryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

type ViewMode = 'list' | 'calendar';

// ============================================
// Types
// ============================================

interface MarkedDateInfo {
  marked: boolean;
  dotColor: string;
  workoutCount?: number;
  selected?: boolean;
  selectedColor?: string;
}

interface MarkedDates {
  [date: string]: MarkedDateInfo;
}

// ============================================
// Calendar Theme
// ============================================

const calendarTheme = {
  backgroundColor: '#0f172a',
  calendarBackground: '#0f172a',
  textSectionTitleColor: '#64748b',
  selectedDayBackgroundColor: '#334155',
  selectedDayTextColor: '#ffffff',
  todayTextColor: '#3b82f6',
  todayBackgroundColor: 'rgba(59, 130, 246, 0.2)',
  dayTextColor: '#f1f5f9',
  textDisabledColor: '#475569',
  dotColor: '#3b82f6',
  selectedDotColor: '#3b82f6',
  arrowColor: '#3b82f6',
  monthTextColor: '#ffffff',
  indicatorColor: '#3b82f6',
  textDayFontWeight: '500' as const,
  textMonthFontWeight: 'bold' as const,
  textDayHeaderFontWeight: '600' as const,
  textDayFontSize: 16,
  textMonthFontSize: 18,
  textDayHeaderFontSize: 12,
};

// ============================================
// Skeleton Component
// ============================================

const WorkoutItemSkeleton = () => (
  <View style={styles.workoutCard}>
    <View style={styles.cardLeft}>
      <Skeleton width={100} height={14} borderRadius={4} />
      <View style={{ marginTop: 4 }}>
        <Skeleton width={50} height={12} borderRadius={4} />
      </View>
    </View>
    <View style={styles.cardContent}>
      <Skeleton width="70%" height={18} borderRadius={4} />
      <View style={styles.statsRow}>
        <Skeleton width={50} height={14} borderRadius={4} />
        <Skeleton width={70} height={14} borderRadius={4} />
        <Skeleton width={80} height={14} borderRadius={4} />
      </View>
    </View>
    <Skeleton width={20} height={20} borderRadius={10} />
  </View>
);

// ============================================
// Workout Card Component
// ============================================

interface WorkoutCardProps {
  item: WorkoutHistoryItem;
  onPress: () => void;
  showDate?: boolean;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({ item, onPress, showDate = true }) => {
  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins} min`;
  };

  const formatWorkoutDate = (dateString: string): string => {
    const date = new Date(dateString);
    return format(date, 'EEE, MMM d');
  };

  const formatWorkoutTime = (dateString: string): string => {
    const date = new Date(dateString);
    return format(date, 'h:mm a');
  };

  const getExerciseCount = (totalSets: number): number => {
    return Math.max(1, Math.ceil(totalSets / 3.5));
  };

  return (
    <TouchableOpacity
      style={styles.workoutCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {showDate && (
        <View style={styles.cardLeft}>
          <Text style={styles.workoutDate}>{formatWorkoutDate(item.started_at)}</Text>
          <Text style={styles.workoutTime}>{formatWorkoutTime(item.started_at)}</Text>
        </View>
      )}

      <View style={[styles.cardContent, !showDate && styles.cardContentFull]}>
        <View style={styles.titleRow}>
          <Text style={styles.workoutName} numberOfLines={1}>
            {item.name || 'Workout'}
          </Text>
          {item.has_pr && (
            <View style={styles.prBadge}>
              <Trophy size={12} color="#fbbf24" />
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          {!showDate && (
            <Text style={styles.timeText}>{formatWorkoutTime(item.started_at)}</Text>
          )}
          <View style={styles.statItem}>
            <Clock size={12} color="#94a3b8" />
            <Text style={styles.statText}>{formatDuration(item.duration_seconds)}</Text>
          </View>

          <View style={styles.statItem}>
            <Dumbbell size={12} color="#94a3b8" />
            <Text style={styles.statText}>
              {getExerciseCount(item.total_sets)} ex
            </Text>
          </View>

          <View style={styles.statItem}>
            <TrendingUp size={12} color={item.has_pr ? '#22c55e' : '#94a3b8'} />
            <Text style={[styles.statText, item.has_pr && styles.prVolume]}>
              {item.total_volume.toLocaleString()} {weightUnit}
            </Text>
          </View>
        </View>
      </View>

      <ChevronRight size={20} color="#475569" />
    </TouchableOpacity>
  );
};

// ============================================
// Main Component
// ============================================

export default function HistoryScreen() {
  const { user, session } = useAuthStore();
  const { weightUnit } = useUnits();
  
  // Auth guard
  const { requireAuth, showAuthModal, authMessage, closeAuthModal } = useAuthGuard();

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // List view state
  const [workouts, setWorkouts] = useState<WorkoutHistoryItem[]>([]);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showLoadingSkeleton, setShowLoadingSkeleton] = useState(false); // Start false - only show if fetch > 300ms
  const loadingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Calendar view state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateWorkouts, setDateWorkouts] = useState<WorkoutHistoryItem[]>([]);
  const [isLoadingDateWorkouts, setIsLoadingDateWorkouts] = useState(false);
  const [showDateSheet, setShowDateSheet] = useState(false);

  // Fetch workouts for list view
  const fetchWorkouts = useCallback(
    async (pageNum: number = 0, refresh: boolean = false) => {
      // KEY FIX: If no session, stop loading immediately
      if (!session) {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
        setShowLoadingSkeleton(false);
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
        return;
      }
      
      if (!user?.id) return;

      if (refresh) {
        setIsRefreshing(true);
      } else if (pageNum === 0) {
        setIsLoading(true);
        
        // Only show skeleton if fetch takes > 300ms (prevents flash for quick fetches)
        loadingTimeoutRef.current = setTimeout(() => {
          setShowLoadingSkeleton(true);
        }, 300);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const result = await getWorkoutHistory(
          user.id,
          pageNum,
          ITEMS_PER_PAGE,
          filter
        );

        // Always replace workouts for page 0 or refresh
        // This prevents flicker by keeping old data visible until new data arrives
        if (pageNum === 0 || refresh) {
          setWorkouts(result.workouts);
        } else {
          // For pagination, append to existing
          setWorkouts((prev) => [...prev, ...result.workouts]);
        }

        setHasMore(result.hasMore);
        setTotalCount(result.totalCount);
        setPage(pageNum);
      } catch (err) {
        logger.error('Failed to fetch workouts:', err);
        setError('Failed to load workout history');
      } finally {
        // Clear the timeout if fetch completed before 300ms
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
        
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
        setShowLoadingSkeleton(false);
      }
    },
    [user?.id, filter, session, workouts.length, showLoadingSkeleton]
  );

  // Fetch workout dates for calendar
  const fetchWorkoutDates = useCallback(
    async (month: number, year: number) => {
      // KEY FIX: If no session, return early
      if (!session) return;
      if (!user?.id) return;

      try {
        const dates = await getWorkoutDates(user.id, month, year);
        
        const marked: MarkedDates = {};
        dates.forEach((dateInfo: WorkoutDateInfo) => {
          marked[dateInfo.date] = {
            marked: true,
            dotColor: '#3b82f6',
            workoutCount: dateInfo.count,
          };
        });

        setMarkedDates(marked);
      } catch (err) {
        logger.error('Failed to fetch workout dates:', err);
      }
    },
    [user?.id]
  );

  // Fetch workouts for selected date
  const fetchWorkoutsForDate = useCallback(
    async (date: string) => {
      if (!user?.id) return;

      setIsLoadingDateWorkouts(true);
      try {
        const workouts = await getWorkoutsForDate(user.id, date);
        setDateWorkouts(workouts);
      } catch (err) {
        logger.error('Failed to fetch workouts for date:', err);
        setDateWorkouts([]);
      } finally {
        setIsLoadingDateWorkouts(false);
      }
    },
    [user?.id]
  );

  // Initial fetch - use ref to prevent infinite loops
  const initialFetchDone = React.useRef(false);
  const previousFilterRef = React.useRef(filter);
  const previousViewModeRef = React.useRef(viewMode);

  useEffect(() => {
    // Only run if filter or viewMode actually changed, or first mount
    const filterChanged = previousFilterRef.current !== filter;
    const viewModeChanged = previousViewModeRef.current !== viewMode;
    
    if (!initialFetchDone.current || filterChanged || viewModeChanged) {
      previousFilterRef.current = filter;
      previousViewModeRef.current = viewMode;
      initialFetchDone.current = true;
      
      if (viewMode === 'list') {
        // Don't reset workouts to empty array - prevents flickering
        // Just set page to 0 and fetch fresh data
        setPage(0);
        fetchWorkouts(0);
      } else {
        const month = currentMonth.getMonth() + 1;
        const year = currentMonth.getFullYear();
        fetchWorkoutDates(month, year);
      }
    }
  }, [viewMode, filter, fetchWorkouts, fetchWorkoutDates]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Handle month change in calendar
  const handleMonthChange = (monthData: DateData) => {
    const newMonth = new Date(monthData.year, monthData.month - 1, 1);
    setCurrentMonth(newMonth);
    fetchWorkoutDates(monthData.month, monthData.year);
  };

  // Handle date press in calendar
  const handleDatePress = (day: DateData) => {
    lightHaptic();
    setSelectedDate(day.dateString);
    
    // Update marked dates with selection
    const newMarked: MarkedDates = {};
    
    // Copy existing marks and remove selection
    Object.keys(markedDates).forEach((date) => {
      newMarked[date] = { ...markedDates[date], selected: false };
    });
    
    // Add selection to pressed date
    if (newMarked[day.dateString]) {
      newMarked[day.dateString] = { 
        ...newMarked[day.dateString], 
        selected: true,
        selectedColor: '#334155',
      };
    } else {
      newMarked[day.dateString] = { 
        marked: false,
        dotColor: '#3b82f6',
        selected: true, 
        selectedColor: '#334155',
      };
    }
    
    setMarkedDates(newMarked);

    // Fetch workouts for this date if it has workouts
    if (markedDates[day.dateString]?.marked) {
      fetchWorkoutsForDate(day.dateString);
      setShowDateSheet(true);
    }
  };

  // Handle view mode toggle
  const handleViewModeToggle = (mode: ViewMode) => {
    lightHaptic();
    setViewMode(mode);
  };

  // Handle filter change
  const handleFilterChange = (newFilter: HistoryFilter) => {
    lightHaptic();
    setFilter(newFilter);
  };

  // Handle workout press
  const handleWorkoutPress = (workoutId: string) => {
    requireAuth(() => {
      lightHaptic();
      setShowDateSheet(false);
      router.push(`/workout/${workoutId}`);
    }, 'Sign in to view your workout history and details.');
  };

  // Handle refresh
  const handleRefresh = () => {
    if (viewMode === 'list') {
      fetchWorkouts(0, true);
    } else {
      const month = currentMonth.getMonth() + 1;
      const year = currentMonth.getFullYear();
      fetchWorkoutDates(month, year);
    }
  };

  // Handle load more
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore && !isLoading) {
      fetchWorkouts(page + 1);
    }
  };

  // Render footer (loading more indicator)
  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  };

  // Empty state
  const EmptyState = () => {
    return (
      <View style={styles.emptyContainer}>
        <Dumbbell size={64} color="#334155" />
        <Text style={styles.emptyTitle}>No workouts yet</Text>
        <Text style={styles.emptySubtitle}>
          Start your first workout to see it here!
        </Text>
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => router.push('/(tabs)/workout')}
        >
          <Text style={styles.startButtonText}>Start Workout</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Error state
  const ErrorState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => fetchWorkouts(0)}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // Loading skeletons
  const LoadingSkeletons = () => {
    return (
      <View style={styles.skeletonContainer}>
        {[...Array(6)].map((_, i) => (
          <WorkoutItemSkeleton key={i} />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>History</Text>
          {totalCount > 0 && viewMode === 'list' && (
            <Text style={styles.subtitle}>
              {totalCount} workout{totalCount !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {/* View Mode Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            onPress={() => handleViewModeToggle('list')}
          >
            <List size={20} color={viewMode === 'list' ? '#ffffff' : '#64748b'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'calendar' && styles.toggleButtonActive]}
            onPress={() => handleViewModeToggle('calendar')}
          >
            <CalendarDays size={20} color={viewMode === 'calendar' ? '#ffffff' : '#64748b'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs (List view only) */}
      {viewMode === 'list' && (
        <View style={styles.filterContainer}>
          {FILTER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterTab,
                filter === option.key && styles.filterTabActive,
              ]}
              onPress={() => handleFilterChange(option.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === option.key && styles.filterTabTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Content */}
      {viewMode === 'list' ? (
        // List View
        showLoadingSkeleton ? (
          <LoadingSkeletons />
        ) : error ? (
          <ErrorState />
        ) : (
          <FlatList
            data={workouts}
            renderItem={({ item }) => (
              <WorkoutCard
                item={item}
                onPress={() => handleWorkoutPress(item.id)}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={EmptyState}
            ListFooterComponent={renderFooter}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor="#3b82f6"
                colors={['#3b82f6']}
              />
            }
          />
        )
      ) : (
        // Calendar View
        <View style={styles.calendarContainer}>
          <Calendar
            current={format(currentMonth, 'yyyy-MM-dd')}
            onDayPress={handleDatePress}
            onMonthChange={handleMonthChange}
            markedDates={markedDates}
            theme={calendarTheme}
            enableSwipeMonths
            hideExtraDays
            style={styles.calendar}
          />

          {/* Legend */}
          <View style={styles.calendarLegend}>
            <View style={styles.legendItem}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>Workout logged</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotToday]} />
              <Text style={styles.legendText}>Today</Text>
            </View>
          </View>

          {/* Instruction */}
          <Text style={styles.calendarInstruction}>
            Tap a marked date to view workouts
          </Text>
        </View>
      )}

      {/* Date Workouts Bottom Sheet */}
      <Modal
        visible={showDateSheet}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDateSheet(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setShowDateSheet(false)}
        >
          <View style={styles.sheetContent}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>
                  {selectedDate
                    ? format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')
                    : 'Workouts'}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  {dateWorkouts.length} workout{dateWorkouts.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.sheetCloseButton}
                onPress={() => setShowDateSheet(false)}
              >
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Workouts List */}
            {isLoadingDateWorkouts ? (
              <View style={styles.sheetLoading}>
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text style={styles.sheetLoadingText}>Loading...</Text>
              </View>
            ) : dateWorkouts.length > 0 ? (
              <FlatList
                data={dateWorkouts}
                renderItem={({ item }) => (
                  <WorkoutCard
                    item={item}
                    onPress={() => handleWorkoutPress(item.id)}
                    showDate={false}
                  />
                )}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.sheetList}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.sheetEmpty}>
                <Text style={styles.sheetEmptyText}>No workouts on this date</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
      
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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },

  headerLeft: {
    flex: 1,
  },

  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
  },

  subtitle: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
  },

  // View Toggle
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 4,
  },

  toggleButton: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },

  toggleButtonActive: {
    backgroundColor: '#3b82f6',
  },

  // Filter Tabs
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },

  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e293b',
  },

  filterTabActive: {
    backgroundColor: '#3b82f6',
  },

  filterTabText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
  },

  filterTabTextActive: {
    color: '#ffffff',
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },

  // Workout Card
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },

  cardLeft: {
    width: 80,
  },

  workoutDate: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
  },

  workoutTime: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },

  cardContent: {
    flex: 1,
  },

  cardContentFull: {
    marginLeft: 0,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },

  workoutName: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },

  prBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    padding: 4,
    borderRadius: 4,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  timeText: {
    color: '#64748b',
    fontSize: 12,
    marginRight: 4,
  },

  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  statText: {
    color: '#94a3b8',
    fontSize: 13,
  },

  prVolume: {
    color: '#22c55e',
  },

  // Loading More
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },

  loadingMoreText: {
    color: '#64748b',
    fontSize: 14,
  },

  // Skeleton
  skeletonContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },

  emptyTitle: {
    color: '#94a3b8',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },

  emptySubtitle: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },

  startButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },

  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Error State
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },

  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },

  retryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Calendar View
  calendarContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },

  calendar: {
    borderRadius: 16,
    overflow: 'hidden',
  },

  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 20,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },

  legendDotToday: {
    backgroundColor: '#3b82f6',
    borderWidth: 2,
    borderColor: '#ffffff',
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  legendText: {
    color: '#94a3b8',
    fontSize: 13,
  },

  calendarInstruction: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
  },

  // Bottom Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },

  sheetContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    minHeight: 200,
  },

  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },

  sheetTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  sheetSubtitle: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
  },

  sheetCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sheetList: {
    padding: 16,
    paddingBottom: 40,
  },

  sheetLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },

  sheetLoadingText: {
    color: '#64748b',
    fontSize: 14,
  },

  sheetEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },

  sheetEmptyText: {
    color: '#64748b',
    fontSize: 14,
  },
});

