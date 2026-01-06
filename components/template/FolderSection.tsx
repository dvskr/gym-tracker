import React, { memo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import {
  Folder,
  ChevronDown,
  ChevronRight,
  Edit3,
  Trash2,
} from 'lucide-react-native';
import { lightHaptic } from '@/lib/utils/haptics';
import { FolderSectionProps } from './types';
import { TemplateCard } from './TemplateCard';

function FolderSectionComponent({
  folder,
  onTemplatePress,
  onStartWorkout,
  onEditTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  onMoveToFolder,
  onEditFolder,
  onDeleteFolder,
}: FolderSectionProps) {
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
        accessible={true}
        accessibilityLabel={`${folder.name} folder, ${folder.templates.length} templates. ${isExpanded ? 'Expanded' : 'Collapsed'}. Long press for options`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
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
              onPress={() => template.id && onTemplatePress(template.id)}
              onStartWorkout={() => onStartWorkout(template)}
              onEdit={() => template.id && onEditTemplate(template.id)}
              onDuplicate={() => onDuplicateTemplate(template)}
              onDelete={() => template.id && onDeleteTemplate(template.id)}
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
}

export const FolderSection = memo(FolderSectionComponent);

const styles = StyleSheet.create({
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

  // Menu styles
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
    alignItems: 'center',
  },

  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },

  menuItemText: {
    fontSize: 15,
    color: '#ffffff',
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
});

export default FolderSection;



