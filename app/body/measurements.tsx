import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react-native';
import { format, addDays, subDays, isToday, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/stores/authStore';
import { MeasurementInput } from '@/components/body/MeasurementInput';
import {
  saveMeasurements,
  getMeasurements,
  getLatestMeasurements,
  MeasurementData,
  MeasurementEntry,
} from '@/lib/api/measurements';
import { getTodayWeight } from '@/lib/api/bodyWeight';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { AuthPromptModal } from '@/components/modals/AuthPromptModal';
import { useUnits } from '@/hooks/useUnits';

// ============================================
// Types
// ============================================

type MeasurementUnit = 'in' | 'cm';

interface FormData {
  weight: string;
  body_fat_percentage: string;
  chest: string;
  shoulders: string;
  neck: string;
  bicep_left: string;
  bicep_right: string;
  forearm_left: string;
  forearm_right: string;
  waist: string;
  hips: string;
  thigh_left: string;
  thigh_right: string;
  calf_left: string;
  calf_right: string;
  notes: string;
}

const emptyFormData: FormData = {
  weight: '',
  body_fat_percentage: '',
  chest: '',
  shoulders: '',
  neck: '',
  bicep_left: '',
  bicep_right: '',
  forearm_left: '',
  forearm_right: '',
  waist: '',
  hips: '',
  thigh_left: '',
  thigh_right: '',
  calf_left: '',
  calf_right: '',
  notes: '',
};

// ============================================
// Section Header Component
// ============================================

interface SectionHeaderProps {
  title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

// ============================================
// Main Screen Component
// ============================================

export default function MeasurementsScreen() {
  const { user } = useAuthStore();
  const { measurementUnit, weightUnit } = useUnits();
  
  // Auth guard
  const { requireAuth, showAuthModal, authMessage, closeAuthModal } = useAuthGuard();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [previousData, setPreviousData] = useState<MeasurementEntry | null>(null);
  const [unit, setUnit] = useState<MeasurementUnit>(measurementUnit);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExistingEntry, setHasExistingEntry] = useState(false);

  // Sync local unit state with global preference
  useEffect(() => {
    setUnit(measurementUnit);
  }, [measurementUnit]);

  // Get date string for API
  const dateString = format(selectedDate, 'yyyy-MM-dd');
  const displayDate = isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEE, MMM d');

  // Fetch data for selected date
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Fetch measurements for selected date
      const measurements = await getMeasurements(user.id, dateString);
      
      // Fetch latest measurements for previous values
      const latest = await getLatestMeasurements(user.id);
      
      // Only set as previous if it's from a different date
      if (latest && latest.measured_at !== dateString) {
        setPreviousData(latest);
      } else {
        setPreviousData(null);
      }

      if (measurements) {
        // Populate form with existing data
        setFormData({
          weight: measurements.weight?.toString() || '',
          body_fat_percentage: measurements.body_fat_percentage?.toString() || '',
          chest: measurements.chest?.toString() || '',
          shoulders: measurements.shoulders?.toString() || '',
          neck: measurements.neck?.toString() || '',
          bicep_left: measurements.bicep_left?.toString() || '',
          bicep_right: measurements.bicep_right?.toString() || '',
          forearm_left: measurements.forearm_left?.toString() || '',
          forearm_right: measurements.forearm_right?.toString() || '',
          waist: measurements.waist?.toString() || '',
          hips: measurements.hips?.toString() || '',
          thigh_left: measurements.thigh_left?.toString() || '',
          thigh_right: measurements.thigh_right?.toString() || '',
          calf_left: measurements.calf_left?.toString() || '',
          calf_right: measurements.calf_right?.toString() || '',
          notes: measurements.notes || '',
        });
        setUnit(measurements.unit as MeasurementUnit || 'in');
        setHasExistingEntry(true);
      } else {
        // Reset form but try to auto-fill weight from body weight log
        setFormData(emptyFormData);
        setHasExistingEntry(false);

        // Auto-fill today's weight if available
        if (isToday(selectedDate)) {
          const todayWeight = await getTodayWeight(user.id);
          if (todayWeight) {
            setFormData(prev => ({ ...prev, weight: todayWeight.weight.toString() }));
          }
        }
      }
    } catch (error) {
 logger.error('Error fetching measurements:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, dateString, selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update form field
  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Navigate dates
  const goToPreviousDay = () => {
    Haptics.selectionAsync();
    setSelectedDate(prev => subDays(prev, 1));
  };

  const goToNextDay = () => {
    Haptics.selectionAsync();
    const nextDay = addDays(selectedDate, 1);
    if (nextDay <= new Date()) {
      setSelectedDate(nextDay);
    }
  };

  const goToToday = () => {
    Haptics.selectionAsync();
    setSelectedDate(new Date());
  };

  // Save measurements
  const handleSave = async () => {
    // Require auth before saving
    if (!user?.id) {
      requireAuth(() => {}, 'Sign in to save your body measurements.');
      return;
    }

    // Check if any field has data
    const hasData = Object.entries(formData).some(([key, value]) => {
      if (key === 'notes') return false;
      return value !== '';
    });

    if (!hasData) {
      Alert.alert('No Data', 'Please enter at least one measurement');
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const data: MeasurementData = {
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        body_fat_percentage: formData.body_fat_percentage ? parseFloat(formData.body_fat_percentage) : undefined,
        chest: formData.chest ? parseFloat(formData.chest) : undefined,
        shoulders: formData.shoulders ? parseFloat(formData.shoulders) : undefined,
        neck: formData.neck ? parseFloat(formData.neck) : undefined,
        bicep_left: formData.bicep_left ? parseFloat(formData.bicep_left) : undefined,
        bicep_right: formData.bicep_right ? parseFloat(formData.bicep_right) : undefined,
        forearm_left: formData.forearm_left ? parseFloat(formData.forearm_left) : undefined,
        forearm_right: formData.forearm_right ? parseFloat(formData.forearm_right) : undefined,
        waist: formData.waist ? parseFloat(formData.waist) : undefined,
        hips: formData.hips ? parseFloat(formData.hips) : undefined,
        thigh_left: formData.thigh_left ? parseFloat(formData.thigh_left) : undefined,
        thigh_right: formData.thigh_right ? parseFloat(formData.thigh_right) : undefined,
        calf_left: formData.calf_left ? parseFloat(formData.calf_left) : undefined,
        calf_right: formData.calf_right ? parseFloat(formData.calf_right) : undefined,
        notes: formData.notes || undefined,
        unit,
      };

      await saveMeasurements(user.id, dateString, data);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'Measurements saved successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
 logger.error('Error saving measurements:', error);
      Alert.alert('Error', 'Failed to save measurements');
    } finally {
      setIsSaving(false);
    }
  };

  // Get previous value for a field
  const getPreviousValue = (field: keyof FormData): number | null => {
    if (!previousData) return null;
    const value = previousData[field as keyof MeasurementEntry];
    return typeof value === 'number' ? value : null;
  };

  // Toggle unit
  const toggleUnit = () => {
    Haptics.selectionAsync();
    setUnit(prev => prev === 'in' ? 'cm' : 'in');
  };

  // Loading
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Body Measurements</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Date Selector */}
      <View style={styles.dateSelector}>
        <TouchableOpacity style={styles.dateArrow} onPress={goToPreviousDay}>
          <ChevronLeft size={24} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.dateDisplay} onPress={goToToday}>
          <Calendar size={18} color="#3b82f6" />
          <Text style={styles.dateText}>{displayDate}</Text>
          {hasExistingEntry && (
            <View style={styles.existingBadge}>
              <Check size={12} color="#22c55e" />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateArrow}
          onPress={goToNextDay}
          disabled={isToday(selectedDate)}
        >
          <ChevronRight size={24} color={isToday(selectedDate) ? '#334155' : '#94a3b8'} />
        </TouchableOpacity>
      </View>

      {/* Unit Toggle */}
      <View style={styles.unitToggleContainer}>
        <Text style={styles.unitLabel}>Unit:</Text>
        <TouchableOpacity style={styles.unitToggle} onPress={toggleUnit}>
          <View style={[styles.unitOption, unit === 'in' && styles.unitOptionActive]}>
            <Text style={[styles.unitOptionText, unit === 'in' && styles.unitOptionTextActive]}>
              in
            </Text>
          </View>
          <View style={[styles.unitOption, unit === 'cm' && styles.unitOptionActive]}>
            <Text style={[styles.unitOptionText, unit === 'cm' && styles.unitOptionTextActive]}>
              cm
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* General Section */}
          <SectionHeader title="GENERAL" />
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <MeasurementInput
                label="Weight"
                value={formData.weight}
                onChangeText={(v) => updateField('weight', v)}
                unit={weightUnit}
                previousValue={getPreviousValue('weight')}
              />
            </View>
            <View style={styles.halfWidth}>
              <MeasurementInput
                label="Body Fat"
                value={formData.body_fat_percentage}
                onChangeText={(v) => updateField('body_fat_percentage', v)}
                unit="%"
                previousValue={getPreviousValue('body_fat_percentage')}
                isPercentage={true}
              />
            </View>
          </View>

          {/* Upper Body Section */}
          <SectionHeader title="UPPER BODY" />
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <MeasurementInput
                label="Chest"
                value={formData.chest}
                onChangeText={(v) => updateField('chest', v)}
                unit={unit}
                previousValue={getPreviousValue('chest')}
              />
            </View>
            <View style={styles.halfWidth}>
              <MeasurementInput
                label="Shoulders"
                value={formData.shoulders}
                onChangeText={(v) => updateField('shoulders', v)}
                unit={unit}
                previousValue={getPreviousValue('shoulders')}
              />
            </View>
          </View>

          <MeasurementInput
            label="Neck"
            value={formData.neck}
            onChangeText={(v) => updateField('neck', v)}
            unit={unit}
            previousValue={getPreviousValue('neck')}
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <MeasurementInput
                label="Bicep (L)"
                value={formData.bicep_left}
                onChangeText={(v) => updateField('bicep_left', v)}
                unit={unit}
                previousValue={getPreviousValue('bicep_left')}
              />
            </View>
            <View style={styles.halfWidth}>
              <MeasurementInput
                label="Bicep (R)"
                value={formData.bicep_right}
                onChangeText={(v) => updateField('bicep_right', v)}
                unit={unit}
                previousValue={getPreviousValue('bicep_right')}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <MeasurementInput
                label="Forearm (L)"
                value={formData.forearm_left}
                onChangeText={(v) => updateField('forearm_left', v)}
                unit={unit}
                previousValue={getPreviousValue('forearm_left')}
              />
            </View>
            <View style={styles.halfWidth}>
              <MeasurementInput
                label="Forearm (R)"
                value={formData.forearm_right}
                onChangeText={(v) => updateField('forearm_right', v)}
                unit={unit}
                previousValue={getPreviousValue('forearm_right')}
              />
            </View>
          </View>

          {/* Core Section */}
          <SectionHeader title="CORE" />
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <MeasurementInput
                label="Waist"
                value={formData.waist}
                onChangeText={(v) => updateField('waist', v)}
                unit={unit}
                previousValue={getPreviousValue('waist')}
              />
            </View>
            <View style={styles.halfWidth}>
              <MeasurementInput
                label="Hips"
                value={formData.hips}
                onChangeText={(v) => updateField('hips', v)}
                unit={unit}
                previousValue={getPreviousValue('hips')}
              />
            </View>
          </View>

          {/* Lower Body Section */}
          <SectionHeader title="LOWER BODY" />
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <MeasurementInput
                label="Thigh (L)"
                value={formData.thigh_left}
                onChangeText={(v) => updateField('thigh_left', v)}
                unit={unit}
                previousValue={getPreviousValue('thigh_left')}
              />
            </View>
            <View style={styles.halfWidth}>
              <MeasurementInput
                label="Thigh (R)"
                value={formData.thigh_right}
                onChangeText={(v) => updateField('thigh_right', v)}
                unit={unit}
                previousValue={getPreviousValue('thigh_right')}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <MeasurementInput
                label="Calf (L)"
                value={formData.calf_left}
                onChangeText={(v) => updateField('calf_left', v)}
                unit={unit}
                previousValue={getPreviousValue('calf_left')}
              />
            </View>
            <View style={styles.halfWidth}>
              <MeasurementInput
                label="Calf (R)"
                value={formData.calf_right}
                onChangeText={(v) => updateField('calf_right', v)}
                unit={unit}
                previousValue={getPreviousValue('calf_right')}
              />
            </View>
          </View>

          {/* Notes Section */}
          <SectionHeader title="NOTES" />
          <View style={styles.notesContainer}>
            <TextInput
              style={styles.notesInput}
              value={formData.notes}
              onChangeText={(v) => updateField('notes', v)}
              placeholder="Add notes (optional)"
              placeholderTextColor="#475569"
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Bottom spacer for save button */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save Button (sticky bottom) */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Check size={20} color="#ffffff" />
              <Text style={styles.saveButtonText}>
                {hasExistingEntry ? 'Update' : 'Save'} Measurements
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Auth Modal */}
      <AuthPromptModal
        visible={showAuthModal}
        onClose={closeAuthModal}
        message={authMessage}
      />
    </SafeAreaView>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  keyboardAvoid: {
    flex: 1,
  },

  // Header
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
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Date Selector
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
  },

  dateArrow: {
    padding: 8,
  },

  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    borderRadius: 10,
  },

  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  existingBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#14532d',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Unit Toggle
  unitToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },

  unitLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },

  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 4,
  },

  unitOption: {
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 6,
  },

  unitOptionActive: {
    backgroundColor: '#3b82f6',
  },

  unitOptionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748b',
  },

  unitOptionTextActive: {
    color: '#ffffff',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
  },

  bottomSpacer: {
    height: 100,
  },

  // Section
  sectionHeader: {
    marginTop: 8,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 1,
  },

  // Row layout
  row: {
    flexDirection: 'row',
    gap: 12,
  },

  halfWidth: {
    flex: 1,
  },

  // Notes
  notesContainer: {
    marginBottom: 16,
  },

  notesInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    padding: 14,
    fontSize: 16,
    color: '#ffffff',
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // Save Button
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#020617',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
