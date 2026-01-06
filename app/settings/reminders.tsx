import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Bell, Clock } from 'lucide-react-native';
import { workoutReminderService, WorkoutReminder } from '../../lib/notifications/workoutReminders';
import { useNotificationPermissions } from '../../hooks/useNotificationPermissions';
import { NotificationPermissionBanner } from '../../components/notifications';
import { SettingsHeader } from '../../components/SettingsHeader';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';
import { lightHaptic } from '@/lib/utils/haptics';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ReminderRowProps {
  reminder: WorkoutReminder;
  onToggle: (enabled: boolean) => void;
  onTimePress: () => void;
  onNamePress: () => void;
  disabled?: boolean;
}

const ReminderRow: React.FC<ReminderRowProps> = ({
  reminder,
  onToggle,
  onTimePress,
  onNamePress,
  disabled,
}) => {
  const dayName = DAY_NAMES[reminder.dayOfWeek];
  const timeStr = formatTime(reminder.hour, reminder.minute);

  return (
    <View style={[styles.reminderRow, disabled && styles.reminderRowDisabled]}>
      <View style={styles.reminderLeft}>
        <View style={styles.dayContainer}>
          <Text style={styles.dayName}>{dayName}</Text>
          <Pressable onPress={onNamePress} disabled={disabled || !reminder.enabled}>
            <Text style={[styles.workoutName, !reminder.enabled && styles.workoutNameDisabled]}>
              {reminder.workoutName || 'Tap to add label'}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.timeButton, (!reminder.enabled || disabled) && styles.timeButtonDisabled]}
          onPress={onTimePress}
          disabled={disabled || !reminder.enabled}
        >
          <Clock size={16} color={reminder.enabled && !disabled ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.timeText, (!reminder.enabled || disabled) && styles.timeTextDisabled]}>
            {timeStr}
          </Text>
        </Pressable>
      </View>

      <Switch
        value={reminder.enabled}
        onValueChange={(value) => {
          lightHaptic();
          onToggle(value);
        }}
        disabled={disabled}
        trackColor={{ false: '#374151', true: '#22c55e' }}
        thumbColor={reminder.enabled ? '#fff' : '#9ca3af'}
      />
    </View>
  );
};

