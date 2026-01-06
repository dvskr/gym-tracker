// ============================================
// iOS HEALTH SERVICE STUB
// ============================================
// Apple Health integration is not yet implemented
// This stub prevents crashes when health features are accessed on iOS
// All functions return safe default values

import { logger } from '@/lib/utils/logger';

// Health data types (for type compatibility)
export const HEALTH_PERMISSIONS = {
  read: ['HeartRate', 'Steps', 'SleepSession', 'Weight', 'BodyFat'],
  write: ['ExerciseSession', 'ActiveCaloriesBurned', 'Weight', 'BodyFat'],
};

export interface HealthPermissions {
  read: Record<string, boolean>;
  write: Record<string, boolean>;
}

export interface WorkoutData {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  caloriesBurned?: number;
  exerciseType: string;
  notes?: string;
}

export interface WeightData {
  date: Date;
  weightKg: number;
  bodyFatPercent?: number;
}

export interface BodyMeasurementData {
  date: Date;
  heightCm?: number;
  waistCm?: number;
  hipCm?: number;
}

export interface HeartRateReading {
  timestamp: Date;
  bpm: number;
  source?: string;
}

export interface HeartRateStats {
  average: number;
  min: number;
  max: number;
  resting?: number;
  readings: HeartRateReading[];
}

export interface StepData {
  date: Date;
  steps: number;
  source?: string;
}

export interface StepsWeeklySummary {
  totalSteps: number;
  averageSteps: number;
  dailySteps: StepData[];
  goal?: number;
  goalProgress?: number;
}

export interface SleepData {
  date: Date;
  totalMinutes: number;
  sleepStart: Date;
  sleepEnd: Date;
  stages?: {
    awake?: number;
    light?: number;
    deep?: number;
    rem?: number;
  };
}

export interface SleepWeeklySummary {
  averageMinutes: number;
  totalMinutes: number;
  dailySleep: SleepData[];
  averageScore: number;
}

// iOS stub class
class HealthService {
  private isAvailable: boolean = false;
  private hasPermissions: boolean = false;

  async checkAvailability(): Promise<boolean> {
    logger.log('ℹ️ Health integration not yet available on iOS');
    return false;
  }

  async requestPermissions(): Promise<boolean> {
    logger.log('ℹ️ Health permissions not yet available on iOS');
    return false;
  }

  async checkPermissions(): Promise<HealthPermissions> {
    return {
      read: {},
      write: {},
    };
  }

  async readHeartRate(startTime: Date, endTime: Date): Promise<{ value: number; time: Date }[]> {
    return [];
  }

  async readSteps(startTime: Date, endTime: Date): Promise<number> {
    return 0;
  }

  async readSleep(
    startTime: Date,
    endTime: Date
  ): Promise<{ startTime: Date; endTime: Date; duration: number }[]> {
    return [];
  }

  async readWeight(
    startTime: Date,
    endTime: Date
  ): Promise<{ value: number; time: Date; unit: string }[]> {
    return [];
  }

  async saveWorkout(workout: WorkoutData): Promise<boolean> {
    logger.log('ℹ️ Apple Health sync not yet available. Workout saved to app only.');
    return false;
  }

  estimateCalories(durationMinutes: number, exerciseType: number): number {
    const rate = 5; // Default 5 cal/min
    return Math.round(durationMinutes * rate);
  }

  async saveWorkoutsBatch(workouts: WorkoutData[]): Promise<{ success: number; failed: number }> {
    logger.log(`ℹ️ Apple Health sync not yet available. ${workouts.length} workouts saved to app only.`);
    return { success: 0, failed: workouts.length };
  }

  async saveWeight(data: WeightData): Promise<boolean> {
    logger.log('ℹ️ Apple Health sync not yet available. Weight saved to app only.');
    return false;
  }

  async getWeightHistory(startDate: Date, endDate: Date): Promise<WeightData[]> {
    return [];
  }

  async getLatestWeight(): Promise<WeightData | null> {
    return null;
  }

  async saveWeightsBatch(weights: WeightData[]): Promise<{ success: number; failed: number }> {
    return { success: 0, failed: weights.length };
  }

  async saveBodyMeasurements(data: BodyMeasurementData): Promise<boolean> {
    logger.log('ℹ️ Apple Health sync not yet available. Measurements saved to app only.');
    return false;
  }

  async getHeight(): Promise<number | null> {
    return null;
  }

  getSupportedMeasurements(): {
    type: string;
    displayName: string;
    canSync: boolean;
    note?: string;
  }[] {
    return [
      { type: 'weight', displayName: 'Weight', canSync: false, note: 'Coming soon for iOS' },
      { type: 'body_fat', displayName: 'Body Fat %', canSync: false, note: 'Coming soon for iOS' },
      { type: 'height', displayName: 'Height', canSync: false, note: 'Coming soon for iOS' },
    ];
  }

  getSyncableMeasurements(): string[] {
    return [];
  }

  getAppOnlyMeasurements(): string[] {
    return ['Weight', 'Body Fat %', 'Height', 'Chest', 'Biceps', 'Thighs', 'Calves', 'Shoulders', 'Neck', 'Forearms'];
  }

