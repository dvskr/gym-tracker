import { supabase } from '@/lib/supabase';

export interface Exercise {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  gifUrl: string;
  secondaryMuscles: string[];
  instructions: string[];
}

class ExerciseApiService {
  // Search exercises by name
  async searchByName(name: string): Promise<Exercise[]> {
    const { data, error } = await supabase.functions.invoke('exercise-search', {
      body: { 
        action: 'search', 
        params: { name } 
      },
    });

    if (error) {
      console.error('Exercise search failed:', error);
      throw new Error('Failed to search exercises');
    }

    return data.data || [];
  }

  // Get exercises by body part
  async getByBodyPart(bodyPart: string): Promise<Exercise[]> {
    const { data, error } = await supabase.functions.invoke('exercise-search', {
      body: { 
        action: 'byBodyPart', 
        params: { bodyPart } 
      },
    });

    if (error) {
      console.error('Exercise fetch failed:', error);
      throw new Error('Failed to fetch exercises');
    }

    return data.data || [];
  }

  // Get exercises by target muscle
  async getByTarget(target: string): Promise<Exercise[]> {
    const { data, error } = await supabase.functions.invoke('exercise-search', {
      body: { 
        action: 'byTarget', 
        params: { target } 
      },
    });

    if (error) {
      console.error('Exercise fetch failed:', error);
      throw new Error('Failed to fetch exercises');
    }

    return data.data || [];
  }

  // Get exercises by equipment
  async getByEquipment(equipment: string): Promise<Exercise[]> {
    const { data, error } = await supabase.functions.invoke('exercise-search', {
      body: { 
        action: 'byEquipment', 
        params: { equipment } 
      },
    });

    if (error) {
      console.error('Exercise fetch failed:', error);
      throw new Error('Failed to fetch exercises');
    }

    return data.data || [];
  }

  // Get single exercise by ID
  async getById(id: string): Promise<Exercise | null> {
    const { data, error } = await supabase.functions.invoke('exercise-search', {
      body: { 
        action: 'byId', 
        params: { id } 
      },
    });

    if (error) {
      console.error('Exercise fetch failed:', error);
      throw new Error('Failed to fetch exercise');
    }

    return data.data || null;
  }

  // Get all exercises with pagination
  async getAll(limit = 20, offset = 0): Promise<Exercise[]> {
    const { data, error } = await supabase.functions.invoke('exercise-search', {
      body: { 
        action: 'list', 
        params: { limit, offset } 
      },
    });

    if (error) {
      console.error('Exercise fetch failed:', error);
      throw new Error('Failed to fetch exercises');
    }

    return data.data || [];
  }

  // Get list of all body parts
  async getBodyPartList(): Promise<string[]> {
    const { data, error } = await supabase.functions.invoke('exercise-search', {
      body: { action: 'bodyPartList' },
    });

    if (error) {
      console.error('Body part list fetch failed:', error);
      throw new Error('Failed to fetch body parts');
    }

    return data.data || [];
  }

  // Get list of all target muscles
  async getTargetList(): Promise<string[]> {
    const { data, error } = await supabase.functions.invoke('exercise-search', {
      body: { action: 'targetList' },
    });

    if (error) {
      console.error('Target list fetch failed:', error);
      throw new Error('Failed to fetch targets');
    }

    return data.data || [];
  }

  // Get list of all equipment
  async getEquipmentList(): Promise<string[]> {
    const { data, error } = await supabase.functions.invoke('exercise-search', {
      body: { action: 'equipmentList' },
    });

    if (error) {
      console.error('Equipment list fetch failed:', error);
      throw new Error('Failed to fetch equipment');
    }

    return data.data || [];
  }
}

export const exerciseApiService = new ExerciseApiService();

