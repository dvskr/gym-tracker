import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Play, Trash2, Dumbbell, Clock, Zap } from 'lucide-react-native';
import { useWorkoutStore, useIsWorkoutActive, useActiveWorkout } from '@/stores/workoutStore';
import { Button, Card } from '@/components/ui';

export default function WorkoutScreen() {
  const isWorkoutActive = useIsWorkoutActive();
  const activeWorkout = useActiveWorkout();
  const { startWorkout, discardWorkout, getWorkoutDuration, getTotalSets } = useWorkoutStore();

  // Handle start empty workout
  const handleStartWorkout = useCallback(() => {
    startWorkout('New Workout');
    router.push('/workout/active');
  }, [startWorkout]);

  // Handle continue workout
  const handleContinueWorkout = useCallback(() => {
    router.push('/workout/active');
  }, []);

  // Handle discard workout
  const handleDiscardWorkout = useCallback(() => {
    Alert.alert(
      'Discard Workout',
      'Are you sure you want to discard this workout? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => discardWorkout(),
        },
      ]
    );
  }, [discardWorkout]);

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Workout</Text>
      </View>

      <View style={styles.content}>
        {isWorkoutActive && activeWorkout ? (
          // Active Workout State
          <View style={styles.activeWorkoutContainer}>
            <Card variant="elevated" style={styles.activeCard}>
              <View style={styles.activeHeader}>
                <View style={styles.activeBadge}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeBadgeText}>In Progress</Text>
                </View>
              </View>

              <Text style={styles.activeWorkoutName}>{activeWorkout.name}</Text>

              <View style={styles.activeStats}>
                <View style={styles.activeStat}>
                  <Dumbbell size={18} color="#64748b" />
                  <Text style={styles.activeStatText}>
                    {activeWorkout.exercises.length} exercises
                  </Text>
                </View>
                <View style={styles.activeStat}>
                  <Zap size={18} color="#64748b" />
                  <Text style={styles.activeStatText}>
                    {getTotalSets()} sets completed
                  </Text>
                </View>
              </View>

              <View style={styles.activeActions}>
                <Button
                  title="Continue Workout"
                  variant="primary"
                  size="lg"
                  fullWidth
                  leftIcon={<Play size={20} color="#ffffff" />}
                  onPress={handleContinueWorkout}
                />

                <TouchableOpacity
                  style={styles.discardButton}
                  onPress={handleDiscardWorkout}
                >
                  <Trash2 size={18} color="#ef4444" />
                  <Text style={styles.discardText}>Discard Workout</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        ) : (
          // No Active Workout State
          <View style={styles.startContainer}>
            {/* Start Empty Workout */}
            <Card variant="elevated" style={styles.startCard}>
              <View style={styles.startIconContainer}>
                <Dumbbell size={40} color="#3b82f6" />
              </View>
              <Text style={styles.startTitle}>Ready to train?</Text>
              <Text style={styles.startSubtitle}>
                Track your sets, reps, and weights in real-time
              </Text>

              <Button
                title="Start Empty Workout"
                variant="primary"
                size="lg"
                fullWidth
                leftIcon={<Play size={20} color="#ffffff" />}
                onPress={handleStartWorkout}
                style={styles.startButton}
              />
            </Card>

            {/* Quick Start Section (Placeholder) */}
            <View style={styles.quickStartSection}>
              <Text style={styles.sectionTitle}>Quick Start</Text>
              <Text style={styles.sectionSubtitle}>
                Your recent templates will appear here
              </Text>

              {/* Placeholder Cards */}
              <View style={styles.placeholderContainer}>
                <Card variant="outlined" style={styles.placeholderCard}>
                  <View style={styles.placeholderContent}>
                    <Dumbbell size={24} color="#475569" />
                    <Text style={styles.placeholderText}>
                      Create your first template
                    </Text>
                  </View>
                </Card>
              </View>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Active Workout Styles
  activeWorkoutContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  activeCard: {
    padding: 24,
  },

  activeHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },

  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14532d',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
  },

  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },

  activeBadgeText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: 'bold',
  },

  activeWorkoutName: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },

  activeStats: {
    gap: 12,
    marginBottom: 24,
  },

  activeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  activeStatText: {
    color: '#94a3b8',
    fontSize: 15,
  },

  activeActions: {
    gap: 16,
  },

  discardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },

  discardText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'normal',
  },

  // Start Workout Styles
  startContainer: {
    flex: 1,
    paddingTop: 20,
  },

  startCard: {
    padding: 24,
    alignItems: 'center',
  },

  startIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  startTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  startSubtitle: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },

  startButton: {
    marginTop: 8,
  },

  // Quick Start Section
  quickStartSection: {
    marginTop: 32,
  },

  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },

  sectionSubtitle: {
    color: '#64748b',
    fontSize: 13,
    marginBottom: 16,
  },

  placeholderContainer: {
    gap: 12,
  },

  placeholderCard: {
    padding: 20,
  },

  placeholderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  placeholderText: {
    color: '#475569',
    fontSize: 14,
  },
});
