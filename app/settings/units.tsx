import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useSettingsStore, UnitSystem } from '../../stores/settingsStore';
import {
  formatWeight,
  formatMeasurement,
  formatHeight,
  lbsToKg,
  kgToLbs,
  inchesToCm,
  cmToInches,
} from '../../lib/utils/unitConversion';
import { getCurrentTab } from '../../lib/navigation/navigationState';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';

interface RadioOptionProps {
  label: string;
  description: string;
  value: UnitSystem;
  selected: boolean;
  onSelect: (value: UnitSystem) => void;
}

const RadioOption: React.FC<RadioOptionProps> = ({
  label,
  description,
  value,
  selected,
  onSelect,
}) => {
  return (
    <TouchableOpacity
      style={[styles.radioOption, selected && styles.radioOptionSelected]}
      onPress={() => onSelect(value)}
      activeOpacity={0.7}
    >
      <View style={styles.radioOptionContent}>
        <View style={styles.radioCircle}>
          {selected && <View style={styles.radioCircleInner} />}
        </View>
        <View style={styles.radioTextContainer}>
          <Text style={styles.radioLabel}>{label}</Text>
          <Text style={styles.radioDescription}>{description}</Text>
        </View>
      </View>
      {selected && <Check size={24} color="#3b82f6" />}
    </TouchableOpacity>
  );
};

