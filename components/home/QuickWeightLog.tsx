import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Scale, Minus, Plus, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { getTodayWeight, logWeight, getLatestWeight } from '@/lib/api/bodyWeight';

interface QuickWeightLogProps {
  userId: string;
  onWeightLogged?: () => void;
}

export const QuickWeightLog: React.FC<QuickWeightLogProps> = ({
  userId,
  onWeightLogged,
}) => {
  const [weight, setWeight] = useState<string>('');
  const [todayWeight, setTodayWeight] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch today's weight or last weight
  const fetchWeight = useCallback(async () => {
    try {
      const today = await getTodayWeight(userId);
      if (today) {
        setTodayWeight(today.weight);
        setWeight(today.weight.toString());
      } else {
        // Get last logged weight as default
        const latest = await getLatestWeight(userId);
        if (latest) {
          setWeight(latest.weight.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching weight:', error);
    }
  }, [userId]);

  useEffect(() => {
    fetchWeight();
  }, [fetchWeight]);

  // Increment/decrement weight
  const adjustWeight = (delta: number) => {
    Haptics.selectionAsync();
    const current = parseFloat(weight) || 0;
    const newWeight = Math.max(0, current + delta);
    setWeight(newWeight.toFixed(1));
  };

  // Save weight
  const handleSave = async () => {
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) return;

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await logWeight(userId, weightNum);
      setTodayWeight(weightNum);
      setShowSuccess(true);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setTimeout(() => setShowSuccess(false), 2000);
      onWeightLogged?.();
    } catch (error) {
      console.error('Error logging weight:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanged = todayWeight !== null && parseFloat(weight) !== todayWeight;
  const isNewLog = todayWeight === null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Scale size={18} color="#3b82f6" />
        <Text style={styles.title}>Quick Weight Log</Text>
        {todayWeight !== null && (
          <View style={styles.loggedBadge}>
            <Check size={12} color="#22c55e" />
            <Text style={styles.loggedText}>Today</Text>
          </View>
        )}
      </View>

      <View style={styles.inputRow}>
        {/* Decrement Button */}
        <TouchableOpacity
          style={styles.adjustButton}
          onPress={() => adjustWeight(-0.5)}
          activeOpacity={0.7}
        >
          <Minus size={18} color="#ffffff" />
        </TouchableOpacity>

        {/* Weight Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder="0.0"
            placeholderTextColor="#475569"
            selectTextOnFocus={true}
          />
          <Text style={styles.unit}>lbs</Text>
        </View>

        {/* Increment Button */}
        <TouchableOpacity
          style={styles.adjustButton}
          onPress={() => adjustWeight(0.5)}
          activeOpacity={0.7}
        >
          <Plus size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[
          styles.saveButton,
          showSuccess && styles.saveButtonSuccess,
          isSaving && styles.saveButtonDisabled,
        ]}
        onPress={handleSave}
        disabled={isSaving}
        activeOpacity={0.8}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : showSuccess ? (
          <>
            <Check size={18} color="#ffffff" />
            <Text style={styles.saveButtonText}>Saved!</Text>
          </>
        ) : (
          <Text style={styles.saveButtonText}>
            {isNewLog ? 'Log Weight' : hasChanged ? 'Update' : 'Log Weight'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },

  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  loggedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14532d',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },

  loggedText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#22c55e',
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },

  adjustButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },

  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },

  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },

  unit: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 4,
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },

  saveButtonSuccess: {
    backgroundColor: '#22c55e',
  },

  saveButtonDisabled: {
    opacity: 0.7,
  },

  saveButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});

export default QuickWeightLog;

