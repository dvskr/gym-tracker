import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';
import { deleteAccount } from '../../lib/api/account';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteAccountModal({
  visible,
  onClose,
  onSuccess,
}: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = confirmText === 'DELETE' && password.length > 0;

  const handleDelete = async () => {
    if (!isValid) return;

    Alert.alert(
      'Final Confirmation',
      'Are you absolutely sure? This action CANNOT be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: performDelete,
        },
      ]
    );
  };

  const performDelete = async () => {
    try {
      setLoading(true);
      const result = await deleteAccount(password);

      if (result.success) {
        Alert.alert(
          'Account Deleted',
          'Your account and all data have been permanently deleted.',
          [{ text: 'OK', onPress: onSuccess }]
        );
        handleClose();
      } else {
        Alert.alert('Error', result.error || 'Failed to delete account');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    setPassword('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <AlertTriangle size={32} color="#ef4444" />
            <Text style={styles.title}>Delete Account</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>� This action cannot be undone!</Text>
              <Text style={styles.warningText}>
                All your data will be permanently deleted and cannot be recovered.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>What will be deleted:</Text>
            <View style={styles.deleteList}>
              <Text style={styles.deleteItem}>• All workout history</Text>
              <Text style={styles.deleteItem}>• All workout templates</Text>
              <Text style={styles.deleteItem}>• All personal records</Text>
              <Text style={styles.deleteItem}>• All body measurements</Text>
              <Text style={styles.deleteItem}>• All body weight logs</Text>
              <Text style={styles.deleteItem}>• All progress photos</Text>
              <Text style={styles.deleteItem}>• All weight goals</Text>
              <Text style={styles.deleteItem}>• Your profile and account</Text>
            </View>

            <Text style={styles.confirmLabel}>
              Type <Text style={styles.deleteKeyword}>DELETE</Text> to confirm:
            </Text>
            <TextInput
              style={styles.input}
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="Type DELETE"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
            />

            <Text style={styles.passwordLabel}>Enter your password:</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#64748b"
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.deleteButton, (!isValid || loading) && styles.deleteButtonDisabled]}
              onPress={handleDelete}
              disabled={!isValid || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.deleteButtonText}>Delete My Account Forever</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
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
    padding: 16,
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 500,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  warningBox: {
    backgroundColor: '#450a0a',
    borderWidth: 2,
    borderColor: '#991b1b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fca5a5',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#fecaca',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  deleteList: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  deleteItem: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 24,
  },
  confirmLabel: {
    fontSize: 14,
    color: '#f1f5f9',
    marginBottom: 8,
  },
  deleteKeyword: {
    fontWeight: '700',
    color: '#ef4444',
  },
  passwordLabel: {
    fontSize: 14,
    color: '#f1f5f9',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#f1f5f9',
    marginBottom: 8,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  cancelButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
});

