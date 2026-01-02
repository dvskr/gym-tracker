import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export type UnitSystem = 'imperial' | 'metric';
export type WeightUnit = 'lbs' | 'kg';
export type MeasurementUnit = 'in' | 'cm';
export type Theme = 'dark' | 'light' | 'system';

interface SettingsState {
  // Units
  unitSystem: UnitSystem;
  weightUnit: WeightUnit;
  measurementUnit: MeasurementUnit;

  // Theme
  theme: Theme;

  // Workout
  restTimerDefault: number;
  autoStartTimer: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  showPreviousWorkout: boolean;
  autoFillSets: boolean;

  // Plate Calculator (kept for backward compatibility with PlateCalculator component)
  barbellWeight: number;
  defaultPlates: string; // 'standard' or 'custom'
  availablePlates: number[];

  // PRs
  prCelebrations: boolean;
  prSound: boolean;
  prConfetti: boolean;

  // Notifications
  notificationsEnabled: boolean;
  workoutReminders: boolean;
  reminderDays: number[]; // 1-7 (Sunday-Saturday)
  reminderTime: string;
  streakReminders: boolean;
  weeklySummary: boolean;
  prNotifications: boolean;
  milestoneAlerts: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  
  // Notification Details
  restTimerAlerts: boolean;
  restTimerSound: boolean;
  restTimerVibration: boolean;
  inactivityReminders: boolean;
  achievementNotifications: boolean;
  backupReminders: boolean;
  updateNotifications: boolean;

  // Health Connect
  healthSyncEnabled: boolean;
  healthAutoSync: boolean;
  syncWeight: boolean;
  syncBodyMeasurements: boolean;
  readHeartRate: boolean;
  readSteps: boolean;
  readSleep: boolean;

  // AI Features
  aiEnabled: boolean;
  aiApiKey: string | null;
  showFormTips: boolean;
  showWorkoutSuggestions: boolean;
  showProgressiveOverload: boolean;
  showWorkoutAnalysis: boolean;

  // Hydration flag
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  
  // Actions
  setUnitSystem: (system: UnitSystem) => void;
  setWeightUnit: (unit: WeightUnit) => void;
  setMeasurementUnit: (unit: MeasurementUnit) => void;
  setTheme: (theme: Theme) => void;
  setRestTimerDefault: (seconds: number) => void;
  setAutoStartTimer: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticEnabled: (enabled: boolean) => void;
  setShowPreviousWorkout: (enabled: boolean) => void;
  setAutoFillSets: (enabled: boolean) => void;
  setBarbellWeight: (weight: number) => void;
  setDefaultPlates: (plates: string) => void;
  setAvailablePlates: (plates: number[]) => void;
  setPrCelebrations: (enabled: boolean) => void;
  setPrSound: (enabled: boolean) => void;
  setPrConfetti: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setWorkoutReminders: (enabled: boolean) => void;
  setReminderDays: (days: number[]) => void;
  setReminderTime: (time: string) => void;
  setStreakReminders: (enabled: boolean) => void;
  setWeeklySummary: (enabled: boolean) => void;
  setPrNotifications: (enabled: boolean) => void;
  setMilestoneAlerts: (enabled: boolean) => void;
  setQuietHoursEnabled: (enabled: boolean) => void;
  setQuietHoursStart: (time: string) => void;
  setQuietHoursEnd: (time: string) => void;
  setHealthSyncEnabled: (enabled: boolean) => void;
  setHealthAutoSync: (enabled: boolean) => void;
  setSyncWeight: (enabled: boolean) => void;
  setSyncBodyMeasurements: (enabled: boolean) => void;
  updateSettings: (settings: Partial<Omit<SettingsState, 'setUnitSystem' | 'setTheme' | 'setRestTimerDefault' | 'updateSettings' | 'resetToDefaults' | 'syncFromProfile' | 'syncToProfile' | '_hasHydrated' | 'setHasHydrated'>>) => void;
  resetToDefaults: () => void;
  syncFromProfile: (profile: any) => void;
  syncToProfile: (userId: string) => Promise<void>;
}

