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
import { Trophy, TrendingUp, Calendar } from 'lucide-react-native';
import { SettingsHeader } from '../components/SettingsHeader';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';
import { lightHaptic } from '@/lib/utils/haptics';
import { useUnits } from '@/hooks/useUnits';

interface PersonalRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  type: 'weight' | 'reps' | 'volume';
  value: number;
  weight: number;
  reps: number;
  achievedAt: string;
}

export default function PersonalRecordsScreen() {
  useBackNavigation();

  const router = useRouter();
  const { user } = useAuthStore();
  const { weightUnit } = useUnits();
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'weight' | 'reps' | 'volume'>('all');

  useEffect(() => {
    if (user?.id) {
      fetchPRs();
    }
  }, [user?.id]);

  const fetchPRs = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('personal_records')
        .select(`
          id,
          exercise_id,
          record_type,
          weight,
          reps,
          value,
          achieved_at,
          exercises (
            name
          )
        `)
        .eq('user_id', user.id)
        .order('achieved_at', { ascending: false });

      if (error) throw error;

      const formattedPRs: PersonalRecord[] = (data || []).map((pr: any) => ({
        id: pr.id,
        exerciseId: pr.exercise_id,
        exerciseName: pr.exercises?.name || 'Unknown Exercise',
        type: pr.record_type.replace('max_', '') as 'weight' | 'reps' | 'volume',
        value: pr.value,
        weight: pr.weight || 0,
        reps: pr.reps || 0,
        achievedAt: pr.achieved_at,
      }));

      setPrs(formattedPRs);
    } catch (error) {
      console.error('Failed to fetch PRs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPRs = prs.filter((pr) => {
    if (filter === 'all') return true;
    return pr.type === filter;
  });

  const getPRIcon = (type: string) => {
    switch (type) {
      case 'weight':
        return <Trophy size={18} color="#fbbf24" />;
      case 'reps':
        return <TrendingUp size={18} color="#22c55e" />;
      case 'volume':
        return <Trophy size={18} color="#3b82f6" />;
      default:
        return <Trophy size={18} color="#94a3b8" />;
    }
  };

  const getPRIconBackground = (type: string) => {
    switch (type) {
      case 'weight':
        return '#78350f';
      case 'reps':
        return '#14532d';
      case 'volume':
        return '#1e3a8a';
      default:
        return '#334155';
    }
  };

  const getPRLabel = (type: string) => {
    switch (type) {
      case 'weight':
        return 'Weight PR';
      case 'reps':
        return 'Reps PR';
      case 'volume':
        return 'Volume PR';
      default:
        return 'PR';
    }
  };

  const formatDate = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderPR = ({ item }: { item: PersonalRecord }) => (
    <TouchableOpacity
      style={styles.prCard}
      onPress={() => {
        lightHaptic();
        router.push({
          pathname: `/exercise/${item.exerciseId}`,
          params: { returnTo: '/prs' },
        });
      }}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: getPRIconBackground(item.type) }]}>
        {getPRIcon(item.type)}
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <Text style={styles.exerciseName} numberOfLines={1}>
          {item.exerciseName}
        </Text>
        <Text style={styles.prValue}>
          {item.weight} {weightUnit} × {item.reps} reps
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.prType}>{getPRLabel(item.type)}</Text>
          <Text style={styles.separator}>•</Text>
          <Text style={styles.date}>{formatDate(item.achievedAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View>
      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Trophy size={24} color="#fbbf24" />
          <Text style={styles.statValue}>{prs.length}</Text>
          <Text style={styles.statLabel}>Total PRs</Text>
        </View>
        <View style={styles.statCard}>
          <Trophy size={24} color="#fbbf24" />
          <Text style={styles.statValue}>
            {prs.filter((pr) => pr.type === 'weight').length}
          </Text>
          <Text style={styles.statLabel}>Weight</Text>
        </View>
        <View style={styles.statCard}>
          <TrendingUp size={24} color="#22c55e" />
          <Text style={styles.statValue}>
            {prs.filter((pr) => pr.type === 'reps').length}
          </Text>
          <Text style={styles.statLabel}>Reps</Text>
        </View>
        <View style={styles.statCard}>
          <Trophy size={24} color="#3b82f6" />
          <Text style={styles.statValue}>
            {prs.filter((pr) => pr.type === 'volume').length}
          </Text>
          <Text style={styles.statLabel}>Volume</Text>
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
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'weight' && styles.filterTabActive]}
          onPress={() => {
            lightHaptic();
            setFilter('weight');
          }}
        >
          <Text style={[styles.filterTabText, filter === 'weight' && styles.filterTabTextActive]}>
            Weight
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'reps' && styles.filterTabActive]}
          onPress={() => {
            lightHaptic();
            setFilter('reps');
          }}
        >
          <Text style={[styles.filterTabText, filter === 'reps' && styles.filterTabTextActive]}>
            Reps
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'volume' && styles.filterTabActive]}
          onPress={() => {
            lightHaptic();
            setFilter('volume');
          }}
        >
          <Text style={[styles.filterTabText, filter === 'volume' && styles.filterTabTextActive]}>
            Volume
          </Text>
        </TouchableOpacity>
      </View>

      {/* Section Header */}
      <Text style={styles.listHeader}>YOUR PERSONAL RECORDS</Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Trophy size={48} color="#4b5563" />
      <Text style={styles.emptyTitle}>No Personal Records Yet</Text>
      <Text style={styles.emptyMessage}>
        Complete workouts and push your limits to set new PRs!
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SettingsHeader title="Personal Records" />

      <FlatList
        data={filteredPRs}
        keyExtractor={(item) => item.id}
        renderItem={renderPR}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        contentContainerStyle={[
          styles.listContent,
          filteredPRs.length === 0 && styles.listContentEmpty,
        ]}
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
  listContentEmpty: {
    flex: 1,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  statLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
  },

  // Filter Tabs
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
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
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },

  // List Header
  listHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  // PR Card
  separator: {
    height: 12,
  },
  prCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },

  // Icon
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  // Content
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  prValue: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prType: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '600',
  },
  separator: {
    fontSize: 12,
    color: '#64748b',
    marginHorizontal: 6,
  },
  date: {
    fontSize: 12,
    color: '#64748b',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f1f5f9',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});

