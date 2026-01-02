import { format, parseISO, differenceInDays, subDays, addDays } from 'date-fns';

/**
 * Streak Calculation Utilities
 * 
 * SQL equivalent for current streak (using window functions):
 * 
 * WITH dates AS (
 *   SELECT DISTINCT DATE(started_at) as workout_date
 *   FROM workouts
 *   WHERE user_id = $1
 *   ORDER BY workout_date DESC
 * ),
 * streaks AS (
 *   SELECT 
 *     workout_date,
 *     workout_date - (ROW_NUMBER() OVER (ORDER BY workout_date DESC))::int as streak_group
 *   FROM dates
 * )
 * SELECT COUNT(*) as streak_length
 * FROM streaks
 * WHERE streak_group = (SELECT streak_group FROM streaks LIMIT 1);
 * 
 * The JavaScript implementation below achieves the same result.
 */

/**
 * Calculate the current workout streak
 * Streak = consecutive days with at least 1 workout
 * @param workoutDates - Array of workout date strings (ISO format or YYYY-MM-DD)
 * @returns Current streak in days
 */
export function calculateCurrentStreak(workoutDates: string[]): number {
  if (workoutDates.length === 0) return 0;

  // Get unique dates and sort descending (most recent first)
  const uniqueDates = [...new Set(
    workoutDates.map(d => format(parseISO(d), 'yyyy-MM-dd'))
  )].sort((a, b) => b.localeCompare(a));

  if (uniqueDates.length === 0) return 0;

  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const mostRecent = uniqueDates[0];

  // Only count streak if most recent workout is today or yesterday
  if (mostRecent !== today && mostRecent !== yesterday) {
    return 0;
  }

  let streak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = parseISO(uniqueDates[i - 1]);
    const currDate = parseISO(uniqueDates[i]);
    const diff = differenceInDays(prevDate, currDate);

    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate the longest workout streak ever achieved
 * @param workoutDates - Array of workout date strings (ISO format)
 * @returns Longest streak in days
 */
export function calculateLongestStreak(workoutDates: string[]): number {
  if (workoutDates.length === 0) return 0;

  // Get unique dates and sort ascending (oldest first)
  const uniqueDates = [...new Set(
    workoutDates.map(d => format(parseISO(d), 'yyyy-MM-dd'))
  )].sort((a, b) => a.localeCompare(b));

  if (uniqueDates.length === 0) return 0;

  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = parseISO(uniqueDates[i - 1]);
    const currDate = parseISO(uniqueDates[i]);
    const diff = differenceInDays(currDate, prevDate);

    if (diff === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return longestStreak;
}

/**
 * Check if a date is part of the current streak
 * @param date - Date to check (ISO format)
 * @param workoutDates - Array of workout date strings
 * @returns Whether the date is in the current streak
 */
export function isInCurrentStreak(date: string, workoutDates: string[]): boolean {
  const currentStreak = calculateCurrentStreak(workoutDates);
  if (currentStreak === 0) return false;

  const uniqueDates = [...new Set(
    workoutDates.map(d => format(parseISO(d), 'yyyy-MM-dd'))
  )].sort((a, b) => b.localeCompare(a));

  const streakDates = uniqueDates.slice(0, currentStreak);
  const checkDate = format(parseISO(date), 'yyyy-MM-dd');

  return streakDates.includes(checkDate);
}

/**
 * Get streak status message
 * @param currentStreak - Current streak number
 * @returns Status message string
 */
export function getStreakMessage(currentStreak: number): string {
  if (currentStreak === 0) return "Start your streak today!";
  if (currentStreak === 1) return "1 day - Keep it going!";
  if (currentStreak < 7) return `${currentStreak} days - Building momentum!`;
  if (currentStreak < 14) return `${currentStreak} days - Week warrior! =%`;
  if (currentStreak < 30) return `${currentStreak} days - On fire! =%=%`;
  if (currentStreak < 60) return `${currentStreak} days - Unstoppable! =%=%=%`;
  return `${currentStreak} days - LEGENDARY! =Q`;
}

/**
 * Get all streaks from workout dates (for analysis/visualization)
 * Uses the same algorithm as the SQL window function approach
 * @param workoutDates - Array of workout date strings
 * @returns Array of streak objects with start date, end date, and length
 */
export interface StreakInfo {
  startDate: string;
  endDate: string;
  length: number;
}

export function getAllStreaks(workoutDates: string[]): StreakInfo[] {
  if (workoutDates.length === 0) return [];

  // Get unique dates and sort ascending
  const uniqueDates = [...new Set(
    workoutDates.map(d => {
      // Handle both ISO format and YYYY-MM-DD
      const dateStr = d.includes('T') ? d.split('T')[0] : d;
      return dateStr;
    })
  )].sort((a, b) => a.localeCompare(b));

  if (uniqueDates.length === 0) return [];

  const streaks: StreakInfo[] = [];
  let streakStart = uniqueDates[0];
  let streakLength = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = parseISO(uniqueDates[i - 1]);
    const currDate = parseISO(uniqueDates[i]);
    const diff = differenceInDays(currDate, prevDate);

    if (diff === 1) {
      // Continue streak
      streakLength++;
    } else {
      // End current streak and start new one
      streaks.push({
        startDate: streakStart,
        endDate: uniqueDates[i - 1],
        length: streakLength,
      });
      streakStart = uniqueDates[i];
      streakLength = 1;
    }
  }

  // Add final streak
  streaks.push({
    startDate: streakStart,
    endDate: uniqueDates[uniqueDates.length - 1],
    length: streakLength,
  });

  return streaks;
}

/**
 * Get streak at risk status
 * @param workoutDates - Array of workout date strings
 * @returns Whether the streak is at risk (no workout today, but worked out yesterday)
 */
export function isStreakAtRisk(workoutDates: string[]): boolean {
  if (workoutDates.length === 0) return false;

  const uniqueDates = [...new Set(
    workoutDates.map(d => {
      const dateStr = d.includes('T') ? d.split('T')[0] : d;
      return dateStr;
    })
  )].sort((a, b) => b.localeCompare(a));

  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const mostRecent = uniqueDates[0];

  // Streak is at risk if most recent workout was yesterday (not today)
  return mostRecent === yesterday;
}

/**
 * Get days until streak is lost
 * @param workoutDates - Array of workout date strings
 * @returns Number of days until streak is lost (0 = streak already lost, 1 = lose tomorrow, 2 = lose day after)
 */
export function getDaysUntilStreakLost(workoutDates: string[]): number {
  if (workoutDates.length === 0) return 0;

  const uniqueDates = [...new Set(
    workoutDates.map(d => {
      const dateStr = d.includes('T') ? d.split('T')[0] : d;
      return dateStr;
    })
  )].sort((a, b) => b.localeCompare(a));

  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const mostRecent = uniqueDates[0];

  if (mostRecent === today) {
    return 2; // Worked out today, streak safe until day after tomorrow
  } else if (mostRecent === yesterday) {
    return 1; // Worked out yesterday, must work out today
  } else {
    return 0; // Streak already lost
  }
}

/**
 * Calculate workout frequency over a period
 * @param workoutDates - Array of workout date strings
 * @param days - Number of days to look back
 * @returns Workout frequency statistics
 */
export interface WorkoutFrequency {
  totalWorkouts: number;
  workoutDays: number;
  averagePerWeek: number;
  percentage: number; // % of days with workouts
}

export function calculateWorkoutFrequency(
  workoutDates: string[],
  days: number = 30
): WorkoutFrequency {
  const today = new Date();
  const startDate = subDays(today, days);
  const startDateStr = format(startDate, 'yyyy-MM-dd');

  // Filter dates within range
  const datesInRange = workoutDates
    .map(d => d.includes('T') ? d.split('T')[0] : d)
    .filter(d => d >= startDateStr);

  const totalWorkouts = datesInRange.length;
  const uniqueDays = new Set(datesInRange);
  const workoutDays = uniqueDays.size;
  const averagePerWeek = (workoutDays / days) * 7;
  const percentage = (workoutDays / days) * 100;

  return {
    totalWorkouts,
    workoutDays,
    averagePerWeek: Math.round(averagePerWeek * 10) / 10,
    percentage: Math.round(percentage),
  };
}
