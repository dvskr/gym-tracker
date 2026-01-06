import React, { memo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  MoreVertical,
  Play,
  Clock,
  Dumbbell,
  Calendar,
} from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui';
import { lightHaptic, successHaptic } from '@/lib/utils/haptics';
import { TemplateCardProps } from './types';
import { TemplateMenu } from './TemplateMenu';

function TemplateCardComponent({
  template,
  onPress,
  onStartWorkout,
  onEdit,
  onDuplicate,
  onDelete,
  onMoveToFolder,
  compact = false,
}: TemplateCardProps) {
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
          accessible={true}
          accessibilityLabel={`${template.name}, ${exerciseCount} exercises. Long press for options`}
          accessibilityRole="button"
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
            accessible={true}
            accessibilityLabel={`Start ${template.name} workout`}
            accessibilityRole="button"
          >
            <Play size={16} color="#ffffff" fill="#ffffff" />
          </TouchableOpacity>
        </TouchableOpacity>

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
      <TouchableOpacity 
        onPress={onPress} 
        activeOpacity={0.7}
        accessible={true}
        accessibilityLabel={`${template.name} template, ${exerciseCount} exercises, ${lastUsed}`}
        accessibilityRole="button"
      >
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
              accessible={true}
              accessibilityLabel={`Options for ${template.name}`}
              accessibilityRole="button"
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
            accessible={true}
            accessibilityLabel={`Start ${template.name} workout`}
            accessibilityRole="button"
          >
            <Play size={16} color="#ffffff" fill="#ffffff" />
            <Text style={styles.startButtonText}>Start Workout</Text>
          </TouchableOpacity>
        </Card>
      </TouchableOpacity>

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

export const TemplateCard = memo(TemplateCardComponent);

const styles = StyleSheet.create({
  templateCard: {
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    gap: 16,
    marginBottom: 8,
  },

  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  infoText: {
    fontSize: 13,
    color: '#64748b',
  },

  lastUsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },

  lastUsedText: {
    fontSize: 12,
    color: '#475569',
  },

  usageCount: {
    fontSize: 12,
    color: '#475569',
  },

  musclesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },

  muscleBadge: {
    backgroundColor: '#1e3a5f',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },

  muscleBadgeText: {
    fontSize: 11,
    color: '#60a5fa',
    textTransform: 'capitalize',
  },

  moreText: {
    fontSize: 11,
    color: '#64748b',
    alignSelf: 'center',
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
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Compact card styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },

  compactInfo: {
    flex: 1,
  },

  compactName: {
    fontSize: 15,
    fontWeight: '600',
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
});

export default TemplateCard;



