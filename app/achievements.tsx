import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Trophy, Lock, Filter } from 'lucide-react-native';
import { SettingsHeader } from '../components/SettingsHeader';
import { useAuthStore } from '../stores/authStore';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';
import { lightHaptic } from '@/lib/utils/haptics';
import { logger } from '@/lib/utils/logger';
import { AchievementCardV2 } from '@/components/AchievementCard';
import { 
  getAchievementsWithStatus, 
  getAchievementStats 
} from '@/lib/achievements/achievementService';
import { AchievementWithStatus } from '@/types/achievements';
import { 
  AchievementCategory, 
  AchievementTier,
  CATEGORY_LABELS,
  TIER_CONFIG 
} from '@/constants/achievements';

type FilterType = 'all' | 'unlocked' | 'locked';

export default function AchievementsScreen() {
  useBackNavigation();

  const router = useRouter();
  const { user } = useAuthStore();
  const [achievements, setAchievements] = useState<AchievementWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<AchievementCategory | 'all'>('all');
  const [tierFilter, setTierFilter] = useState<AchievementTier | 'all'>('all');
  const [stats, setStats] = useState({ unlocked: 0, total: 0, percent: 0, byTier: {} as any });

  useEffect(() => {
    if (user?.id) {
      fetchAchievements();
    }
  }, [user?.id]);

  const fetchAchievements = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const [data, statsData] = await Promise.all([
        getAchievementsWithStatus(user.id),
        getAchievementStats(user.id),
      ]);
      setAchievements(data);
      setStats(statsData);
    } catch (error: unknown) {
      logger.error('Failed to fetch achievements', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAchievements = useMemo(() => {
    return achievements.filter((item) => {
      // Status filter
      if (filter === 'unlocked' && !item.unlocked) return false;
      if (filter === 'locked' && item.unlocked) return false;
      
      // Category filter
      if (categoryFilter !== 'all' && item.achievement.category !== categoryFilter) return false;
      
      // Tier filter
      if (tierFilter !== 'all' && item.achievement.tier !== tierFilter) return false;
      
      return true;
    });
  }, [achievements, filter, categoryFilter, tierFilter]);

  // Group by category
  const achievementsByCategory = useMemo(() => {
    const grouped: Record<string, AchievementWithStatus[]> = {};
    
    filteredAchievements.forEach((item) => {
      const category = item.achievement.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });
    
    return grouped;
  }, [filteredAchievements]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <SettingsHeader title="Achievements" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading achievements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SettingsHeader title="Achievements" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Trophy size={24} color="#fbbf24" />
            <Text style={styles.statValue}>{stats.unlocked}</Text>
            <Text style={styles.statLabel}>Unlocked</Text>
          </View>
          <View style={styles.statCard}>
            <Lock size={24} color="#64748b" />
            <Text style={styles.statValue}>{stats.locked}</Text>
            <Text style={styles.statLabel}>Locked</Text>
          </View>
          <View style={styles.statCard}>
            <Trophy size={24} color="#3b82f6" />
            <Text style={styles.statValue}>{stats.percent}%</Text>
            <Text style={styles.statLabel}>Complete</Text>
          </View>
        </View>

        {/* Tier Stats */}
        <View style={styles.tierStatsContainer}>
          {Object.entries(stats.byTier).map(([tier, data]: [string, any]) => (
            <View key={tier} style={styles.tierStatCard}>
              <View style={[styles.tierDot, { backgroundColor: TIER_CONFIG[tier as AchievementTier].color }]} />
              <Text style={styles.tierStatLabel}>{TIER_CONFIG[tier as AchievementTier].label}</Text>
              <Text style={styles.tierStatValue}>{data.unlocked}/{data.total}</Text>
            </View>
          ))}
        </View>

        {/* Status Filter */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => {
              lightHaptic();
              setFilter('all');
            }}
          >
            <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
              All
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
              Unlocked
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
              Locked
            </Text>
          </TouchableOpacity>
        </View>

        {/* Achievements by Category */}
        {Object.entries(achievementsByCategory).map(([category, items]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>
              {CATEGORY_LABELS[category as AchievementCategory]}
            </Text>
            {items.map((item) => (
              <AchievementCardV2
                key={item.achievement.id}
                data={item}
                compact={true}
                onPress={() => lightHaptic()}
              />
            ))}
          </View>
        ))}

        {filteredAchievements.length === 0 && (
          <View style={styles.emptyState}>
            <Trophy size={48} color="#334155" />
            <Text style={styles.emptyText}>No achievements found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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

  // Tier Stats
  tierStatsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tierStatCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tierStatLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  tierStatValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#f1f5f9',
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

  // Category Section
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },

  bottomSpacer: {
    height: 40,
  },
});
