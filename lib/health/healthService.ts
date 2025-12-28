// Import runtime functions from react-native-health-connect
import {
  isAvailable,
  requestPermission,
  getGrantedPermissions,
  insertRecords,
  readRecords,
  openHealthConnectSettings,
} from 'react-native-health-connect';
import { Platform } from 'react-native';

// Health data types we need
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
  // Note: Other measurements (chest, arms, legs) are NOT supported by health platforms
  // They will be stored in the app only
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
  goalProgress?: number; // percentage
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

// Map our exercise categories to Health Connect workout types (Android)
export const WORKOUT_TYPE_MAP: Record<string, number> = {
  chest: 13, // Strength training
  back: 13,
  shoulders: 13,
  legs: 13,
  arms: 13,
  core: 13,
  abs: 13,
  full_body: 13,
  cardio: 8, // Cardio
  running: 56, // Running
  cycling: 8, // Cycling
  swimming: 71, // Swimming
  walking: 79, // Walking
  hiit: 13, // High intensity
  yoga: 82, // Yoga
  pilates: 55, // Pilates
  default: 13, // Default to strength training
};

// Apple Health workout types (iOS)
export const HEALTHKIT_WORKOUT_TYPES: Record<string, string> = {
  chest: 'HKWorkoutActivityTypeTraditionalStrengthTraining',
  back: 'HKWorkoutActivityTypeTraditionalStrengthTraining',
  shoulders: 'HKWorkoutActivityTypeTraditionalStrengthTraining',
  legs: 'HKWorkoutActivityTypeTraditionalStrengthTraining',
  arms: 'HKWorkoutActivityTypeTraditionalStrengthTraining',
  core: 'HKWorkoutActivityTypeCoreTraining',
  abs: 'HKWorkoutActivityTypeCoreTraining',
  full_body: 'HKWorkoutActivityTypeTraditionalStrengthTraining',
  cardio: 'HKWorkoutActivityTypeCardio',
  running: 'HKWorkoutActivityTypeRunning',
  cycling: 'HKWorkoutActivityTypeCycling',
  swimming: 'HKWorkoutActivityTypeSwimming',
  walking: 'HKWorkoutActivityTypeWalking',
  hiit: 'HKWorkoutActivityTypeHighIntensityIntervalTraining',
  yoga: 'HKWorkoutActivityTypeYoga',
  pilates: 'HKWorkoutActivityTypePilates',
  flexibility: 'HKWorkoutActivityTypeFlexibility',
  default: 'HKWorkoutActivityTypeTraditionalStrengthTraining',
};

// Calories per minute estimates by workout type
const CALORIES_PER_MINUTE: Record<string, number> = {
  13: 5, // Strength training
  56: 10, // Running
  8: 8, // Cardio/Cycling
  71: 9, // Swimming
  79: 4, // Walking
  82: 3, // Yoga
  default: 5,
};

class HealthService {
  private isAvailable: boolean = false;
  private hasPermissions: boolean = false;

