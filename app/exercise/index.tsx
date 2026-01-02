import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ScrollView,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Search, Dumbbell, X, Star, Heart, Zap, Target, Flame, Activity, Weight, Cog, User, Circle, Disc, PlusCircle, Home, Footprints, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useDebouncedCallback } from 'use-debounce';
import { useExerciseStore, FILTER_PRESETS, FilterPresetKey } from '@/stores/exerciseStore';
import { lightHaptic } from '@/lib/utils/haptics';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
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
  { label: 'Arms', value: 'arms' },      // Matches both upper and lower arms
  { label: 'Legs', value: 'legs' },      // Matches both upper and lower legs
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

// Helper function to get category-specific icon
const getExerciseIcon = (bodyPart: string) => {
  const part = bodyPart.toLowerCase();
  
  if (part.includes('legs')) return Target;
  if (part.includes('back')) return Flame;
  if (part.includes('cardio')) return Heart;
  if (part.includes('waist') || part.includes('core') || part.includes('abs')) return Zap;
  if (part.includes('chest')) return Activity;
  if (part.includes('full body')) return Activity;
  
  return Dumbbell; // Default for arms, shoulders, neck, etc.
};

// Helper function to get equipment-based icon
const getEquipmentIcon = (equipment: string) => {
  const equip = equipment.toLowerCase();
  
  // Barbell exercises
  if (equip.includes('barbell')) return Weight;
  
  // Dumbbell exercises
  if (equip.includes('dumbbell')) return Dumbbell;
  
  // Cable exercises
  if (equip.includes('cable')) return Zap;
  
  // Machine exercises
  if (equip.includes('machine') || equip.includes('smith')) return Cog;
  
  // Bodyweight exercises
  if (equip.includes('bodyweight') || equip.includes('assisted')) return User;
  
  // Bands/Resistance
  if (equip.includes('band') || equip.includes('resistance')) return Circle;
  
  // Cardio
  if (equip.includes('cardio') || equip.includes('treadmill') || equip.includes('bike')) return Heart;
  
  // Leverage/Plate exercises
  if (equip.includes('leverage') || equip.includes('sled')) return Disc;
  
  // Default fallback
  return Dumbbell;
};

// Helper function to get equipment-based icon color
const getEquipmentColor = (equipment: string) => {
  const equip = equipment.toLowerCase();
  
  if (equip.includes('barbell')) return '#3b82f6';      // Blue
  if (equip.includes('dumbbell')) return '#8b5cf6';     // Purple
  if (equip.includes('cable')) return '#eab308';        // Yellow
  if (equip.includes('machine')) return '#06b6d4';      // Cyan
  if (equip.includes('bodyweight')) return '#10b981';   // Green
  if (equip.includes('band')) return '#f59e0b';         // Orange
  if (equip.includes('cardio')) return '#ef4444';       // Red
  if (equip.includes('leverage') || equip.includes('sled')) return '#ec4899'; // Pink
  
  return '#3b82f6'; // Default blue
};

interface ExerciseItemProps {
  exercise: {
    id: string;
    name: string;
    equipment: string;
    target: string;
    bodyPart: string;
    gifUrl?: string | null;
    thumbnailUrl?: string | null;
  };
  onPress: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  showFavoriteIcon?: boolean;
}

