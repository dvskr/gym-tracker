import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../supabase';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';

export interface Backup {
  id: string;
  createdAt: Date;
  size: number; // bytes
  version: string;
  tables: string[];
  isAutomatic: boolean;
}

export interface BackupData {
  version: string;
  createdAt: string;
  userId: string;
  profile: any;
  workouts: any[];
  workoutExercises: any[];
  workoutSets: any[];
  templates: any[];
  templateExercises: any[];
  bodyWeightLog: any[];
  bodyMeasurements: any[];
  personalRecords: any[];
  customExercises: any[];
  settings: any;
}

export interface RestoreResult {
  success: boolean;
  tablesRestored: string[];
  itemsRestored: number;
  errors: string[];
}

export interface RestoreProgress {
  current: string;
  completed: string[];
  total: number;
  currentCount: number;
  currentTotal: number;
}

export type RestoreProgressCallback = (progress: RestoreProgress) => void;

class BackupService {
  private readonly BACKUP_VERSION = '1.0';
  private readonly LAST_BACKUP_KEY = '@gym/last_backup_time';
  private readonly AUTO_BACKUP_KEY = '@gym/auto_backup_settings';

  /**
   * Create a full backup of all user data
   */
  async createBackup(isAutomatic = false): Promise<{ backup: Backup; data: BackupData }> {
    console.log('🔄 Creating backup...');

    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      throw new Error('Not authenticated');
    }

