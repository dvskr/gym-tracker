import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { backgroundSync } from '../lib/sync/backgroundSync';
import { healthSyncService } from '../lib/health/healthSync';

export default function RootLayout() {
  // Start/stop background sync based on app state
  useEffect(() => {
    console.log('🚀 Initializing background sync...');
    
    // Start sync when app mounts
    backgroundSync.start();

    // Initial health sync
    healthSyncService.syncOnAppOpen();

    // Listen to app state changes
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('📱 App became active - starting sync...');
        backgroundSync.start();
        
        // Trigger health sync when app comes to foreground
        healthSyncService.syncOnAppOpen();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('📱 App went to background - stopping sync...');
        backgroundSync.stop();
      }
    });

    // Cleanup
    return () => {
      console.log('🛑 Cleaning up background sync...');
      backgroundSync.stop();
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" />
        <Slot />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
});
