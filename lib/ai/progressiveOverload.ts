import { supabase } from '@/lib/supabase';

export interface SetRecommendation {
  weight: number;
  reps: number;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  progressType?: 'weight' | 'reps' | 'maintain';
}

interface ExerciseHistory {
  exerciseId: string;
  exerciseName: string;
  lastSets: { weight: number; reps: number; date: string; setNumber: number }[];
  personalRecord: { weight: number; reps: number } | null;
  recentSessions: number; // Number of times done recently
}

interface SessionData {
  date: string;
  sets: { weight: number; reps: number; setNumber: number }[];
}

class ProgressiveOverloadService {
  /**
   * Get weight/rep recommendation for next set based on history
   */
  async getRecommendation(
    userId: string,
    exerciseId: string,
    exerciseName: string,
    setNumber: number,
    targetReps?: number
  ): Promise<SetRecommendation> {
    try {
      const history = await this.getExerciseHistory(userId, exerciseId, exerciseName);
      
      // Not enough history - return starter recommendation
      if (history.lastSets.length < 2) {
        return {
          weight: 0,
          reps: targetReps || 10,
          reasoning: 'Start with a comfortable weight to establish your baseline',
          confidence: 'low',
          progressType: 'maintain',
        };
      }

      // Calculate recommendation using progressive overload principles
      return this.calculateRecommendation(history, setNumber, targetReps);
    } catch (error) {
      console.error('Failed to get recommendation:', error);
      return this.getDefaultRecommendation(targetReps);
    }
  }

  /**
   * Calculate recommendation based on exercise history
   */
  private calculateRecommendation(
    history: ExerciseHistory,
    setNumber: number,
    targetReps?: number
  ): SetRecommendation {
    const sessions = this.groupSetsBySession(history.lastSets);
    
    if (sessions.length === 0) {
      return this.getDefaultRecommendation(targetReps);
    }

    // Get the most recent session and the one before
    const lastSession = sessions[0];
    const secondLastSession = sessions[1];
    
    // Find matching set number from last session
    const lastMatchingSet = lastSession.sets.find(s => s.setNumber === setNumber);
    const secondLastMatchingSet = secondLastSession?.sets.find(s => s.setNumber === setNumber);

    if (!lastMatchingSet) {
      // No matching set number, use average from last session
      const avgWeight = this.getAverageWeight(lastSession.sets);
      const avgReps = this.getAverageReps(lastSession.sets);
      
      return {
        weight: avgWeight,
        reps: targetReps || avgReps,
        reasoning: `Based on your last session average: ${avgWeight}lbs × ${avgReps} reps`,
        confidence: 'medium',
        progressType: 'maintain',
      };
    }

    // Base recommendation on last matching set
    let suggestedWeight = lastMatchingSet.weight;
    let suggestedReps = targetReps || lastMatchingSet.reps;
    let reasoning = '';
    let confidence: 'high' | 'medium' | 'low' = 'high';
    let progressType: 'weight' | 'reps' | 'maintain' = 'maintain';

    // Check if user hit target reps consistently
    const targetRepsToHit = targetReps || 10;
    const hitTargetLastTime = lastMatchingSet.reps >= targetRepsToHit;

    if (hitTargetLastTime && secondLastMatchingSet) {
      // Check if they've been at this weight for 2+ sessions
      if (lastMatchingSet.weight === secondLastMatchingSet.weight) {
        const hitTargetPreviously = secondLastMatchingSet.reps >= targetRepsToHit;
        
        if (hitTargetPreviously) {
          // Hit target reps at this weight for 2 sessions → increase weight
          const increment = this.getWeightIncrement(suggestedWeight);
          suggestedWeight += increment;
          progressType = 'weight';
          reasoning = `You hit ${lastMatchingSet.reps} reps at ${lastMatchingSet.weight}lbs for 2+ sessions. Time to add ${increment}lbs! 💪`;
        } else {
          // Hit target this time but not last time → maintain
          progressType = 'maintain';
          reasoning = `Great progress! You hit ${lastMatchingSet.reps} reps. Try to match or beat this at ${suggestedWeight}lbs.`;
        }
      } else {
        // Recently increased weight → maintain
        progressType = 'maintain';
        reasoning = `You recently increased to ${suggestedWeight}lbs. Aim for ${targetRepsToHit}+ reps to solidify this weight.`;
      }
    } else if (lastMatchingSet.reps < targetRepsToHit) {
      // Didn't hit target reps → try to add reps
      progressType = 'reps';
      const repsToAdd = Math.min(2, targetRepsToHit - lastMatchingSet.reps);
      suggestedReps = lastMatchingSet.reps + repsToAdd;
      reasoning = `Last time: ${lastMatchingSet.weight}lbs × ${lastMatchingSet.reps}. Try for ${suggestedReps}+ reps today! 📈`;
    } else {
      // Hit target but no history to compare → maintain
      progressType = 'maintain';
      reasoning = `Last time: ${lastMatchingSet.weight}lbs × ${lastMatchingSet.reps}. Aim to match or beat this!`;
      confidence = 'medium';
    }

    // Adjust for set number (later sets typically need less weight due to fatigue)
    if (setNumber > 3) {
      const fatigueAdjustment = this.getFatigueAdjustment(suggestedWeight, setNumber);
      if (fatigueAdjustment > 0) {
        suggestedWeight -= fatigueAdjustment;
        reasoning += ` (Set ${setNumber}: -${fatigueAdjustment}lbs for fatigue)`;
      }
    }

    // Check against PR if available
    if (history.personalRecord) {
      const { weight: prWeight, reps: prReps } = history.personalRecord;
      if (suggestedWeight > prWeight || (suggestedWeight === prWeight && suggestedReps > prReps)) {
        reasoning += ` 🏆 This would be a new PR! (Current: ${prWeight}lbs × ${prReps})`;
      }
    }

    return {
      weight: Math.round(suggestedWeight * 2) / 2, // Round to nearest 0.5
      reps: suggestedReps,
      reasoning,
      confidence,
      progressType,
    };
  }