const DEFAULT_SETTINGS: Omit<SettingsState, 'setUnitSystem' | 'setTheme' | 'setRestTimerDefault' | 'setAutoStartTimer' | 'setSoundEnabled' | 'setHapticEnabled' | 'setShowPreviousWorkout' | 'setAutoFillSets' | 'setBarbellWeight' | 'setDefaultPlates' | 'setAvailablePlates' | 'setPrCelebrations' | 'setPrSound' | 'setPrConfetti' | 'setNotificationsEnabled' | 'setWorkoutReminders' | 'setReminderDays' | 'setReminderTime' | 'setStreakReminders' | 'setWeeklySummary' | 'setPrNotifications' | 'setMilestoneAlerts' | 'setQuietHoursEnabled' | 'setQuietHoursStart' | 'setQuietHoursEnd' | 'setWeightUnit' | 'setMeasurementUnit' | 'updateSettings' | 'resetToDefaults' | 'syncFromProfile' | 'syncToProfile' | '_hasHydrated' | 'setHasHydrated'> = {
  // Units
  unitSystem: 'imperial',
  weightUnit: 'lbs',
  measurementUnit: 'in',

  // Theme
  theme: 'dark',

  // Workout
  restTimerDefault: 90,
  autoStartTimer: true,
  soundEnabled: true,
  hapticEnabled: true,
  showPreviousWorkout: true,
  autoFillSets: true,

  // Plate Calculator (kept for backward compatibility)
  barbellWeight: 45,
  defaultPlates: 'standard',
  availablePlates: [45, 35, 25, 10, 5, 2.5],

  // PRs
  prCelebrations: true,
  prSound: true,
  prConfetti: true,

  // Notifications
  notificationsEnabled: true,
  workoutReminders: true,
  reminderDays: [2, 4, 6], // Monday, Wednesday, Friday
  reminderTime: '09:00',
  streakReminders: true,
  weeklySummary: true,
  prNotifications: true,
  milestoneAlerts: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  
  // Notification Details
  restTimerAlerts: true,
  restTimerSound: true,
  restTimerVibration: true,
  inactivityReminders: true,
  achievementNotifications: true,
  backupReminders: true,
  updateNotifications: false,

  // Health Connect
  healthSyncEnabled: false,
  healthAutoSync: true,
  syncWeight: true,
  syncBodyMeasurements: true,
  readHeartRate: true,
  readSteps: true,
  readSleep: true,

  // AI Features
  aiEnabled: false,
  aiApiKey: null,
  showFormTips: true,
  showWorkoutSuggestions: true,
  showProgressiveOverload: true,
  showWorkoutAnalysis: true,
  
  // Hydration
  _hasHydrated: false,
};

