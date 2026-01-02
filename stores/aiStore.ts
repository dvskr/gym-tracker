import { create } from 'zustand';
import { AILimitStatus, AIUsageStats } from '@/lib/ai/types';

interface AIStore {
  // Limits
  limits: AILimitStatus | null;
  isLoadingLimits: boolean;
  
  // Usage stats
  usageStats: AIUsageStats | null;
  isLoadingStats: boolean;
  
  // Actions
  setLimits: (limits: AILimitStatus) => void;
  setUsageStats: (stats: AIUsageStats) => void;
  decrementRemaining: () => void;
  reset: () => void;
}

export const useAIStore = create<AIStore>((set) => ({
  limits: null,
  isLoadingLimits: false,
  usageStats: null,
  isLoadingStats: false,

  setLimits: (limits) => set({ limits }),
  
  setUsageStats: (usageStats) => set({ usageStats }),
  
  decrementRemaining: () => set((state) => ({
    limits: state.limits ? {
      ...state.limits,
      used: state.limits.used + 1,
      remaining: Math.max(0, state.limits.remaining - 1),
      allowed: state.limits.remaining > 1,
    } : null,
  })),

  reset: () => set({
    limits: null,
    usageStats: null,
  }),
}));
