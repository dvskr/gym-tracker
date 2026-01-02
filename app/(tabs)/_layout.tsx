import { useEffect, useState } from 'react';
import { logger } from '@/lib/utils/logger';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Slot, usePathname, router } from 'expo-router';
import { Home, Dumbbell, History, TrendingUp, User } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { preloadAllAppData, PreloadProgress } from '@/lib/services/preloadService';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';
import { PreloadProvider } from '@/contexts/PreloadContext';

const tabs = [
  { name: 'index', title: 'Home', icon: Home, path: '/(tabs)' },
  { name: 'workout', title: 'Workout', icon: Dumbbell, path: '/(tabs)/workout' },
  { name: 'history', title: 'History', icon: History, path: '/(tabs)/history' },
  { name: 'progress', title: 'Progress', icon: TrendingUp, path: '/(tabs)/progress' },
  { name: 'profile', title: 'Profile', icon: User, path: '/(tabs)/profile' },
];

// Persist preload status outside component to survive unmounts
let preloadCompleted = false;
let currentUserId: string | null = null;

export default function TabsLayout() {
  const pathname = usePathname();
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const [isPreloading, setIsPreloading] = useState(true);
  const [preloadProgress, setPreloadProgress] = useState<PreloadProgress>({
    phase: 'starting',
    percentage: 0,
    isComplete: false,
  });

  useEffect(() => {
    // Reset preload flag if user changed
    if (user?.id && user.id !== currentUserId) {
 logger.log('[TabsLayout] User changed, resetting preload flag');
      preloadCompleted = false;
      currentUserId = user.id;
    }

    // Only run preload once per user session
    if (user && !isAuthLoading && !preloadCompleted) {
 logger.log('[TabsLayout] Starting app data preload...');
      preloadAllAppData(user.id, setPreloadProgress)
        .finally(() => {
 logger.log('[TabsLayout] Preload complete');
          setIsPreloading(false);
          preloadCompleted = true;
        });
    } else if (!user && !isAuthLoading) {
      // Not authenticated, no preload needed
      setIsPreloading(false);
      preloadCompleted = false;
      currentUserId = null;
    } else if (preloadCompleted) {
      // Already preloaded, skip loading screen
 logger.log('[TabsLayout] Skipping preload - already completed');
      setIsPreloading(false);
    }
  }, [user, isAuthLoading]);

  // Show loading screen while preloading
  if (user && isPreloading) {
    return <AppLoadingScreen progress={preloadProgress} />;
  }

  const isActive = (tabPath: string, tabName: string) => {
    if (tabName === 'index') {
      return pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
    }
    return pathname.includes(tabName);
  };

  return (
    <PreloadProvider isComplete={!isPreloading}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Slot />
        </View>
        
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const active = isActive(tab.path, tab.name);
            const Icon = tab.icon;
            
            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.tabItem}
                onPress={() => router.push(tab.path as any)}
              >
                <Icon 
                  color={active ? '#3b82f6' : '#94a3b8'} 
                  size={24} 
                />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {tab.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </PreloadProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    color: '#94a3b8',
  },
  tabLabelActive: {
    color: '#3b82f6',
  },
});