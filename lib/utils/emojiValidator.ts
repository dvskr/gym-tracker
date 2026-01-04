/**
 * Emoji Validator & Sanitizer
 * Prevents corrupted emojis from displaying and provides fallbacks
 */

import { EMOJIS } from '../constants/emojis';

/**
 * Checks if a string contains corrupted emoji patterns
 */
export function isCorruptedEmoji(str: string): boolean {
  if (!str || str.length === 0) return true;
  
  // Known corrupted patterns from encoding issues
  const corruptedPatterns = [
    'x}', 'x{', 'x`', 'x:', 'xa', 'x ', 
    '>', '<', '<1', '>G', 
    '{}', '<>', '><',
    'a"', '㬰',
  ];
  
  // Check if the string matches any corrupted pattern exactly
  if (corruptedPatterns.includes(str.trim())) {
    console.warn(`[EmojiValidator] Detected exact corrupted pattern: "${str}"`);
    return true;
  }
  
  // Check if it contains corrupted patterns
  if (corruptedPatterns.some(pattern => str.includes(pattern))) {
    console.warn(`[EmojiValidator] Detected corrupted pattern in: "${str}"`);
    return true;
  }
  
  // If it's pure ASCII (no high Unicode), it's likely corrupted
  if (/^[\x00-\x7F]+$/.test(str) && str.length < 3) {
    console.warn(`[EmojiValidator] Detected ASCII-only string: "${str}"`);
    return true;
  }
  
  return false;
}

/**
 * Sanitizes emoji - returns fallback if invalid
 */
export function sanitizeEmoji(emoji: string | undefined | null, fallback: string = EMOJIS.default): string {
  if (!emoji) return fallback;
  
  if (isCorruptedEmoji(emoji)) {
    console.warn(`[EmojiValidator] Corrupted emoji detected: "${emoji}", using fallback: "${fallback}"`);
    return fallback;
  }
  
  return emoji;
}

/**
 * Safe achievement emoji map - single source of truth
 * NEVER add emojis directly as strings - import from constants/emojis.ts
 */
export const SAFE_ACHIEVEMENT_EMOJIS: Record<string, string> = {
  // Workout Milestones
  'first_workout': EMOJIS.target,
  'getting_started': EMOJIS.star,
  'committed': EMOJIS.muscle,
  'half_century': EMOJIS.shiningStar,
  'century_club': EMOJIS.hundredPoints,
  'dedicated': EMOJIS.diamond,
  'gym_rat': EMOJIS.fire,
  
  // Streak Achievements
  'three_day_streak': EMOJIS.streak3,
  'week_warrior': EMOJIS.calendar,
  'two_week_titan': EMOJIS.lightning,
  'month_master': EMOJIS.calendarFull,
  'iron_will': '🦾',
  'unstoppable': EMOJIS.crown,
  
  // Volume Achievements
  'first_ton': EMOJIS.weight,
  'heavy_lifter': EMOJIS.muscle,
  'volume_veteran': '🔱',
  'half_million_club': EMOJIS.sword,
  'million_pound_club': EMOJIS.diamond,
  
  // Exercise Variety
  'variety_seeker': EMOJIS.chartBar,
  'exercise_explorer': '🗺️',
  'movement_master': '🎓',
  'exercise_encyclopedia': '📚',
  
  // Personal Records
  'first_pr': EMOJIS.trophy,
  'pr_starter': EMOJIS.military,
  'pr_hunter': EMOJIS.target,
  'pr_machine': '⚙️',
  'record_breaker': '💥',
  'pr_legend': EMOJIS.crown,
  
  // Default fallback
  'default': EMOJIS.default,
};

/**
 * Gets safe emoji for achievement by ID
 */
export function getSafeAchievementEmoji(achievementId: string, providedEmoji?: string): string {
  // First try the safe map
  if (SAFE_ACHIEVEMENT_EMOJIS[achievementId]) {
    return SAFE_ACHIEVEMENT_EMOJIS[achievementId];
  }
  
  // Then try the provided emoji if it's valid
  if (providedEmoji && !isCorruptedEmoji(providedEmoji)) {
    return providedEmoji;
  }
  
  // Fallback to default
  return SAFE_ACHIEVEMENT_EMOJIS['default'];
}

/**
 * Safe equipment emoji map
 * NEVER add emojis directly as strings - import from constants/emojis.ts
 */
export const SAFE_EQUIPMENT_EMOJIS: Record<string, string> = {
  'none': EMOJIS.running,
  'dumbbells': EMOJIS.dumbbells,
  'barbell': EMOJIS.barbell,
  'kettlebell': EMOJIS.kettlebell,
  'machines': EMOJIS.machine,
  'pull_up_bar': EMOJIS.pullupBar,
  'dip_bars': EMOJIS.dipBars,
  'resistance_bands': EMOJIS.bands,
  'bench': EMOJIS.bench,
  'squat_rack': EMOJIS.rack,
  'leg_press': EMOJIS.legPress,
  'smith_machine': EMOJIS.smithMachine,
  'ez_bar': EMOJIS.ezBar,
  'trap_bar': EMOJIS.trapBar,
  'cables': EMOJIS.machine,
  'kettlebells': EMOJIS.kettlebell,
  'default': EMOJIS.weight,
};

/**
 * Gets safe emoji for equipment
 */
export function getSafeEquipmentEmoji(equipmentId: string, providedEmoji?: string): string {
  if (SAFE_EQUIPMENT_EMOJIS[equipmentId]) {
    return SAFE_EQUIPMENT_EMOJIS[equipmentId];
  }
  
  if (providedEmoji && !isCorruptedEmoji(providedEmoji)) {
    return providedEmoji;
  }
  
  return SAFE_EQUIPMENT_EMOJIS['default'];
}

/**
 * Safe PR notification emojis
 * NEVER add emojis directly as strings - import from constants/emojis.ts
 */
export const SAFE_PR_EMOJIS = {
  weight: EMOJIS.muscle,
  reps: EMOJIS.repeat,
  volume: EMOJIS.chartBar,
  default: EMOJIS.trophy,
};

/**
 * Gets safe emoji for PR type
 */
export function getSafePREmoji(prType: string): string {
  return SAFE_PR_EMOJIS[prType as keyof typeof SAFE_PR_EMOJIS] || SAFE_PR_EMOJIS.default;
}

