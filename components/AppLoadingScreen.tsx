import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Dumbbell } from 'lucide-react-native';
import { PreloadProgress } from '@/lib/services/preloadService';

interface Props {
  progress: PreloadProgress;
}

const PHASE_LABELS: Record<string, string> = {
  starting: 'Initializing...',
  exercises: 'Loading exercises...',
  favorites: 'Loading favorites...',
  ai: 'Preparing AI coach...',
  images: 'Caching images...',
};

export function AppLoadingScreen({ progress }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* App Logo/Icon */}
        <View style={styles.logoContainer}>
          <Dumbbell size={48} color="#3b82f6" strokeWidth={2} />
        </View>
        
        {/* App Name */}
        <Text style={styles.appName}>GymTracker</Text>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View 
              style={[
                styles.progressFill,
                { width: `${progress.percentage}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>{progress.percentage}%</Text>
        </View>
        
        {/* Phase Label */}
        <Text style={styles.phaseText}>
          {PHASE_LABELS[progress.phase] || 'Loading...'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
    width: '100%',
    maxWidth: 400,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 32,
  },
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#64748b',
    width: 40,
    textAlign: 'right',
    fontWeight: '600',
  },
  phaseText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 16,
  },
});

