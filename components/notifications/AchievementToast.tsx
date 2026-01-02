import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Award } from 'lucide-react-native';
import { Achievement } from '../../lib/notifications/achievementNotifications';
import { eventEmitter } from '../../lib/utils/eventEmitter';

export function AchievementToast() {
  const [achievement, setAchievement] = useState<Achievement | null>(null);
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-150)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = eventEmitter.on('achievement_unlocked', (ach: Achievement) => {
      setAchievement(ach);
      setVisible(true);

      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      // Rotate icon animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Auto hide after 5 seconds
      setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -150,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setVisible(false);
          setAchievement(null);
        });
      }, 5000);
    });

    return unsubscribe;
  }, [slideAnim, rotateAnim]);

  if (!visible || !achievement) return null;

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getBorderColor = () => {
    switch (achievement.category) {
      case 'workout':
        return '#3b82f6';
      case 'streak':
        return '#ef4444';
      case 'volume':
        return '#22c55e';
      case 'pr':
        return '#f59e0b';
      default:
        return '#8b5cf6';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          borderColor: getBorderColor(),
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          { transform: [{ rotate: rotation }] },
        ]}
      >
        <Award size={28} color={getBorderColor()} />
      </Animated.View>

      <View style={styles.content}>
        <Text style={styles.header}> Achievement Unlocked!</Text>
        <View style={styles.titleRow}>
          <Text style={styles.icon}>{achievement.icon}</Text>
          <Text style={styles.title}>{achievement.title}</Text>
        </View>
        <Text style={styles.description}>{achievement.description}</Text>
      </View>

      <View style={styles.stars}>
        <Text style={styles.starEmoji}>⭐</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    zIndex: 9998, // Slightly below PR toast
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#334155',
  },
  content: {
    flex: 1,
  },
  header: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f59e0b',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  icon: {
    fontSize: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
    flex: 1,
  },
  description: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  stars: {
    marginLeft: 8,
  },
  starEmoji: {
    fontSize: 32,
  },
});
