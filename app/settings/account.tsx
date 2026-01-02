import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Mail, Lock, AlertTriangle, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import DeleteAccountModal from '../../components/modals/DeleteAccountModal';
import { sendPasswordResetEmail } from '../../lib/api/account';

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({ icon, label, value, onPress, danger }) => {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingRowLeft}>
        <View style={styles.iconContainer}>{icon}</View>
        <Text style={[styles.settingLabel, danger && styles.settingLabelDanger]}>
          {label}
        </Text>
      </View>
      <View style={styles.settingRowRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        <ChevronRight size={20} color={danger ? '#ef4444' : '#64748b'} />
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
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
};

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleChangeEmail = () => {
    router.push('/settings/change-email');
  };

  const handleChangePassword = () => {
    router.push('/settings/change-password');
  };

  const handleForgotPassword = async () => {
    if (!user?.email) return;

    Alert.alert(
      'Reset Password',
      `Send password reset email to ${user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Email',
          onPress: async () => {
            const result = await sendPasswordResetEmail(user.email!);
            if (result.success) {
              Alert.alert('Success', 'Password reset email sent. Please check your inbox.');
            } else {
              Alert.alert('Error', result.error || 'Failed to send reset email');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteSuccess = () => {
    // Navigate to login screen
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Account',
          headerShown: true,
          headerStyle: { backgroundColor: '#1e293b' },
          headerTintColor: '#f1f5f9',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Email Section */}
        <SectionHeader title="EMAIL" />
        <View style={styles.section}>
          <View style={styles.emailRow}>
            <View style={styles.iconContainer}>
              <Mail size={24} color="#3b82f6" />
            </View>
            <View style={styles.emailContent}>
              <Text style={styles.emailLabel}>Current Email</Text>
              <Text style={styles.emailValue}>{user?.email || 'Not set'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <SettingRow
            icon={<Mail size={24} color="#3b82f6" />}
            label="Change Email"
            onPress={handleChangeEmail}
          />
        </View>

        {/* Password Section */}
        <SectionHeader title="PASSWORD" />
        <View style={styles.section}>
          <SettingRow
            icon={<Lock size={24} color="#3b82f6" />}
            label="Change Password"
            onPress={handleChangePassword}
          />
          <View style={styles.divider} />
          <TouchableOpacity style={styles.forgotPasswordRow} onPress={handleForgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            <Text style={styles.forgotPasswordSubtext}>Send reset email</Text>
          </TouchableOpacity>
        </View>

        {/* Connected Accounts Section */}
        <SectionHeader title="CONNECTED ACCOUNTS" />
        <View style={styles.section}>
          <View style={styles.comingSoonRow}>
            <Text style={styles.comingSoonLabel}>Google</Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonBadgeText}>Coming Soon</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.comingSoonRow}>
            <Text style={styles.comingSoonLabel}>Apple</Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonBadgeText}>Coming Soon</Text>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <SectionHeader title="DANGER ZONE" />
        <View style={styles.dangerZone}>
          <View style={styles.dangerHeader}>
            <AlertTriangle size={24} color="#ef4444" />
            <Text style={styles.dangerTitle}>Delete Account</Text>
          </View>
          <Text style={styles.dangerDescription}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </Text>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Text style={styles.deleteButtonText}>Delete My Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onSuccess={handleDeleteSuccess}
      />
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
    minHeight: 60,
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
  settingLabel: {
    fontSize: 16,
    color: '#f1f5f9',
  },
  settingLabelDanger: {
    color: '#ef4444',
  },
  settingRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 14,
    color: '#94a3b8',
    marginRight: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginLeft: 60,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  emailContent: {
    flex: 1,
  },
  emailLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  emailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#f1f5f9',
  },
  forgotPasswordRow: {
    padding: 16,
  },
  forgotPasswordText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3b82f6',
    marginBottom: 4,
  },
  forgotPasswordSubtext: {
    fontSize: 13,
    color: '#64748b',
  },
  comingSoonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  comingSoonLabel: {
    fontSize: 16,
    color: '#94a3b8',
  },
  comingSoonBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#334155',
    borderRadius: 6,
  },
  comingSoonBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  dangerZone: {
    backgroundColor: '#450a0a',
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#991b1b',
    padding: 20,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fca5a5',
    marginLeft: 12,
  },
  dangerDescription: {
    fontSize: 14,
    color: '#fecaca',
    lineHeight: 20,
    marginBottom: 16,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  bottomSpacer: {
    height: 32,
  },
});
