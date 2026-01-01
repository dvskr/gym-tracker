import React, { memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { RecordType, formatPRType } from '@/lib/api/records';
import { useUnits } from '@/hooks/useUnits';

// ============================================
// Types
// ============================================

interface PRBadgeProps {
  /**
   * Type of PR achieved
   */
  type?: RecordType;
  /**
   * Size of the badge: 'small' | 'medium' | 'large'
   */
  size?: 'small' | 'medium' | 'large';
  /**
   * Show label text next to icon
   */
  showLabel?: boolean;
  /**
   * Animate on mount
   */
  animated?: boolean;
  /**
   * Custom style
   */
  style?: object;
}

// ============================================
// Size configurations
// ============================================

const SIZES = {
  small: {
    container: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
    icon: 12,
    text: 9,
    gap: 2,
  },
  medium: {
    container: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
    icon: 14,
    text: 11,
    gap: 4,
  },
  large: {
    container: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    icon: 18,
    text: 13,
    gap: 6,
  },
};

// ============================================
// Component
// ============================================

function PRBadgeComponent({
  type,
  size = 'small',
  showLabel = false,
  animated = true,
  style,
}: PRBadgeProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const sizeConfig = SIZES[size];

  useEffect(() => {
    if (animated) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [animated]);

  const label = type ? formatPRType(type) : 'PR';

  return (
    <Animated.View
      style={[
        styles.container,
        sizeConfig.container,
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      <Trophy size={sizeConfig.icon} color="#fbbf24" fill="#fbbf24" />
      {showLabel && (
        <Text style={[styles.label, { fontSize: sizeConfig.text, marginLeft: sizeConfig.gap }]}>
          {label}
        </Text>
      )}
    </Animated.View>
  );
}

// ============================================
// Inline PR Indicator (for set rows)
// ============================================

interface PRIndicatorProps {
  /**
   * Is this set a PR?
   */
  isPR: boolean;
  /**
   * Type of PR (optional, for tooltip)
   */
  type?: RecordType;
}

export function PRIndicator({ isPR, type }: PRIndicatorProps) {
  if (!isPR) return null;

  return (
    <View style={styles.indicator}>
      <Trophy size={12} color="#fbbf24" fill="#fbbf24" />
    </View>
  );
}

// ============================================
// PR Toast Content (for notifications)
// ============================================

interface PRToastProps {
  exerciseName: string;
  type: RecordType;
  value: number;
  previousValue?: number | null;
}

export function PRToastContent({ exerciseName, type, value, previousValue }: PRToastProps) {
  const { weightUnit } = useUnits();
  const formattedValue = type === 'max_reps' 
    ? `${value} reps` 
    : type === 'max_volume'
    ? `${value.toLocaleString()} ${weightUnit}`
    : `${value} ${weightUnit}`;

  const improvement = previousValue ? value - previousValue : null;

  return (
    <View style={styles.toastContainer}>
      <View style={styles.toastIcon}>
        <Trophy size={24} color="#fbbf24" fill="#fbbf24" />
      </View>
      <View style={styles.toastContent}>
        <Text style={styles.toastTitle}>🏆 NEW PR!</Text>
        <Text style={styles.toastExercise}>{exerciseName}</Text>
        <Text style={styles.toastValue}>
          {formatPRType(type)}: {formattedValue}
          {improvement && improvement > 0 && (
            <Text style={styles.toastImprovement}> (+{improvement})</Text>
          )}
        </Text>
      </View>
    </View>
  );
}

// ============================================
// PR Summary Card (for workout complete)
// ============================================

interface PRSummaryCardProps {
  prs: Array<{
    exerciseName: string;
    type: RecordType;
    value: number;
  }>;
}

export function PRSummaryCard({ prs }: PRSummaryCardProps) {
  const { weightUnit } = useUnits();
  if (prs.length === 0) return null;

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Trophy size={20} color="#fbbf24" fill="#fbbf24" />
        <Text style={styles.summaryTitle}>
          {prs.length} New Personal Record{prs.length > 1 ? 's' : ''}!
        </Text>
      </View>
      {prs.map((pr, index) => (
        <View key={index} style={styles.summaryItem}>
          <Text style={styles.summaryExercise}>{pr.exerciseName}</Text>
          <Text style={styles.summaryValue}>
            {formatPRType(pr.type)}: {
              pr.type === 'max_reps' 
                ? `${pr.value} reps`
                : pr.type === 'max_volume'
                ? `${pr.value.toLocaleString()} ${weightUnit}`
                : `${pr.value} ${weightUnit}`
            }
          </Text>
        </View>
      ))}
    </View>
  );
}

// ============================================
// Memoized Export
// ============================================

export const PRBadge = memo(PRBadgeComponent);
export default PRBadge;

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#422006',
  },

  label: {
    color: '#fbbf24',
    fontWeight: 'bold',
  },

  // Indicator (minimal)
  indicator: {
    marginLeft: 4,
  },

  // Toast styles
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#422006',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },

  toastIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#78350f',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  toastContent: {
    flex: 1,
  },

  toastTitle: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },

  toastExercise: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },

  toastValue: {
    color: '#fcd34d',
    fontSize: 13,
    marginTop: 2,
  },

  toastImprovement: {
    color: '#22c55e',
  },

  // Summary Card styles
  summaryCard: {
    backgroundColor: '#422006',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },

  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },

  summaryTitle: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: 'bold',
  },

  summaryItem: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#78350f',
  },

  summaryExercise: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    marginBottom: 2,
  },

  summaryValue: {
    color: '#fcd34d',
    fontSize: 13,
  },
});

