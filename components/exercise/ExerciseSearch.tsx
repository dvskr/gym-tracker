import React, { useEffect, useCallback, memo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Keyboard,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Search, X, Dumbbell, Home, User, Footprints, Circle, ChevronDown, ChevronUp, Star } from 'lucide-react-native';
import { useDebouncedCallback } from 'use-debounce';
import { ExerciseDBExercise, BodyPart } from '@/types/database';
import { useExerciseStore, FILTER_PRESETS, FilterPresetKey } from '@/stores/exerciseStore';
import { ExerciseItemSkeleton } from '@/components/ui';
import { getThumbnailUrl } from '@/lib/utils/exerciseImages';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ExerciseSearchProps {
  onSelectExercise: (exercise: ExerciseDBExercise) => void;
  onClose: () => void;
}

// Icon map for filter presets
const iconMap: Record<string, any> = {
  Home,
  Dumbbell,
  User,
  Footprints,
  Circle,
};

// Body part mapping for simpler chip names
const BODY_PART_FILTERS = [
  { label: 'All', value: null },
  { label: 'Chest', value: 'chest' },
  { label: 'Back', value: 'back' },
  { label: 'Shoulders', value: 'shoulders' },
  { label: 'Arms', value: 'arms' },
  { label: 'Legs', value: 'legs' },
  { label: 'Core', value: 'waist' },
  { label: 'Full Body', value: 'full body' },
  { label: 'Cardio', value: 'cardio' },
] as const;

// Equipment filter options
const EQUIPMENT_FILTERS = [
  { label: 'All', value: null },
  { label: 'Barbell', value: 'barbell' },
  { label: 'Dumbbell', value: 'dumbbell' },
  { label: 'Bodyweight', value: 'body weight' },
  { label: 'Cable', value: 'cable' },
  { label: 'Machine', value: 'leverage machine' },
  { label: 'Smith', value: 'smith machine' },
  { label: 'Kettlebell', value: 'kettlebell' },
  { label: 'Band', value: 'band' },
] as const;

// Exercise List Item Component
interface ExerciseItemProps {
  exercise: ExerciseDBExercise;
  onSelect: (exercise: ExerciseDBExercise) => void;
}

