import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Camera, User, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuthStore } from '../../stores/authStore';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  validateProfileData,
  UpdateProfileData,
} from '../../lib/api/profile';
import { SettingsHeader } from '../../components/SettingsHeader';
import { getCurrentTab } from '@/lib/navigation/navigationState';

interface FormData {
  full_name: string;
  email: string;
  date_of_birth: Date | null;
  gender: string;
  height_cm: string;
  fitness_goal: string;
  experience_level: string;
}

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

const FITNESS_GOALS = [
  { label: 'Build Strength', value: 'strength' },
  { label: 'Build Muscle', value: 'gain_muscle' },
  { label: 'Lose Weight', value: 'lose_weight' },
  { label: 'Improve Endurance', value: 'endurance' },
  { label: 'General Fitness', value: 'general_fitness' },
];

const EXPERIENCE_LEVELS = [
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    email: '',
    date_of_birth: null,
    gender: '',
    height_cm: '',
    fitness_goal: '',
    experience_level: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      if (!user?.id) return;
      
      const profile = await getProfile(user.id);
      if (profile) {
        setCurrentProfile(profile);
        setFormData({
          full_name: profile.full_name || '',
          email: profile.email,
          date_of_birth: profile.date_of_birth ? new Date(profile.date_of_birth) : null,
          gender: profile.gender || '',
          height_cm: profile.height_cm ? profile.height_cm.toString() : '',
          fitness_goal: profile.fitness_goal || '',
          experience_level: profile.experience_level || '',
        });
        setAvatarUrl(profile.avatar_url);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    Alert.alert(
      'Change Photo',
      'Choose a photo source',
      [
        {
          text: 'Camera',
          onPress: () => openCamera(),
        },
        {
          text: 'Gallery',
          onPress: () => openGallery(),
        },
        ...(avatarUrl ? [{
          text: 'Remove Photo',
          style: 'destructive' as const,
          onPress: () => handleRemoveAvatar(),
        }] : []),
        {
          text: 'Cancel',
          style: 'cancel' as const,
        },
      ]
    );
  };

  const openCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await handleUploadAvatar(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Gallery permission is required to select photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await handleUploadAvatar(result.assets[0].uri);
    }
  };

  const handleUploadAvatar = async (imageUri: string) => {
    try {
      if (!user?.id) return;
      
      setUploadingAvatar(true);
      const url = await uploadAvatar(user.id, imageUri);
      setAvatarUrl(url);
      
      // Update profile with new avatar URL
      await updateProfile(user.id, { avatar_url: url });
      Alert.alert('Success', 'Avatar updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      if (!user?.id) return;
      
      setUploadingAvatar(true);
      await deleteAvatar(user.id);
      setAvatarUrl(null);
      Alert.alert('Success', 'Avatar removed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to remove avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!user?.id) return;

      // Prepare update data
      const updates: UpdateProfileData = {
        full_name: formData.full_name.trim(),
        date_of_birth: formData.date_of_birth?.toISOString().split('T')[0],
        gender: formData.gender || undefined,
        height_cm: formData.height_cm ? parseFloat(formData.height_cm) : undefined,
        fitness_goal: formData.fitness_goal || undefined,
        experience_level: formData.experience_level || undefined,
      };

      // Validate
      const errors = validateProfileData(updates);
      if (errors.length > 0) {
        Alert.alert('Validation Error', errors.join('\n'));
        return;
      }

      setSaving(true);
      await updateProfile(user.id, updates);
      await loadProfile(); // Reload profile after update
      
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.push(getCurrentTab() || '/(tabs)') },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <SettingsHeader title="Edit Profile" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  const SaveButton = () => (
    <TouchableOpacity onPress={handleSave} disabled={saving} style={{ marginRight: 4 }}>
      {saving ? (
        <ActivityIndicator size="small" color="#3b82f6" />
      ) : (
        <Text style={styles.saveButtonHeader}>Save</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SettingsHeader title="Edit Profile" rightButton={<SaveButton />} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={handlePickImage}
            disabled={uploadingAvatar}
            activeOpacity={0.7}
          >
            <View style={styles.avatarContainer}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={48} color="#60a5fa" />
                </View>
              )}
              <View style={styles.cameraIconContainer}>
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Camera size={20} color="#fff" />
                )}
              </View>
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          {/* Full Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.full_name}
              onChangeText={(text) => setFormData({ ...formData, full_name: text })}
              placeholder="Enter your full name"
              placeholderTextColor="#64748b"
            />
          </View>

          {/* Email (Read-only) */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.disabledInput}>
              <Text style={styles.disabledInputText}>{formData.email}</Text>
            </View>
            <Text style={styles.hint}>Contact support to change email</Text>
          </View>

          {/* Date of Birth */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Date of Birth</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={formData.date_of_birth ? styles.inputText : styles.placeholder}>
                {formData.date_of_birth
                  ? formData.date_of_birth.toLocaleDateString()
                  : 'Select date'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={formData.date_of_birth || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    setFormData({ ...formData, date_of_birth: selectedDate });
                  }
                }}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
              />
            )}
          </View>

          {/* Gender */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.optionsContainer}>
              {GENDER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    formData.gender === option.value && styles.optionButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, gender: option.value })}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      formData.gender === option.value && styles.optionButtonTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Height */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Height ({currentProfile?.unit_system === 'metric' ? 'cm' : 'inches'})
            </Text>
            <TextInput
              style={styles.input}
              value={formData.height_cm}
              onChangeText={(text) => setFormData({ ...formData, height_cm: text })}
              placeholder="Enter your height"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Fitness Profile Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>FITNESS PROFILE</Text>
        </View>

        <View style={styles.formSection}>
          {/* Fitness Goal */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Fitness Goal</Text>
            <View style={styles.optionsContainer}>
              {FITNESS_GOALS.map((goal) => (
                <TouchableOpacity
                  key={goal.value}
                  style={[
                    styles.optionButton,
                    formData.fitness_goal === goal.value && styles.optionButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, fitness_goal: goal.value })}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      formData.fitness_goal === goal.value && styles.optionButtonTextActive,
                    ]}
                  >
                    {goal.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Experience Level */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Experience Level</Text>
            <View style={styles.optionsContainer}>
              {EXPERIENCE_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level.value}
                  style={[
                    styles.optionButton,
                    formData.experience_level === level.value && styles.optionButtonActive,
                  ]}
                  onPress={() =>
                    setFormData({ ...formData, experience_level: level.value })
                  }
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      formData.experience_level === level.value &&
                        styles.optionButtonTextActive,
                    ]}
                  >
                    {level.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity
            style={[styles.saveButtonBottom, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.7}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  saveButtonHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    marginRight: 16,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#334155',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1e293b',
  },
  avatarHint: {
    marginTop: 12,
    fontSize: 14,
    color: '#94a3b8',
  },
  formSection: {
    padding: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  input: {
    height: 48,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#f1f5f9',
    justifyContent: 'center',
  },
  inputText: {
    fontSize: 16,
    color: '#f1f5f9',
  },
  placeholder: {
    fontSize: 16,
    color: '#64748b',
  },
  disabledInput: {
    height: 48,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    opacity: 0.6,
  },
  disabledInputText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  hint: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748b',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
  },
  optionButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94a3b8',
  },
  optionButtonTextActive: {
    color: '#ffffff',
  },
  bottomSpacer: {
    height: 32,
  },
  saveButtonContainer: {
    padding: 16,
    marginTop: 24,
  },
  saveButtonBottom: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#475569',
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

