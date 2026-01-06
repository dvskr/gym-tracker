import { differenceInDays, differenceInWeeks, addWeeks, parseISO, format } from 'date-fns';

// ============================================
// Types
// ============================================

export type GoalType = 'lose' | 'gain' | 'maintain';

export interface ProgressResult {
  startWeight: number;
  currentWeight: number;
  targetWeight: number;
  totalToLose: number; // Positive = need to lose, Negative = need to gain
  progressMade: number; // Positive = lost, Negative = gained
  progressPercent: number; // 0-100
  remaining: number; // Absolute value of what's left
  direction: 'lose' | 'gain' | 'maintain';
}

export interface ProjectionResult {
  projectedDate: Date | null;
  projectedDateFormatted: string | null;
  daysRemaining: number | null;
  weeksRemaining: number | null;
  isOnTrack: boolean | null;
  onTrackMessage: string;
}

// ============================================
// Progress Calculations
// ============================================

/**
 * Calculate progress towards weight goal
 */
export function calculateProgress(
  startWeight: number,
  currentWeight: number,
  targetWeight: number
): ProgressResult {
  const totalToLose = startWeight - targetWeight;
  const progressMade = startWeight - currentWeight;
  const remaining = Math.abs(currentWeight - targetWeight);

  // Determine direction
  let direction: 'lose' | 'gain' | 'maintain' = 'maintain';
  if (targetWeight < startWeight) {
    direction = 'lose';
  } else if (targetWeight > startWeight) {
    direction = 'gain';
  }

  // Calculate progress percentage
  let progressPercent = 0;
  if (totalToLose !== 0) {
    progressPercent = Math.min(100, Math.max(0, (progressMade / totalToLose) * 100));
  } else if (direction === 'maintain') {
    // For maintain goals, 100% if within 2 lbs of target
    progressPercent = remaining <= 2 ? 100 : Math.max(0, 100 - remaining * 10);
  }

  return {
    startWeight,
    currentWeight,
    targetWeight,
    totalToLose,
    progressMade,
    progressPercent: Math.round(progressPercent * 10) / 10,
    remaining: Math.round(remaining * 10) / 10,
    direction,
  };
}

/**
 * Calculate weekly rate of change from weight history
 * @param weights Array of { date: string, weight: number } sorted by date ascending
 * @returns Weekly rate (positive = gaining, negative = losing)
 */
export function calculateWeeklyRate(
  weights: { date: string; weight: number }[]
): number {
  if (weights.length < 2) return 0;

  // Use last 4 weeks of data if available, otherwise use all
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const recentWeights = weights.filter(w => new Date(w.date) >= fourWeeksAgo);
  const dataToUse = recentWeights.length >= 2 ? recentWeights : weights;

  if (dataToUse.length < 2) return 0;

  const firstEntry = dataToUse[0];
  const lastEntry = dataToUse[dataToUse.length - 1];

  const daysDiff = differenceInDays(
    parseISO(lastEntry.date),
    parseISO(firstEntry.date)
  );

  if (daysDiff === 0) return 0;

  const weightChange = lastEntry.weight - firstEntry.weight;
  const weeklyRate = (weightChange / daysDiff) * 7;

  return Math.round(weeklyRate * 100) / 100;
}

/**
 * Project completion date based on current rate
 */
export function projectCompletionDate(
  currentWeight: number,
  targetWeight: number,
  weeklyRate: number
): Date | null {
  if (weeklyRate === 0) return null;

  const remaining = currentWeight - targetWeight;

  // Check if we're moving in the right direction
  const needToLose = remaining > 0;
  const isLosing = weeklyRate < 0;

  // If we need to lose but gaining, or need to gain but losing, no projection
  if ((needToLose && !isLosing) || (!needToLose && isLosing && targetWeight !== currentWeight)) {
    return null;
  }

  const weeksNeeded = Math.abs(remaining / weeklyRate);

  if (weeksNeeded > 520) return null; // More than 10 years, unrealistic

  const projectedDate = addWeeks(new Date(), weeksNeeded);
  return projectedDate;
}

/**
 * Check if user is on track to meet their goal
 */
export function isOnTrack(
  projectedDate: Date | null,
  targetDate: Date | null
): { isOnTrack: boolean | null; message: string } {
  if (!projectedDate) {
    return {
      isOnTrack: null,
      message: 'Not enough data to project',
    };
  }

  if (!targetDate) {
    return {
      isOnTrack: true,
      message: 'Making progress',
    };
  }

  const daysAhead = differenceInDays(targetDate, projectedDate);

  if (daysAhead >= 0) {
    return {
      isOnTrack: true,
      message: daysAhead > 7
        ? `${Math.round(daysAhead / 7)} weeks ahead of schedule`
        : 'On track',
    };
  } else {
    const daysBehind = Math.abs(daysAhead);
    return {
      isOnTrack: false,
      message: daysBehind > 7
        ? `${Math.round(daysBehind / 7)} weeks behind schedule`
        : 'Slightly behind schedule',
    };
  }
}

/**
 * Get full projection result
 */
export function getProjection(
  currentWeight: number,
  targetWeight: number,
  weeklyRate: number,
  targetDate: string | null
): ProjectionResult {
  const projectedDate = projectCompletionDate(currentWeight, targetWeight, weeklyRate);
  const targetDateObj = targetDate ? parseISO(targetDate) : null;
  const onTrackResult = isOnTrack(projectedDate, targetDateObj);

  let daysRemaining: number | null = null;
  let weeksRemaining: number | null = null;

  if (projectedDate) {
    daysRemaining = differenceInDays(projectedDate, new Date());
    weeksRemaining = Math.round(daysRemaining / 7);
  }

  return {
    projectedDate,
    projectedDateFormatted: projectedDate ? format(projectedDate, 'MMM d, yyyy') : null,
    daysRemaining,
    weeksRemaining,
    isOnTrack: onTrackResult.isOnTrack,
    onTrackMessage: onTrackResult.message,
  };
}

/**
 * Get recommended weekly rate based on goal type
 */
export function getRecommendedRate(goalType: GoalType): { min: number; max: number; unit: string } {
  switch (goalType) {
    case 'lose':
      return { min: 0.5, max: 1.0, unit: 'lbs/week' };
    case 'gain':
      return { min: 0.25, max: 0.5, unit: 'lbs/week' };
    case 'maintain':
      return { min: 0, max: 0, unit: 'lbs/week' };
  }
}

/**
 * Format weight change for display
 */
export function formatWeightChange(change: number, unit: string = 'lbs'): string {
  const absChange = Math.abs(change);
  const direction = change > 0 ? 'gained' : change < 0 ? 'lost' : 'maintained';
  
  if (change === 0) {
    return `Maintained weight`;
  }
  
  return `${absChange} ${unit} ${direction}`;
}

/**
 * Calculate time to reach goal at current rate
 */
export function formatTimeToGoal(weeksRemaining: number | null): string {
  if (weeksRemaining === null) return 'Unknown';
  
  if (weeksRemaining <= 0) return 'Goal reached!';
  
  if (weeksRemaining < 1) {
    const days = Math.round(weeksRemaining * 7);
    return `~${days} day${days !== 1 ? 's' : ''}`;
  }
  
  if (weeksRemaining < 4) {
    return `~${Math.round(weeksRemaining)} week${weeksRemaining >= 2 ? 's' : ''}`;
  }
  
  const months = Math.round(weeksRemaining / 4.33);
  return `~${months} month${months !== 1 ? 's' : ''}`;
}

