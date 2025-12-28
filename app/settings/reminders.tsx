import React, { useState, useEffect } from 'react';
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
import { Stack, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Bell, Clock, Calendar, ChevronRight, Check, Sparkles } from 'lucide-react-native';
import { workoutReminderService, WorkoutReminder } from '../../lib/notifications/workoutReminders';
import { useNotificationPermissions } from '../../hooks/useNotificationPermissions';
import { NotificationPermissionBanner } from '../../components/notifications';
import { smartTimingService, SmartSchedule } from '@/lib/notifications/smartTiming';
import { Button } from '@/components/ui';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ABBREV = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
          {reminder.workoutName && (
            <Pressable onPress={onNamePress} disabled={disabled}>
              <Text style={styles.workoutName}>{reminder.workoutName}</Text>
            </Pressable>
          )}
        </View>

        <Pressable
          style={[styles.timeButton, disabled && styles.timeButtonDisabled]}
          onPress={onTimePress}
          disabled={disabled || !reminder.enabled}
        >
          <Clock size={16} color={reminder.enabled ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.timeText, !reminder.enabled && styles.timeTextDisabled]}>
            {timeStr}
          </Text>
        </Pressable>
      </View>

      <Switch
        value={reminder.enabled}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: '#374151', true: '#22c55e' }}
        thumbColor={reminder.enabled ? '#fff' : '#9ca3af'}
      />
    </View>
  );
};

interface PresetButtonProps {
  title: string;
  description: string;
  isActive: boolean;
  onPress: () => void;
}

const PresetButton: React.FC<PresetButtonProps> = ({ title, description, isActive, onPress }) => {
  return (
    <Pressable
      style={[styles.presetButton, isActive && styles.presetButtonActive]}
      onPress={onPress}
    >
      <View style={styles.presetContent}>
        <Text style={styles.presetTitle}>{title}</Text>
        <Text style={styles.presetDescription}>{description}</Text>
      </View>
      {isActive && (
        <View style={styles.presetCheck}>
          <Check size={16} color="#22c55e" />
        </View>
      )}
    </Pressable>
  );
};

