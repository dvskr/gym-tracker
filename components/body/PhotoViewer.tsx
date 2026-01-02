import React, { useState, useRef } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  FlatList,
  Share,
  Alert,
  StatusBar,
} from 'react-native';
import { format, parseISO } from 'date-fns';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Share2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ProgressPhoto } from '@/lib/api/photos';
import { PHOTO_TYPE_LABELS, PhotoType } from '@/lib/services/photoService';

// ============================================
// Types
// ============================================

interface PhotoViewerProps {
  visible: boolean;
  photos: ProgressPhoto[];
  initialIndex: number;
  onClose: () => void;
  onDelete: (photo: ProgressPhoto) => void;
}

// ============================================
// Constants
// ============================================

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ============================================
// Main Component
// ============================================

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  visible,
  photos,
  initialIndex,
  onClose,
  onDelete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  // Reset index when modal opens
  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      // Scroll to initial index
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
        });
      }, 100);
    }
  }, [visible, initialIndex]);

  const currentPhoto = photos[currentIndex];

  // Handle scroll end
  const handleScrollEnd = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffset / screenWidth);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < photos.length) {
      setCurrentIndex(newIndex);
      Haptics.selectionAsync();
    }
  };

  // Navigate to previous
  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
      setCurrentIndex(newIndex);
      Haptics.selectionAsync();
    }
  };

  // Navigate to next
  const goToNext = () => {
    if (currentIndex < photos.length - 1) {
      const newIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
      setCurrentIndex(newIndex);
      Haptics.selectionAsync();
    }
  };

  // Handle share
  const handleShare = async () => {
    if (!currentPhoto) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        message: `Progress photo - ${PHOTO_TYPE_LABELS[currentPhoto.photo_type as PhotoType]} (${format(parseISO(currentPhoto.taken_at), 'MMM d, yyyy')})`,
        url: currentPhoto.local_uri,
      });
    } catch (error) {
 logger.error('Error sharing photo:', error);
    }
  };

  // Handle delete
  const handleDelete = () => {
    if (!currentPhoto) return;

    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onDelete(currentPhoto);
            
            // If this was the last photo, close the viewer
            if (photos.length <= 1) {
              onClose();
            } else if (currentIndex >= photos.length - 1) {
              // If we deleted the last photo, go to previous
              setCurrentIndex(currentIndex - 1);
            }
          },
        },
      ]
    );
  };

  // Handle close
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  // Render photo item
  const renderPhoto = ({ item }: { item: ProgressPhoto }) => (
    <View style={styles.photoContainer}>
      <Image
        source={{ uri: item.local_uri }}
        style={styles.fullImage}
        resizeMode="contain"
      />
    </View>
  );

  if (!currentPhoto) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.photoType}>
              {PHOTO_TYPE_LABELS[currentPhoto.photo_type as PhotoType]}
            </Text>
            <Text style={styles.photoDate}>
              {format(parseISO(currentPhoto.taken_at), 'MMMM d, yyyy')}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Share2 size={22} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
              <Trash2 size={22} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Photo Carousel */}
        <FlatList
          ref={flatListRef}
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id}
          horizontal={true}
          pagingEnabled={true}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          getItemLayout={(_, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
          initialScrollIndex={initialIndex}
        />

        {/* Navigation Arrows */}
        {currentIndex > 0 && (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonLeft]}
            onPress={goToPrevious}
          >
            <ChevronLeft size={32} color="#ffffff" />
          </TouchableOpacity>
        )}
        {currentIndex < photos.length - 1 && (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonRight]}
            onPress={goToNext}
          >
            <ChevronRight size={32} color="#ffffff" />
          </TouchableOpacity>
        )}

        {/* Footer / Pagination */}
        <View style={styles.footer}>
          <Text style={styles.pagination}>
            {currentIndex + 1} / {photos.length}
          </Text>
          {currentPhoto.notes && (
            <Text style={styles.notes} numberOfLines={2}>
              {currentPhoto.notes}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  closeButton: {
    padding: 8,
  },

  headerInfo: {
    alignItems: 'center',
  },

  photoType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  photoDate: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },

  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },

  actionButton: {
    padding: 8,
  },

  // Photo
  photoContainer: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  fullImage: {
    width: screenWidth,
    height: screenHeight * 0.7,
  },

  // Navigation
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  navButtonLeft: {
    left: 16,
  },

  navButtonRight: {
    right: 16,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
  },

  pagination: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  notes: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default PhotoViewer;
