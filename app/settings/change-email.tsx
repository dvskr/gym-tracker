import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, AlertTriangle, Info, CheckCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { errorHaptic, successHaptic } from '@/lib/utils/haptics';
import { SettingsHeader } from '@/components/SettingsHeader';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';
import { logger } from '@/lib/utils/logger';

export default function ChangeEmailScreen() {
  useBackNavigation();
  
  const { user } = useAuthStore();
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailSent, setEmailSent] = useState(false);

  const currentEmail = user?.email || '';

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const emailsMatch = newEmail === confirmEmail && confirmEmail.length > 0;
  const isValidEmail = validateEmail(newEmail);
  const isDifferentEmail = newEmail.toLowerCase() !== currentEmail.toLowerCase();

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!newEmail) {
      newErrors.newEmail = 'New email is required';
    } else if (!isValidEmail) {
      newErrors.newEmail = 'Please enter a valid email address';
    } else if (!isDifferentEmail) {
      newErrors.newEmail = 'New email must be different from current';
    }

    if (!confirmEmail) {
      newErrors.confirmEmail = 'Please confirm your new email';
    } else if (newEmail !== confirmEmail) {
      newErrors.confirmEmail = 'Email addresses do not match';
    }

    if (!password) {
      newErrors.password = 'Password is required to change email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangeEmail = async () => {
    if (!validate()) {
      errorHaptic();
      return;
    }

    setIsLoading(true);

    try {
      // First verify password by attempting sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: password,
      });

      if (signInError) {
        setErrors({ password: 'Incorrect password' });
        errorHaptic();
        setIsLoading(false);
        return;
      }

      // Request email change - Supabase sends verification to NEW email
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (updateError) {
        // Handle specific errors
        if (updateError.message.includes('already registered')) {
          setErrors({ newEmail: 'This email is already in use' });
          errorHaptic();
          setIsLoading(false);
          return;
        }
        throw updateError;
      }

      successHaptic();
      setEmailSent(true);

    } catch (error: unknown) {
      logger.error('Error changing email', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to change email. Please try again.'
      );
      errorHaptic();
    } finally {
      setIsLoading(false);
    }
  };

  // Success state - verification email sent
  if (emailSent) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <SettingsHeader title="Change Email" />

        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <CheckCircle size={56} color="#22c55e" />
          </View>
          
          <Text style={styles.successTitle}>Verification Email Sent</Text>
          
          <Text style={styles.successMessage}>
            We've sent a verification link to:
          </Text>
          
          <Text style={styles.successEmail}>{newEmail}</Text>
          
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>Next Steps:</Text>
            <View style={styles.stepsList}>
              <Text style={styles.stepItem}>1. Check your inbox (and spam folder)</Text>
              <Text style={styles.stepItem}>2. Click the verification link</Text>
              <Text style={styles.stepItem}>3. Your email will be updated automatically</Text>
            </View>
          </View>

          <View style={styles.warningCard}>
            <AlertTriangle size={20} color="#f59e0b" />
            <Text style={styles.warningText}>
              Your current email ({currentEmail}) will remain active until you verify the new one.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => router.back()}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <SettingsHeader title="Change Email" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Current Email Display */}
          <View style={styles.currentEmailCard}>
            <View style={styles.currentEmailIcon}>
              <Mail size={24} color="#3b82f6" />
            </View>
            <View style={styles.currentEmailContent}>
              <Text style={styles.currentEmailLabel}>Current Email</Text>
              <Text style={styles.currentEmailValue}>{currentEmail}</Text>
            </View>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Info size={18} color="#60a5fa" />
            <Text style={styles.infoText}>
              A verification link will be sent to your new email. Your email won't change until you verify it.
            </Text>
          </View>

          {/* New Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Email Address</Text>
            <View style={[styles.inputContainer, errors.newEmail && styles.inputError]}>
              <Mail size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={newEmail}
                onChangeText={(text) => {
                  setNewEmail(text.trim());
                  if (errors.newEmail) {
                    setErrors(prev => ({ ...prev, newEmail: '' }));
                  }
                }}
                placeholder="Enter new email"
                placeholderTextColor="#4b5563"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
              {isValidEmail && isDifferentEmail && (
                <CheckCircle size={20} color="#22c55e" />
              )}
            </View>
            {errors.newEmail && <Text style={styles.errorText}>{errors.newEmail}</Text>}
          </View>

          {/* Confirm Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm New Email</Text>
            <View style={[styles.inputContainer, errors.confirmEmail && styles.inputError]}>
              <Mail size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={confirmEmail}
                onChangeText={(text) => {
                  setConfirmEmail(text.trim());
                  if (errors.confirmEmail) {
                    setErrors(prev => ({ ...prev, confirmEmail: '' }));
                  }
                }}
                placeholder="Confirm new email"
                placeholderTextColor="#4b5563"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
              {emailsMatch && (
                <CheckCircle size={20} color="#22c55e" />
              )}
            </View>
            {errors.confirmEmail && <Text style={styles.errorText}>{errors.confirmEmail}</Text>}
            
            {/* Match indicator */}
            {confirmEmail.length > 0 && !errors.confirmEmail && (
              <View style={styles.matchIndicator}>
                {emailsMatch ? (
                  <>
                    <CheckCircle size={14} color="#22c55e" />
                    <Text style={styles.matchText}>Emails match</Text>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={14} color="#ef4444" />
                    <Text style={styles.noMatchText}>Emails do not match</Text>
                  </>
                )}
              </View>
            )}
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Password</Text>
            <Text style={styles.labelHint}>Required for security verification</Text>
            <View style={[styles.inputContainer, errors.password && styles.inputError]}>
              <Lock size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) {
                    setErrors(prev => ({ ...prev, password: '' }));
                  }
                }}
                placeholder="Enter your password"
                placeholderTextColor="#4b5563"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                {showPassword ? (
                  <EyeOff size={20} color="#64748b" />
                ) : (
                  <Eye size={20} color="#64748b" />
                )}
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!isValidEmail || !emailsMatch || !password || !isDifferentEmail || isLoading) && styles.submitButtonDisabled
            ]}
            onPress={handleChangeEmail}
            disabled={!isValidEmail || !emailsMatch || !password || !isDifferentEmail || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Send Verification Email</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  
  // Current Email Card
  currentEmailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },
  currentEmailIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1e3a8a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  currentEmailContent: {
    flex: 1,
  },
  currentEmailLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentEmailValue: {
    fontSize: 16,
    color: '#f1f5f9',
    fontWeight: '600',
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#93c5fd',
    lineHeight: 20,
  },

  // Input styles
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  labelHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: -4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    height: 52,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#f1f5f9',
  },
  eyeButton: {
    padding: 8,
    marginRight: -8,
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    marginTop: 4,
  },
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  matchText: {
    fontSize: 13,
    color: '#22c55e',
  },
  noMatchText: {
    fontSize: 13,
    color: '#ef4444',
  },

  // Submit Button
  submitButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#1e40af',
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Success State
  successContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 8,
  },
  successEmail: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 32,
  },
  instructionsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 12,
  },
  stepsList: {
    gap: 8,
  },
  stepItem: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 22,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#fcd34d',
    lineHeight: 18,
  },
  doneButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 64,
    borderRadius: 12,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});


