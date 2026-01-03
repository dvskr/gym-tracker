import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Clock, Volume2, Vibrate, Eye, Calculator, Trophy, ChevronRight } from 'lucide-react-native';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUnits } from '@/hooks/useUnits';
import { SettingsHeader } from '../../components/SettingsHeader';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  value?: string;
  onPress?: () => void;
  disabled?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  label,
  description,
  toggle,
  toggleValue,
  onToggleChange,
  value,
  onPress,
  disabled,
}) => {
  return (
    <TouchableOpacity
      style={[styles.settingRow, disabled && styles.settingRowDisabled]}
      onPress={onPress}
      disabled={disabled || toggle}
      activeOpacity={0.7}
    >
      <View style={styles.settingRowLeft}>
        <View style={styles.iconContainer}>{icon}</View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingLabel, disabled && styles.settingLabelDisabled]}>
            {label}
          </Text>
          {description && <Text style={styles.settingDescription}>{description}</Text>}
        </View>
      </View>
      <View style={styles.settingRowRight}>
        {toggle ? (
          <Switch
            value={toggleValue}
            onValueChange={onToggleChange}
            trackColor={{ false: '#374151', true: '#22c55e' }}
            thumbColor={toggleValue ? '#fff' : '#9ca3af'}
          />
        ) : value ? (
          <>
            <Text style={styles.settingValue}>{value}</Text>
            <ChevronRight size={20} color="#64748b" />
          </>
        ) : onPress ? (
          <ChevronRight size={20} color="#64748b" />
        ) : null}
      </View>
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

interface DurationPickerModalProps {
  visible: boolean;
  currentValue: number;
  onClose: () => void;
  onSelect: (value: number) => void;
}

