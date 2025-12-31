import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User,
  ChevronRight,
  Settings,
  Globe,
  Moon,
  Clock,
  Volume2,
  Vibrate,
  Eye,
  Calculator,
  Bell,
  Target,
  Trophy,
  Lock,
  Download,
  Trash2,
  Info,
  FileText,
  Shield,
  Mail,
  Star,
  LogIn,
  LogOut,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';

interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  disabled?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  label,
  value,
  onPress,
  toggle,
  toggleValue,
  onToggleChange,
  disabled,
}) => {
  return (
    <TouchableOpacity
      style={[styles.settingItem, disabled && styles.settingItemDisabled]}
      onPress={onPress}
      disabled={disabled || toggle}
      activeOpacity={0.7}
    >
      <View style={styles.settingItemLeft}>
        <View style={styles.iconContainer}>{icon}</View>
        <Text style={[styles.settingLabel, disabled && styles.settingLabelDisabled]}>
          {label}
        </Text>
      </View>
      <View style={styles.settingItemRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {toggle ? (
          <Switch
            value={toggleValue}
            onValueChange={onToggleChange}
            trackColor={{ false: '#374151', true: '#3b82f6' }}
            thumbColor={toggleValue ? '#60a5fa' : '#9ca3af'}
          />
        ) : (
          !disabled && <ChevronRight size={20} color="#64748b" />
        )}
      </View>
    </TouchableOpacity>
  );
};

interface SectionHeaderProps {
  title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, session, profile, signOut } = useAuthStore();
  
  const isLoggedIn = !!session;

  // Settings state (these would come from profile/settings store in real app)
  const [autoStartTimer, setAutoStartTimer] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [showPreviousWorkout, setShowPreviousWorkout] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [workoutReminders, setWorkoutReminders] = useState(true);
  const [streakReminders, setStreakReminders] = useState(true);
  const [prCelebrations, setPrCelebrations] = useState(true);

  const handleEditProfile = () => {
    router.push('/settings/profile');
  };

  const handleChangeAvatar = () => {
    // Open image picker
    console.log('Change avatar');
  };

  const handleUnitsSettings = () => {
    router.push('/settings/units');
  };

  const handleThemeSettings = () => {
    router.push('/settings/theme');
  };

  const handleRestTimerSettings = () => {
    router.push('/settings/workout');
  };

  const handlePlateCalculatorSettings = () => {
    router.push('/settings/workout');
  };

  const handleReminderSchedule = () => {
    router.push('/settings/notifications');
  };

  const handleChangePassword = () => {
    router.push('/settings/account');
  };

  const handleExportData = () => {
    router.push('/settings/export');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure? This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => console.log('Deleting account...'),
        },
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  const handleAuthAction = async () => {
    if (isLoggedIn) {
      handleSignOut();
    } else {
      router.push('/(auth)/login');
    }
  };

  const handleRateApp = () => {
    router.push('/settings/about');
  };

  const appVersion = '1.0.0';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          {isLoggedIn ? (
            <>
              <TouchableOpacity onPress={handleChangeAvatar} activeOpacity={0.7}>
                <View style={styles.avatarContainer}>
                  {profile?.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <User size={48} color="#60a5fa" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <Text style={styles.userName}>{profile?.full_name || 'User'}</Text>
              <Text style={styles.userEmail}>{user?.email || ''}</Text>
              <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
                <Text style={styles.editProfileButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.guestAvatar}>
                <User size={40} color="#6b7280" />
              </View>
              <Text style={styles.guestText}>Guest Mode</Text>
              <Text style={styles.guestSubtext}>Sign in to track your workouts</Text>
            </>
          )}
        </View>

        {/* Preferences Section */}
        <SectionHeader title="PREFERENCES" />
        <View style={styles.section}>
          <SettingItem
            icon={<Settings size={24} color="#60a5fa" />}
            label="Units"
            value={profile?.unit_system === 'metric' ? 'Metric' : 'Imperial'}
            onPress={handleUnitsSettings}
          />
          <SettingItem
            icon={<Moon size={24} color="#60a5fa" />}
            label="Theme"
            value={profile?.theme === 'dark' ? 'Dark' : profile?.theme === 'light' ? 'Light' : 'Auto'}
            onPress={handleThemeSettings}
          />
          <SettingItem
            icon={<Globe size={24} color="#60a5fa" />}
            label="Language"
            value="English"
            disabled
          />
        </View>

        {/* Workout Settings Section */}
        <SectionHeader title="WORKOUT SETTINGS" />
        <View style={styles.section}>
          <SettingItem
            icon={<Clock size={24} color="#60a5fa" />}
            label="Rest Timer Default"
            value={`${profile?.rest_timer_default || 90} seconds`}
            onPress={handleRestTimerSettings}
          />
          <SettingItem
            icon={<Clock size={24} color="#60a5fa" />}
            label="Auto-start Timer"
            toggle
            toggleValue={autoStartTimer}
            onToggleChange={setAutoStartTimer}
          />
          <SettingItem
            icon={<Volume2 size={24} color="#60a5fa" />}
            label="Sound Effects"
            toggle
            toggleValue={soundEnabled}
            onToggleChange={setSoundEnabled}
          />
          <SettingItem
            icon={<Vibrate size={24} color="#60a5fa" />}
            label="Haptic Feedback"
            toggle
            toggleValue={hapticEnabled}
            onToggleChange={setHapticEnabled}
          />
          <SettingItem
            icon={<Eye size={24} color="#60a5fa" />}
            label="Show Previous Workout"
            toggle
            toggleValue={showPreviousWorkout}
            onToggleChange={setShowPreviousWorkout}
          />
          <SettingItem
            icon={<Calculator size={24} color="#60a5fa" />}
            label="Plate Calculator Settings"
            value={profile?.default_plates || 'Standard'}
            onPress={handlePlateCalculatorSettings}
          />
        </View>

        {/* Notifications Section */}
        <SectionHeader title="NOTIFICATIONS" />
        <View style={styles.section}>
          <SettingItem
            icon={<Bell size={24} color="#60a5fa" />}
            label="Notifications"
            value={notificationsEnabled ? 'On' : 'Off'}
            onPress={() => router.push('/settings/notifications')}
          />
          <SettingItem
            icon={<Bell size={24} color="#60a5fa" />}
            label="Workout Reminders"
            value="Set schedule"
            onPress={() => router.push('/settings/reminders')}
          />
          <SettingItem
            icon={<Trophy size={24} color="#60a5fa" />}
            label="PR Celebrations"
            toggle
            toggleValue={prCelebrations}
            onToggleChange={setPrCelebrations}
          />
        </View>

        {/* Account Section */}
        <SectionHeader title="ACCOUNT" />
        <View style={styles.section}>
          <SettingItem
            icon={<Lock size={24} color="#60a5fa" />}
            label="Change Password"
            onPress={handleChangePassword}
          />
          <SettingItem
            icon={<Download size={24} color="#60a5fa" />}
            label="Export Data"
            onPress={handleExportData}
          />
          <SettingItem
            icon={<Trash2 size={24} color="#ef4444" />}
            label="Delete Account"
            onPress={handleDeleteAccount}
          />
        </View>

        {/* About Section */}
        <SectionHeader title="ABOUT" />
        <View style={styles.section}>
          <SettingItem
            icon={<Info size={24} color="#60a5fa" />}
            label="App Version"
            value={appVersion}
          />
          <SettingItem
            icon={<FileText size={24} color="#60a5fa" />}
            label="Terms of Service"
            onPress={() => console.log('Terms')}
          />
          <SettingItem
            icon={<Shield size={24} color="#60a5fa" />}
            label="Privacy Policy"
            onPress={() => console.log('Privacy')}
          />
          <SettingItem
            icon={<Mail size={24} color="#60a5fa" />}
            label="Contact Support"
            onPress={() => console.log('Support')}
          />
          <SettingItem
            icon={<Star size={24} color="#60a5fa" />}
            label="Rate App"
            onPress={handleRateApp}
          />
        </View>

        {/* Sign Out/In Button */}
        <TouchableOpacity 
          style={[styles.authButton, !isLoggedIn && styles.signInButton]} 
          onPress={handleAuthAction}
        >
          {isLoggedIn ? (
            <>
              <LogOut size={20} color="#ffffff" />
              <Text style={styles.authButtonText}>Sign Out</Text>
            </>
          ) : (
            <>
              <LogIn size={20} color="#ffffff" />
              <Text style={styles.authButtonText}>Sign In</Text>
            </>
          )}
        </TouchableOpacity>

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
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#334155',
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
  },
  editProfileButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  editProfileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionHeaderText: {
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#f1f5f9',
    flex: 1,
  },
  settingLabelDisabled: {
    color: '#64748b',
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 14,
    color: '#94a3b8',
    marginRight: 4,
  },
  guestAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  guestText: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '600',
  },
  guestSubtext: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 4,
  },
  authButton: {
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 14,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  signInButton: {
    backgroundColor: '#3b82f6',
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  signOutButton: {
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 14,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  bottomSpacer: {
    height: 32,
  },
});