// Debounce timer for syncing to Supabase
let syncTimeout: NodeJS.Timeout | null = null;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,
      
      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },

      setUnitSystem: (system) => {
        const updates: Partial<SettingsState> = {
          unitSystem: system,
          weightUnit: system === 'metric' ? 'kg' : 'lbs',
          measurementUnit: system === 'metric' ? 'cm' : 'in',
          barbellWeight: system === 'metric' ? 20 : 45,
          availablePlates: system === 'metric' ? [20, 15, 10, 5, 2.5, 1.25] : [45, 35, 25, 10, 5, 2.5],
        };
        set(updates);
        
        debounceSyncToProfile();
      },

      setWeightUnit: (unit) => {
        set({ weightUnit: unit });
        debounceSyncToProfile();
      },

      setMeasurementUnit: (unit) => {
        set({ measurementUnit: unit });
        debounceSyncToProfile();
      },

      setTheme: (theme) => {
        set({ theme });
        debounceSyncToProfile();
      },

      setRestTimerDefault: (seconds) => {
        set({ restTimerDefault: seconds });
        debounceSyncToProfile();
      },

      setAutoStartTimer: (enabled) => {
        set({ autoStartTimer: enabled });
        debounceSyncToProfile();
      },

      setSoundEnabled: (enabled) => {
        set({ soundEnabled: enabled });
        debounceSyncToProfile();
      },

      setHapticEnabled: (enabled) => {
        set({ hapticEnabled: enabled });
        debounceSyncToProfile();
      },

      setShowPreviousWorkout: (enabled) => {
        set({ showPreviousWorkout: enabled });
        debounceSyncToProfile();
      },

      setAutoFillSets: (enabled) => {
        set({ autoFillSets: enabled });
        debounceSyncToProfile();
      },

      setBarbellWeight: (weight) => {
        set({ barbellWeight: weight });
        debounceSyncToProfile();
      },

      setDefaultPlates: (plates) => {
        set({ defaultPlates: plates });
        debounceSyncToProfile();
      },

      setAvailablePlates: (plates) => {
        set({ availablePlates: plates });
        debounceSyncToProfile();
      },

      setPrCelebrations: (enabled) => {
        set({ prCelebrations: enabled });
        debounceSyncToProfile();
      },

      setPrSound: (enabled) => {
        set({ prSound: enabled });
        debounceSyncToProfile();
      },

      setPrConfetti: (enabled) => {
        set({ prConfetti: enabled });
        debounceSyncToProfile();
      },

      setNotificationsEnabled: (enabled) => {
        set({ notificationsEnabled: enabled });
        debounceSyncToProfile();
      },

      setWorkoutReminders: (enabled) => {
        set({ workoutReminders: enabled });
        debounceSyncToProfile();
      },

      setReminderDays: (days) => {
        set({ reminderDays: days });
        debounceSyncToProfile();
      },

      setReminderTime: (time) => {
        set({ reminderTime: time });
        debounceSyncToProfile();
      },

      setStreakReminders: (enabled) => {
        set({ streakReminders: enabled });
        debounceSyncToProfile();
      },

      setWeeklySummary: (enabled) => {
        set({ weeklySummary: enabled });
        debounceSyncToProfile();
      },

      setPrNotifications: (enabled) => {
        set({ prNotifications: enabled });
        debounceSyncToProfile();
      },

      setMilestoneAlerts: (enabled) => {
        set({ milestoneAlerts: enabled });
        debounceSyncToProfile();
      },

      setQuietHoursEnabled: (enabled) => {
        set({ quietHoursEnabled: enabled });
        debounceSyncToProfile();
      },

      setQuietHoursStart: (time) => {
        set({ quietHoursStart: time });
        debounceSyncToProfile();
      },

      setQuietHoursEnd: (time) => {
        set({ quietHoursEnd: time });
        debounceSyncToProfile();
      },

      setHealthSyncEnabled: (enabled) => {
        set({ healthSyncEnabled: enabled });
        debounceSyncToProfile();
      },

      setHealthAutoSync: (enabled) => {
        set({ healthAutoSync: enabled });
        debounceSyncToProfile();
      },

      setSyncWeight: (enabled) => {
        set({ syncWeight: enabled });
        debounceSyncToProfile();
      },

      setSyncBodyMeasurements: (enabled) => {
        set({ syncBodyMeasurements: enabled });
        debounceSyncToProfile();
      },

      updateSettings: (settings) => {
        set(settings);
        debounceSyncToProfile();
      },

      resetToDefaults: () => {
        set(DEFAULT_SETTINGS);
        debounceSyncToProfile();
      },

      syncFromProfile: (profile) => {
        if (!profile) {
          console.log('[Settings] ⚠️ syncFromProfile called with no profile');
          return;
        }

        console.log('[Settings] 📥 Syncing settings FROM database profile');
        const newSettings = {
          unitSystem: profile.unit_system || DEFAULT_SETTINGS.unitSystem,
          weightUnit: profile.weight_unit || (profile.unit_system === 'metric' ? 'kg' : 'lbs'),
          measurementUnit: profile.measurement_unit || (profile.unit_system === 'metric' ? 'cm' : 'in'),
          theme: profile.theme || DEFAULT_SETTINGS.theme,
          restTimerDefault: profile.rest_timer_default ?? DEFAULT_SETTINGS.restTimerDefault,
          autoStartTimer: profile.auto_start_timer ?? DEFAULT_SETTINGS.autoStartTimer,
          soundEnabled: profile.sound_enabled ?? DEFAULT_SETTINGS.soundEnabled,
          hapticEnabled: profile.haptic_enabled ?? DEFAULT_SETTINGS.hapticEnabled,
          showPreviousWorkout: profile.show_previous_workout ?? DEFAULT_SETTINGS.showPreviousWorkout,
          barbellWeight: profile.barbell_weight ?? DEFAULT_SETTINGS.barbellWeight,
          defaultPlates: profile.default_plates || DEFAULT_SETTINGS.defaultPlates,
          prCelebrations: profile.pr_celebrations ?? DEFAULT_SETTINGS.prCelebrations,
          notificationsEnabled: profile.notifications_enabled ?? DEFAULT_SETTINGS.notificationsEnabled,
          workoutReminders: profile.workout_reminders ?? DEFAULT_SETTINGS.workoutReminders,
          streakReminders: profile.streak_reminders ?? DEFAULT_SETTINGS.streakReminders,
        };
        
        console.log('[Settings] 📥 New settings from DB:', {
          unitSystem: newSettings.unitSystem,
          theme: newSettings.theme,
          restTimerDefault: newSettings.restTimerDefault,
        });
        
        set(newSettings);
        console.log('[Settings] ✅ Settings updated in store');
      },

      syncToProfile: async (userId) => {
        try {
          const state = get();
          
          console.log('[Settings] 📤 Syncing settings TO database for user:', userId);
          console.log('[Settings] 📤 Current state:', {
            unitSystem: state.unitSystem,
            theme: state.theme,
            restTimerDefault: state.restTimerDefault,
          });

          const { error } = await supabase
            .from('profiles')
            .update({
              unit_system: state.unitSystem,
              weight_unit: state.weightUnit,
              measurement_unit: state.measurementUnit,
              theme: state.theme,
              rest_timer_default: state.restTimerDefault,
              auto_start_timer: state.autoStartTimer,
              sound_enabled: state.soundEnabled,
              haptic_enabled: state.hapticEnabled,
              show_previous_workout: state.showPreviousWorkout,
              barbell_weight: state.barbellWeight,
              default_plates: state.defaultPlates,
              pr_celebrations: state.prCelebrations,
              notifications_enabled: state.notificationsEnabled,
              workout_reminders: state.workoutReminders,
              streak_reminders: state.streakReminders,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          if (error) {
            console.error('[Settings] ❌ Error syncing settings to profile:', error);
          } else {
            console.log('[Settings] ✅ Settings synced to database successfully');
          }
        } catch (error) {
          console.error('[Settings] ❌ Error syncing settings:', error);
        }
      },
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        console.log('[Settings] Hydration finished, current state:', {
          unitSystem: state?.unitSystem,
          weightUnit: state?.weightUnit,
          theme: state?.theme,
          hapticEnabled: state?.hapticEnabled,
          autoStartTimer: state?.autoStartTimer,
        });
      },
    }
  )
);

/**
 * Debounce sync to Supabase to avoid excessive API calls
 */
function debounceSyncToProfile() {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await useSettingsStore.getState().syncToProfile(user.id);
      }
    } catch (error) {
      console.error('Error in debounced sync:', error);
    }
  }, 500);
}

/**
 * Initialize settings from Supabase profile
 * Call this after user logs in
 */
export async function initializeSettings(userId: string) {
  try {
    console.log('[Settings] 🔄 Initializing settings from DB for user:', userId);
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[Settings] ❌ Error loading profile settings:', error);
      return;
    }

    if (profile) {
      console.log('[Settings] ✅ Profile loaded from DB:', {
        unit_system: profile.unit_system,
        theme: profile.theme,
        rest_timer_default: profile.rest_timer_default,
      });
      useSettingsStore.getState().syncFromProfile(profile);
      console.log('[Settings] ✅ Settings synced from DB to store');
    } else {
      console.log('[Settings] ⚠️ No profile found in database');
    }
  } catch (error) {
    console.error('[Settings] ❌ Error initializing settings:', error);
  }
}
