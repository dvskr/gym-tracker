import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  Plus,
  MoreVertical,
  Play,
  Clock,
  Dumbbell,
  Edit3,
  Copy,
  Trash2,
  Calendar,
  Folder,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  FolderInput,
  ArrowLeft,
} from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '@/stores/authStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import {
  deleteTemplate,
  incrementTemplateUsage,
  duplicateTemplate,
  Template,
} from '@/lib/api/templates';
import {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  moveTemplateToFolder,
  getTemplatesGroupedByFolder,
  TemplateFolder,
  FOLDER_COLORS,
} from '@/lib/api/folders';
import { fetchPreviousWorkoutData } from '@/hooks/usePreviousWorkout';
import { Card } from '@/components/ui';
import { lightHaptic, mediumHaptic, successHaptic } from '@/lib/utils/haptics';
import { getCurrentTab } from '@/lib/navigation/navigationState';
import { useBackNavigation } from '@/lib/hooks/useBackNavigation';

// ============================================
// Template Card Component
// ============================================

interface TemplateCardProps {
  template: Template;
  onPress: () => void;
  onStartWorkout: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveToFolder: () => void;
  compact?: boolean;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onPress,
  onStartWorkout,
  onEdit,
  onDuplicate,
  onDelete,
  onMoveToFolder,
  compact = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const exerciseCount = template.exercises?.length || 0;
  const lastUsed = template.last_used_at
    ? formatDistanceToNow(new Date(template.last_used_at), { addSuffix: true })
    : 'Never used';

  const handleMenuPress = () => {
    lightHaptic();
    setShowMenu(true);
  };

  const handleStartWorkout = () => {
    successHaptic();
    onStartWorkout();
  };

  if (compact) {
    return (
      <>
        <TouchableOpacity
          style={styles.compactCard}
          onPress={onPress}
          onLongPress={handleMenuPress}
          activeOpacity={0.7}
        >
          <View style={styles.compactInfo}>
            <Text style={styles.compactName} numberOfLines={1}>
              {template.name}
            </Text>
            <Text style={styles.compactMeta}>
              {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
              {template.estimated_duration ? ` • ~${template.estimated_duration}min` : ''}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.compactPlayButton}
            onPress={handleStartWorkout}
            hitSlop={8}
          >
            <Play size={16} color="#ffffff" fill="#ffffff" />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Menu Modal */}
        <TemplateMenu
          visible={showMenu}
          template={template}
          onClose={() => setShowMenu(false)}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onMoveToFolder={onMoveToFolder}
        />
      </>
    );
  }

  return (
    <>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Card variant="default" style={styles.templateCard}>
          {/* Header Row */}
          <View style={styles.cardHeader}>
            <Text style={styles.templateName} numberOfLines={1}>
              {template.name}
            </Text>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleMenuPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MoreVertical size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Info Row */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Dumbbell size={14} color="#64748b" />
              <Text style={styles.infoText}>
                {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
              </Text>
            </View>

            {template.estimated_duration && (
              <View style={styles.infoItem}>
                <Clock size={14} color="#64748b" />
                <Text style={styles.infoText}>~{template.estimated_duration} min</Text>
              </View>
            )}
          </View>

          {/* Last Used */}
          <View style={styles.lastUsedRow}>
            <Calendar size={12} color="#475569" />
            <Text style={styles.lastUsedText}>{lastUsed}</Text>
            {template.times_used ? (
              <Text style={styles.usageCount}>• Used {template.times_used}x</Text>
            ) : null}
          </View>

          {/* Target Muscles Badges */}
          {template.target_muscles && template.target_muscles.length > 0 && (
            <View style={styles.musclesRow}>
              {template.target_muscles.slice(0, 3).map((muscle, index) => (
                <View key={index} style={styles.muscleBadge}>
                  <Text style={styles.muscleBadgeText}>{muscle}</Text>
                </View>
              ))}
              {template.target_muscles.length > 3 && (
                <Text style={styles.moreText}>
                  +{template.target_muscles.length - 3}
                </Text>
              )}
            </View>
          )}

          {/* Start Button */}
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartWorkout}
            activeOpacity={0.8}
          >
            <Play size={16} color="#ffffff" fill="#ffffff" />
            <Text style={styles.startButtonText}>Start Workout</Text>
          </TouchableOpacity>
        </Card>
      </TouchableOpacity>

      {/* Menu Modal */}
      <TemplateMenu
        visible={showMenu}
        template={template}
        onClose={() => setShowMenu(false)}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onMoveToFolder={onMoveToFolder}
      />
    </>
  );
};

