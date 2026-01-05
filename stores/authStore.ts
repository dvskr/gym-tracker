import { create } from 'zustand';
import { logger } from '@/lib/utils/logger';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { seedDefaultTemplates, addNewDefaultTemplates } from '@/lib/data/defaultTemplates';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  hasSeededTemplates: boolean;
  
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

// Track if we've already attempted to seed for this session
let seedingAttempted = false;

/**
 * Seed default templates in background (non-blocking)
 */
async function seedTemplatesInBackground(userId: string) {
  if (seedingAttempted) return;
  seedingAttempted = true;
  
  // Run in background - don't await
  setTimeout(async () => {
    try {
      // First try to seed (for new users)
      await seedDefaultTemplates(userId);
      
      // Then add any new templates (for existing users)
      await addNewDefaultTemplates(userId);
    } catch (error) {
 logger.error('Background template seeding failed:', error);
    }
  }, 1000); // Small delay to let app settle
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
      supabase.auth.onAuthStateChange((event, session) => {
        set({ 
          session, 
          user: session?.user ?? null 
        });
        
        // Seed templates on sign in (for new or returning users)
        if (event === 'SIGNED_IN' && session?.user?.id) {
          seedTemplatesInBackground(session.user.id);
        }
        
        // Reset seeding flag on sign out
        if (event === 'SIGNED_OUT') {
          seedingAttempted = false;
          set({ hasSeededTemplates: false });
        }
      });
    } catch (error) {
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
    
    // Seed templates for new user (will also be triggered by auth state change)
    if (!error && data.user?.id) {
      seedTemplatesInBackground(data.user.id);
    }
    
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
    } catch (error) {
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


