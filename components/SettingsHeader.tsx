import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { getCurrentTab } from '@/lib/navigation/navigationState';

interface SettingsHeaderProps {
  title: string;
  onBack?: () => void;
  rightButton?: React.ReactNode;
}

export function SettingsHeader({ title, onBack, rightButton }: SettingsHeaderProps) {
  const router = useRouter();
  const params = useLocalSearchParams();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      const returnPath = (params.returnTo as string) || getCurrentTab();
      router.push(returnPath);
    }
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <ArrowLeft size={24} color="#ffffff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.rightContainer}>
        {rightButton || <View style={styles.placeholder} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: '#f1f5f9',
  },

  rightContainer: {
    width: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  placeholder: {
    width: 44,
  },
});