// ============================================
// Template Menu Component
// ============================================

interface TemplateMenuProps {
  visible: boolean;
  template: Template;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveToFolder: () => void;
}

const TemplateMenu: React.FC<TemplateMenuProps> = ({
  visible,
  template,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onMoveToFolder,
}) => (
  <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
    <Pressable style={styles.menuOverlay} onPress={onClose}>
      <View style={styles.menuContainer}>
        <View style={styles.menuHeader}>
          <Text style={styles.menuTitle} numberOfLines={1}>
            {template.name}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => { onClose(); onEdit(); }}
        >
          <Edit3 size={20} color="#3b82f6" />
          <Text style={styles.menuItemText}>Edit Template</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => { onClose(); onMoveToFolder(); }}
        >
          <FolderInput size={20} color="#3b82f6" />
          <Text style={styles.menuItemText}>Move to Folder</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => { onClose(); onDuplicate(); }}
        >
          <Copy size={20} color="#3b82f6" />
          <Text style={styles.menuItemText}>Duplicate</Text>
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => { onClose(); onDelete(); }}
        >
          <Trash2 size={20} color="#ef4444" />
          <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
            Delete Template
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.menuItemCancel]}
          onPress={onClose}
        >
          <Text style={styles.menuItemTextCancel}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  </Modal>
);

// ============================================
// Folder Section Component
// ============================================

interface FolderSectionProps {
  folder: TemplateFolder & { templates: Template[] };
  onTemplatePress: (id: string) => void;
  onStartWorkout: (template: Template) => void;
  onEditTemplate: (id: string) => void;
  onDuplicateTemplate: (template: Template) => void;
  onDeleteTemplate: (id: string) => void;
  onMoveToFolder: (template: Template) => void;
  onEditFolder: () => void;
  onDeleteFolder: () => void;
}

const FolderSection: React.FC<FolderSectionProps> = ({
  folder,
  onTemplatePress,
  onStartWorkout,
  onEditTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  onMoveToFolder,
  onEditFolder,
  onDeleteFolder,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showFolderMenu, setShowFolderMenu] = useState(false);

  const toggleExpanded = () => {
    lightHaptic();
    setIsExpanded(!isExpanded);
  };

  return (
    <View style={styles.folderSection}>
      {/* Folder Header */}
      <TouchableOpacity
        style={styles.folderHeader}
        onPress={toggleExpanded}
        onLongPress={() => {
          lightHaptic();
          setShowFolderMenu(true);
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.folderIcon, { backgroundColor: folder.color + '20' }]}>
          <Folder size={18} color={folder.color} fill={folder.color} />
        </View>
        <Text style={styles.folderName}>{folder.name}</Text>
        <Text style={styles.folderCount}>{folder.templates.length}</Text>
        {isExpanded ? (
          <ChevronDown size={20} color="#64748b" />
        ) : (
          <ChevronRight size={20} color="#64748b" />
        )}
      </TouchableOpacity>

      {/* Templates */}
      {isExpanded && folder.templates.length > 0 && (
        <View style={styles.folderTemplates}>
          {folder.templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              compact
              onPress={() => onTemplatePress(template.id!)}
              onStartWorkout={() => onStartWorkout(template)}
              onEdit={() => onEditTemplate(template.id!)}
              onDuplicate={() => onDuplicateTemplate(template)}
              onDelete={() => onDeleteTemplate(template.id!)}
              onMoveToFolder={() => onMoveToFolder(template)}
            />
          ))}
        </View>
      )}

      {/* Folder Menu */}
      <Modal
        visible={showFolderMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFolderMenu(false)}
      >
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setShowFolderMenu(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>{folder.name}</Text>
            </View>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowFolderMenu(false);
                onEditFolder();
              }}
            >
              <Edit3 size={20} color="#3b82f6" />
              <Text style={styles.menuItemText}>Rename Folder</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowFolderMenu(false);
                onDeleteFolder();
              }}
            >
              <Trash2 size={20} color="#ef4444" />
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
                Delete Folder
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemCancel]}
              onPress={() => setShowFolderMenu(false)}
            >
              <Text style={styles.menuItemTextCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

// ============================================
// Empty State Component
// ============================================

const EmptyState: React.FC<{ onCreatePress: () => void }> = ({ onCreatePress }) => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyIcon}>x9️</Text>
    <Text style={styles.emptyTitle}>No Templates Yet</Text>
    <Text style={styles.emptyDescription}>
      Create a template to quickly start your favorite workouts.
    </Text>

    <TouchableOpacity
      style={styles.emptyButton}
      onPress={onCreatePress}
      activeOpacity={0.8}
    >
      <Plus size={20} color="#ffffff" />
      <Text style={styles.emptyButtonText}>Create Template</Text>
    </TouchableOpacity>

    <Text style={styles.emptyHint}>
      Or complete a workout and save it as a template!
    </Text>
  </View>
);

