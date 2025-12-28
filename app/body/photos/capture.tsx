import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  ImageIcon,
  RotateCcw,
  Calendar,
  Check,
  User,
  ArrowLeftCircle,
  ArrowRightCircle,
} from 'lucide-react-native';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/stores/authStore';
import {
  takePhoto,
  pickFromGallery,
  savePhotoLocally,
  PhotoType,
  PHOTO_TYPES,
  PhotoResult,
} from '@/lib/services/photoService';
import { savePhotoRecord } from '@/lib/api/photos';

// ============================================
// Constants
// ============================================

const screenWidth = Dimensions.get('window').width;
const PHOTO_ASPECT_RATIO = 4 / 5; // Portrait
const PREVIEW_HEIGHT = (screenWidth - 32) / PHOTO_ASPECT_RATIO;

// ============================================
// Photo Type Card Component
// ============================================

interface PhotoTypeCardProps {
  type: PhotoType;
  label: string;
  icon: string;
  isSelected: boolean;
  onSelect: () => void;
}

const PhotoTypeCard: React.FC<PhotoTypeCardProps> = ({
  type,
  label,
  icon,
  isSelected,
  onSelect,
}) => {
  // Get illustration icon based on type
  const getTypeIcon = () => {
    switch (type) {
      case 'front':
        return <User size={24} color={isSelected ? '#3b82f6' : '#64748b'} />;
      case 'side_left':
        return <ArrowLeftCircle size={24} color={isSelected ? '#3b82f6' : '#64748b'} />;
      case 'side_right':
        return <ArrowRightCircle size={24} color={isSelected ? '#3b82f6' : '#64748b'} />;
      case 'back':
        return <User size={24} color={isSelected ? '#3b82f6' : '#64748b'} style={{ transform: [{ scaleX: -1 }] }} />;
      case 'flexed_front':
        return <Text style={[styles.typeEmoji, isSelected && styles.typeEmojiSelected]}>💪</Text>;
      case 'flexed_back':
        return <Text style={[styles.typeEmoji, isSelected && styles.typeEmojiSelected]}>🦾</Text>;
      default:
        return <User size={24} color={isSelected ? '#3b82f6' : '#64748b'} />;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.typeCard, isSelected && styles.typeCardSelected]}
      onPress={() => {
        Haptics.selectionAsync();
        onSelect();
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.typeIconContainer, isSelected && styles.typeIconContainerSelected]}>
        {getTypeIcon()}
      </View>
      <Text style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// ============================================
// Main Screen Component
// ============================================

export default function CapturePhotoScreen() {
  const { user } = useAuthStore();

  const [selectedType, setSelectedType] = useState<PhotoType>('front');
  const [capturedPhoto, setCapturedPhoto] = useState<PhotoResult | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Handle take photo
  const handleTakePhoto = async () => {
    setIsCapturing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await takePhoto();
      if (result) {
        setCapturedPhoto(result);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert(
        'Camera Error',
        'Unable to access camera. Please check your permissions in Settings.'
      );
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle pick from gallery
  const handlePickFromGallery = async () => {
    setIsCapturing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await pickFromGallery();
      if (result) {
        setCapturedPhoto(result);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert(
        'Gallery Error',
        'Unable to access photo gallery. Please check your permissions in Settings.'
      );
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle retake
  const handleRetake = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCapturedPhoto(null);
  };

  // Handle save
  const handleSave = async () => {
    if (!user?.id || !capturedPhoto) return;

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Save photo locally
      const localUri = await savePhotoLocally(
        capturedPhoto.uri,
        selectedType,
        selectedDate
      );

      // Save record to database
      await savePhotoRecord(
        user.id,
        localUri,
        selectedType,
        selectedDate,
        notes || undefined
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        'Photo Saved',
        'Your progress photo has been saved successfully.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error saving photo:', error);
      Alert.alert('Error', 'Failed to save photo. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Take Progress Photo</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Type Selector */}
        <Text style={styles.sectionLabel}>PHOTO TYPE</Text>
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeSelector}
        >
          {PHOTO_TYPES.map((photoType) => (
            <PhotoTypeCard
              key={photoType.type}
              type={photoType.type}
              label={photoType.label}
              icon={photoType.icon}
              isSelected={selectedType === photoType.type}
              onSelect={() => setSelectedType(photoType.type)}
            />
          ))}
        </ScrollView>

        {/* Photo Preview / Placeholder */}
        <View style={styles.previewContainer}>
          {capturedPhoto ? (
            <Image
              source={{ uri: capturedPhoto.uri }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <View style={styles.placeholderOverlay}>
                <Camera size={48} color="#64748b" />
                <Text style={styles.placeholderText}>No photo taken</Text>
                <Text style={styles.placeholderSubtext}>
                  Tap a button below to capture or select a photo
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {capturedPhoto ? (
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={handleRetake}
              disabled={isCapturing}
            >
              <RotateCcw size={20} color="#f1f5f9" />
              <Text style={styles.retakeButtonText}>Retake</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={handleTakePhoto}
                disabled={isCapturing}
              >
                {isCapturing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Camera size={20} color="#ffffff" />
                    <Text style={styles.cameraButtonText}>Take Photo</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.galleryButton}
                onPress={handlePickFromGallery}
                disabled={isCapturing}
              >
                <ImageIcon size={20} color="#f1f5f9" />
                <Text style={styles.galleryButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Photo Info */}
        <View style={styles.infoSection}>
          {/* Date */}
          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <Calendar size={18} color="#64748b" />
              <Text style={styles.infoLabelText}>Date</Text>
            </View>
            <TouchableOpacity style={styles.dateButton}>
              <Text style={styles.dateText}>
                {format(new Date(selectedDate), 'MMM d, yyyy')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Notes */}
          <Text style={styles.notesLabel}>Notes (optional)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes about this photo..."
            placeholderTextColor="#475569"
            multiline={true}
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Privacy Notice */}
        <View style={styles.privacyNotice}>
          <Text style={styles.privacyText}>
            🔒 Photos are stored locally on your device and are not uploaded to the cloud.
          </Text>
        </View>

        {/* Bottom spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Save Button */}
      {capturedPhoto && (
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Check size={20} color="#ffffff" />
                <Text style={styles.saveButtonText}>Save Photo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },

  backButton: {
    padding: 4,
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
  },

  bottomSpacer: {
    height: 100,
  },

  // Section Label
  sectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 12,
  },

  // Type Selector
  typeSelector: {
    gap: 10,
    paddingRight: 16,
    marginBottom: 20,
  },

  typeCard: {
    width: 80,
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#334155',
  },

  typeCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a5f',
  },

  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  typeIconContainerSelected: {
    backgroundColor: '#1e40af',
  },

  typeEmoji: {
    fontSize: 24,
  },

  typeEmojiSelected: {
    opacity: 1,
  },

  typeLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    textAlign: 'center',
  },

  typeLabelSelected: {
    color: '#3b82f6',
  },

  // Preview
  previewContainer: {
    width: '100%',
    height: PREVIEW_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },

  previewImage: {
    width: '100%',
    height: '100%',
  },

  placeholderContainer: {
    flex: 1,
    backgroundColor: '#1e293b',
  },

  placeholderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  placeholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginTop: 16,
  },

  placeholderSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },

  cameraButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },

  cameraButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  galleryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },

  galleryButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },

  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },

  retakeButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },

  // Info Section
  infoSection: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  infoLabelText: {
    fontSize: 14,
    color: '#94a3b8',
  },

  dateButton: {
    backgroundColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },

  dateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  notesLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },

  notesInput: {
    backgroundColor: '#334155',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#ffffff',
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Privacy Notice
  privacyNotice: {
    backgroundColor: '#14532d',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },

  privacyText: {
    fontSize: 13,
    color: '#86efac',
    textAlign: 'center',
  },

  // Save Button
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#020617',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});

