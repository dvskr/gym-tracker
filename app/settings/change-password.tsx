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
import { Eye, EyeOff, Lock, Check, X, Shield, CheckCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { errorHaptic, successHaptic } from '@/lib/utils/haptics';
import { SettingsHeader } from '@/components/SettingsHeader';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';
import { logger } from '@/lib/utils/logger';

export default function ChangePasswordScreen() {
  useBackNavigation();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Password strength requirements
  const requirements = [
    { id: 'length', label: 'At least 8 characters', met: newPassword.length >= 8 },
    { id: 'uppercase', label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(newPassword) },
    { id: 'lowercase', label: 'One lowercase letter (a-z)', met: /[a-z]/.test(newPassword) },
    { id: 'number', label: 'One number (0-9)', met: /[0-9]/.test(newPassword) },
  ];

  const allRequirementsMet = requirements.every(r => r.met);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  // Calculate password strength percentage
  const strengthPercentage = (requirements.filter(r => r.met).length / requirements.length) * 100;
  
  const getStrengthColor = () => {
    if (strengthPercentage <= 25) return '#ef4444';
    if (strengthPercentage <= 50) return '#f59e0b';
    if (strengthPercentage <= 75) return '#eab308';
    return '#22c55e';
  };

  const getStrengthLabel = () => {
    if (strengthPercentage <= 25) return 'Weak';
    if (strengthPercentage <= 50) return 'Fair';
    if (strengthPercentage <= 75) return 'Good';
    return 'Strong';
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (!allRequirementsMet) {
      newErrors.newPassword = 'Password does not meet requirements';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (currentPassword === newPassword && currentPassword.length > 0) {
      newErrors.newPassword = 'New password must be different from current';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validate()) {
      errorHaptic();
      return;
    }

    setIsLoading(true);

    try {
      // First verify current password by attempting sign in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        throw new Error('Unable to verify user');
      }

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        setErrors({ currentPassword: 'Current password is incorrect' });
        errorHaptic();
        setIsLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      successHaptic();
      
      Alert.alert(
        'Password Changed',
        'Your password has been updated successfully. You will remain logged in on this device.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: unknown) {
      logger.error('Error changing password', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to change password. Please try again.'
      );
      errorHaptic();
    } finally {
      setIsLoading(false);
    }
  };

  const renderPasswordInput = (
    label: string,
    value: string,
    setValue: (val: string) => void,
    show: boolean,
    setShow: (val: boolean) => void,
    errorKey: string,
    placeholder?: string
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputContainer, errors[errorKey] && styles.inputError]}>
        <Lock size={20} color="#64748b" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(text) => {
            setValue(text);
            if (errors[errorKey]) {
              setErrors(prev => ({ ...prev, [errorKey]: '' }));
            }
          }}
          placeholder={placeholder || label}
          placeholderTextColor="#4b5563"
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity onPress={() => setShow(!show)} style={styles.eyeButton}>
          {show ? (
            <EyeOff size={20} color="#64748b" />
          ) : (
            <Eye size={20} color="#64748b" />
          )}
        </TouchableOpacity>
      </View>
      {errors[errorKey] && <Text style={styles.errorText}>{errors[errorKey]}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <SettingsHeader title="Change Password" />

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
          {/* Security Info */}
          <View style={styles.securityCard}>
            <Shield size={24} color="#3b82f6" />
            <View style={styles.securityContent}>
              <Text style={styles.securityTitle}>Keep your account secure</Text>
              <Text style={styles.securityText}>
                Use a strong, unique password that you don't use elsewhere.
              </Text>
            </View>
          </View>

          {/* Current Password */}
          {renderPasswordInput(
            'Current Password',
            currentPassword,
            setCurrentPassword,
            showCurrentPassword,
            setShowCurrentPassword,
            'currentPassword',
            'Enter current password'
          )}

          {/* New Password */}
          {renderPasswordInput(
            'New Password',
            newPassword,
            setNewPassword,
            showNewPassword,
            setShowNewPassword,
            'newPassword',
            'Enter new password'
          )}

          {/* Password Strength Indicator */}
          {newPassword.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthHeader}>
                <Text style={styles.strengthLabel}>Password strength:</Text>
                <Text style={[styles.strengthValue, { color: getStrengthColor() }]}>
                  {getStrengthLabel()}
                </Text>
              </View>
              <View style={styles.strengthBarBg}>
                <View 
                  style={[
                    styles.strengthBar, 
                    { width: `${strengthPercentage}%`, backgroundColor: getStrengthColor() }
                  ]} 
                />
              </View>
            </View>
          )}

          {/* Password Requirements */}
          {newPassword.length > 0 && (
            <View style={styles.requirements}>
              <Text style={styles.requirementsTitle}>Requirements:</Text>
              {requirements.map((req) => (
                <View key={req.id} style={styles.requirementRow}>
                  <View style={[styles.requirementIcon, req.met && styles.requirementIconMet]}>
                    {req.met ? (
                      <Check size={12} color="#fff" />
                    ) : (
                      <X size={12} color="#64748b" />
                    )}
                  </View>
                  <Text style={[
                    styles.requirementText,
                    req.met && styles.requirementMet
                  ]}>
                    {req.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Confirm Password */}
          {renderPasswordInput(
            'Confirm New Password',
            confirmPassword,
            setConfirmPassword,
            showConfirmPassword,
            setShowConfirmPassword,
            'confirmPassword',
            'Confirm new password'
          )}

          {/* Match Indicator */}
          {confirmPassword.length > 0 && !errors.confirmPassword && (
            <View style={styles.matchIndicator}>
              {passwordsMatch ? (
                <>
                  <CheckCircle size={16} color="#22c55e" />
                  <Text style={styles.matchText}>Passwords match</Text>
                </>
              ) : (
                <>
                  <X size={16} color="#ef4444" />
                  <Text style={styles.noMatchText}>Passwords do not match</Text>
                </>
              )}
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!allRequirementsMet || !passwordsMatch || !currentPassword || isLoading) && styles.submitButtonDisabled
            ]}
            onPress={handleChangePassword}
            disabled={!allRequirementsMet || !passwordsMatch || !currentPassword || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Update Password</Text>
            )}
          </TouchableOpacity>

          {/* Security Note */}
          <Text style={styles.securityNote}>
            You'll remain logged in on this device. Other devices will need to log in again with your new password.
          </Text>
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
  
  // Security Card
  securityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  securityContent: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#93c5fd',
    marginBottom: 4,
  },
  securityText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
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

  // Strength Indicator
  strengthContainer: {
    gap: 8,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strengthLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  strengthValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  strengthBarBg: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
    borderRadius: 3,
  },

  // Requirements
  requirements: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requirementIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requirementIconMet: {
    backgroundColor: '#22c55e',
  },
  requirementText: {
    fontSize: 14,
    color: '#64748b',
  },
  requirementMet: {
    color: '#22c55e',
  },

  // Match Indicator
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -8,
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

  // Security Note
  securityNote: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});


