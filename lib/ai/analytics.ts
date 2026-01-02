import { logger } from '@/lib/utils/logger';
/**
 * AI Quality Analytics and Monitoring
 * Tracks AI response quality, validation metrics, and performance
 */

import { supabase } from '@/lib/supabase';

// ==========================================
// TYPES
// ==========================================

/**
 * AI response quality metrics
 */
export interface AIResponseQuality {
  feature: string;                    // 'workout_suggestion', 'form_tips', 'coach_chat', etc.
  userId: string;
  timestamp: Date;
  
  // Specificity metrics
  specificityScore: number;           // 0-100+
  hasSpecificWeight: boolean;
  hasSpecificReps: boolean;
  exercisesMentioned: number;
  hasTimeReference: boolean;
  
  // Exercise validation metrics
  exercisesValidated: number;         // Total exercises suggested
  exercisesFiltered: number;          // Exercises removed (invalid/equipment/injury)
  filterReasons: string[];            // ['invalid_name', 'no_equipment', 'injury']
  
  // Context metrics
  isNewUser: boolean;
  hadWorkoutData: boolean;
  hadInjuries: boolean;
  contextWarnings: string[];          // ['NEW_USER_NO_DATA', 'ACTIVE_INJURIES']
  
  // Response quality
  usedFallback: boolean;              // True if AI failed and fallback used
  wasGeneric: boolean;                // True if specificity score < 50
  responseLength: number;             // Character count
  responseTime: number;               // Milliseconds
  
  // AI model info
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  
  // Optional metadata
  prompt?: string;                    // First 500 chars of prompt
  response?: string;                  // First 500 chars of response
  error?: string;
}

/**
 * Aggregated AI quality stats
 */
export interface AIQualityStats {
  period: 'hour' | 'day' | 'week' | 'month';
  feature?: string;
  
  totalRequests: number;
  successfulRequests: number;
  fallbackCount: number;
  
  avgSpecificityScore: number;
  avgResponseTime: number;
  
  exercisesValidated: number;
  exercisesFiltered: number;
  filterRate: number;                 // % filtered
  
  genericResponseRate: number;        // % with score < 50
  newUserRate: number;                // % of new users
  injuryRate: number;                 // % with active injuries
  
  topFilterReasons: Array<{ reason: string; count: number }>;
  topWarnings: Array<{ warning: string; count: number }>;
}

/**
 * AI quality alert
 */
export interface AIQualityAlert {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

// ==========================================
// MAIN LOGGING FUNCTION
// ==========================================

/**
 * Log AI response quality metrics
 */
export const logAIQuality = async (quality: AIResponseQuality): Promise<void> => {
  try {
    // Insert into database
    const { error } = await supabase
      .from('ai_quality_logs')
      .insert({
        feature: quality.feature,
        user_id: quality.userId,
        timestamp: quality.timestamp.toISOString(),
        
        // Specificity
        specificity_score: quality.specificityScore,
        has_specific_weight: quality.hasSpecificWeight,
        has_specific_reps: quality.hasSpecificReps,
        exercises_mentioned: quality.exercisesMentioned,
        has_time_reference: quality.hasTimeReference,
        
        // Validation
        exercises_validated: quality.exercisesValidated,
        exercises_filtered: quality.exercisesFiltered,
        filter_reasons: quality.filterReasons,
        
        // Context
        is_new_user: quality.isNewUser,
        had_workout_data: quality.hadWorkoutData,
        had_injuries: quality.hadInjuries,
        context_warnings: quality.contextWarnings,
        
        // Quality
        used_fallback: quality.usedFallback,
        was_generic: quality.wasGeneric,
        response_length: quality.responseLength,
        response_time: quality.responseTime,
        
        // Model
        model: quality.model,
        prompt_tokens: quality.promptTokens,
        completion_tokens: quality.completionTokens,
        
        // Metadata
        prompt_preview: quality.prompt?.substring(0, 500),
        response_preview: quality.response?.substring(0, 500),
        error_message: quality.error,
      });
    
    if (error) {
      logger.error('Error logging AI quality:', error);
      return;
    }
    
    // Check for quality alerts
    await checkQualityAlerts(quality);
    
    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      logger.log('�x` AI Quality:', {
        feature: quality.feature,
        specificityScore: quality.specificityScore,
        exercisesFiltered: quality.exercisesFiltered,
        responseTime: `${quality.responseTime}ms`,
        wasGeneric: quality.wasGeneric,
        usedFallback: quality.usedFallback,
      });
    }
  } catch (error) {
    logger.error('Failed to log AI quality:', error);
  }
};

// ==========================================
// QUALITY ALERTS
// ==========================================

/**
 * Check for quality issues and log alerts
 */
