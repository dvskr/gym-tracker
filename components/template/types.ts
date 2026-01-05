/**
 * Shared types for template components
 */

import { Template } from '@/lib/api/templates';
import { TemplateFolder } from '@/lib/api/folders';

export interface TemplateCardProps {
  template: Template;
  onPress: () => void;
  onStartWorkout: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveToFolder: () => void;
  compact?: boolean;
}

export interface TemplateMenuProps {
  visible: boolean;
  template: Template;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveToFolder: () => void;
}

export interface FolderSectionProps {
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

export interface FolderModalProps {
  visible: boolean;
  editingFolder: TemplateFolder | null;
  folderName: string;
  selectedColor: string;
  onFolderNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export interface MoveToFolderModalProps {
  visible: boolean;
  template: Template | null;
  folders: Array<TemplateFolder & { templates: Template[] }>;
  onMove: (folderId: string | null) => void;
  onClose: () => void;
}

export interface DeleteConfirmModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface EmptyStateProps {
  onCreatePress: () => void;
}

export type ListItemType =
  | { type: 'folder'; data: TemplateFolder & { templates: Template[] } }
  | { type: 'uncategorizedHeader' }
  | { type: 'template'; data: Template };

