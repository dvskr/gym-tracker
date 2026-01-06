/**
 * Centralized Emoji Constants
 * 
 * ALL emojis in the app MUST be defined here.
 * Never use emoji literals directly in components.
 * 
 * Usage:
 * import { EMOJIS } from '@/lib/constants/emojis';
 * <Text>{EMOJIS.success}</Text>
 */

export const EMOJIS = {
  // Success & Celebration
  success: '🎉',
  party: '🎊',
  trophy: '🏆',
  medal: '🏅',
  star: '⭐',
  sparkles: '✨',
  fire: '🔥',
  rocket: '🚀',
  
  // Workout & Fitness
  muscle: '💪',
  weight: '🏋️',
  weightMale: '🏋️‍♂️',
  weightFemale: '🏋️‍♀️',
  dumbbell: '🏋️',
  running: '🏃',
  
  // Progress & Growth
  chart: '📈',
  chartBar: '📊',
  target: '🎯',
  dart: '🎯',
  lightning: '⚡',
  gem: '💎',
  crown: '👑',
  
  // Notifications & Alerts
  bell: '🔔',
  alarmClock: '⏰',
  calendar: '📅',
  calendarFull: '🗓️',
  timer: '⏱️',
  
  // Status & Feedback
  check: '✅',
  cross: '❌',
  warning: '⚠️',
  info: '💡',
  question: '❓',
  
  // Repetition & Count
  repeat: '🔁',
  loop: '🔄',
  numbers: '🔢',
  
  // Body & Health
  heart: '❤️',
  heartbeat: '💗',
  leg: '🦵',
  arm: '💪',
  
  // Equipment (from safe map)
  barbell: '🏋️‍♂️',
  dumbbells: '🏋️',
  kettlebell: '⚫',
  machine: '🎰',
  pullupBar: '🔺',
  dipBars: '💪',
  bands: '🔗',
  bench: '🛋️',
  rack: '🏗️',
  legPress: '🦵',
  smithMachine: '🏭',
  ezBar: '🎯',
  trapBar: '⬡',
  
  // Streak & Consistency
  streak3: '3️⃣',
  streakFire: '🔥',
  trophy1: '🏆',
  trophy2: '🏆',
  military: '🎖️',
  
  // Volume Milestones
  celebration: '🎊',
  rocketLaunch: '🚀',
  diamond: '💎',
  shiningStar: '🌟',
  bigTrophy: '🏆',
  
  // Goals
  flag: '🚩',
  bullseye: '🎯',
  mountainTop: '⛰️',
  
  // Time of Day
  sunrise: '🌅',
  moon: '🌙',
  sword: '⚔️',
  
  // Misc
  hundredPoints: '💯',
  eyes: '👀',
  brain: '🧠',
  stopwatch: '⏱️',
  
  // Default fallback
  default: '🏅',
} as const;

// Type-safe emoji keys
export type EmojiKey = keyof typeof EMOJIS;

/**
 * Get emoji by key with fallback
 */
export function getEmoji(key: EmojiKey, fallback: string = EMOJIS.default): string {
  return EMOJIS[key] || fallback;
}

/**
 * Validate that a string is a known safe emoji
 */
export function isKnownEmoji(emoji: string): boolean {
  return Object.values(EMOJIS).includes(emoji as any);
}


