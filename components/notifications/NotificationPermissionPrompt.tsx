import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Bell, Clock, Timer, Trophy, Flame, Check } from 'lucide-react-native';
import { useNotificationPermissions } from '../../hooks/useNotificationPermissions';

interface NotificationPermissionPromptProps {
  onComplete?: () => void;
  onDismiss?: () => void;
}

export function NotificationPermissionPrompt({ 
  onComplete, 
  onDismiss 
}: NotificationPermissionPromptProps) {
  const { status, requestPermissions, openSettings } = useNotificationPermissions();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if already granted or dismissed
  if (status === 'granted' || dismissed) {
    return null;
  }

  const handleEnable = async () => {
    if (status === 'denied') {
      // Already denied once, need to open settings
      Alert.alert(
        'Enable Notifications',
        'To receive workout reminders and alerts, please enable notifications in your device settings.',
        [
          { 
            text: 'Cancel', 
            style: 'cancel' 
          },
          { 
            text: 'Open Settings', 
            onPress: () => {
              openSettings();
              onComplete?.();
            }
          },
        ]
      );
    } else {
      // Request permissions
      const granted = await requestPermissions();
      if (granted) {
        onComplete?.();
      }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Bell size={48} color="#3b82f6" />
        </View>

        <Text style={styles.title}>Stay on Track</Text>
        <Text style={styles.description}>
          Get workout reminders, rest timer alerts, and celebrate your achievements!
        </Text>
        
        <View style={styles.benefits}>
          <BenefitRow 
            icon={<Clock size={20} color="#3b82f6" />} 
            text="Workout reminders" 
          />
          <BenefitRow 
            icon={<Timer size={20} color="#22c55e" />} 
            text="Rest timer alerts" 
          />
          <BenefitRow 
            icon={<Trophy size={20} color="#f59e0b" />} 
            text="PR celebrations" 
          />
          <BenefitRow 
            icon={<Flame size={20} color="#ef4444" />} 
            text="Streak reminders" 
          />
        </View>

        <Pressable 
          style={styles.enableButton} 
          onPress={handleEnable}
        >
          <Text style={styles.enableButtonText}>
            {status === 'denied' ? 'Open Settings' : 'Enable Notifications'}
          </Text>
        </Pressable>
        
        <Pressable onPress={handleDismiss} style={styles.skipButton}>
          <Text style={styles.skipText}>Maybe Later</Text>
        </Pressable>
      </View>
    </View>
  );
}

interface BenefitRowProps {
  icon: React.ReactNode;
  text: string;
}

function BenefitRow({ icon, text }: BenefitRowProps) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIcon}>{icon}</View>
      <Text style={styles.benefitText}>{text}</Text>
      <Check size={16} color="#22c55e" style={styles.checkIcon} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1e3a8a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  benefits: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitIcon: {
    marginRight: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    color: '#f1f5f9',
  },
  checkIcon: {
    marginLeft: 8,
  },
  enableButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  enableButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 8,
  },
  skipText: {
    color: '#64748b',
    fontSize: 14,
  },
});



