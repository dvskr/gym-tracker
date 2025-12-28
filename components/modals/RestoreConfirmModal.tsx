import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { AlertTriangle, CheckCircle, X } from 'lucide-react-native';
import { BackupData } from '@/lib/backup/backupService';

interface RestoreConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (overwrite: boolean) => void;
  backupData: BackupData | null;
  loading: boolean;
}

export function RestoreConfirmModal({
  visible,
  onClose,
  onConfirm,
  backupData,
  loading,
}: RestoreConfirmModalProps) {
  const [overwriteMode, setOverwriteMode] = React.useState(false);

  if (!backupData) return null;

  const dataCounts = {
    workouts: backupData.workouts?.length || 0,
    templates: backupData.templates?.length || 0,
    weightLog: backupData.bodyWeightLog?.length || 0,
    measurements: backupData.bodyMeasurements?.length || 0,
    personalRecords: backupData.personalRecords?.length || 0,
    customExercises: backupData.customExercises?.length || 0,
  };

  const totalItems = Object.values(dataCounts).reduce((sum, count) => sum + count, 0);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <AlertTriangle size={32} color="#f59e0b" />
              <Text style={styles.title}>Restore Backup?</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose} disabled={loading}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Warning */}
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>
                {overwriteMode
                  ? 'This will replace your current data with the backup data. Any data not in the backup will be lost.'
                  : 'This will merge the backup data with your current data. Duplicate entries will be updated.'}
              </Text>
            </View>

            {/* Backup Info */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Backup Date</Text>
              <Text style={styles.sectionValue}>{formatDate(backupData.createdAt)}</Text>
            </View>

            {/* Data Preview */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Data Included ({totalItems} items)</Text>

              <View style={styles.dataList}>
                {dataCounts.workouts > 0 && (
                  <View style={styles.dataItem}>
                    <CheckCircle size={16} color="#22c55e" />
                    <Text style={styles.dataItemText}>
                      {dataCounts.workouts} workout{dataCounts.workouts !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}

                {dataCounts.templates > 0 && (
                  <View style={styles.dataItem}>
                    <CheckCircle size={16} color="#22c55e" />
                    <Text style={styles.dataItemText}>
                      {dataCounts.templates} template{dataCounts.templates !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}

                {dataCounts.weightLog > 0 && (
                  <View style={styles.dataItem}>
                    <CheckCircle size={16} color="#22c55e" />
                    <Text style={styles.dataItemText}>
                      {dataCounts.weightLog} weight log entr{dataCounts.weightLog !== 1 ? 'ies' : 'y'}
                    </Text>
                  </View>
                )}

                {dataCounts.measurements > 0 && (
                  <View style={styles.dataItem}>
                    <CheckCircle size={16} color="#22c55e" />
                    <Text style={styles.dataItemText}>
                      {dataCounts.measurements} measurement{dataCounts.measurements !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}

                {dataCounts.personalRecords > 0 && (
                  <View style={styles.dataItem}>
                    <CheckCircle size={16} color="#22c55e" />
                    <Text style={styles.dataItemText}>
                      {dataCounts.personalRecords} personal record{dataCounts.personalRecords !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}

                {dataCounts.customExercises > 0 && (
                  <View style={styles.dataItem}>
                    <CheckCircle size={16} color="#22c55e" />
                    <Text style={styles.dataItemText}>
                      {dataCounts.customExercises} custom exercise{dataCounts.customExercises !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}

                <View style={styles.dataItem}>
                  <CheckCircle size={16} color="#22c55e" />
                  <Text style={styles.dataItemText}>Profile & Settings</Text>
                </View>
              </View>
            </View>

            {/* Restore Mode */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Restore Mode</Text>

              <TouchableOpacity
                style={[styles.radioOption, !overwriteMode && styles.radioOptionSelected]}
                onPress={() => setOverwriteMode(false)}
                disabled={loading}
              >
                <View style={styles.radio}>
                  {!overwriteMode && <View style={styles.radioInner} />}
                </View>
                <View style={styles.radioContent}>
                  <Text style={styles.radioLabel}>Merge with existing data (Recommended)</Text>
                  <Text style={styles.radioDescription}>
                    Adds backup data to your current data. Updates duplicates based on timestamps.
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.radioOption, overwriteMode && styles.radioOptionSelected]}
                onPress={() => setOverwriteMode(true)}
                disabled={loading}
              >
                <View style={styles.radio}>
                  {overwriteMode && <View style={styles.radioInner} />}
                </View>
                <View style={styles.radioContent}>
                  <Text style={styles.radioLabel}>Overwrite all data</Text>
                  <Text style={styles.radioDescription}>
                    Replaces all your data with the backup. Use this for a clean restore.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.restoreButton, loading && styles.restoreButtonDisabled]}
                onPress={() => onConfirm(overwriteMode)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.restoreButtonText}>Restore</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    marginTop: 12,
  },
  warningCard: {
    backgroundColor: '#451a03',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  warningText: {
    fontSize: 14,
    color: '#f59e0b',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  sectionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  dataList: {
    gap: 12,
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dataItemText: {
    fontSize: 15,
    color: '#f1f5f9',
  },
  radioOption: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#334155',
    marginBottom: 12,
  },
  radioOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e293b',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#64748b',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },
  radioContent: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  radioDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
  restoreButton: {
    backgroundColor: '#3b82f6',
  },
  restoreButtonDisabled: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  restoreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

