import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell,
  BellOff,
  Calendar,
  Flame,
  Clock,
  Trophy,
  Award,
  CloudUpload,
  ChevronRight,
  Volume2,
  Moon,
  BarChart3,
} from 'lucide-react-native';
import { useSettingsStore } from '../../stores/settingsStore';
import { useNotificationPermissions } from '../../hooks/useNotificationPermissions';
import { NotificationPermissionBanner } from '../../components/notifications';
import { SettingsHeader } from '../../components/SettingsHeader';
import { Button } from '../../components/ui';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';
import { lightHaptic } from '@/lib/utils/haptics';

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
          onValueChange={(newValue) => {
            if (!disabled) {
              lightHaptic();
            }
            onValueChange(newValue);
          }}
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
  useBackNavigation(); // Enable Android back gesture support

  const router = useRouter();
  const settings = useSettingsStore();
  const {
    isGranted,
    openSettings: openSystemSettings,
  } = useNotificationPermissions();

  // If system permissions not granted, show permission prompt
  if (!isGranted) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
      <SettingsHeader title="Notifications" />
        
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
      <SettingsHeader title="Notifications" />

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
            icon={<Calendar size={20} color="#94a3b8" />}
            title="Configure Schedule"
            subtitle="Set your workout days and times"
            onPress={() => router.push('/settings/reminders' as any)}
            disabled={isDisabled || !settings.workoutReminders}
            showChevron
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
          
          <Divider />
          
          <SettingRow
            icon={<BarChart3 size={20} color="#14b8a6" />}
            title="Weekly Summary"
            subtitle="Progress report every Sunday"
            value={settings.weeklySummary}
            onValueChange={(v) => settings.updateSettings({ weeklySummary: v })}
            disabled={isDisabled}
          />
        </View>

        {/* Celebrations */}
        <SectionHeader title="CELEBRATIONS" />
        <View style={styles.section}>
          <SettingRow
            icon={<Award size={20} color="#8b5cf6" />}
            title="Achievements"
            subtitle="Badge unlock notifications"
            value={settings.achievementNotifications}
            onValueChange={(v) => {
              if (!v || (v && !settings.achievementNotifications)) {
                lightHaptic();
              }
              settings.updateSettings({ achievementNotifications: v });
            }}
            disabled={isDisabled}
          />
          
          <Divider />
          
          <SettingRow
            icon={<Trophy size={20} color="#f59e0b" />}
            title="Milestone Alerts"
            subtitle="Workout & volume milestones"
            value={settings.milestoneAlerts}
            onValueChange={(v) => {
              lightHaptic();
              settings.updateSettings({ milestoneAlerts: v });
            }}
            disabled={isDisabled}
          />
          
          <Divider />
          
          <SettingRow
            icon={<Volume2 size={20} color={settings.achievementNotifications && !isDisabled ? "#8b5cf6" : "#4b5563"} />}
            title="Sound on Achievement"
            subtitle="Play sound when unlocked"
            value={settings.achievementSoundEnabled}
            onValueChange={(v) => {
              if (settings.achievementNotifications && !isDisabled) {
                lightHaptic();
              }
              settings.updateSettings({ achievementSoundEnabled: v });
            }}
            disabled={isDisabled || !settings.achievementNotifications}
          />
        </View>

        {/* Quiet Hours */}
        <SectionHeader title="QUIET HOURS" />
        <View style={styles.section}>
          <SettingRow
            icon={<Moon size={20} color="#6366f1" />}
            title="Do Not Disturb"
            subtitle={settings.quietHoursEnabled 
              ? `${settings.quietHoursStart} - ${settings.quietHoursEnd}`
              : "Silence notifications at night"
            }
            value={settings.quietHoursEnabled}
            onValueChange={(v) => {
              lightHaptic();
              settings.updateSettings({ quietHoursEnabled: v });
            }}
            disabled={isDisabled}
          />
          
          {settings.quietHoursEnabled && !isDisabled && (
            <>
              <Divider />
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>Start Time</Text>
                <Text style={styles.timeValue}>{settings.quietHoursStart}</Text>
              </View>
              <Divider />
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>End Time</Text>
                <Text style={styles.timeValue}>{settings.quietHoursEnd}</Text>
              </View>
            </>
          )}
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
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginLeft: 40,
  },
  timeLabel: {
    fontSize: 15,
    color: '#94a3b8',
  },
  timeValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366f1',
  },
  bottomSpacer: {
    height: 32,
  },
});
