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
import { Stack, router } from 'expo-router';
import { Eye, EyeOff, Lock, ChevronLeft, Check, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

export default function ChangePasswordScreen() {
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
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: 'Contains number', met: /[0-9]/.test(newPassword) },
  ];

  const allRequirementsMet = requirements.every(r => r.met);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

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

    if (currentPassword === newPassword) {
      newErrors.newPassword = 'New password must be different from current';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        'Password Changed',
        'Your password has been updated successfully.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to change password. Please try again.'
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
    error?: string,
    placeholder?: string
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputContainer, error && styles.inputError]}>
        <Lock size={20} color="#6b7280" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(text) => {
            setValue(text);
            if (errors[label.toLowerCase().replace(' ', '')]) {
              setErrors(prev => ({ ...prev, [label.toLowerCase().replace(' ', '')]: '' }));
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
            <EyeOff size={20} color="#6b7280" />
          ) : (
            <Eye size={20} color="#6b7280" />
          )}
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Change Password',
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#f1f5f9',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft size={24} color="#f1f5f9" />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Current Password */}
          {renderPasswordInput(
            'Current Password',
            currentPassword,
            setCurrentPassword,
            showCurrentPassword,
            setShowCurrentPassword,
            errors.currentPassword,
            'Enter current password'
          )}

          {/* New Password */}
          {renderPasswordInput(
            'New Password',
            newPassword,
            setNewPassword,
            showNewPassword,
            setShowNewPassword,
            errors.newPassword,
            'Enter new password'
          )}

          {/* Password Requirements */}
          {newPassword.length > 0 && (
            <View style={styles.requirements}>
              {requirements.map((req, index) => (
                <View key={index} style={styles.requirementRow}>
                  {req.met ? (
                    <Check size={16} color="#22c55e" />
                  ) : (
                    <X size={16} color="#6b7280" />
                  )}
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
            'Confirm Password',
            confirmPassword,
            setConfirmPassword,
            showConfirmPassword,
            setShowConfirmPassword,
            errors.confirmPassword,
            'Confirm new password'
          )}

          {/* Match Indicator */}
          {confirmPassword.length > 0 && (
            <View style={styles.matchIndicator}>
              {passwordsMatch ? (
                <>
                  <Check size={16} color="#22c55e" />
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
              (!allRequirementsMet || !passwordsMatch || isLoading) && styles.submitButtonDisabled
            ]}
            onPress={handleChangePassword}
            disabled={!allRequirementsMet || !passwordsMatch || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Update Password</Text>
            )}
          </TouchableOpacity>

          {/* Security Note */}
          <Text style={styles.securityNote}>
            You'll remain logged in after changing your password. Other devices will need to log in again.
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
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
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
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#f1f5f9',
  },
  eyeButton: {
    padding: 8,
    marginRight: -8,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  requirements: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requirementText: {
    fontSize: 14,
    color: '#6b7280',
  },
  requirementMet: {
    color: '#22c55e',
  },
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -12,
  },
  matchText: {
    fontSize: 13,
    color: '#22c55e',
  },
  noMatchText: {
    fontSize: 13,
    color: '#ef4444',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
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
  securityNote: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
});

