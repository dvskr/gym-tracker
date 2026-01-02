import { useEffect, useState } from 'react';
import { logger } from '@/lib/utils/logger';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Slot, usePathname, router } from 'expo-router';
import { Home, Dumbbell, History, TrendingUp, User } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { preloadAllAppData, PreloadProgress } from '@/lib/services/preloadService';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';
import { PreloadProvider } from '@/contexts/PreloadContext';
import { setCurrentTab } from '@/lib/navigation/navigationState';

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

  // #region agent log
  useEffect(() => {
    console.log('[DEBUG_NAV] Pathname changed:', JSON.stringify({pathname,timestamp:Date.now()}));
    // Log navigation state
    if (typeof router.canGoBack === 'function') {
      console.log('[DEBUG_NAV] Can go back:', router.canGoBack());
    }
  }, [pathname]);
  // #endregion

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
    // #region agent log
    let result = false;
    
    //  IMPORTANT: Don't let nested routes (like /settings/* or /body/*) trigger tab changes
    // These routes should preserve the current tab as active
    
    if (tabName === 'index') {
      result = pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index' || pathname.includes('/coach');
    } else if (tabName === 'workout') {
      // Workout tab owns /template/* and /workout/* and /exercise/* routes
      result = pathname.includes('/workout') || pathname.includes('/template') || pathname.includes('/exercise');
    } else if (tabName === 'history') {
      result = pathname.includes('/history');
    } else if (tabName === 'progress') {
      // Progress tab owns /body/* routes
      result = pathname.includes('/progress') || pathname.includes('/body/');
    } else if (tabName === 'profile') {
      // Profile tab owns /settings/* routes
      result = pathname.includes('/profile') || pathname.includes('/settings');
    } else {
      result = pathname.includes(tabName);
    }
    
    console.log('[DEBUG_NAV] isActive check:', JSON.stringify({tabName,tabPath,pathname,result,timestamp:Date.now()}));
    // #endregion
    
    if (tabName === 'index') {
      return pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index' || pathname.includes('/coach');
    } else if (tabName === 'workout') {
      // Workout tab owns /template/* and /workout/* routes
      return pathname.includes('/workout') || pathname.includes('/template') || pathname.includes('/exercise');
    } else if (tabName === 'history') {
      return pathname.includes('/history');
    } else if (tabName === 'progress') {
      // Progress tab owns /body/* routes (weight, measurements, photos, etc.)
      return pathname.includes('/progress') || pathname.includes('/body/');
    } else if (tabName === 'profile') {
      // Profile tab owns /settings/* routes
      return pathname.includes('/profile') || pathname.includes('/settings');
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
                onPress={() => {
                  // #region agent log
                  const isTabActive = isActive(tab.path, tab.name);
                  console.log('[DEBUG_NAV] Tab clicked:', JSON.stringify({tabName:tab.name,tabPath:tab.path,currentPathname:pathname,isTabActive,willNavigate:!isTabActive,timestamp:Date.now()}));
                  // #endregion
                  if (!isActive(tab.path, tab.name)) {
                    // #region agent log
                    console.log('[DEBUG_NAV] Executing router.replace:', JSON.stringify({from:pathname,to:tab.path,tabName:tab.name,canGoBack:typeof router.canGoBack === 'function' ? router.canGoBack() : 'unknown',timestamp:Date.now()}));
                    // #endregion
                    // Track current tab for back navigation
                    setCurrentTab(tab.path);
                    // Use replace for tab switches to avoid stack pollution
                    // This prevents: [Home, Workout, Profile] stacking up
                    router.replace(tab.path as any);
                    // #region agent log
                    console.log('[DEBUG_NAV] router.replace completed:', JSON.stringify({tabName:tab.name,tabPath:tab.path,timestamp:Date.now()}));
                    // #endregion
                  }
                }}
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
