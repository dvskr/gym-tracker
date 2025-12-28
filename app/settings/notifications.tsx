import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Bell, Clock, TrendingUp, Trophy, Moon } from 'lucide-react-native';
import { useSettingsStore } from '../../stores/settingsStore';
import {
  requestPermissions,
  checkPermissions,
  scheduleWorkoutReminders,
  cancelWorkoutReminders,
  cancelAllNotifications,
  scheduleWeeklySummary,
} from '../../lib/services/notifications';

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  disabled?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  label,
  description,
  toggle,
  toggleValue,
  onToggleChange,
  disabled,
}) => {
  return (
    <View style={[styles.settingRow, disabled && styles.settingRowDisabled]}>
      <View style={styles.settingRowLeft}>
        <View style={styles.iconContainer}>{icon}</View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingLabel, disabled && styles.settingLabelDisabled]}>
            {label}
          </Text>
          {description && <Text style={styles.settingDescription}>{description}</Text>}
        </View>
      </View>
      {toggle && (
        <Switch
          value={toggleValue}
          onValueChange={onToggleChange}
          disabled={disabled}
          trackColor={{ false: '#374151', true: '#22c55e' }}
          thumbColor={toggleValue ? '#fff' : '#9ca3af'}
        />
      )}
    </View>
  );
};

interface DaySelectorProps {
  selectedDays: number[];
  onDaysChange: (days: number[]) => void;
  disabled?: boolean;
}