export default function RemindersScreen() {
  const router = useRouter();
  const { isGranted } = useNotificationPermissions();
  
  const [reminders, setReminders] = useState<WorkoutReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReminder, setSelectedReminder] = useState<WorkoutReminder | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [smartSuggestion, setSmartSuggestion] = useState<SmartSchedule | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(true);

  useEffect(() => {
    loadReminders();
    loadSmartSuggestion();
  }, []);

  async function loadSmartSuggestion() {
    try {
      setIsLoadingSuggestion(true);
      const suggestion = await smartTimingService.getSuggestedSchedule();
      setSmartSuggestion(suggestion);
    } catch (error) {
      console.error('Failed to load smart suggestion:', error);
    } finally {
      setIsLoadingSuggestion(false);
    }
  }

  async function loadReminders() {
    setIsLoading(true);
    let saved = await workoutReminderService.getReminders();
    
    if (saved.length === 0) {
      saved = workoutReminderService.createDefaultReminders();
      await workoutReminderService.saveReminders(saved);
    }
    
    setReminders(saved);
    detectActivePreset(saved);
    setIsLoading(false);
  }

  function detectActivePreset(reminders: WorkoutReminder[]) {
    const enabled = reminders.filter(r => r.enabled).map(r => r.dayOfWeek).sort();
    
    if (enabled.length === 3 && enabled.join(',') === '1,3,5') {
      setActivePreset('3day');
    } else if (enabled.length === 4 && enabled.join(',') === '1,2,4,5') {
      setActivePreset('4day');
    } else if (enabled.length === 5 && enabled.join(',') === '1,2,3,4,5') {
      setActivePreset('5day');
    } else if (enabled.length === 6 && enabled.join(',') === '1,2,3,4,5,6') {
      setActivePreset('ppl');
    } else if (enabled.length > 0) {
      setActivePreset('custom');
    } else {
      setActivePreset(null);
    }
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
    detectActivePreset(updated);
    
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

  async function handleTimeChange(event: any, selectedTime?: Date) {
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

  async function applySmartSchedule(suggestion: SmartSchedule) {
    if (!isGranted) {
      Alert.alert(
        'Permission Required',
        'Please enable notifications to apply smart schedule.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Apply Smart Schedule?',
      `This will set reminders for ${suggestion.days.map(d => DAY_NAMES[d]).join(', ')} at ${formatTime(suggestion.time.hour, suggestion.time.minute)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            try {
              // Load current reminders
              const currentReminders = await workoutReminderService.getReminders();
              
              // Update reminders based on suggestion
              const updatedReminders = currentReminders.map(reminder => ({
                ...reminder,
                enabled: suggestion.days.includes(reminder.dayOfWeek),
                hour: suggestion.time.hour,
                minute: suggestion.time.minute,
              }));
              
              await workoutReminderService.saveReminders(updatedReminders);
              await workoutReminderService.scheduleAllReminders();
              await loadReminders();
              
              Alert.alert('Success!', 'Smart schedule applied.');
            } catch (error) {
              Alert.alert('Error', 'Failed to apply smart schedule.');
            }
          },
        },
      ]
    );
  }

  async function applyPreset(preset: '3day' | '4day' | '5day' | 'ppl') {
    if (!isGranted) {
      Alert.alert(
        'Permission Required',
        'Please enable notifications before setting up reminders.',
        [{ text: 'OK' }]
      );
      return;
    }

    await workoutReminderService.applyPreset(preset);
    await loadReminders();
    setActivePreset(preset);
  }

  async function editWorkoutName(reminder: WorkoutReminder) {
    Alert.prompt(
      'Workout Name',
      `Set a name for ${DAY_NAMES[reminder.dayOfWeek]}:`,
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
        <Stack.Screen
          options={{
            title: 'Workout Reminders',
            headerShown: true,
            headerStyle: { backgroundColor: '#1e293b' },
            headerTintColor: '#f1f5f9',
            headerTitleStyle: { fontWeight: '600' },
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Workout Reminders',
          headerShown: true,
          headerStyle: { backgroundColor: '#1e293b' },
          headerTintColor: '#f1f5f9',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Permission Banner */}
        {!isGranted && (
          <View style={styles.bannerContainer}>
            <NotificationPermissionBanner onPress={loadReminders} />
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Set Your Workout Days</Text>
          <Text style={styles.subtitle}>
            {enabledCount === 0 
              ? 'Select days to receive reminders'
              : `${enabledCount} reminder${enabledCount !== 1 ? 's' : ''} active`}
          </Text>
        </View>

        {/* Reminders List */}
        <View style={styles.section}>
          {reminders.map(reminder => (
            <ReminderRow
              key={reminder.id}
              reminder={reminder}
              onToggle={(enabled) => toggleReminder(reminder.id, enabled)}
              onTimePress={() => openTimePicker(reminder)}
              onNamePress={() => editWorkoutName(reminder)}
              disabled={!isGranted}
            />
          ))}
        </View>

        {/* Smart Schedule Suggestion */}
        {!isLoadingSuggestion && smartSuggestion && smartSuggestion.confidence !== 'low' && (
          <View style={styles.smartSection}>
            <View style={styles.smartCard}>
              <View style={styles.smartHeader}>
                <Sparkles size={24} color="#f59e0b" />
                <View style={styles.smartHeaderText}>
                  <Text style={styles.smartTitle}>Smart Schedule Suggestion</Text>
                  <Text style={styles.smartConfidence}>
                    {smartSuggestion.confidence === 'high' ? '⭐⭐⭐ High confidence' : '⭐⭐ Medium confidence'}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.smartDescription}>
                Based on your workout history, we suggest reminders at{' '}
                <Text style={styles.smartHighlight}>
                  {formatTime(smartSuggestion.time.hour, smartSuggestion.time.minute)}
                </Text>
                {' '}on{' '}
                <Text style={styles.smartHighlight}>
                  {smartSuggestion.days.map(d => DAY_NAMES[d]).join(', ')}
                </Text>
                .
              </Text>
              
              <Button
                title="Apply Smart Schedule"
                variant="secondary"
                onPress={() => applySmartSchedule(smartSuggestion)}
                style={styles.smartButton}
                disabled={!isGranted}
              />
            </View>
          </View>
        )}

        {/* Presets */}
        <View style={styles.presetsSection}>
          <Text style={styles.sectionTitle}>QUICK SETUP</Text>
          <Text style={styles.sectionDescription}>
            Apply a common workout split
          </Text>

          <PresetButton
            title="3-Day Full Body"
            description="Monday, Wednesday, Friday"
            isActive={activePreset === '3day'}
            onPress={() => applyPreset('3day')}
          />

          <PresetButton
            title="4-Day Upper/Lower"
            description="Monday, Tuesday, Thursday, Friday"
            isActive={activePreset === '4day'}
            onPress={() => applyPreset('4day')}
          />

          <PresetButton
            title="5-Day Bro Split"
            description="Monday through Friday"
            isActive={activePreset === '5day'}
            onPress={() => applyPreset('5day')}
          />

          <PresetButton
            title="6-Day Push/Pull/Legs"
            description="Monday through Saturday"
            isActive={activePreset === 'ppl'}
            onPress={() => applyPreset('ppl')}
          />
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Bell size={20} color="#3b82f6" />
          <Text style={styles.infoText}>
            Reminders will repeat weekly at the times you set. You can customize each day with a workout name by tapping on it.
          </Text>
        </View>
      </ScrollView>

      {/* Time Picker */}
      {showTimePicker && selectedReminder && (
        <>
          {Platform.OS === 'ios' && (
            <View style={styles.pickerOverlay}>
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
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  section: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  reminderRowDisabled: {
    opacity: 0.5,
  },
  reminderLeft: {
    flex: 1,
    marginRight: 16,
  },
  dayContainer: {
    marginBottom: 8,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 2,
  },
  workoutName: {
    fontSize: 13,
    color: '#3b82f6',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 6,
  },
  timeButtonDisabled: {
    opacity: 0.5,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f1f5f9',
  },
  timeTextDisabled: {
    color: '#64748b',
  },
  smartSection: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  smartCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  smartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  smartHeaderText: {
    flex: 1,
  },
  smartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  smartConfidence: {
    fontSize: 13,
    color: '#f59e0b',
    fontWeight: '600',
  },
  smartDescription: {
    fontSize: 15,
    color: '#cbd5e1',
    lineHeight: 22,
    marginBottom: 20,
  },
  smartHighlight: {
    color: '#f59e0b',
    fontWeight: '700',
  },
  smartButton: {
    marginTop: 8,
  },
  presetsSection: {
    marginHorizontal: 16,
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
  },
  presetButton: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#334155',
  },
  presetButtonActive: {
    borderColor: '#22c55e',
    backgroundColor: '#14532d',
  },
  presetContent: {
    flex: 1,
  },
  presetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 2,
  },
  presetDescription: {
    fontSize: 13,
    color: '#94a3b8',
  },
  presetCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#1e3a8a',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#bfdbfe',
    lineHeight: 18,
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  pickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
});

