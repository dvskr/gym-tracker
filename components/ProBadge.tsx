import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Crown } from 'lucide-react-native';
import { useProStore } from '@/stores/proStore';

interface ProBadgeProps {
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export function ProBadge({ onPress, size = 'medium' }: ProBadgeProps) {
  const { isPro } = useProStore();

  if (isPro) {
    return (
      <View style={[styles.badge, styles[size]]}>
        <Crown size={size === 'small' ? 12 : size === 'medium' ? 14 : 16} color="#fbbf24" />
        <Text style={[styles.text, styles[`${size}Text`]]}>PRO</Text>
      </View>
    );
  }

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={[styles.upgradeBadge, styles[size]]}>
        <Crown size={size === 'small' ? 12 : size === 'medium' ? 14 : 16} color="#3b82f6" />
        <Text style={[styles.upgradeText, styles[`${size}Text`]]}>UPGRADE</Text>
      </TouchableOpacity>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#422006',
    borderRadius: 12,
    gap: 4,
  },
  upgradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    gap: 4,
  },
  small: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  medium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  large: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: {
    color: '#fbbf24',
    fontWeight: 'bold',
  },
  upgradeText: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  smallText: {
    fontSize: 10,
  },
  mediumText: {
    fontSize: 12,
  },
  largeText: {
    fontSize: 14,
  },
});

