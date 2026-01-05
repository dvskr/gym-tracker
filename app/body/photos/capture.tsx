import React, { useState } from 'react';
import { logger } from '@/lib/utils/logger';
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
  Platform,
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
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Shield,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, addDays, subDays, isToday, parseISO } from 'date-fns';
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
import { getCurrentTab } from '@/lib/navigation/navigationState';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';

// ============================================
// Constants
// ============================================

const screenWidth = Dimensions.get('window').width;
const PHOTO_ASPECT_RATIO = 4 / 5; // Portrait
const PREVIEW_HEIGHT = (screenWidth - 32) * 0.8;

// ============================================
// Photo Type Data with Tips
// ============================================

const PHOTO_TYPE_INFO: Record<PhotoType, { emoji: string; tip: string; color: string }> = {
  front: { 
    emoji: '🧍', 
    tip: 'Stand relaxed with arms at your sides, facing the camera directly',
    color: '#3b82f6'
  },
  side_left: { 
    emoji: '👈', 
    tip: 'Turn your left side to the camera, look straight ahead',
    color: '#8b5cf6'
  },
  side_right: { 
    emoji: '👉', 
    tip: 'Turn your right side to the camera, look straight ahead',
    color: '#8b5cf6'
  },
  back: { 
    emoji: '🔙', 
    tip: 'Face away from the camera with arms relaxed at sides',
    color: '#06b6d4'
  },
  flexed_front: { 
    emoji: '💪', 
    tip: 'Front double biceps pose - flex both arms overhead',
    color: '#f59e0b'
  },
  flexed_back: { 
    emoji: '🏋️', 
    tip: 'Back double biceps pose - flex both arms from behind',
    color: '#ef4444'
  },
};

// ============================================
// Photo Type Card Component
// ============================================

interface PhotoTypeCardProps {
  type: PhotoType;
  label: string;
  isSelected: boolean;
  onSelect: () => void;
}

const PhotoTypeCard: React.FC<PhotoTypeCardProps> = ({
  type,
  label,
  isSelected,
  onSelect,
}) => {
  const info = PHOTO_TYPE_INFO[type];

  return (
    <TouchableOpacity
      style={[
        styles.typeCard, 
        isSelected && styles.typeCardSelected,
        isSelected && { borderColor: info.color }
      ]}
      onPress={() => {
        Haptics.selectionAsync();
        onSelect();
      }}
      activeOpacity={0.7}
    >
      <View style={[
        styles.typeIconContainer, 
        isSelected && styles.typeIconContainerSelected,
        isSelected && { backgroundColor: info.color + '30' }
      ]}>
        <Text style={styles.typeEmoji}>{info.emoji}</Text>
      </View>
      <Text style={[
        styles.typeLabel, 
        isSelected && styles.typeLabelSelected,
        isSelected && { color: info.color }
      ]}>
        {label}
      </Text>
      {isSelected && (
        <View style={[styles.selectedIndicator, { backgroundColor: info.color }]} />
      )}
    </TouchableOpacity>
  );
};

// ============================================
// Pose Tip Component
// ============================================

interface PoseTipProps {
  type: PhotoType;
}

const PoseTip: React.FC<PoseTipProps> = ({ type }) => {
  const info = PHOTO_TYPE_INFO[type];
  
  return (
    <View style={[styles.tipContainer, { borderLeftColor: info.color }]}>
      <Lightbulb size={16} color={info.color} />
      <Text style={styles.tipText}>{info.tip}</Text>
    </View>
  );
};

// ============================================
// Main Screen Component
// ============================================

