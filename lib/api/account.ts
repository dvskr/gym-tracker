import { supabase } from '../supabase';
import { logger } from '@/lib/utils/logger';

/**
 * Change user email address
 * Requires current password for security
 */
export async function changeEmail(
  newEmail: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify current password first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    });

    if (signInError) {
      return { success: false, error: 'Invalid password' };
    }

    // Update email (sends verification email to new address)
    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to change email';
 logger.error('Error changing email:', error);
    return { success: false, error: message };
  }
}

/**
 * Change user password
 * Requires current password for security
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (signInError) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to change password';
 logger.error('Error changing password:', error);
    return { success: false, error: message };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'gymtracker://reset-password',
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send reset email';
 logger.error('Error sending reset email:', error);
    return { success: false, error: message };
  }
}

/**
 * Delete user account and all associated data
 * THIS CANNOT BE UNDONE
 * Uses edge function with service role to properly delete auth user
 */
export async function deleteAccount(
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current session for authorization
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    // Call edge function to delete account
    // Edge function has service role access to fully delete auth user
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { password },
    });

    if (error) {
      logger.error('Error calling delete-user function:', error);
      return { success: false, error: error.message || 'Failed to delete account' };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    // Sign out locally
    await supabase.auth.signOut();

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete account';
    logger.error('Error deleting account:', error);
    return { success: false, error: message };
  }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

