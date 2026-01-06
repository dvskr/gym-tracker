import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Edit3, Copy, Trash2, FolderInput } from 'lucide-react-native';
import { TemplateMenuProps } from './types';

export const TemplateMenu: React.FC<TemplateMenuProps> = ({
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

const styles = StyleSheet.create({
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

export default TemplateMenu;