export default function CapturePhotoScreen() {
  useBackNavigation();

  const { user } = useAuthStore();

  const [selectedType, setSelectedType] = useState<PhotoType>('front');
  const [capturedPhoto, setCapturedPhoto] = useState<PhotoResult | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const dateString = format(selectedDate, 'yyyy-MM-dd');

  // Navigate dates
  const goToPreviousDay = () => {
    Haptics.selectionAsync();
    setSelectedDate(prev => subDays(prev, 1));
  };

  const goToNextDay = () => {
    Haptics.selectionAsync();
    const nextDay = addDays(selectedDate, 1);
    if (nextDay <= new Date()) {
      setSelectedDate(nextDay);
    }
  };

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
      logger.error('Error taking photo:', error);
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
      logger.error('Error picking photo:', error);
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
      const localUri = await savePhotoLocally(
        capturedPhoto.uri,
        selectedType,
        dateString
      );

      await savePhotoRecord(
        user.id,
        localUri,
        selectedType,
        dateString,
        notes || undefined
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        '✨ Photo Saved!',
        'Your progress photo has been saved successfully.',
        [{ text: 'OK', onPress: () => router.push('/body/photos') }]
      );
    } catch (error) {
      logger.error('Error saving photo:', error);
      Alert.alert('Error', 'Failed to save photo. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const info = PHOTO_TYPE_INFO[selectedType];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progress Photo</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photo Type Selector */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>POSE TYPE</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeSelector}
        >
          {PHOTO_TYPES.map((photoType) => (
            <PhotoTypeCard
              key={photoType.type}
              type={photoType.type}
              label={photoType.label}
              isSelected={selectedType === photoType.type}
              onSelect={() => setSelectedType(photoType.type)}
            />
          ))}
        </ScrollView>

        {/* Pose Tip */}
        <PoseTip type={selectedType} />

        {/* Photo Preview / Placeholder */}
        <View style={styles.previewContainer}>
          {capturedPhoto ? (
            <>
              <Image
                source={{ uri: capturedPhoto.uri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <View style={[styles.photoTypeBadge, { backgroundColor: info.color }]}>
                <Text style={styles.photoTypeBadgeText}>
                  {info.emoji} {PHOTO_TYPES.find(p => p.type === selectedType)?.label}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.placeholderContainer}>
              <View style={styles.poseGuide}>
                <Text style={styles.poseGuideEmoji}>{info.emoji}</Text>
                <View style={styles.poseGuideLine} />
              </View>
              <View style={styles.placeholderContent}>
                <Camera size={40} color="#64748b" />
                <Text style={styles.placeholderText}>Ready to capture</Text>
                <Text style={styles.placeholderSubtext}>
                  Use consistent lighting and background
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
              <Text style={styles.retakeButtonText}>Retake Photo</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.cameraButton, { backgroundColor: info.color }]}
                onPress={handleTakePhoto}
                disabled={isCapturing}
              >
                {isCapturing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Camera size={22} color="#ffffff" />
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
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Date Selector */}
        <View style={styles.dateSection}>
          <View style={styles.dateSectionHeader}>
            <Calendar size={18} color="#64748b" />
            <Text style={styles.dateSectionLabel}>Photo Date</Text>
          </View>
          <View style={styles.dateSelector}>
            <TouchableOpacity style={styles.dateArrow} onPress={goToPreviousDay}>
              <ChevronLeft size={24} color="#94a3b8" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dateDisplay}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEE, MMM d')}
              </Text>
              <Text style={styles.dateYear}>{format(selectedDate, 'yyyy')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateArrow}
              onPress={goToNextDay}
              disabled={isToday(selectedDate)}
            >
              <ChevronRight size={24} color={isToday(selectedDate) ? '#334155' : '#94a3b8'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes Input */}
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Notes (optional)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Lighting, time of day, how you feel..."
            placeholderTextColor="#475569"
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>

        {/* Privacy Notice */}
        <View style={styles.privacyNotice}>
          <Shield size={16} color="#86efac" />
          <Text style={styles.privacyText}>
            Photos are stored privately on your device only
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Save Button */}
      {capturedPhoto && (
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity
            style={[
              styles.saveButton, 
              isSaving && styles.saveButtonDisabled,
              { backgroundColor: info.color }
            ]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Check size={22} color="#ffffff" />
                <Text style={styles.saveButtonText}>Save Photo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (date && date <= new Date()) {
              setSelectedDate(date);
            }
          }}
          maximumDate={new Date()}
          themeVariant="dark"
        />
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
  },

  bottomSpacer: {
    height: 100,
  },

  // Section
  sectionHeader: {
    marginBottom: 12,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 1.5,
  },

  // Type Selector
  typeSelector: {
    gap: 10,
    paddingRight: 16,
    marginBottom: 12,
  },

  typeCard: {
    width: 76,
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: '#334155',
    position: 'relative',
    overflow: 'hidden',
  },

  typeCardSelected: {
    backgroundColor: '#0f172a',
  },

  typeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },

  typeIconContainerSelected: {
    backgroundColor: '#1e40af',
  },

  typeEmoji: {
    fontSize: 22,
  },

  typeLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94a3b8',
    textAlign: 'center',
  },

  typeLabelSelected: {
    color: '#3b82f6',
  },

  selectedIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },

  // Tip
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 10,
    borderLeftWidth: 3,
  },

  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
  },

  // Preview
  previewContainer: {
    width: '100%',
    height: PREVIEW_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },

  previewImage: {
    width: '100%',
    height: '100%',
  },

  photoTypeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },

  photoTypeBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  placeholderContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: '#1e293b',
    borderStyle: 'dashed',
    borderRadius: 20,
    overflow: 'hidden',
  },

  poseGuide: {
    position: 'absolute',
    top: '15%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  poseGuideEmoji: {
    fontSize: 60,
    opacity: 0.3,
  },

  poseGuideLine: {
    width: 2,
    height: 80,
    backgroundColor: '#334155',
    marginTop: 8,
    opacity: 0.5,
  },

  placeholderContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },

  placeholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginTop: 12,
  },

  placeholderSubtext: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },

  cameraButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },

  cameraButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  galleryButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    borderRadius: 14,
  },

  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },

  retakeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },

  // Date Section
  dateSection: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  dateSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  dateSectionLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },

  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dateArrow: {
    padding: 8,
  },

  dateDisplay: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#334155',
    borderRadius: 10,
  },

  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  dateYear: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  // Notes
  notesSection: {
    marginBottom: 16,
  },

  notesLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 8,
  },

  notesInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#ffffff',
    minHeight: 70,
    textAlignVertical: 'top',
  },

  // Privacy Notice
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14532d',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },

  privacyText: {
    fontSize: 13,
    color: '#86efac',
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
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
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
