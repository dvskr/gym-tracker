import { supabase } from '@/lib/supabase';

// Types
export interface WeightEntry {
  id: string;
  user_id: string;
  logged_at: string;
  weight: number;
  weight_unit: 'lbs' | 'kg';
  notes?: string;
  created_at: string;
}

export interface WeightEntryWithChange extends WeightEntry {
  change?: number; // Change from previous entry
}

// Log a new weight entry
export async function logWeight(
  userId: string,
  weight: number,
  unit: 'lbs' | 'kg' = 'lbs',
  notes?: string
): Promise<WeightEntry> {
  const today = new Date().toISOString().split('T')[0];

  // Use upsert to handle both insert and update for the same day
  const { data, error } = await supabase
    .from('body_weight_log')
    .upsert(
      {
        user_id: userId,
        logged_at: today,
        weight,
        weight_unit: unit,
        notes: notes || null,
      },
      {
        onConflict: 'user_id,logged_at',
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get recent weight entries
export async function getRecentWeights(
  userId: string,
  days: number = 7
): Promise<WeightEntryWithChange[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('body_weight_log')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_at', startDate.toISOString().split('T')[0])
    .order('logged_at', { ascending: false });

  if (error) throw error;

  // Calculate change from previous entry
  const entries = data || [];
  return entries.map((entry, index) => {
    const previousEntry = entries[index + 1];
    let change: number | undefined;

    if (previousEntry) {
      // Convert to same unit if needed
      let currentWeight = entry.weight;
      let prevWeight = previousEntry.weight;

      if (entry.weight_unit !== previousEntry.weight_unit) {
        // Convert previous to current unit
        if (entry.weight_unit === 'kg' && previousEntry.weight_unit === 'lbs') {
          prevWeight = prevWeight * 0.453592;
        } else if (entry.weight_unit === 'lbs' && previousEntry.weight_unit === 'kg') {
          prevWeight = prevWeight * 2.20462;
        }
      }

      change = Math.round((currentWeight - prevWeight) * 10) / 10;
    }

    return {
      ...entry,
      change,
    };
  });
}

// Get today's weight entry
export async function getTodayWeight(userId: string): Promise<WeightEntry | null> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('body_weight_log')
    .select('*')
    .eq('user_id', userId)
    .eq('logged_at', today)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found
    throw error;
  }

  return data || null;
}

// Update a weight entry
export async function updateWeight(
  id: string,
  weight: number,
  notes?: string
): Promise<WeightEntry> {
  const { data, error } = await supabase
    .from('body_weight_log')
    .update({
      weight,
      notes: notes || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete a weight entry
export async function deleteWeight(id: string): Promise<void> {
  const { error } = await supabase
    .from('body_weight_log')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Get weight history for charts (more entries)
export async function getWeightHistory(
  userId: string,
  days: number = 30
): Promise<WeightEntry[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('body_weight_log')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_at', startDate.toISOString().split('T')[0])
    .order('logged_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Get latest weight (most recent entry regardless of date)
export async function getLatestWeight(userId: string): Promise<WeightEntry | null> {
  const { data, error } = await supabase
    .from('body_weight_log')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data || null;
}

// Get weight history with date range
export async function getWeightHistoryRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<WeightEntry[]> {
  const { data, error } = await supabase
    .from('body_weight_log')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_at', startDate.toISOString().split('T')[0])
    .lte('logged_at', endDate.toISOString().split('T')[0])
    .order('logged_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Get all weight entries (for "All" time range)
export async function getAllWeights(userId: string): Promise<WeightEntry[]> {
  const { data, error } = await supabase
    .from('body_weight_log')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Weight stats interface
export interface WeightStats {
  currentWeight: number;
  startingWeight: number;
  totalChange: number;
  average7Day: number;
  average30Day: number;
  weeklyRate: number;
  projectedWeight30Day: number;
  unit: 'lbs' | 'kg';
  totalEntries: number;
  firstEntryDate: string | null;
}

// Get weight statistics
export async function getWeightStats(userId: string): Promise<WeightStats | null> {
  // Get all weights
  const { data: allWeights, error } = await supabase
    .from('body_weight_log')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: true });

  if (error) throw error;
  if (!allWeights || allWeights.length === 0) return null;

  const weights = allWeights as WeightEntry[];
  const latestUnit = weights[weights.length - 1].weight_unit;

  // Convert all weights to the same unit as latest
  const normalizedWeights = weights.map(w => {
    let weight = w.weight;
    if (w.weight_unit !== latestUnit) {
      if (latestUnit === 'kg' && w.weight_unit === 'lbs') {
        weight = weight * 0.453592;
      } else if (latestUnit === 'lbs' && w.weight_unit === 'kg') {
        weight = weight * 2.20462;
      }
    }
    return { date: w.logged_at, weight };
  });

  // Import calculation functions
  const { 
    calculateAverage, 
    calculateTotalChange, 
    calculateWeeklyChange,
    calculateProjectedWeight,
    filterByDays 
  } = await import('@/lib/utils/weightTrends');

  const currentWeight = normalizedWeights[normalizedWeights.length - 1].weight;
  const startingWeight = normalizedWeights[0].weight;
  const totalChange = calculateTotalChange(normalizedWeights);

  // Get 7-day and 30-day subsets
  const last7Days = filterByDays(normalizedWeights, 7);
  const last30Days = filterByDays(normalizedWeights, 30);

  const average7Day = last7Days.length > 0 ? calculateAverage(last7Days) : currentWeight;
  const average30Day = last30Days.length > 0 ? calculateAverage(last30Days) : currentWeight;

  // Calculate weekly rate and projection (use last 30 days for more accurate trend)
  const trendData = last30Days.length >= 2 ? last30Days : normalizedWeights;
  const weeklyRate = calculateWeeklyChange(trendData);
  const projectedWeight30Day = calculateProjectedWeight(trendData, 30);

  return {
    currentWeight: Math.round(currentWeight * 10) / 10,
    startingWeight: Math.round(startingWeight * 10) / 10,
    totalChange: Math.round(totalChange * 10) / 10,
    average7Day: Math.round(average7Day * 10) / 10,
    average30Day: Math.round(average30Day * 10) / 10,
    weeklyRate,
    projectedWeight30Day,
    unit: latestUnit,
    totalEntries: weights.length,
    firstEntryDate: weights[0].logged_at,
  };
}
