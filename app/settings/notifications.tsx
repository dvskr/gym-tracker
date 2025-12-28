import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  Bell,
  BellOff,
  Calendar,
  Timer,
  Volume2,
  Vibrate,
  Flame,
  Clock,
  Trophy,
  Award,
  CloudUpload,
  ChevronRight,
  Send,
} from 'lucide-react-native';
import { useSettingsStore } from '../../stores/settingsStore';
import { useNotificationPermissions } from '../../hooks/useNotificationPermissions';
import { NotificationPermissionBanner } from '../../components/notifications';
import { Button } from '../../components/ui';
import { notificationService } from '@/lib/notifications/notificationService';

interface SettingRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  onPress?: () => void;
  showChevron?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
  onPress,
  showChevron,
}) => {
  const content = (
    <View style={[styles.settingRow, disabled && styles.settingRowDisabled]}>
      <View style={styles.settingRowLeft}>
        <View style={styles.iconContainer}>{icon}</View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingLabel, disabled && styles.settingLabelDisabled]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.settingSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      {onValueChange !== undefined && (
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ false: '#374151', true: '#22c55e' }}
          thumbColor={value ? '#fff' : '#9ca3af'}
        />
      )}
      {showChevron && (
        <ChevronRight size={20} color="#64748b" />
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} disabled={disabled}>
        {content}
      </Pressable>
    );
  }

  return content;
};

interface SectionHeaderProps {
  title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const Divider: React.FC = () => <View style={styles.divider} />;

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const settings = useSettingsStore();
  const {
    isGranted,
    openSettings: openSystemSettings,
  } = useNotificationPermissions();

  const handleSendTestNotification = async () => {
    try {
      await notificationService.scheduleNotification(
        'Test Notification 🎉',
        'Notifications are working perfectly!',
        {
          seconds: 1,
        },
        {
          channelId: 'general',
          data: { type: 'test' },
        }
      );
      
      Alert.alert(
        'Test Sent!',
        'You should receive a notification in 1 second.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to send test notification. Make sure notifications are enabled.',
        [{ text: 'OK' }]
      );
    }
  };

  // If system permissions not granted, show permission prompt
  if (!isGranted) {
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
        
        <View style={styles.permissionContainer}>
          <View style={styles.permissionCard}>
            <BellOff size={64} color="#6b7280" />
            <Text style={styles.permissionTitle}>
              Notifications Disabled
            </Text>
            <Text style={styles.permissionText}>
              Enable notifications in your device settings to receive 
              workout reminders, PR celebrations, and achievement alerts.
            </Text>
            <Button 
              title="Open Device Settings" 
              onPress={openSystemSettings}
              style={styles.permissionButton}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const isDisabled = !settings.notificationsEnabled;

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

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Permission Banner */}
        <NotificationPermissionBanner />

        {/* Master Toggle */}
        <SectionHeader title="MASTER CONTROL" />
        <View style={styles.section}>
          <SettingRow
            icon={<Bell size={20} color="#3b82f6" />}
            title="Enable All Notifications"
            subtitle="Turn all notifications on/off"
            value={settings.notificationsEnabled}
            onValueChange={(v) => settings.updateSettings({ notificationsEnabled: v })}
          />
        </View>

        {/* Workout Reminders */}
        <SectionHeader title="WORKOUT REMINDERS" />
        <View style={styles.section}>
          <SettingRow
            icon={<Calendar size={20} color="#22c55e" />}
            title="Scheduled Reminders"
            subtitle="Remind me on workout days"
            value={settings.workoutReminders}
            onValueChange={(v) => settings.updateSettings({ workoutReminders: v })}
            disabled={isDisabled}
          />
          
          <Divider />
          
          <SettingRow
            icon={<ChevronRight size={20} color="#94a3b8" />}
            title="Configure Schedule"
            subtitle="Set your workout days and times"
            onPress={() => router.push('/settings/reminders' as any)}
            disabled={isDisabled || !settings.workoutReminders}
            showChevron
          />
        </View>