  /**
   * Group sets by workout session (same date)
   */
  private groupSetsBySession(sets: ExerciseHistory['lastSets']): SessionData[] {
    const sessionMap = new Map<string, SessionData>();

    for (const set of sets) {
      const dateKey = set.date.split('T')[0]; // Group by day
      
      if (!sessionMap.has(dateKey)) {
        sessionMap.set(dateKey, {
          date: dateKey,
          sets: [],
        });
      }
      
      sessionMap.get(dateKey)!.sets.push({
        weight: set.weight,
        reps: set.reps,
        setNumber: set.setNumber,
      });
    }

    // Sort by date descending
    return Array.from(sessionMap.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  /**
   * Calculate smart weight increment based on current weight
   */
  private getWeightIncrement(currentWeight: number): number {
    if (currentWeight < 50) return 2.5;   // Very light: +2.5 lbs
    if (currentWeight < 100) return 5;    // Light: +5 lbs
    if (currentWeight < 200) return 5;    // Medium: +5 lbs
    if (currentWeight < 300) return 10;   // Heavy: +10 lbs
    return 10;                            // Very heavy: +10 lbs
  }

  /**
   * Calculate fatigue adjustment for later sets
   */
  private getFatigueAdjustment(weight: number, setNumber: number): number {
    if (setNumber <= 3) return 0;
    
    // Reduce weight by small percentage for sets 4+
    const reductionPercent = (setNumber - 3) * 0.025; // 2.5% per set after 3rd
    const reduction = weight * reductionPercent;
    
    // Round to nearest 2.5 lbs
    return Math.round(reduction / 2.5) * 2.5;
  }

  /**
   * Get average weight from a set of sets
   */
  private getAverageWeight(sets: { weight: number }[]): number {
    if (sets.length === 0) return 0;
    const sum = sets.reduce((acc, s) => acc + s.weight, 0);
    return Math.round((sum / sets.length) * 2) / 2; // Round to nearest 0.5
  }

  /**
   * Get average reps from a set of sets
   */
  private getAverageReps(sets: { reps: number }[]): number {
    if (sets.length === 0) return 10;
    const sum = sets.reduce((acc, s) => acc + s.reps, 0);
    return Math.round(sum / sets.length);
  }

  /**
   * Default recommendation when no data available
   */
  private getDefaultRecommendation(targetReps?: number): SetRecommendation {
    return {
      weight: 0,
      reps: targetReps || 10,
      reasoning: 'Start with a weight that feels challenging for your target reps',
      confidence: 'low',
      progressType: 'maintain',
    };
  }

  /**
   * Get exercise history from database
   */
  private async getExerciseHistory(
    userId: string,
    exerciseId: string,
    exerciseName: string
  ): Promise<ExerciseHistory> {
    // Get last 30 days of sets for this exercise
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: sets, error } = await supabase
      .from('workout_sets')
      .select(`
        weight,
        reps,
        set_number,
        created_at,
        workout_exercises!inner(
          exercise_id,
          workouts!inner(
            user_id,
            created_at
          )
        )
      `)
      .eq('workout_exercises.exercise_id', exerciseId)
      .eq('workout_exercises.workouts.user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching exercise history:', error);
    }

    // Get personal record
    const { data: pr } = await supabase
      .from('personal_records')
      .select('weight, reps')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .eq('record_type', 'weight')
      .single();

    // Count recent sessions
    const uniqueDates = new Set(sets?.map(s => s.created_at.split('T')[0]) || []);

    return {
      exerciseId,
      exerciseName,
      lastSets: (sets || []).map(s => ({
        weight: s.weight,
        reps: s.reps,
        setNumber: s.set_number,
        date: s.created_at,
      })),
      personalRecord: pr ? { weight: pr.weight, reps: pr.reps } : null,
      recentSessions: uniqueDates.size,
    };
  }

  /**
   * Get multiple recommendations at once (for pre-filling a whole exercise)
   */
  async getMultiSetRecommendations(
    userId: string,
    exerciseId: string,
    exerciseName: string,
    numSets: number,
    targetReps?: number
  ): Promise<SetRecommendation[]> {
    const recommendations: SetRecommendation[] = [];

    for (let i = 1; i <= numSets; i++) {
      const rec = await this.getRecommendation(
        userId,
        exerciseId,
        exerciseName,
        i,
        targetReps
      );
      recommendations.push(rec);
    }

    return recommendations;
  }
}

export const progressiveOverloadService = new ProgressiveOverloadService();

