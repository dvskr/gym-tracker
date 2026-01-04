import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  User,
  ChevronRight,
  Ruler,
  Dumbbell,
  Bell,
  Shield,
  Download,
  Info,
  LogOut,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { mediumHaptic, lightHaptic } from '@/lib/utils/haptics';

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();

  const handleSignOut = () => {
    mediumHaptic();
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: signOut 
        },
      ]
    );
  };

  const NavigationItem = ({ 
    icon, 
    label, 
    route, 
    description 
  }: { 
    icon: React.ReactNode; 
    label: string; 
    route: string;
    description?: string;
  }) => (
    <TouchableOpacity
      style={styles.navItem}
      onPress={() => {
        lightHaptic();
        router.push(route as any);
      }}
    >
      <View style={styles.navItemLeft}>
        <View style={styles.navIconContainer}>{icon}</View>
        <View style={styles.navTextContainer}>
          <Text style={styles.navLabel}>{label}</Text>
          {description && (
            <Text style={styles.navDescription}>{description}</Text>
          )}
        </View>
      </View>
      <ChevronRight size={20} color="#6b7280" />
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <TouchableOpacity
          style={styles.profileHeader}
          onPress={() => {
            lightHaptic();
            router.push('/settings/profile');
          }}
        >
          <View style={styles.avatarContainer}>
            {user?.user_metadata?.avatar_url ? (
              <Image 
                source={{ uri: user.user_metadata.avatar_url }} 
                style={styles.avatar} 
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={40} color="#6b7280" />
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.user_metadata?.full_name || 'Set up your profile'}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
          <ChevronRight size={24} color="#6b7280" />
        </TouchableOpacity>

        {/* Preferences */}
        <SectionHeader title="Preferences" />
        <View style={styles.section}>
          <NavigationItem
            icon={<Ruler size={22} color="#60a5fa" />}
            label="Units & Measurements"
            route="/settings/units"
            description="Imperial or Metric"
          />
        </View>

        {/* Workout */}
        <SectionHeader title="Workout" />
        <View style={styles.section}>
          <NavigationItem
            icon={<Dumbbell size={22} color="#60a5fa" />}
            label="Workout Settings"
            route="/settings/workout"
            description="Rest timer, sounds, logging"
          />
        </View>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <View style={styles.section}>
          <NavigationItem
            icon={<Bell size={22} color="#60a5fa" />}
            label="Notification Settings"
            route="/settings/notifications"
            description="Reminders, alerts, celebrations"
          />
        </View>

        {/* Account */}
        <SectionHeader title="Account" />
        <View style={styles.section}>
          <NavigationItem
            icon={<Shield size={22} color="#60a5fa" />}
            label="Account & Security"
            route="/settings/account"
            description="Password, email, delete account"
          />
          <View style={styles.divider} />
          <NavigationItem
            icon={<Download size={22} color="#60a5fa" />}
            label="Export Data"
            route="/settings/export"
            description="Download your workout history"
          />
        </View>

        {/* About */}
        <SectionHeader title="About" />
        <View style={styles.section}>
          <NavigationItem
            icon={<Info size={22} color="#60a5fa" />}
            label="About & Support"
            route="/settings/about"
            description="Help, legal, contact"
          />
        </View>

        {/* Sign Out */}
        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <LogOut size={22} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Bottom Spacing */}
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
    padding: 20,
  },

  // Profile Header
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  avatarContainer: {
    marginRight: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#94a3b8',
  },

  // Sections
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
    marginLeft: 4,
  },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },

  // Navigation Items
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  navItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  navIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  navTextContainer: {
    flex: 1,
  },
  navLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#f1f5f9',
  },
  navDescription: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginLeft: 70,
  },

  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    gap: 10,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },

  bottomSpacer: {
    height: 40,
  },
});
