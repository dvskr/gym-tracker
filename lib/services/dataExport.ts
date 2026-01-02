import * as FileSystem from 'expo-file-system';
import { logger } from '@/lib/utils/logger';
import * as Sharing from 'expo-sharing';
import { supabase } from '../supabase';

export interface ExportOptions {
  format: 'json' | 'csv';
  includeWorkouts: boolean;
  includeTemplates: boolean;
  includeMeasurements: boolean;
  includeWeightLog: boolean;
  includePRs: boolean;
  includeProfile: boolean;
  includePhotos: boolean;
}

export interface ExportProgress {
  step: string;
  current: number;
  total: number;
}

/**
 * Generate and export user data
 */
export async function generateExport(
  userId: string,
  options: ExportOptions,
  onProgress?: (progress: ExportProgress) => void
): Promise<string> {
  try {
    const steps = calculateSteps(options);
    let currentStep = 0;

    const data: any = {
      exportDate: new Date().toISOString(),
      userId,
    };

    // Fetch profile
    if (options.includeProfile) {
      onProgress?.({ step: 'Fetching profile...', current: ++currentStep, total: steps });
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      data.profile = profile;
    }

    // Fetch workouts
    if (options.includeWorkouts) {
      onProgress?.({ step: 'Fetching workouts...', current: ++currentStep, total: steps });
      const { data: workouts } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            *,
            exercise:exercises (*),
            workout_sets (*)
          )
        `)
        .eq('user_id', userId)
        .order('started_at', { ascending: false });
      data.workouts = workouts;
    }

    // Fetch templates
    if (options.includeTemplates) {
      onProgress?.({ step: 'Fetching templates...', current: ++currentStep, total: steps });
      const { data: templates } = await supabase
        .from('workout_templates')
        .select(`
          *,
          template_exercises (
            *,
            exercise:exercises (*)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      data.templates = templates;
    }

    // Fetch body measurements
    if (options.includeMeasurements) {
      onProgress?.({ step: 'Fetching measurements...', current: ++currentStep, total: steps });
      const { data: measurements } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', userId)
        .order('measured_at', { ascending: false });
      data.bodyMeasurements = measurements;
    }

    // Fetch weight log
    if (options.includeWeightLog) {
      onProgress?.({ step: 'Fetching weight log...', current: ++currentStep, total: steps });
      const { data: weightLog } = await supabase
        .from('body_weight_log')
        .select('*')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false });
      data.weightLog = weightLog;
    }

    // Fetch personal records
    if (options.includePRs) {
      onProgress?.({ step: 'Fetching personal records...', current: ++currentStep, total: steps });
      const { data: prs } = await supabase
        .from('personal_records')
        .select(`
          *,
          exercise:exercises (name)
        `)
        .eq('user_id', userId)
        .order('achieved_at', { ascending: false });
      data.personalRecords = prs;
    }

    // Create file
    onProgress?.({ step: 'Creating file...', current: ++currentStep, total: steps });
    
    if (options.format === 'json') {
      return await createJSONExport(data);
    } else {
      return await createCSVExport(data);
    }
  } catch (error) {
 logger.error('Error generating export:', error);
    throw error;
  }
}

/**
 * Calculate total steps for progress tracking
 */
function calculateSteps(options: ExportOptions): number {
  let steps = 1; // File creation step
  if (options.includeProfile) steps++;
  if (options.includeWorkouts) steps++;
  if (options.includeTemplates) steps++;
  if (options.includeMeasurements) steps++;
  if (options.includeWeightLog) steps++;
  if (options.includePRs) steps++;
  return steps;
}

/**
 * Create JSON export file
 */
async function createJSONExport(data: any): Promise<string> {
  const fileName = `gym-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
  const filePath = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(
    filePath,
    JSON.stringify(data, null, 2),
    { encoding: FileSystem.EncodingType.UTF8 }
  );

  return filePath;
}

/**
 * Create CSV export (simplified - single CSV for each data type)
 */
async function createCSVExport(data: any): Promise<string> {
  const fileName = `gym-tracker-export-${new Date().toISOString().split('T')[0]}.csv`;
  const filePath = `${FileSystem.documentDirectory}${fileName}`;

  // For simplicity, create a single CSV with workout summary
  // In a full implementation, you'd create multiple CSVs and zip them
  
  let csv = 'Export Date,Category,Count\n';
  csv += `${data.exportDate},Profile,${data.profile ? 1 : 0}\n`;
  csv += `${data.exportDate},Workouts,${data.workouts?.length || 0}\n`;
  csv += `${data.exportDate},Templates,${data.templates?.length || 0}\n`;
  csv += `${data.exportDate},Body Measurements,${data.bodyMeasurements?.length || 0}\n`;
  csv += `${data.exportDate},Weight Logs,${data.weightLog?.length || 0}\n`;
  csv += `${data.exportDate},Personal Records,${data.personalRecords?.length || 0}\n`;

  // Add detailed workout data
  if (data.workouts) {
    csv += '\n\nWorkout Details\n';
    csv += 'Date,Name,Duration (min),Total Volume,Sets,Reps\n';
    data.workouts.forEach((workout: any) => {
      const duration = workout.duration_seconds ? Math.round(workout.duration_seconds / 60) : 0;
      csv += `${workout.started_at},${workout.name || 'Workout'},${duration},${workout.total_volume || 0},${workout.total_sets || 0},${workout.total_reps || 0}\n`;
    });
  }

  await FileSystem.writeAsStringAsync(
    filePath,
    csv,
    { encoding: FileSystem.EncodingType.UTF8 }
  );

  return filePath;
}

/**
 * Share/download the export file
 */
export async function shareExport(filePath: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  
  if (isAvailable) {
    await Sharing.shareAsync(filePath, {
      mimeType: filePath.endsWith('.json') ? 'application/json' : 'text/csv',
      dialogTitle: 'Export Your Gym Data',
    });
  } else {
    throw new Error('Sharing is not available on this device');
  }
}

/**
 * Get export file size estimate (in MB)
 */
export async function getExportSizeEstimate(userId: string): Promise<number> {
  try {
    // Rough estimate based on record counts
    const { count: workoutCount } = await supabase
      .from('workouts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: templateCount } = await supabase
      .from('workout_templates')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Estimate: ~1KB per workout, ~0.5KB per template
    const estimatedBytes = (workoutCount || 0) * 1024 + (templateCount || 0) * 512;
    return estimatedBytes / (1024 * 1024); // Convert to MB
  } catch (error) {
 logger.error('Error estimating export size:', error);
    return 1; // Default 1MB estimate
  }
}
