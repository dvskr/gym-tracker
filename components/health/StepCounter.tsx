import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Footprints, Target, TrendingUp, RefreshCw } from 'lucide-react-native';
import { healthService } from '@/lib/health/healthService';
import type { StepsWeeklySummary } from '@/lib/health/healthService';

interface StepCounterProps {
  goal?: number;
  showGoal?: boolean;
  compact?: boolean;
  onPress?: () => void;
}

export function StepCounter({ goal = 10000, showGoal = true, compact = false, onPress }: StepCounterProps) {
  const [steps, setSteps] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSteps = async () => {
    setIsLoading(true);
    const todaySteps = await healthService.getTodaySteps();
    setSteps(todaySteps);
    setLastUpdated(new Date());
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSteps();
  }, []);

  const progress = steps && goal > 0 ? Math.min((steps / goal) * 100, 100) : 0;
  const goalMet = steps !== null && goal > 0 && steps >= goal;

  if (compact) {
    return (
      <TouchableOpacity 
        style={styles.compactContainer} 
        onPress={onPress}
        disabled={!onPress}
      >
        <Footprints size={16} color={goalMet ? '#22c55e' : '#64748b'} />
        {isLoading ? (
          <ActivityIndicator size="small" color="#64748b" />
        ) : (
          <Text style={styles.compactSteps}>{steps?.toLocaleString() || 0}</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        <Footprints size={24} color={goalMet ? '#22c55e' : '#3b82f6'} />
        <Text style={styles.title}>Steps</Text>
        <TouchableOpacity onPress={fetchSteps} style={styles.refreshButton}>
          <RefreshCw size={18} color="#64748b" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <>
          <View style={styles.stepsRow}>
            <Text style={styles.steps}>{steps?.toLocaleString() || 0}</Text>
            <Text style={styles.stepsLabel}>steps today</Text>
          </View>

          {showGoal && goal > 0 && (
            <>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressText}>{Math.round(progress)}%</Text>
              </View>

              <View style={styles.goalRow}>
                <Target size={14} color="#64748b" />
                <Text style={styles.goalText}>
                  {goalMet ? 'Goal reached! ' : `${(goal - (steps || 0)).toLocaleString()} to go`}
                </Text>
              </View>
            </>
          )}

          {lastUpdated && (
            <Text style={styles.timestamp}>
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

interface WeeklyStepsProps {
  goal?: number;
}

export function WeeklySteps({ goal = 10000 }: WeeklyStepsProps) {
  const [summary, setSummary] = useState<StepsWeeklySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchWeeklySteps() {
      setIsLoading(true);
      const data = await healthService.getWeeklySteps(goal);
      setSummary(data);
      setIsLoading(false);
    }

    fetchWeeklySteps();
  }, [goal]);

  if (isLoading) {
    return (
      <View style={styles.weeklyContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.weeklyContainer}>
        <Text style={styles.noDataText}>No step data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.weeklyContainer}>
      <Text style={styles.weeklyTitle}>This Week</Text>

      <View style={styles.summaryStats}>
        <View style={styles.summaryStat}>
          <Footprints size={20} color="#3b82f6" />
          <Text style={styles.summaryValue}>{summary.totalSteps.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Total Steps</Text>
        </View>

        <View style={styles.summaryStat}>
          <TrendingUp size={20} color="#22c55e" />
          <Text style={styles.summaryValue}>{summary.averageSteps.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Avg Per Day</Text>
        </View>

        {summary.goalProgress !== undefined && (
          <View style={styles.summaryStat}>
            <Target size={20} color="#f59e0b" />
            <Text style={styles.summaryValue}>{summary.goalProgress}%</Text>
            <Text style={styles.summaryLabel}>Goal Progress</Text>
          </View>
        )}
      </View>

      <View style={styles.dailySteps}>
        {summary.dailySteps.map((day, index) => (
          <DayBar
            key={day.date.toISOString()}
            date={day.date}
            steps={day.steps}
            goal={goal}
            isToday={index === summary.dailySteps.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

interface DayBarProps {
  date: Date;
  steps: number;
  goal: number;
  isToday: boolean;
}

function DayBar({ date, steps, goal, isToday }: DayBarProps) {
  const progress = goal > 0 ? Math.min((steps / goal) * 100, 100) : 0;
  const goalMet = steps >= goal;

  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

  return (
    <View style={styles.dayBar}>
      <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{dayName}</Text>
      <View style={styles.barContainer}>
        <View
          style={[
            styles.bar,
            { height: `${Math.max(progress, 5)}%` },
            goalMet && styles.barGoalMet,
            isToday && styles.barToday,
          ]}
        />
      </View>
      <Text style={styles.daySteps}>{(steps / 1000).toFixed(1)}k</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  compactSteps: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  refreshButton: {
    padding: 4,
  },
  loading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  stepsRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  steps: {
    fontSize: 48,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  stepsLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#0f172a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    width: 40,
    textAlign: 'right',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  goalText: {
    fontSize: 13,
    color: '#64748b',
  },
  timestamp: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    marginTop: 8,
  },
  weeklyContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },
  weeklyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 16,
  },
  noDataText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 20,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  summaryStat: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    marginTop: 6,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  dailySteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  dayBar: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barContainer: {
    flex: 1,
    width: '80%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    backgroundColor: '#3b82f6',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barGoalMet: {
    backgroundColor: '#22c55e',
  },
  barToday: {
    backgroundColor: '#f59e0b',
  },
  dayLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  dayLabelToday: {
    color: '#f59e0b',
  },
  daySteps: {
    fontSize: 10,
    color: '#64748b',
  },
});