// ============================================
// Main Screen Component
// ============================================

export default function TemplatesScreen() {
  useBackNavigation(); // Enable Android back gesture support

  const { user, session } = useAuthStore();
  const { startWorkout, addExerciseWithSets, isWorkoutActive } = useWorkoutStore();

  const [folders, setFolders] = useState<Array<TemplateFolder & { templates: Template[] }>>([]);
  const [uncategorizedTemplates, setUncategorizedTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Create folder modal
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0]);

  // Edit folder modal
  const [editingFolder, setEditingFolder] = useState<TemplateFolder | null>(null);

  // Move to folder modal
  const [movingTemplate, setMovingTemplate] = useState<Template | null>(null);

  // Fetch data
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
    } catch (error) {
      logger.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Pull to refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Create folder
  const handleCreateFolder = async () => {
    if (!user?.id || !newFolderName.trim()) return;

    try {
      await createFolder(user.id, newFolderName.trim(), selectedColor);
      setShowCreateFolder(false);
      setNewFolderName('');
      setSelectedColor(FOLDER_COLORS[0]);
      fetchData();
    } catch (error) {
 logger.error('Error creating folder:', error);
    }
  };

  // Update folder
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
    } catch (error) {
 logger.error('Error updating folder:', error);
    }
  };

  // Delete folder
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
            } catch (error) {
 logger.error('Error deleting folder:', error);
            }
          },
        },
      ]
    );
  };

  // Move template to folder
  const handleMoveTemplate = async (folderId: string | null) => {
    if (!movingTemplate?.id) return;

    try {
      await moveTemplateToFolder(movingTemplate.id, folderId);
      setMovingTemplate(null);
      fetchData();
    } catch (error) {
 logger.error('Error moving template:', error);
    }
  };

  // Navigation handlers
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
        for (const templateExercise of template.exercises) {
          if (templateExercise.exercise) {
            const previousData = await fetchPreviousWorkoutData(
              user.id,
              templateExercise.exercise.external_id
            );

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
        }
      }

      router.push('/workout/active');
    } catch (error) {
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
      // Navigate to the new template
      router.push(`/template/${copy.id}`);
    } catch (error) {
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
    } catch (error) {
 logger.error('Error deleting template:', error);
    }
  };

  const totalTemplates =
    folders.reduce((acc, f) => acc + f.templates.length, 0) + uncategorizedTemplates.length;

  // Define list item types for FlatList
  type ListItemType =
    | { type: 'folder'; data: TemplateFolder & { templates: Template[] } }
    | { type: 'uncategorizedHeader' }
    | { type: 'template'; data: Template };

  // Memoize combined list data
  const listData = useMemo((): ListItemType[] => {
    const items: ListItemType[] = [];

    // Add folders
    folders.forEach((folder) => {
      items.push({ type: 'folder', data: folder });
    });

    // Add uncategorized section
    if (uncategorizedTemplates.length > 0) {
      items.push({ type: 'uncategorizedHeader' });
      uncategorizedTemplates.forEach((template) => {
        items.push({ type: 'template', data: template });
      });
    }

    return items;
  }, [folders, uncategorizedTemplates]);

  // Memoized render function
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

      // item.type === 'template'
      return (
        <View style={styles.uncategorizedSection}>
          <TemplateCard
            template={item.data}
            onPress={() => handleTemplatePress(item.data.id!)}
            onStartWorkout={() => handleStartWorkout(item.data)}
            onEdit={() => handleEditTemplate(item.data.id!)}
            onDuplicate={() => handleDuplicateTemplate(item.data)}
            onDelete={() => handleDeleteTemplate(item.data.id!)}
            onMoveToFolder={() => setMovingTemplate(item.data)}
          />
        </View>
      );
    },
    [
      handleTemplatePress,
      handleStartWorkout,
      handleEditTemplate,
      handleDuplicateTemplate,
      handleDeleteTemplate,
      uncategorizedTemplates.length,
    ]
  );

  // Key extractor
  const keyExtractor = useCallback((item: ListItemType, index: number) => {
    if (item.type === 'folder') return `folder-${item.data.id}`;
    if (item.type === 'uncategorizedHeader') return 'uncategorized-header';
    return `template-${item.data.id}-${index}`;
  }, []);

  // Loading state
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

  // Guest mode UI
  if (!session) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Templates</Text>
        </View>

        {/* Guest Empty State */}
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push(getCurrentTab() || '/(tabs)/workout')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Templates</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowCreateFolder(true)}
            activeOpacity={0.7}
          >
            <FolderPlus size={22} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleCreateTemplate}
            activeOpacity={0.7}
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

      {/* Create/Edit Folder Modal */}
      <Modal
        visible={showCreateFolder || editingFolder !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowCreateFolder(false);
          setEditingFolder(null);
          setNewFolderName('');
        }}
      >
        <Pressable
          style={styles.menuOverlay}
          onPress={() => {
            setShowCreateFolder(false);
            setEditingFolder(null);
            setNewFolderName('');
          }}
        >
          <View style={styles.folderModalContainer}>
            <Text style={styles.folderModalTitle}>
              {editingFolder ? 'Edit Folder' : 'New Folder'}
            </Text>

            <TextInput
              style={styles.folderNameInput}
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="Folder name"
              placeholderTextColor="#64748b"
              autoFocus={true}
            />

            <Text style={styles.colorLabel}>Color</Text>
            <View style={styles.colorPicker}>
              {FOLDER_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>

            <View style={styles.folderModalButtons}>
              <TouchableOpacity
                style={styles.folderModalCancel}
                onPress={() => {
                  setShowCreateFolder(false);
                  setEditingFolder(null);
                  setNewFolderName('');
                }}
              >
                <Text style={styles.folderModalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.folderModalCreate,
                  !newFolderName.trim() && styles.folderModalCreateDisabled,
                ]}
                onPress={editingFolder ? handleUpdateFolder : handleCreateFolder}
                disabled={!newFolderName.trim()}
              >
                <Text style={styles.folderModalCreateText}>
                  {editingFolder ? 'Save' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Move to Folder Modal */}
      <Modal
        visible={movingTemplate !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMovingTemplate(null)}
      >
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setMovingTemplate(null)}
        >
          <View style={styles.moveModalContainer}>
            <Text style={styles.moveModalTitle}>Move to Folder</Text>
            <Text style={styles.moveModalSubtitle}>{movingTemplate?.name}</Text>

            <ScrollView style={styles.folderList}>
              {/* Uncategorized option */}
              <TouchableOpacity
                style={styles.folderOption}
                onPress={() => handleMoveTemplate(null)}
              >
                <View style={styles.folderOptionIcon}>
                  <Folder size={18} color="#64748b" />
                </View>
                <Text style={styles.folderOptionText}>Uncategorized</Text>
              </TouchableOpacity>

              {/* Folders */}
              {folders.map((folder) => (
                <TouchableOpacity
                  key={folder.id}
                  style={styles.folderOption}
                  onPress={() => handleMoveTemplate(folder.id)}
                >
                  <View style={[styles.folderOptionIcon, { backgroundColor: folder.color + '20' }]}>
                    <Folder size={18} color={folder.color} fill={folder.color} />
                  </View>
                  <Text style={styles.folderOptionText}>{folder.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.moveModalCancel}
              onPress={() => setMovingTemplate(null)}
            >
              <Text style={styles.moveModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteConfirmId !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteConfirmId(null)}
      >
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setDeleteConfirmId(null)}
        >
          <View style={styles.confirmContainer}>
            <Text style={styles.confirmTitle}>Delete Template?</Text>
            <Text style={styles.confirmMessage}>
              This action cannot be undone. The template will be permanently deleted.
            </Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmButtonCancel}
                onPress={() => setDeleteConfirmId(null)}
              >
                <Text style={styles.confirmButtonCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButtonDelete}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmButtonDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
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

  // Loading
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

  // Guest Mode
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

  // Header
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
    zIndex: 10, // Ensure button is on top
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
    marginLeft: -44, // Center the title by offsetting the back button
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

  // Folder Section
  folderSection: {
    marginBottom: 16,
  },

  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    gap: 10,
  },

  folderIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  folderName: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  folderCount: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 4,
  },

  folderTemplates: {
    marginTop: 8,
    paddingLeft: 16,
  },

  // Compact Card
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },

  compactInfo: {
    flex: 1,
  },

  compactName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },

  compactMeta: {
    fontSize: 12,
    color: '#64748b',
  },

  compactPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Uncategorized
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

  // Template Card
  templateCard: {
    marginBottom: 16,
    padding: 16,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  templateName: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginRight: 8,
  },

  menuButton: {
    padding: 4,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },

  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  infoText: {
    color: '#94a3b8',
    fontSize: 14,
  },

  lastUsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },

  lastUsedText: {
    color: '#64748b',
    fontSize: 12,
  },

  usageCount: {
    color: '#64748b',
    fontSize: 12,
  },

  musclesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },

  muscleBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  muscleBadgeText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },

  moreText: {
    color: '#64748b',
    fontSize: 11,
  },

  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },

  startButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },

  // Menu Modal
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  menuContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    overflow: 'hidden',
  },

  menuHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  menuTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },

  menuItemText: {
    color: '#ffffff',
    fontSize: 15,
  },

  menuItemTextDanger: {
    color: '#ef4444',
  },

  menuDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginHorizontal: 16,
  },

  menuItemCancel: {
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginTop: 8,
  },

  menuItemTextCancel: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
  },

  // Folder Modal
  folderModalContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    padding: 20,
  },

  folderModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },

  folderNameInput: {
    backgroundColor: '#334155',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 16,
  },

  colorLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 8,
  },

  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },

  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },

  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#ffffff',
  },

  folderModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },

  folderModalCancel: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  folderModalCancelText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },

  folderModalCreate: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  folderModalCreateDisabled: {
    opacity: 0.5,
  },

  folderModalCreateText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },

  // Move Modal
  moveModalContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    padding: 20,
    maxHeight: '60%',
  },

  moveModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },

  moveModalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    textAlign: 'center',
  },

  folderList: {
    maxHeight: 250,
  },

  folderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 12,
  },

  folderOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },

  folderOptionText: {
    fontSize: 15,
    color: '#ffffff',
  },

  moveModalCancel: {
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },

  moveModalCancelText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },

  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },

  emptyDescription: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },

  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },

  emptyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  emptyHint: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },

  // Confirm Modal
  confirmContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    padding: 24,
  },

  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },

  confirmMessage: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },

  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },

  confirmButtonCancel: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  confirmButtonCancelText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },

  confirmButtonDelete: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  confirmButtonDeleteText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
