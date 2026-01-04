import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Trophy, Lock, Check } from 'lucide-react-native';
import { SettingsHeader } from '../components/SettingsHeader';
import { useAuthStore } from '../stores/authStore';
import { getAchievements, Achievement } from '../lib/api/achievements';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';
import { lightHaptic } from '@/lib/utils/haptics';

export default function AchievementsScreen() {
  useBackNavigation();

  const router = useRouter();
  const { user } = useAuthStore();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => {
    if (user?.id) {
      fetchAchievements();
    }
  }, [user?.id]);

  const fetchAchievements = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const data = await getAchievements(user.id);
      setAchievements(data);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAchievements = achievements.filter((achievement) => {
    if (filter === 'unlocked') return !!achievement.unlockedAt;
    if (filter === 'locked') return !achievement.unlockedAt;
    return true;
  });

  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;
  const totalCount = achievements.length;

  const renderAchievement = ({ item }: { item: Achievement }) => {
    const isUnlocked = !!item.unlockedAt;
    const progress = item.progress || 0;
    const percentComplete = Math.min(100, Math.round((progress / item.requirement) * 100));

    return (
      <TouchableOpacity
        style={[styles.achievementCard, !isUnlocked && styles.achievementCardLocked]}
        onPress={() => lightHaptic()}
        activeOpacity={0.7}
      >
        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            isUnlocked ? styles.iconUnlocked : styles.iconLocked,
          ]}
        >
          {isUnlocked ? (
            <Text style={styles.iconText}>{item.icon}</Text>
          ) : (
            <Lock size={20} color="#475569" />
          )}
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, !isUnlocked && styles.titleLocked]} numberOfLines={1}>
              {item.title}
            </Text>
            {isUnlocked && <Check size={18} color="#22c55e" strokeWidth={3} />}
          </View>

          <Text style={[styles.description, !isUnlocked && styles.descriptionLocked]} numberOfLines={2}>
            {item.description}
          </Text>

          {/* Progress Bar (for locked achievements) */}
          {!isUnlocked && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${percentComplete}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {progress.toLocaleString()} / {item.requirement.toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Trophy size={24} color="#fbbf24" />
          <Text style={styles.statValue}>{unlockedCount}</Text>
          <Text style={styles.statLabel}>Unlocked</Text>
        </View>
        <View style={styles.statCard}>
          <Lock size={24} color="#64748b" />
          <Text style={styles.statValue}>{totalCount - unlockedCount}</Text>
          <Text style={styles.statLabel}>Locked</Text>
        </View>
        <View style={styles.statCard}>
          <Trophy size={24} color="#3b82f6" />
          <Text style={styles.statValue}>{Math.round((unlockedCount / totalCount) * 100)}%</Text>
          <Text style={styles.statLabel}>Complete</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => {
            lightHaptic();
            setFilter('all');
          }}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            All ({totalCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unlocked' && styles.filterTabActive]}
          onPress={() => {
            lightHaptic();
            setFilter('unlocked');
          }}
        >
          <Text style={[styles.filterTabText, filter === 'unlocked' && styles.filterTabTextActive]}>
            Unlocked ({unlockedCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'locked' && styles.filterTabActive]}
          onPress={() => {
            lightHaptic();
            setFilter('locked');
          }}
        >
          <Text style={[styles.filterTabText, filter === 'locked' && styles.filterTabTextActive]}>
            Locked ({totalCount - unlockedCount})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SettingsHeader title="Achievements" />

      <FlatList
        data={filteredAchievements}
        keyExtractor={(item) => item.id}
        renderItem={renderAchievement}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  listContent: {
    padding: 16,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },

  // Filter Tabs
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: '#3b82f6',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },

  // Achievement Card
  separator: {
    height: 12,
  },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  achievementCardLocked: {
    opacity: 0.7,
  },

  // Icon
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconUnlocked: {
    backgroundColor: '#78350f',
  },
  iconLocked: {
    backgroundColor: '#334155',
  },
  iconText: {
    fontSize: 30,
  },

  // Content
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    flex: 1,
  },
  titleLocked: {
    color: '#94a3b8',
  },
  description: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 8,
  },
  descriptionLocked: {
    color: '#64748b',
  },

  // Progress
  progressContainer: {
    gap: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#64748b',
  },
});