    try {
      // Fetch all user data in parallel
      const [
        profile,
        workoutsData,
        templatesData,
        weightLog,
        measurements,
        records,
        customExercises,
      ] = await Promise.all([
        this.fetchProfile(userId),
        this.fetchAllWorkouts(userId),
        this.fetchAllTemplates(userId),
        this.fetchWeightLog(userId),
        this.fetchMeasurements(userId),
        this.fetchPersonalRecords(userId),
        this.fetchCustomExercises(userId),
      ]);

      // Get current settings
      const settings = useSettingsStore.getState();

      const backupData: BackupData = {
        version: this.BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        userId,
        profile,
        workouts: workoutsData.workouts,
        workoutExercises: workoutsData.exercises,
        workoutSets: workoutsData.sets,
        templates: templatesData.templates,
        templateExercises: templatesData.exercises,
        bodyWeightLog: weightLog,
        bodyMeasurements: measurements,
        personalRecords: records,
        customExercises,
        settings,
      };

      const backup: Backup = {
        id: this.generateBackupId(),
        createdAt: new Date(),
        size: new Blob([JSON.stringify(backupData)]).size,
        version: this.BACKUP_VERSION,
        tables: [
          'profile',
          'workouts',
          'templates',
          'bodyWeightLog',
          'bodyMeasurements',
          'personalRecords',
          'customExercises',
          'settings',
        ],
        isAutomatic,
      };

      console.log(`✅ Backup created: ${backup.id}, size: ${this.formatBytes(backup.size)}`);

      return { backup, data: backupData };
    } catch (error) {
      console.error('❌ Error creating backup:', error);
      throw error;
    }
  }

  /**
   * Save backup to Supabase Storage
   */
  async saveToCloud(backup: Backup, data: BackupData): Promise<string> {
    console.log('☁️ Saving backup to cloud...');

    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error('Not authenticated');

    try {
      const fileName = `${userId}/${backup.id}.json`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('backups')
        .upload(fileName, JSON.stringify(data, null, 2), {
          contentType: 'application/json',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Save backup metadata
      const { error: metadataError } = await supabase.from('user_backups').insert({
        id: backup.id,
        user_id: userId,
        created_at: backup.createdAt.toISOString(),
        size_bytes: backup.size,
        version: backup.version,
        file_path: fileName,
        is_automatic: backup.isAutomatic,
      });

      if (metadataError) throw metadataError;

      // Update last backup time
      await AsyncStorage.setItem(this.LAST_BACKUP_KEY, Date.now().toString());

      console.log(`✅ Backup saved to cloud: ${fileName}`);

      return fileName;
    } catch (error) {
      console.error('❌ Error saving backup to cloud:', error);
      throw error;
    }
  }

  /**
   * Save backup locally to device
   */
  async saveLocally(backup: Backup, data: BackupData): Promise<string> {
    console.log('💾 Saving backup locally...');

    try {
      const backupsDir = `${FileSystem.documentDirectory}backups/`;
      const fileName = `backup_${backup.id}.json`;
      const filePath = `${backupsDir}${fileName}`;

      // Create backups directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(backupsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(backupsDir, { intermediates: true });
      }

      // Write backup file
      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(data, null, 2));

      console.log(`✅ Backup saved locally: ${filePath}`);

      return filePath;
    } catch (error) {
      console.error('❌ Error saving backup locally:', error);
      throw error;
    }
  }

  /**
   * List available cloud backups
   */
  async listBackups(): Promise<Backup[]> {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase
        .from('user_backups')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        createdAt: new Date(row.created_at),
        size: row.size_bytes,
        version: row.version,
        tables: [], // Not stored in metadata
        isAutomatic: row.is_automatic,
      }));
    } catch (error) {
      console.error('❌ Error listing backups:', error);
      throw error;
    }
  }

  /**
   * Download backup from cloud
   */
  async downloadBackup(backupId: string): Promise<BackupData> {
    console.log(`📥 Downloading backup: ${backupId}`);

    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error('Not authenticated');

    try {
      const fileName = `${userId}/${backupId}.json`;

      const { data, error } = await supabase.storage.from('backups').download(fileName);

      if (error) throw error;

      const text = await data.text();
      const backupData = JSON.parse(text);

      console.log(`✅ Backup downloaded: ${backupId}`);

      return backupData;
    } catch (error) {
      console.error('❌ Error downloading backup:', error);
      throw error;
    }
  }

  /**
   * Restore backup data with progress tracking
   */
  async restoreBackup(
    backupData: BackupData,
    onProgress?: RestoreProgressCallback,
    overwriteMode = false
  ): Promise<RestoreResult> {
    console.log('🔄 Restoring backup...');

    const result: RestoreResult = {
      success: false,
      tablesRestored: [],
      itemsRestored: 0,
      errors: [],
    };

    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      result.errors.push('Not authenticated');
      return result;
    }

    try {
      // Verify backup is for current user
      if (backupData.userId !== userId) {
        throw new Error('Backup is for a different user');
      }

      const totalSteps = 8;
      let currentStep = 0;
      const progress: RestoreProgress = {
        current: '',
        completed: [],
        total: totalSteps,
        currentCount: 0,
        currentTotal: 0,
      };

      // Helper to update progress
      const updateProgress = (current: string, currentCount = 0, currentTotal = 0) => {
        progress.current = current;
        progress.currentCount = currentCount;
        progress.currentTotal = currentTotal;
        onProgress?.(progress);
      };

      const completeStep = (step: string) => {
        progress.completed.push(step);
        currentStep++;
        onProgress?.(progress);
      };

      // Step 1: Restore profile
      try {
        updateProgress('Restoring profile...', 0, 1);
        await this.restoreProfile(backupData.profile, overwriteMode);
        result.tablesRestored.push('profile');
        result.itemsRestored++;
        completeStep('✓ Profile restored');
      } catch (error) {
        result.errors.push(`Profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Step 2: Restore workouts
      try {
        updateProgress(
          'Restoring workouts...',
          0,
          backupData.workouts?.length || 0
        );
        const count = await this.restoreWorkouts(
          backupData.workouts,
          backupData.workoutExercises,
          backupData.workoutSets,
          overwriteMode,
          (current, total) => updateProgress('Restoring workouts...', current, total)
        );
        result.tablesRestored.push('workouts');
        result.itemsRestored += count;
        completeStep(`✓ ${count} workouts restored`);
      } catch (error) {
        result.errors.push(`Workouts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Step 3: Restore templates
      try {
        updateProgress(
          'Restoring templates...',
          0,
          backupData.templates?.length || 0
        );
        const count = await this.restoreTemplates(
          backupData.templates,
          backupData.templateExercises,
          overwriteMode,
          (current, total) => updateProgress('Restoring templates...', current, total)
        );
        result.tablesRestored.push('templates');
        result.itemsRestored += count;
        completeStep(`✓ ${count} templates restored`);
      } catch (error) {
        result.errors.push(`Templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Step 4: Restore body weight log
      try {
        updateProgress(
          'Restoring weight log...',
          0,
          backupData.bodyWeightLog?.length || 0
        );
        const count = await this.restoreWeightLog(backupData.bodyWeightLog, overwriteMode);
        result.tablesRestored.push('bodyWeightLog');
        result.itemsRestored += count;
        completeStep(`✓ ${count} weight entries restored`);
      } catch (error) {
        result.errors.push(`Weight Log: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Step 5: Restore measurements
      try {
        updateProgress(
          'Restoring measurements...',
          0,
          backupData.bodyMeasurements?.length || 0
        );
        const count = await this.restoreMeasurements(backupData.bodyMeasurements, overwriteMode);
        result.tablesRestored.push('bodyMeasurements');
        result.itemsRestored += count;
        completeStep(`✓ ${count} measurements restored`);
      } catch (error) {
        result.errors.push(
          `Measurements: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      // Step 6: Restore personal records
      try {
        updateProgress(
          'Restoring personal records...',
          0,
          backupData.personalRecords?.length || 0
        );
        const count = await this.restorePersonalRecords(backupData.personalRecords, overwriteMode);
        result.tablesRestored.push('personalRecords');
        result.itemsRestored += count;
        completeStep(`✓ ${count} personal records restored`);
      } catch (error) {
        result.errors.push(`PRs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Step 7: Restore custom exercises
      if (backupData.customExercises?.length > 0) {
        try {
          updateProgress(
            'Restoring custom exercises...',
            0,
            backupData.customExercises.length
          );
          const count = await this.restoreCustomExercises(backupData.customExercises, overwriteMode);
          result.tablesRestored.push('customExercises');
          result.itemsRestored += count;
          completeStep(`✓ ${count} custom exercises restored`);
        } catch (error) {
          result.errors.push(
            `Custom Exercises: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      } else {
        completeStep('✓ No custom exercises');
      }

      // Step 8: Restore settings
      try {
        updateProgress('Restoring settings...', 0, 1);
        await this.restoreSettings(backupData.settings);
        result.tablesRestored.push('settings');
        result.itemsRestored++;
        completeStep('✓ Settings restored');
      } catch (error) {
        result.errors.push(`Settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      result.success = result.errors.length === 0;

      console.log(
        `✅ Restore complete: ${result.itemsRestored} items, ${result.errors.length} errors`
      );

      return result;
    } catch (error) {
      console.error('❌ Error restoring backup:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  /**
   * Delete backup from cloud
   */
  async deleteBackup(backupId: string): Promise<void> {
    console.log(`🗑️ Deleting backup: ${backupId}`);

    const userId = useAuthStore.getState().user?.id;
    if (!userId) throw new Error('Not authenticated');

    try {
      const fileName = `${userId}/${backupId}.json`;

      // Delete from storage
      const { error: storageError } = await supabase.storage.from('backups').remove([fileName]);

      if (storageError) throw storageError;

      // Delete metadata
      const { error: metadataError } = await supabase
        .from('user_backups')
        .delete()
        .eq('id', backupId);

      if (metadataError) throw metadataError;

      console.log(`✅ Backup deleted: ${backupId}`);
    } catch (error) {
      console.error('❌ Error deleting backup:', error);
      throw error;
    }
  }

  /**
   * Cleanup old backups (keep last N)
   */
  async cleanupOldBackups(keepCount = 5): Promise<number> {
    console.log(`🧹 Cleaning up old backups (keeping ${keepCount})...`);

    try {
      const backups = await this.listBackups();
      const toDelete = backups.slice(keepCount);

      for (const backup of toDelete) {
        await this.deleteBackup(backup.id);
      }

      console.log(`✅ Deleted ${toDelete.length} old backup(s)`);

      return toDelete.length;
    } catch (error) {
      console.error('❌ Error cleaning up backups:', error);
      throw error;
    }
  }

  /**
   * Get last backup time
   */
  async getLastBackupTime(): Promise<number | null> {
    try {
      const time = await AsyncStorage.getItem(this.LAST_BACKUP_KEY);
      return time ? parseInt(time, 10) : null;
    } catch (error) {
      console.error('Error getting last backup time:', error);
      return null;
    }
  }

  /**
   * Get auto-backup settings
   */
  async getAutoBackupSettings(): Promise<{
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
  }> {
    try {
      const settings = await AsyncStorage.getItem(this.AUTO_BACKUP_KEY);
      return settings
        ? JSON.parse(settings)
        : { enabled: false, frequency: 'weekly' };
    } catch (error) {
      console.error('Error getting auto-backup settings:', error);
      return { enabled: false, frequency: 'weekly' };
    }
  }

  /**
   * Update auto-backup settings
   */
  async updateAutoBackupSettings(settings: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
  }): Promise<void> {
    try {
      await AsyncStorage.setItem(this.AUTO_BACKUP_KEY, JSON.stringify(settings));
      console.log('✅ Auto-backup settings updated:', settings);
    } catch (error) {
      console.error('Error updating auto-backup settings:', error);
      throw error;
    }
  }

  // Private helper methods

  private generateBackupId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private async fetchProfile(userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  private async fetchAllWorkouts(
    userId: string
  ): Promise<{ workouts: any[]; exercises: any[]; sets: any[] }> {
    const { data: workouts, error } = await supabase
      .from('workouts')
      .select(
        `
        *,
        workout_exercises (
          *,
          workout_sets (*)
        )
      `
      )
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (error) throw error;

    // Flatten nested structure
    const exercises: any[] = [];
    const sets: any[] = [];

    workouts?.forEach((workout) => {
      if (workout.workout_exercises) {
        workout.workout_exercises.forEach((exercise: any) => {
          exercises.push({
            ...exercise,
            workout_sets: undefined,
          });

          if (exercise.workout_sets) {
            sets.push(...exercise.workout_sets);
          }
        });
        workout.workout_exercises = undefined;
      }
    });

    return { workouts: workouts || [], exercises, sets };
  }

  private async fetchAllTemplates(
    userId: string
  ): Promise<{ templates: any[]; exercises: any[] }> {
    const { data: templates, error } = await supabase
      .from('workout_templates')
      .select(
        `
        *,
        template_exercises (*)
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Flatten nested structure
    const exercises: any[] = [];

    templates?.forEach((template) => {
      if (template.template_exercises) {
        exercises.push(...template.template_exercises);
        template.template_exercises = undefined;
      }
    });

    return { templates: templates || [], exercises };
  }

  private async fetchWeightLog(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('body_weight_log')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  private async fetchMeasurements(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', userId)
      .order('measured_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  private async fetchPersonalRecords(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('personal_records')
      .select('*')
      .eq('user_id', userId)
      .order('achieved_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  private async fetchCustomExercises(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('created_by', userId)
      .eq('is_custom', true);

    if (error) throw error;
    return data || [];
  }

  // Restore methods

  private async restoreProfile(profile: any): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update(profile)
      .eq('id', profile.id);

    if (error) throw error;
  }

  private async restoreWorkouts(
    workouts: any[],
    exercises: any[],
    sets: any[]
  ): Promise<number> {
    let count = 0;

    for (const workout of workouts) {
      const { error: workoutError } = await supabase
        .from('workouts')
        .upsert(workout, { onConflict: 'id' });

      if (workoutError) throw workoutError;
      count++;

      // Restore exercises for this workout
      const workoutExercises = exercises.filter((e) => e.workout_id === workout.id);
      for (const exercise of workoutExercises) {
        const { error: exerciseError } = await supabase
          .from('workout_exercises')
          .upsert(exercise, { onConflict: 'id' });

        if (exerciseError) throw exerciseError;

        // Restore sets for this exercise
        const exerciseSets = sets.filter((s) => s.workout_exercise_id === exercise.id);
        if (exerciseSets.length > 0) {
          const { error: setsError } = await supabase
            .from('workout_sets')
            .upsert(exerciseSets, { onConflict: 'id' });

          if (setsError) throw setsError;
        }
      }
    }

    return count;
  }

  private async restoreTemplates(templates: any[], exercises: any[]): Promise<number> {
    let count = 0;

    for (const template of templates) {
      const { error: templateError } = await supabase
        .from('workout_templates')
        .upsert(template, { onConflict: 'id' });

      if (templateError) throw templateError;
      count++;

      // Restore exercises for this template
      const templateExercises = exercises.filter((e) => e.template_id === template.id);
      if (templateExercises.length > 0) {
        const { error: exercisesError } = await supabase
          .from('template_exercises')
          .upsert(templateExercises, { onConflict: 'id' });

        if (exercisesError) throw exercisesError;
      }
    }

    return count;
  }

  private async restoreWeightLog(entries: any[]): Promise<number> {
    if (entries.length === 0) return 0;

    const { error } = await supabase
      .from('body_weight_log')
      .upsert(entries, { onConflict: 'id' });

    if (error) throw error;
    return entries.length;
  }

  private async restoreMeasurements(entries: any[]): Promise<number> {
    if (entries.length === 0) return 0;

    const { error } = await supabase
      .from('body_measurements')
      .upsert(entries, { onConflict: 'id' });

    if (error) throw error;
    return entries.length;
  }

  private async restorePersonalRecords(records: any[]): Promise<number> {
    if (records.length === 0) return 0;

    const { error } = await supabase
      .from('personal_records')
      .upsert(records, { onConflict: 'id' });

    if (error) throw error;
    return records.length;
  }

  private async restoreCustomExercises(exercises: any[]): Promise<number> {
    if (exercises.length === 0) return 0;

    const { error } = await supabase
      .from('exercises')
      .upsert(exercises, { onConflict: 'id' });

    if (error) throw error;
    return exercises.length;
  }

  private async restoreSettings(settings: any): Promise<void> {
    // Update Zustand store
    const store = useSettingsStore.getState();
    Object.keys(settings).forEach((key) => {
      if (typeof store[key as keyof typeof store] !== 'function') {
        (store as any)[key] = settings[key];
      }
    });
  }
}

// Singleton instance
export const backupService = new BackupService();
export default backupService;

