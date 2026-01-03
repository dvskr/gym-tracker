import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, Plus, X } from 'lucide-react-native';
import { useSettingsStore } from '../../stores/settingsStore';
import { SettingsHeader } from '../../components/SettingsHeader';
import { getCurrentTab } from '@/lib/navigation/navigationState';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';

interface PlateItemProps {
  weight: number;
  unit: string;
  selected: boolean;
  onToggle: () => void;
}

const PlateItem: React.FC<PlateItemProps> = ({ weight, unit, selected, onToggle }) => {
  return (
    <TouchableOpacity
      style={[styles.plateItem, selected && styles.plateItemSelected]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.plateItemLeft}>
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected && <Check size={16} color="#ffffff" />}
        </View>
        <Text style={styles.plateWeight}>
          {weight} {unit}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const STANDARD_PLATES_LBS = [45, 35, 25, 10, 5, 2.5];
const METRIC_PLATES_KG = [20, 15, 10, 5, 2.5, 1.25];

export default function PlatesSettingsScreen() {
  useBackNavigation(); // Enable Android back gesture support

  const router = useRouter();
  const { unitSystem, setDefaultPlates } = useSettingsStore();

  const isMetric = unitSystem === 'metric';
  const defaultPlates = isMetric ? METRIC_PLATES_KG : STANDARD_PLATES_LBS;
  const unit = isMetric ? 'kg' : 'lbs';

  const [selectedPlates, setSelectedPlates] = useState<number[]>(defaultPlates);
  const [customPlates, setCustomPlates] = useState<number[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customPlateInput, setCustomPlateInput] = useState('');

  const handleTogglePlate = (weight: number) => {
    setSelectedPlates((prev) =>
      prev.includes(weight)
        ? prev.filter((w) => w !== weight)
        : [...prev, weight].sort((a, b) => b - a)
    );
  };

  const handleAddCustomPlate = () => {
    const weight = parseFloat(customPlateInput);
    if (isNaN(weight) || weight <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid positive number');
      return;
    }
    if (selectedPlates.includes(weight) || customPlates.includes(weight)) {
      Alert.alert('Duplicate', 'This plate weight already exists');
      return;
    }
    setCustomPlates((prev) => [...prev, weight].sort((a, b) => b - a));
    setSelectedPlates((prev) => [...prev, weight].sort((a, b) => b - a));
    setCustomPlateInput('');
    setShowCustomInput(false);
  };

  const handleRemoveCustomPlate = (weight: number) => {
    setCustomPlates((prev) => prev.filter((w) => w !== weight));
    setSelectedPlates((prev) => prev.filter((w) => w !== weight));
  };

  const handleSave = () => {
    if (selectedPlates.length === 0) {
      Alert.alert('No Plates Selected', 'Please select at least one plate');
      return;
    }
    
    // Save to settings store
    const plateConfig = {
      standard: selectedPlates,
      custom: customPlates,
    };
    
    setDefaultPlates(customPlates.length > 0 ? 'custom' : 'standard');
    Alert.alert('Success', 'Plate configuration saved', [
      { text: 'OK', onPress: () => router.push(getCurrentTab() || '/(tabs)') },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SettingsHeader title="Available Plates" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>About Plate Selection</Text>
          <Text style={styles.infoText}>
            Select the plates you have available. This helps the plate calculator show accurate
            breakdowns for your weights.
          </Text>
        </View>

        {/* Standard Plates */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isMetric ? 'METRIC PLATES' : 'STANDARD PLATES'}
          </Text>
        </View>

        <View style={styles.section}>
          {defaultPlates.map((weight, index) => (
            <View key={weight}>
              <PlateItem
                weight={weight}
                unit={unit}
                selected={selectedPlates.includes(weight)}
                onToggle={() => handleTogglePlate(weight)}
              />
              {index < defaultPlates.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Custom Plates */}
        {customPlates.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>CUSTOM PLATES</Text>
            </View>

            <View style={styles.section}>
              {customPlates.map((weight, index) => (
                <View key={`custom-${weight}`}>
                  <View style={styles.customPlateItem}>
                    <View style={styles.plateItemLeft}>
                      <View style={styles.checkboxSelected}>
                        <Check size={16} color="#ffffff" />
                      </View>
                      <Text style={styles.plateWeight}>
                        {weight} {unit}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveCustomPlate(weight)}
                      style={styles.removeButton}
                    >
                      <X size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                  {index < customPlates.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Add Custom Plate */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ADD CUSTOM PLATE</Text>
        </View>

        {showCustomInput ? (
          <View style={styles.customInputContainer}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.customInput}
                value={customPlateInput}
                onChangeText={setCustomPlateInput}
                placeholder={`Enter weight (${unit})`}
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
                autoFocus
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddCustomPlate}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowCustomInput(false);
                  setCustomPlateInput('');
                }}
              >
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addCustomButton}
            onPress={() => setShowCustomInput(true)}
          >
            <Plus size={20} color="#3b82f6" />
            <Text style={styles.addCustomButtonText}>Add Custom Plate Weight</Text>
          </TouchableOpacity>
        )}

        {/* Preview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SELECTED PLATES</Text>
        </View>

        <View style={styles.previewCard}>
          {selectedPlates.length > 0 ? (
            <View style={styles.previewPlates}>
              {selectedPlates.map((weight) => (
                <View key={weight} style={styles.previewPlate}>
                  <Text style={styles.previewPlateText}>
                    {weight} {unit}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.previewEmptyText}>No plates selected</Text>
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
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    marginRight: 16,
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
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
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
  plateItem: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  plateItemSelected: {
    backgroundColor: '#1e3a5f',
  },
  plateItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxSelected: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  plateWeight: {
    fontSize: 16,
    fontWeight: '500',
    color: '#f1f5f9',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginLeft: 52,
  },
  customPlateItem: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  removeButton: {
    padding: 4,
  },
  customInputContainer: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#334155',
  },
  addButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  cancelButton: {
    padding: 12,
  },
  addCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  addCustomButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginLeft: 8,
  },
  previewCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  previewPlates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewPlate: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
  },
  previewPlateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  previewEmptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 32,
  },
});