async function checkQualityAlerts(quality: AIResponseQuality): Promise<void> {
  const alerts: AIQualityAlert[] = [];
  
  // CRITICAL: Very low specificity for users with data
  if (quality.specificityScore < 30 && quality.hadWorkoutData && !quality.isNewUser) {
    alerts.push({
      severity: 'critical',
      type: 'LOW_SPECIFICITY',
      message: `Very low specificity score (${quality.specificityScore}) for user with workout data`,
      metadata: {
        feature: quality.feature,
        userId: quality.userId,
        score: quality.specificityScore,
      },
      timestamp: new Date(),
    });
  }
  
  // HIGH: Excessive exercise filtering
  if (quality.exercisesValidated > 0 && quality.exercisesFiltered / quality.exercisesValidated > 0.5) {
    alerts.push({
      severity: 'high',
      type: 'HIGH_FILTER_RATE',
      message: `Over 50% of exercises filtered (${quality.exercisesFiltered}/${quality.exercisesValidated})`,
      metadata: {
        feature: quality.feature,
        userId: quality.userId,
        filterReasons: quality.filterReasons,
      },
      timestamp: new Date(),
    });
  }
  
  // MEDIUM: Fallback used
  if (quality.usedFallback) {
    alerts.push({
      severity: 'medium',
      type: 'FALLBACK_USED',
      message: `AI failed, fallback used for ${quality.feature}`,
      metadata: {
        feature: quality.feature,
        userId: quality.userId,
        error: quality.error,
      },
      timestamp: new Date(),
    });
  }
  
  // MEDIUM: Slow response
  if (quality.responseTime > 5000) {
    alerts.push({
      severity: 'medium',
      type: 'SLOW_RESPONSE',
      message: `Response took ${quality.responseTime}ms`,
      metadata: {
        feature: quality.feature,
        responseTime: quality.responseTime,
      },
      timestamp: new Date(),
    });
  }
  
  // Log alerts
  if (alerts.length > 0) {
    logger.warn('�a���� AI Quality Alerts:', alerts);
    
    // Insert alerts into database
    await supabase.from('ai_quality_alerts').insert(
      alerts.map(alert => ({
        severity: alert.severity,
        type: alert.type,
        message: alert.message,
        metadata: alert.metadata,
        timestamp: alert.timestamp.toISOString(),
      }))
    );
  }
}

// ==========================================
// QUALITY STATISTICS
// ==========================================

/**
 * Get aggregated quality statistics
 */
