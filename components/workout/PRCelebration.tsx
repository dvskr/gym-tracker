import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { successHaptic } from '@/lib/utils/haptics';
import { useSettingsStore } from '@/stores/settingsStore';

// ============================================
// Types
// ============================================

export type PRType = 'weight' | 'reps' | 'volume' | '1rm';

interface PRCelebrationProps {
  visible: boolean;
  prType: PRType;
  exercise: string;
  value: string;
  onDismiss: () => void;
}

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
  animY: Animated.Value;
  animX: Animated.Value;
  animRotate: Animated.Value;
  animOpacity: Animated.Value;
}

// ============================================
// Constants
// ============================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#fbbf24', // gold
  '#f59e0b', // amber
  '#fcd34d', // yellow
  '#ef4444', // red
  '#22c55e', // green
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ec4899', // pink
];

const PR_TYPE_LABELS: Record<PRType, string> = {
  weight: 'Max Weight',
  reps: 'Max Reps',
  volume: 'Max Volume',
  '1rm': 'Estimated 1RM',
};

const AUTO_DISMISS_DELAY = 3500; // 3.5 seconds
const CONFETTI_COUNT = 30;

// ============================================
// Confetti Piece Component
// ============================================

const ConfettiPieceComponent: React.FC<{ piece: ConfettiPiece }> = ({ piece }) => {
  const rotateInterpolate = piece.animRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          left: piece.x,
          backgroundColor: piece.color,
          width: piece.size,
          height: piece.size * 1.5,
          borderRadius: piece.size / 4,
          transform: [
            { translateY: piece.animY },
            { translateX: piece.animX },
            { rotate: rotateInterpolate },
          ],
          opacity: piece.animOpacity,
        },
      ]}
    />
  );
};

// ============================================
// Main Component
// ============================================