export default function RemindersScreen() {
  useBackNavigation();

  const { isGranted } = useNotificationPermissions();
  
  const [reminders, setReminders] = useState<WorkoutReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReminder, setSelectedReminder] = useState<WorkoutReminder | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    loadReminders();
  }, []);

  async function loadReminders() {
    setIsLoading(true);
    let saved = await workoutReminderService.getReminders();
    
    if (saved.length === 0) {
      saved = workoutReminderService.createDefaultReminders();
      await workoutReminderService.saveReminders(saved);
    }
    
    setReminders(saved);
    setIsLoading(false);
  }

  async function toggleReminder(id: string, enabled: boolean) {
    if (!isGranted && enabled) {
      Alert.alert(
        'Permission Required',
        'Please enable notifications to set reminders.',
        [{ text: 'OK' }]
      );
      return;
    }

    const updated = reminders.map(r => 
      r.id === id ? { ...r, enabled } : r
    );
    setReminders(updated);
    
    await workoutReminderService.saveReminders(updated);
    
    const reminder = updated.find(r => r.id === id);
    if (reminder) {
      await workoutReminderService.scheduleReminder(reminder);
    }
  }

  function openTimePicker(reminder: WorkoutReminder) {
    setSelectedReminder(reminder);
    setShowTimePicker(true);
  }

  async function handleTimeChange(event: { type: string }, selectedTime?: Date) {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (selectedTime && selectedReminder) {
      const hour = selectedTime.getHours();
      const minute = selectedTime.getMinutes();

      const updated = reminders.map(r => 
        r.id === selectedReminder.id ? { ...r, hour, minute } : r
      );
      setReminders(updated);
      
      await workoutReminderService.saveReminders(updated);
      
      const reminder = updated.find(r => r.id === selectedReminder.id);
      if (reminder?.enabled) {
        await workoutReminderService.scheduleReminder(reminder);
      }
    }

    if (Platform.OS === 'ios') {
      // Keep picker open on iOS for continuous selection
    } else {
      setSelectedReminder(null);
    }
  }

  function closeTimePicker() {
    setShowTimePicker(false);
    setSelectedReminder(null);
  }

  async function editWorkoutName(reminder: WorkoutReminder) {
    // For Android, use a simple approach since Alert.prompt is iOS only
    if (Platform.OS === 'android') {
      // On Android, we'll just toggle through some preset names or clear it
      const presetNames = ['Push Day', 'Pull Day', 'Leg Day', 'Upper Body', 'Lower Body', 'Full Body', 'Cardio', 'Rest Day', ''];
      const currentIndex = presetNames.indexOf(reminder.workoutName || '');
      const nextIndex = (currentIndex + 1) % presetNames.length;
      const newName = presetNames[nextIndex] || undefined;
      
      const updated = reminders.map(r => 
        r.id === reminder.id ? { ...r, workoutName: newName } : r
      );
      setReminders(updated);
      await workoutReminderService.saveReminders(updated);
      return;
    }
    
    // iOS - use Alert.prompt
    Alert.prompt(
      'Workout Label',
      `Set a label for ${DAY_NAMES[reminder.dayOfWeek]}:`,
      async (text) => {
        if (text !== undefined) {
          const updated = reminders.map(r => 
            r.id === reminder.id ? { ...r, workoutName: text || undefined } : r
          );
          setReminders(updated);
          await workoutReminderService.saveReminders(updated);
        }
      },
      'plain-text',
      reminder.workoutName || ''
    );
  }

  const enabledCount = reminders.filter(r => r.enabled).length;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <SettingsHeader title="Workout Reminders" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SettingsHeader title="Workout Reminders" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Permission Banner */}
        {!isGranted && (
          <View style={styles.bannerContainer}>
            <NotificationPermissionBanner onPress={loadReminders} />
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Configure Schedule</Text>
          <Text style={styles.subtitle}>
            {enabledCount === 0 
              ? 'Enable days and set times for your workout reminders'
              : `${enabledCount} reminder${enabledCount !== 1 ? 's' : ''} active`}
          </Text>
        </View>

        {/* Reminders List */}
        <View style={styles.section}>
          {reminders.map((reminder, index) => (
            <React.Fragment key={reminder.id}>
              <ReminderRow
                reminder={reminder}
                onToggle={(enabled) => toggleReminder(reminder.id, enabled)}
                onTimePress={() => openTimePicker(reminder)}
                onNamePress={() => editWorkoutName(reminder)}
                disabled={!isGranted}
              />
              {index < reminders.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Bell size={20} color="#3b82f6" />
          <Text style={styles.infoText}>
            Each day can have its own reminder time. Tap the time to change it. 
            Tap the label to customize the workout name for that day.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Time Picker */}
      {showTimePicker && selectedReminder && (
        <>
          {Platform.OS === 'ios' && (
            <View style={styles.pickerOverlay}>
              <Pressable style={styles.pickerBackdrop} onPress={closeTimePicker} />
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>
                    {DAY_NAMES[selectedReminder.dayOfWeek]} Reminder
                  </Text>
                  <Pressable onPress={closeTimePicker}>
                    <Text style={styles.pickerDone}>Done</Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={new Date(2024, 0, 1, selectedReminder.hour, selectedReminder.minute)}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                  textColor="#f1f5f9"
                />
              </View>
            </View>
          )}
          {Platform.OS === 'android' && (
            <DateTimePicker
              value={new Date(2024, 0, 1, selectedReminder.hour, selectedReminder.minute)}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, '0');
  return `${h}:${m} ${period}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  reminderRowDisabled: {
    opacity: 0.5,
  },
  reminderLeft: {
    flex: 1,
    marginRight: 16,
  },
  dayContainer: {
    marginBottom: 10,
  },
  dayName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  workoutName: {
    fontSize: 13,
    color: '#3b82f6',
  },
  workoutNameDisabled: {
    color: '#64748b',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 8,
  },
  timeButtonDisabled: {
    opacity: 0.5,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  timeTextDisabled: {
    color: '#64748b',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginLeft: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#1e3a8a',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#bfdbfe',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 32,
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  pickerContainer: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  pickerDone: {
    fontSize: 17,
    fontWeight: '600',
    color: '#3b82f6',
  },
});


