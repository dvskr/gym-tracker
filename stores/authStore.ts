import { create } from 'zustand';
import { logger } from '@/lib/utils/logger';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { seedDefaultTemplates, addNewDefaultTemplates } from '@/lib/data/defaultTemplates';
import { tabDataCache } from '@/lib/cache/tabDataCache';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  hasSeededTemplates: boolean;
  
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

// Track if we've already attempted to seed for this user in this session
const seedingAttemptedForUsers = new Set<string>();

/**
 * Clear all app caches - use when switching users or signing in
 */
async function clearAllCaches() {
  try {
    logger.log('[Auth] Clearing all app caches...');
    
    // Clear memory cache
    tabDataCache.clear();
    
    // Clear specific AsyncStorage cache keys (but preserve user preferences)
    const keysToRemove = [
      'workout-history-cache',
      'exercise-cache', 
      'template-cache',
      'progress-cache',
      'stats-cache',
    ];
    
    await AsyncStorage.multiRemove(keysToRemove);
    logger.log('[Auth] All caches cleared successfully');
  } catch (error) {
    logger.error('[Auth] Error clearing caches:', error);
  }
}

/**
 * Seed default templates in background (non-blocking)
 * Only runs once per user per app session
 */
async function seedTemplatesInBackground(userId: string) {
  // Check if we've already attempted for this user
  if (seedingAttemptedForUsers.has(userId)) {
    logger.log('[Auth] Skipping template seed - already attempted for this user');
    return;
  }
  
  seedingAttemptedForUsers.add(userId);
  
  // Run in background - don't await
  setTimeout(async () => {
    try {
      // First try to seed (for new users) - AWAIT to complete before next step
      await seedDefaultTemplates(userId);
      
      // Add a small delay to ensure the seeded templates are committed and visible
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Then add any new templates (for existing users)
      await addNewDefaultTemplates(userId);
    } catch (error: unknown) {
      logger.error('Background template seeding failed:', error);
    }
  }, 2000);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,
  hasSeededTemplates: false,

  initialize: async () => {
    try {
      set({ isLoading: true });
      
      const { data: { session } } = await supabase.auth.getSession();
      
      set({ 
        session, 
        user: session?.user ?? null,
        isInitialized: true,
        isLoading: false 
      });
      
      // Seed templates for existing user on app open
      if (session?.user?.id) {
        seedTemplatesInBackground(session.user.id);
      }
      
      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        set({ 
          session, 
          user: session?.user ?? null 
        });
        
        // Clear caches and seed templates on sign in
        if (event === 'SIGNED_IN' && session?.user?.id) {
          // Clear all caches to prevent showing stale data from previous user
          await clearAllCaches();
          
          // Seed templates for this user
          seedTemplatesInBackground(session.user.id);
        }
        
        // Clear caches and reset on sign out
        if (event === 'SIGNED_OUT') {
          // Clear ALL users from seeding set (session is null on sign out)
          seedingAttemptedForUsers.clear();
          set({ hasSeededTemplates: false });
          
          // Clear all caches
          await clearAllCaches();
        }
      });
    } catch (error: unknown) {
 logger.error('Error initializing auth:', error);
      set({ isInitialized: true, isLoading: false });
    }
  },

  signUp: async (email, password, name) => {
    set({ isLoading: true });
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });
    
    // DON'T seed here - user doesn't have a valid session until email is confirmed
    // Seeding will happen in onAuthStateChange when SIGNED_IN fires after confirmation
    
    set({ isLoading: false });
    return { error };
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Seed templates on sign in (in case user never got them)
    if (!error && data.user?.id) {
      seedTemplatesInBackground(data.user.id);
    }
    
    set({ isLoading: false });
    return { error };
  },

  signOut: async () => {
    set({ isLoading: true });
    
    try {
      const result = await supabase.auth.signOut();
      if (result.error) {
        logger.error('Sign out error:', result.error);
      }
    } catch (error: unknown) {
      logger.error('Sign out exception:', error);
    }
    
    set({ 
      user: null, 
      session: null, 
      isLoading: false 
    });
  },

  resetPassword: async (email) => {
    set({ isLoading: true });
    
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    
    set({ isLoading: false });
    return { error };
  },
}));



