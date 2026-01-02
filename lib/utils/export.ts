import { Share, Platform } from 'react-native';
import { logger } from '@/lib/utils/logger';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { format } from 'date-fns';

// ============================================
// Types
// ============================================

export interface ExportableSet {
  setNumber: number;
  weight: number | null;
  reps: number | null;
  weightUnit?: string;
  setType?: string;
  isCompleted?: boolean;
}

export interface ExportableExercise {
  name: string;
  muscle?: string;
  equipment?: string;
  notes?: string;
  sets: ExportableSet[];
}

export interface ExportableWorkout {
  id?: string;
  name: string;
  startedAt: string;
  endedAt?: string;
  duration?: number; // minutes
  totalVolume?: number;
  totalSets?: number;
  rating?: number;
  notes?: string;
  exercises: ExportableExercise[];
}

// ============================================
// Text Format Export
// ============================================

/**
 * Generate a plain text summary of a workout
 * Format:
 * ðŸ‹ï¸ Morning Workout
 * December 27, 2024 â€¢ 45 min
 * 
 * BENCH PRESS
 *   1. 135 lbs Ã— 10
 *   2. 185 lbs Ã— 8
 *   3. 205 lbs Ã— 6 ðŸ†
 * 
 * SQUATS
 *   1. 225 lbs Ã— 8
 *   ...
 * 
 * Total Volume: 12,500 lbs
 * Rating: â­â­â­â­â­
 */
export function generateWorkoutText(workout: ExportableWorkout): string {
  const lines: string[] = [];

  // Header
  lines.push(`ðŸ‹ï¸ ${workout.name}`);
  
  const dateStr = format(new Date(workout.startedAt), 'MMMM d, yyyy');
  const durationStr = workout.duration ? `${workout.duration} min` : '';
  lines.push(`${dateStr}${durationStr ? ` â€¢ ${durationStr}` : ''}`);
  lines.push('');

  // Exercises
  workout.exercises.forEach((exercise) => {
    lines.push(exercise.name.toUpperCase());
    
    exercise.sets.forEach((set) => {
      const weightStr = set.weight !== null ? `${set.weight} ${set.weightUnit || 'lbs'}` : 'â€”';
      const repsStr = set.reps !== null ? `${set.reps}` : 'â€”';
      const setTypeStr = set.setType && set.setType !== 'normal' ? ` (${set.setType})` : '';
      
      lines.push(`  ${set.setNumber}. ${weightStr} Ã— ${repsStr}${setTypeStr}`);
    });
    
    if (exercise.notes) {
      lines.push(`  ðŸ“ ${exercise.notes}`);
    }
    lines.push('');
  });

  // Summary
  if (workout.totalVolume) {
    lines.push(`Total Volume: ${workout.totalVolume.toLocaleString()} lbs`);
  }
  if (workout.totalSets) {
    lines.push(`Total Sets: ${workout.totalSets}`);
  }
  if (workout.rating) {
    lines.push(`Rating: ${'â­'.repeat(workout.rating)}`);
  }
  if (workout.notes) {
    lines.push(`Notes: ${workout.notes}`);
  }

  lines.push('');
  lines.push('â€” Tracked with GymTracker ðŸ’ª');

  return lines.join('\n');
}

/**
 * Generate a compact text summary (for sharing)
 */
export function generateCompactWorkoutText(workout: ExportableWorkout): string {
  const lines: string[] = [];

  lines.push(`ðŸ‹ï¸ ${workout.name}`);
  
  const dateStr = format(new Date(workout.startedAt), 'MMM d');
  lines.push(dateStr);
  lines.push('');

  // Just exercise names with best set
  workout.exercises.forEach((exercise) => {
    const completedSets = exercise.sets.filter(s => s.weight && s.reps);
    if (completedSets.length > 0) {
      // Find best set (highest weight)
      const bestSet = completedSets.reduce((best, current) => 
        (current.weight || 0) > (best.weight || 0) ? current : best
      );
      lines.push(`â€¢ ${exercise.name}: ${bestSet.weight} Ã— ${bestSet.reps}`);
    }
  });

  if (workout.totalVolume) {
    lines.push('');
    lines.push(`ðŸ“Š ${workout.totalVolume.toLocaleString()} lbs total`);
  }

  return lines.join('\n');
}

// ============================================
// CSV Format Export
// ============================================

/**
 * Generate CSV data for a workout
 * Columns: Exercise, Set, Weight, Reps, Volume
 */
export function generateWorkoutCSV(workout: ExportableWorkout): string {
  const rows: string[] = [];

  // Header
  rows.push('Exercise,Set,Weight,Reps,Volume');

  // Data rows
  workout.exercises.forEach((exercise) => {
    exercise.sets.forEach((set) => {
      const weight = set.weight || 0;
      const reps = set.reps || 0;
      const volume = weight * reps;
      
      const row = [
        escapeCSV(exercise.name),
        set.setNumber.toString(),
        set.weight !== null ? `${set.weight} ${set.weightUnit || 'lbs'}` : '',
        set.reps?.toString() || '',
        volume > 0 ? volume.toString() : '',
      ];
      rows.push(row.join(','));
    });
  });

  return rows.join('\n');
}