export function PRCelebration({
  visible,
  prType,
  exercise,
  value,
  onDismiss,
}: PRCelebrationProps) {
  // Get settings
  const { prCelebrations, prSound, prConfetti } = useSettingsStore();
  
  // Don't show if PR celebrations are disabled
  if (!prCelebrations || !visible) {
    return null;
  }

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const trophyScaleAnim = useRef(new Animated.Value(0)).current;
  const trophyRotateAnim = useRef(new Animated.Value(0)).current;
  const titleOpacityAnim = useRef(new Animated.Value(0)).current;
  const contentOpacityAnim = useRef(new Animated.Value(0)).current;
  const buttonOpacityAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const autoDismissTimer = useRef<NodeJS.Timeout | null>(null);

  // Generate confetti pieces
  const confettiPieces = useRef<ConfettiPiece[]>(
    Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 500,
      duration: 2500 + Math.random() * 1500,
      size: 8 + Math.random() * 8,
      animY: new Animated.Value(-50),
      animX: new Animated.Value(0),
      animRotate: new Animated.Value(0),
      animOpacity: new Animated.Value(1),
    }))
  ).current;

  const handleDismiss = useCallback(() => {
    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current);
    }
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (visible) {
      // Trigger haptic
      successHaptic();

      // Reset all animations
      scaleAnim.setValue(0);
      trophyScaleAnim.setValue(0);
      trophyRotateAnim.setValue(0);
      titleOpacityAnim.setValue(0);
      contentOpacityAnim.setValue(0);
      buttonOpacityAnim.setValue(0);
      shimmerAnim.setValue(0);

      // Reset confetti
      confettiPieces.forEach((piece) => {
        piece.animY.setValue(-50);
        piece.animX.setValue(0);
        piece.animRotate.setValue(0);
        piece.animOpacity.setValue(1);
      });

      // Modal scale in
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();

      // Trophy bounce
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(trophyScaleAnim, {
          toValue: 1.3,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.spring(trophyScaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();

      // Trophy wiggle
      Animated.sequence([
        Animated.delay(200),
        Animated.timing(trophyRotateAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(trophyRotateAnim, {
          toValue: -0.5,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(trophyRotateAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Fade in content
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(titleOpacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.sequence([
        Animated.delay(600),
        Animated.timing(contentOpacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.sequence([
        Animated.delay(800),
        Animated.timing(buttonOpacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Shimmer loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Confetti animations
      confettiPieces.forEach((piece) => {
        // Fall down
        Animated.sequence([
          Animated.delay(piece.delay),
          Animated.timing(piece.animY, {
            toValue: SCREEN_HEIGHT + 100,
            duration: piece.duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]).start();

        // Sway left/right
        Animated.loop(
          Animated.sequence([
            Animated.timing(piece.animX, {
              toValue: 30,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(piece.animX, {
              toValue: -30,
              duration: 300,
              useNativeDriver: true,
            }),
          ])
        ).start();

        // Rotate
        Animated.loop(
          Animated.timing(piece.animRotate, {
            toValue: 1,
            duration: 1000,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        ).start();

        // Fade out near bottom
        Animated.sequence([
          Animated.delay(piece.delay + piece.duration * 0.7),
          Animated.timing(piece.animOpacity, {
            toValue: 0,
            duration: piece.duration * 0.3,
            useNativeDriver: true,
          }),
        ]).start();
      });

      // Auto-dismiss timer
      autoDismissTimer.current = setTimeout(() => {
        handleDismiss();
      }, AUTO_DISMISS_DELAY);
    }

    return () => {
      if (autoDismissTimer.current) {
        clearTimeout(autoDismissTimer.current);
      }
    };
  }, [visible]);

  const trophyRotateInterpolate = trophyRotateAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={handleDismiss}
    >
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <View style={styles.overlay}>
          {/* Confetti - Only show if enabled */}
          {prConfetti && (
            <View style={styles.confettiContainer}>
              {confettiPieces.map((piece) => (
                <ConfettiPieceComponent key={piece.id} piece={piece} />
              ))}
            </View>
          )}

          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modal,
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              {/* Glow Effect */}
              <Animated.View style={[styles.glow, { opacity: shimmerOpacity }]} />

              {/* Trophy */}
              <Animated.View
                style={[
                  styles.trophyContainer,
                  {
                    transform: [
                      { scale: trophyScaleAnim },
                      { rotate: trophyRotateInterpolate },
                    ],
                  },
                ]}
              >
                <Text style={styles.trophy}></Text>
              </Animated.View>

              {/* Title */}
              <Animated.Text
                style={[styles.title, { opacity: titleOpacityAnim }]}
              >
                NEW PR!
              </Animated.Text>

              {/* Content */}
              <Animated.View
                style={[styles.content, { opacity: contentOpacityAnim }]}
              >
                <Text style={styles.exerciseName} numberOfLines={2}>
                  {exercise}
                </Text>
                <View style={styles.prDetails}>
                  <Text style={styles.prType}>{PR_TYPE_LABELS[prType]}</Text>
                  <Text style={styles.prValue}>{value}</Text>
                </View>
              </Animated.View>

              {/* Dismiss Button */}
              <Animated.View style={{ opacity: buttonOpacityAnim }}>
                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={handleDismiss}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dismissButtonText}>Nice! </Text>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ============================================
// PR Queue Manager Hook
// ============================================

interface QueuedPR {
  id: string;
  prType: PRType;
  exercise: string;
  value: string;
}

export function usePRCelebrationQueue() {
  const [queue, setQueue] = React.useState<QueuedPR[]>([]);
  const [currentPR, setCurrentPR] = React.useState<QueuedPR | null>(null);

  const addPR = useCallback((pr: Omit<QueuedPR, 'id'>) => {
    const newPR: QueuedPR = {
      ...pr,
      id: `${Date.now()}-${Math.random()}`,
    };
    setQueue((prev) => [...prev, newPR]);
  }, []);

  const dismissCurrent = useCallback(() => {
    setCurrentPR(null);
  }, []);

  // Process queue
  useEffect(() => {
    if (!currentPR && queue.length > 0) {
      const [next, ...rest] = queue;
      setCurrentPR(next);
      setQueue(rest);
    }
  }, [currentPR, queue]);

  return {
    currentPR,
    addPR,
    dismissCurrent,
    hasQueue: queue.length > 0,
  };
}

export default PRCelebration;

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    pointerEvents: 'none',
  },

  confettiPiece: {
    position: 'absolute',
    top: -50,
  },

  modal: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fbbf24',
    minWidth: 280,
    maxWidth: 320,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },

  glow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 44,
    backgroundColor: '#fbbf24',
  },

  trophyContainer: {
    marginBottom: 16,
  },

  trophy: {
    fontSize: 72,
  },

  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fbbf24',
    textShadowColor: '#78350f',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    marginBottom: 16,
  },

  content: {
    alignItems: 'center',
    marginBottom: 24,
  },

  exerciseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
    textTransform: 'capitalize',
  },

  prDetails: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },

  prType: {
    fontSize: 12,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },

  prValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fbbf24',
  },

  dismissButton: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
  },

  dismissButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
});