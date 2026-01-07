import React, { memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  RefreshControl,
} from 'react-native';
import { format, parseISO } from 'date-fns';
import { ProgressPhoto } from '@/lib/api/photos';
import { PHOTO_TYPE_LABELS, PhotoType } from '@/lib/services/photoService';

// ============================================
// Types
// ============================================

interface PhotoGridProps {
  photos: ProgressPhoto[];
  onPhotoPress: (photo: ProgressPhoto, index: number) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

interface MonthGroup {
  key: string;
  title: string;
  photos: ProgressPhoto[];
}

// ============================================
// Constants
// ============================================

const screenWidth = Dimensions.get('window').width;
const GRID_GAP = 4;
const NUM_COLUMNS = 3;
// Calculate photo size accounting for gaps and padding
// Total gaps = (NUM_COLUMNS - 1) gaps between photos + 2 * side padding
const TOTAL_HORIZONTAL_PADDING = GRID_GAP * 2; // Left and right padding
const TOTAL_GAPS = GRID_GAP * (NUM_COLUMNS - 1); // Gaps between photos
const PHOTO_SIZE = (screenWidth - TOTAL_HORIZONTAL_PADDING - TOTAL_GAPS) / NUM_COLUMNS;

// ============================================
// Helper Functions
// ============================================

function groupPhotosByMonth(photos: ProgressPhoto[]): MonthGroup[] {
  const groups = new Map<string, ProgressPhoto[]>();

  for (const photo of photos) {
    const date = parseISO(photo.taken_at);
    const key = format(date, 'yyyy-MM');
    const existing = groups.get(key) || [];
    existing.push(photo);
    groups.set(key, existing);
  }

  return Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0])) // Sort descending
    .map(([key, photos]) => ({
      key,
      title: format(parseISO(`${key}-01`), 'MMMM yyyy'),
      photos,
    }));
}

// ============================================
// Photo Thumbnail Component
// ============================================

interface PhotoThumbnailProps {
  photo: ProgressPhoto;
  onPress: () => void;
}

const PhotoThumbnailInner: React.FC<PhotoThumbnailProps> = ({ photo, onPress }) => {
  const dateObj = parseISO(photo.taken_at);
  const dateText = format(dateObj, 'MMM d');

  return (
    <TouchableOpacity style={styles.thumbnailContainer} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: photo.local_uri }} style={styles.thumbnail} resizeMode="cover" />
      {/* Date badge at top */}
      <View style={styles.thumbnailDateBadge}>
        <Text style={styles.thumbnailDate}>{dateText}</Text>
      </View>
      {/* Type label at bottom */}
      <View style={styles.thumbnailOverlay}>
        <Text style={styles.thumbnailType}>
          {PHOTO_TYPE_LABELS[photo.photo_type as PhotoType] || photo.photo_type}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const PhotoThumbnail = memo(PhotoThumbnailInner);
PhotoThumbnail.displayName = 'PhotoThumbnail';

// ============================================
// Month Section Component
// ============================================

interface MonthSectionProps {
  group: MonthGroup;
  onPhotoPress: (photo: ProgressPhoto, globalIndex: number) => void;
  startIndex: number;
}

const MonthSectionInner: React.FC<MonthSectionProps> = ({ group, onPhotoPress, startIndex }) => {
  // Pad photos to fill row if needed
  const paddedPhotos = [...group.photos];
  const remainder = paddedPhotos.length % NUM_COLUMNS;
  if (remainder > 0) {
    for (let i = 0; i < NUM_COLUMNS - remainder; i++) {
      paddedPhotos.push(null as unknown as ProgressPhoto);
    }
  }

  return (
    <View style={styles.monthSection}>
      <View style={styles.monthHeader}>
        <Text style={styles.monthTitle}>{group.title}</Text>
        <Text style={styles.monthCount}>
          {group.photos.length} photo{group.photos.length !== 1 ? 's' : ''}
        </Text>
      </View>
      <View style={styles.photoGrid}>
        {paddedPhotos.map((photo, index) => {
          if (!photo) {
            return <View key={`empty-${index}`} style={styles.emptyThumbnail} />;
          }
          return (
            <PhotoThumbnail
              key={photo.id}
              photo={photo}
              onPress={() => onPhotoPress(photo, startIndex + index)}
            />
          );
        })}
      </View>
    </View>
  );
};

const MonthSection = memo(MonthSectionInner);
MonthSection.displayName = 'MonthSection';

// ============================================
// Main Component
// ============================================

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  onPhotoPress,
  refreshing = false,
  onRefresh,
}) => {
  const groups = groupPhotosByMonth(photos);

  // Calculate global indices for each photo
  let currentIndex = 0;
  const groupsWithIndices = groups.map((group) => {
    const startIndex = currentIndex;
    currentIndex += group.photos.length;
    return { ...group, startIndex };
  });

  if (photos.length === 0) {
    return null;
  }

  return (
    <FlatList
      data={groupsWithIndices}
      keyExtractor={(item) => item.key}
      renderItem={({ item }) => (
        <MonthSection group={item} onPhotoPress={onPhotoPress} startIndex={item.startIndex} />
      )}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        ) : undefined
      }
    />
  );
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 100,
    paddingTop: 8,
  },

  monthSection: {
    marginBottom: 24,
  },

  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(2, 6, 23, 0.9)',
    marginBottom: 4,
  },

  monthTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },

  monthCount: {
    fontSize: 12,
    color: '#64748b',
  },

  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_GAP,
    gap: GRID_GAP,
  },

  thumbnailContainer: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
  },

  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1e293b',
  },

  thumbnailDateBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
  },

  thumbnailDate: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },

  thumbnailOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },

  thumbnailType: {
    fontSize: 9,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },

  emptyThumbnail: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    backgroundColor: 'transparent',
  },
});

export default PhotoGrid;
