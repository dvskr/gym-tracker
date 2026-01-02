import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  Grid3X3,
  Calendar,
  Filter,
  ImageIcon,
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/stores/authStore';
import {
  getPhotos,
  deletePhoto,
  ProgressPhoto,
} from '@/lib/api/photos';
import {
  PhotoType,
  PHOTO_TYPE_LABELS,
} from '@/lib/services/photoService';
import { PhotoGrid } from '@/components/body/PhotoGrid';
import { PhotoViewer } from '@/components/body/PhotoViewer';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { AuthPromptModal } from '@/components/modals/AuthPromptModal';

// ============================================
// Types
// ============================================

type FilterType = 'all' | PhotoType;
type ViewMode = 'grid' | 'timeline';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'front', label: 'Front' },
  { key: 'side_left', label: 'Side (L)' },
  { key: 'side_right', label: 'Side (R)' },
  { key: 'back', label: 'Back' },
  { key: 'flexed_front', label: 'Flexed' },
];

const screenWidth = Dimensions.get('window').width;

// ============================================
// Filter Bar Component
// ============================================

interface FilterBarProps {
  selected: FilterType;
  onSelect: (filter: FilterType) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ selected, onSelect }) => (
  <ScrollView
    horizontal={true}
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.filterBar}
  >
    {FILTERS.map((filter) => (
      <TouchableOpacity
        key={filter.key}
        style={[styles.filterChip, selected === filter.key && styles.filterChipActive]}
        onPress={() => {
          Haptics.selectionAsync();
          onSelect(filter.key);
        }}
      >
        <Text
          style={[
            styles.filterChipText,
            selected === filter.key && styles.filterChipTextActive,
          ]}
        >
          {filter.label}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
);

// ============================================
// Timeline Entry Component
// ============================================

interface TimelineEntryProps {
  date: string;
  photos: ProgressPhoto[];
  onPhotoPress: (photo: ProgressPhoto, index: number) => void;
  startIndex: number;
}

const TimelineEntry: React.FC<TimelineEntryProps> = ({
  date,
  photos,
  onPhotoPress,
  startIndex,
}) => {
  const dateObj = parseISO(date);
  const dateText = format(dateObj, 'MMM d');
  const yearText = format(dateObj, 'yyyy');

  return (
    <View style={styles.timelineEntry}>
      {/* Date Marker */}
      <View style={styles.timelineDateContainer}>
        <Text style={styles.timelineDateText}>{dateText}</Text>
        <Text style={styles.timelineYearText}>{yearText}</Text>
        <View style={styles.timelineLine} />
      </View>

      {/* Photos */}
      <View style={styles.timelinePhotos}>
        {photos.map((photo, index) => (
          <TouchableOpacity
            key={photo.id}
            style={styles.timelinePhoto}
            onPress={() => onPhotoPress(photo, startIndex + index)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: photo.local_uri }}
              style={styles.timelineImage}
              resizeMode="cover"
            />
            <View style={styles.timelinePhotoLabel}>
              <Text style={styles.timelinePhotoType}>
                {PHOTO_TYPE_LABELS[photo.photo_type as PhotoType]}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ============================================
// Timeline View Component
// ============================================

interface TimelineViewProps {
  photos: ProgressPhoto[];
  onPhotoPress: (photo: ProgressPhoto, index: number) => void;
}

const TimelineView: React.FC<TimelineViewProps> = ({ photos, onPhotoPress }) => {
  // Group photos by date
  const groupedByDate = photos.reduce((acc, photo) => {
    const date = photo.taken_at;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(photo);
    return acc;
  }, {} as Record<string, ProgressPhoto[]>);

  const dates = Object.keys(groupedByDate).sort().reverse();

  // Calculate start indices
  let currentIndex = 0;
  const dateIndices: Record<string, number> = {};
  for (const date of dates) {
    dateIndices[date] = currentIndex;
    currentIndex += groupedByDate[date].length;
  }

  return (
    <ScrollView
      style={styles.timelineContainer}
      contentContainerStyle={styles.timelineContent}
      showsVerticalScrollIndicator={false}
    >
      {dates.map((date) => (
        <TimelineEntry
          key={date}
          date={date}
          photos={groupedByDate[date]}
          onPhotoPress={onPhotoPress}
          startIndex={dateIndices[date]}
        />
      ))}
    </ScrollView>
  );
};

// ============================================
// Empty State Component
// ============================================

interface EmptyStateProps {
  onTakePhoto: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onTakePhoto }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIcon}>
      <ImageIcon size={48} color="#475569" />
    </View>
    <Text style={styles.emptyTitle}>No Progress Photos Yet</Text>
    <Text style={styles.emptySubtitle}>
      Take your first progress photo to track your transformation
    </Text>
    <TouchableOpacity style={styles.emptyButton} onPress={onTakePhoto}>
      <Camera size={20} color="#ffffff" />
      <Text style={styles.emptyButtonText}>Take Photo</Text>
    </TouchableOpacity>
  </View>
);

// ============================================
// Main Screen Component
// ============================================

export default function PhotoGalleryScreen() {
  const { user } = useAuthStore();
  
  // Auth guard
  const { requireAuth, showAuthModal, authMessage, closeAuthModal } = useAuthGuard();

  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<ProgressPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Fetch photos
  const fetchPhotos = useCallback(async () => {
    if (!user?.id) return;

    try {
      const data = await getPhotos(user.id);
      setPhotos(data);
    } catch (error) {
      logger.error('Error fetching photos:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Filter photos when filter changes
  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredPhotos(photos);
    } else {
      setFilteredPhotos(photos.filter((p) => p.photo_type === activeFilter));
    }
  }, [photos, activeFilter]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchPhotos();
  }, [fetchPhotos]);

  // Handle photo press
  const handlePhotoPress = (photo: ProgressPhoto, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPhotoIndex(index);
    setViewerVisible(true);
  };

  // Handle delete
  const handleDelete = async (photo: ProgressPhoto) => {
    try {
      await deletePhoto(photo.id);
      fetchPhotos();
    } catch (error) {
      logger.error('Error deleting photo:', error);
    }
  };

  // Toggle view mode
  const toggleViewMode = () => {
    Haptics.selectionAsync();
    setViewMode((prev) => (prev === 'grid' ? 'timeline' : 'grid'));
  };

  // Navigate to capture
  const handleTakePhoto = () => {
    requireAuth(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push('/body/photos/capture');
    }, 'Sign in to capture and track your progress photos.');
  };

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
        <Text style={styles.headerTitle}>Progress Photos</Text>
        <TouchableOpacity style={styles.viewModeButton} onPress={toggleViewMode}>
          {viewMode === 'grid' ? (
            <Calendar size={22} color="#ffffff" />
          ) : (
            <Grid3X3 size={22} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Filter Bar */}
      {photos.length > 0 && (
        <FilterBar selected={activeFilter} onSelect={setActiveFilter} />
      )}

      {/* Content */}
      {photos.length === 0 ? (
        <EmptyState onTakePhoto={handleTakePhoto} />
      ) : filteredPhotos.length === 0 ? (
        <View style={styles.noResultsContainer}>
          <Filter size={32} color="#475569" />
          <Text style={styles.noResultsText}>No photos match this filter</Text>
        </View>
      ) : viewMode === 'grid' ? (
        <PhotoGrid 
          photos={filteredPhotos} 
          onPhotoPress={handlePhotoPress}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      ) : (
        <TimelineView photos={filteredPhotos} onPhotoPress={handlePhotoPress} />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleTakePhoto}>
        <Camera size={24} color="#ffffff" />
      </TouchableOpacity>

      {/* Photo Viewer Modal */}
      <PhotoViewer
        visible={viewerVisible}
        photos={filteredPhotos}
        initialIndex={selectedPhotoIndex}
        onClose={() => setViewerVisible(false)}
        onDelete={handleDelete}
      />
      
      {/* Auth Modal */}
      <AuthPromptModal
        visible={showAuthModal}
        onClose={closeAuthModal}
        message={authMessage}
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

  viewModeButton: {
    padding: 4,
  },

  // Filter Bar
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },

  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    marginRight: 8,
  },

  filterChipActive: {
    backgroundColor: '#3b82f6',
  },

  filterChipText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#94a3b8',
  },

  filterChipTextActive: {
    color: '#ffffff',
  },

  // Timeline
  timelineContainer: {
    flex: 1,
  },

  timelineContent: {
    paddingVertical: 16,
    paddingBottom: 100,
  },

  timelineEntry: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
  },

  timelineDateContainer: {
    width: 60,
    alignItems: 'center',
    paddingTop: 4,
  },

  timelineDateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  timelineYearText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },

  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#334155',
    marginTop: 12,
    marginBottom: -24,
  },

  timelinePhotos: {
    flex: 1,
    marginLeft: 16,
    gap: 12,
  },

  timelinePhoto: {
    borderRadius: 12,
    overflow: 'hidden',
  },

  timelineImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#1e293b',
  },

  timelinePhotoLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },

  timelinePhotoType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },

  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },

  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },

  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },

  emptyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // No Results
  noResultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },

  noResultsText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

