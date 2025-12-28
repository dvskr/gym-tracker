/**
 * Context builders for AI prompts
 * Converts user data into formatted context strings for AI
 */

export interface UserContext {
  recentWorkouts: any[];
  personalRecords: any[];
  currentStreak: number;
  totalWorkouts: number;
  preferredUnits: 'lbs' | 'kg';
  goals?: string;
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
}

export interface WorkoutContext {
  name: string;
  started_at: string;
  duration_seconds: number;
  exercises: Array<{
    name: string;
    sets: Array<{
      weight: number;
      reps: number;
      completed: boolean;
    }>;
  }>;
}

/**
 * Build comprehensive user profile context
 */
export function buildUserContext(data: UserContext): string {
  const context = `
USER PROFILE:
- Experience Level: ${data.experienceLevel || 'intermediate'}
- Total Workouts Completed: ${data.totalWorkouts}
- Current Streak: ${data.currentStreak} day${data.currentStreak !== 1 ? 's' : ''}
- Preferred Units: ${data.preferredUnits}
${data.goals ? `- Fitness Goals: ${data.goals}` : ''}

RECENT WORKOUTS (last 7):
${data.recentWorkouts.length > 0 
  ? data.recentWorkouts.map((w, i) => 
      `${i + 1}. ${w.name} on ${new Date(w.created_at).toLocaleDateString()} - ${w.exercises?.length || 0} exercises, ${Math.round((w.duration_seconds || 0) / 60)} minutes`
    ).join('\n')
  : '- No recent workouts'}

PERSONAL RECORDS (Top 10):
${data.personalRecords.length > 0
  ? data.personalRecords.slice(0, 10).map((pr, i) => 
      `${i + 1}. ${pr.exercise_name}: ${pr.weight}${data.preferredUnits} x ${pr.reps} reps`
    ).join('\n')
  : '- No personal records yet'}
`.trim();

  return context;
}

/**
 * Build current workout context
 */
export function buildWorkoutContext(workout: WorkoutContext): string {
  const duration = Math.round(workout.duration_seconds / 60);
  const startTime = new Date(workout.started_at).toLocaleTimeString();

  const context = `
CURRENT WORKOUT: ${workout.name || 'Unnamed Workout'}
Started: ${startTime}
Duration: ${duration} minute${duration !== 1 ? 's' : ''}
Total Exercises: ${workout.exercises?.length || 0}

EXERCISES COMPLETED:
${workout.exercises?.map((ex, i) => {
  const completedSets = ex.sets?.filter(s => s.completed).length || 0;
  const totalSets = ex.sets?.length || 0;
  
  return `
${i + 1}. ${ex.name} (${completedSets}/${totalSets} sets completed)
${ex.sets?.map((set, j) => 
  `   Set ${j + 1}: ${set.weight}lbs x ${set.reps} reps ${set.completed ? '✓' : '○'}`
).join('\n')}`;
}).join('\n') || '- No exercises yet'}
`.trim();

  return context;
}

/**
 * Build exercise history context
 */
export function buildExerciseHistory(
  exerciseName: string,
  history: Array<{
    date: string;
    sets: Array<{ weight: number; reps: number }>;
  }>
): string {
  const context = `
EXERCISE HISTORY: ${exerciseName}
${history.slice(0, 5).map((session, i) => `
Session ${i + 1} (${new Date(session.date).toLocaleDateString()}):
${session.sets.map((set, j) => 
  `  Set ${j + 1}: ${set.weight}lbs x ${set.reps} reps`
).join('\n')}
`).join('\n')}
`.trim();

  return context;
}

/**
 * Build muscle group training frequency
 */
export function buildMuscleGroupContext(
  trainingFrequency: Record<string, { lastTrained: string; timesThisWeek: number }>
): string {
  const context = `
MUSCLE GROUP TRAINING FREQUENCY (This Week):
${Object.entries(trainingFrequency).map(([muscle, data]) => {
  const daysSince = Math.floor(
    (Date.now() - new Date(data.lastTrained).getTime()) / (1000 * 60 * 60 * 24)
  );
  return `- ${muscle}: ${data.timesThisWeek}x this week, last trained ${daysSince} day${daysSince !== 1 ? 's' : ''} ago`;
}).join('\n')}
`.trim();

  return context;
}

/**
 * Build workout split pattern
 */
export function buildWorkoutSplitContext(
  recentWorkouts: Array<{ name: string; date: string; muscleGroups: string[] }>
): string {
  const context = `
WORKOUT SPLIT PATTERN (Last 2 Weeks):
${recentWorkouts.map((w, i) => 
  `${i + 1}. ${w.name} (${new Date(w.date).toLocaleDateString()}) - ${w.muscleGroups.join(', ')}`
).join('\n')}
`.trim();

  return context;
}

/**
 * Build progress summary
 */
export function buildProgressContext(progress: {
  volumeIncrease?: number;
  strengthIncrease?: number;
  workoutFrequency?: number;
  consistencyScore?: number;
}): string {
  const context = `
PROGRESS SUMMARY (Last 4 Weeks):
${progress.volumeIncrease !== undefined 
  ? `- Total Volume: ${progress.volumeIncrease > 0 ? '+' : ''}${progress.volumeIncrease.toFixed(1)}%` 
  : ''}
${progress.strengthIncrease !== undefined 
  ? `- Average Strength: ${progress.strengthIncrease > 0 ? '+' : ''}${progress.strengthIncrease.toFixed(1)}%` 
  : ''}
${progress.workoutFrequency !== undefined 
  ? `- Workout Frequency: ${progress.workoutFrequency.toFixed(1)} sessions/week` 
  : ''}
${progress.consistencyScore !== undefined 
  ? `- Consistency Score: ${progress.consistencyScore.toFixed(0)}%` 
  : ''}
`.trim();

  return context;
}

/**
 * Format a complete prompt with all contexts
 */
export function buildCompleteContext(data: {
  user?: UserContext;
  workout?: WorkoutContext;
  exerciseHistory?: { name: string; history: any[] };
  muscleGroups?: Record<string, any>;
  progress?: any;
}): string {
  const parts: string[] = [];

  if (data.user) {
    parts.push(buildUserContext(data.user));
  }

  if (data.workout) {
    parts.push('---', buildWorkoutContext(data.workout));
  }

  if (data.exerciseHistory) {
    parts.push('---', buildExerciseHistory(data.exerciseHistory.name, data.exerciseHistory.history));
  }

  if (data.muscleGroups) {
    parts.push('---', buildMuscleGroupContext(data.muscleGroups));
  }

  if (data.progress) {
    parts.push('---', buildProgressContext(data.progress));
  }

  return parts.join('\n\n');
}

