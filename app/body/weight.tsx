import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Edit3,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Scale,
  Trash2,
} from 'lucide-react-native';
import { format, isToday, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/stores/authStore';
import {
  logWeight,
  getRecentWeights,
  getTodayWeight,
  updateWeight,
  deleteWeight,
  WeightEntry,
  WeightEntryWithChange,
} from '@/lib/api/bodyWeight';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { AuthPromptModal } from '@/components/modals/AuthPromptModal';
import { useUnits } from '@/hooks/useUnits';
import { getCurrentTab } from '@/lib/navigation/navigationState';

// ============================================
// Types
// ============================================

type WeightUnit = 'lbs' | 'kg';

// ============================================
// Weight Entry Row Component
// ============================================

interface WeightEntryRowProps {
  entry: WeightEntryWithChange;
  onPress: () => void;
}

const WeightEntryRow: React.FC<WeightEntryRowProps> = ({ entry, onPress }) => {
  const date = parseISO(entry.logged_at);
  const dateText = isToday(date) ? 'Today' : format(date, 'EEE, MMM d');

  const getChangeIcon = () => {
    if (entry.change === undefined || entry.change === 0) {
      return <Minus size={16} color="#64748b" />;
    }
    if (entry.change > 0) {
      return <TrendingUp size={16} color="#22c55e" />;
    }
    return <TrendingDown size={16} color="#ef4444" />;
  };

  const getChangeColor = () => {
    if (entry.change === undefined || entry.change === 0) return '#64748b';
    return entry.change > 0 ? '#22c55e' : '#ef4444';
  };

  const getChangeText = () => {
    if (entry.change === undefined) return '';
    if (entry.change === 0) return '';
    const sign = entry.change > 0 ? '+' : '';
    return `${sign}${entry.change}`;
  };

  return (
    <TouchableOpacity
      style={styles.entryRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.entryDate}>
        <Text style={styles.entryDateText}>{dateText}</Text>
      </View>

      <View style={styles.entryWeight}>
        <Text style={styles.entryWeightText}>
          {entry.weight} {entry.weight_unit}
        </Text>
      </View>

      <View style={styles.entryChange}>
        {getChangeIcon()}
        <Text style={[styles.entryChangeText, { color: getChangeColor() }]}>
          {getChangeText()}
        </Text>
      </View>

      <ChevronRight size={18} color="#475569" />
    </TouchableOpacity>
  );
};

// ============================================
// Log Weight Modal Component
// ============================================

interface LogWeightModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (weight: number, unit: WeightUnit, notes?: string) => void;
  initialWeight?: number;
  initialUnit?: WeightUnit;
  initialNotes?: string;
  isEditing?: boolean;
  onDelete?: () => void;
}

