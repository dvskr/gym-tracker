import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { Achievement, TIER_CONFIG, getAchievementIcon } from '@/constants/achievements';
import { AchievementProgress } from '@/types/achievements';

interface ShareableAchievementCardProps {
  achievement: Achievement;
  earnedAt: string;
  stats: AchievementProgress;
}

export const ShareableAchievementCard = forwardRef<ViewShot, ShareableAchievementCardProps>(
  ({ achievement, earnedAt, stats }, ref) => {
    const tier = TIER_CONFIG[achievement.tier];
    const icon = getAchievementIcon(achievement.iconKey);
    
    const formattedDate = new Date(earnedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <ViewShot ref={ref} options={{ format: 'png', quality: 1 }}>
        <View style={styles.container}>
          <View style={[styles.card, { borderColor: tier.color }]}>
            
            {/* Achievement Icon */}
            <View style={[styles.iconCircle, { backgroundColor: tier.backgroundColor }]}>
              <Text style={styles.icon}>{icon}</Text>
            </View>

            {/* Achievement Name */}
            <Text style={styles.name}>{achievement.name}</Text>
            <Text style={styles.description}>{achievement.description}</Text>

            {/* Tier Badge */}
            <View style={[styles.tierBadge, { backgroundColor: tier.color }]}>
              <Text style={styles.tierText}>{tier.label} Achievement</Text>
            </View>

            {/* Earned Date */}
            <Text style={styles.earnedDate}>Earned: {formattedDate}</Text>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <Text style={styles.statsTitle}>My Stats</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
                  <Text style={styles.statLabel}>Workouts</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.longestStreak}</Text>
                  <Text style={styles.statLabel}>Day Streak</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {(stats.totalVolume / 1000).toFixed(0)}K
                  </Text>
                  <Text style={styles.statLabel}>Lbs Lifted</Text>
                </View>
              </View>
            </View>

            {/* Watermark */}
            <View style={styles.watermark}>
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>GT</Text>
              </View>
              <View style={styles.watermarkTextContainer}>
                <Text style={styles.appName}>GYM TRACKER</Text>
                <Text style={styles.tagline}>Track Your Gains</Text>
                <Text style={styles.url}>gymtracker.app</Text>
              </View>
            </View>
          </View>
        </View>
      </ViewShot>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    width: 350,
    padding: 4,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 3,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 48,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 4,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
    textAlign: 'center',
  },
  tierBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  tierText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  earnedDate: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 20,
  },
  statsContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  watermark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    width: '100%',
  },
  logoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  watermarkTextContainer: {
    flex: 1,
  },
  appName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  tagline: {
    fontSize: 11,
    color: '#64748b',
  },
  url: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
});

