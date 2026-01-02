import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';
import { aiUsageTracker, UsageStats } from '@/lib/ai/usageTracker';
import { router } from 'expo-router';

export function AIUsageWarning() {
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const stats = await aiUsageTracker.getUsage();
      setUsage(stats);
    } catch (error) {
      logger.error('Failed to load AI usage:', error);
    }
  };

  if (!usage || dismissed) return null;

  // Only show warning when approaching limits
  if (usage.percentUsed < 80) return null;

  const isCritical = usage.percentUsed >= 95;
  const backgroundColor = isCritical ? '#7f1d1d' : '#78350f';
  const borderColor = isCritical ? '#ef4444' : '#f59e0b';
  const textColor = isCritical ? '#fecaca' : '#fcd34d';

  return (
    <View style={[styles.container, { backgroundColor, borderColor }]}>
      <View style={styles.content}>
        <AlertTriangle size={18} color={textColor} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: textColor }]}>
            {isCritical ? 'AI Limit Almost Reached' : 'AI Usage Warning'}
          </Text>
          <Text style={styles.message}>
            {usage.percentUsed}% used â€¢ {usage.requestsRemaining} requests remaining
          </Text>
          <Text style={styles.resetInfo}>
            Resets in {usage.daysUntilReset} day{usage.daysUntilReset !== 1 ? 's' : ''}
          </Text>
        </View>
        <Pressable onPress={() => setDismissed(true)} hitSlop={10}>
          <X size={18} color={textColor} />
        </Pressable>
      </View>
      
      {isCritical && (
        <Pressable 
          style={styles.actionButton}
          onPress={() => router.push('/settings/ai')}
        >
          <Text style={styles.actionButtonText}>Manage AI Settings</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    gap: 10,
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  message: {
    fontSize: 13,
    color: '#e5e7eb',
  },
  resetInfo: {
    fontSize: 11,
    color: '#9ca3af',
  },
  actionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});

