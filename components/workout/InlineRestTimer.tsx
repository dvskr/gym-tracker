import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import { Timer, Plus, X, Check } from 'lucide-react-native';
import { useWorkoutStore } from '@/stores/workoutStore';
import { warningHaptic, lightHaptic, selectionHaptic } from '@/lib/utils/haptics';

// ============================================
// Types
// ============================================

interface InlineRestTimerProps {
  exerciseId: string;
  onTimerEnd?: () => void;
}

// ============================================
// Constants
// ============================================

const QUICK_TIME_OPTIONS = [60, 90, 120, 180, 300]; // seconds
const EXTEND_SECONDS = 30;

// ============================================
// Helper Functions
// ============================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTimeLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

// ============================================
// Component
// ============================================

export function InlineRestTimer({ exerciseId, onTimerEnd }: InlineRestTimerProps) {
  const {
    restTimer,
    tickRestTimer,
    skipRestTimer,
    extendRestTimer,
    resetRestTimer,
    setExerciseRestTime,
    getExerciseRestTime,
  } = useWorkoutStore();

  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasNotifiedRef = useRef(false);

  const isActive = restTimer.exerciseId === exerciseId;
  const isRunning = isActive && restTimer.isRunning;
  const isFinished = isActive && !restTimer.isRunning && restTimer.totalSeconds > 0;

  // Timer tick effect
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        tickRestTimer();
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, tickRestTimer]);

  // Progress bar animation
  useEffect(() => {
    if (isActive && restTimer.totalSeconds > 0) {
      const progress = 1 - (restTimer.remainingSeconds / restTimer.totalSeconds);
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(0);
    }
  }, [isActive, restTimer.remainingSeconds, restTimer.totalSeconds, progressAnim]);

  // Timer end notification
  useEffect(() => {
    if (isFinished && !hasNotifiedRef.current) {
      hasNotifiedRef.current = true;
      // UI haptic feedback (controlled by global hapticEnabled setting)
      warningHaptic();
      // Note: Rest timer vibration/sound are handled by restTimerNotificationService
      // based on restTimerSound and restTimerVibration settings
      onTimerEnd?.();

      // Pulse animation
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    }

    if (isRunning) {
      hasNotifiedRef.current = false;
    }
  }, [isFinished, isRunning, onTimerEnd, pulseAnim]);

  // Handlers
  const handleSkip = useCallback(() => {
    lightHaptic();
    skipRestTimer();
  }, [skipRestTimer]);

  const handleExtend = useCallback(() => {
    lightHaptic();
    extendRestTimer(EXTEND_SECONDS);
  }, [extendRestTimer]);

  const handleRestart = useCallback(() => {
    lightHaptic();
    resetRestTimer();
  }, [resetRestTimer]);

  const handleSelectTime = useCallback((seconds: number) => {
    selectionHaptic();
    setExerciseRestTime(exerciseId, seconds);
    setShowTimeSelector(false);
  }, [exerciseId, setExerciseRestTime]);

  const handleOpenTimeSelector = useCallback(() => {
    lightHaptic();
    setShowTimeSelector(true);
  }, []);

  // Don't render if timer is not for this exercise
  if (!isActive) {
    return null;
  }

  const currentRestTime = getExerciseRestTime(exerciseId);
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Timer finished state
  if (isFinished) {
    return (
      <Animated.View style={[styles.container, styles.containerFinished, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.finishedContent}>
          <Check size={20} color="#22c55e" />
          <Text style={styles.finishedText}>Rest Complete!</Text>
        </View>
        <View style={styles.finishedActions}>
          <TouchableOpacity style={styles.restartButton} onPress={handleRestart}>
            <Text style={styles.restartText}>Restart</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dismissButton} onPress={handleSkip}>
            <X size={16} color="#64748b" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  // Timer running state
  return (
    <>
      <View style={styles.container}>
        {/* Timer Icon and Label */}
        <Pressable style={styles.timerInfo} onPress={handleOpenTimeSelector}>
          <Timer size={16} color="#3b82f6" />
          <Text style={styles.timerLabel}>REST</Text>
        </Pressable>

        {/* Time Display */}
        <Text style={styles.timeDisplay}>{formatTime(restTimer.remainingSeconds)}</Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.extendButton} onPress={handleExtend}>
            <Plus size={14} color="#3b82f6" />
            <Text style={styles.extendText}>30s</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Time Selector Modal */}
      <Modal
        visible={showTimeSelector}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimeSelector(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowTimeSelector(false)}>
          <View style={styles.timeSelectorContainer}>
            <Text style={styles.timeSelectorTitle}>Set Rest Time</Text>
            <Text style={styles.timeSelectorSubtitle}>
              Current: {formatTimeLabel(currentRestTime)}
            </Text>

            <View style={styles.timeOptionsGrid}>
              {QUICK_TIME_OPTIONS.map((seconds) => (
                <TouchableOpacity
                  key={seconds}
                  style={[
                    styles.timeOption,
                    currentRestTime === seconds && styles.timeOptionSelected,
                  ]}
                  onPress={() => handleSelectTime(seconds)}
                >
                  <Text
                    style={[
                      styles.timeOptionText,
                      currentRestTime === seconds && styles.timeOptionTextSelected,
                    ]}
                  >
                    {formatTimeLabel(seconds)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowTimeSelector(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    gap: 10,
  },

  containerFinished: {
    backgroundColor: '#14532d',
    borderTopColor: '#166534',
  },

  // Timer Info
  timerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  timerLabel: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  // Time Display
  timeDisplay: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    minWidth: 50,
  },

  // Progress Bar
  progressContainer: {
    flex: 1,
  },

  progressBackground: {
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  extendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 2,
  },

  extendText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: 'bold',
  },

  skipButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },

  skipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Finished State
  finishedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },

  finishedText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: 'bold',
  },

  finishedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  restartButton: {
    backgroundColor: '#166534',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },

  restartText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: 'bold',
  },

  dismissButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  timeSelectorContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 300,
  },

  timeSelectorTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },

  timeSelectorSubtitle: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },

  timeOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 16,
  },

  timeOption: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: 70,
    alignItems: 'center',
  },

  timeOptionSelected: {
    backgroundColor: '#1e3a5f',
    borderColor: '#3b82f6',
  },

  timeOptionText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
  },

  timeOptionTextSelected: {
    color: '#3b82f6',
  },

  closeButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },

  closeButtonText: {
    color: '#64748b',
    fontSize: 14,
  },
});