  /**
   * Check if health features are available on this device
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const available = await isAvailable();
      this.isAvailable = available;
      console.log(`📱 Health Connect available: ${available}`);
      return available;
    } catch (error) {
      console.error('❌ Health not available:', error);
      return false;
    }
  }

  /**
   * Request health permissions from user
   */
  async requestPermissions(): Promise<boolean> {
    if (!this.isAvailable) {
      await this.checkAvailability();
    }

    if (!this.isAvailable) {
      console.log('⚠️ Health Connect not available on this device');
      return false;
    }

    try {
      console.log('🔐 Requesting health permissions...');

      const granted = await requestPermission([
        // Read permissions
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'SleepSession' },
        { accessType: 'read', recordType: 'Weight' },
        { accessType: 'read', recordType: 'BodyFat' },
        // Write permissions
        { accessType: 'write', recordType: 'ExerciseSession' },
        { accessType: 'write', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'write', recordType: 'Weight' },
        { accessType: 'write', recordType: 'BodyFat' },
      ]);

      this.hasPermissions = granted;
      console.log(`✅ Health permissions granted: ${granted}`);
      return granted;
    } catch (error) {
      console.error('❌ Permission request failed:', error);
      return false;
    }
  }

  /**
   * Check current permission status for all data types
   */
  async checkPermissions(): Promise<HealthPermissions> {
    const permissions: HealthPermissions = {
      read: {},
      write: {},
    };

    try {
      const grantedPermissions = await getGrantedPermissions();

      // Check read permissions
      for (const type of HEALTH_PERMISSIONS.read) {
        permissions.read[type] = grantedPermissions.some(
          (p) => p.recordType === type && p.accessType === 'read'
        );
      }

      // Check write permissions
      for (const type of HEALTH_PERMISSIONS.write) {
        permissions.write[type] = grantedPermissions.some(
          (p) => p.recordType === type && p.accessType === 'write'
        );
      }

      console.log('📋 Current permissions:', permissions);
    } catch (error) {
      console.error('❌ Check permissions failed:', error);
    }

    return permissions;
  }

  /**
   * Read heart rate data for a date range
   */
  async readHeartRate(
    startTime: Date,
    endTime: Date
  ): Promise<{ value: number; time: Date }[]> {
    try {
      const data = await readRecords('HeartRate', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      });

      return data.map((record: any) => ({
        value: record.beatsPerMinute,
        time: new Date(record.time),
      }));
    } catch (error) {
      console.error('❌ Failed to read heart rate:', error);
      return [];
    }
  }

  /**
   * Read step count for a date range
   */
  async readSteps(startTime: Date, endTime: Date): Promise<number> {
    try {
      const data = await readRecords('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      });

      return data.reduce((total: number, record: any) => total + record.count, 0);
    } catch (error) {
      console.error('❌ Failed to read steps:', error);
      return 0;
    }
  }

  /**
   * Read sleep sessions for a date range
   */
  async readSleep(
    startTime: Date,
    endTime: Date
  ): Promise<{ startTime: Date; endTime: Date; duration: number }[]> {
    try {
      const data = await readRecords('SleepSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      });

      return data.map((record: any) => ({
        startTime: new Date(record.startTime),
        endTime: new Date(record.endTime),
        duration: record.endTime - record.startTime, // milliseconds
      }));
    } catch (error) {
      console.error('❌ Failed to read sleep:', error);
      return [];
    }
  }

  /**
   * Read weight records for a date range
   */
  async readWeight(
    startTime: Date,
    endTime: Date
  ): Promise<{ value: number; time: Date; unit: string }[]> {
    try {
      const data = await readRecords('Weight', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      });

      return data.map((record: any) => ({
        value: record.weight.inKilograms,
        time: new Date(record.time),
        unit: 'kg',
      }));
    } catch (error) {
      console.error('❌ Failed to read weight:', error);
      return [];
    }
  }

  /**
   * Save workout to health platform
   */
  async saveWorkout(workout: WorkoutData): Promise<boolean> {
    if (!this.hasPermissions) {
      console.warn('⚠️ No health permissions to save workout');
      return false;
    }

    try {
      console.log(`💪 Saving workout to health platform: ${workout.name}`);

      // Map workout type based on platform
      const exerciseType = this.mapWorkoutType(workout.exerciseType);

      // Calculate or use provided calories
      const calories =
        workout.caloriesBurned ||
        this.estimateCalories(
          workout.durationMinutes,
          typeof exerciseType === 'number' ? exerciseType : 13
        );

      if (Platform.OS === 'ios') {
        // iOS HealthKit
        await this.saveWorkoutToHealthKit(workout, exerciseType as string, calories);
      } else {
        // Android Health Connect
        await this.saveWorkoutToHealthConnect(workout, exerciseType as number, calories);
      }

      console.log('✅ Workout saved to health platform successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to save workout to health:', error);
      return false;
    }
  }

  /**
   * Save workout to HealthKit (iOS)
   */
  private async saveWorkoutToHealthKit(
    workout: WorkoutData,
    activityType: string,
    calories: number
  ): Promise<void> {
    // Create exercise session
    await insertRecords([
      {
        recordType: 'ExerciseSession',
        startTime: workout.startTime.toISOString(),
        endTime: workout.endTime.toISOString(),
        exerciseType: activityType,
        title: workout.name || 'Strength Training',
        notes: workout.notes || undefined,
      },
    ]);

    console.log(`✅ HealthKit exercise session written: ${activityType}`);

    // Save calories
    if (calories > 0) {
      await insertRecords([
        {
          recordType: 'ActiveCaloriesBurned',
          startTime: workout.startTime.toISOString(),
          endTime: workout.endTime.toISOString(),
          energy: {
            value: calories,
            unit: 'kilocalories',
          },
        },
      ]);

      console.log(`✅ HealthKit calories written: ${calories} kcal`);
    }
  }

  /**
   * Save workout to Health Connect (Android)
   */
  private async saveWorkoutToHealthConnect(
    workout: WorkoutData,
    exerciseType: number,
    calories: number
  ): Promise<void> {
    // Create exercise session
    await insertRecords([
      {
        recordType: 'ExerciseSession',
        startTime: workout.startTime.toISOString(),
        endTime: workout.endTime.toISOString(),
        exerciseType,
        title: workout.name || 'Strength Training',
        notes: workout.notes || undefined,
      },
    ]);

    console.log(`✅ Health Connect exercise session written: Type ${exerciseType}`);

    // Save calories
    if (calories > 0) {
      await insertRecords([
        {
          recordType: 'ActiveCaloriesBurned',
          startTime: workout.startTime.toISOString(),
          endTime: workout.endTime.toISOString(),
          energy: {
            value: calories,
            unit: 'kilocalories',
          },
        },
      ]);

      console.log(`✅ Health Connect calories written: ${calories} kcal`);
    }
  }

  /**
   * Estimate calories burned based on duration and workout type
   */
  estimateCalories(durationMinutes: number, exerciseType: number): number {
    const rate = CALORIES_PER_MINUTE[exerciseType] || CALORIES_PER_MINUTE.default;
    const estimated = Math.round(durationMinutes * rate);
    console.log(
      `📊 Estimated calories: ${estimated} kcal (${durationMinutes}min @ ${rate}cal/min)`
    );
    return estimated;
  }

  /**
   * Map workout type string to platform-specific exercise type
   */
  private mapWorkoutType(category: string): number | string {
    const normalized = category.toLowerCase().trim();

    if (Platform.OS === 'ios') {
      // Return HealthKit workout type string
      return HEALTHKIT_WORKOUT_TYPES[normalized] || HEALTHKIT_WORKOUT_TYPES.default;
    } else {
      // Return Health Connect workout type number
      return WORKOUT_TYPE_MAP[normalized] || WORKOUT_TYPE_MAP.default;
    }
  }

  /**
   * Batch save multiple workouts (useful for backfilling)
   */
  async saveWorkoutsBatch(workouts: WorkoutData[]): Promise<{ success: number; failed: number }> {
    console.log(`📦 Batch saving ${workouts.length} workouts...`);

    let success = 0;
    let failed = 0;

    for (const workout of workouts) {
      const saved = await this.saveWorkout(workout);
      if (saved) {
        success++;
      } else {
        failed++;
      }
    }

    console.log(`✅ Batch save complete: ${success} success, ${failed} failed`);

    return { success, failed };
  }

  /**
   * Save weight to health platform
   */
  async saveWeight(data: WeightData): Promise<boolean> {
    if (!this.hasPermissions) {
      console.warn('⚠️ No health permissions to save weight');
      return false;
    }

    try {
      console.log(`⚖️ Saving weight to health platform: ${data.weightKg} kg`);

      // Save weight record
      await insertRecords([
        {
          recordType: 'Weight',
          time: data.date.toISOString(),
          weight: {
            value: data.weightKg,
            unit: 'kilograms',
          },
        },
      ]);

      console.log('✅ Weight written to health platform');

      // Save body fat if available
      if (data.bodyFatPercent && data.bodyFatPercent > 0 && data.bodyFatPercent < 100) {
        await insertRecords([
          {
            recordType: 'BodyFat',
            time: data.date.toISOString(),
            percentage: data.bodyFatPercent,
          },
        ]);

        console.log(`✅ Body fat written: ${data.bodyFatPercent}%`);
      }

      console.log('✅ Weight data saved to health platform successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to save weight to health:', error);
      return false;
    }
  }

  /**
   * Read weight history from health platform
   */
  async getWeightHistory(startDate: Date, endDate: Date): Promise<WeightData[]> {
    if (!this.hasPermissions) {
      console.warn('⚠️ No health permissions to read weight');
      return [];
    }

    try {
      console.log(
        `📊 Reading weight history from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
      );

      const records = await readRecords('Weight', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      console.log(`✅ Retrieved ${records.length} weight records from health platform`);

      // Try to get body fat data for the same period
      let bodyFatRecords: any[] = [];
      try {
        bodyFatRecords = await readRecords('BodyFat', {
          timeRangeFilter: {
            operator: 'between',
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
          },
        });
        console.log(`✅ Retrieved ${bodyFatRecords.length} body fat records`);
      } catch (error) {
        console.warn('⚠️ Could not read body fat data:', error);
      }

      // Create a map of dates to body fat percentages
      const bodyFatMap = new Map<string, number>();
      bodyFatRecords.forEach((record) => {
        const dateKey = new Date(record.time).toISOString().split('T')[0];
        bodyFatMap.set(dateKey, record.percentage);
      });

      // Combine weight and body fat data
      const weightData: WeightData[] = records.map((record) => {
        const date = new Date(record.time);
        const dateKey = date.toISOString().split('T')[0];

        return {
          date,
          weightKg: record.weight.value,
          bodyFatPercent: bodyFatMap.get(dateKey),
        };
      });

      return weightData;
    } catch (error) {
      console.error('❌ Failed to read weight history from health:', error);
      return [];
    }
  }

  /**
   * Get latest weight from health platform
   */
  async getLatestWeight(): Promise<WeightData | null> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const weights = await this.getWeightHistory(thirtyDaysAgo, new Date());

      if (weights.length === 0) {
        return null;
      }

      // Sort by date descending and return most recent
      weights.sort((a, b) => b.date.getTime() - a.date.getTime());
      return weights[0];
    } catch (error) {
      console.error('❌ Failed to get latest weight:', error);
      return null;
    }
  }

  /**
   * Batch save multiple weight entries
   */
  async saveWeightsBatch(weights: WeightData[]): Promise<{ success: number; failed: number }> {
    console.log(`📦 Batch saving ${weights.length} weight entries...`);

    let success = 0;
    let failed = 0;

    for (const weight of weights) {
      const saved = await this.saveWeight(weight);
      if (saved) {
        success++;
      } else {
        failed++;
      }
    }

    console.log(`✅ Batch save complete: ${success} success, ${failed} failed`);

    return { success, failed };
  }

  /**
   * Save body measurements to health platform
   * Note: Only limited measurements are supported by health platforms
   * Supported: Weight, Body Fat %, Height, Waist (iOS only)
   * Not supported: Chest, Arms, Legs, etc.
   */
  async saveBodyMeasurements(data: BodyMeasurementData): Promise<boolean> {
    if (!this.hasPermissions) {
      console.warn('⚠️ No health permissions to save measurements');
      return false;
    }

    try {
      console.log('📏 Saving body measurements to health platform...');

      const records: any[] = [];

      // Height (one-time or rarely updated)
      if (data.heightCm && data.heightCm > 0) {
        records.push({
          recordType: 'Height',
          time: data.date.toISOString(),
          height: {
            value: data.heightCm,
            unit: 'centimeters',
          },
        });
        console.log(`📏 Height: ${data.heightCm} cm`);
      }

      // Platform-specific measurements
      if (Platform.OS === 'ios') {
        // Note: iOS has more measurement types, but expo-health-connect
        // focuses on common cross-platform metrics
        // For iOS-specific measurements, you would need react-native-health

        console.log('ℹ️ iOS additional measurements (waist, hip) require react-native-health');
        console.log('ℹ️ Currently only height is synced via expo-health-connect');
      }

      // Save records if any
      if (records.length > 0) {
        await insertRecords(records);
        console.log(`✅ Saved ${records.length} measurement(s) to health platform`);
        return true;
      } else {
        console.log('ℹ️ No supported measurements to sync');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to save body measurements to health:', error);
      return false;
    }
  }

  /**
   * Get height from health platform
   */
  async getHeight(): Promise<number | null> {
    if (!this.hasPermissions) {
      console.warn('⚠️ No health permissions to read height');
      return null;
    }

    try {
      // Get height from last year (should be relatively static)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const records = await readRecords('Height', {
        timeRangeFilter: {
          operator: 'between',
          startTime: oneYearAgo.toISOString(),
          endTime: new Date().toISOString(),
        },
      });

      if (records.length === 0) {
        return null;
      }

      // Get most recent height
      records.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      const heightCm = records[0].height.value;

      console.log(`📏 Retrieved height: ${heightCm} cm`);
      return heightCm;
    } catch (error) {
      console.error('❌ Failed to read height from health:', error);
      return null;
    }
  }

  /**
   * Get supported measurement types for current platform
   */
  getSupportedMeasurements(): {
    type: string;
    displayName: string;
    canSync: boolean;
    note?: string;
  }[] {
    const measurements = [
      {
        type: 'weight',
        displayName: 'Weight',
        canSync: true,
      },
      {
        type: 'body_fat',
        displayName: 'Body Fat %',
        canSync: true,
      },
      {
        type: 'height',
        displayName: 'Height',
        canSync: true,
      },
    ];

    if (Platform.OS === 'ios') {
      measurements.push(
        {
          type: 'waist',
          displayName: 'Waist Circumference',
          canSync: false,
          note: 'Requires react-native-health library',
        },
        {
          type: 'hip',
          displayName: 'Hip Circumference',
          canSync: false,
          note: 'Requires react-native-health library',
        }
      );
    }

    // Measurements not supported by any health platform
    measurements.push(
      {
        type: 'chest',
        displayName: 'Chest',
        canSync: false,
        note: 'Stored in app only',
      },
      {
        type: 'bicep',
        displayName: 'Biceps',
        canSync: false,
        note: 'Stored in app only',
      },
      {
        type: 'thigh',
        displayName: 'Thighs',
        canSync: false,
        note: 'Stored in app only',
      },
      {
        type: 'calf',
        displayName: 'Calves',
        canSync: false,
        note: 'Stored in app only',
      },
      {
        type: 'shoulders',
        displayName: 'Shoulders',
        canSync: false,
        note: 'Stored in app only',
      },
      {
        type: 'neck',
        displayName: 'Neck',
        canSync: false,
        note: 'Stored in app only',
      },
      {
        type: 'forearm',
        displayName: 'Forearms',
        canSync: false,
        note: 'Stored in app only',
      }
    );

    return measurements;
  }

  /**
   * Get list of measurements that can sync to health platform
   */
  getSyncableMeasurements(): string[] {
    return this.getSupportedMeasurements()
      .filter((m) => m.canSync)
      .map((m) => m.displayName);
  }

  /**
   * Get list of measurements that are app-only
   */
  getAppOnlyMeasurements(): string[] {
    return this.getSupportedMeasurements()
      .filter((m) => !m.canSync && !m.note?.includes('react-native-health'))
      .map((m) => m.displayName);
  }

  /**
   * Read heart rate data for a time period
   */
  async getHeartRate(startTime: Date, endTime: Date): Promise<HeartRateStats | null> {
    if (!this.hasPermissions) {
      console.warn('⚠️ No health permissions to read heart rate');
      return null;
    }

    try {
      console.log(
        `❤️ Reading heart rate from ${startTime.toLocaleTimeString()} to ${endTime.toLocaleTimeString()}`
      );

      const records = await readRecords('HeartRate', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      });

      if (records.length === 0) {
        console.log('ℹ️ No heart rate data found for this period');
        return null;
      }

      console.log(`📊 Retrieved ${records.length} heart rate records`);

      // Flatten all samples from all records
      const readings: HeartRateReading[] = [];

      records.forEach((record) => {
        if (record.samples && Array.isArray(record.samples)) {
          record.samples.forEach((sample: any) => {
            readings.push({
              timestamp: new Date(sample.time),
              bpm: sample.beatsPerMinute,
              source: record.metadata?.dataOrigin?.packageName || 'Unknown',
            });
          });
        } else if (record.beatsPerMinute) {
          // Single reading format
          readings.push({
            timestamp: new Date(record.time),
            bpm: record.beatsPerMinute,
            source: record.metadata?.dataOrigin?.packageName || 'Unknown',
          });
        }
      });

      if (readings.length === 0) {
        console.log('ℹ️ No heart rate readings found in records');
        return null;
      }

      // Calculate statistics
      const bpms = readings.map((r) => r.bpm);
      const average = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length);
      const min = Math.min(...bpms);
      const max = Math.max(...bpms);

      // Try to get resting heart rate for context
      let resting: number | undefined;
      try {
        resting = (await this.getRestingHeartRate()) || undefined;
      } catch (error) {
        console.warn('⚠️ Could not fetch resting heart rate');
      }

      const stats: HeartRateStats = {
        average,
        min,
        max,
        resting,
        readings: readings.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
      };

      console.log(`✅ Heart rate stats: Avg ${average}, Min ${min}, Max ${max}`);

      return stats;
    } catch (error) {
      console.error('❌ Failed to read heart rate:', error);
      return null;
    }
  }

  /**
   * Get resting heart rate (most recent from last 7 days)
   */
  async getRestingHeartRate(): Promise<number | null> {
    if (!this.hasPermissions) {
      console.warn('⚠️ No health permissions to read resting heart rate');
      return null;
    }

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const records = await readRecords('RestingHeartRate', {
        timeRangeFilter: {
          operator: 'between',
          startTime: sevenDaysAgo.toISOString(),
          endTime: new Date().toISOString(),
        },
      });

      if (records.length === 0) {
        return null;
      }

      // Sort by time and get most recent
      const sorted = records.sort(
        (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
      );

      const resting = sorted[0].beatsPerMinute;
      console.log(`💤 Resting heart rate: ${resting} bpm`);

      return resting;
    } catch (error) {
      console.error('❌ Failed to read resting heart rate:', error);
      return null;
    }
  }

  /**
   * Get average heart rate for today
   */
  async getTodayHeartRate(): Promise<HeartRateStats | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const now = new Date();

    return this.getHeartRate(today, now);
  }

  /**
   * Get heart rate zones based on age
   * Returns zone thresholds: [light, moderate, vigorous, maximum]
   */
  getHeartRateZones(age: number): {
    maxHeartRate: number;
    zones: {
      name: string;
      min: number;
      max: number;
      color: string;
    }[];
  } {
    // Calculate max heart rate (220 - age)
    const maxHR = 220 - age;

    return {
      maxHeartRate: maxHR,
      zones: [
        {
          name: 'Resting',
          min: 0,
          max: Math.round(maxHR * 0.5),
          color: '#64748b',
        },
        {
          name: 'Light',
          min: Math.round(maxHR * 0.5),
          max: Math.round(maxHR * 0.6),
          color: '#3b82f6',
        },
        {
          name: 'Moderate',
          min: Math.round(maxHR * 0.6),
          max: Math.round(maxHR * 0.7),
          color: '#22c55e',
        },
        {
          name: 'Vigorous',
          min: Math.round(maxHR * 0.7),
          max: Math.round(maxHR * 0.85),
          color: '#f59e0b',
        },
        {
          name: 'Maximum',
          min: Math.round(maxHR * 0.85),
          max: maxHR,
          color: '#ef4444',
        },
      ],
    };
  }

  /**
   * Determine heart rate zone for a given BPM
   */
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

  /**
   * Get steps for a date range
   */
  async getSteps(startDate: Date, endDate: Date): Promise<StepData[]> {
    if (!this.hasPermissions) {
      console.warn('⚠️ No health permissions to read steps');
      return [];
    }

    try {
      console.log(
        `👣 Reading steps from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
      );

      const records = await readRecords('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      if (records.length === 0) {
        console.log('ℹ️ No step data found for this period');
        return [];
      }

      console.log(`📊 Retrieved ${records.length} step records`);

      // Aggregate steps by day
      const dailySteps = new Map<string, number>();

      records.forEach((record) => {
        const dateKey = new Date(record.startTime).toISOString().split('T')[0];
        const current = dailySteps.get(dateKey) || 0;
        dailySteps.set(dateKey, current + (record.count || 0));
      });

      // Convert to array and sort by date
      const stepData: StepData[] = Array.from(dailySteps.entries())
        .map(([dateStr, steps]) => ({
          date: new Date(dateStr),
          steps,
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      console.log(
        `✅ Aggregated ${stepData.length} days of step data (total: ${stepData.reduce((sum, d) => sum + d.steps, 0).toLocaleString()} steps)`
      );

      return stepData;
    } catch (error) {
      console.error('❌ Failed to read steps:', error);
      return [];
    }
  }

  /**
   * Get today's steps
   */
  async getTodaySteps(): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const steps = await this.getSteps(today, tomorrow);
      const todaySteps = steps[0]?.steps || 0;

      console.log(`👣 Today's steps: ${todaySteps.toLocaleString()}`);

      return todaySteps;
    } catch (error) {
      console.error('❌ Failed to get today\'s steps:', error);
      return 0;
    }
  }

  /**
   * Get this week's steps summary
   */
  async getWeeklySteps(dailyGoal: number = 10000): Promise<StepsWeeklySummary> {
    try {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const steps = await this.getSteps(weekAgo, today);

      const totalSteps = steps.reduce((sum, day) => sum + day.steps, 0);
      const averageSteps = steps.length > 0 ? Math.round(totalSteps / steps.length) : 0;
      const goalProgress = dailyGoal > 0 ? Math.round((averageSteps / dailyGoal) * 100) : 0;

      return {
        totalSteps,
        averageSteps,
        dailySteps: steps,
        goal: dailyGoal,
        goalProgress,
      };
    } catch (error) {
      console.error('❌ Failed to get weekly steps:', error);
      return {
        totalSteps: 0,
        averageSteps: 0,
        dailySteps: [],
      };
    }
  }

  /**
   * Get steps for specific date
   */
  async getStepsForDate(date: Date): Promise<number> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const steps = await this.getSteps(startOfDay, endOfDay);
      return steps[0]?.steps || 0;
    } catch (error) {
      console.error('❌ Failed to get steps for date:', error);
      return 0;
    }
  }

  /**
   * Check if daily step goal is met
   */
  async isStepGoalMet(goal: number): Promise<boolean> {
    const todaySteps = await this.getTodaySteps();
    return todaySteps >= goal;
  }

  /**
   * Get last night's sleep data
   */
  async getLastNightSleep(): Promise<SleepData | null> {
    if (!this.hasPermissions) {
      console.warn('⚠️ No health permissions to read sleep');
      return null;
    }

    try {
      console.log('😴 Reading last night\'s sleep data...');

      // Sleep sessions typically span from evening to next morning
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(18, 0, 0, 0); // 6 PM yesterday

      const today = new Date();
      today.setHours(14, 0, 0, 0); // 2 PM today (to catch late sleepers)

      const records = await readRecords('SleepSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: yesterday.toISOString(),
          endTime: today.toISOString(),
        },
      });

      if (records.length === 0) {
        console.log('ℹ️ No sleep data found for last night');
        return null;
      }

      console.log(`📊 Retrieved ${records.length} sleep session(s)`);

      // Get the main sleep session (longest one)
      const mainSession = records.reduce((longest, current) => {
        const currentDuration =
          new Date(current.endTime).getTime() - new Date(current.startTime).getTime();
        const longestDuration =
          new Date(longest.endTime).getTime() - new Date(longest.startTime).getTime();
        return currentDuration > longestDuration ? current : longest;
      });

      const totalMinutes = Math.round(
        (new Date(mainSession.endTime).getTime() - new Date(mainSession.startTime).getTime()) /
          60000
      );

      const sleepData: SleepData = {
        date: new Date(mainSession.startTime),
        totalMinutes,
        sleepStart: new Date(mainSession.startTime),
        sleepEnd: new Date(mainSession.endTime),
      };

      // Try to get sleep stages if available
      if (mainSession.stages) {
        sleepData.stages = {
          awake: mainSession.stages.awake || 0,
          light: mainSession.stages.light || 0,
          deep: mainSession.stages.deep || 0,
          rem: mainSession.stages.rem || 0,
        };

        console.log(
          `💤 Sleep stages: ${sleepData.stages.deep}m deep, ${sleepData.stages.rem}m REM, ${sleepData.stages.light}m light`
        );
      }

      console.log(
        `😴 Last night's sleep: ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m (${new Date(mainSession.startTime).toLocaleTimeString()} - ${new Date(mainSession.endTime).toLocaleTimeString()})`
      );

      return sleepData;
    } catch (error) {
      console.error('❌ Failed to read sleep data:', error);
      return null;
    }
  }

  /**
   * Get sleep data for a date range
   */
  async getSleepHistory(startDate: Date, endDate: Date): Promise<SleepData[]> {
    if (!this.hasPermissions) {
      console.warn('⚠️ No health permissions to read sleep history');
      return [];
    }

    try {
      console.log(
        `😴 Reading sleep history from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
      );

      const records = await readRecords('SleepSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      if (records.length === 0) {
        console.log('ℹ️ No sleep data found for this period');
        return [];
      }

      // Group by day and take longest session per day
      const dailySleep = new Map<string, SleepData>();

      for (const record of records) {
        const dateKey = new Date(record.startTime).toISOString().split('T')[0];
        const duration =
          new Date(record.endTime).getTime() - new Date(record.startTime).getTime();
        const totalMinutes = Math.round(duration / 60000);

        const existing = dailySleep.get(dateKey);
        if (!existing || totalMinutes > existing.totalMinutes) {
          const sleepData: SleepData = {
            date: new Date(record.startTime),
            totalMinutes,
            sleepStart: new Date(record.startTime),
            sleepEnd: new Date(record.endTime),
          };

          if (record.stages) {
            sleepData.stages = {
              awake: record.stages.awake || 0,
              light: record.stages.light || 0,
              deep: record.stages.deep || 0,
              rem: record.stages.rem || 0,
            };
          }

          dailySleep.set(dateKey, sleepData);
        }
      }

      const sleepArray = Array.from(dailySleep.values()).sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      );

      console.log(`✅ Retrieved ${sleepArray.length} nights of sleep data`);

      return sleepArray;
    } catch (error) {
      console.error('❌ Failed to read sleep history:', error);
      return [];
    }
  }

  /**
   * Get weekly sleep summary
   */
  async getWeeklySleep(): Promise<SleepWeeklySummary> {
    try {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const sleepData = await this.getSleepHistory(weekAgo, today);

      if (sleepData.length === 0) {
        return {
          averageMinutes: 0,
          totalMinutes: 0,
          dailySleep: [],
          averageScore: 0,
        };
      }

      const totalMinutes = sleepData.reduce((sum, night) => sum + night.totalMinutes, 0);
      const averageMinutes = Math.round(totalMinutes / sleepData.length);

      // Calculate average score
      const scores = sleepData.map((sleep) => this.calculateSleepScore(sleep));
      const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);

      return {
        averageMinutes,
        totalMinutes,
        dailySleep: sleepData,
        averageScore,
      };
    } catch (error) {
      console.error('❌ Failed to get weekly sleep summary:', error);
      return {
        averageMinutes: 0,
        totalMinutes: 0,
        dailySleep: [],
        averageScore: 0,
      };
    }
  }

  /**
   * Calculate sleep quality score (0-100)
   */
  calculateSleepScore(sleep: SleepData): number {
    // Target: 7-9 hours (420-540 minutes)
    const targetMinutes = 480; // 8 hours
    const minMinutes = 420; // 7 hours
    const maxMinutes = 540; // 9 hours

    // Duration score (50% weight)
    let durationScore = 0;
    if (sleep.totalMinutes >= minMinutes && sleep.totalMinutes <= maxMinutes) {
      durationScore = 100;
    } else if (sleep.totalMinutes < minMinutes) {
      // Penalty for too little sleep
      durationScore = Math.max(0, (sleep.totalMinutes / minMinutes) * 100);
    } else {
      // Small penalty for too much sleep
      const excess = sleep.totalMinutes - maxMinutes;
      durationScore = Math.max(70, 100 - (excess / 60) * 10);
    }

    // If we have sleep stages, factor them in (50% weight)
    if (sleep.stages) {
      const { deep = 0, rem = 0, light = 0, awake = 0 } = sleep.stages;

      // Calculate restorative sleep percentage (deep + REM)
      const restorativeMinutes = deep + rem;
      const restorativePercent = restorativeMinutes / sleep.totalMinutes;

      // Target: 35-45% restorative sleep
      let restorativeScore = 0;
      if (restorativePercent >= 0.35 && restorativePercent <= 0.45) {
        restorativeScore = 100;
      } else if (restorativePercent < 0.35) {
        restorativeScore = (restorativePercent / 0.35) * 100;
      } else {
        // Too much restorative sleep is unusual
        restorativeScore = Math.max(70, 100 - (restorativePercent - 0.45) * 200);
      }

      // Penalty for excessive awake time (more than 10%)
      const awakePercent = awake / sleep.totalMinutes;
      const awakePenalty = awakePercent > 0.1 ? (awakePercent - 0.1) * 100 : 0;

      // Combine scores
      return Math.max(0, Math.min(100, Math.round(durationScore * 0.5 + restorativeScore * 0.5 - awakePenalty)));
    }

    // Without sleep stages, only use duration
    return Math.round(durationScore);
  }

  /**
   * Get sleep quality category
   */
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

  /**
   * Check if sleep was adequate for workout
   */
  async shouldSuggestLightWorkout(): Promise<boolean> {
    const sleep = await this.getLastNightSleep();

    if (!sleep) {
      return false; // Can't determine, assume normal workout is fine
    }

    // Suggest light workout if:
    // - Less than 6 hours sleep
    // - Sleep score below 50
    const poorSleep = sleep.totalMinutes < 360; // Less than 6 hours
    const lowScore = this.calculateSleepScore(sleep) < 50;

    return poorSleep || lowScore;
  }

  /**
   * Get sleep-based recovery recommendation
   */
  async getRecoveryRecommendation(): Promise<{
    recommendation: 'rest' | 'light' | 'moderate' | 'intense';
    reason: string;
    sleepScore: number;
  }> {
    const sleep = await this.getLastNightSleep();

    if (!sleep) {
      return {
        recommendation: 'moderate',
        reason: 'No sleep data available',
        sleepScore: 0,
      };
    }

    const score = this.calculateSleepScore(sleep);
    const hours = Math.floor(sleep.totalMinutes / 60);

    if (score >= 80) {
      return {
        recommendation: 'intense',
        reason: `Great sleep (${hours}h)! You're ready for an intense workout.`,
        sleepScore: score,
      };
    } else if (score >= 65) {
      return {
        recommendation: 'moderate',
        reason: `Good sleep (${hours}h). Stick to your regular workout plan.`,
        sleepScore: score,
      };
    } else if (score >= 45) {
      return {
        recommendation: 'light',
        reason: `Fair sleep (${hours}h). Consider a lighter workout today.`,
        sleepScore: score,
      };
    } else {
      return {
        recommendation: 'rest',
        reason: `Poor sleep (${hours}h). Focus on recovery and rest today.`,
        sleepScore: score,
      };
    }
  }

  /**
   * Write weight to health platform
   */
  async writeWeight(weight: number, time: Date, unit: 'kg' | 'lbs' = 'kg'): Promise<boolean> {
    try {
      console.log(`⚖️ Writing weight to health platform: ${weight} ${unit}`);

      // Convert to kg if needed
      const weightInKg = unit === 'lbs' ? weight * 0.453592 : weight;

      await insertRecords([
        {
          recordType: 'Weight',
          time: time.toISOString(),
          weight: {
            unit: 'kilograms',
            value: weightInKg,
          },
        },
      ]);

      console.log('✅ Weight written to health platform');
      return true;
    } catch (error) {
      console.error('❌ Failed to write weight:', error);
      return false;
    }
  }

  /**
   * Write body fat percentage to health platform
   */
  async writeBodyFat(percentage: number, time: Date): Promise<boolean> {
    try {
      console.log(`📊 Writing body fat to health platform: ${percentage}%`);

      await insertRecords([
        {
          recordType: 'BodyFat',
          time: time.toISOString(),
          percentage: percentage,
        },
      ]);

      console.log('✅ Body fat written to health platform');
      return true;
    } catch (error) {
      console.error('❌ Failed to write body fat:', error);
      return false;
    }
  }

  /**
   * Open health app settings
   */
  async openHealthSettings(): Promise<void> {
    try {
      await openHealthConnectSettings();
    } catch (error) {
      console.error('❌ Failed to open health settings:', error);
    }
  }

  /**
   * Get current availability status
   */
  getIsAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Get current permission status
   */
  getHasPermissions(): boolean {
    return this.hasPermissions;
  }
}

// Singleton instance
export const healthService = new HealthService();
export default healthService;

