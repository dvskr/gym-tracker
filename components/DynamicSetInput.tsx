import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

interface DynamicSetInputProps {
  exercise: {
    id: string;
    name: string;
    measurement_type: string;
  };
  set: {
    reps?: number;
    weight?: number;
    duration_seconds?: number;
    distance_meters?: number;
    assistance_weight?: number;
  };
  previousSet?: {
    reps?: number;
    weight?: number;
    duration_seconds?: number;
    distance_meters?: number;
    assistance_weight?: number;
  };
  onUpdate: (updatedSet: {
    weight?: number;
    reps?: number;
    duration_seconds?: number;
    distance_meters?: number;
    assistance_weight?: number;
  }) => void;
}

export const DynamicSetInput: React.FC<DynamicSetInputProps> = ({
  exercise,
  set,
  previousSet,
  onUpdate,
}) => {
  const type = exercise.measurement_type || 'reps_weight';
  
  // Format previous values for display
  const formatPrevious = () => {
    if (!previousSet) return '—';
    
    switch (type) {
      case 'reps_weight':
        return previousSet.weight && previousSet.reps 
          ? `${previousSet.weight} × ${previousSet.reps}`
          : '—';
      
      case 'time':
        return previousSet.duration_seconds 
          ? `${previousSet.duration_seconds}s`
          : '—';
      
      case 'time_distance':
        const time = previousSet.duration_seconds || 0;
        const dist = previousSet.distance_meters || 0;
        return time || dist
          ? `${time}s / ${(dist / 1000).toFixed(2)}km`
          : '—';
      
      case 'time_weight':
        return previousSet.duration_seconds && previousSet.weight
          ? `${previousSet.duration_seconds}s × ${previousSet.weight}`
          : '—';
      
      case 'reps_only':
        return previousSet.reps ? `${previousSet.reps}` : '—';
      
      case 'assisted':
        return previousSet.reps && previousSet.assistance_weight
          ? `${previousSet.reps} @ -${previousSet.assistance_weight}`
          : '—';
      
      default:
        return '—';
    }
  };
  
  return (
    <View style={styles.container}>
      {/* PREVIOUS COLUMN */}
      <View style={styles.previousColumn}>
        <Text style={styles.previousText}>{formatPrevious()}</Text>
      </View>
      
      {/* INPUT COLUMNS - Dynamic based on type */}
      <View style={styles.inputsContainer}>
        
        {/* REPS INPUT */}
        {(type === 'reps_weight' || type === 'reps_only' || type === 'assisted') && (
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={set.reps?.toString() || ''}
              onChangeText={(val) => onUpdate({ ...set, reps: parseInt(val) || undefined })}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#64748b"
            />
          </View>
        )}
        
        {/* WEIGHT INPUT (standard) */}
        {type === 'reps_weight' && (
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={set.weight?.toString() || ''}
              onChangeText={(val) => onUpdate({ ...set, weight: parseFloat(val) || undefined })}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#64748b"
            />
          </View>
        )}
        
        {/* TIME INPUT (duration in seconds) */}
        {(type === 'time' || type === 'time_distance' || type === 'time_weight') && (
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={set.duration_seconds?.toString() || ''}
              onChangeText={(val) => onUpdate({ ...set, duration_seconds: parseInt(val) || undefined })}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#64748b"
            />
          </View>
        )}
        
        {/* DISTANCE INPUT (km) */}
        {type === 'time_distance' && (
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={set.distance_meters ? (set.distance_meters / 1000).toFixed(2) : ''}
              onChangeText={(val) => onUpdate({ 
                ...set, 
                distance_meters: parseFloat(val) * 1000 || undefined 
              })}
              keyboardType="decimal-pad"
              placeholder="0.0"
              placeholderTextColor="#64748b"
            />
          </View>
        )}
        
        {/* WEIGHT INPUT (for carries) */}
        {type === 'time_weight' && (
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={set.weight?.toString() || ''}
              onChangeText={(val) => onUpdate({ ...set, weight: parseFloat(val) || undefined })}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#64748b"
            />
          </View>
        )}
        
        {/* ASSISTANCE INPUT */}
        {type === 'assisted' && (
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={set.assistance_weight?.toString() || ''}
              onChangeText={(val) => onUpdate({ 
                ...set, 
                assistance_weight: parseFloat(val) || undefined 
              })}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#64748b"
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previousColumn: {
    width: 80,
    paddingHorizontal: 8,
  },
  previousText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  inputsContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
  },
  input: {
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    textAlign: 'center',
  },
});