/**
 * Generate CSV for multiple workouts (history export)
 */
export function generateWorkoutHistoryCSV(workouts: ExportableWorkout[]): string {
  const rows: string[] = [];

  // Header
  rows.push('Date,Workout,Exercise,Set,Weight,Unit,Reps,Type');

  workouts.forEach((workout) => {
    const dateStr = format(new Date(workout.startedAt), 'yyyy-MM-dd');
    
    workout.exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        const row = [
          dateStr,
          escapeCSV(workout.name),
          escapeCSV(exercise.name),
          set.setNumber.toString(),
          set.weight?.toString() || '',
          set.weightUnit || 'lbs',
          set.reps?.toString() || '',
          set.setType || 'normal',
        ];
        rows.push(row.join(','));
      });
    });
  });

  return rows.join('\n');
}

function escapeCSV(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ============================================
// JSON Format Export
// ============================================

/**
 * Generate JSON data for a workout
 */
export function generateWorkoutJSON(workout: ExportableWorkout): string {
  const exportData = {
    exportedAt: new Date().toISOString(),
    exportedFrom: 'GymTracker',
    workout: {
      name: workout.name,
      date: workout.startedAt,
      duration: workout.duration,
      totalVolume: workout.totalVolume,
      rating: workout.rating,
      notes: workout.notes,
      exercises: workout.exercises.map((exercise) => ({
        name: exercise.name,
        muscle: exercise.muscle,
        equipment: exercise.equipment,
        notes: exercise.notes,
        sets: exercise.sets.map((set) => ({
          setNumber: set.setNumber,
          weight: set.weight,
          weightUnit: set.weightUnit || 'lbs',
          reps: set.reps,
          type: set.setType || 'normal',
        })),
      })),
    },
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Generate JSON for multiple workouts
 */
export function generateWorkoutHistoryJSON(workouts: ExportableWorkout[]): string {
  const exportData = {
    exportedAt: new Date().toISOString(),
    exportedFrom: 'GymTracker',
    workoutCount: workouts.length,
    workouts: workouts.map((workout) => ({
      name: workout.name,
      date: workout.startedAt,
      duration: workout.duration,
      totalVolume: workout.totalVolume,
      exercises: workout.exercises.map((exercise) => ({
        name: exercise.name,
        sets: exercise.sets.map((set) => ({
          weight: set.weight,
          reps: set.reps,
        })),
      })),
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

// ============================================
// Markdown Format Export
// ============================================

/**
 * Generate Markdown format for a workout
 */
export function generateWorkoutMarkdown(workout: ExportableWorkout): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ðŸ‹ï¸ ${workout.name}`);
  lines.push('');
  
  const dateStr = format(new Date(workout.startedAt), 'MMMM d, yyyy');
  lines.push(`**Date:** ${dateStr}`);
  if (workout.duration) {
    lines.push(`**Duration:** ${workout.duration} minutes`);
  }
  if (workout.totalVolume) {
    lines.push(`**Total Volume:** ${workout.totalVolume.toLocaleString()} lbs`);
  }
  if (workout.rating) {
    lines.push(`**Rating:** ${'â­'.repeat(workout.rating)}`);
  }
  lines.push('');

  // Exercises
  lines.push('## Exercises');
  lines.push('');

  workout.exercises.forEach((exercise) => {
    lines.push(`### ${exercise.name}`);
    if (exercise.muscle) {
      lines.push(`*Target: ${exercise.muscle}*`);
    }
    lines.push('');
    lines.push('| Set | Weight | Reps | Type |');
    lines.push('|-----|--------|------|------|');
    
    exercise.sets.forEach((set) => {
      const weight = set.weight !== null ? `${set.weight} ${set.weightUnit || 'lbs'}` : 'â€”';
      const reps = set.reps !== null ? set.reps.toString() : 'â€”';
      const type = set.setType || 'normal';
      
      lines.push(`| ${set.setNumber} | ${weight} | ${reps} | ${type} |`);
    });
    
    if (exercise.notes) {
      lines.push('');
      lines.push(`> ðŸ“ ${exercise.notes}`);
    }
    lines.push('');
  });

  // Notes
  if (workout.notes) {
    lines.push('## Notes');
    lines.push(workout.notes);
    lines.push('');
  }

  lines.push('---');
  lines.push('*Tracked with GymTracker*');

  return lines.join('\n');
}

// ============================================
// Share & Copy Functions
// ============================================

/**
 * Copy workout text to clipboard
 */
export async function copyWorkoutToClipboard(
  workout: ExportableWorkout,
  format: 'text' | 'compact' | 'csv' | 'json' | 'markdown' = 'text'
): Promise<void> {
  let content: string;

  switch (format) {
    case 'compact':
      content = generateCompactWorkoutText(workout);
      break;
    case 'csv':
      content = generateWorkoutCSV(workout);
      break;
    case 'json':
      content = generateWorkoutJSON(workout);
      break;
    case 'markdown':
      content = generateWorkoutMarkdown(workout);
      break;
    default:
      content = generateWorkoutText(workout);
  }

  await Clipboard.setStringAsync(content);
}

/**
 * Share workout using system share sheet
 */
export async function shareWorkout(
  workout: ExportableWorkout,
  format: 'text' | 'compact' = 'text'
): Promise<void> {
  const content = format === 'compact' 
    ? generateCompactWorkoutText(workout)
    : generateWorkoutText(workout);

  try {
    await Share.share({
      message: content,
      title: `GymTracker: ${workout.name}`,
    });
  } catch (error: any) {
    logger.error('Error sharing workout:', error.message);
    throw error;
  }
}

/**
 * Share workout as data (CSV/JSON)
 */
export async function shareWorkoutData(
  workout: ExportableWorkout,
  format: 'csv' | 'json' = 'csv'
): Promise<void> {
  const content = format === 'json'
    ? generateWorkoutJSON(workout)
    : generateWorkoutCSV(workout);

  const formatLabel = format.toUpperCase();

  try {
    await Share.share({
      message: `${workout.name} (${formatLabel})\n\n${content}`,
      title: `GymTracker Export: ${workout.name}`,
    });
  } catch (error: any) {
    logger.error('Error sharing workout data:', error.message);
    throw error;
  }
}

// ============================================
// File Export Function
// ============================================

/**
 * Export workout to file and open share sheet
 * @param workout The workout data to export
 * @param format 'text' or 'csv'
 * @returns Promise<void>
 */
export async function exportWorkout(
  workout: ExportableWorkout,
  format: 'text' | 'csv'
): Promise<void> {
  // Generate content based on format
  const content = format === 'csv' 
    ? generateWorkoutCSV(workout)
    : generateWorkoutText(workout);

  // Generate filename
  const dateStr = format === 'csv' 
    ? format(new Date(workout.startedAt), 'yyyy-MM-dd')
    : format(new Date(workout.startedAt), 'MMM-d-yyyy');
  const safeName = workout.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const extension = format === 'csv' ? 'csv' : 'txt';
  const filename = `workout-${safeName}-${dateStr}.${extension}`;

  // Check if sharing is available
  const isSharingAvailable = await Sharing.isAvailableAsync();

  if (isSharingAvailable) {
    // Write to temporary file
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Open share sheet with file
    await Sharing.shareAsync(fileUri, {
      mimeType: format === 'csv' ? 'text/csv' : 'text/plain',
      dialogTitle: `Share ${workout.name}`,
      UTI: format === 'csv' ? 'public.comma-separated-values-text' : 'public.plain-text',
    });
  } else {
    // Fallback to Share API (text only)
    await Share.share({
      message: content,
      title: `GymTracker: ${workout.name}`,
    });
  }
}

/**
 * Export multiple workouts as CSV file
 */
export async function exportWorkoutHistory(
  workouts: ExportableWorkout[],
  filename?: string
): Promise<void> {
  const content = generateWorkoutHistoryCSV(workouts);
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const finalFilename = filename || `workout-history-${dateStr}.csv`;

  const isSharingAvailable = await Sharing.isAvailableAsync();

  if (isSharingAvailable) {
    const fileUri = `${FileSystem.cacheDirectory}${finalFilename}`;
    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Workout History',
      UTI: 'public.comma-separated-values-text',
    });
  } else {
    await Share.share({
      message: content,
      title: 'GymTracker: Workout History',
    });
  }
}

// ============================================
// Conversion Helpers
// ============================================

/**
 * Convert workout detail from API to exportable format
 */
export function convertToExportable(workoutDetail: any): ExportableWorkout {
  const startTime = new Date(workoutDetail.started_at);
  const endTime = workoutDetail.ended_at ? new Date(workoutDetail.ended_at) : null;
  const durationMs = endTime ? endTime.getTime() - startTime.getTime() : 0;
  const durationMinutes = Math.round(durationMs / 60000);

  let totalVolume = 0;
  let totalSets = 0;

  const exercises: ExportableExercise[] = (workoutDetail.workout_exercises || []).map((we: any) => {
    const sets: ExportableSet[] = (we.workout_sets || [])
      .sort((a: any, b: any) => a.set_number - b.set_number)
      .map((set: any) => {
        if (set.is_completed && set.weight && set.reps) {
          totalVolume += set.weight * set.reps;
          totalSets++;
        }
        return {
          setNumber: set.set_number,
          weight: set.weight,
          reps: set.reps,
          weightUnit: set.weight_unit || 'lbs',
          setType: set.set_type,
          isCompleted: set.is_completed,
        };
      });

    return {
      name: we.exercises?.name || 'Unknown Exercise',
      muscle: we.exercises?.primary_muscles?.[0],
      equipment: we.exercises?.equipment,
      notes: we.notes,
      sets,
    };
  });

  return {
    id: workoutDetail.id,
    name: workoutDetail.name || 'Workout',
    startedAt: workoutDetail.started_at,
    endedAt: workoutDetail.ended_at,
    duration: durationMinutes,
    totalVolume,
    totalSets,
    rating: workoutDetail.rating,
    notes: workoutDetail.notes,
    exercises,
  };
}

