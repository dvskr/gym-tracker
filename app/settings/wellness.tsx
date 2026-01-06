import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Zap, Activity, Check } from 'lucide-react-native';
import { useCheckinStore, CheckinData } from '@/stores/checkinStore';
import { successHaptic, lightHaptic } from '@/lib/utils/haptics';

const ENERGY_OPTIONS = [
  { value: 1, emoji: '😴', label: 'Low' },
  { value: 2, emoji: '😔', label: 'Tired' },
  { value: 3, emoji: '😊', label: 'OK' },
  { value: 4, emoji: '💪', label: 'Good' },
  { value: 5, emoji: '⚡', label: 'Great' },
];

const SORENESS_OPTIONS = [
  { value: 1, emoji: '✅', label: 'None' },
  { value: 2, emoji: '😐', label: 'Mild' },
  { value: 3, emoji: '😣', label: 'Some' },
  { value: 4, emoji: '😖', label: 'Sore' },
  { value: 5, emoji: '🤕', label: 'Ouch' },
];

export default function WellnessScreen() {
  const router = useRouter();
  const { saveCheckin, fetchTodaysCheckin, loading, todaysCheckin } = useCheckinStore();
  
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [sorenessLevel, setSorenessLevel] = useState<number | null>(null);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);

  useEffect(() => {
    fetchTodaysCheckin();
  }, []);

  useEffect(() => {
    if (todaysCheckin) {
      setHasCheckedInToday(true);
      if (todaysCheckin.energy_level) setEnergyLevel(todaysCheckin.energy_level);
      if (todaysCheckin.soreness_level) setSorenessLevel(todaysCheckin.soreness_level);
    }
  }, [todaysCheckin]);

  const handleSubmit = async () => {
    if (!energyLevel && !sorenessLevel) {
      Alert.alert('Wellness Check-in', 'Please select at least one option');
      return;
    }

    const checkinData: CheckinData = {
      energy_level: energyLevel || undefined,
      soreness_level: sorenessLevel || undefined,
    };

    const success = await saveCheckin(checkinData);
    
    if (success) {
      successHaptic();
      setHasCheckedInToday(true);
      Alert.alert('Saved!', 'Your wellness check-in has been recorded.');
    } else {
      Alert.alert('Error', 'Failed to save check-in. Please try again.');
    }
  };

  const renderCompactOption = (
    option: { value: number; emoji: string; label: string },
    selectedValue: number | null,
    onSelect: (value: number) => void
  ) => {
    const isSelected = selectedValue === option.value;
    
    return (
      <TouchableOpacity
        key={option.value}
        style={[styles.compactOption, isSelected && styles.compactOptionSelected]}
        onPress={() => {
          lightHaptic();
          onSelect(option.value);
        }}
      >
        <Text style={styles.compactEmoji}>{option.emoji}</Text>
        <Text style={[styles.compactLabel, isSelected && styles.compactLabelSelected]}>
          {option.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>How are you feeling?</Text>
        <View style={styles.headerRight}>
          {hasCheckedInToday && <Check size={20} color="#10b981" />}
        </View>
      </View>

      <View style={styles.content}>
        {/* Energy Level */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Zap size={18} color="#fbbf24" />
            <Text style={styles.sectionTitle}>Energy</Text>
          </View>
          <View style={styles.optionsRow}>
            {ENERGY_OPTIONS.map((option) => 
              renderCompactOption(option, energyLevel, setEnergyLevel)
            )}
          </View>
        </View>

        {/* Soreness Level */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Activity size={18} color="#ef4444" />
            <Text style={styles.sectionTitle}>Soreness</Text>
          </View>
          <View style={styles.optionsRow}>
            {SORENESS_OPTIONS.map((option) => 
              renderCompactOption(option, sorenessLevel, setSorenessLevel)
            )}
          </View>
        </View>

        {/* Quick tip */}
        <Text style={styles.tipText}>
          This helps personalize your workout suggestions
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!energyLevel && !sorenessLevel) && styles.saveButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={loading || (!energyLevel && !sorenessLevel)}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : hasCheckedInToday ? 'Update' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  headerRight: {
    width: 32,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  compactOption: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  compactOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a5f',
  },
  compactEmoji: {
    fontSize: 26,
    marginBottom: 4,
  },
  compactLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  compactLabelSelected: {
    color: '#fff',
  },
  tipText: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});


