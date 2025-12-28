import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Get current app version and build number
 */
export function getAppVersion(): { version: string; buildNumber: string } {
  const version = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = 
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber || '1'
      : Constants.expoConfig?.android?.versionCode?.toString() || '1';

  return { version, buildNumber };
}

/**
 * Get device information
 */
export function getDeviceInfo(): {
  model: string;
  osName: string;
  osVersion: string;
  platform: string;
} {
  return {
    model: Device.modelName || Device.deviceName || 'Unknown Device',
    osName: Device.osName || Platform.OS,
    osVersion: Device.osVersion || 'Unknown',
    platform: Platform.OS,
  };
}

/**
 * Generate pre-filled support email
 */
export function generateSupportEmail(
  userId: string,
  type: 'bug' | 'feature' | 'general'
): { subject: string; body: string } {
  const { version, buildNumber } = getAppVersion();
  const { model, osName, osVersion } = getDeviceInfo();

  let subject = '';
  let bodyHeader = '';

  switch (type) {
    case 'bug':
      subject = 'Bug Report - GymTracker';
      bodyHeader = 'Bug Report\n\n';
      break;
    case 'feature':
      subject = 'Feature Request - GymTracker';
      bodyHeader = 'Feature Request\n\n';
      break;
    default:
      subject = 'Support - GymTracker';
      bodyHeader = 'Support Request\n\n';
  }

  const body = `${bodyHeader}App Version: ${version} (${buildNumber})
Device: ${model}
OS: ${osName} ${osVersion}
User ID: ${userId}

${type === 'bug' ? 'Describe the bug:\n\n\nSteps to reproduce:\n1. \n2. \n3. \n\nExpected behavior:\n\n\nActual behavior:\n\n' : type === 'feature' ? 'Feature description:\n\n\nWhy is this feature useful:\n\n' : 'How can we help you?\n\n'}`;

  return { subject, body };
}

/**
 * Get app store URL based on platform
 */
export function getAppStoreUrl(): string {
  if (Platform.OS === 'ios') {
    // Replace with your actual App Store ID
    return 'https://apps.apple.com/app/id123456789';
  } else {
    // Replace with your actual Play Store package name
    return 'https://play.google.com/store/apps/details?id=com.yourcompany.gymtracker';
  }
}

/**
 * Get social media URLs
 */
export function getSocialUrls() {
  return {
    twitter: 'https://twitter.com/yourusername',
    instagram: 'https://instagram.com/yourusername',
    website: 'https://yourwebsite.com',
    github: 'https://github.com/yourusername/gym-tracker',
  };
}

/**
 * Get legal document URLs
 */
export function getLegalUrls() {
  return {
    terms: 'https://yourwebsite.com/terms',
    privacy: 'https://yourwebsite.com/privacy',
    licenses: 'https://yourwebsite.com/licenses',
  };
}

/**
 * Format version string for display
 */
export function getVersionString(): string {
  const { version, buildNumber } = getAppVersion();
  return `${version} (${buildNumber})`;
}

