import { ExerciseDBExercise, BodyPart } from '@/types/database';

const EXERCISEDB_BASE_URL = 'https://exercisedb.p.rapidapi.com';
const API_KEY = process.env.EXPO_PUBLIC_EXERCISEDB_API_KEY;

interface ExerciseDBOptions {
  limit?: number;
  offset?: number;
}

class ExerciseDBError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ExerciseDBError';
  }
}

const getHeaders = (): HeadersInit => {
  if (!API_KEY) {
    throw new ExerciseDBError('ExerciseDB API key is not configured');
  }

  return {
    'x-rapidapi-key': API_KEY,
    'x-rapidapi-host': 'exercisedb.p.rapidapi.com',
  };
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new ExerciseDBError(
      `ExerciseDB API error: ${response.status} - ${errorText}`,
      response.status
    );
  }

  try {
    return await response.json();
  } catch {
    throw new ExerciseDBError('Failed to parse ExerciseDB response');
  }
};

/**
 * Fetch all exercises from ExerciseDB
 * @param options - Pagination options (limit, offset)
 * @returns Array of exercises
 */
export const fetchAllExercises = async (
  options: ExerciseDBOptions = {}
): Promise<ExerciseDBExercise[]> => {
  // limit=0 returns ALL exercises (1300+)
  const { limit = 0, offset = 0 } = options;

  try {
    const response = await fetch(
      `${EXERCISEDB_BASE_URL}/exercises?limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    return handleResponse<ExerciseDBExercise[]>(response);
  } catch (error) {
    if (error instanceof ExerciseDBError) {
      throw error;
    }
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
  // Default to 0 (all matching results)
  const { limit = 0, offset = 0 } = options;

  if (!name.trim()) {
    return [];
  }

  try {
    const encodedName = encodeURIComponent(name.toLowerCase().trim());
    const response = await fetch(
      `${EXERCISEDB_BASE_URL}/exercises/name/${encodedName}?limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    return handleResponse<ExerciseDBExercise[]>(response);
  } catch (error) {
    if (error instanceof ExerciseDBError) {
      throw error;
    }
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
  // Default to 0 (all exercises for this body part)
  const { limit = 0, offset = 0 } = options;

  try {
    const encodedBodyPart = encodeURIComponent(bodyPart.toLowerCase());
    const response = await fetch(
      `${EXERCISEDB_BASE_URL}/exercises/bodyPart/${encodedBodyPart}?limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    return handleResponse<ExerciseDBExercise[]>(response);
  } catch (error) {
    if (error instanceof ExerciseDBError) {
      throw error;
    }
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
  // Default to 0 (all exercises for this equipment)
  const { limit = 0, offset = 0 } = options;

  try {
    const encodedEquipment = encodeURIComponent(equipment.toLowerCase());
    const response = await fetch(
      `${EXERCISEDB_BASE_URL}/exercises/equipment/${encodedEquipment}?limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    return handleResponse<ExerciseDBExercise[]>(response);
  } catch (error) {
    if (error instanceof ExerciseDBError) {
      throw error;
    }
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
  // Default to 0 (all exercises for this target muscle)
  const { limit = 0, offset = 0 } = options;

  try {
    const encodedTarget = encodeURIComponent(target.toLowerCase());
    const response = await fetch(
      `${EXERCISEDB_BASE_URL}/exercises/target/${encodedTarget}?limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    return handleResponse<ExerciseDBExercise[]>(response);
  } catch (error) {
    if (error instanceof ExerciseDBError) {
      throw error;
    }
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
    const response = await fetch(
      `${EXERCISEDB_BASE_URL}/exercises/exercise/${id}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    if (response.status === 404) {
      return null;
    }

    return handleResponse<ExerciseDBExercise>(response);
  } catch (error) {
    if (error instanceof ExerciseDBError) {
      throw error;
    }
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
    const response = await fetch(
      `${EXERCISEDB_BASE_URL}/exercises/bodyPartList`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    return handleResponse<string[]>(response);
  } catch (error) {
    if (error instanceof ExerciseDBError) {
      throw error;
    }
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
    const response = await fetch(
      `${EXERCISEDB_BASE_URL}/exercises/equipmentList`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    return handleResponse<string[]>(response);
  } catch (error) {
    if (error instanceof ExerciseDBError) {
      throw error;
    }
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
    const response = await fetch(
      `${EXERCISEDB_BASE_URL}/exercises/targetList`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    return handleResponse<string[]>(response);
  } catch (error) {
    if (error instanceof ExerciseDBError) {
      throw error;
    }
    throw new ExerciseDBError(
      `Failed to fetch target list: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

