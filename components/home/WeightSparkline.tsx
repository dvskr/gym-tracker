import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getWeightHistory } from '@/lib/api/bodyWeight';

interface WeightSparklineProps {
  userId: string;
  goalType?: 'lose' | 'gain' | 'maintain';
  refreshTrigger?: number; // Increment to trigger refresh
}

export const WeightSparkline: React.FC<WeightSparklineProps> = ({
  userId,
  goalType = 'lose',
  refreshTrigger,
}) => {
  const [weights, setWeights] = useState<{ date: string; weight: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWeights = useCallback(async () => {
    // KEY FIX: Don't fetch if no userId (guest mode)
    if (!userId) {
      setIsLoading(false);
      return;
    }
    
    try {
      const history = await getWeightHistory(userId, 7);
      // Sort by date ascending for chart
      const sorted = [...history]
        .map(w => ({ date: w.logged_at, weight: w.weight }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setWeights(sorted);
    } catch (error) {
      console.error('Error fetching weight history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchWeights();
  }, [fetchWeights, refreshTrigger]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/body/weight-chart');
  };

  if (isLoading || weights.length === 0) {
    return (
      <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
        <View style={styles.header}>
          <Text style={styles.title}>Weight Trend</Text>
          <ChevronRight size={18} color="#64748b" />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {isLoading ? 'Loading...' : 'No weight data yet'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Calculate change
  const firstWeight = weights[0]?.weight || 0;
  const lastWeight = weights[weights.length - 1]?.weight || 0;
  const change = lastWeight - firstWeight;
  const changePercent = firstWeight > 0 ? ((change / firstWeight) * 100).toFixed(1) : '0';

  // Determine trend direction and color
  const isGaining = change > 0;
  const isLosing = change < 0;
  const isMaintaining = change === 0;

  // Color based on goal
  let trendColor = '#64748b'; // neutral
  if (goalType === 'lose') {
    trendColor = isLosing ? '#22c55e' : isGaining ? '#ef4444' : '#64748b';
  } else if (goalType === 'gain') {
    trendColor = isGaining ? '#22c55e' : isLosing ? '#ef4444' : '#64748b';
  } else {
    // maintain - any significant change is yellow
    trendColor = Math.abs(change) > 2 ? '#f59e0b' : '#22c55e';
  }

  // Sparkline data
  const chartData = {
    labels: [],
    datasets: [
      {
        data: weights.map(w => w.weight),
        color: () => trendColor,
        strokeWidth: 2,
      },
    ],
  };

  // Chart dimensions
  const chartWidth = 100;
  const chartHeight = 40;

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.title}>Weight Trend</Text>
        <ChevronRight size={18} color="#64748b" />
      </View>

      <View style={styles.content}>
        {/* Current Weight */}
        <View style={styles.weightInfo}>
          <Text style={styles.currentWeight}>{lastWeight}</Text>
          <Text style={styles.unit}>lbs</Text>
        </View>

        {/* Sparkline Chart */}
        <View style={styles.sparklineContainer}>
          <LineChart
            data={chartData}
            width={chartWidth}
            height={chartHeight}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: 'transparent',
              backgroundGradientTo: 'transparent',
              decimalPlaces: 0,
              color: () => trendColor,
              style: { borderRadius: 0 },
              propsForDots: { r: '0' },
              propsForBackgroundLines: { stroke: 'transparent' },
              propsForLabels: { fontSize: 0 },
            }}
            bezier={true}
            withDots={false}
            withInnerLines={false}
            withOuterLines={false}
            withVerticalLines={false}
            withHorizontalLines={false}
            withVerticalLabels={false}
            withHorizontalLabels={false}
            style={styles.sparkline}
          />
        </View>

        {/* Change Badge */}
        <View style={[styles.changeBadge, { backgroundColor: trendColor + '20' }]}>
          {isMaintaining ? (
            <Minus size={12} color={trendColor} />
          ) : isGaining ? (
            <TrendingUp size={12} color={trendColor} />
          ) : (
            <TrendingDown size={12} color={trendColor} />
          )}
          <Text style={[styles.changeText, { color: trendColor }]}>
            {change > 0 ? '+' : ''}{change.toFixed(1)}
          </Text>
        </View>
      </View>

      <Text style={styles.subtitle}>Last 7 days</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  weightInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },

  currentWeight: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  unit: {
    fontSize: 14,
    color: '#64748b',
  },

  sparklineContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  sparkline: {
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },

  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },

  changeText: {
    fontSize: 13,
    fontWeight: 'bold',
  },

  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },

  emptyContainer: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyText: {
    fontSize: 13,
    color: '#64748b',
  },
});

export default WeightSparkline;

