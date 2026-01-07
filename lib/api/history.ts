import { supabase } from '@/lib/supabase';

// ============================================
// Types
// ============================================

export type HistoryFilter = 'all' | 'week' | 'month';

export interface WorkoutHistoryItem {
  id: string;
  name: string | null;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  total_volume: number;
  total_sets: number;
  total_reps: number;
  rating: number | null;
  has_pr: boolean;
  exercise_count: number;
}

export interface WorkoutHistoryResult {
  workouts: WorkoutHistoryItem[];
  hasMore: boolean;
  totalCount: number;
}

// ============================================
// Helper Functions
// ============================================

function getFilterDateRange(filter: HistoryFilter): { start: string; end: string } | null {
  if (filter === 'all') return null;

  const now = new Date();
  const end = now.toISOString();

  if (filter === 'week') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return { start: start.toISOString(), end };
  }

  if (filter === 'month') {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 1);
    return { start: start.toISOString(), end };
  }

  return null;
}

// ============================================
// API Functions
// ============================================

/**
 * Get workout history with pagination and filtering
 * 
 * SQL equivalent:
 * SELECT 
 *   w.id, w.name, w.started_at, w.ended_at, w.duration_seconds,
 *   w.total_volume, w.total_sets, w.rating,
 *   COUNT(DISTINCT we.exercise_id) as exercise_count
 * FROM workouts w
 * LEFT JOIN workout_exercises we ON w.id = we.workout_id
 * WHERE w.user_id = $1
 * GROUP BY w.id
 * ORDER BY w.started_at DESC
 * LIMIT $2 OFFSET $3;
 */
export async function getWorkoutHistory(
  userId: string,
  page: number = 0,
  limit: number = 20,
  filter: HistoryFilter = 'all'
): Promise<WorkoutHistoryResult> {
  const offset = page * limit;
  const dateRange = getFilterDateRange(filter);

  // Build query - fetch workout data with exercises for counting
  let query = supabase
    .from('workouts')
    .select(`
      id,
      name,
      started_at,
      ended_at,
      duration_seconds,
      total_volume,
      total_sets,
      total_reps,
      rating,
      workout_exercises (
        exercise_id,
        workout_sets (
          is_pr
        )
      )
    `, { count: 'exact' })
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false });

  // Apply date filter
  if (dateRange) {
    query = query
      .gte('started_at', dateRange.start)
      .lte('started_at', dateRange.end);
  }

  // Apply pagination
  query = query.range(offset, offset + limit);

  const { data, error, count } = await query;

  if (error) throw error;

  interface WorkoutRow {
    id: string;
    name: string | null;
    started_at: string;
    ended_at: string;
    duration_seconds: number;
    total_volume: number | null;
    total_sets: number | null;
    total_reps: number | null;
    rating: number | null;
    workout_exercises: Array<{
      exercise_id: string;
      workout_sets: Array<{
        is_pr: boolean;
      }>;
    }>;
  }

  // Process data to check for PRs and count distinct exercises
  const workouts: WorkoutHistoryItem[] = (data || []).map((workout: WorkoutRow) => {
    // Check if any set in this workout is a PR
    const hasPR = workout.workout_exercises?.some((we) =>
      we.workout_sets?.some((set) => set.is_pr === true)
    ) || false;

    // Count distinct exercises
    const uniqueExerciseIds = new Set(
      (workout.workout_exercises || []).map((we) => we.exercise_id)
    );

    return {
      id: workout.id,
      name: workout.name,
      started_at: workout.started_at,
      ended_at: workout.ended_at,
      duration_seconds: workout.duration_seconds,
      total_volume: workout.total_volume || 0,
      total_sets: workout.total_sets || 0,
      total_reps: workout.total_reps || 0,
      rating: workout.rating,
      has_pr: hasPR,
      exercise_count: uniqueExerciseIds.size,
    };
  });

  return {
    workouts,
    hasMore: (count || 0) > offset + workouts.length,
    totalCount: count || 0,
  };
}

/**
 * Get workout count by filter
 */