const DaySelector: React.FC<DaySelectorProps> = ({ selectedDays, onDaysChange, disabled }) => {
  const days = [
    { label: 'S', value: 1, name: 'Sun' },
    { label: 'M', value: 2, name: 'Mon' },
    { label: 'T', value: 3, name: 'Tue' },
    { label: 'W', value: 4, name: 'Wed' },
    { label: 'T', value: 5, name: 'Thu' },
    { label: 'F', value: 6, name: 'Fri' },
    { label: 'S', value: 7, name: 'Sat' },
  ];

  const toggleDay = (day: number) => {
    if (disabled) return;
    
    if (selectedDays.includes(day)) {
      onDaysChange(selectedDays.filter((d) => d !== day));
    } else {
      onDaysChange([...selectedDays, day].sort());
    }
  };

  return (
    <View style={styles.daySelector}>
      {days.map((day) => (
        <TouchableOpacity
          key={day.value}
          style={[
            styles.dayButton,
            selectedDays.includes(day.value) && styles.dayButtonSelected,
            disabled && styles.dayButtonDisabled,
          ]}
          onPress={() => toggleDay(day.value)}
          disabled={disabled}
        >
          <Text
            style={[
              styles.dayButtonText,
              selectedDays.includes(day.value) && styles.dayButtonTextSelected,
            ]}
          >
            {day.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

interface SectionHeaderProps {
  title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
};

export default function NotificationsSettingsScreen() {
  const router = useRouter();
  const {
    notificationsEnabled,
    workoutReminders,
    streakReminders,
    setNotificationsEnabled,
    setWorkoutReminders,
    setStreakReminders,
  } = useSettingsStore();

  const [hasPermission, setHasPermission] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([2, 4, 6]); // Mon, Wed, Fri
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState(true);
  const [prNotifications, setPrNotifications] = useState(true);
  const [milestoneAlerts, setMilestoneAlerts] = useState(true);
  const [enableQuietHours, setEnableQuietHours] = useState(false);
  const [quietStart, setQuietStart] = useState(new Date(2024, 0, 1, 22, 0)); // 10 PM
  const [quietEnd, setQuietEnd] = useState(new Date(2024, 0, 1, 7, 0)); // 7 AM
  const [showQuietStartPicker, setShowQuietStartPicker] = useState(false);
  const [showQuietEndPicker, setShowQuietEndPicker] = useState(false);

  useEffect(() => {
    checkNotificationPermissions();
    
    // Set default reminder time to 9 AM
    const defaultTime = new Date();
    defaultTime.setHours(9, 0, 0, 0);
    setReminderTime(defaultTime);
  }, []);

  const checkNotificationPermissions = async () => {
    const granted = await checkPermissions();
    setHasPermission(granted);
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      // Request permissions
      const granted = await requestPermissions();
      
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive workout reminders.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      
      setHasPermission(true);
      setNotificationsEnabled(true);
    } else {
      // Cancel all notifications
      await cancelAllNotifications();
      setNotificationsEnabled(false);
    }
  };

  const handleToggleWorkoutReminders = async (enabled: boolean) => {
    setWorkoutReminders(enabled);
    
    if (enabled && hasPermission) {
      await scheduleWorkoutReminders(selectedDays, {
        hour: reminderTime.getHours(),
        minute: reminderTime.getMinutes(),
      });
    } else {
      await cancelWorkoutReminders();
    }
  };

  const handleDaysChange = async (days: number[]) => {
    setSelectedDays(days);
    
    if (workoutReminders && hasPermission) {
      await scheduleWorkoutReminders(days, {
        hour: reminderTime.getHours(),
        minute: reminderTime.getMinutes(),
      });
    }
  };

  const handleTimeChange = async (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    
    if (selectedTime) {
      setReminderTime(selectedTime);
      
      if (workoutReminders && hasPermission) {
        await scheduleWorkoutReminders(selectedDays, {
          hour: selectedTime.getHours(),
          minute: selectedTime.getMinutes(),
        });
      }
    }
  };

  const handleToggleWeeklySummary = async (enabled: boolean) => {
    setWeeklySummary(enabled);
    
    if (enabled && hasPermission) {
      await scheduleWeeklySummary();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isDisabled = !notificationsEnabled || !hasPermission;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerShown: true,
          headerStyle: { backgroundColor: '#1e293b' },
          headerTintColor: '#f1f5f9',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Master Toggle */}
        <SectionHeader title="MASTER CONTROL" />
        <View style={styles.section}>
          <SettingRow
            icon={<Bell size={24} color="#3b82f6" />}
            label="Enable Notifications"
            toggle
            toggleValue={notificationsEnabled}
            onToggleChange={handleToggleNotifications}
          />
        </View>

        {!hasPermission && notificationsEnabled && (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              ⚠️ Notification permission denied. Please enable in device settings.
            </Text>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => Linking.openSettings()}
            >
              <Text style={styles.settingsButtonText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Workout Reminders */}
        <SectionHeader title="WORKOUT REMINDERS" />
        <View style={styles.section}>
          <SettingRow
            icon={<Bell size={24} color="#3b82f6" />}
            label="Workout Reminders"
            toggle
            toggleValue={workoutReminders}
            onToggleChange={handleToggleWorkoutReminders}
            disabled={isDisabled}
          />
        </View>

        {/* Day Selector */}
        <View style={styles.daysSectionContainer}>
          <Text style={styles.daysLabel}>Reminder Days</Text>
          <DaySelector
            selectedDays={selectedDays}
            onDaysChange={handleDaysChange}
            disabled={isDisabled || !workoutReminders}
          />
        </View>

        {/* Time Picker */}
        <View style={styles.timeContainer}>
          <Text style={styles.timeLabel}>Reminder Time</Text>
          <TouchableOpacity
            style={[
              styles.timeButton,
              (isDisabled || !workoutReminders) && styles.timeButtonDisabled,
            ]}
            onPress={() => setShowTimePicker(true)}
            disabled={isDisabled || !workoutReminders}
          >
            <Clock size={20} color="#3b82f6" />
            <Text style={styles.timeText}>{formatTime(reminderTime)}</Text>
          </TouchableOpacity>
        </View>

        {showTimePicker && (
          <DateTimePicker
            value={reminderTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}

        {/* Motivation */}
        <SectionHeader title="MOTIVATION" />
        <View style={styles.section}>
          <SettingRow
            icon={<TrendingUp size={24} color="#3b82f6" />}
            label="Streak Reminders"
            description="Remind me when my streak is at risk"
            toggle
            toggleValue={streakReminders}
            onToggleChange={setStreakReminders}
            disabled={isDisabled}
          />
          <View style={styles.divider} />
          <SettingRow
            icon={<TrendingUp size={24} color="#3b82f6" />}
            label="Weekly Summary"
            description="Send weekly progress summary"
            toggle
            toggleValue={weeklySummary}
            onToggleChange={handleToggleWeeklySummary}
            disabled={isDisabled}
          />
        </View>

        {/* Achievements */}
        <SectionHeader title="ACHIEVEMENTS" />
        <View style={styles.section}>
          <SettingRow
            icon={<Trophy size={24} color="#3b82f6" />}
            label="PR Notifications"
            description="Notify when I hit a personal record"
            toggle
            toggleValue={prNotifications}
            onToggleChange={setPrNotifications}
            disabled={isDisabled}
          />
          <View style={styles.divider} />
          <SettingRow
            icon={<Trophy size={24} color="#3b82f6" />}
            label="Milestone Alerts"
            description="Celebrate workout count milestones"
            toggle
            toggleValue={milestoneAlerts}
            onToggleChange={setMilestoneAlerts}
            disabled={isDisabled}
          />
        </View>

        {/* Quiet Hours */}
        <SectionHeader title="QUIET HOURS" />
        <View style={styles.section}>
          <SettingRow
            icon={<Moon size={24} color="#3b82f6" />}
            label="Enable Quiet Hours"
            toggle
            toggleValue={enableQuietHours}
            onToggleChange={setEnableQuietHours}
            disabled={isDisabled}
          />
        </View>

        <View style={styles.quietHoursContainer}>
          <View style={styles.quietHourRow}>
            <Text style={[styles.quietLabel, (isDisabled || !enableQuietHours) && styles.quietLabelDisabled]}>
              Start Time
            </Text>
            <TouchableOpacity
              style={[
                styles.timeButton,
                (isDisabled || !enableQuietHours) && styles.timeButtonDisabled,
              ]}
              onPress={() => setShowQuietStartPicker(true)}
              disabled={isDisabled || !enableQuietHours}
            >
              <Clock size={20} color="#3b82f6" />
              <Text style={styles.timeText}>{formatTime(quietStart)}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quietHourRow}>
            <Text style={[styles.quietLabel, (isDisabled || !enableQuietHours) && styles.quietLabelDisabled]}>
              End Time
            </Text>
            <TouchableOpacity
              style={[
                styles.timeButton,
                (isDisabled || !enableQuietHours) && styles.timeButtonDisabled,
              ]}
              onPress={() => setShowQuietEndPicker(true)}
              disabled={isDisabled || !enableQuietHours}
            >
              <Clock size={20} color="#3b82f6" />
              <Text style={styles.timeText}>{formatTime(quietEnd)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showQuietStartPicker && (
          <DateTimePicker
            value={quietStart}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, time) => {
              setShowQuietStartPicker(Platform.OS === 'ios');
              if (time) setQuietStart(time);
            }}
          />
        )}

        {showQuietEndPicker && (
          <DateTimePicker
            value={quietEnd}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, time) => {
              setShowQuietEndPicker(Platform.OS === 'ios');
              if (time) setQuietEnd(time);
            }}
          />
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 64,
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#f1f5f9',
    marginBottom: 2,
  },
  settingLabelDisabled: {
    color: '#64748b',
  },
  settingDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginLeft: 60,
  },
  warningCard: {
    backgroundColor: '#451a03',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#78350f',
  },
  warningText: {
    fontSize: 14,
    color: '#fbbf24',
    lineHeight: 20,
    marginBottom: 12,
  },
  settingsButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  settingsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  daysSectionContainer: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
  },
  daysLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  daySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#3b82f6',
  },
  dayButtonDisabled: {
    opacity: 0.5,
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  dayButtonTextSelected: {
    color: '#ffffff',
  },
  timeContainer: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  timeButtonDisabled: {
    opacity: 0.5,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  quietHoursContainer: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  quietHourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quietLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  quietLabelDisabled: {
    color: '#64748b',
  },
  bottomSpacer: {
    height: 32,
  },
});