const LogWeightModal: React.FC<LogWeightModalProps> = ({
  visible,
  onClose,
  onSave,
  initialWeight = 150,
  initialUnit = 'lbs',
  initialNotes = '',
  isEditing = false,
  onDelete,
}) => {
  const [weight, setWeight] = useState(initialWeight.toString());
  const [unit, setUnit] = useState<WeightUnit>(initialUnit);
  const [notes, setNotes] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setWeight(initialWeight.toString());
      setUnit(initialUnit);
      setNotes(initialNotes);
    }
  }, [visible, initialWeight, initialUnit, initialNotes]);

  const adjustWeight = (amount: number) => {
    Haptics.selectionAsync();
    const current = parseFloat(weight) || 0;
    const newWeight = Math.max(0, current + amount);
    setWeight(newWeight.toFixed(1));
  };

  const handleSave = async () => {
    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(weightValue, unit, notes || undefined);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
 logger.error('Error saving weight:', error);
      Alert.alert('Error', 'Failed to save weight');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this weight entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onDelete?.();
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {isEditing ? 'Edit Weight' : 'Log Weight'}
            </Text>
            {isEditing && onDelete ? (
              <TouchableOpacity onPress={handleDelete}>
                <Trash2 size={20} color="#ef4444" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 50 }} />
            )}
          </View>

          {/* Weight Input */}
          <View style={styles.weightInputSection}>
            <View style={styles.weightDisplay}>
              <TextInput
                style={styles.weightInput}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                selectTextOnFocus={true}
              />
              <Text style={styles.weightUnitLabel}>{unit}</Text>
            </View>

            {/* Adjustment Buttons */}
            <View style={styles.adjustmentRow}>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => adjustWeight(-1)}
              >
                <Text style={styles.adjustButtonText}>-1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => adjustWeight(-0.1)}
              >
                <Text style={styles.adjustButtonText}>-0.1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => adjustWeight(0.1)}
              >
                <Text style={styles.adjustButtonText}>+0.1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => adjustWeight(1)}
              >
                <Text style={styles.adjustButtonText}>+1</Text>
              </TouchableOpacity>
            </View>

            {/* Unit Toggle */}
            <View style={styles.unitToggle}>
              <TouchableOpacity
                style={[styles.unitButton, unit === 'lbs' && styles.unitButtonActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setUnit('lbs');
                }}
              >
                <Text style={[styles.unitButtonText, unit === 'lbs' && styles.unitButtonTextActive]}>
                  lbs
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitButton, unit === 'kg' && styles.unitButtonActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setUnit('kg');
                }}
              >
                <Text style={[styles.unitButtonText, unit === 'kg' && styles.unitButtonTextActive]}>
                  kg
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notes */}
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="How are you feeling?"
              placeholderTextColor="#64748b"
              multiline={true}
              numberOfLines={2}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Update' : 'Save'}
              </Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ============================================
// Main Screen Component
// ============================================

