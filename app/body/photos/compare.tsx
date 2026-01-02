import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
  Share,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Columns2,
  SlidersHorizontal,
  Share2,
  Download,
  X,
  Check,
  Calendar,
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/stores/authStore';
import { getPhotos, ProgressPhoto } from '@/lib/api/photos';
import { PhotoType, PHOTO_TYPE_LABELS } from '@/lib/services/photoService';
import { ComparisonSlider } from '@/components/body/ComparisonSlider';
import { calculateTimeDifference, saveComparisonImage } from '@/lib/utils/photoComparison';

// ============================================
// Types
// ============================================

type ComparisonMode = 'side-by-side' | 'slider';
type SelectingPhoto = 'before' | 'after' | null;

const screenWidth = Dimensions.get('window').width;

// ============================================
// Photo Selector Card Component
// ============================================

interface PhotoSelectorProps {
  label: string;
  photo: ProgressPhoto | null;
  onSelect: () => void;
  color: string;
}

const PhotoSelector: React.FC<PhotoSelectorProps> = ({
  label,
  photo,
  onSelect,
  color,
}) => (
  <TouchableOpacity style={styles.selectorCard} onPress={onSelect} activeOpacity={0.8}>
    <View style={[styles.selectorLabel, { backgroundColor: color }]}>
      <Text style={styles.selectorLabelText}>{label}</Text>
    </View>
    {photo ? (
      <>
        <Image
          source={{ uri: photo.local_uri }}
          style={styles.selectorImage}
          resizeMode="cover"
        />
        <View style={styles.selectorInfo}>
          <Text style={styles.selectorType}>
            {PHOTO_TYPE_LABELS[photo.photo_type as PhotoType]}
          </Text>
          <Text style={styles.selectorDate}>
            {format(parseISO(photo.taken_at), 'MMM d, yyyy')}
          </Text>
        </View>
      </>
    ) : (
      <View style={styles.selectorPlaceholder}>
        <Text style={styles.selectorPlaceholderText}>Tap to select</Text>
      </View>
    )}
  </TouchableOpacity>
);

// ============================================
// Photo Selection Modal Component
// ============================================

interface PhotoSelectionModalProps {
  visible: boolean;
  photos: ProgressPhoto[];
  selectedPhoto: ProgressPhoto | null;
  onSelect: (photo: ProgressPhoto) => void;
  onClose: () => void;
  title: string;
}

const PhotoSelectionModal: React.FC<PhotoSelectionModalProps> = ({
  visible,
  photos,
  selectedPhoto,
  onSelect,
  onClose,
  title,
}) => {
  const [filter, setFilter] = useState<PhotoType | 'all'>('all');

  const filteredPhotos = filter === 'all'
    ? photos
    : photos.filter(p => p.photo_type === filter);

  const filters: { key: PhotoType | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'front', label: 'Front' },
    { key: 'side_left', label: 'Side' },
    { key: 'back', label: 'Back' },
    { key: 'flexed_front', label: 'Flexed' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{title}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Filter Bar */}
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modalFilterBar}
        >
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.modalFilterChip, filter === f.key && styles.modalFilterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  styles.modalFilterText,
                  filter === f.key && styles.modalFilterTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Photo Grid */}
        <FlatList
          data={filteredPhotos}
          numColumns={3}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.modalGrid}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.modalGridItem,
                selectedPhoto?.id === item.id && styles.modalGridItemSelected,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                onSelect(item);
                onClose();
              }}
            >
              <Image
                source={{ uri: item.local_uri }}
                style={styles.modalGridImage}
                resizeMode="cover"
              />
              <View style={styles.modalGridOverlay}>
                <Text style={styles.modalGridDate}>
                  {format(parseISO(item.taken_at), 'M/d/yy')}
                </Text>
              </View>
              {selectedPhoto?.id === item.id && (
                <View style={styles.modalGridCheck}>
                  <Check size={16} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.modalEmpty}>
              <Text style={styles.modalEmptyText}>No photos found</Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
};

// ============================================
// Main Screen Component
// ============================================

