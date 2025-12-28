import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { X } from 'lucide-react-native';
import { selectionHaptic } from '@/lib/utils/haptics';

// ============================================
// Types
// ============================================

interface RPEPickerProps {
  visible: boolean;
  currentValue: number | null;
  onSelect: (rpe: number | null) => void;
  onClose: () => void;
}

// ============================================
// Constants
// ============================================

const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

export const getRPEColor = (rpe: number | null): string => {
  if (rpe === null) return '#64748b';
  if (rpe <= 7) return '#22c55e'; // Green - easy
  if (rpe <= 8.5) return '#eab308'; // Yellow - moderate
  return '#ef4444'; // Red - hard/max
};

export const getRPEBgColor = (rpe: number | null): string => {
  if (rpe === null) return '#1e293b';
  if (rpe <= 7) return '#14532d'; // Green bg
  if (rpe <= 8.5) return '#422006'; // Yellow bg
  return '#450a0a'; // Red bg
};

const getRPELabel = (rpe: number): string => {
  if (rpe <= 6) return 'Very Easy';
  if (rpe <= 7) return 'Easy';
  if (rpe <= 7.5) return 'Moderate';
  if (rpe <= 8) return 'Somewhat Hard';
  if (rpe <= 8.5) return 'Hard';
  if (rpe <= 9) return 'Very Hard';
  if (rpe <= 9.5) return 'Max Effort';
  return 'Absolute Max';
};

// ============================================
// Component
// ============================================

export function RPEPicker({
  visible,
  currentValue,
  onSelect,
  onClose,
}: RPEPickerProps) {
  const handleSelect = (rpe: number) => {
    selectionHaptic();
    onSelect(rpe);
    onClose();
  };

  const handleClear = () => {
    selectionHaptic();
    onSelect(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Rate of Perceived Exertion</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <Text style={styles.subtitle}>
                How hard did that set feel?
              </Text>

              {/* RPE Grid */}
              <View style={styles.grid}>
                {RPE_VALUES.map((rpe) => {
                  const isSelected = currentValue === rpe;
                  const color = getRPEColor(rpe);
                  const bgColor = getRPEBgColor(rpe);

                  return (
                    <TouchableOpacity
                      key={rpe}
                      style={[
                        styles.rpeButton,
                        { backgroundColor: isSelected ? bgColor : '#0f172a' },
                        isSelected && { borderColor: color, borderWidth: 2 },
                      ]}
                      onPress={() => handleSelect(rpe)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.rpeValue, { color: isSelected ? color : '#94a3b8' }]}>
                        {rpe % 1 === 0 ? rpe : rpe.toFixed(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Current Selection Info */}
              {currentValue !== null && (
                <View style={[styles.infoBox, { backgroundColor: getRPEBgColor(currentValue) }]}>
                  <Text style={[styles.infoText, { color: getRPEColor(currentValue) }]}>
                    RPE {currentValue}: {getRPELabel(currentValue)}
                  </Text>
                </View>
              )}

              {/* Clear Button */}
              {currentValue !== null && (
                <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                  <Text style={styles.clearText}>Clear RPE</Text>
                </TouchableOpacity>
              )}

              {/* Scale Guide */}
              <View style={styles.guide}>
                <View style={styles.guideRow}>
                  <View style={[styles.guideDot, { backgroundColor: '#22c55e' }]} />
                  <Text style={styles.guideText}>6-7: Could do many more reps</Text>
                </View>
                <View style={styles.guideRow}>
                  <View style={[styles.guideDot, { backgroundColor: '#eab308' }]} />
                  <Text style={styles.guideText}>8-8.5: 2-3 reps left in tank</Text>
                </View>
                <View style={styles.guideRow}>
                  <View style={[styles.guideDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.guideText}>9-10: 0-1 reps left (failure)</Text>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  container: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  subtitle: {
    color: '#64748b',
    fontSize: 13,
    marginBottom: 16,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 16,
  },

  rpeButton: {
    width: 56,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },

  rpeValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  infoBox: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },

  infoText: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  clearButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 12,
  },

  clearText: {
    color: '#64748b',
    fontSize: 13,
  },

  guide: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },

  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  guideDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },

  guideText: {
    color: '#64748b',
    fontSize: 11,
  },
});