export default function BodyWeightScreen() {
  const { user } = useAuthStore();
  const { weightUnit } = useUnits();
  
  // Auth guard
  const { requireAuth, showAuthModal, authMessage, closeAuthModal } = useAuthGuard();

  const [todayEntry, setTodayEntry] = useState<WeightEntry | null>(null);
  const [recentEntries, setRecentEntries] = useState<WeightEntryWithChange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const [today, recent] = await Promise.all([
        getTodayWeight(user.id),
        getRecentWeights(user.id, 7),
      ]);

      setTodayEntry(today);
      setRecentEntries(recent);
    } catch (error) {
 logger.error('Error fetching weight data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleLogWeight = async (weight: number, unit: WeightUnit, notes?: string) => {
    if (!user?.id) return;

    await logWeight(user.id, weight, unit, notes);
    fetchData();
  };

  const handleUpdateWeight = async (weight: number, unit: WeightUnit, notes?: string) => {
    if (!editingEntry?.id) return;

    await updateWeight(editingEntry.id, weight, notes);
    setEditingEntry(null);
    fetchData();
  };

  const handleDeleteWeight = async () => {
    if (!editingEntry?.id) return;

    await deleteWeight(editingEntry.id);
    setEditingEntry(null);
    fetchData();
  };

  const handleEntryPress = (entry: WeightEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingEntry(entry);
  };

  const handleLogPress = () => {
    requireAuth(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (todayEntry) {
      setEditingEntry(todayEntry);
    } else {
      setShowLogModal(true);
    }
    }, 'Sign in to log your weight and track your progress.');
  };

  // Get latest weight for initial value
  const getInitialWeight = (): number => {
    if (editingEntry) return editingEntry.weight;
    if (todayEntry) return todayEntry.weight;
    if (recentEntries.length > 0) return recentEntries[0].weight;
    return 150;
  };

  const getInitialUnit = (): WeightUnit => {
    if (editingEntry) return editingEntry.weight_unit;
    if (todayEntry) return todayEntry.weight_unit;
    if (recentEntries.length > 0) return recentEntries[0].weight_unit;
    return weightUnit; // Use user's preferred unit
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
        <TouchableOpacity style={styles.backButton} onPress={() => router.push(getCurrentTab() || '/(tabs)')}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Body Weight</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
      >
        {/* Today's Weight Card */}
        <View style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <Scale size={24} color="#3b82f6" />
            <Text style={styles.todayLabel}>Today's Weight</Text>
          </View>

          {todayEntry ? (
            <View style={styles.todayContent}>
              <Text style={styles.todayWeight}>{todayEntry.weight}</Text>
              <Text style={styles.todayUnit}>{todayEntry.weight_unit}</Text>
            </View>
          ) : (
            <View style={styles.todayContent}>
              <Text style={styles.noWeightText}>Not logged yet</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.logButton, todayEntry && styles.editButton]}
            onPress={handleLogPress}
          >
            {todayEntry ? (
              <>
                <Edit3 size={18} color="#ffffff" />
                <Text style={styles.logButtonText}>Edit</Text>
              </>
            ) : (
              <>
                <Plus size={18} color="#ffffff" />
                <Text style={styles.logButtonText}>Log Weight</Text>
              </>
            )}
          </TouchableOpacity>

          {todayEntry?.notes && (
            <Text style={styles.todayNotes}>{todayEntry.notes}</Text>
          )}
        </View>

        {/* Recent Entries Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>LAST 7 DAYS</Text>
          </View>

          {recentEntries.length > 0 ? (
            <View style={styles.entriesList}>
              {recentEntries.map((entry) => (
                <WeightEntryRow
                  key={entry.id}
                  entry={entry}
                  onPress={() => handleEntryPress(entry)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Scale size={40} color="#475569" />
              <Text style={styles.emptyTitle}>No entries yet</Text>
              <Text style={styles.emptySubtitle}>
                Start tracking your weight to see your progress
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Log Weight Modal */}
      <LogWeightModal
        visible={showLogModal}
        onClose={() => setShowLogModal(false)}
        onSave={handleLogWeight}
        initialWeight={getInitialWeight()}
        initialUnit={getInitialUnit()}
      />

      {/* Edit Weight Modal */}
      <LogWeightModal
        visible={editingEntry !== null}
        onClose={() => setEditingEntry(null)}
        onSave={handleUpdateWeight}
        initialWeight={editingEntry?.weight || getInitialWeight()}
        initialUnit={editingEntry?.weight_unit || getInitialUnit()}
        initialNotes={editingEntry?.notes || ''}
        isEditing
        onDelete={handleDeleteWeight}
      />
      
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

  // Scroll
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
  },

  bottomSpacer: {
    height: 40,
  },

  // Today's Card
  todayCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },

  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },

  todayLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#94a3b8',
  },

  todayContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 20,
  },

  todayWeight: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  todayUnit: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#64748b',
    marginLeft: 8,
  },

  noWeightText: {
    fontSize: 18,
    color: '#64748b',
    fontStyle: 'italic',
  },

  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },

  editButton: {
    backgroundColor: '#334155',
  },

  logButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  todayNotes: {
    marginTop: 16,
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Section
  section: {
    marginBottom: 20,
  },

  sectionHeader: {
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 1,
  },

  // Entries List
  entriesList: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
  },

  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  entryDate: {
    flex: 1,
  },

  entryDateText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: 'bold',
  },

  entryWeight: {
    marginRight: 16,
  },

  entryWeightText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },

  entryChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 50,
    marginRight: 8,
  },

  entryChangeText: {
    fontSize: 13,
    fontWeight: 'bold',
  },

  // Empty State
  emptyState: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginTop: 12,
  },

  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  modalCancel: {
    fontSize: 16,
    color: '#94a3b8',
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Weight Input Section
  weightInputSection: {
    padding: 24,
    alignItems: 'center',
  },

  weightDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },

  weightInput: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    minWidth: 180,
  },

  weightUnitLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#64748b',
    marginLeft: 8,
  },

  // Adjustment Buttons
  adjustmentRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },

  adjustButton: {
    backgroundColor: '#334155',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },

  adjustButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },

  // Unit Toggle
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 4,
  },

  unitButton: {
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 8,
  },

  unitButtonActive: {
    backgroundColor: '#3b82f6',
  },

  unitButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#64748b',
  },

  unitButtonTextActive: {
    color: '#ffffff',
  },

  // Notes Section
  notesSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },

  notesLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 8,
  },

  notesInput: {
    backgroundColor: '#334155',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#ffffff',
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // Save Button
  saveButton: {
    backgroundColor: '#3b82f6',
    marginHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
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

