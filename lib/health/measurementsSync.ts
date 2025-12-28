import { healthService, BodyMeasurementData } from './healthService';
import { supabase } from '../supabase';
import { useSettingsStore } from '@/stores/settingsStore';

/**
 * Log body measurements and sync supported ones to health platform
 */
export async function logMeasurementsAndSync(
  userId: string,
  data: {
    date?: Date;
    weight?: number;
    bodyFatPercentage?: number;
    chest?: number;
    waist?: number;
    hips?: number;
    bicepLeft?: number;
    bicepRight?: number;
    thighLeft?: number;
    thighRight?: number;
    calfLeft?: number;
    calfRight?: number;
    shoulders?: number;
    neck?: number;
    forearmLeft?: number;
    forearmRight?: number;
    unit?: 'in' | 'cm';
    notes?: string;
  }
): Promise<boolean> {
  try {
    const measureDate = data.date || new Date();
    const dateStr = measureDate.toISOString().split('T')[0];

    console.log('📏 Logging body measurements...');

    // 1. Save to Supabase
    const { error } = await supabase.from('body_measurements').upsert(
      {
        user_id: userId,
        measured_at: dateStr,
        weight: data.weight || null,
        body_fat_percentage: data.bodyFatPercentage || null,
        chest: data.chest || null,
        waist: data.waist || null,
        hips: data.hips || null,
        bicep_left: data.bicepLeft || null,
        bicep_right: data.bicepRight || null,
        thigh_left: data.thighLeft || null,
        thigh_right: data.thighRight || null,
        calf_left: data.calfLeft || null,
        calf_right: data.calfRight || null,
        shoulders: data.shoulders || null,
        neck: data.neck || null,
        forearm_left: data.forearmLeft || null,
        forearm_right: data.forearmRight || null,
        unit: data.unit || 'in',
        notes: data.notes || null,
      },
      {
        onConflict: 'user_id,measured_at',
      }
    );

    if (error) throw error;

    console.log('✅ Measurements saved to database');

    // 2. Sync supported measurements to health platform
    const { healthSyncEnabled, syncBodyMeasurements } = useSettingsStore.getState();

    if (healthSyncEnabled && syncBodyMeasurements) {
      // Only sync supported measurements (very limited)
      const syncData: BodyMeasurementData = {
        date: measureDate,
      };

      // Note: Only height is currently supported via expo-health-connect
      // Waist and hip would require react-native-health on iOS

      // Check if we have any supported measurements to sync
      const hasSupportedMeasurements = false; // Currently none beyond weight/height

      if (!hasSupportedMeasurements) {
        console.log('ℹ️ No supported measurements to sync (waist/hip require react-native-health)');
        console.log('ℹ️ These measurements are stored in the app only');
      } else {
        const synced = await healthService.saveBodyMeasurements(syncData);

        if (synced) {
          // Mark as synced in database
          await supabase
            .from('body_measurements')
            .update({
              health_synced: true,
              health_synced_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('measured_at', dateStr);

          console.log('✅ Measurements synced to health platform');
        }
      }
    } else {
      console.log('ℹ️ Health sync disabled for body measurements');
    }

    return true;
  } catch (error) {
    console.error('❌ Error logging measurements:', error);
    return false;
  }
}

/**
 * Import height from health platform
 */
export async function importHeightFromHealth(userId: string): Promise<number | null> {
  try {
    console.log('📏 Importing height from health platform...');

    const height = await healthService.getHeight();

    if (!height) {
      console.log('ℹ️ No height data found in health platform');
      return null;
    }

    console.log(`✅ Retrieved height: ${height} cm`);

    // Update user's profile with height
    const { error } = await supabase
      .from('profiles')
      .update({ height_cm: height })
      .eq('id', userId);

    if (error) {
      console.error('❌ Failed to update profile with height:', error);
      return null;
    }

    console.log('✅ Profile updated with height from health');
    return height;
  } catch (error) {
    console.error('❌ Error importing height from health:', error);
    return null;
  }
}

/**
 * Get supported measurement info
 */
export function getSupportedMeasurementsInfo() {
  return {
    syncable: healthService.getSyncableMeasurements(),
    appOnly: healthService.getAppOnlyMeasurements(),
    all: healthService.getSupportedMeasurements(),
  };
}

/**
 * Check if measurements should auto-sync
 */
export function shouldSyncMeasurements(): boolean {
  const { healthSyncEnabled, syncBodyMeasurements } = useSettingsStore.getState();
  const hasPermissions = healthService.getHasPermissions();

  return healthSyncEnabled && syncBodyMeasurements && hasPermissions;
}

/**
 * Get limitation info message
 */
export function getMeasurementSyncLimitations(): string {
  return `
⚠️ Health Platform Limitations:

Measurements that sync:
• Weight
• Body Fat %
• Height

Measurements stored in app only:
• Chest, Arms, Legs
• Waist, Hips
• Shoulders, Neck, Forearms

Note: Health platforms (Apple Health & Health Connect) 
do not support most body measurements beyond weight, 
body fat, and height.
  `.trim();
}