export default function UnitsSettingsScreen() {
  useBackNavigation(); // Enable Android back gesture support

  const router = useRouter();
  const params = useLocalSearchParams();
  const { unitSystem, setUnitSystem } = useSettingsStore();
  const [tempUnitSystem, setTempUnitSystem] = useState<UnitSystem>(unitSystem);

  // Update temp state when store changes
  useEffect(() => {
    setTempUnitSystem(unitSystem);
  }, [unitSystem]);

  const handleBack = () => {
    // #region agent log
    const parentTab = params.returnTo as string || getCurrentTab();
    console.log('[DEBUG_NAV] Settings back button:', JSON.stringify({from:'/settings/units',to:parentTab,timestamp:Date.now()}));
    // #endregion
    const returnPath = params.returnTo as string || getCurrentTab();
    router.push(returnPath);
  };

  const handleSave = () => {
    if (tempUnitSystem !== unitSystem) {
      setUnitSystem(tempUnitSystem);
      Alert.alert('Settings Saved', 'Unit settings have been updated throughout the app.');
    }
    // Don't auto-navigate - let user go back manually
  };

  const handleSelectUnitSystem = (newSystem: UnitSystem) => {
    setTempUnitSystem(newSystem);
  };

  // Example conversions for preview
  const exampleWeight = 150; // lbs
  const exampleHeight = 180; // cm
  const exampleMeasurement = 40; // cm

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Units</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Unit System Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>UNIT SYSTEM</Text>
        </View>

        <View style={styles.section}>
          <RadioOption
            label="Imperial"
            description="Pounds (lbs), Feet & Inches"
            value="imperial"
            selected={tempUnitSystem === 'imperial'}
            onSelect={handleSelectUnitSystem}
          />
          <View style={styles.divider} />
          <RadioOption
            label="Metric"
            description="Kilograms (kg), Centimeters (cm)"
            value="metric"
            selected={tempUnitSystem === 'metric'}
            onSelect={handleSelectUnitSystem}
          />
        </View>
        
        {/* SAVE BUTTON */}
        <TouchableOpacity
          style={{
            backgroundColor: '#3b82f6',
            marginHorizontal: 20,
            marginTop: 24,
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: 'center',
          }}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
            Save Settings
          </Text>
        </TouchableOpacity>

        {/* Information Note */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>About Unit Conversion</Text>
          <Text style={styles.infoText}>
            • Changing units will convert your existing data for display
          </Text>
          <Text style={styles.infoText}>
            • Original values are preserved in the database
          </Text>
          <Text style={styles.infoText}>
            • All new entries will use the selected unit system
          </Text>
        </View>

        {/* Preview Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>PREVIEW</Text>
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Example Conversions</Text>

          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Weight:</Text>
            <View style={styles.previewValueContainer}>
              {tempUnitSystem === 'imperial' ? (
                <>
                  <Text style={styles.previewValue}>
                    {formatWeight(exampleWeight, 'lbs', 1)}
                  </Text>
                  <Text style={styles.previewSecondary}>
                    ≈ {formatWeight(lbsToKg(exampleWeight), 'kg', 1)}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.previewValue}>
                    {formatWeight(lbsToKg(exampleWeight), 'kg', 1)}
                  </Text>
                  <Text style={styles.previewSecondary}>
                    ≈ {formatWeight(exampleWeight, 'lbs', 1)}
                  </Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.previewDivider} />

          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Height:</Text>
            <View style={styles.previewValueContainer}>
              {tempUnitSystem === 'imperial' ? (
                <>
                  <Text style={styles.previewValue}>
                    {formatHeight(exampleHeight, 'imperial')}
                  </Text>
                  <Text style={styles.previewSecondary}>
                    ≈ {formatHeight(exampleHeight, 'metric')}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.previewValue}>
                    {formatHeight(exampleHeight, 'metric')}
                  </Text>
                  <Text style={styles.previewSecondary}>
                    ≈ {formatHeight(exampleHeight, 'imperial')}
                  </Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.previewDivider} />

          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Measurements:</Text>
            <View style={styles.previewValueContainer}>
              {tempUnitSystem === 'imperial' ? (
                <>
                  <Text style={styles.previewValue}>
                    {formatMeasurement(cmToInches(exampleMeasurement), 'in', 1)}
                  </Text>
                  <Text style={styles.previewSecondary}>
                    ≈ {formatMeasurement(exampleMeasurement, 'cm', 1)}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.previewValue}>
                    {formatMeasurement(exampleMeasurement, 'cm', 1)}
                  </Text>
                  <Text style={styles.previewSecondary}>
                    ≈ {formatMeasurement(cmToInches(exampleMeasurement), 'in', 1)}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* What Changes Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>WHAT CHANGES</Text>
        </View>

        <View style={styles.changesCard}>
          <View style={styles.changeRow}>
            <View style={styles.changeDot} />
            <Text style={styles.changeText}>Weight tracking (body weight log)</Text>
          </View>
          <View style={styles.changeRow}>
            <View style={styles.changeDot} />
            <Text style={styles.changeText}>Workout set weights</Text>
          </View>
          <View style={styles.changeRow}>
            <View style={styles.changeDot} />
            <Text style={styles.changeText}>Body measurements</Text>
          </View>
          <View style={styles.changeRow}>
            <View style={styles.changeDot} />
            <Text style={styles.changeText}>Height display</Text>
          </View>
          <View style={styles.changeRow}>
            <View style={styles.changeDot} />
            <Text style={styles.changeText}>Default barbell weight</Text>
          </View>
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

  // Custom Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: '#f1f5f9',
  },

  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  saveButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },

  scrollView: {
    flex: 1,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    marginRight: 16,
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
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 72,
  },
  radioOptionSelected: {
    backgroundColor: '#1e3a5f',
  },
  radioOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioCircleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
  },
  radioTextContainer: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  radioDescription: {
    fontSize: 14,
    color: '#94a3b8',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginLeft: 52,
  },
  infoCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 6,
  },
  previewCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 16,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94a3b8',
    flex: 1,
  },
  previewValueContainer: {
    flex: 2,
    alignItems: 'flex-end',
  },
  previewValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  previewSecondary: {
    fontSize: 14,
    color: '#64748b',
  },
  previewDivider: {
    height: 1,
    backgroundColor: '#334155',
  },
  changesCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  changeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
    marginRight: 12,
  },
  changeText: {
    fontSize: 14,
    color: '#94a3b8',
    flex: 1,
  },
  bottomSpacer: {
    height: 32,
  },
});

