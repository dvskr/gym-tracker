import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { selectionHaptic } from '@/lib/utils/haptics';
import { useSettingsStore } from '@/stores/settingsStore';

// ============================================
// Types
// ============================================

interface PlateCalculatorProps {
  targetWeight: number;
  barWeight?: number;
  unit?: 'lbs' | 'kg';
  isVisible: boolean;
  onClose: () => void;
  onBarWeightChange?: (weight: number) => void;
}

interface PlateConfig {
  weight: number;
  color: string;
  borderColor: string;
  textColor: string;
  height: number; // Visual height percentage
}

// ============================================
// Constants
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_WIDTH - 80;

const PLATE_CONFIG_LBS: PlateConfig[] = [
  { weight: 45, color: '#dc2626', borderColor: '#b91c1c', textColor: '#ffffff', height: 100 },
  { weight: 35, color: '#eab308', borderColor: '#ca8a04', textColor: '#000000', height: 90 },
  { weight: 25, color: '#22c55e', borderColor: '#16a34a', textColor: '#ffffff', height: 80 },
  { weight: 10, color: '#3b82f6', borderColor: '#2563eb', textColor: '#ffffff', height: 60 },
  { weight: 5, color: '#6b7280', borderColor: '#4b5563', textColor: '#ffffff', height: 45 },
  { weight: 2.5, color: '#e5e7eb', borderColor: '#9ca3af', textColor: '#000000', height: 35 },
];

const PLATE_CONFIG_KG: PlateConfig[] = [
  { weight: 25, color: '#dc2626', borderColor: '#b91c1c', textColor: '#ffffff', height: 100 },
  { weight: 20, color: '#3b82f6', borderColor: '#2563eb', textColor: '#ffffff', height: 95 },
  { weight: 15, color: '#eab308', borderColor: '#ca8a04', textColor: '#000000', height: 85 },
  { weight: 10, color: '#22c55e', borderColor: '#16a34a', textColor: '#ffffff', height: 75 },
  { weight: 5, color: '#e5e7eb', borderColor: '#9ca3af', textColor: '#000000', height: 60 },
  { weight: 2.5, color: '#dc2626', borderColor: '#b91c1c', textColor: '#ffffff', height: 45 },
  { weight: 1.25, color: '#6b7280', borderColor: '#4b5563', textColor: '#ffffff', height: 35 },
];

const BAR_OPTIONS_LBS = [
  { label: 'Olympic Bar', weight: 45, description: 'Standard 7ft bar' },
  { label: "Women's Bar", weight: 35, description: '6.5ft bar' },
  { label: 'EZ Curl Bar', weight: 25, description: 'Curved barbell' },
  { label: 'Trap Bar', weight: 45, description: 'Hex/trap bar' },
  { label: 'Smith Machine', weight: 20, description: 'Guided bar' },
  { label: 'No Bar', weight: 0, description: 'Dumbbells/Cables' },
];

const BAR_OPTIONS_KG = [
  { label: 'Olympic Bar', weight: 20, description: 'Standard 7ft bar' },
  { label: "Women's Bar", weight: 15, description: '6.5ft bar' },
  { label: 'EZ Curl Bar', weight: 10, description: 'Curved barbell' },
  { label: 'Trap Bar', weight: 20, description: 'Hex/trap bar' },
  { label: 'Smith Machine', weight: 10, description: 'Guided bar' },
  { label: 'No Bar', weight: 0, description: 'Dumbbells/Cables' },
];

// ============================================
// Plate Calculation
// ============================================

function calculatePlates(
  targetWeight: number,
  barWeight: number,
  availablePlates: number[]
): { plates: number[]; remaining: number; isExact: boolean } {
  if (targetWeight <= barWeight) {
    return { plates: [], remaining: 0, isExact: targetWeight === barWeight };
  }

  const perSide = (targetWeight - barWeight) / 2;
  const plates: number[] = [];
  let remaining = perSide;

  // Sort plates descending
  const sortedPlates = [...availablePlates].sort((a, b) => b - a);

  for (const plate of sortedPlates) {
    while (remaining >= plate - 0.001) { // Small epsilon for floating point
      plates.push(plate);
      remaining -= plate;
    }
  }

  return {
    plates,
    remaining: Math.round(remaining * 100) / 100,
    isExact: remaining < 0.01,
  };
}

// ============================================
// Component
// ============================================

