import React, { useState } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Share,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {
  Star,
  Share2,
  Twitter,
  Instagram,
  FileText,
  Shield,
  Code,
  HelpCircle,
  Mail,
  Bug,
  Lightbulb,
  ChevronRight,
  Copy,
  ExternalLink,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import {
  getAppVersion,
  getDeviceInfo,
  generateSupportEmail,
  getAppStoreUrl,
  getSocialUrls,
  getLegalUrls,
  getVersionString,
} from '../../lib/utils/deviceInfo';

interface LinkRowProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  external?: boolean;
}

const LinkRow: React.FC<LinkRowProps> = ({ icon, label, onPress, external }) => {
  return (
    <TouchableOpacity style={styles.linkRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.linkRowLeft}>
        <View style={styles.iconContainer}>{icon}</View>
        <Text style={styles.linkLabel}>{label}</Text>
      </View>
      {external ? (
        <ExternalLink size={20} color="#64748b" />
      ) : (
        <ChevronRight size={20} color="#64748b" />
      )}
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

export default function AboutScreen() {
  const { user } = useAuthStore();
  const [copiedUserId, setCopiedUserId] = useState(false);

  const { version, buildNumber } = getAppVersion();
  const { model, osName, osVersion } = getDeviceInfo();
  const socialUrls = getSocialUrls();
  const legalUrls = getLegalUrls();

  const handleRateApp = () => {
    const url = getAppStoreUrl();
    Linking.openURL(url);
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: 'Check out GymTracker - the best workout tracking app! ' + getAppStoreUrl(),
        title: 'GymTracker',
      });
    } catch (error) {
      logger.error('Error sharing:', error);
    }
  };

  const handleOpenSocial = (platform: keyof ReturnType<typeof getSocialUrls>) => {
    Linking.openURL(socialUrls[platform]);
  };

  const handleOpenLegal = (doc: keyof ReturnType<typeof getLegalUrls>) => {
    Linking.openURL(legalUrls[doc]);
  };

  const handleContactSupport = () => {
    const { subject, body } = generateSupportEmail(user?.id || 'unknown', 'general');
    const url = `mailto:support@gymtracker.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url);
  };

  const handleReportBug = () => {
    const { subject, body } = generateSupportEmail(user?.id || 'unknown', 'bug');
    const url = `mailto:support@gymtracker.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url);
  };

  const handleFeatureRequest = () => {
    const { subject, body } = generateSupportEmail(user?.id || 'unknown', 'feature');
    const url = `mailto:support@gymtracker.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url);
  };

  const handleCopyUserId = async () => {
    if (user?.id) {
      await Clipboard.setStringAsync(user.id);
      setCopiedUserId(true);
      setTimeout(() => setCopiedUserId(false), 2000);
      Alert.alert('Copied', 'User ID copied to clipboard');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'About',
          headerShown: true,
          headerStyle: { backgroundColor: '#1e293b' },
          headerTintColor: '#f1f5f9',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* App Info */}
        <View style={styles.appInfoSection}>
          <View style={styles.appIcon}>
            <Text style={styles.appIconText}>ðŸ’ª</Text>
          </View>
          <Text style={styles.appName}>GymTracker</Text>
          <Text style={styles.appVersion}>Version {getVersionString()}</Text>
          <Text style={styles.appCopyright}>Â© 2024 GymTracker</Text>
          <Text style={styles.appTagline}>Track. Progress. Achieve.</Text>
        </View>

        {/* Links */}
        <SectionHeader title="COMMUNITY" />
        <View style={styles.section}>
          <LinkRow
            icon={<Star size={24} color="#f59e0b" />}
            label="Rate on App Store"
            onPress={handleRateApp}
            external
          />
          <View style={styles.divider} />
          <LinkRow
            icon={<Share2 size={24} color="#3b82f6" />}
            label="Share App"
            onPress={handleShareApp}
          />
          <View style={styles.divider} />
          <LinkRow
            icon={<Twitter size={24} color="#1d9bf0" />}
            label="Follow on Twitter"
            onPress={() => handleOpenSocial('twitter')}
            external
          />
          <View style={styles.divider} />
          <LinkRow
            icon={<Instagram size={24} color="#e4405f" />}
            label="Follow on Instagram"
            onPress={() => handleOpenSocial('instagram')}
            external
          />
        </View>

        {/* Legal */}
        <SectionHeader title="LEGAL" />
        <View style={styles.section}>
          <LinkRow
            icon={<FileText size={24} color="#64748b" />}
            label="Terms of Service"
            onPress={() => handleOpenLegal('terms')}
            external
          />
          <View style={styles.divider} />
          <LinkRow
            icon={<Shield size={24} color="#64748b" />}
            label="Privacy Policy"
            onPress={() => handleOpenLegal('privacy')}
            external
          />
          <View style={styles.divider} />
          <LinkRow
            icon={<Code size={24} color="#64748b" />}
            label="Open Source Licenses"
            onPress={() => handleOpenLegal('licenses')}
            external
          />
        </View>

        {/* Support */}
        <SectionHeader title="SUPPORT" />
        <View style={styles.section}>
          <LinkRow
            icon={<HelpCircle size={24} color="#3b82f6" />}
            label="Help Center"
            onPress={() => Linking.openURL('https://gymtracker.app/help')}
            external
          />
          <View style={styles.divider} />
          <LinkRow
            icon={<Mail size={24} color="#3b82f6" />}
            label="Contact Support"
            onPress={handleContactSupport}
          />
          <View style={styles.divider} />
          <LinkRow
            icon={<Bug size={24} color="#ef4444" />}
            label="Report a Bug"
            onPress={handleReportBug}
          />
          <View style={styles.divider} />
          <LinkRow
            icon={<Lightbulb size={24} color="#f59e0b" />}
            label="Feature Request"
            onPress={handleFeatureRequest}
          />
        </View>

        {/* Debug Info */}
        <SectionHeader title="DEBUG INFO" />
        <View style={styles.debugSection}>
          <TouchableOpacity style={styles.debugRow} onPress={handleCopyUserId}>
            <Text style={styles.debugLabel}>User ID:</Text>
            <View style={styles.debugValueContainer}>
              <Text style={styles.debugValue} numberOfLines={1}>
                {user?.id?.substring(0, 24)}...
              </Text>
              <Copy size={16} color="#64748b" />
            </View>
          </TouchableOpacity>
          {copiedUserId && <Text style={styles.copiedText}>âœ“ Copied</Text>}
          
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Device:</Text>
            <Text style={styles.debugValue}>{model}</Text>
          </View>
          
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>OS:</Text>
            <Text style={styles.debugValue}>
              {osName} {osVersion}
            </Text>
          </View>
          
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Build:</Text>
            <Text style={styles.debugValue}>{buildNumber}</Text>
          </View>
        </View>

        <Text style={styles.madeWithLove}>Made with â¤ï¸ for fitness enthusiasts</Text>

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
  appInfoSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  appIconText: {
    fontSize: 40,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  appVersion: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  appCopyright: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  appTagline: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
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
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  linkRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  linkLabel: {
    fontSize: 16,
    color: '#f1f5f9',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginLeft: 60,
  },
  debugSection: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  debugLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  debugValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  debugValue: {
    fontSize: 13,
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  copiedText: {
    fontSize: 12,
    color: '#22c55e',
    textAlign: 'right',
    marginTop: 4,
  },
  madeWithLove: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 32,
    fontStyle: 'italic',
  },
  bottomSpacer: {
    height: 32,
  },
});

