import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LogIn, UserPlus, X } from 'lucide-react-native';

interface AuthPromptModalProps {
  visible: boolean;
  onClose: () => void;
  message?: string;
}

export function AuthPromptModal({ visible, onClose, message }: AuthPromptModalProps) {
  const router = useRouter();

  const handleSignIn = () => {
    onClose();
    router.push('/(auth)/login');
  };

  const handleSignUp = () => {
    onClose();
    router.push('/(auth)/signup');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Close button */}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <X size={20} color="#6b7280" />
          </Pressable>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <LogIn size={32} color="#3b82f6" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Sign In Required</Text>

          {/* Message */}
          <Text style={styles.message}>
            {message || 'Please sign in or create an account to use this feature.'}
          </Text>

          {/* Buttons */}
          <View style={styles.buttons}>
            <Pressable style={styles.signInButton} onPress={handleSignIn}>
              <LogIn size={18} color="#fff" />
              <Text style={styles.signInText}>Sign In</Text>
            </Pressable>

            <Pressable style={styles.signUpButton} onPress={handleSignUp}>
              <UserPlus size={18} color="#3b82f6" />
              <Text style={styles.signUpText}>Create Account</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  signInButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  signInText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signUpButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  signUpText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
});



