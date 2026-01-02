import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { X, Moon, Zap, Brain, Activity } from 'lucide-react-native';
import { useCheckinStore, CheckinData } from '@/stores/checkinStore';
import { successHaptic, lightHaptic } from '@/lib/utils/haptics';

interface DailyCheckinProps {
  visible: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const SLEEP_EMOJIS = ['😴', '😪', '🥱', '💤', '😌'];
const STRESS_EMOJIS = ['😌', '😐', '😕', '😰', '😱'];
const SORENESS_EMOJIS = ['✅', '😐', '😣', '😖', '🤕'];
const ENERGY_EMOJIS = ['🔋', '😴', '😊', '💪', '⚡'];

export function DailyCheckin({ visible, onClose, onComplete }: DailyCheckinProps) {
  const { saveCheckin, loading } = useCheckinStore();
  
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [sleepHours, setSleepHours] = useState('');
  const [stressLevel, setStressLevel] = useState<number | null>(null);
  const [sorenessLevel, setSorenessLevel] = useState<number | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    // Validate at least one field is filled
    if (!sleepQuality && !sleepHours && !stressLevel && !sorenessLevel && !energyLevel) {
      Alert.alert('Quick Check-in', 'Please fill in at least one field');
      return;
    }

    const checkinData: CheckinData = {
      sleep_quality: sleepQuality || undefined,
      sleep_hours: sleepHours ? parseFloat(sleepHours) : undefined,
      stress_level: stressLevel || undefined,
      soreness_level: sorenessLevel || undefined,
      energy_level: energyLevel || undefined,
      notes: notes.trim() || undefined,
    };

    const success = await saveCheckin(checkinData);
    
    if (success) {
      successHaptic();
      onComplete?.();
      onClose();
    } else {
      Alert.alert('Error', 'Failed to save check-in. Please try again.');
    }
  };

  const handleSkip = () => {
    lightHaptic();
    onClose();
  };

  const renderScale = (
    value: number | null,
    setValue: (val: number) => void,
    emojis: string[],
    labels: string[]
  ) => (
    <View style={styles.scale}>
      {emojis.map((emoji, index) => {
        const scaleValue = index + 1;
        const isSelected = value === scaleValue;
        
        return (
          <TouchableOpacity
            key={index}
            style={[styles.scaleButton, isSelected && styles.scaleButtonSelected]}
            onPress={() => {
              lightHaptic();
              setValue(scaleValue);
            }}
          >
            <Text style={styles.scaleEmoji}>{emoji}</Text>
            <Text style={[styles.scaleLabel, isSelected && styles.scaleLabelSelected]}>
              {labels[index]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Daily Check-in</Text>
          <TouchableOpacity onPress={handleSkip} style={styles.closeButton}>
            <X size={24} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>How are you feeling today?</Text>

          {/* Sleep Quality */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Moon size={20} color="#60a5fa" />
              <Text style={styles.sectionTitle}>Sleep Quality</Text>
            </View>
            {renderScale(
              sleepQuality,
              setSleepQuality,
              SLEEP_EMOJIS,
              ['Poor', 'Bad', 'Okay', 'Good', 'Great']
            )}
          </View>

          {/* Sleep Hours */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hours of Sleep</Text>
            <TextInput
              style={styles.hoursInput}
              value={sleepHours}
              onChangeText={setSleepHours}
              placeholder="7.5"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              maxLength={4}
            />
          </View>

          {/* Energy Level */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Zap size={20} color="#fbbf24" />
              <Text style={styles.sectionTitle}>Energy Level</Text>
            </View>
            {renderScale(
              energyLevel,
              setEnergyLevel,
              ENERGY_EMOJIS,
              ['Dead', 'Tired', 'Okay', 'Good', 'Pumped']
            )}
          </View>

          {/* Stress Level */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Brain size={20} color="#8b5cf6" />
              <Text style={styles.sectionTitle}>Stress Level</Text>
            </View>
            {renderScale(
              stressLevel,
              setStressLevel,
              STRESS_EMOJIS,
              ['Zen', 'Low', 'Okay', 'High', 'Maxed']
            )}
          </View>

          {/* Soreness Level */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Activity size={20} color="#ef4444" />
              <Text style={styles.sectionTitle}>Soreness Level</Text>
            </View>
            {renderScale(
              sorenessLevel,
              setSorenessLevel,
              SORENESS_EMOJIS,
              ['None', 'Mild', 'Okay', 'Sore', 'Hurts']
            )}
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any other feelings or observations..."
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <Pressable
            style={[styles.button, styles.skipButton]}
            onPress={handleSkip}
          >
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </Pressable>
          
          <Pressable
            style={[styles.button, styles.submitButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Saving...' : 'Complete Check-in'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  subtitle: {
    fontSize: 18,
    color: '#cbd5e1',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  scale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  scaleButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  scaleButtonSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a8a',
  },
  scaleEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  scaleLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  scaleLabelSelected: {
    color: '#60a5fa',
  },
  hoursInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  notesInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 80,
  },
  bottomSpacer: {
    height: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    backgroundColor: '#334155',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

