import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';

export function WorkoutSuggestionSkeleton() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Skeleton width={60} height={12} />
        <Skeleton width={20} height={20} borderRadius={10} />
      </View>
      
      {/* Workout type */}
      <Skeleton width={180} height={28} style={styles.title} />
      
      {/* Reason */}
      <Skeleton width="100%" height={14} style={styles.reason} />
      <Skeleton width="75%" height={14} style={styles.reason} />
      
      {/* Exercises */}
      <View style={styles.exercises}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.exerciseRow}>
            <Skeleton width="65%" height={16} />
            <Skeleton width={60} height={14} />
          </View>
        ))}
      </View>
      
      {/* Button */}
      <Skeleton width="100%" height={48} borderRadius={12} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    marginHorizontal: 0,
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    marginTop: 8,
    marginBottom: 4,
  },
  reason: {
    marginTop: 4,
  },
  exercises: {
    marginTop: 20,
    marginBottom: 24,
    gap: 12,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    marginTop: 0,
  },
});