export async function getWorkoutCountByFilter(
  userId: string,
  filter: HistoryFilter = 'all'
): Promise<number> {
  const dateRange = getFilterDateRange(filter);

  let query = supabase
    .from('workouts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('ended_at', 'is', null);

  if (dateRange) {
    query = query
      .gte('started_at', dateRange.start)
      .lte('started_at', dateRange.end);
  }

  const { count, error } = await query;

  if (error) throw error;
  return count || 0;
}

// ============================================
// Calendar API Functions
// ============================================

export interface WorkoutDateInfo {
  date: string; // YYYY-MM-DD format
  count: number;
}

/**
 * Get dates with workouts for a specific month
 * Returns array of dates (YYYY-MM-DD format) with workout count
 * 
 * SQL equivalent:
 * SELECT 
 *   DATE(started_at) as workout_date,
 *   COUNT(*) as workout_count
 * FROM workouts
 * WHERE user_id = $1
 *   AND started_at >= $2
 *   AND started_at <= $3
 * GROUP BY DATE(started_at);
 */
export async function getWorkoutDates(
  userId: string,
  month: number, // 1-12
  year: number
): Promise<WorkoutDateInfo[]> {
  // Create start and end of month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of month

  const { data, error } = await supabase
    .from('workouts')
    .select('started_at')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .gte('started_at', startDate.toISOString())
    .lte('started_at', endDate.toISOString());

  if (error) throw error;

  // Count workouts per date (GROUP BY DATE equivalent)
  const dateCountMap = new Map<string, number>();

  (data || []).forEach((workout) => {
    // Convert UTC timestamp to local date
    const localDate = new Date(workout.started_at);
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`; // YYYY-MM-DD in local timezone
    
    dateCountMap.set(date, (dateCountMap.get(date) || 0) + 1);
  });

  // Convert to array
  return Array.from(dateCountMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));
}

/**
 * Get workout counts by date for a date range
 * Useful for streaks, heatmaps, and activity tracking
 * 
 * SQL:
 * SELECT 
 *   DATE(started_at) as workout_date,
 *   COUNT(*) as workout_count
 * FROM workouts
 * WHERE user_id = $1
 *   AND started_at >= $2
 *   AND started_at <= $3
 * GROUP BY DATE(started_at);
 */
export async function getWorkoutCountsByDate(
  userId: string,
  startDate: string, // ISO date string
  endDate: string    // ISO date string
): Promise<WorkoutDateInfo[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('started_at')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .gte('started_at', startDate)
    .lte('started_at', endDate);

  if (error) throw error;

  // Group by date and count
  const dateCountMap = new Map<string, number>();

  (data || []).forEach((workout) => {
    // Convert UTC timestamp to local date
    const localDate = new Date(workout.started_at);
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`; // YYYY-MM-DD in local timezone
    
    dateCountMap.set(date, (dateCountMap.get(date) || 0) + 1);
  });

  // Convert to sorted array
  return Array.from(dateCountMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get all workout dates for a user (for streak calculations)
 */
export async function getAllWorkoutDates(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('started_at')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false });

  if (error) throw error;

  // Return unique dates
  const uniqueDates = new Set<string>();
  (data || []).forEach((workout) => {
    // Convert UTC timestamp to local date
    const localDate = new Date(workout.started_at);
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`; // YYYY-MM-DD in local timezone
    
    uniqueDates.add(date);
  });

  return Array.from(uniqueDates).sort((a, b) => b.localeCompare(a)); // Most recent first
}

/**
 * Get workouts for a specific date
 */
export async function getWorkoutsForDate(
  userId: string,
  date: string // YYYY-MM-DD format in local timezone
): Promise<WorkoutHistoryItem[]> {
  // Parse the local date and create start/end of day in local timezone
  const [year, month, day] = date.split('-').map(Number);
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
  
  // Convert to ISO strings (which will include timezone offset)
  const startOfDayISO = startOfDay.toISOString();
  const endOfDayISO = endOfDay.toISOString();

  const { data, error } = await supabase
    .from('workouts')
    .select(`
      id,
      name,
      started_at,
      ended_at,
      duration_seconds,
      total_volume,
      total_sets,
      total_reps,
      rating,
      workout_exercises (
        exercise_id,
        workout_sets (
          is_pr
        )
      )
    `)
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .gte('started_at', startOfDayISO)
    .lte('started_at', endOfDayISO)
    .order('started_at', { ascending: false });

  if (error) throw error;

  interface WorkoutRow {
    id: string;
    name: string | null;
    started_at: string;
    ended_at: string;
    duration_seconds: number;
    total_volume: number | null;
    total_sets: number | null;
    total_reps: number | null;
    rating: number | null;
    workout_exercises: Array<{
      exercise_id: string;
      workout_sets: Array<{
        is_pr: boolean;
      }>;
    }>;
  }

  return (data || []).map((workout: WorkoutRow) => {
    const hasPR = workout.workout_exercises?.some((we) =>
      we.workout_sets?.some((set) => set.is_pr === true)
    ) || false;

    // Count distinct exercises
    const uniqueExerciseIds = new Set(
      (workout.workout_exercises || []).map((we) => we.exercise_id)
    );

    return {
      id: workout.id,
      name: workout.name,
      started_at: workout.started_at,
      ended_at: workout.ended_at,
      duration_seconds: workout.duration_seconds,
      total_volume: workout.total_volume || 0,
      total_sets: workout.total_sets || 0,
      total_reps: workout.total_reps || 0,
      rating: workout.rating,
      has_pr: hasPR,
      exercise_count: uniqueExerciseIds.size,
    };
  });
}


