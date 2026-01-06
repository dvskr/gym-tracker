import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { CheckCircle, Loader } from 'lucide-react-native';

interface RestoreProgressModalProps {
  visible: boolean;
  progress: {
    current: string;
    completed: string[];
    total: number;
    currentCount: number;
    currentTotal: number;
  };
}

export function RestoreProgressModal({ visible, progress }: RestoreProgressModalProps) {
  const percentage = progress.total > 0 
    ? Math.round((progress.completed.length / progress.total) * 100) 
    : 0;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.title}>Restoring Backup</Text>
            <Text style={styles.subtitle}>Please wait, this may take a moment...</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${percentage}%` }]} />
          </View>
          <Text style={styles.percentageText}>{percentage}%</Text>

          {/* Current Task */}
          {progress.current && (
            <View style={styles.currentTask}>
              <Loader size={16} color="#3b82f6" />
              <Text style={styles.currentTaskText}>
                {progress.current}
                {progress.currentTotal > 0 && ` (${progress.currentCount}/${progress.currentTotal})`}
              </Text>
            </View>
          )}

          {/* Completed Tasks */}
          <View style={styles.completedList}>
            {progress.completed.map((task, index) => (
              <View key={index} style={styles.completedItem}>
                <CheckCircle size={16} color="#22c55e" />
                <Text style={styles.completedText}>{task}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3b82f6',
    textAlign: 'center',
    marginBottom: 24,
  },
  currentTask: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    marginBottom: 16,
  },
  currentTaskText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#f1f5f9',
  },
  completedList: {
    gap: 8,
  },
  completedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  completedText: {
    fontSize: 14,
    color: '#64748b',
  },
});