const DurationPickerModal: React.FC<DurationPickerModalProps> = ({
  visible,
  currentValue,
  onClose,
  onSelect,
}) => {
  const [selectedValue, setSelectedValue] = useState(currentValue);

  const durations = Array.from({ length: 19 }, (_, i) => 30 + i * 15); // 30s to 300s in 15s increments
  const presets = [60, 90, 120, 180];

  const handleConfirm = () => {
    onSelect(selectedValue);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rest Timer Duration</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Presets */}
          <View style={styles.presetsContainer}>
            {presets.map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetButton,
                  selectedValue === preset && styles.presetButtonActive,
                ]}
                onPress={() => setSelectedValue(preset)}
              >
                <Text
                  style={[
                    styles.presetButtonText,
                    selectedValue === preset && styles.presetButtonTextActive,
                  ]}
                >
                  {preset}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Duration List */}
          <ScrollView style={styles.durationList} showsVerticalScrollIndicator={false}>
            {durations.map((duration) => (
              <TouchableOpacity
                key={duration}
                style={[
                  styles.durationItem,
                  selectedValue === duration && styles.durationItemActive,
                ]}
                onPress={() => setSelectedValue(duration)}
              >
                <Text
                  style={[
                    styles.durationItemText,
                    selectedValue === duration && styles.durationItemTextActive,
                  ]}
                >
                  {duration} seconds
                </Text>
                {selectedValue === duration && (
                  <View style={styles.durationCheckmark} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default function WorkoutSettingsScreen() {
  useBackNavigation(); // Enable Android back gesture support

  const router = useRouter();
  const {
    restTimerDefault,
    autoStartTimer,
    hapticEnabled,
    showPreviousWorkout,
    autoFillSets,
    prCelebrations,
    prSound,
    prConfetti,
    setRestTimerDefault,
    setAutoStartTimer,
    setHapticEnabled,
    setShowPreviousWorkout,
    setAutoFillSets,
    setPrCelebrations,
    setPrSound,
    setPrConfetti,
  } = useSettingsStore();

  const [showDurationPicker, setShowDurationPicker] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SettingsHeader title="Workout Settings" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Rest Timer Section */}
        <SectionHeader title="REST TIMER" />
        <View style={styles.section}>
          <SettingRow
            icon={<Clock size={24} color="#3b82f6" />}
            label="Default Duration"
            value={`${restTimerDefault}s`}
            onPress={() => setShowDurationPicker(true)}
          />
          <View style={styles.divider} />
          <SettingRow
            icon={<Clock size={24} color="#3b82f6" />}
            label="Auto-start Timer"
            description="Start timer automatically after completing a set"
            toggle
            toggleValue={autoStartTimer}
            onToggleChange={setAutoStartTimer}
          />
        </View>

        {/* Feedback Section */}
        <SectionHeader title="FEEDBACK" />
        <View style={styles.section}>
          <SettingRow
            icon={<Vibrate size={24} color="#3b82f6" />}
            label="Haptic Feedback"
            description="Vibration feedback for all app interactions"
            toggle
            toggleValue={hapticEnabled}
            onToggleChange={setHapticEnabled}
          />
          <View style={styles.divider} />
          <SettingRow
            icon={<Volume2 size={24} color="#3b82f6" />}
            label="Sound Effects"
            description="Audio feedback for actions"
            toggle
            toggleValue={false}
            onToggleChange={() => {}}
            disabled
          />
        </View>

        {/* Logging Section */}
        <SectionHeader title="LOGGING" />
        <View style={styles.section}>
          <SettingRow
            icon={<Eye size={24} color="#3b82f6" />}
            label="Show Previous Workout"
            description="Display weight/reps from last time"
            toggle
            toggleValue={showPreviousWorkout}
            onToggleChange={setShowPreviousWorkout}
          />
          <View style={styles.divider} />
          <SettingRow
            icon={<Eye size={24} color="#3b82f6" />}
            label="Auto-fill Sets"
            description="Copy previous set values to new sets"
            toggle
            toggleValue={autoFillSets}
            onToggleChange={setAutoFillSets}
          />
        </View>

        {/* PR Celebrations Section */}
        <SectionHeader title="PR CELEBRATIONS" />
        <View style={styles.section}>
          <SettingRow
            icon={<Trophy size={24} color="#3b82f6" />}
            label="Celebrate PRs"
            toggle
            toggleValue={prCelebrations}
            onToggleChange={setPrCelebrations}
          />
          <View style={styles.divider} />
          <SettingRow
            icon={<Volume2 size={24} color="#3b82f6" />}
            label="Sound on PR"
            toggle
            toggleValue={prSound}
            onToggleChange={setPrSound}
            disabled={!prCelebrations}
          />
          <View style={styles.divider} />
          <SettingRow
            icon={<Trophy size={24} color="#3b82f6" />}
            label="Confetti Animation"
            toggle
            toggleValue={prConfetti}
            onToggleChange={setPrConfetti}
            disabled={!prCelebrations}
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Duration Picker Modal */}
      <DurationPickerModal
        visible={showDurationPicker}
        currentValue={restTimerDefault}
        onClose={() => setShowDurationPicker(false)}
        onSelect={setRestTimerDefault}
      />
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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 64,
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#f1f5f9',
    marginBottom: 2,
  },
  settingLabelDisabled: {
    color: '#64748b',
  },
  settingDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginTop: 2,
  },
  settingRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  settingValue: {
    fontSize: 14,
    color: '#94a3b8',
    marginRight: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginLeft: 60,
  },
  bottomSpacer: {
    height: 32,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  modalCancel: {
    fontSize: 16,
    color: '#94a3b8',
  },
  presetsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  presetButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#334155',
    borderRadius: 8,
    alignItems: 'center',
  },
  presetButtonActive: {
    backgroundColor: '#3b82f6',
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  presetButtonTextActive: {
    color: '#ffffff',
  },
  durationList: {
    maxHeight: 300,
  },
  durationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  durationItemActive: {
    backgroundColor: '#1e3a5f',
  },
  durationItemText: {
    fontSize: 16,
    color: '#f1f5f9',
  },
  durationItemTextActive: {
    fontWeight: '600',
    color: '#3b82f6',
  },
  durationCheckmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
  },
  confirmButton: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

