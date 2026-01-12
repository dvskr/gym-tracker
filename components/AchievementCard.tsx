import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Lock, Check, Share2 } from 'lucide-react-native';
import { Achievement as OldAchievement } from '@/lib/api/achievements';
import { 
  TIER_CONFIG, 
  getAchievementIcon 
} from '@/constants/achievements';
import { AchievementWithStatus } from '@/types/achievements';
import { formatEarnedAt } from '@/lib/achievements/achievementService';

// ============================================
// NEW Achievement Card (for new system)
// ============================================

interface NewAchievementCardProps {
  data: AchievementWithStatus;
  onPress?: () => void;
  onShare?: () => void;
  compact?: boolean;
}

function NewAchievementCard({ 
  data, 
  onPress, 
  onShare,
  compact = false 
}: NewAchievementCardProps) {
  const { achievement, unlocked, earnedAt, progress, progressPercent } = data;
  const tier = TIER_CONFIG[achievement.tier];
  const icon = getAchievementIcon(achievement.iconKey);

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onShare?.();
  };

  // Compact variant for lists
  if (compact) {
    return (
      <TouchableOpacity 
        style={[
          styles.compactCard,
          { borderColor: unlocked ? tier.color : '#334155' }
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[
          styles.compactIcon,
          { backgroundColor: unlocked ? tier.backgroundColor : '#1e293b' }
        ]}>
          <Text style={[styles.compactIconText, !unlocked && styles.lockedIcon]}>
            {icon}
          </Text>
        </View>
        <View style={styles.compactContent}>
          <Text 
            style={[styles.compactName, !unlocked && styles.lockedText]} 
            numberOfLines={1}
          >
            {achievement.name}
          </Text>
          {unlocked && earnedAt && (
            <Text style={[styles.compactEarned, { color: tier.color }]}>
              {formatEarnedAt(earnedAt)}
            </Text>
          )}
        </View>
        <View style={[styles.compactTierDot, { backgroundColor: tier.color }]} />
      </TouchableOpacity>
    );
  }

  // Full card variant
  return (
    <TouchableOpacity 
      style={[
        styles.card,
        { 
          borderColor: unlocked ? tier.color : '#334155',
          borderWidth: tier.borderWidth,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Tier Badge */}
      <View style={[styles.tierBadge, { backgroundColor: tier.color }]}>
        <Text style={styles.tierText}>{tier.label}</Text>
      </View>

      {/* Share Button (only for unlocked) */}
      {unlocked && onShare && (
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Share2 size={16} color="#64748b" />
        </TouchableOpacity>
      )}

      {/* Icon */}
      <View style={[
        styles.iconContainer,
        { 
          backgroundColor: unlocked ? tier.backgroundColor : '#1e293b',
          shadowColor: unlocked ? tier.color : 'transparent',
          shadowOpacity: tier.glowOpacity,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
        }
      ]}>
        <Text style={[styles.iconText, !unlocked && styles.lockedIcon]}>
          {icon}
        </Text>
      </View>

      {/* Name & Description */}
      <Text style={[styles.name, !unlocked && styles.lockedText]}>
        {achievement.name}
      </Text>
      <Text style={styles.description}>{achievement.description}</Text>

      {/* Progress or Earned Date */}
      {unlocked ? (
        <View style={styles.earnedContainer}>
          <Text style={[styles.earnedText, { color: tier.color }]}>
            Earned {formatEarnedAt(earnedAt!)}
          </Text>
        </View>
      ) : (
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${Math.min(100, progressPercent)}%`, 
                  backgroundColor: tier.color 
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {progress.toLocaleString()} / {achievement.requirement.toLocaleString()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ============================================
// OLD Achievement Card (for backward compatibility)
// ============================================

interface OldAchievementCardProps {
  achievement: OldAchievement;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
  onPress?: () => void;
}

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

function OldAchievementCardComponent({
  achievement,
  size = 'medium',
  showProgress = true,
  onPress,
}: OldAchievementCardProps) {
  const isUnlocked = !!achievement.unlockedAt;
  const sizeConfig = SIZES[size];
  const progress = achievement.progress || 0;
  const percentComplete = Math.min(100, Math.round((progress / achievement.requirement) * 100));

  const Container = onPress ? TouchableOpacity : View;
  
  const a11yLabel = isUnlocked 
    ? `${achievement.title}, unlocked. ${achievement.description}`
    : `${achievement.title}, locked. ${achievement.description}. Progress: ${progress} of ${achievement.requirement}, ${percentComplete}% complete`;

  return (
    <Container
      style={[
        styles.oldCard,
        sizeConfig.container,
        isUnlocked ? styles.oldCardUnlocked : styles.oldCardLocked,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessible={true}
      accessibilityLabel={a11yLabel}
      accessibilityRole={onPress ? 'button' : 'text'}
    >
      {/* Icon */}
      <View
        style={[
          styles.oldIconContainer,
          { width: sizeConfig.icon, height: sizeConfig.icon },
          isUnlocked ? styles.oldIconUnlocked : styles.oldIconLocked,
        ]}
      >
        <Text style={[
          { fontSize: sizeConfig.iconFontSize },
          !isUnlocked && styles.lockedIcon
        ]}>
          {achievement.icon}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.oldContent}>
        <Text
          style={[
            styles.oldTitle,
            { fontSize: sizeConfig.title },
            !isUnlocked && styles.oldTitleLocked,
          ]}
          numberOfLines={1}
        >
          {achievement.title}
        </Text>
        <Text
          style={[
            styles.oldDescription,
            { fontSize: sizeConfig.description },
            !isUnlocked && styles.oldDescriptionLocked,
          ]}
          numberOfLines={2}
        >
          {achievement.description}
        </Text>

        {/* Progress Bar (for locked achievements) */}
        {showProgress && !isUnlocked && (
          <View style={styles.oldProgressContainer}>
            <View style={styles.oldProgressBar}>
              <View
                style={[
                  styles.oldProgressFill,
                  { width: `${percentComplete}%` },
                ]}
              />
            </View>
            <Text style={[styles.oldProgressText, { fontSize: sizeConfig.progress }]}>
              {progress.toLocaleString()} / {achievement.requirement.toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      {/* Unlocked Check */}
      {isUnlocked && (
        <View style={styles.oldCheckContainer}>
          <Check size={18} color="#22c55e" strokeWidth={3} />
        </View>
      )}
    </Container>
  );
}

// Export both versions
export const AchievementCard = memo(OldAchievementCardComponent);
export const AchievementCardV2 = NewAchievementCard;
export default AchievementCard;

const styles = StyleSheet.create({
  // NEW Card styles
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  tierBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tierText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  shareBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  iconText: {
    fontSize: 40,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 4,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
  },
  earnedContainer: {
    alignItems: 'center',
  },
  earnedText: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressContainer: {
    width: '100%',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  lockedText: {
    color: '#64748b',
  },
  lockedIcon: {
    opacity: 0.4,
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  compactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactIconText: {
    fontSize: 22,
  },
  compactContent: {
    flex: 1,
    marginLeft: 12,
  },
  compactName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  compactEarned: {
    fontSize: 11,
    marginTop: 2,
  },
  compactTierDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },

  // OLD Card styles
  oldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  oldCardUnlocked: {
    backgroundColor: '#1e293b',
    borderColor: '#fbbf24',
  },
  oldCardLocked: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    opacity: 0.8,
  },
  oldIconContainer: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  oldIconUnlocked: {
    backgroundColor: '#422006',
  },
  oldIconLocked: {
    backgroundColor: '#1e293b',
  },
  oldContent: {
    flex: 1,
  },
  oldTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  oldTitleLocked: {
    color: '#94a3b8',
  },
  oldDescription: {
    color: '#94a3b8',
    lineHeight: 16,
  },
  oldDescriptionLocked: {
    color: '#64748b',
  },
  oldProgressContainer: {
    marginTop: 8,
  },
  oldProgressBar: {
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    overflow: 'hidden',
  },
  oldProgressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  oldProgressText: {
    color: '#64748b',
    marginTop: 4,
  },
  oldCheckContainer: {
    marginLeft: 8,
  },
});
