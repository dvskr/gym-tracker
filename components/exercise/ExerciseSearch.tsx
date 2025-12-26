import React, { useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Keyboard,
} from 'react-native';
import { Search, X, Dumbbell } from 'lucide-react-native';
import { ExerciseDBExercise, BodyPart } from '@/types/database';
import { useExerciseStore } from '@/stores/exerciseStore';
import { ExerciseItemSkeleton } from '@/components/ui';

interface ExerciseSearchProps {
  onSelectExercise: (exercise: ExerciseDBExercise) => void;
  onClose: () => void;
}

const BODY_PARTS: BodyPart[] = [
  'back',
  'cardio',
  'chest',
  'lower arms',
  'lower legs',
  'neck',
  'shoulders',
  'upper arms',
  'upper legs',
  'waist',
];

// Exercise List Item Component
interface ExerciseItemProps {
  exercise: ExerciseDBExercise;
  onSelect: () => void;
}

const ExerciseItem = memo<ExerciseItemProps>(({ exercise, onSelect }) => (
  <TouchableOpacity
    style={styles.exerciseItem}
    onPress={onSelect}
    activeOpacity={0.7}
  >
    {/* Thumbnail */}
    {exercise.gifUrl ? (
      <Image
        source={{ uri: exercise.gifUrl }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
    ) : (
      <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
        <Dumbbell size={24} color="#64748b" />
      </View>
    )}

    {/* Info */}
    <View style={styles.exerciseInfo}>
      <Text style={styles.exerciseName} numberOfLines={1}>
        {exercise.name}
      </Text>
      <Text style={styles.exerciseMeta} numberOfLines={1}>
        {exercise.target} • {exercise.equipment}
      </Text>
      <Text style={styles.exerciseBodyPart} numberOfLines={1}>
        {exercise.bodyPart}
      </Text>
    </View>

    {/* Chevron */}
    <View style={styles.chevron}>
      <Text style={styles.chevronText}>+</Text>
    </View>
  </TouchableOpacity>
));

ExerciseItem.displayName = 'ExerciseItem';

// Body Part Chip Component
interface BodyPartChipProps {
  bodyPart: BodyPart;
  isSelected: boolean;
  onPress: () => void;
}

const BodyPartChip = memo<BodyPartChipProps>(({ bodyPart, isSelected, onPress }) => (
  <TouchableOpacity
    style={[styles.chip, isSelected && styles.chipSelected]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
      {bodyPart}
    </Text>
  </TouchableOpacity>
));

BodyPartChip.displayName = 'BodyPartChip';

export const ExerciseSearch: React.FC<ExerciseSearchProps> = ({
  onSelectExercise,
  onClose,
}) => {
  const {
    isLoading,
    searchQuery,
    selectedBodyPart,
    error,
    fetchExercises,
    searchExercises,
    filterByBodyPart,
    getFilteredExercises,
    clearFilters,
    clearError,
  } = useExerciseStore();

  // Fetch exercises on mount - force refresh to get all exercises
  useEffect(() => {
    // Force=true to refresh and get all 1300+ exercises (not cached 10)
    fetchExercises(true);
  }, []);

  // Get filtered exercises
  const exercises = getFilteredExercises();

  // Handle search input
  const handleSearchChange = useCallback(
    (text: string) => {
      searchExercises(text);
    },
    [searchExercises]
  );

  // Handle body part filter
  const handleBodyPartPress = useCallback(
    (bodyPart: BodyPart) => {
      if (selectedBodyPart === bodyPart) {
        filterByBodyPart(null);
      } else {
        filterByBodyPart(bodyPart);
      }
    },
    [selectedBodyPart, filterByBodyPart]
  );

  // Handle exercise selection
  const handleSelectExercise = useCallback(
    (exercise: ExerciseDBExercise) => {
      Keyboard.dismiss();
      onSelectExercise(exercise);
    },
    [onSelectExercise]
  );

  // Clear all filters
  const handleClearAll = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  // Render exercise item
  const renderExerciseItem = useCallback(
    ({ item }: { item: ExerciseDBExercise }) => (
      <ExerciseItem
        exercise={item}
        onSelect={() => handleSelectExercise(item)}
      />
    ),
    [handleSelectExercise]
  );

  // Key extractor
  const keyExtractor = useCallback(
    (item: ExerciseDBExercise) => item.id,
    []
  );

  // List empty component
  const ListEmptyComponent = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.skeletonContainer}>
          <ExerciseItemSkeleton />
          <ExerciseItemSkeleton />
          <ExerciseItemSkeleton />
          <ExerciseItemSkeleton />
          <ExerciseItemSkeleton />
          <ExerciseItemSkeleton />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              clearError();
              fetchExercises(true);
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Dumbbell size={48} color="#64748b" />
        <Text style={styles.emptyText}>No exercises found</Text>
        <Text style={styles.emptySubtext}>
          Try a different search or filter
        </Text>
      </View>
    );
  }, [isLoading, error, clearError, fetchExercises]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Add Exercise</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={24} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={handleSearchChange}
          placeholder="Search exercises..."
          placeholderTextColor="#64748b"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => searchExercises('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={18} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      {/* Body Part Filter Chips */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
        >
          {/* Clear All Chip */}
          {(searchQuery || selectedBodyPart) && (
            <TouchableOpacity
              style={[styles.chip, styles.chipClear]}
              onPress={handleClearAll}
            >
              <X size={14} color="#ef4444" />
              <Text style={styles.chipClearText}>Clear</Text>
            </TouchableOpacity>
          )}

          {/* Body Part Chips */}
          {BODY_PARTS.map((bodyPart) => (
            <BodyPartChip
              key={bodyPart}
              bodyPart={bodyPart}
              isSelected={selectedBodyPart === bodyPart}
              onPress={() => handleBodyPartPress(bodyPart)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Results Count */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Exercise List */}
      <FlatList
        data={exercises}
        renderItem={renderExerciseItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews
        getItemLayout={(_, index) => ({
          length: 80,
          offset: 80 * index,
          index,
        })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },

  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },

  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 48,
  },

  searchIcon: {
    marginRight: 12,
  },

  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    paddingVertical: 12,
  },

  filtersContainer: {
    marginTop: 16,
  },

  chipsContent: {
    paddingHorizontal: 20,
    gap: 8,
  },

  chip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },

  chipSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },

  chipText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 'normal',
    textTransform: 'capitalize',
  },

  chipTextSelected: {
    color: '#ffffff',
  },

  chipClear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#450a0a',
    borderColor: '#7f1d1d',
  },

  chipClearText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: 'normal',
  },

  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  resultsText: {
    color: '#64748b',
    fontSize: 13,
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    minHeight: 72,
  },

  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },

  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  exerciseInfo: {
    flex: 1,
    marginLeft: 12,
  },

  exerciseName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    marginBottom: 2,
  },

  exerciseMeta: {
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'capitalize',
    marginBottom: 2,
  },

  exerciseBodyPart: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: 'normal',
    textTransform: 'capitalize',
  },

  chevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  chevronText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },

  skeletonContainer: {
    padding: 16,
    gap: 12,
  },

  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: 'normal',
  },

  emptySubtext: {
    color: '#64748b',
    fontSize: 14,
  },

  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },

  retryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

