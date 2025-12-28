import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';

interface MeasurementInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  unit: string;
  previousValue?: number | null;
  placeholder?: string;
  isPercentage?: boolean;
}

export const MeasurementInput: React.FC<MeasurementInputProps> = ({
  label,
  value,
  onChangeText,
  unit,
  previousValue,
  placeholder = '0',
  isPercentage = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  // Calculate change from previous
  const currentNum = parseFloat(value) || 0;
  const hasChange = previousValue !== undefined && previousValue !== null && value !== '';
  const change = hasChange ? Math.round((currentNum - previousValue) * 10) / 10 : 0;

  const getChangeColor = () => {
    if (change === 0) return '#64748b';
    return change > 0 ? '#22c55e' : '#ef4444';
  };

  const getChangeIcon = () => {
    if (change === 0) return <Minus size={12} color="#64748b" />;
    if (change > 0) return <TrendingUp size={12} color="#22c55e" />;
    return <TrendingDown size={12} color="#ef4444" />;
  };

  const formatChange = () => {
    if (change === 0) return '—';
    const sign = change > 0 ? '+' : '';
    return `${sign}${change}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor="#475569"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          selectTextOnFocus={true}
        />
        <Text style={styles.unit}>{isPercentage ? '%' : unit}</Text>
      </View>

      {/* Previous value hint */}
      <View style={styles.hintRow}>
        {previousValue !== undefined && previousValue !== null ? (
          <>
            <Text style={styles.previousText}>
              Last: {previousValue} {isPercentage ? '%' : unit}
            </Text>
            {hasChange && change !== 0 && (
              <View style={styles.changeIndicator}>
                {getChangeIcon()}
                <Text style={[styles.changeText, { color: getChangeColor() }]}>
                  {formatChange()}
                </Text>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.previousText}>No previous</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e2e8f0',
    marginBottom: 8,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    paddingHorizontal: 16,
    height: 52,
  },

  inputContainerFocused: {
    borderColor: '#3b82f6',
  },

  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    padding: 0,
  },

  unit: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748b',
    marginLeft: 8,
  },

  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 12,
  },

  previousText: {
    fontSize: 12,
    color: '#64748b',
  },

  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  changeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default MeasurementInput;

