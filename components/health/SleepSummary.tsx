import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Moon, RefreshCw, TrendingUp, AlertCircle } from 'lucide-react-native';
import { healthService } from '@/lib/health/healthService';
import type { SleepData, SleepWeeklySummary } from '@/lib/health/healthService';

interface SleepSummaryProps {
  compact?: boolean;
  onPress?: () => void;
}

export function SleepSummary({ compact = false, onPress }: SleepSummaryProps) {
  const [sleep, setSleep] = useState<SleepData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSleep = async () => {
    setIsLoading(true);
    const data = await healthService.getLastNightSleep();
    setSleep(data);
    setLastUpdated(new Date());
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSleep();
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, compact && styles.compactContainer]}>
        <ActivityIndicator size="small" color="#8b5cf6" />
      </View>
    );
  }

  if (!sleep) {
    return (
      <TouchableOpacity 
        style={[styles.container, compact && styles.compactContainer]} 
        onPress={onPress}
        disabled={!onPress}
      >
        <Moon size={compact ? 16 : 20} color="#64748b" />
        <Text style={styles.noData}>No sleep data</Text>
      </TouchableOpacity>
    );
  }

  const hours = Math.floor(sleep.totalMinutes / 60);
  const minutes = sleep.totalMinutes % 60;
  const score = healthService.calculateSleepScore(sleep);
  const quality = healthService.getSleepQuality(score);

  if (compact) {
    return (
      <TouchableOpacity 
        style={styles.compactContainer} 
        onPress={onPress}
        disabled={!onPress}
      >
        <Moon size={16} color={quality.color} />
        <Text style={styles.compactDuration}>
          {hours}h {minutes}m
        </Text>
        <View style={[styles.compactScore, { backgroundColor: quality.color }]}>
          <Text style={styles.compactScoreText}>{score}</Text>
        </View>
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
        <Moon size={24} color={quality.color} fill={quality.color} />
        <Text style={styles.title}>Sleep</Text>
        <TouchableOpacity onPress={fetchSleep} style={styles.refreshButton}>
          <RefreshCw size={18} color="#64748b" />
        </TouchableOpacity>
      </View>

      <View style={styles.mainContent}>
        <View style={styles.durationRow}>
          <Text style={styles.duration}>
            {hours}h {minutes}m
          </Text>
          <View style={[styles.scoreBadge, { backgroundColor: quality.color }]}>
            <Text style={styles.scoreText}>{score}</Text>
          </View>
        </View>

        <Text style={styles.sleepLabel}>last night</Text>

        <View style={styles.timeRow}>
          <Text style={styles.timeText}>
            {sleep.sleepStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {' → '}
            {sleep.sleepEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <Text style={[styles.qualityMessage, { color: quality.color }]}>
          {quality.message}
        </Text>
      </View>

      {sleep.stages && (
        <View style={styles.stages}>
          <SleepStageBar
            label="Deep"
            minutes={sleep.stages.deep || 0}
            color="#8b5cf6"
            total={sleep.totalMinutes}
          />
          <SleepStageBar
            label="REM"
            minutes={sleep.stages.rem || 0}
            color="#3b82f6"
            total={sleep.totalMinutes}
          />
          <SleepStageBar
            label="Light"
            minutes={sleep.stages.light || 0}
            color="#94a3b8"
            total={sleep.totalMinutes}
          />
          {sleep.stages.awake && sleep.stages.awake > 0 ? (
            <SleepStageBar
              label="Awake"
              minutes={sleep.stages.awake}
              color="#ef4444"
              total={sleep.totalMinutes}
            />
          ) : null}
        </View>
      )}

      {lastUpdated && (
        <Text style={styles.timestamp}>
          Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      )}
    </TouchableOpacity>
  );
}

interface SleepStageBarProps {
  label: string;
  minutes: number;
  color: string;
  total: number;
}

function SleepStageBar({ label, minutes, color, total }: SleepStageBarProps) {
  const percentage = (minutes / total) * 100;

  return (
    <View style={styles.stageRow}>
      <Text style={styles.stageLabel}>{label}</Text>
      <View style={styles.stageBarContainer}>
        <View style={[styles.stageBar, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.stageValue}>{minutes}m</Text>
    </View>
  );
}

export function WeeklySleep() {
  const [summary, setSummary] = useState<SleepWeeklySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchWeeklySleep() {
      setIsLoading(true);
      const data = await healthService.getWeeklySleep();
      setSummary(data);
      setIsLoading(false);
    }

    fetchWeeklySleep();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.weeklyContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (!summary || summary.dailySleep.length === 0) {
    return (
      <View style={styles.weeklyContainer}>
        <Text style={styles.noData}>No sleep data available</Text>
      </View>
    );
  }

  const avgHours = Math.floor(summary.averageMinutes / 60);
  const avgMinutes = summary.averageMinutes % 60;

  return (
    <View style={styles.weeklyContainer}>
      <Text style={styles.weeklyTitle}>This Week's Sleep</Text>

      <View style={styles.summaryStats}>
        <View style={styles.summaryStat}>
          <Moon size={20} color="#8b5cf6" />
          <Text style={styles.summaryValue}>
            {avgHours}h {avgMinutes}m
          </Text>
          <Text style={styles.summaryLabel}>Avg Per Night</Text>
        </View>

        <View style={styles.summaryStat}>
          <TrendingUp size={20} color="#22c55e" />
          <Text style={styles.summaryValue}>{summary.averageScore}</Text>
          <Text style={styles.summaryLabel}>Avg Score</Text>
        </View>

        <View style={styles.summaryStat}>
          <Moon size={20} color="#3b82f6" />
          <Text style={styles.summaryValue}>{summary.dailySleep.length}</Text>
          <Text style={styles.summaryLabel}>Nights Tracked</Text>
        </View>
      </View>

      <View style={styles.dailySleep}>
        {summary.dailySleep.map((sleep, index) => {
          const score = healthService.calculateSleepScore(sleep);
          const quality = healthService.getSleepQuality(score);

          return (
            <SleepDayBar
              key={sleep.date.toISOString()}
              date={sleep.date}
              minutes={sleep.totalMinutes}
              score={score}
              color={quality.color}
              isTonight={index === summary.dailySleep.length - 1}
            />
          );
        })}
      </View>
    </View>
  );
}

interface SleepDayBarProps {
  date: Date;
  minutes: number;
  score: number;
  color: string;
  isTonight: boolean;
}

function SleepDayBar({ date, minutes, score, color, isTonight }: SleepDayBarProps) {
  const hours = minutes / 60;
  const targetHours = 8;
  const percentage = Math.min((hours / targetHours) * 100, 100);

  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

  return (
    <View style={styles.dayBar}>
      <Text style={[styles.dayLabel, isTonight && styles.dayLabelTonight]}>{dayName}</Text>
      <View style={styles.barContainer}>
        <View
          style={[
            styles.bar,
            { height: `${Math.max(percentage, 5)}%`, backgroundColor: color },
            isTonight && styles.barTonight,
          ]}
        />
      </View>
      <Text style={styles.dayHours}>{hours.toFixed(1)}h</Text>
    </View>
  );
}

export function RecoveryRecommendation() {
  const [recommendation, setRecommendation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRecommendation() {
      setIsLoading(true);
      const rec = await healthService.getRecoveryRecommendation();
      setRecommendation(rec);
      setIsLoading(false);
    }

    fetchRecommendation();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.recommendationContainer}>
        <ActivityIndicator size="small" color="#8b5cf6" />
      </View>
    );
  }

  if (!recommendation) {
    return null;
  }

  const getRecommendationStyle = () => {
    switch (recommendation.recommendation) {
      case 'intense':
        return { backgroundColor: '#22c55e20', borderColor: '#22c55e', icon: '💪' };
      case 'moderate':
        return { backgroundColor: '#3b82f620', borderColor: '#3b82f6', icon: '🏃' };
      case 'light':
        return { backgroundColor: '#f59e0b20', borderColor: '#f59e0b', icon: '💪' };
      case 'rest':
        return { backgroundColor: '#ef444420', borderColor: '#ef4444', icon: '😴' };
      default:
        return { backgroundColor: '#64748b20', borderColor: '#64748b', icon: '9' };
    }
  };

  const style = getRecommendationStyle();

  return (
    <View
      style={[
        styles.recommendationContainer,
        { backgroundColor: style.backgroundColor, borderColor: style.borderColor },
      ]}
    >
      <Text style={styles.recommendationIcon}>{style.icon}</Text>
      <View style={styles.recommendationContent}>
        <Text style={styles.recommendationTitle}>
          {recommendation.recommendation.charAt(0).toUpperCase() +
            recommendation.recommendation.slice(1)}{' '}
          Workout Recommended
        </Text>
        <Text style={styles.recommendationReason}>{recommendation.reason}</Text>
      </View>
      {recommendation.sleepScore > 0 && (
        <View style={[styles.recommendationScore, { borderColor: style.borderColor }]}>
          <Text style={styles.recommendationScoreText}>{recommendation.sleepScore}</Text>
        </View>
      )}
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
    gap: 8,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  compactDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  compactScore: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compactScoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
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
  mainContent: {
    alignItems: 'center',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  duration: {
    fontSize: 42,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  sleepLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  timeRow: {
    marginBottom: 8,
  },
  timeText: {
    fontSize: 13,
    color: '#64748b',
  },
  qualityMessage: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  stages: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 8,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stageLabel: {
    fontSize: 12,
    color: '#94a3b8',
    width: 50,
  },
  stageBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#0f172a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  stageBar: {
    height: '100%',
    borderRadius: 3,
  },
  stageValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f1f5f9',
    width: 40,
    textAlign: 'right',
  },
  noData: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  timestamp: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    marginTop: 12,
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
  dailySleep: {
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
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barTonight: {
    opacity: 0.8,
  },
  dayLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  dayLabelTonight: {
    color: '#8b5cf6',
  },
  dayHours: {
    fontSize: 10,
    color: '#64748b',
  },
  recommendationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  recommendationIcon: {
    fontSize: 32,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  recommendationReason: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  recommendationScore: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
  },
  recommendationScoreText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
});

