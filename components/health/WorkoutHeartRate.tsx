import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useHeartRate, useHeartRateZone } from '@/hooks/useHeartRate';
import type { HeartRateStats } from '@/lib/health/healthService';

interface WorkoutHeartRateProps {
  workout: {
    started_at: string;
    ended_at?: string | null;
  };
  userAge?: number;
}

export function WorkoutHeartRate({ workout, userAge }: WorkoutHeartRateProps) {
  const { stats, isLoading, error } = useHeartRate(
    new Date(workout.started_at),
    workout.ended_at ? new Date(workout.ended_at) : new Date()
  );

  if (isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color="#ef4444" />
        <Text style={styles.loadingText}>Loading heart rate data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.card}>
        <Heart size={20} color="#64748b" />
        <Text style={styles.errorText}>Unable to load heart rate data</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.card}>
        <Heart size={20} color="#64748b" />
        <Text style={styles.noDataText}>No heart rate data available</Text>
        <Text style={styles.hintText}>
          Make sure your smartwatch or fitness tracker is synced
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Heart size={24} color="#ef4444" fill="#ef4444" />
        <Text style={styles.title}>Heart Rate</Text>
      </View>

      <View style={styles.stats}>
        <StatItem label="Average" value={stats.average} unit="bpm" highlight />
        <StatItem label="Max" value={stats.max} unit="bpm" />
        <StatItem label="Min" value={stats.min} unit="bpm" />
      </View>

      {stats.resting && (
        <View style={styles.restingRow}>
          <Text style={styles.restingLabel}>Resting HR:</Text>
          <Text style={styles.restingValue}>{stats.resting} bpm</Text>
        </View>
      )}

      {userAge && (
        <HeartRateZoneIndicator bpm={stats.average} age={userAge} />
      )}

      <Text style={styles.readingsCount}>
        {stats.readings.length} reading{stats.readings.length !== 1 ? 's' : ''} during workout
      </Text>
    </View>
  );
}

interface StatItemProps {
  label: string;
  value: number;
  unit: string;
  highlight?: boolean;
}

function StatItem({ label, value, unit, highlight }: StatItemProps) {
  return (
    <View style={[styles.stat, highlight && styles.statHighlight]}>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface HeartRateZoneIndicatorProps {
  bpm: number;
  age: number;
}

function HeartRateZoneIndicator({ bpm, age }: HeartRateZoneIndicatorProps) {
  const zone = useHeartRateZone(bpm, age);

  if (!zone) return null;

  return (
    <View style={styles.zoneContainer}>
      <View style={[styles.zoneDot, { backgroundColor: zone.color }]} />
      <Text style={styles.zoneText}>
        {zone.name} Zone ({zone.min}-{zone.max} bpm)
      </Text>
    </View>
  );
}

// Compact version for lists
interface HeartRateBadgeProps {
  stats?: HeartRateStats | null;
  isLoading?: boolean;
}

export function HeartRateBadge({ stats, isLoading }: HeartRateBadgeProps) {
  if (isLoading) {
    return (
      <View style={styles.badge}>
        <ActivityIndicator size="small" color="#ef4444" />
      </View>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <View style={styles.badge}>
      <Heart size={14} color="#ef4444" fill="#ef4444" />
      <Text style={styles.badgeText}>{stats.average} bpm</Text>
    </View>
  );
}

// Inline stats display
interface HeartRateInlineProps {
  stats: HeartRateStats;
  showResting?: boolean;
}

export function HeartRateInline({ stats, showResting }: HeartRateInlineProps) {
  return (
    <View style={styles.inline}>
      <Heart size={16} color="#ef4444" />
      <Text style={styles.inlineText}>
        <Text style={styles.inlineBold}>{stats.average}</Text> avg
        {' • '}
        <Text style={styles.inlineBold}>{stats.max}</Text> max
        {showResting && stats.resting && (
          <>
            {' • '}
            <Text style={styles.inlineBold}>{stats.resting}</Text> rest
          </>
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 8,
  },
  noDataText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
  },
  statHighlight: {
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  statValueHighlight: {
    color: '#ef4444',
  },
  statUnit: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  restingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  restingLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  restingValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  zoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#0f172a',
    borderRadius: 8,
  },
  zoneDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  zoneText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  readingsCount: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  inlineBold: {
    fontWeight: '600',
    color: '#f1f5f9',
  },
});



