import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { ArrowLeft, Building2, Home, Minimize2, User, Check } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { successHaptic, lightHaptic } from '@/lib/utils/haptics';

type GymType = 'commercial_gym' | 'home_gym' | 'minimal' | 'bodyweight_only';

const GYM_TYPES: { value: GymType; label: string; description: string; icon: any }[] = [
  { value: 'commercial_gym', label: 'Commercial Gym', description: 'Full equipment access', icon: Building2 },
  { value: 'home_gym', label: 'Home Gym', description: 'Basic home setup', icon: Home },
  { value: 'minimal', label: 'Minimal Equipment', description: 'Dumbbells & bands', icon: Minimize2 },
  { value: 'bodyweight_only', label: 'Bodyweight Only', description: 'No equipment needed', icon: User },
];

const ALL_EQUIPMENT = [
  { id: 'barbell', name: 'Barbell', emoji: '�x�9️' },
  { id: 'dumbbells', name: 'Dumbbells', emoji: '�x�' },
  { id: 'kettlebells', name: 'Kettlebells', emoji: '�a�' },
  { id: 'cables', name: 'Cable Machine', emoji: '�xR' },
  { id: 'machines', name: 'Weight Machines', emoji: '�x�' },
  { id: 'pull_up_bar', name: 'Pull-up Bar', emoji: '�x`' },
  { id: 'dip_bars', name: 'Dip Bars', emoji: '�x}�' },
  { id: 'resistance_bands', name: 'Resistance Bands', emoji: '�x}�' },
  { id: 'bench', name: 'Weight Bench', emoji: '�x:9️' },
  { id: 'squat_rack', name: 'Squat Rack', emoji: '�x�️' },
  { id: 'leg_press', name: 'Leg Press', emoji: '�x��' },
  { id: 'smith_machine', name: 'Smith Machine', emoji: '�a"���' },
  { id: 'ez_bar', name: 'EZ Bar', emoji: '㬰���' },
  { id: 'trap_bar', name: 'Trap Bar', emoji: '⬡' },
];

const EQUIPMENT_PRESETS: Record<GymType, string[]> = {
  commercial_gym: [
    'barbell', 'dumbbells', 'kettlebells', 'cables', 'machines',
    'pull_up_bar', 'dip_bars', 'bench', 'squat_rack', 'leg_press',
    'smith_machine', 'ez_bar', 'trap_bar', 'resistance_bands'
  ],
  home_gym: [
    'barbell', 'dumbbells', 'bench', 'squat_rack', 'pull_up_bar', 'resistance_bands'
  ],
  minimal: [
    'dumbbells', 'resistance_bands', 'pull_up_bar'
  ],
  bodyweight_only: [
    'pull_up_bar', 'dip_bars'
  ],
};

export default function EquipmentSettingsScreen() {
  const { user } = useAuthStore();
  
  const [gymType, setGymType] = useState<GymType>('commercial_gym');
  const [availableEquipment, setAvailableEquipment] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('gym_type, available_equipment')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        if (data.gym_type) setGymType(data.gym_type);
        if (data.available_equipment) setAvailableEquipment(data.available_equipment);
      }
    } catch (error) {
 logger.error('Error loading equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveEquipment = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          gym_type: gymType,
          available_equipment: availableEquipment,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      successHaptic();
      router.back();
    } catch (error) {
 logger.error('Error saving equipment:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleGymTypeChange = (type: GymType) => {
    lightHaptic();
    setGymType(type);
    // Auto-populate equipment based on gym type
    setAvailableEquipment(EQUIPMENT_PRESETS[type]);
  };

  const toggleEquipment = (equipmentId: string) => {
    lightHaptic();
    setAvailableEquipment(prev =>
      prev.includes(equipmentId)
        ? prev.filter(e => e !== equipmentId)
        : [...prev, equipmentId]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#f1f5f9" />
        </Pressable>
        <Text style={styles.headerTitle}>Equipment Setup</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Gym Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gym Type</Text>
          <Text style={styles.sectionDescription}>
            Select your gym setup to auto-populate available equipment
          </Text>

          <View style={styles.gymTypeGrid}>
            {GYM_TYPES.map((type) => {
              const IconComponent = type.icon;
              const isSelected = gymType === type.value;
              
              return (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.gymTypeCard,
                    isSelected && styles.gymTypeCardSelected,
                  ]}
                  onPress={() => handleGymTypeChange(type.value)}
                >
                  <View style={[
                    styles.gymTypeIcon,
                    isSelected && styles.gymTypeIconSelected,
                  ]}>
                    <IconComponent size={24} color={isSelected ? '#3b82f6' : '#64748b'} />
                  </View>
                  <Text style={styles.gymTypeLabel}>{type.label}</Text>
                  <Text style={styles.gymTypeDescription}>{type.description}</Text>
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Check size={14} color="#ffffff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Available Equipment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Equipment</Text>
          <Text style={styles.sectionDescription}>
            Customize your equipment list. Only exercises you can do will be suggested.
          </Text>

          <View style={styles.equipmentGrid}>
            {ALL_EQUIPMENT.map((equipment) => {
              const isSelected = availableEquipment.includes(equipment.id);
              
              return (
                <TouchableOpacity
                  key={equipment.id}
                  style={[
                    styles.equipmentCard,
                    isSelected && styles.equipmentCardSelected,
                  ]}
                  onPress={() => toggleEquipment(equipment.id)}
                >
                  <Text style={styles.equipmentEmoji}>{equipment.emoji}</Text>
                  <Text style={[
                    styles.equipmentName,
                    isSelected && styles.equipmentNameSelected,
                  ]}>
                    {equipment.name}
                  </Text>
                  {isSelected && (
                    <View style={styles.equipmentCheck}>
                      <Check size={16} color="#3b82f6" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            �x� Your workout suggestions will only include exercises that can be performed with your selected equipment.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveEquipment}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Equipment Setup'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
    lineHeight: 20,
  },
  gymTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gymTypeCard: {
    width: '47%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  gymTypeCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a8a',
  },
  gymTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  gymTypeIconSelected: {
    backgroundColor: '#3b82f620',
  },
  gymTypeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  gymTypeDescription: {
    fontSize: 12,
    color: '#94a3b8',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  equipmentCard: {
    width: '47%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
    position: 'relative',
  },
  equipmentCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a8a',
  },
  equipmentEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  equipmentName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
  },
  equipmentNameSelected: {
    color: '#60a5fa',
  },
  equipmentCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  infoBox: {
    margin: 20,
    marginTop: 0,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  infoText: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 40,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
