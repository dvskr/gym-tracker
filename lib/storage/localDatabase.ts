import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/utils/logger';
import type { Exercise } from '@/lib/types/common';

// Storage keys
const STORAGE_KEYS = {
  WORKOUTS: '@gym/workouts',
  TEMPLATES: '@gym/templates',
  EXERCISES: '@gym/exercises',
  WEIGHT_LOG: '@gym/weight_log',
  MEASUREMENTS: '@gym/measurements',
  PERSONAL_RECORDS: '@gym/personal_records',
  SYNC_QUEUE: '@gym/sync_queue',
  LAST_SYNC: '@gym/last_sync',
  PROFILE: '@gym/profile',
} as const;

export interface SyncOperation<T = unknown> {
  id: string;
  table: string;
  operation: 'create' | 'update' | 'delete';
  data: T;
  timestamp: number;
  attempts: number;
  error?: string;
}

export interface LocalWorkout {
  id: string;
  user_id: string;
  name?: string;
  notes?: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  total_volume?: number;
  total_sets?: number;
  total_reps?: number;
  rating?: number;
  template_id?: string;
  created_at: string;
  _synced?: boolean;
  _local_only?: boolean;
}

export interface LocalTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  target_muscles?: string[];
  estimated_duration?: number;
  times_used?: number;
  last_used_at?: string;
  is_archived?: boolean;
  created_at: string;
  updated_at?: string;
  _synced?: boolean;
}

export interface WeightEntry {
  id: string;
  user_id: string;
  logged_at: string;
  weight: number;
  weight_unit: string;
  notes?: string;
  created_at: string;
  _synced?: boolean;
}

export interface Measurement {
  id: string;
  user_id: string;
  measured_at: string;
  weight?: number;
  body_fat_percentage?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  bicep_left?: number;
  bicep_right?: number;
  thigh_left?: number;
  thigh_right?: number;
  calf_left?: number;
  calf_right?: number;
  shoulders?: number;
  neck?: number;
  forearm_left?: number;
  forearm_right?: number;
  notes?: string;
  unit?: string;
  created_at: string;
  _synced?: boolean;
}

export interface PersonalRecord {
  id: string;
  user_id: string;
  exercise_id: string;
  exercise_name: string;
  weight: number;
  weight_unit: string;
  reps: number;
  achieved_at: string;
  created_at: string;
  _synced?: boolean;
}

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  fitness_level?: string;
  goals?: string[];
  preferred_units?: 'imperial' | 'metric';
  created_at: string;
  updated_at?: string;
  [key: string]: unknown;
}

interface ExerciseCache {
  data: Exercise[];
  cachedAt: number;
}

interface LastSyncData {
  [table: string]: number;
}

