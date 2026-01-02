// Weight trend calculation utilities

export interface WeightDataPoint {
  date: string; // ISO date string
  weight: number;
}

/**
 * Calculate moving average for weight data
 * @param data Array of weight data points (sorted by date ascending)
 * @param windowSize Number of days for moving average window
 * @returns Array of moving average values with dates (only includes points with full window)
 */
export function calculateMovingAverage(
  data: { date: string; weight: number }[],
  windowSize: number = 7
): { date: string; average: number }[] {
  const result: { date: string; average: number }[] = [];
  
  for (let i = windowSize - 1; i < data.length; i++) {
    const window = data.slice(i - windowSize + 1, i + 1);
    const sum = window.reduce((acc, d) => acc + d.weight, 0);
    result.push({
      date: data[i].date,
      average: Math.round((sum / windowSize) * 10) / 10
    });
  }
  
  return result;
}

/**
 * Calculate moving average aligned with original data (for charts)
 * Returns array of same length as input, with nulls for initial points without full window
 * @param weights Array of weight data points (sorted by date ascending)
 * @param windowSize Number of days for moving average window
 * @returns Array of moving average values (same length as input)
 */
export function calculateMovingAverageAligned(
  weights: WeightDataPoint[],
  windowSize: number = 7
): (number | null)[] {
  if (weights.length === 0) return [];
  
  const result: (number | null)[] = [];
  
  for (let i = 0; i < weights.length; i++) {
    if (i < windowSize - 1) {
      // Not enough data points yet for a full window
      result.push(null);
    } else {
      const window = weights.slice(i - windowSize + 1, i + 1);
      const sum = window.reduce((acc, w) => acc + w.weight, 0);
      result.push(Math.round((sum / windowSize) * 10) / 10);
    }
  }
  
  return result;
}

/**
 * Calculate weekly rate of change
 * @param weights Array of weight data points (sorted by date ascending)
 * @returns Average weekly change in weight (positive = gaining, negative = losing)
 */
export function calculateWeeklyChange(weights: WeightDataPoint[]): number {
  if (weights.length < 2) return 0;
  
  // Use first and last entries
  const firstWeight = weights[0].weight;
  const lastWeight = weights[weights.length - 1].weight;
  
  // Calculate number of days between first and last entry
  const firstDate = new Date(weights[0].date);
  const lastDate = new Date(weights[weights.length - 1].date);
  const daysDiff = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate total change
  const totalChange = lastWeight - firstWeight;
  
  // Convert to weekly change
  const weeklyChange = (totalChange / daysDiff) * 7;
  
  return Math.round(weeklyChange * 10) / 10;
}

/**
 * Calculate projected weight based on current trend
 * @param weights Array of weight data points (sorted by date ascending)
 * @param daysAhead Number of days to project ahead
 * @returns Projected weight value
 */
export function calculateProjectedWeight(
  weights: WeightDataPoint[],
  daysAhead: number = 30
): number {
  if (weights.length < 2) return weights[weights.length - 1]?.weight || 0;
  
  // Use linear regression for more accurate projection
  const n = weights.length;
  
  // Convert dates to numeric values (days from first date)
  const firstDate = new Date(weights[0].date).getTime();
  const xValues = weights.map(w => 
    (new Date(w.date).getTime() - firstDate) / (1000 * 60 * 60 * 24)
  );
  const yValues = weights.map(w => w.weight);
  
  // Calculate linear regression (y = mx + b)
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((acc, x, i) => acc + x * yValues[i], 0);
  const sumXX = xValues.reduce((acc, x) => acc + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Project ahead
  const lastX = xValues[xValues.length - 1];
  const projectedWeight = slope * (lastX + daysAhead) + intercept;
  
  return Math.round(projectedWeight * 10) / 10;
}

/**
 * Calculate average weight for a set of entries
 * @param weights Array of weight data points
 * @returns Average weight
 */
export function calculateAverage(weights: WeightDataPoint[]): number {
  if (weights.length === 0) return 0;
  
  const sum = weights.reduce((acc, w) => acc + w.weight, 0);
  return Math.round((sum / weights.length) * 10) / 10;
}

/**
 * Calculate total change between first and last weight
 * @param weights Array of weight data points (sorted by date ascending)
 * @returns Total change (positive = gained, negative = lost)
 */
export function calculateTotalChange(weights: WeightDataPoint[]): number {
  if (weights.length < 2) return 0;
  
  const firstWeight = weights[0].weight;
  const lastWeight = weights[weights.length - 1].weight;
  
  return Math.round((lastWeight - firstWeight) * 10) / 10;
}

/**
 * Get weights from last N days
 * @param weights Array of weight data points
 * @param days Number of days to include
 * @returns Filtered array of weights
 */
export function filterByDays(weights: WeightDataPoint[], days: number): WeightDataPoint[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return weights.filter(w => new Date(w.date) >= cutoffDate);
}

/**
 * Format weight change for display
 * @param change Weight change value
 * @param unit Weight unit
 * @returns Formatted string like "+2.5 lbs" or "-1.2 kg"
 */
export function formatWeightChange(change: number, unit: string = 'lbs'): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change} ${unit}`;
}

/**
 * Format rate of change for display
 * @param weeklyChange Weekly change value
 * @param unit Weight unit
 * @returns Formatted string like "-0.8 lbs/week"
 */
export function formatWeeklyRate(weeklyChange: number, unit: string = 'lbs'): string {
  const sign = weeklyChange >= 0 ? '+' : '';
  return `${sign}${weeklyChange} ${unit}/week`;
}
