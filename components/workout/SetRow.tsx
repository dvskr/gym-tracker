import React, { useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Keyboard } from 'react-native';
import { Check, X } from 'lucide-react-native';

interface SetRowProps {
  setNumber: number;
  weight: string;
  reps: string;
  previousWeight?: string;
  previousReps?: string;
  isCompleted: boolean;
  onWeightChange: (value: string) => void;
  onRepsChange: (value: string) => void;
  onComplete: () => void;
  onDelete?: () => void;
}

export function SetRow({
  setNumber,
  weight,
  reps,
  previousWeight,
  previousReps,
  isCompleted,
  onWeightChange,
  onRepsChange,
  onComplete,
  onDelete,
}: SetRowProps) {
  const repsInputRef = useRef<TextInput>(null);
  
  const adjustWeight = (delta: number) => {
    const current = parseFloat(weight) || 0;
    onWeightChange(Math.max(0, current + delta).toString());
  };
  
  const adjustReps = (delta: number) => {
    const current = parseInt(reps) || 0;
    onRepsChange(Math.max(0, current + delta).toString());
  };

  const handleWeightSubmit = () => {
    // Focus reps input when "Next" is pressed
    repsInputRef.current?.focus();
  };

  const handleRepsSubmit = () => {
    // Dismiss keyboard when "Done" is pressed
    Keyboard.dismiss();
  };

  const prevText = previousWeight && previousReps 
    ? `Prev: ${previousWeight}×${previousReps}` 
    : null;

  return (
    <View style={[styles.container, isCompleted && styles.containerCompleted]}>
      {/* Main Row */}
      <View style={styles.mainRow}>
        {/* Delete Button */}
        {onDelete && (
          <Pressable 
            style={styles.deleteBtn} 
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={16} color="#ef4444" />
          </Pressable>
        )}

        <View style={styles.setNumber}>
          <Text style={styles.setNumberText}>{setNumber}</Text>
        </View>

        <TextInput
          style={styles.weightInput}
          value={weight}
          onChangeText={onWeightChange}
          onSubmitEditing={handleWeightSubmit}
          keyboardType="decimal-pad"
          returnKeyType="next"
          placeholder="0"
          placeholderTextColor="#64748b"
          selectTextOnFocus
          blurOnSubmit={false}
        />
        
        <Text style={styles.separator}>×</Text>
        
        <TextInput
          ref={repsInputRef}
          style={styles.repsInput}
          value={reps}
          onChangeText={onRepsChange}
          onSubmitEditing={handleRepsSubmit}
          keyboardType="number-pad"
          returnKeyType="done"
          placeholder="0"
          placeholderTextColor="#64748b"
          selectTextOnFocus
        />

        <Pressable
          style={[styles.checkButton, isCompleted && styles.checkButtonCompleted]}
          onPress={onComplete}
        >
          <Check size={20} color={isCompleted ? '#fff' : '#64748b'} />
        </Pressable>
      </View>

      {/* Adjustment Row */}
      <View style={styles.adjustRow}>
        {prevText && <Text style={styles.prevText}>{prevText}</Text>}
        {!prevText && <View />}
        <View style={styles.adjustButtons}>
          <Pressable style={styles.adjustBtn} onPress={() => adjustWeight(-5)}>
            <Text style={styles.adjustBtnText}>-5</Text>
          </Pressable>
          <Pressable style={styles.adjustBtn} onPress={() => adjustWeight(5)}>
            <Text style={styles.adjustBtnText}>+5</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.adjustBtn} onPress={() => adjustReps(-1)}>
            <Text style={styles.adjustBtnText}>-1</Text>
          </Pressable>
          <Pressable style={styles.adjustBtn} onPress={() => adjustReps(1)}>
            <Text style={styles.adjustBtnText}>+1</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  containerCompleted: {
    backgroundColor: '#14532d',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  weightInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  separator: {
    color: '#64748b',
    fontSize: 18,
    fontWeight: 'bold',
  },
  repsInput: {
    width: 60,
    height: 44,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  checkButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkButtonCompleted: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  prevText: {
    color: '#64748b',
    fontSize: 12,
  },
  adjustButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adjustBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#334155',
    borderRadius: 4,
  },
  adjustBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: '#475569',
    marginHorizontal: 4,
  },
});