class LocalDatabase {
  // Generic Methods
  async saveLocally<T>(key: string, data: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(data);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
 logger.error(`Error saving to ${key}:`, error);
      throw error;
    }
  }

  async getLocal<T>(key: string): Promise<T[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (error) {
 logger.error(`Error reading from ${key}:`, error);
      return [];
    }
  }

  async clearLocal(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
 logger.error(`Error clearing ${key}:`, error);
      throw error;
    }
  }

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    } catch (error) {
 logger.error('Error clearing all data:', error);
      throw error;
    }
  }

  // Workouts
  async saveWorkoutLocally(workout: LocalWorkout): Promise<void> {
    const workouts = await this.getLocalWorkouts();
    const existingIndex = workouts.findIndex((w) => w.id === workout.id);
    
    if (existingIndex >= 0) {
      workouts[existingIndex] = { ...workout, _synced: false };
    } else {
      workouts.push({ ...workout, _synced: false, _local_only: true });
    }
    
    await this.saveLocally(STORAGE_KEYS.WORKOUTS, workouts);
    
    // Add to sync queue
    await this.addToSyncQueue({
      id: `workout-${workout.id}-${Date.now()}`,
      table: 'workouts',
      operation: existingIndex >= 0 ? 'update' : 'create',
      data: workout,
      timestamp: Date.now(),
      attempts: 0,
    });
  }

  async getLocalWorkouts(): Promise<LocalWorkout[]> {
    return this.getLocal(STORAGE_KEYS.WORKOUTS);
  }

  async getLocalWorkoutById(id: string): Promise<LocalWorkout | null> {
    const workouts = await this.getLocalWorkouts();
    return workouts.find((w) => w.id === id) || null;
  }

  async deleteLocalWorkout(id: string): Promise<void> {
    const workouts = await this.getLocalWorkouts();
    const filtered = workouts.filter((w) => w.id !== id);
    await this.saveLocally(STORAGE_KEYS.WORKOUTS, filtered);
    
    // Add deletion to sync queue
    await this.addToSyncQueue({
      id: `workout-delete-${id}-${Date.now()}`,
      table: 'workouts',
      operation: 'delete',
      data: { id },
      timestamp: Date.now(),
      attempts: 0,
    });
  }

  async markWorkoutAsSynced(id: string): Promise<void> {
    const workouts = await this.getLocalWorkouts();
    const workout = workouts.find((w) => w.id === id);
    if (workout) {
      workout._synced = true;
      workout._local_only = false;
      await this.saveLocally(STORAGE_KEYS.WORKOUTS, workouts);
    }
  }

  // Templates
  async saveTemplateLocally(template: LocalTemplate): Promise<void> {
    const templates = await this.getLocalTemplates();
    const existingIndex = templates.findIndex((t) => t.id === template.id);
    
    if (existingIndex >= 0) {
      templates[existingIndex] = { ...template, _synced: false };
    } else {
      templates.push({ ...template, _synced: false });
    }
    
    await this.saveLocally(STORAGE_KEYS.TEMPLATES, templates);
    
    await this.addToSyncQueue({
      id: `template-${template.id}-${Date.now()}`,
      table: 'workout_templates',
      operation: existingIndex >= 0 ? 'update' : 'create',
      data: template,
      timestamp: Date.now(),
      attempts: 0,
    });
  }

  async getLocalTemplates(): Promise<LocalTemplate[]> {
    return this.getLocal(STORAGE_KEYS.TEMPLATES);
  }

  async deleteLocalTemplate(id: string): Promise<void> {
    const templates = await this.getLocalTemplates();
    const filtered = templates.filter((t) => t.id !== id);
    await this.saveLocally(STORAGE_KEYS.TEMPLATES, filtered);
    
    await this.addToSyncQueue({
      id: `template-delete-${id}-${Date.now()}`,
      table: 'workout_templates',
      operation: 'delete',
      data: { id },
      timestamp: Date.now(),
      attempts: 0,
    });
  }

  // Body Weight Log
  async saveWeightLocally(entry: WeightEntry): Promise<void> {
    const weights = await this.getLocalWeights();
    const existingIndex = weights.findIndex((w) => w.id === entry.id);
    
    if (existingIndex >= 0) {
      weights[existingIndex] = { ...entry, _synced: false };
    } else {
      weights.push({ ...entry, _synced: false });
    }
    
    await this.saveLocally(STORAGE_KEYS.WEIGHT_LOG, weights);
    
    await this.addToSyncQueue({
      id: `weight-${entry.id}-${Date.now()}`,
      table: 'body_weight_log',
      operation: existingIndex >= 0 ? 'update' : 'create',
      data: entry,
      timestamp: Date.now(),
      attempts: 0,
    });
  }

  async getLocalWeights(): Promise<WeightEntry[]> {
    return this.getLocal(STORAGE_KEYS.WEIGHT_LOG);
  }

  async deleteLocalWeight(id: string): Promise<void> {
    const weights = await this.getLocalWeights();
    const filtered = weights.filter((w) => w.id !== id);
    await this.saveLocally(STORAGE_KEYS.WEIGHT_LOG, filtered);
    
    await this.addToSyncQueue({
      id: `weight-delete-${id}-${Date.now()}`,
      table: 'body_weight_log',
      operation: 'delete',
      data: { id },
      timestamp: Date.now(),
      attempts: 0,
    });
  }

  // Body Measurements
  async saveMeasurementLocally(measurement: Measurement): Promise<void> {
    const measurements = await this.getLocalMeasurements();
    const existingIndex = measurements.findIndex((m) => m.id === measurement.id);
    
    if (existingIndex >= 0) {
      measurements[existingIndex] = { ...measurement, _synced: false };
    } else {
      measurements.push({ ...measurement, _synced: false });
    }
    
    await this.saveLocally(STORAGE_KEYS.MEASUREMENTS, measurements);
    
    await this.addToSyncQueue({
      id: `measurement-${measurement.id}-${Date.now()}`,
      table: 'body_measurements',
      operation: existingIndex >= 0 ? 'update' : 'create',
      data: measurement,
      timestamp: Date.now(),
      attempts: 0,
    });
  }

  async getLocalMeasurements(): Promise<Measurement[]> {
    return this.getLocal(STORAGE_KEYS.MEASUREMENTS);
  }

  // Exercises (Cached from API)
  async cacheExercises(exercises: Exercise[]): Promise<void> {
    const cache: ExerciseCache = {
      data: exercises,
      cachedAt: Date.now(),
    };
    await this.saveLocally(STORAGE_KEYS.EXERCISES, cache);
  }

  async getCachedExercises(): Promise<Exercise[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.EXERCISES);
      if (!jsonValue) return [];
      
      const cached = JSON.parse(jsonValue) as ExerciseCache;
      return cached.data || [];
    } catch (error) {
 logger.error('Error reading cached exercises:', error);
      return [];
    }
  }

  async getExercisesCacheAge(): Promise<number | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.EXERCISES);
      if (!jsonValue) return null;
      
      const cached = JSON.parse(jsonValue) as ExerciseCache;
      return cached.cachedAt ? Date.now() - cached.cachedAt : null;
    } catch (error) {
      return null;
    }
  }

  // Personal Records
  async savePersonalRecordLocally(record: PersonalRecord): Promise<void> {
    const records = await this.getLocal<PersonalRecord>(STORAGE_KEYS.PERSONAL_RECORDS);
    const existingIndex = records.findIndex((r) => r.id === record.id);
    
    if (existingIndex >= 0) {
      records[existingIndex] = { ...record, _synced: false };
    } else {
      records.push({ ...record, _synced: false });
    }
    
    await this.saveLocally(STORAGE_KEYS.PERSONAL_RECORDS, records);
  }

  async getLocalPersonalRecords(): Promise<PersonalRecord[]> {
    return this.getLocal<PersonalRecord>(STORAGE_KEYS.PERSONAL_RECORDS);
  }

  // Sync Queue
  async addToSyncQueue(operation: SyncOperation): Promise<void> {
    const queue = await this.getSyncQueue();
    queue.push(operation);
    await this.saveLocally(STORAGE_KEYS.SYNC_QUEUE, queue);
  }

  async getSyncQueue(): Promise<SyncOperation[]> {
    return this.getLocal(STORAGE_KEYS.SYNC_QUEUE);
  }

  async removeFromSyncQueue(operationId: string): Promise<void> {
    const queue = await this.getSyncQueue();
    const filtered = queue.filter((op) => op.id !== operationId);
    await this.saveLocally(STORAGE_KEYS.SYNC_QUEUE, filtered);
  }

  async updateSyncOperation(operationId: string, updates: Partial<SyncOperation>): Promise<void> {
    const queue = await this.getSyncQueue();
    const operation = queue.find((op) => op.id === operationId);
    if (operation) {
      Object.assign(operation, updates);
      await this.saveLocally(STORAGE_KEYS.SYNC_QUEUE, queue);
    }
  }

  async clearSyncQueue(): Promise<void> {
    await this.clearLocal(STORAGE_KEYS.SYNC_QUEUE);
  }

  // Last Sync Timestamp
  async setLastSyncTime(table: string, timestamp: number): Promise<void> {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      const syncData: LastSyncData = jsonValue ? JSON.parse(jsonValue) : {};
      syncData[table] = timestamp;
      await this.saveLocally(STORAGE_KEYS.LAST_SYNC, syncData);
    } catch (error) {
 logger.error('Error setting last sync time:', error);
    }
  }

  async getLastSyncTime(table: string): Promise<number | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      if (!jsonValue) return null;
      
      const syncData: LastSyncData = JSON.parse(jsonValue);
      return syncData[table] || null;
    } catch (error) {
      return null;
    }
  }

  // Profile Cache
  async saveProfileLocally(profile: UserProfile): Promise<void> {
    await this.saveLocally(STORAGE_KEYS.PROFILE, profile);
  }

  async getLocalProfile(): Promise<UserProfile | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
      return jsonValue ? JSON.parse(jsonValue) : null;
    } catch (error) {
 logger.error('Error reading profile:', error);
      return null;
    }
  }

  // Utility: Merge data (cloud takes precedence for synced items)
  mergeData<T extends { id: string; _synced?: boolean }>(
    localData: T[],
    cloudData: T[]
  ): T[] {
    const merged = new Map<string, T>();

    // Add all cloud data first (source of truth)
    cloudData.forEach((item) => {
      merged.set(item.id, { ...item, _synced: true });
    });

    // Add local-only items (not yet synced)
    localData.forEach((item) => {
      if (!item._synced || !merged.has(item.id)) {
        merged.set(item.id, item);
      }
    });

    return Array.from(merged.values());
  }
}

// Singleton instance
export const localDB = new LocalDatabase();
export default localDB;

