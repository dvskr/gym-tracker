/**
 * Calculation utilities for workout data
 */

/**
 * Calculate estimated 1 rep max using Epley formula (most common)
 * 1RM = weight × (1 + reps/30)
 * @param weight - Weight lifted
 * @param reps - Number of repetitions
 * @returns Estimated 1RM
 */
export function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps > 10) return weight; // Less accurate above 10 reps
  return Math.round(weight * (1 + reps / 30));
}

/**
 * Calculate estimated 1 rep max using Brzycki formula (alternative)
 * 1RM = weight × (36 / (37 - reps))
 * @param weight - Weight lifted
 * @param reps - Number of repetitions
 * @returns Estimated 1RM
 */
export function calculate1RMBrzycki(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (36 / (37 - reps)));
}

/**
 * Calculate total volume from an array of sets
 * Volume = sum of (weight × reps) for all sets
 * @param sets - Array of sets with weight and reps
 * @returns Total volume
 */
export function calculateVolume(
  sets: Array<{ weight: number; reps: number }>
): number {
  return sets.reduce((total, set) => {
    return total + (set.weight || 0) * (set.reps || 0);
  }, 0);
}

/**
 * Calculate max weight from an array of sets
 * @param sets - Array of sets with weight
 * @returns Maximum weight
 */
export function calculateMaxWeight(
  sets: Array<{ weight: number }>
): number {
  if (sets.length === 0) return 0;
  return Math.max(...sets.map(s => s.weight || 0));
}

/**
 * Calculate max reps from an array of sets
 * @param sets - Array of sets with reps
 * @returns Maximum reps
 */
export function calculateMaxReps(
  sets: Array<{ reps: number }>
): number {
  if (sets.length === 0) return 0;
  return Math.max(...sets.map(s => s.reps || 0));
}

/**
 * Calculate best estimated 1RM from an array of sets
 * @param sets - Array of sets with weight and reps
 * @returns Best estimated 1RM
 */
export function calculateBest1RM(
  sets: Array<{ weight: number; reps: number }>
): number {
  if (sets.length === 0) return 0;
  
  return Math.max(
    ...sets.map(set => calculate1RM(set.weight, set.reps))
  );
}

/**
 * Calculate average weight from an array of sets
 * @param sets - Array of sets with weight
 * @returns Average weight
 */
export function calculateAverageWeight(
  sets: Array<{ weight: number }>
): number {
  if (sets.length === 0) return 0;
  const total = sets.reduce((sum, set) => sum + (set.weight || 0), 0);
  return Math.round(total / sets.length);
}

/**
 * Calculate average reps from an array of sets
 * @param sets - Array of sets with reps
 * @returns Average reps
 */
export function calculateAverageReps(
  sets: Array<{ reps: number }>
): number {
  if (sets.length === 0) return 0;
  const total = sets.reduce((sum, set) => sum + (set.reps || 0), 0);
  return Math.round(total / sets.length);
}

/**
 * Filter data by time range
 * @param data - Array of items with date property
 * @param range - Time range: '1M', '3M', '6M', '1Y', 'All'
 * @returns Filtered array
 */
export function filterByTimeRange<T extends { date: string }>(
  data: T[],
  range: '1M' | '3M' | '6M' | '1Y' | 'All'
): T[] {
  if (range === 'All') return data;
  
  const now = new Date();
  let cutoffDate: Date;
  
  switch (range) {
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
  
  return data.filter(item => new Date(item.date) >= cutoffDate);
}

/**
 * Format chart labels based on data length
 * @param dates - Array of date strings
 * @param maxLabels - Maximum number of labels to show
 * @returns Array of formatted labels (empty string for skipped labels)
 */
export function formatChartLabels(
  dates: string[],
  maxLabels: number = 6
): string[] {
  if (dates.length <= maxLabels) {
    return dates.map(d => {
      const date = new Date(d);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
  }
  
  // Show labels at regular intervals
  const step = Math.ceil(dates.length / maxLabels);
  return dates.map((d, i) => {
    if (i % step === 0 || i === dates.length - 1) {
      const date = new Date(d);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
    return '';
  });
}