export const getAIQualityStats = async (
  period: 'hour' | 'day' | 'week' | 'month',
  feature?: string
): Promise<AIQualityStats | null> => {
  try {
    const since = new Date();
    
    switch (period) {
      case 'hour':
        since.setHours(since.getHours() - 1);
        break;
      case 'day':
        since.setDate(since.getDate() - 1);
        break;
      case 'week':
        since.setDate(since.getDate() - 7);
        break;
      case 'month':
        since.setMonth(since.getMonth() - 1);
        break;
    }
    
    // Build query
    let query = supabase
      .from('ai_quality_logs')
      .select('*')
      .gte('timestamp', since.toISOString());
    
    if (feature) {
      query = query.eq('feature', feature);
    }
    
    const { data, error } = await query;
    
    if (error || !data) {
      logger.error('Error fetching quality stats:', error);
      return null;
    }
    
    // Calculate statistics
    const totalRequests = data.length;
    const successfulRequests = data.filter(d => !d.used_fallback).length;
    const fallbackCount = data.filter(d => d.used_fallback).length;
    
    const avgSpecificityScore = data.reduce((sum, d) => sum + (d.specificity_score || 0), 0) / totalRequests || 0;
    const avgResponseTime = data.reduce((sum, d) => sum + (d.response_time || 0), 0) / totalRequests || 0;
    
    const exercisesValidated = data.reduce((sum, d) => sum + (d.exercises_validated || 0), 0);
    const exercisesFiltered = data.reduce((sum, d) => sum + (d.exercises_filtered || 0), 0);
    const filterRate = exercisesValidated > 0 ? (exercisesFiltered / exercisesValidated) * 100 : 0;
    
    const genericResponseRate = (data.filter(d => d.was_generic).length / totalRequests) * 100 || 0;
    const newUserRate = (data.filter(d => d.is_new_user).length / totalRequests) * 100 || 0;
    const injuryRate = (data.filter(d => d.had_injuries).length / totalRequests) * 100 || 0;
    
    // Top filter reasons
    const filterReasons: Record<string, number> = {};
    data.forEach(d => {
      (d.filter_reasons || []).forEach((reason: string) => {
        filterReasons[reason] = (filterReasons[reason] || 0) + 1;
      });
    });
    
    const topFilterReasons = Object.entries(filterReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Top warnings
    const warnings: Record<string, number> = {};
    data.forEach(d => {
      (d.context_warnings || []).forEach((warning: string) => {
        warnings[warning] = (warnings[warning] || 0) + 1;
      });
    });
    
    const topWarnings = Object.entries(warnings)
      .map(([warning, count]) => ({ warning, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      period,
      feature,
      totalRequests,
      successfulRequests,
      fallbackCount,
      avgSpecificityScore: Math.round(avgSpecificityScore),
      avgResponseTime: Math.round(avgResponseTime),
      exercisesValidated,
      exercisesFiltered,
      filterRate: Math.round(filterRate * 10) / 10,
      genericResponseRate: Math.round(genericResponseRate * 10) / 10,
      newUserRate: Math.round(newUserRate * 10) / 10,
      injuryRate: Math.round(injuryRate * 10) / 10,
      topFilterReasons,
      topWarnings,
    };
  } catch (error) {
    logger.error('Error calculating quality stats:', error);
    return null;
  }
};

// ==========================================
// HELPER: BUILD QUALITY LOG
// ==========================================

/**
 * Helper to build quality log from validation results
 */
export const buildQualityLog = (params: {
  feature: string;
  userId: string;
  startTime: number;
  
  // Specificity check result
  specificityCheck?: {
    score: number;
    isSpecific: boolean;
    details: {
      hasSpecificWeight: boolean;
      hasSpecificReps: boolean;
      mentionedExercises: string[];
      hasTimeReference: boolean;
    };
  };
  
  // Validation result
  validationResult?: {
    exercises: any[];
    wasFiltered: boolean;
    originalCount: number;
  };
  
  // Context
  coachContext?: {
    flags: {
      isNewUser: boolean;
      hasWorkouts: boolean;
      hasInjuries: boolean;
    };
    warnings: string[];
  };
  
  // Response
  response: string;
  usedFallback?: boolean;
  error?: string;
  
  // AI model
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
}): AIResponseQuality => {
  const responseTime = Date.now() - params.startTime;
  
  return {
    feature: params.feature,
    userId: params.userId,
    timestamp: new Date(),
    
    // Specificity
    specificityScore: params.specificityCheck?.score || 0,
    hasSpecificWeight: params.specificityCheck?.details.hasSpecificWeight || false,
    hasSpecificReps: params.specificityCheck?.details.hasSpecificReps || false,
    exercisesMentioned: params.specificityCheck?.details.mentionedExercises.length || 0,
    hasTimeReference: params.specificityCheck?.details.hasTimeReference || false,
    
    // Validation
    exercisesValidated: params.validationResult?.originalCount || 0,
    exercisesFiltered: params.validationResult?.originalCount 
      ? params.validationResult.originalCount - params.validationResult.exercises.length 
      : 0,
    filterReasons: [], // Would need to track this in validation
    
    // Context
    isNewUser: params.coachContext?.flags.isNewUser || false,
    hadWorkoutData: params.coachContext?.flags.hasWorkouts || false,
    hadInjuries: params.coachContext?.flags.hasInjuries || false,
    contextWarnings: params.coachContext?.warnings || [],
    
    // Quality
    usedFallback: params.usedFallback || false,
    wasGeneric: (params.specificityCheck?.score || 0) < 50,
    responseLength: params.response.length,
    responseTime,
    
    // Model
    model: params.model,
    promptTokens: params.promptTokens,
    completionTokens: params.completionTokens,
    
    // Metadata
    response: params.response,
    error: params.error,
  };
};

// ==========================================
// MONITORING DASHBOARD DATA
// ==========================================

/**
 * Get comprehensive monitoring data
 */
export const getMonitoringDashboard = async (): Promise<{
  current: AIQualityStats | null;
  last24h: AIQualityStats | null;
  last7d: AIQualityStats | null;
  recentAlerts: AIQualityAlert[];
  byFeature: Array<{ feature: string; stats: AIQualityStats }>;
}> => {
  const [current, last24h, last7d, alerts] = await Promise.all([
    getAIQualityStats('hour'),
    getAIQualityStats('day'),
    getAIQualityStats('week'),
    getRecentAlerts(20),
  ]);
  
  // Stats by feature
  const features = ['workout_suggestion', 'form_tips', 'coach_chat', 'workout_analysis'];
  const byFeature = await Promise.all(
    features.map(async feature => ({
      feature,
      stats: await getAIQualityStats('day', feature) as AIQualityStats,
    }))
  );
  
  return {
    current,
    last24h,
    last7d,
    recentAlerts: alerts,
    byFeature: byFeature.filter(f => f.stats !== null),
  };
};

/**
 * Get recent quality alerts
 */
async function getRecentAlerts(limit: number = 20): Promise<AIQualityAlert[]> {
  const { data, error } = await supabase
    .from('ai_quality_alerts')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);
  
  if (error || !data) {
    return [];
  }
  
  return data.map(d => ({
    severity: d.severity,
    type: d.type,
    message: d.message,
    metadata: d.metadata,
    timestamp: new Date(d.timestamp),
  }));
}

