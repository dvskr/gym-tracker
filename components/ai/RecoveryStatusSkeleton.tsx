import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';

export function RecoveryStatusSkeleton() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Skeleton width={100} height={11} />
        <Skeleton width={28} height={28} borderRadius={14} />
      </View>
      
      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Ring skeleton */}
        <Skeleton width={80} height={80} borderRadius={40} />
        
        {/* Status Info */}
        <View style={styles.textArea}>
          <Skeleton width={24} height={24} borderRadius={12} style={styles.emoji} />
          <Skeleton width={120} height={20} style={styles.title} />
          <Skeleton width="100%" height={14} style={styles.messageLine} />
          <Skeleton width="70%" height={14} style={styles.messageLine} />
        </View>
      </View>
      
      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Skeleton width={30} height={24} />
          <Skeleton width={60} height={12} style={styles.statLabel} />
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Skeleton width={30} height={24} />
          <Skeleton width={80} height={12} style={styles.statLabel} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    marginHorizontal: 8,
    marginTop: 24,
    marginBottom: 32,
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 4,
  },
  textArea: {
    flex: 1,
    marginLeft: 16,
  },
  emoji: {
    marginBottom: 4,
  },
  title: {
    marginBottom: 4,
  },
  messageLine: {
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#334155',
  },
  statLabel: {
    marginTop: 4,
  },
});
