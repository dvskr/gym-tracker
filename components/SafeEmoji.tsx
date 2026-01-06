/**
 * SafeEmoji Component
 * 
 * ALWAYS use this component instead of raw emoji strings to prevent corruption.
 * This component validates emojis at runtime and provides automatic fallbacks.
 */

import React from 'react';
import { Text, TextProps } from 'react-native';
import { sanitizeEmoji, getSafeAchievementEmoji, getSafeEquipmentEmoji, getSafePREmoji } from '@/lib/utils/emojiValidator';

// Supported emoji types
export type EmojiType = 'achievement' | 'equipment' | 'pr' | 'generic';

// Props for SafeEmoji component
export interface SafeEmojiProps extends Omit<TextProps, 'children'> {
  /** The emoji to display (will be validated) */
  emoji?: string;
  /** Type of emoji for automatic lookup */
  type?: EmojiType;
  /** ID for achievement/equipment/pr lookup */
  id?: string;
  /** Fallback emoji if validation fails */
  fallback?: string;
  /** Size in pixels */
  size?: number;
}

/**
 * SafeEmoji Component
 * 
 * Usage:
 * ```tsx
 * // Direct emoji (validated)
 * <SafeEmoji emoji="🏆" />
 * 
 * // Achievement by ID (auto-lookup)
 * <SafeEmoji type="achievement" id="first_workout" />
 * 
 * // Equipment by ID (auto-lookup)
 * <SafeEmoji type="equipment" id="dumbbells" />
 * 
 * // PR type (auto-lookup)
 * <SafeEmoji type="pr" id="weight" />
 * 
 * // With custom fallback
 * <SafeEmoji emoji="🎉" fallback="✨" />
 * 
 * // With size
 * <SafeEmoji emoji="💪" size={24} />
 * ```
 */
export function SafeEmoji({
  emoji,
  type,
  id,
  fallback = '🏅',
  size,
  style,
  ...props
}: SafeEmojiProps) {
  // Get emoji from type and ID
  let safeEmoji = emoji;

  if (type && id) {
    switch (type) {
      case 'achievement':
        safeEmoji = getSafeAchievementEmoji(id, emoji);
        break;
      case 'equipment':
        safeEmoji = getSafeEquipmentEmoji(id, emoji);
        break;
      case 'pr':
        safeEmoji = getSafePREmoji(id);
        break;
    }
  }

  // Validate and sanitize
  const displayEmoji = sanitizeEmoji(safeEmoji, fallback);

  // Apply size if provided
  const sizeStyle = size ? { fontSize: size } : {};

  return (
    <Text
      style={[sizeStyle, style]}
      {...props}
    >
      {displayEmoji}
    </Text>
  );
}

/**
 * Hook to get safe emoji string
 * Use this when you need the emoji as a string instead of a component
 */
export function useSafeEmoji(options: {
  emoji?: string;
  type?: EmojiType;
  id?: string;
  fallback?: string;
}): string {
  const { emoji, type, id, fallback = '🏅' } = options;

  if (type && id) {
    switch (type) {
      case 'achievement':
        return getSafeAchievementEmoji(id, emoji);
      case 'equipment':
        return getSafeEquipmentEmoji(id, emoji);
      case 'pr':
        return getSafePREmoji(id);
    }
  }

  return sanitizeEmoji(emoji, fallback);
}

/**
 * Get safe emoji string (utility function)
 */
export function getSafeEmoji(options: {
  emoji?: string;
  type?: EmojiType;
  id?: string;
  fallback?: string;
}): string {
  const { emoji, type, id, fallback = '🏅' } = options;

  if (type && id) {
    switch (type) {
      case 'achievement':
        return getSafeAchievementEmoji(id, emoji);
      case 'equipment':
        return getSafeEquipmentEmoji(id, emoji);
      case 'pr':
        return getSafePREmoji(id);
    }
  }

  return sanitizeEmoji(emoji, fallback);
}



