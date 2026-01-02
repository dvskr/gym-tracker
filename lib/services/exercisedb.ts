/**
 * ExerciseDB Service - Now uses Supabase Edge Function
 * 
 * This service wraps the exerciseApiService to maintain backward compatibility
 * with existing code while leveraging the secure Edge Function for API calls.
 * 
 * All API calls now go through: supabase/functions/exercise-search
 * Benefits:
 * - API key hidden on server
 * - User authentication required
 * - Better error handling
 * - Consistent with app architecture
 */

import { exerciseApiService, Exercise } from '@/lib/exercises';
import { ExerciseDBExercise, BodyPart } from '@/types/database';

interface ExerciseDBOptions {
  limit?: number;
  offset?: number;
}

export class ExerciseDBError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ExerciseDBError';
  }
}

// Map the Exercise type from API service to ExerciseDBExercise type
function mapExercise(exercise: Exercise): ExerciseDBExercise {
  return {
    id: exercise.id,
    name: exercise.name,
    bodyPart: exercise.bodyPart as BodyPart,
    target: exercise.target,
    equipment: exercise.equipment,
    gifUrl: exercise.gifUrl,
    secondaryMuscles: exercise.secondaryMuscles,
    instructions: exercise.instructions,
  };
}

/**
 * Fetch all exercises from ExerciseDB
 * @param options - Pagination options (limit, offset)
 * @returns Array of exercises
 */
export const fetchAllExercises = async (
  options: ExerciseDBOptions = {}
): Promise<ExerciseDBExercise[]> => {
  const { limit = 20, offset = 0 } = options;

  try {
    const exercises = await exerciseApiService.getAll(limit, offset);
    return exercises.map(mapExercise);
  } catch (error) {
    throw new ExerciseDBError(
      `Failed to fetch exercises: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Search exercises by name
 * @param name - Exercise name to search for
 * @param options - Pagination options (limit, offset)
 * @returns Array of matching exercises
 */
export const searchExercisesByName = async (
  name: string,
  options: ExerciseDBOptions = {}
): Promise<ExerciseDBExercise[]> => {
  if (!name.trim()) {
    return [];
  }

  try {
    const exercises = await exerciseApiService.searchByName(name);
    return exercises.map(mapExercise);
  } catch (error) {
    throw new ExerciseDBError(
      `Failed to search exercises: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Fetch exercises by body part
 * @param bodyPart - Body part to filter by
 * @param options - Pagination options (limit, offset)
 * @returns Array of exercises for the specified body part
 */
export const fetchExercisesByBodyPart = async (
  bodyPart: BodyPart,
  options: ExerciseDBOptions = {}
): Promise<ExerciseDBExercise[]> => {
  try {
    const exercises = await exerciseApiService.getByBodyPart(bodyPart);
    return exercises.map(mapExercise);
  } catch (error) {
    throw new ExerciseDBError(
      `Failed to fetch exercises by body part: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Fetch exercises by equipment type
 * @param equipment - Equipment type to filter by
 * @param options - Pagination options (limit, offset)
 * @returns Array of exercises for the specified equipment
 */
export const fetchExercisesByEquipment = async (
  equipment: string,
  options: ExerciseDBOptions = {}
): Promise<ExerciseDBExercise[]> => {
  try {
    const exercises = await exerciseApiService.getByEquipment(equipment);
    return exercises.map(mapExercise);
  } catch (error) {
    throw new ExerciseDBError(
      `Failed to fetch exercises by equipment: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Fetch exercises by target muscle
 * @param target - Target muscle to filter by
 * @param options - Pagination options (limit, offset)
 * @returns Array of exercises for the specified target muscle
 */
export const fetchExercisesByTarget = async (
  target: string,
  options: ExerciseDBOptions = {}
): Promise<ExerciseDBExercise[]> => {
  try {
    const exercises = await exerciseApiService.getByTarget(target);
    return exercises.map(mapExercise);
  } catch (error) {
    throw new ExerciseDBError(
      `Failed to fetch exercises by target: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Fetch a single exercise by ID
 * @param id - Exercise ID
 * @returns Single exercise or null if not found
 */
export const fetchExerciseById = async (
  id: string
): Promise<ExerciseDBExercise | null> => {
  try {
    const exercise = await exerciseApiService.getById(id);
    return exercise ? mapExercise(exercise) : null;
  } catch (error) {
    throw new ExerciseDBError(
      `Failed to fetch exercise: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Fetch all available body parts
 * @returns Array of body part names
 */
export const fetchBodyPartList = async (): Promise<string[]> => {
  try {
    return await exerciseApiService.getBodyPartList();
  } catch (error) {
    throw new ExerciseDBError(
      `Failed to fetch body part list: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Fetch all available equipment types
 * @returns Array of equipment names
 */
export const fetchEquipmentList = async (): Promise<string[]> => {
  try {
    return await exerciseApiService.getEquipmentList();
  } catch (error) {
    throw new ExerciseDBError(
      `Failed to fetch equipment list: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Fetch all available target muscles
 * @returns Array of target muscle names
 */
export const fetchTargetList = async (): Promise<string[]> => {
  try {
    return await exerciseApiService.getTargetList();
  } catch (error) {
    throw new ExerciseDBError(
      `Failed to fetch target list: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};