export function PlateCalculator({
  targetWeight,
  barWeight: initialBarWeight,
  unit = 'lbs',
  isVisible,
  onClose,
  onBarWeightChange,
}: PlateCalculatorProps) {
  // Get settings from store
  const { barbellWeight: settingsBarbellWeight, availablePlates: settingsPlates } = useSettingsStore();
  
  // Use settings barbell weight as default if no initial value provided
  const defaultBarWeight = initialBarWeight ?? settingsBarbellWeight;
  const [selectedBarWeight, setSelectedBarWeight] = useState(defaultBarWeight);
  const [showBarPicker, setShowBarPicker] = useState(false);

  const plateConfig = unit === 'lbs' ? PLATE_CONFIG_LBS : PLATE_CONFIG_KG;
  const barOptions = unit === 'lbs' ? BAR_OPTIONS_LBS : BAR_OPTIONS_KG;
  
  // Use available plates from settings
  const availablePlates = settingsPlates.length > 0 ? settingsPlates : plateConfig.map((p) => p.weight);

  // Update bar weight when settings change or initial changes
  useEffect(() => {
    const newBarWeight = initialBarWeight ?? settingsBarbellWeight;
    setSelectedBarWeight(newBarWeight);
  }, [initialBarWeight, settingsBarbellWeight]);

  // Calculate plates
  const calculation = useMemo(() => {
    return calculatePlates(targetWeight, selectedBarWeight, availablePlates);
  }, [targetWeight, selectedBarWeight, availablePlates]);

  // Get plate config by weight
  const getPlateConfig = (weight: number): PlateConfig => {
    return plateConfig.find((p) => p.weight === weight) || plateConfig[plateConfig.length - 1];
  };

  // Handle bar weight change
  const handleBarWeightSelect = (weight: number) => {
    selectionHaptic();
    setSelectedBarWeight(weight);
    onBarWeightChange?.(weight);
    setShowBarPicker(false);
  };

  // Calculate totals
  const plateWeightPerSide = calculation.plates.reduce((sum, p) => sum + p, 0);
  const totalPlateWeight = plateWeightPerSide * 2;
  const calculatedTotal = selectedBarWeight + totalPlateWeight;

  // Group plates for display
  const plateGroups = calculation.plates.reduce<Record<number, number>>((acc, plate) => {
    acc[plate] = (acc[plate] || 0) + 1;
    return acc;
  }, {});

  const selectedBar = barOptions.find((b) => b.weight === selectedBarWeight);

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Plate Calculator</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Target Weight Display */}
            <View style={styles.targetSection}>
              <Text style={styles.targetLabel}>Target Weight</Text>
              <Text style={styles.targetWeight}>
                {targetWeight} {unit}
              </Text>
            </View>

            {/* Visual Bar Display */}
            <View style={styles.barSection}>
              <View style={styles.barContainer}>
                {/* Left Plates */}
                <View style={styles.plateStack}>
                  {calculation.plates.slice().reverse().map((plate, index) => {
                    const config = getPlateConfig(plate);
                    return (
                      <View
                        key={`left-${index}`}
                        style={[
                          styles.plate,
                          {
                            backgroundColor: config.color,
                            borderColor: config.borderColor,
                            height: config.height * 0.6,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.plateText, { color: config.textColor }]}
                          numberOfLines={1}
                        >
                          {plate}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Bar */}
                <View style={styles.bar}>
                  <View style={styles.barCollar} />
                  <View style={styles.barCenter}>
                    <Text style={styles.barText}>{selectedBarWeight}</Text>
                  </View>
                  <View style={styles.barCollar} />
                </View>

                {/* Right Plates */}
                <View style={styles.plateStack}>
                  {calculation.plates.map((plate, index) => {
                    const config = getPlateConfig(plate);
                    return (
                      <View
                        key={`right-${index}`}
                        style={[
                          styles.plate,
                          {
                            backgroundColor: config.color,
                            borderColor: config.borderColor,
                            height: config.height * 0.6,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.plateText, { color: config.textColor }]}
                          numberOfLines={1}
                        >
                          {plate}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Plate Breakdown */}
            <View style={styles.breakdownSection}>
              <Text style={styles.sectionTitle}>Plate Breakdown</Text>

              {calculation.plates.length > 0 ? (
                <>
                  {/* Each Side */}
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Each side:</Text>
                    <Text style={styles.breakdownValue}>
                      {calculation.plates.join(' + ')} = {plateWeightPerSide} {unit}
                    </Text>
                  </View>

                  {/* Total */}
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Total:</Text>
                    <Text style={styles.breakdownValue}>
                      {selectedBarWeight} (bar) + {totalPlateWeight} = {calculatedTotal} {unit}
                    </Text>
                  </View>

                  {/* Plate Count */}
                  <View style={styles.plateCountSection}>
                    <Text style={styles.plateCountTitle}>Plates needed (per side):</Text>
                    <View style={styles.plateCountGrid}>
                      {Object.entries(plateGroups).map(([weight, count]) => {
                        const config = getPlateConfig(parseFloat(weight));
                        return (
                          <View key={weight} style={styles.plateCountItem}>
                            <View
                              style={[
                                styles.plateCountDot,
                                { backgroundColor: config.color },
                              ]}
                            />
                            <Text style={styles.plateCountText}>
                              {count}× {weight} {unit}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </>
              ) : targetWeight === selectedBarWeight ? (
                <View style={styles.noPlatesMessage}>
                  <Text style={styles.noPlatesText}>
                    Just the bar! No plates needed.
                  </Text>
                </View>
              ) : (
                <View style={styles.noPlatesMessage}>
                  <Text style={styles.noPlatesText}>
                    Target weight is less than bar weight.
                  </Text>
                </View>
              )}

              {/* Warning if not exact */}
              {!calculation.isExact && calculation.remaining > 0 && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                     Cannot make exact weight. {calculation.remaining} {unit} remaining per side.
                  </Text>
                </View>
              )}
            </View>

            {/* Bar Weight Selector */}
            <View style={styles.barSelectorSection}>
              <Text style={styles.sectionTitle}>Bar Type</Text>
              <TouchableOpacity
                style={styles.barSelector}
                onPress={() => setShowBarPicker(!showBarPicker)}
              >
                <View>
                  <Text style={styles.barSelectorText}>
                    {selectedBar?.label || 'Select Bar'}
                  </Text>
                  <Text style={styles.barSelectorSubtext}>
                    {selectedBarWeight} {unit}
                  </Text>
                </View>
                <Text style={styles.barSelectorArrow}>
                  {showBarPicker ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {showBarPicker && (
                <View style={styles.barOptions}>
                  {barOptions.map((option) => (
                    <TouchableOpacity
                      key={option.weight}
                      style={[
                        styles.barOption,
                        selectedBarWeight === option.weight && styles.barOptionSelected,
                      ]}
                      onPress={() => handleBarWeightSelect(option.weight)}
                    >
                      <View style={styles.barOptionInfo}>
                        <Text style={styles.barOptionLabel}>{option.label}</Text>
                        <Text style={styles.barOptionDesc}>
                          {option.weight} {unit} • {option.description}
                        </Text>
                      </View>
                      {selectedBarWeight === option.weight && (
                        <Check size={18} color="#3b82f6" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Plate Legend */}
            <View style={styles.legendSection}>
              <Text style={styles.sectionTitle}>Plate Colors</Text>
              <View style={styles.legendGrid}>
                {plateConfig.map((plate) => (
                  <View key={plate.weight} style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: plate.color, borderColor: plate.borderColor },
                      ]}
                    />
                    <Text style={styles.legendText}>
                      {plate.weight} {unit}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>

          {/* Done Button */}
          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },

  container: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },

  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    padding: 20,
  },

  // Target Weight
  targetSection: {
    alignItems: 'center',
    marginBottom: 24,
  },

  targetLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },

  targetWeight: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: 'bold',
  },

  // Bar Visual
  barSection: {
    marginBottom: 24,
  },

  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  plateStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  plate: {
    width: 14,
    minHeight: 20,
    borderRadius: 3,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  },

  plateText: {
    fontSize: 8,
    fontWeight: 'bold',
    transform: [{ rotate: '-90deg' }],
  },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    marginHorizontal: 2,
  },

  barCollar: {
    width: 8,
    height: 28,
    backgroundColor: '#6b7280',
    borderRadius: 2,
  },

  barCenter: {
    width: 80,
    height: 12,
    backgroundColor: '#9ca3af',
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  barText: {
    color: '#1e293b',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Breakdown
  breakdownSection: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },

  sectionTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  breakdownRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },

  breakdownLabel: {
    color: '#64748b',
    fontSize: 13,
    width: 80,
  },

  breakdownValue: {
    color: '#ffffff',
    fontSize: 13,
    flex: 1,
    fontWeight: 'bold',
  },

  plateCountSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },

  plateCountTitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
  },

  plateCountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  plateCountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },

  plateCountDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },

  plateCountText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  noPlatesMessage: {
    paddingVertical: 8,
  },

  noPlatesText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },

  warningBox: {
    backgroundColor: '#422006',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },

  warningText: {
    color: '#fbbf24',
    fontSize: 12,
  },

  // Bar Selector
  barSelectorSection: {
    marginBottom: 20,
  },

  barSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },

  barSelectorText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },

  barSelectorSubtext: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },

  barSelectorArrow: {
    color: '#64748b',
    fontSize: 12,
  },

  barOptions: {
    marginTop: 8,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },

  barOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  barOptionSelected: {
    backgroundColor: '#1e293b',
  },

  barOptionInfo: {
    flex: 1,
  },

  barOptionLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  barOptionDesc: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },

  // Legend
  legendSection: {
    marginBottom: 20,
  },

  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 6,
  },

  legendText: {
    color: '#94a3b8',
    fontSize: 12,
  },

  // Bottom
  bottomSpacer: {
    height: 20,
  },

  doneButton: {
    backgroundColor: '#3b82f6',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  doneButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
