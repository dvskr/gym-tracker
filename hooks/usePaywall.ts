import { useCallback } from 'react';
import { useProStore } from '@/stores/proStore';
import { router } from 'expo-router';

type PaywallFeature =
  | 'AI Coach'
  | 'Unlimited Templates'
  | 'All Achievements'
  | 'Health Sync'
  | 'Data Export';

export function usePaywall() {
  const { checkStatus } = useProStore();

  const showPaywall = useCallback(async (feature?: PaywallFeature): Promise<boolean> => {
    // Navigate to subscription screen
    router.push('/settings/subscription');
    
    // Wait a bit for user to potentially purchase
    // In a real app, you'd listen to purchase events
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if they upgraded
    const isPro = await checkStatus();
    return isPro;
  }, [checkStatus]);

  return {
    showPaywall,
  };
}

