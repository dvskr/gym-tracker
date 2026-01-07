import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Plus, FolderPlus, Folder, ArrowLeft } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import {
  deleteTemplate,
  incrementTemplateUsage,
  duplicateTemplate,
  Template,
} from '@/lib/api/templates';
import {
  createFolder,
  updateFolder,
  deleteFolder,
  moveTemplateToFolder,
  getTemplatesGroupedByFolder,
  TemplateFolder,
  FOLDER_COLORS,
} from '@/lib/api/folders';
import { fetchPreviousWorkoutData } from '@/hooks/usePreviousWorkout';
import { lightHaptic, mediumHaptic, successHaptic } from '@/lib/utils/haptics';
import { getCurrentTab } from '@/lib/navigation/navigationState';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';
import {
  TemplateCard,
  FolderSection,
  FolderModal,
  MoveToFolderModal,
  DeleteConfirmModal,
  EmptyState,
  ListItemType,
} from '@/components/template';

// ============================================
// Main Screen Component
// ============================================

export default function TemplatesScreen() {
  useBackNavigation();

  const { user, session } = useAuthStore();
  const { startWorkout, addExerciseWithSets, isWorkoutActive } = useWorkoutStore();

  const [folders, setFolders] = useState<Array<TemplateFolder & { templates: Template[] }>>([]);
  const [uncategorizedTemplates, setUncategorizedTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Folder modal state
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0]);
  const [editingFolder, setEditingFolder] = useState<TemplateFolder | null>(null);

  // Move to folder modal state
  const [movingTemplate, setMovingTemplate] = useState<Template | null>(null);

  // ============================================
  // Data Fetching
  // ============================================

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      const data = await getTemplatesGroupedByFolder(user.id);
      setFolders(data.folders);
      setUncategorizedTemplates(data.uncategorized);
    } catch (error: unknown) {
      logger.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  // ============================================
  // Folder Actions
  // ============================================

  const handleCreateFolder = async () => {
    if (!user?.id || !newFolderName.trim()) return;

    try {
      await createFolder(user.id, newFolderName.trim(), selectedColor);
      setShowCreateFolder(false);
      setNewFolderName('');
      setSelectedColor(FOLDER_COLORS[0]);
      fetchData();
    } catch (error: unknown) {
      logger.error('Error creating folder:', error);
    }
  };

  const handleUpdateFolder = async () => {
    if (!editingFolder?.id || !newFolderName.trim()) return;

    try {
      await updateFolder(editingFolder.id, {
        name: newFolderName.trim(),
        color: selectedColor,
      });
      setEditingFolder(null);
      setNewFolderName('');
      fetchData();
    } catch (error: unknown) {
      logger.error('Error updating folder:', error);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    Alert.alert(
      'Delete Folder?',
      'Templates in this folder will be moved to Uncategorized.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFolder(folderId);
              fetchData();
            } catch (error: unknown) {
              logger.error('Error deleting folder:', error);
            }
          },
        },
      ]
    );
  };

  const handleMoveTemplate = async (folderId: string | null) => {
    if (!movingTemplate?.id) return;

    try {
      await moveTemplateToFolder(movingTemplate.id, folderId);
      setMovingTemplate(null);
      fetchData();
    } catch (error: unknown) {
      logger.error('Error moving template:', error);
    }
  };

  // ============================================
  // Template Actions
  // ============================================

  const handleCreateTemplate = () => {
    lightHaptic();
    router.push('/template/create');
  };

  const handleTemplatePress = (templateId: string) => {
    lightHaptic();
    router.push(`/template/${templateId}`);
  };

  const handleStartWorkout = async (template: Template) => {
    if (!template.id || !user?.id) return;

    if (isWorkoutActive) {
      Alert.alert(
        'Workout in Progress',
        'You have an active workout. Finish or discard it before starting a new one.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Workout', onPress: () => router.push('/workout/active') },
        ]
      );
      return;
    }

    try {
      await incrementTemplateUsage(template.id);
      startWorkout(template.name, template.id);

      if (template.exercises && template.exercises.length > 0) {
        // Fetch ALL previous workout data in parallel (much faster!)
        const previousDataPromises = template.exercises.map(templateExercise =>
          templateExercise.exercise 
            ? fetchPreviousWorkoutData(user.id, templateExercise.exercise.external_id)
            : Promise.resolve(null)
        );
        const allPreviousData = await Promise.all(previousDataPromises);
        
        // Now add all exercises with their pre-fetched data
        template.exercises.forEach((templateExercise, index) => {
          if (templateExercise.exercise) {
            const previousData = allPreviousData[index];
            let prefillSets: Array<{ weight?: number; reps?: number }> = [];

            if (previousData && previousData.sets.length > 0) {
              prefillSets = previousData.sets.map((s) => ({
                weight: s.weight,
                reps: s.reps,
              }));
            } else if (templateExercise.target_weight) {
              prefillSets = [{
                weight: templateExercise.target_weight,
                reps: templateExercise.target_reps_min || templateExercise.target_reps_max || undefined,
              }];
            }

            const targetSets = templateExercise.target_sets || 3;

            addExerciseWithSets(
              {
                id: templateExercise.exercise.external_id,
                name: templateExercise.exercise.name,
                bodyPart: templateExercise.exercise.primary_muscles?.[0] || '',
                equipment: templateExercise.exercise.equipment || '',
                gifUrl: templateExercise.exercise.gif_url || undefined,
                target: templateExercise.exercise.primary_muscles?.[0] || '',
              },
              prefillSets,
              targetSets
            );
          }
        });
      }

      router.push('/workout/active');
    } catch (error: unknown) {
      logger.error('Error starting workout:', error);
    }
  };

  const handleEditTemplate = (templateId: string) => {
    lightHaptic();
    router.push(`/template/${templateId}`);
  };

  const handleDuplicateTemplate = async (template: Template) => {
    if (!template.id) return;

    lightHaptic();

    try {
      const copy = await duplicateTemplate(template.id);
      successHaptic();
      router.push(`/template/${copy.id}`);
    } catch (error: unknown) {
      logger.error('Error duplicating template:', error);
      Alert.alert('Error', 'Failed to duplicate template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    mediumHaptic();
    setDeleteConfirmId(templateId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      await deleteTemplate(deleteConfirmId);
      setDeleteConfirmId(null);
      fetchData();
    } catch (error: unknown) {
      logger.error('Error deleting template:', error);
    }
  };

  // ============================================
  // List Data
  // ============================================

  const totalTemplates =
    folders.reduce((acc, f) => acc + f.templates.length, 0) + uncategorizedTemplates.length;

  const listData = useMemo((): ListItemType[] => {
    const items: ListItemType[] = [];

    folders.forEach((folder) => {
      items.push({ type: 'folder', data: folder });
    });

    if (uncategorizedTemplates.length > 0) {
      items.push({ type: 'uncategorizedHeader' });
      uncategorizedTemplates.forEach((template) => {
        items.push({ type: 'template', data: template });
      });
    }

    return items;
  }, [folders, uncategorizedTemplates]);

  const renderItem = useCallback(
    ({ item }: { item: ListItemType }) => {
      if (item.type === 'folder') {
        return (
          <FolderSection
            folder={item.data}
            onTemplatePress={handleTemplatePress}
            onStartWorkout={handleStartWorkout}
            onEditTemplate={handleEditTemplate}
            onDuplicateTemplate={handleDuplicateTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onMoveToFolder={(template) => setMovingTemplate(template)}
            onEditFolder={() => {
              setEditingFolder(item.data);
              setNewFolderName(item.data.name);
              setSelectedColor(item.data.color);
            }}
            onDeleteFolder={() => handleDeleteFolder(item.data.id)}
          />
        );
      }

      if (item.type === 'uncategorizedHeader') {
        return (
          <View style={styles.uncategorizedSection}>
            <View style={styles.uncategorizedHeader}>
              <Text style={styles.uncategorizedTitle}>Uncategorized</Text>
              <Text style={styles.uncategorizedCount}>
                {uncategorizedTemplates.length}
              </Text>
            </View>
          </View>
        );
      }

      return (
        <View style={styles.uncategorizedSection}>
          <TemplateCard
            template={item.data}
            onPress={() => item.data.id && handleTemplatePress(item.data.id)}
            onStartWorkout={() => handleStartWorkout(item.data)}
            onEdit={() => item.data.id && handleEditTemplate(item.data.id)}
            onDuplicate={() => handleDuplicateTemplate(item.data)}
            onDelete={() => item.data.id && handleDeleteTemplate(item.data.id)}
            onMoveToFolder={() => setMovingTemplate(item.data)}
          />
        </View>
      );
    },
    [uncategorizedTemplates.length]
  );

  const keyExtractor = useCallback((item: ListItemType, index: number) => {
    if (item.type === 'folder') return `folder-${item.data.id}`;
    if (item.type === 'uncategorizedHeader') return 'uncategorized-header';
    return `template-${item.data.id}-${index}`;
  }, []);

  // ============================================
  // Loading State
  // ============================================

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading templates...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================
  // Guest Mode
  // ============================================

  if (!session) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Templates</Text>
        </View>

        <View style={styles.guestContainer}>
          <Folder size={64} color="#334155" />
          <Text style={styles.guestTitle}>Workout Templates</Text>
          <Text style={styles.guestSubtitle}>
            Sign in to create and manage your custom workout templates
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.7}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================
  // Main Render
  // ============================================

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push(getCurrentTab() || '/(tabs)/workout')}
          activeOpacity={0.7}
          accessible={true}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Templates</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowCreateFolder(true)}
            activeOpacity={0.7}
            accessible={true}
            accessibilityLabel="Create folder"
            accessibilityRole="button"
          >
            <FolderPlus size={22} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleCreateTemplate}
            activeOpacity={0.7}
            accessible={true}
            accessibilityLabel="Create template"
            accessibilityRole="button"
          >
            <Plus size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {totalTemplates === 0 ? (
        <EmptyState onCreatePress={handleCreateTemplate} />
      ) : (
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#3b82f6"
              colors={['#3b82f6']}
            />
          }
          ListFooterComponent={<View style={styles.bottomSpacer} />}
        />
      )}

      {/* Modals */}
      <FolderModal
        visible={showCreateFolder || editingFolder !== null}
        editingFolder={editingFolder}
        folderName={newFolderName}
        selectedColor={selectedColor}
        onFolderNameChange={setNewFolderName}
        onColorChange={setSelectedColor}
        onSave={editingFolder ? handleUpdateFolder : handleCreateFolder}
        onClose={() => {
          setShowCreateFolder(false);
          setEditingFolder(null);
          setNewFolderName('');
        }}
      />

      <MoveToFolderModal
        visible={movingTemplate !== null}
        template={movingTemplate}
        folders={folders}
        onMove={handleMoveTemplate}
        onClose={() => setMovingTemplate(null)}
      />

      <DeleteConfirmModal
        visible={deleteConfirmId !== null}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
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

  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 14,
  },

  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },

  guestTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginTop: 24,
    marginBottom: 12,
  },

  guestSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },

  signInButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },

  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
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

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
    marginLeft: -44,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
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

  uncategorizedSection: {
    marginTop: 8,
  },

  uncategorizedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },

  uncategorizedTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  uncategorizedCount: {
    fontSize: 13,
    color: '#475569',
  },
});