        {/* During Workout */}
        <SectionHeader title="DURING WORKOUT" />
        <View style={styles.section}>
          <SettingRow
            icon={<Timer size={20} color="#f59e0b" />}
            title="Rest Timer Alerts"
            subtitle="Notify when rest period ends"
            value={settings.restTimerAlerts}
            onValueChange={(v) => settings.updateSettings({ restTimerAlerts: v })}
            disabled={isDisabled}
          />
          
          <Divider />
          
          <SettingRow
            icon={<Volume2 size={20} color="#94a3b8" />}
            title="Sound"
            subtitle="Play sound on rest complete"
            value={settings.restTimerSound}
            onValueChange={(v) => settings.updateSettings({ restTimerSound: v })}
            disabled={isDisabled || !settings.restTimerAlerts}
          />
          
          <Divider />
          
          <SettingRow
            icon={<Vibrate size={20} color="#94a3b8" />}
            title="Vibration"
            subtitle="Vibrate on rest complete"
            value={settings.restTimerVibration}
            onValueChange={(v) => settings.updateSettings({ restTimerVibration: v })}
            disabled={isDisabled || !settings.restTimerAlerts}
          />
        </View>

        {/* Stay Motivated */}
        <SectionHeader title="STAY MOTIVATED" />
        <View style={styles.section}>
          <SettingRow
            icon={<Flame size={20} color="#ef4444" />}
            title="Streak Reminders"
            subtitle="Don't break your streak!"
            value={settings.streakReminders}
            onValueChange={(v) => settings.updateSettings({ streakReminders: v })}
            disabled={isDisabled}
          />
          
          <Divider />
          
          <SettingRow
            icon={<Clock size={20} color="#8b5cf6" />}
            title="Inactivity Reminders"
            subtitle="Gentle nudge after days off"
            value={settings.inactivityReminders}
            onValueChange={(v) => settings.updateSettings({ inactivityReminders: v })}
            disabled={isDisabled}
          />
        </View>

        {/* Celebrations */}
        <SectionHeader title="CELEBRATIONS" />
        <View style={styles.section}>
          <SettingRow
            icon={<Trophy size={20} color="#f59e0b" />}
            title="Personal Records"
            subtitle="Celebrate new PRs"
            value={settings.prNotifications}
            onValueChange={(v) => settings.updateSettings({ prNotifications: v })}
            disabled={isDisabled}
          />
          
          <Divider />
          
          <SettingRow
            icon={<Award size={20} color="#8b5cf6" />}
            title="Achievements"
            subtitle="Milestone notifications"
            value={settings.achievementNotifications}
            onValueChange={(v) => settings.updateSettings({ achievementNotifications: v })}
            disabled={isDisabled}
          />
        </View>

        {/* System */}
        <SectionHeader title="SYSTEM" />
        <View style={styles.section}>
          <SettingRow
            icon={<CloudUpload size={20} color="#06b6d4" />}
            title="Backup Reminders"
            subtitle="Weekly backup reminders"
            value={settings.backupReminders}
            onValueChange={(v) => settings.updateSettings({ backupReminders: v })}
            disabled={isDisabled}
          />
        </View>

        {/* Test Notification */}
        <View style={styles.testSection}>
          <Button
            title="Send Test Notification"
            variant="secondary"
            onPress={handleSendTestNotification}
            icon={<Send size={20} color="#f1f5f9" />}
            disabled={isDisabled}
          />
          <Text style={styles.testHint}>
            Test if notifications are working on this device
          </Text>
        </View>

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
  scrollContent: {
    paddingBottom: 24,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f1f5f9',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionButton: {
    minWidth: 200,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
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
    marginRight: 12,
  },
  iconContainer: {
    width: 28,
    alignItems: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  settingLabelDisabled: {
    color: '#64748b',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginLeft: 56,
  },
  testSection: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  testHint: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 32,
  },
});
