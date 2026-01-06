import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 4, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View 
      style={[
        styles.skeleton, 
        { width, height, borderRadius, opacity },
        style,
      ]} 
    />
  );
}

// Pre-built skeleton components for common use cases
export function SkeletonText({ width = '100%', height = 14 }: { width?: number | string; height?: number }) {
  return <Skeleton width={width} height={height} borderRadius={4} />;
}

export function SkeletonCircle({ size = 40 }: { size?: number }) {
  return <Skeleton width={size} height={size} borderRadius={size / 2} />;
}

export function SkeletonCard({ height = 100 }: { height?: number }) {
  return <Skeleton width="100%" height={height} borderRadius={8} />;
}

// Exercise list item skeleton
export function ExerciseItemSkeleton() {
  return (
    <View style={styles.exerciseItem}>
      <Skeleton width={60} height={60} borderRadius={8} />
      <View style={styles.exerciseInfo}>
        <Skeleton width="70%" height={16} borderRadius={4} />
        <Skeleton width="50%" height={12} borderRadius={4} style={styles.mt8} />
        <Skeleton width="40%" height={12} borderRadius={4} style={styles.mt8} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#334155',
  },
  exerciseItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  exerciseInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  mt8: {
    marginTop: 8,
  },
});