const ExerciseItem: React.FC<ExerciseItemProps> = ({ 
  exercise, 
  onPress, 
  isFavorite = false,
  onToggleFavorite,
  showFavoriteIcon = true 
}) => {
  // Use direct thumbnail URL from database instead of deriving it
  const thumbnailUrl = exercise.thumbnailUrl || null;
  const EquipmentIcon = getEquipmentIcon(exercise.equipment);
  const iconColor = getEquipmentColor(exercise.equipment);
  
  // Get color for body part tag
  const getBodyPartColor = (bodyPart: string) => {
    const colors: Record<string, string> = {
      chest: '#3b82f6',
      back: '#10b981',
      shoulders: '#f59e0b',
      'upper arms': '#8b5cf6',
      'lower arms': '#8b5cf6',
      'upper legs': '#ec4899',
      'lower legs': '#ec4899',
      waist: '#ef4444',
      cardio: '#14b8a6',
      neck: '#6366f1',
      'full body': '#f97316', // Orange for full body compound movements
    };
    return colors[bodyPart.toLowerCase()] || '#64748b';
  };

  return (
    <TouchableOpacity
      style={styles.exerciseItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Thumbnail or Equipment-Based Icon */}
      <View style={styles.iconWrapper}>
        {thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.iconPlaceholder, { backgroundColor: iconColor + '20' }]}>
            <EquipmentIcon size={24} color={iconColor} />
          </View>
        )}
      </View>

      {/* Exercise Info */}
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName} numberOfLines={1}>
          {exercise.name}
        </Text>
        <Text style={styles.exerciseEquipment} numberOfLines={1}>
          {exercise.equipment}
        </Text>
        <View style={styles.tagContainer}>
          <View
            style={[
              styles.muscleTag,
              { backgroundColor: `${getBodyPartColor(exercise.bodyPart)}20` },
            ]}
          >
            <Text
              style={[
                styles.muscleTagText,
                { color: getBodyPartColor(exercise.bodyPart) },
              ]}
              numberOfLines={1}
            >
              {exercise.target}
            </Text>
          </View>
        </View>
      </View>

      {/* Favorite Star */}
      {showFavoriteIcon && onToggleFavorite && (
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Star
            size={20}
            color={isFavorite ? '#fbbf24' : '#64748b'}
            fill={isFavorite ? '#fbbf24' : 'transparent'}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

export default function ExerciseLibraryScreen() {
  const {
    isLoading,
    searchQuery,
    selectedBodyPart,
    selectedEquipment,
    error,
    fetchExercises,
    clearCache,
    searchExercises,
    filterByBodyPart,
    filterByEquipment,
    getFilteredExercises,
    clearFilters,
    clearAllFilters,
    getRecentlyUsedExercises,
    getFavoriteExercises,
    isFavorite,
    toggleFavorite,
    loadFavorites,
    activePreset,
    applyFilterPreset,
    clearPreset,
  } = useExerciseStore();

  const [refreshing, setRefreshing] = useState(false);
  const [localSearchText, setLocalSearchText] = useState(searchQuery);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Calculate active filter count (excluding search)
  const activeFilterCount = useMemo(() => {
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

  // Fetch exercises, load favorites on mount
  useEffect(() => {
    // Only fetch if exercises are empty (first load)
    // Don't call clearCache() here - it forces re-fetch every mount!
    fetchExercises(); // Uses cache if valid, only fetches if needed
    loadFavorites();
  }, []);

  // Get filtered exercises
  const exercises = getFilteredExercises();
  const recentlyUsed = getRecentlyUsedExercises();
  const favorites = getFavoriteExercises();

  // Handle refresh - Clear cache and reload fresh data
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    clearCache(); // This will clear cache and fetch fresh data
    // Wait a moment for the fetch to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, [clearCache]);

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

  // Handle body part filter
  const handleBodyPartPress = useCallback(
    (bodyPart: string | null) => {
      if (selectedBodyPart === bodyPart) {
        filterByBodyPart(null);
      } else {
        filterByBodyPart(bodyPart as any);
      }
    },
    [selectedBodyPart, filterByBodyPart]
  );

  // Handle equipment filter
  const handleEquipmentPress = useCallback(
    (equipment: string | null) => {
      if (selectedEquipment === equipment) {
        filterByEquipment(null);
      } else {
        filterByEquipment(equipment);
      }
      lightHaptic();
    },
    [selectedEquipment, filterByEquipment]
  );

  // Handle clear all filters
  const handleClearAllFilters = useCallback(() => {
    setLocalSearchText('');
    debouncedSearch.cancel();
    clearAllFilters();
    lightHaptic();
  }, [clearAllFilters, debouncedSearch]);

  // Handle preset toggle
  const handlePresetPress = useCallback((presetKey: FilterPresetKey) => {
    if (activePreset === presetKey) {
      clearPreset();
    } else {
      applyFilterPreset(presetKey);
    }
    lightHaptic();
  }, [activePreset, applyFilterPreset, clearPreset]);

  // Check if any filters are active (including search)
  const hasActiveFilters = searchQuery.length > 0 || activeFilterCount > 0;

  // Toggle filter panel with animation
  const toggleFilterPanel = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsFilterExpanded(prev => !prev);
    lightHaptic();
  }, []);

  // Handle exercise press
  const handleExercisePress = useCallback((exerciseId: string) => {
    router.push(`/exercise/${exerciseId}`);
  }, []);

  // Handle toggle favorite
  const handleToggleFavorite = useCallback((exerciseId: string) => {
    lightHaptic();
    toggleFavorite(exerciseId);
  }, [toggleFavorite]);

  // Render exercise item
  const renderExerciseItem = useCallback(
    ({ item }: { item: any }) => (
      <ExerciseItem
        exercise={item}
        onPress={() => handleExercisePress(item.id)}
        isFavorite={isFavorite(item.id)}
        onToggleFavorite={() => handleToggleFavorite(item.id)}
      />
    ),
    [handleExercisePress, handleToggleFavorite, isFavorite]
  );

  // Key extractor
  const keyExtractor = useCallback((item: any) => item.id, []);

  // List empty component
  const ListEmptyComponent = useCallback(() => {
    if (isLoading && !refreshing) {
      return (
        <View style={styles.emptyContainer}>
          <Dumbbell size={48} color="#64748b" />
          <Text style={styles.emptyText}>Loading exercises...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchExercises(true)}
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
          Try adjusting your search or filters
        </Text>
      </View>
    );
  }, [isLoading, refreshing, error, fetchExercises]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Exercise Library</Text>
        
        {/* Add Custom Exercise Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            lightHaptic();
            router.push('/exercise/add-custom');
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <PlusCircle size={26} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Search Bar with Filter Toggle */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={18} color="#64748b" style={styles.searchIcon} />
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
              style={styles.clearButton}
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
                    onPress={() => {
                      lightHaptic();
                      handleBodyPartPress(filter.value);
                    }}
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
                    onPress={() => {
                      lightHaptic();
                      filterByEquipment(isSelected ? null : filter.value);
                    }}
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
                      lightHaptic();
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
                onPress={() => {
                  lightHaptic();
                  clearAllFilters();
                }}
                activeOpacity={0.7}
              >
                <X size={14} color="#ef4444" />
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Result Count with Active Filters */}
      <View style={styles.resultRow}>
        <Text style={styles.resultCount}>
          {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
        </Text>
        
        {/* Active filter tags (when collapsed) */}
        {!isFilterExpanded && activeFilterCount > 0 && (
          <View style={styles.activeFiltersRow}>
            {selectedBodyPart && (
              <View style={styles.activeFilterTag}>
                <Text style={styles.activeFilterText}>
                  {BODY_PART_FILTERS.find(f => f.value === selectedBodyPart)?.label}
                </Text>
              </View>
            )}
            {selectedEquipment && (
              <View style={styles.activeFilterTag}>
                <Text style={styles.activeFilterText}>
                  {EQUIPMENT_FILTERS.find(f => f.value === selectedEquipment)?.label}
                </Text>
              </View>
            )}
            {activePreset && (
              <View style={styles.activeFilterTag}>
                <Text style={styles.activeFilterText}>
                  {FILTER_PRESETS[activePreset]?.name}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Recently Used Section */}
      {recentlyUsed.length > 0 && !searchQuery && !selectedBodyPart && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Used</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {recentlyUsed.slice(0, 10).map((exercise) => {
              const EquipmentIcon = getEquipmentIcon(exercise.equipment);
              const iconColor = getEquipmentColor(exercise.equipment);
              return (
                <TouchableOpacity
                  key={exercise.id}
                  style={styles.horizontalCard}
                  onPress={() => handleExercisePress(exercise.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.horizontalIcon}>
                    <EquipmentIcon size={20} color={iconColor} />
                  </View>
                  <Text style={styles.horizontalCardName} numberOfLines={2}>
                    {exercise.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Favorites Section */}
      {favorites.length > 0 && !searchQuery && !selectedBodyPart && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Favorites</Text>
            <Star size={16} color="#fbbf24" fill="#fbbf24" />
          </View>
          <View style={styles.favoritesGrid}>
            {favorites.slice(0, 6).map((exercise) => {
              const EquipmentIcon = getEquipmentIcon(exercise.equipment);
              const iconColor = getEquipmentColor(exercise.equipment);
              return (
                <TouchableOpacity
                  key={exercise.id}
                  style={styles.favoriteCard}
                  onPress={() => handleExercisePress(exercise.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.favoriteIcon}>
                    <EquipmentIcon size={18} color={iconColor} />
                  </View>
                  <Text style={styles.favoriteCardName} numberOfLines={2}>
                    {exercise.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* All Exercises Header */}
      {(recentlyUsed.length > 0 || favorites.length > 0) && 
       !searchQuery && 
       !selectedBodyPart && (
        <Text style={styles.allExercisesTitle}>All Exercises</Text>
      )}

      {/* Exercise List */}
      <FlatList
        data={exercises}
        renderItem={renderExerciseItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },

  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },

  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search Container
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  
  searchIcon: {
    marginRight: 8,
  },
  
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
  },
  
  clearButton: {
    padding: 4,
  },
  
  // Filter Toggle Button
  filterToggleButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  
  filterToggleButtonActive: {
    backgroundColor: '#3b82f6',
  },
  
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  
  filterBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  
  // Filter Panel
  filterPanel: {
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 12,
  },
  
  filterSection: {
    marginBottom: 12,
  },
  
  filterSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.5,
    marginLeft: 16,
    marginBottom: 8,
  },
  
  chipsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  
  // Chips
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e293b',
  },
  
  chipSelected: {
    backgroundColor: '#3b82f6',
  },
  
  chipText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  
  chipTextSelected: {
    color: '#ffffff',
  },
  
  presetChip: {
    gap: 6,
  },
  
  // Bottom Row
  filterBottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    gap: 4,
  },
  
  clearAllText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  
  // Result Row
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  
  resultCount: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  
  activeFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  
  activeFilterTag: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  
  activeFilterText: {
    fontSize: 12,
    color: '#93c5fd',
    fontWeight: '500',
  },

  presetsContainer: {
    marginTop: 16,
    marginBottom: 8,
  },

  presetsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    paddingHorizontal: 20,
    letterSpacing: 0.5,
  },

  warningBanner: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: '#fbbf2420',
    borderLeftWidth: 3,
    borderLeftColor: '#fbbf24',
    padding: 12,
    borderRadius: 8,
  },

  warningText: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '500',
  },

  warningLink: {
    color: '#3b82f6',
    textDecorationLine: 'underline',
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
    minHeight: 80,
  },

  iconWrapper: {
    width: 56,
    height: 56,
  },

  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },

  iconPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  exerciseInfo: {
    flex: 1,
    marginLeft: 12,
  },

  favoriteButton: {
    padding: 8,
    marginLeft: 8,
  },

  exerciseName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    marginBottom: 4,
  },

  exerciseEquipment: {
    color: '#94a3b8',
    fontSize: 13,
    textTransform: 'capitalize',
    marginBottom: 6,
  },

  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  muscleTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  muscleTagText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },

  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '500',
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

  // Recently Used & Favorites Sections
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  horizontalList: {
    gap: 12,
  },

  horizontalCard: {
    width: 140,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },

  horizontalIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  horizontalCardName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'capitalize',
  },

  favoritesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  favoriteCard: {
    width: '31%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },

  favoriteIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  favoriteCardName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'capitalize',
  },

  allExercisesTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
});

