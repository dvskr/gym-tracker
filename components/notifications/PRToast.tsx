import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Trophy, TrendingUp, Target } from 'lucide-react-native';
import { PRNotification } from '../../lib/notifications/achievementNotifications';
import { eventEmitter } from '../../lib/utils/eventEmitter';

export function PRToast() {
  const [prData, setPRData] = useState<PRNotification | null>(null);
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-150)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const unsubscribe = eventEmitter.on('pr_achieved', (pr: PRNotification) => {
      setPRData(pr);
      setVisible(true);

      // Animate in with bounce
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after 4 seconds
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: -150,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setVisible(false);
          setPRData(null);
        });
      }, 4000);
    });

    return unsubscribe;
  }, [slideAnim, scaleAnim]);

  if (!visible || !prData) return null;

  const getIcon = () => {
    switch (prData.type) {
      case 'weight':
        return <Trophy size={28} color="#f59e0b" />;
      case 'reps':
        return <Target size={28} color="#3b82f6" />;
      case 'volume':
        return <TrendingUp size={28} color="#22c55e" />;
    }
  };

  const getTypeLabel = () => {
    switch (prData.type) {
      case 'weight':
        return 'Max Weight';
      case 'reps':
        return 'Max Reps';
      case 'volume':
        return 'Max Volume';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <View style={styles.iconContainer}>{getIcon()}</View>

      <View style={styles.content}>
        <Text style={styles.title}>New Personal Record! </Text>
        <Text style={styles.exercise}>{prData.exerciseName}</Text>
        <View style={styles.details}>
          <Text style={styles.label}>{getTypeLabel()}</Text>
          <Text style={styles.value}>
            {prData.type === 'reps' 
              ? `${prData.newValue} reps @ ${prData.weight}${prData.unit || 'lbs'}`
              : `${prData.newValue}${prData.unit || 'lbs'}`}
          </Text>
        </View>
        {prData.oldValue && (
          <Text style={styles.improvement}>
            Previous: {prData.oldValue}
            {prData.type !== 'reps' && (prData.unit || 'lbs')}
            {prData.type === 'reps' && ' reps'}
          </Text>
        )}
      </View>

      <View style={styles.confetti}>
        <Text style={styles.confettiEmoji}></Text>
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
    borderColor: '#f59e0b',
    zIndex: 9999,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#451a03',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f59e0b',
    marginBottom: 4,
  },
  exercise: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 6,
  },
  details: {
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f59e0b',
  },
  improvement: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  confetti: {
    marginLeft: 8,
  },
  confettiEmoji: {
    fontSize: 32,
  },
});