  async getHeartRate(startTime: Date, endTime: Date): Promise<HeartRateStats | null> {
    return null;
  }

  async getRestingHeartRate(): Promise<number | null> {
    return null;
  }

  async getTodayHeartRate(): Promise<HeartRateStats | null> {
    return null;
  }

  getHeartRateZones(age: number): {
    maxHeartRate: number;
    zones: {
      name: string;
      min: number;
      max: number;
      color: string;
    }[];
  } {
    const maxHR = 220 - age;
    return {
      maxHeartRate: maxHR,
      zones: [
        { name: 'Resting', min: 0, max: Math.round(maxHR * 0.5), color: '#64748b' },
        { name: 'Light', min: Math.round(maxHR * 0.5), max: Math.round(maxHR * 0.6), color: '#3b82f6' },
        { name: 'Moderate', min: Math.round(maxHR * 0.6), max: Math.round(maxHR * 0.7), color: '#22c55e' },
        { name: 'Vigorous', min: Math.round(maxHR * 0.7), max: Math.round(maxHR * 0.85), color: '#f59e0b' },
        { name: 'Maximum', min: Math.round(maxHR * 0.85), max: maxHR, color: '#ef4444' },
      ],
    };
  }

  getHeartRateZone(
    bpm: number,
    age: number
  ): { name: string; min: number; max: number; color: string } | null {
    const { zones } = this.getHeartRateZones(age);
    for (const zone of zones) {
      if (bpm >= zone.min && bpm <= zone.max) {
        return zone;
      }
    }
    return null;
  }

  async getSteps(startDate: Date, endDate: Date): Promise<StepData[]> {
    return [];
  }

  async getTodaySteps(): Promise<number> {
    return 0;
  }

  async getWeeklySteps(dailyGoal: number = 10000): Promise<StepsWeeklySummary> {
    return {
      totalSteps: 0,
      averageSteps: 0,
      dailySteps: [],
    };
  }

  async getStepsForDate(date: Date): Promise<number> {
    return 0;
  }

  async isStepGoalMet(goal: number): Promise<boolean> {
    return false;
  }

  async getLastNightSleep(): Promise<SleepData | null> {
    return null;
  }

  async getSleepHistory(startDate: Date, endDate: Date): Promise<SleepData[]> {
    return [];
  }

  async getWeeklySleep(): Promise<SleepWeeklySummary> {
    return {
      averageMinutes: 0,
      totalMinutes: 0,
      dailySleep: [],
      averageScore: 0,
    };
  }

  calculateSleepScore(sleep: SleepData): number {
    const targetMinutes = 480;
    const minMinutes = 420;
    const maxMinutes = 540;

    let durationScore = 0;
    if (sleep.totalMinutes >= minMinutes && sleep.totalMinutes <= maxMinutes) {
      durationScore = 100;
    } else if (sleep.totalMinutes < minMinutes) {
      durationScore = Math.max(0, (sleep.totalMinutes / minMinutes) * 100);
    } else {
      const excess = sleep.totalMinutes - maxMinutes;
      durationScore = Math.max(70, 100 - (excess / 60) * 10);
    }

    return Math.round(durationScore);
  }

  getSleepQuality(score: number): {
    category: 'excellent' | 'good' | 'fair' | 'poor';
    color: string;
    message: string;
  } {
    if (score >= 85) {
      return {
        category: 'excellent',
        color: '#22c55e',
        message: 'Excellent sleep! You should feel well-rested.',
      };
    } else if (score >= 70) {
      return {
        category: 'good',
        color: '#3b82f6',
        message: 'Good sleep. You should have decent energy today.',
      };
    } else if (score >= 50) {
      return {
        category: 'fair',
        color: '#f59e0b',
        message: 'Fair sleep. Consider taking it easier today.',
      };
    } else {
      return {
        category: 'poor',
        color: '#ef4444',
        message: 'Poor sleep. Prioritize rest and recovery today.',
      };
    }
  }

  async shouldSuggestLightWorkout(): Promise<boolean> {
    return false;
  }

  async getRecoveryRecommendation(): Promise<{
    recommendation: 'rest' | 'light' | 'moderate' | 'intense';
    reason: string;
    sleepScore: number;
  }> {
    return {
      recommendation: 'moderate',
      reason: 'No sleep data available',
      sleepScore: 0,
    };
  }

  async writeWeight(weight: number, time: Date, unit: 'kg' | 'lbs' = 'kg'): Promise<boolean> {
    logger.log('ℹ️ Apple Health sync not yet available');
    return false;
  }

  async writeBodyFat(percentage: number, time: Date): Promise<boolean> {
    logger.log('ℹ️ Apple Health sync not yet available');
    return false;
  }

  async openHealthSettings(): Promise<void> {
    logger.log('ℹ️ Apple Health settings not available');
  }

  getIsAvailable(): boolean {
    return false;
  }

  getHasPermissions(): boolean {
    return false;
  }
}

// Singleton instance
export const healthService = new HealthService();
export default healthService;