const ExerciseItem = memo<ExerciseItemProps>(({ exercise, onSelect }) => {
  const handlePress = useCallback(() => {
    onSelect(exercise);
  }, [exercise, onSelect]);

  return (
  <TouchableOpacity
    style={styles.exerciseItem}
    onPress={handlePress}
    activeOpacity={0.7}
  >
    {/* Thumbnail */}
    {exercise.gifUrl ? (
      <Image
        source={{ uri: getThumbnailUrl(exercise.gifUrl) }}
        style={styles.thumbnail}
        contentFit="cover"
        cachePolicy="memory-disk"
        placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
        transition={150}
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
  );
});

ExerciseItem.displayName = 'ExerciseItem';

export const ExerciseSearch: React.FC<ExerciseSearchProps> = ({
  onSelectExercise,
  onClose,
}) => {
  const {
    isLoading,
    searchQuery,
    selectedBodyPart,
    selectedEquipment,
    activePreset,
    error,
    fetchExercises,
    searchExercises,
    filterByBodyPart,
    filterByEquipment,
    applyFilterPreset,
    clearPreset,
    getFilteredExercises,
    clearFilters,
    clearAllFilters,
    clearError,
    loadFavorites,
    getFavoriteExercises,
  } = useExerciseStore();

  // Local state for immediate UI feedback
  const [localSearchText, setLocalSearchText] = useState(searchQuery);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Calculate active filter count (excluding search)
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (selectedBodyPart) count++;
    if (selectedEquipment) count++;
    if (activePreset) count++;
    return count;
  }, [selectedBodyPart, selectedEquipment, activePreset]);

  // Sync local state with store when store changes (e.g., when cleared)
  useEffect(() => {
    setLocalSearchText(searchQuery);
  }, [searchQuery]);

  // Fetch exercises and favorites on mount
  useEffect(() => {
    // Force=true to refresh and get all 1300+ exercises (not cached 10)
    fetchExercises(true);
    loadFavorites();
  }, []);

  // Get filtered exercises or favorites
  const allExercises = getFilteredExercises();
  const favoriteExercises = getFavoriteExercises();
  const exercises = showFavoritesOnly ? favoriteExercises : allExercises;

  // Create debounced search handler (300ms delay)
  const debouncedSearch = useDebouncedCallback((text: string) => {
    searchExercises(text);
  }, 300);

  // Handle search input with immediate local state update
  const handleSearchChange = useCallback(
    (text: string) => {
      setLocalSearchText(text); // Update local state immediately for responsive UI
      debouncedSearch(text);     // Debounced store update for filtering
    },
    [debouncedSearch]
  );

  // Handle clear search
  const handleClearSearch = useCallback(() => {
    setLocalSearchText('');
    searchExercises('');
    debouncedSearch.cancel(); // Cancel any pending debounced calls
  }, [searchExercises, debouncedSearch]);

  // Toggle filter panel
  const toggleFilterPanel = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsFilterExpanded((prev) => !prev);
  }, []);

  // Handle body part filter
  const handleBodyPartPress = useCallback(
    (bodyPart: string | null) => {
      filterByBodyPart(bodyPart as BodyPart | null);
    },
    [filterByBodyPart]
  );

  // Handle exercise selection - convert DisplayExercise to ExerciseDBExercise with dbId
  const handleSelectExercise = useCallback(
    (exercise: any) => { // Using 'any' because exercises are actually DisplayExercise but typed as ExerciseDBExercise
      Keyboard.dismiss();
      
      // Convert to ExerciseDBExercise with dbId
      const exerciseForWorkout: ExerciseDBExercise = {
        id: exercise.externalId || exercise.id, // Use externalId if available
        dbId: exercise.id, // Store the database UUID
        name: exercise.name,
        bodyPart: exercise.bodyPart,
        target: exercise.target,
        equipment: exercise.equipment,
        gifUrl: exercise.gifUrl,
        secondaryMuscles: exercise.secondaryMuscles || [],
        instructions: exercise.instructions || [],
        measurementType: exercise.measurementType,
      };
      
      onSelectExercise(exerciseForWorkout);
    },
    [onSelectExercise]
  );

  // Clear all filters
  const handleClearAll = useCallback(() => {
    setLocalSearchText('');
    clearAllFilters();
    debouncedSearch.cancel();
  }, [clearAllFilters, debouncedSearch]);

  // Render exercise item
  const renderExerciseItem = useCallback(
    ({ item }: { item: ExerciseDBExercise }) => (
      <ExerciseItem
        exercise={item}
        onSelect={handleSelectExercise}
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
        <View style={styles.searchInputWrapper}>
          <Search size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={localSearchText}
            onChangeText={handleSearchChange}
            placeholder="Search exercises..."
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {localSearchText.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Toggle Button */}
        <TouchableOpacity
          style={[
            styles.filterToggleButton,
            (isFilterExpanded || activeFilterCount > 0) && styles.filterToggleButtonActive,
          ]}
          onPress={toggleFilterPanel}
          activeOpacity={0.7}
        >
          {isFilterExpanded ? (
            <ChevronUp size={18} color={activeFilterCount > 0 ? '#ffffff' : '#64748b'} />
          ) : (
            <ChevronDown size={18} color={activeFilterCount > 0 ? '#ffffff' : '#64748b'} />
          )}
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Expandable Filter Panel */}
      {isFilterExpanded && (
        <View style={styles.filterPanel}>
          {/* Body Part Section */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionLabel}>BODY PART</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {BODY_PART_FILTERS.map((filter) => {
                const isSelected = selectedBodyPart === filter.value;
                return (
                  <TouchableOpacity
                    key={filter.label}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => handleBodyPartPress(filter.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Equipment Section */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionLabel}>EQUIPMENT</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {EQUIPMENT_FILTERS.map((filter) => {
                const isSelected = selectedEquipment === filter.value;
                return (
                  <TouchableOpacity
                    key={filter.label}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => filterByEquipment(isSelected ? null : filter.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Quick Filters Section */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionLabel}>QUICK FILTERS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {Object.entries(FILTER_PRESETS).map(([key, preset]) => {
                const Icon = iconMap[preset.icon];
                const isActive = activePreset === key;
                
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.chip, styles.presetChip, isActive && styles.chipSelected]}
                    onPress={() => {
                      isActive ? clearPreset() : applyFilterPreset(key as FilterPresetKey);
                    }}
                    activeOpacity={0.7}
                  >
                    {Icon && <Icon size={14} color={isActive ? '#ffffff' : '#9ca3af'} />}
                    <Text
                      style={[
                        styles.chipText,
                        isActive && styles.chipTextSelected,
                      ]}
                    >
                      {preset.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Bottom Row: Clear All */}
          <View style={styles.filterBottomRow}>
            {activeFilterCount > 0 && (
              <TouchableOpacity
                style={styles.clearAllButton}
                onPress={handleClearAll}
                activeOpacity={0.7}
              >
                <X size={14} color="#ef4444" />
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Favorites Toggle */}
      {favoriteExercises.length > 0 && (
        <View style={styles.favoritesToggleRow}>
          <TouchableOpacity
            style={[
              styles.favoritesToggle,
              showFavoritesOnly && styles.favoritesToggleActive,
            ]}
            onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
            activeOpacity={0.7}
          >
            <Star
              size={16}
              color={showFavoritesOnly ? '#fbbf24' : '#64748b'}
              fill={showFavoritesOnly ? '#fbbf24' : 'transparent'}
            />
            <Text
              style={[
                styles.favoritesToggleText,
                showFavoritesOnly && styles.favoritesToggleTextActive,
              ]}
            >
              Favorites ({favoriteExercises.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results Count */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Exercise List - FlashList for better performance with large lists */}
      <FlashList
        data={exercises}
        renderItem={renderExerciseItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
    marginHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },

  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
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

  filterToggleButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },

  filterToggleButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },

  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },

  filterBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },

  filterPanel: {
    marginTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },

  filterSection: {
    marginBottom: 16,
  },

  filterSectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 20,
  },

  chipsRow: {
    paddingHorizontal: 20,
    gap: 8,
  },

  filterBottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    marginTop: 8,
  },

  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
  },

  clearAllText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
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
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#ef4444',
  },

  chipClearText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: 'normal',
  },

  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  favoritesToggleRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  favoritesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#334155',
  },

  favoritesToggleActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderColor: '#fbbf24',
  },

  favoritesToggleText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },

  favoritesToggleTextActive: {
    color: '#fbbf24',
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

