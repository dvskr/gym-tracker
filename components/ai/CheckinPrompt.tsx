import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Heart, X } from 'lucide-react-native';
import { useCheckinStore } from '@/stores/checkinStore';
import { DailyCheckin } from './DailyCheckin';
import { lightHaptic } from '@/lib/utils/haptics';

export function CheckinPrompt() {
  const { hasCheckedInToday, fetchTodaysCheckin } = useCheckinStore();
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchTodaysCheckin();
  }, [fetchTodaysCheckin]);

  const handleOpen = () => {
    lightHaptic();
    setShowModal(true);
  };

  const handleDismiss = () => {
    lightHaptic();
    setDismissed(true);
  };

  const handleComplete = () => {
    setDismissed(true);
  };

  // Don't show if already checked in or dismissed
  if (hasCheckedInToday || dismissed) {
    return null;
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Heart size={20} color="#ef4444" fill="#ef4444" />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.title}>How are you feeling today?</Text>
            <Text style={styles.subtitle}>Quick 30-second check-in</Text>
          </View>

          <Pressable onPress={handleDismiss} style={styles.dismissButton}>
            <X size={18} color="#64748b" />
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed
          ]}
          onPress={handleOpen}
        >
          <Text style={styles.buttonText}>Start Check-in</Text>
        </Pressable>
      </View>

      <DailyCheckin
        visible={showModal}
        onClose={() => setShowModal(false)}
        onComplete={handleComplete}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ef444420',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
  },
  dismissButton: {
    padding: 4,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonPressed: {
    backgroundColor: '#2563eb',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
