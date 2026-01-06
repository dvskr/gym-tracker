import { supabase } from '../supabase';
import { logger } from '@/lib/utils/logger';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  gender: string | null;
  height_cm: number | null;
  fitness_goal: string | null;
  experience_level: string | null;
  unit_system: string | null;
  theme: string | null;
  rest_timer_default: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UpdateProfileData {
  full_name?: string;
  avatar_url?: string | null;
  date_of_birth?: string;
  gender?: string;
  height_cm?: number;
  fitness_goal?: string;
  experience_level?: string;
  unit_system?: string;
  theme?: string;
  rest_timer_default?: number;
}

/**
 * Fetch user profile by user ID
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error: unknown) {
 logger.error('Error fetching profile:', error);
    throw error;
  }
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  updates: UpdateProfileData
): Promise<Profile> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: unknown) {
 logger.error('Error updating profile:', error);
    throw error;
  }
}

/**
 * Upload avatar image to Supabase Storage
 * Converts image to base64 and uploads to avatars bucket
 */
export async function uploadAvatar(
  userId: string,
  imageUri: string
): Promise<string> {
  try {
    // Read the file as base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    // Get file extension from URI
    const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}-${Date.now()}.${ext}`;
    const filePath = `${userId}/${fileName}`;

    // Determine content type
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

    // Convert base64 to ArrayBuffer
    const arrayBuffer = decode(base64);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error: unknown) {
 logger.error('Error uploading avatar:', error);
    throw error;
  }
}

/**
 * Delete user avatar from Supabase Storage and profile
 */
export async function deleteAvatar(userId: string): Promise<void> {
  try {
    // Get current profile to find avatar URL
    const profile = await getProfile(userId);
    if (!profile?.avatar_url) {
      return; // No avatar to delete
    }

    // Extract file path from URL
    const url = new URL(profile.avatar_url);
    const pathParts = url.pathname.split('/avatars/');
    if (pathParts.length > 1) {
      const filePath = pathParts[1];

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('avatars')
        .remove([filePath]);

      if (storageError) {
 logger.error('Error deleting from storage:', storageError);
      }
    }

    // Update profile to remove avatar URL
    await updateProfile(userId, { avatar_url: null });
  } catch (error: unknown) {
 logger.error('Error deleting avatar:', error);
    throw error;
  }
}

/**
 * Validate profile data before submission
 */
export function validateProfileData(data: UpdateProfileData): string[] {
  const errors: string[] = [];

  // Validate full name
  if (data.full_name !== undefined) {
    if (!data.full_name || data.full_name.trim().length === 0) {
      errors.push('Name is required');
    } else if (data.full_name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    } else if (data.full_name.length > 50) {
      errors.push('Name must be less than 50 characters');
    }
  }

  // Validate height
  if (data.height_cm !== undefined && data.height_cm !== null) {
    if (data.height_cm <= 0) {
      errors.push('Height must be a positive number');
    } else if (data.height_cm < 50 || data.height_cm > 300) {
      errors.push('Please enter a valid height');
    }
  }

  // Validate date of birth
  if (data.date_of_birth) {
    const dob = new Date(data.date_of_birth);
    const now = new Date();
    const age = now.getFullYear() - dob.getFullYear();

    if (dob > now) {
      errors.push('Date of birth cannot be in the future');
    } else if (age < 13) {
      errors.push('You must be at least 13 years old');
    } else if (age > 120) {
      errors.push('Please enter a valid date of birth');
    }
  }

  return errors;
}

