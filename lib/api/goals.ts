import { supabase } from '@/lib/supabase';
import { GoalType } from '@/lib/utils/goalCalculations';

// ============================================
// Types
// ============================================

export interface WeightGoal {
  id: string;
  user_id: string;
  target_weight: number;
  weight_unit: 'lbs' | 'kg';
  target_date: string | null;
  goal_type: GoalType;
  start_weight: number | null;
  start_date: string;
  created_at: string;
  achieved_at: string | null;
}

export interface SetGoalParams {
  targetWeight: number;
  targetDate?: string | null;
  goalType: GoalType;
  startWeight: number;
  weightUnit?: 'lbs' | 'kg';
}

// ============================================
// API Functions
// ============================================

/**
 * Set a new weight goal (replaces existing)
 */
export async function setWeightGoal(
  userId: string,
  params: SetGoalParams
): Promise<WeightGoal> {
  const { targetWeight, targetDate, goalType, startWeight, weightUnit = 'lbs' } = params;

  // First, clear any existing active goals
  await clearGoal(userId);

  // Create new goal
  const { data, error } = await supabase
    .from('weight_goals')
    .insert({
      user_id: userId,
      target_weight: targetWeight,
      weight_unit: weightUnit,
      target_date: targetDate || null,
      goal_type: goalType,
      start_weight: startWeight,
      start_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get current active weight goal
 */
export async function getWeightGoal(userId: string): Promise<WeightGoal | null> {
  const { data, error } = await supabase
    .from('weight_goals')
    .select('*')
    .eq('user_id', userId)
    .is('achieved_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data || null;
}

/**
 * Update an existing goal
 */
export async function updateWeightGoal(
  goalId: string,
  updates: Partial<Pick<WeightGoal, 'target_weight' | 'target_date' | 'goal_type'>>
): Promise<WeightGoal> {
  const { data, error } = await supabase
    .from('weight_goals')
    .update(updates)
    .eq('id', goalId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark goal as achieved
 */
export async function achieveGoal(goalId: string): Promise<void> {
  const { error } = await supabase
    .from('weight_goals')
    .update({ achieved_at: new Date().toISOString() })
    .eq('id', goalId);

  if (error) throw error;
}

/**
 * Clear/delete current goal
 */
export async function clearGoal(userId: string): Promise<void> {
  const { error } = await supabase
    .from('weight_goals')
    .delete()
    .eq('user_id', userId)
    .is('achieved_at', null);

  if (error) throw error;
}

/**
 * Get goal history (achieved goals)
 */
export async function getGoalHistory(userId: string): Promise<WeightGoal[]> {
  const { data, error } = await supabase
    .from('weight_goals')
    .select('*')
    .eq('user_id', userId)
    .not('achieved_at', 'is', null)
    .order('achieved_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Check if user has achieved their goal
 */
export function hasAchievedGoal(
  currentWeight: number,
  targetWeight: number,
  goalType: GoalType,
  tolerance: number = 1 // 1 lb tolerance
): boolean {
  switch (goalType) {
    case 'lose':
      return currentWeight <= targetWeight + tolerance;
    case 'gain':
      return currentWeight >= targetWeight - tolerance;
    case 'maintain':
      return Math.abs(currentWeight - targetWeight) <= tolerance;
    default:
      return false;
  }
}

