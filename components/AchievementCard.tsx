import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lock, Check } from 'lucide-react-native';
import { Achievement } from '@/lib/api/achievements';

// ============================================
// Types
// ============================================

interface AchievementCardProps {
  achievement: Achievement;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
  onPress?: () => void;
}

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'small' | 'medium';
}

// ============================================
// Size Configurations
// ============================================

const SIZES = {
  small: {
    container: { padding: 12 },
    icon: 32,
    iconFontSize: 18,
    title: 13,
    description: 11,
    progress: 10,
  },
  medium: {
    container: { padding: 16 },
    icon: 44,
    iconFontSize: 24,
    title: 15,
    description: 12,
    progress: 11,
  },
  large: {
    container: { padding: 20 },
    icon: 56,
    iconFontSize: 32,
    title: 18,
    description: 14,
    progress: 12,
  },
};

// ============================================
// Achievement Card Component
// ============================================

function AchievementCardComponent({
  achievement,
  size = 'medium',
  showProgress = true,
  onPress,
}: AchievementCardProps) {
  const isUnlocked = !!achievement.unlockedAt;
  const sizeConfig = SIZES[size];
  const progress = achievement.progress || 0;
  const percentComplete = Math.min(100, Math.round((progress / achievement.requirement) * 100));

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[
        styles.card,
        sizeConfig.container,
        isUnlocked ? styles.cardUnlocked : styles.cardLocked,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View
        style={[
          styles.iconContainer,
          { width: sizeConfig.icon, height: sizeConfig.icon },
          isUnlocked ? styles.iconUnlocked : styles.iconLocked,
        ]}
      >
        {isUnlocked ? (
          <Text style={{ fontSize: sizeConfig.iconFontSize }}>{achievement.icon}</Text>
        ) : (
          <Lock size={sizeConfig.iconFontSize * 0.6} color="#475569" />
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            { fontSize: sizeConfig.title },
            !isUnlocked && styles.titleLocked,
          ]}
          numberOfLines={1}
        >
          {achievement.title}
        </Text>
        <Text
          style={[
            styles.description,
            { fontSize: sizeConfig.description },
            !isUnlocked && styles.descriptionLocked,
          ]}
          numberOfLines={2}
        >
          {achievement.description}
        </Text>

        {/* Progress Bar (for locked achievements) */}
        {showProgress && !isUnlocked && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${percentComplete}%` },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { fontSize: sizeConfig.progress }]}>
              {progress.toLocaleString()} / {achievement.requirement.toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      {/* Unlocked Check */}
      {isUnlocked && (
        <View style={styles.checkContainer}>
          <Check size={18} color="#22c55e" strokeWidth={3} />
        </View>
      )}
    </Container>
  );
}

// ============================================
// Achievement Badge Component (Compact)
// ============================================

function AchievementBadgeComponent({ achievement, size = 'medium' }: AchievementBadgeProps) {
  const isUnlocked = !!achievement.unlockedAt;
  const iconSize = size === 'small' ? 36 : 48;
  const fontSize = size === 'small' ? 18 : 24;

  return (
    <View
      style={[
        styles.badge,
        { width: iconSize, height: iconSize },
        isUnlocked ? styles.badgeUnlocked : styles.badgeLocked,
      ]}
    >
      {isUnlocked ? (
        <Text style={{ fontSize }}>{achievement.icon}</Text>
      ) : (
        <Lock size={fontSize * 0.5} color="#475569" />
      )}
    </View>
  );
}

// ============================================
// Achievement List Item (Compact row)
// ============================================

interface AchievementListItemProps {
  achievement: Achievement;
  onPress?: () => void;
}

export function AchievementListItem({ achievement, onPress }: AchievementListItemProps) {
  const isUnlocked = !!achievement.unlockedAt;
  const progress = achievement.progress || 0;
  const percentComplete = Math.min(100, Math.round((progress / achievement.requirement) * 100));

  return (
    <TouchableOpacity
      style={[styles.listItem, !isUnlocked && styles.listItemLocked]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.listItemIcon,
          isUnlocked ? styles.listItemIconUnlocked : styles.listItemIconLocked,
        ]}
      >
        {isUnlocked ? (
          <Text style={styles.listItemIconText}>{achievement.icon}</Text>
        ) : (
          <Lock size={14} color="#475569" />
        )}
      </View>

      <View style={styles.listItemContent}>
        <Text
          style={[styles.listItemTitle, !isUnlocked && styles.listItemTitleLocked]}
          numberOfLines={1}
        >
          {achievement.title}
        </Text>
        {!isUnlocked && (
          <View style={styles.listItemProgressBar}>
            <View
              style={[styles.listItemProgressFill, { width: `${percentComplete}%` }]}
            />
          </View>
        )}
      </View>

      {isUnlocked && (
        <Check size={16} color="#22c55e" strokeWidth={3} />
      )}
    </TouchableOpacity>
  );
}

// ============================================
// Recent Achievement Toast
// ============================================

interface AchievementToastProps {
  achievement: Achievement;
}

export function AchievementToast({ achievement }: AchievementToastProps) {
  return (
    <View style={styles.toast}>
      <View style={styles.toastIcon}>
        <Text style={styles.toastIconText}>{achievement.icon}</Text>
      </View>
      <View style={styles.toastContent}>
        <Text style={styles.toastLabel}> Achievement Unlocked!</Text>
        <Text style={styles.toastTitle}>{achievement.title}</Text>
        <Text style={styles.toastDescription}>{achievement.description}</Text>
      </View>
    </View>
  );
}

// ============================================
// Exports
// ============================================

export const AchievementCard = memo(AchievementCardComponent);
export const AchievementBadge = memo(AchievementBadgeComponent);
export default AchievementCard;

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  // Card Styles
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },

  cardUnlocked: {
    backgroundColor: '#1e293b',
    borderColor: '#fbbf24',
  },

  cardLocked: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    opacity: 0.8,
  },

  iconContainer: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  iconUnlocked: {
    backgroundColor: '#422006',
  },

  iconLocked: {
    backgroundColor: '#1e293b',
  },

  content: {
    flex: 1,
  },

  title: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 2,
  },

  titleLocked: {
    color: '#94a3b8',
  },

  description: {
    color: '#94a3b8',
    lineHeight: 16,
  },

  descriptionLocked: {
    color: '#64748b',
  },

  progressContainer: {
    marginTop: 8,
  },

  progressBar: {
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },

  progressText: {
    color: '#64748b',
    marginTop: 4,
  },

  checkContainer: {
    marginLeft: 8,
  },

  // Badge Styles
  badge: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeUnlocked: {
    backgroundColor: '#422006',
  },

  badgeLocked: {
    backgroundColor: '#1e293b',
    opacity: 0.5,
  },

  // List Item Styles
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },

  listItemLocked: {
    opacity: 0.7,
  },

  listItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  listItemIconUnlocked: {
    backgroundColor: '#422006',
  },

  listItemIconLocked: {
    backgroundColor: '#1e293b',
  },

  listItemIconText: {
    fontSize: 16,
  },

  listItemContent: {
    flex: 1,
  },

  listItemTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  listItemTitleLocked: {
    color: '#94a3b8',
  },

  listItemProgressBar: {
    height: 3,
    backgroundColor: '#334155',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },

  listItemProgressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },

  // Toast Styles
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#422006',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#fbbf24',
  },

  toastIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#78350f',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },

  toastIconText: {
    fontSize: 28,
  },

  toastContent: {
    flex: 1,
  },

  toastLabel: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },

  toastTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },

  toastDescription: {
    color: '#fcd34d',
    fontSize: 13,
  },
});
