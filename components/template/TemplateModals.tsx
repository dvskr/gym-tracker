import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Folder } from 'lucide-react-native';
import { FOLDER_COLORS } from '@/lib/api/folders';
import {
  FolderModalProps,
  MoveToFolderModalProps,
  DeleteConfirmModalProps,
} from './types';

// ============================================
// Create/Edit Folder Modal
// ============================================

export const FolderModal: React.FC<FolderModalProps> = ({
  visible,
  editingFolder,
  folderName,
  selectedColor,
  onFolderNameChange,
  onColorChange,
  onSave,
  onClose,
}) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="fade"
    onRequestClose={onClose}
  >
    <Pressable style={styles.menuOverlay} onPress={onClose}>
      <View style={styles.folderModalContainer}>
        <Text style={styles.folderModalTitle}>
          {editingFolder ? 'Edit Folder' : 'New Folder'}
        </Text>

        <TextInput
          style={styles.folderNameInput}
          value={folderName}
          onChangeText={onFolderNameChange}
          placeholder="Folder name"
          placeholderTextColor="#64748b"
          autoFocus={true}
          accessible={true}
          accessibilityLabel="Folder name input"
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
              onPress={() => onColorChange(color)}
              accessible={true}
              accessibilityLabel={`Color ${color}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedColor === color }}
            />
          ))}
        </View>

        <View style={styles.folderModalButtons}>
          <TouchableOpacity
            style={styles.folderModalCancel}
            onPress={onClose}
          >
            <Text style={styles.folderModalCancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.folderModalCreate,
              !folderName.trim() && styles.folderModalCreateDisabled,
            ]}
            onPress={onSave}
            disabled={!folderName.trim()}
          >
            <Text style={styles.folderModalCreateText}>
              {editingFolder ? 'Save' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  </Modal>
);

// ============================================
// Move to Folder Modal
// ============================================

export const MoveToFolderModal: React.FC<MoveToFolderModalProps> = ({
  visible,
  template,
  folders,
  onMove,
  onClose,
}) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="fade"
    onRequestClose={onClose}
  >
    <Pressable style={styles.menuOverlay} onPress={onClose}>
      <View style={styles.moveModalContainer}>
        <Text style={styles.moveModalTitle}>Move to Folder</Text>
        <Text style={styles.moveModalSubtitle}>{template?.name}</Text>

        <ScrollView style={styles.folderList}>
          {/* Uncategorized option */}
          <TouchableOpacity
            style={styles.folderOption}
            onPress={() => onMove(null)}
            accessible={true}
            accessibilityLabel="Move to Uncategorized"
            accessibilityRole="button"
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
              onPress={() => onMove(folder.id)}
              accessible={true}
              accessibilityLabel={`Move to ${folder.name}`}
              accessibilityRole="button"
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
          onPress={onClose}
        >
          <Text style={styles.moveModalCancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  </Modal>
);

// ============================================
// Delete Confirmation Modal
// ============================================

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  visible,
  onConfirm,
  onCancel,
}) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="fade"
    onRequestClose={onCancel}
  >
    <Pressable style={styles.menuOverlay} onPress={onCancel}>
      <View style={styles.confirmContainer}>
        <Text style={styles.confirmTitle}>Delete Template?</Text>
        <Text style={styles.confirmMessage}>
          This action cannot be undone. The template will be permanently deleted.
        </Text>

        <View style={styles.confirmButtons}>
          <TouchableOpacity
            style={styles.confirmButtonCancel}
            onPress={onCancel}
          >
            <Text style={styles.confirmButtonCancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.confirmButtonDelete}
            onPress={onConfirm}
          >
            <Text style={styles.confirmButtonDeleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  </Modal>
);

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  // Folder Modal
  folderModalContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },

  folderModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },

  folderNameInput: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },

  colorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 12,
  },

  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },

  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
  },

  folderModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
  },

  folderModalCreate: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },

  folderModalCreateDisabled: {
    backgroundColor: '#1e3a5f',
  },

  folderModalCreateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Move Modal
  moveModalContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    maxHeight: '70%',
  },

  moveModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },

  moveModalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },

  folderList: {
    maxHeight: 300,
  },

  folderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderRadius: 8,
  },

  folderOptionIcon: {
    width: 32,
    height: 32,
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
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
    marginTop: 12,
  },

  moveModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
  },

  // Confirm Modal
  confirmContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },

  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },

  confirmMessage: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },

  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },

  confirmButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
  },

  confirmButtonCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
  },

  confirmButtonDelete: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },

  confirmButtonDeleteText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});