export default function ComparePhotosScreen() {
  const { user } = useAuthStore();

  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [beforePhoto, setBeforePhoto] = useState<ProgressPhoto | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<ProgressPhoto | null>(null);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('side-by-side');
  const [selectingPhoto, setSelectingPhoto] = useState<SelectingPhoto>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch photos
  const fetchPhotos = useCallback(async () => {
    if (!user?.id) return;

    try {
      const data = await getPhotos(user.id);
      setPhotos(data);

      // Auto-select first and last photos of same type if available
      if (data.length >= 2) {
        const sortedByDate = [...data].sort(
          (a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime()
        );
        setBeforePhoto(sortedByDate[0]);
        setAfterPhoto(sortedByDate[sortedByDate.length - 1]);
      }
    } catch (error) {
      logger.error('Error fetching photos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Handle share
  const handleShare = async () => {
    if (!beforePhoto || !afterPhoto) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const timeDiff = calculateTimeDifference(beforePhoto.taken_at, afterPhoto.taken_at);
      
      await Share.share({
        message: `Check out my progress! ðŸ’ª ${timeDiff}`,
        // In a full implementation, we'd create a combined image and share its URI
      });
    } catch (error) {
      logger.error('Error sharing:', error);
    }
  };

  // Handle save comparison
  const handleSaveComparison = async () => {
    if (!afterPhoto) return;

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await saveComparisonImage(afterPhoto.local_uri);
      Alert.alert('Saved', 'Comparison saved to your device');
    } catch (error) {
      logger.error('Error saving comparison:', error);
      Alert.alert('Error', 'Failed to save comparison');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle comparison mode
  const toggleMode = () => {
    Haptics.selectionAsync();
    setComparisonMode((prev) =>
      prev === 'side-by-side' ? 'slider' : 'side-by-side'
    );
  };

  // Calculate time difference
  const timeDifference =
    beforePhoto && afterPhoto
      ? calculateTimeDifference(beforePhoto.taken_at, afterPhoto.taken_at)
      : null;

  // Check if photos are selected
  const hasPhotos = beforePhoto && afterPhoto;

  // Loading
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Compare Photos</Text>
        <TouchableOpacity style={styles.modeButton} onPress={toggleMode}>
          {comparisonMode === 'side-by-side' ? (
            <SlidersHorizontal size={22} color="#ffffff" />
          ) : (
            <Columns2 size={22} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Selectors */}
        <View style={styles.selectorsRow}>
          <PhotoSelector
            label="BEFORE"
            photo={beforePhoto}
            onSelect={() => setSelectingPhoto('before')}
            color="#f59e0b"
          />
          <PhotoSelector
            label="AFTER"
            photo={afterPhoto}
            onSelect={() => setSelectingPhoto('after')}
            color="#22c55e"
          />
        </View>

        {/* Comparison View */}
        {hasPhotos ? (
          <>
            {comparisonMode === 'side-by-side' ? (
              <View style={styles.sideBySideContainer}>
                <View style={styles.sideBySidePhoto}>
                  <Image
                    source={{ uri: beforePhoto.local_uri }}
                    style={styles.sideBySideImage}
                    resizeMode="cover"
                  />
                  <View style={[styles.photoLabel, { backgroundColor: '#f59e0b' }]}>
                    <Text style={styles.photoLabelText}>Before</Text>
                  </View>
                </View>
                <View style={styles.sideBySideGap} />
                <View style={styles.sideBySidePhoto}>
                  <Image
                    source={{ uri: afterPhoto.local_uri }}
                    style={styles.sideBySideImage}
                    resizeMode="cover"
                  />
                  <View style={[styles.photoLabel, { backgroundColor: '#22c55e' }]}>
                    <Text style={styles.photoLabelText}>After</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.sliderContainer}>
                <ComparisonSlider
                  beforeUri={beforePhoto.local_uri}
                  afterUri={afterPhoto.local_uri}
                  height={400}
                />
                <View style={styles.sliderLabels}>
                  <View style={styles.sliderLabelRow}>
                    <View style={[styles.sliderLabelDot, { backgroundColor: '#f59e0b' }]} />
                    <Text style={styles.sliderLabelText}>Before</Text>
                  </View>
                  <View style={styles.sliderLabelRow}>
                    <View style={[styles.sliderLabelDot, { backgroundColor: '#22c55e' }]} />
                    <Text style={styles.sliderLabelText}>After</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Info Bar */}
            <View style={styles.infoBar}>
              <View style={styles.infoItem}>
                <Calendar size={18} color="#64748b" />
                <Text style={styles.infoText}>{timeDifference}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleSaveComparison}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Download size={20} color="#ffffff" />
                    <Text style={styles.actionButtonText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                <Share2 size={20} color="#ffffff" />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.emptyComparison}>
            <Text style={styles.emptyText}>Select photos to compare</Text>
            <Text style={styles.emptySubtext}>
              Tap the cards above to choose your before and after photos
            </Text>
          </View>
        )}

        {/* Bottom spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Photo Selection Modal */}
      <PhotoSelectionModal
        visible={selectingPhoto !== null}
        photos={photos}
        selectedPhoto={selectingPhoto === 'before' ? beforePhoto : afterPhoto}
        onSelect={(photo) => {
          if (selectingPhoto === 'before') {
            setBeforePhoto(photo);
          } else {
            setAfterPhoto(photo);
          }
        }}
        onClose={() => setSelectingPhoto(null)}
        title={`Select ${selectingPhoto === 'before' ? 'Before' : 'After'} Photo`}
      />
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

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
  },

  bottomSpacer: {
    height: 40,
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

  modeButton: {
    padding: 4,
  },

  // Photo Selectors
  selectorsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },

  selectorCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
    height: 140,
  },

  selectorLabel: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 6,
    zIndex: 10,
  },

  selectorLabelText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },

  selectorImage: {
    width: '100%',
    height: '100%',
  },

  selectorInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },

  selectorType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  selectorDate: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },

  selectorPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectorPlaceholderText: {
    fontSize: 13,
    color: '#64748b',
  },

  // Side by Side View
  sideBySideContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },

  sideBySidePhoto: {
    flex: 1,
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },

  sideBySideGap: {
    width: 2,
    backgroundColor: '#020617',
  },

  sideBySideImage: {
    width: '100%',
    height: '100%',
  },

  photoLabel: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },

  photoLabelText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Slider View
  sliderContainer: {
    marginBottom: 16,
  },

  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 12,
  },

  sliderLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  sliderLabelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  sliderLabelText: {
    fontSize: 13,
    color: '#94a3b8',
  },

  // Info Bar
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },

  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  infoText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },

  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },

  actionButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Empty State
  emptyComparison: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },

  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },

  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#020617',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  modalFilterBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },

  modalFilterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    marginRight: 8,
  },

  modalFilterChipActive: {
    backgroundColor: '#3b82f6',
  },

  modalFilterText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#94a3b8',
  },

  modalFilterTextActive: {
    color: '#ffffff',
  },

  modalGrid: {
    padding: 2,
  },

  modalGridItem: {
    flex: 1 / 3,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },

  modalGridItemSelected: {
    borderWidth: 3,
    borderColor: '#3b82f6',
  },

  modalGridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1e293b',
  },

  modalGridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },

  modalGridDate: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },

  modalGridCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },

  modalEmptyText: {
    fontSize: 16,
    color: '#64748b',
  },
});

