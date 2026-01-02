import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Sparkles, AlertTriangle, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { aiService } from '@/lib/ai/aiService';
import { useAIStore } from '@/stores/aiStore';
import { AILimitStatus } from '@/lib/ai/types';

export function AIUsageIndicator({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { limits, setLimits } = useAIStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLimits();
  }, []);

  async function loadLimits() {
    setIsLoading(true);
    const data = await aiService.checkLimits();
    setLimits(data);
    setIsLoading(false);
  }

  if (isLoading || !limits) {
    return null;
  }

  const percentage = (limits.used / limits.limit) * 100;
  const isLow = limits.remaining <= 3;
  const isEmpty = limits.remaining === 0;

  if (compact) {
    return (
      <Pressable 
        style={styles.compactContainer}
        onPress={() => router.push('/settings/ai')}
      >
        <Sparkles size={14} color={isEmpty ? '#ef4444' : '#f59e0b'} />
        <Text style={[
          styles.compactText,
          isEmpty && styles.emptyText,
        ]}>
          {limits.remaining}/{limits.limit}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable 
      style={styles.container}
      onPress={() => router.push('/settings/ai')}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Sparkles size={16} color="#f59e0b" />
          <Text style={styles.title}>AI Usage</Text>
        </View>
        {limits.tier === 'free' && (
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>Free</Text>
          </View>
        )}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${Math.min(percentage, 100)}%` },
              isLow && styles.progressWarning,
              isEmpty && styles.progressEmpty,
            ]} 
          />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          {limits.used} / {limits.limit} requests today
        </Text>
        <Text style={[
          styles.remainingText,
          isLow && styles.warningText,
          isEmpty && styles.emptyText,
        ]}>
          {limits.remaining} remaining
        </Text>
      </View>

      {/* Upgrade CTA for free users */}
      {limits.tier === 'free' && (
        <Pressable 
          style={styles.upgradeCta}
          onPress={() => router.push('/settings/premium')}
        >
          <Text style={styles.upgradeText}>
            Upgrade for 100 requests/day
          </Text>
          <ChevronRight size={14} color="#3b82f6" />
        </Pressable>
      )}

      {/* Warning when low */}
      {isLow && !isEmpty && (
        <View style={styles.warningBanner}>
          <AlertTriangle size={14} color="#f59e0b" />
          <Text style={styles.warningBannerText}>
            Running low on AI requests
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  compactText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
  },
  tierBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tierText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
  },
  progressContainer: {
    marginBottom: 8,
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
  progressWarning: {
    backgroundColor: '#f59e0b',
  },
  progressEmpty: {
    backgroundColor: '#ef4444',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statsText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  remainingText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  warningText: {
    color: '#f59e0b',
  },
  emptyText: {
    color: '#ef4444',
  },
  upgradeCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 4,
  },
  upgradeText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '500',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#422006',
    marginTop: 12,
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  warningBannerText: {
    color: '#fbbf24',
    fontSize: 12,
  },
});
