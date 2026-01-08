// Use Unicode codes to prevent emoji corruption
export const ACHIEVEMENT_ICONS = {
  // Workout
  target: '\u{1F3AF}',        // 🎯
  star: '\u{2B50}',           // ⭐
  flexedBiceps: '\u{1F4AA}',  // 💪
  glowingStar: '\u{1F31F}',   // 🌟
  hundred: '\u{1F4AF}',       // 💯
  gemStone: '\u{1F48E}',      // 💎
  fire: '\u{1F525}',          // 🔥
  crown: '\u{1F451}',         // 👑
  
  // Streak
  keycapThree: '\u{0033}\u{FE0F}\u{20E3}', // 3️⃣
  calendar: '\u{1F4C5}',      // 📅
  lightning: '\u{26A1}',      // ⚡
  spiralCalendar: '\u{1F5D3}', // 🗓️
  mechanicalArm: '\u{1F9BE}', // 🦾
  rocket: '\u{1F680}',        // 🚀
  globe: '\u{1F30D}',         // 🌍
  
  // Volume
  weightLifter: '\u{1F3CB}',  // 🏋️
  trident: '\u{1F531}',       // 🔱
  crossedSwords: '\u{2694}',  // ⚔️
  
  // Exercises
  barChart: '\u{1F4CA}',      // 📊
  worldMap: '\u{1F5FA}',      // 🗺️
  graduationCap: '\u{1F393}', // 🎓
  books: '\u{1F4DA}',         // 📚
  
  // PRs
  trophy: '\u{1F3C6}',        // 🏆
  medal: '\u{1F396}',         // 🎖️
  gear: '\u{2699}',           // ⚙️
  collision: '\u{1F4A5}',     // 💥
  
  // Time
  sunrise: '\u{1F305}',       // 🌅
  owl: '\u{1F989}',           // 🦉
  forkAndKnife: '\u{1F37D}',  // 🍽️
  partyPopper: '\u{1F389}',   // 🎉
  sun: '\u{2600}',            // ☀️
  fireworks: '\u{1F386}',     // 🎆
  
  // Consistency
  checkMark: '\u{2705}',      // ✅
  calendarCheck: '\u{1F4C6}', // 📆
  repeat: '\u{1F504}',        // 🔄
  sportsmedal: '\u{1F3C5}',   // 🏅
  
  // Style
  zap: '\u{26A1}',            // ⚡
  runner: '\u{1F3C3}',        // 🏃
  
  // Body
  leg: '\u{1F9B5}',           // 🦵
  leftRightArrow: '\u{2194}', // ↔️
} as const;

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export type AchievementCategory = 
  | 'workouts' 
  | 'streak' 
  | 'volume' 
  | 'exercises' 
  | 'prs'
  | 'time'
  | 'consistency'
  | 'style'
  | 'body';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  iconKey: keyof typeof ACHIEVEMENT_ICONS;
  category: AchievementCategory;
  tier: AchievementTier;
  requirement: number;
  checkType: 'total' | 'single' | 'streak' | 'time' | 'custom';
  checkField?: string;
  customCheck?: string;
}

// Tier colors and styling
export const TIER_CONFIG = {
  bronze: {
    color: '#CD7F32',
    backgroundColor: 'rgba(205, 127, 50, 0.15)',
    borderWidth: 1,
    glowOpacity: 0,
    label: 'Bronze',
  },
  silver: {
    color: '#C0C0C0',
    backgroundColor: 'rgba(192, 192, 192, 0.15)',
    borderWidth: 2,
    glowOpacity: 0.2,
    label: 'Silver',
  },
  gold: {
    color: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 2,
    glowOpacity: 0.4,
    label: 'Gold',
  },
  platinum: {
    color: '#E5E4E2',
    backgroundColor: 'rgba(229, 228, 226, 0.2)',
    borderWidth: 3,
    glowOpacity: 0.6,
    label: 'Platinum',
    shimmer: true,
  },
} as const;

// ============================================
// ALL 50 ACHIEVEMENTS
// ============================================

export const ACHIEVEMENTS: Achievement[] = [
  // ============================================
  // WORKOUT MILESTONES (8)
  // ============================================
  {
    id: 'workout_1',
    name: 'First Steps',
    description: 'Complete your first workout',
    iconKey: 'target',
    category: 'workouts',
    tier: 'bronze',
    requirement: 1,
    checkType: 'total',
    checkField: 'totalWorkouts',
  },
  {
    id: 'workout_5',
    name: 'Getting Started',
    description: 'Complete 5 workouts',
    iconKey: 'star',
    category: 'workouts',
    tier: 'bronze',
    requirement: 5,
    checkType: 'total',
    checkField: 'totalWorkouts',
  },
  {
    id: 'workout_25',
    name: 'Building Habits',
    description: 'Complete 25 workouts',
    iconKey: 'flexedBiceps',
    category: 'workouts',
    tier: 'silver',
    requirement: 25,
    checkType: 'total',
    checkField: 'totalWorkouts',
  },
  {
    id: 'workout_50',
    name: 'Half Century',
    description: 'Complete 50 workouts',
    iconKey: 'glowingStar',
    category: 'workouts',
    tier: 'silver',
    requirement: 50,
    checkType: 'total',
    checkField: 'totalWorkouts',
  },
  {
    id: 'workout_100',
    name: 'Century Club',
    description: 'Complete 100 workouts',
    iconKey: 'hundred',
    category: 'workouts',
    tier: 'gold',
    requirement: 100,
    checkType: 'total',
    checkField: 'totalWorkouts',
  },
  {
    id: 'workout_250',
    name: 'Dedicated',
    description: 'Complete 250 workouts',
    iconKey: 'gemStone',
    category: 'workouts',
    tier: 'gold',
    requirement: 250,
    checkType: 'total',
    checkField: 'totalWorkouts',
  },
  {
    id: 'workout_500',
    name: 'Gym Rat',
    description: 'Complete 500 workouts',
    iconKey: 'fire',
    category: 'workouts',
    tier: 'platinum',
    requirement: 500,
    checkType: 'total',
    checkField: 'totalWorkouts',
  },
  {
    id: 'workout_1000',
    name: 'Living Legend',
    description: 'Complete 1000 workouts',
    iconKey: 'crown',
    category: 'workouts',
    tier: 'platinum',
    requirement: 1000,
    checkType: 'total',
    checkField: 'totalWorkouts',
  },

  // ============================================
  // STREAK ACHIEVEMENTS (7)
  // ============================================
  {
    id: 'streak_3',
    name: 'Three-Peat',
    description: '3-day workout streak',
    iconKey: 'keycapThree',
    category: 'streak',
    tier: 'bronze',
    requirement: 3,
    checkType: 'streak',
    checkField: 'currentStreak',
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: '7-day workout streak',
    iconKey: 'calendar',
    category: 'streak',
    tier: 'bronze',
    requirement: 7,
    checkType: 'streak',
    checkField: 'currentStreak',
  },
  {
    id: 'streak_14',
    name: 'Two Week Titan',
    description: '14-day workout streak',
    iconKey: 'lightning',
    category: 'streak',
    tier: 'silver',
    requirement: 14,
    checkType: 'streak',
    checkField: 'currentStreak',
  },
  {
    id: 'streak_30',
    name: 'Month Master',
    description: '30-day workout streak',
    iconKey: 'spiralCalendar',
    category: 'streak',
    tier: 'gold',
    requirement: 30,
    checkType: 'streak',
    checkField: 'currentStreak',
  },
  {
    id: 'streak_60',
    name: 'Iron Will',
    description: '60-day workout streak',
    iconKey: 'mechanicalArm',
    category: 'streak',
    tier: 'gold',
    requirement: 60,
    checkType: 'streak',
    checkField: 'currentStreak',
  },
  {
    id: 'streak_100',
    name: 'Unstoppable',
    description: '100-day workout streak',
    iconKey: 'rocket',
    category: 'streak',
    tier: 'platinum',
    requirement: 100,
    checkType: 'streak',
    checkField: 'currentStreak',
  },
  {
    id: 'streak_365',
    name: 'Year of Iron',
    description: '365-day workout streak',
    iconKey: 'crown',
    category: 'streak',
    tier: 'platinum',
    requirement: 365,
    checkType: 'streak',
    checkField: 'longestStreak',
  },

  // ============================================
  // VOLUME ACHIEVEMENTS (6)
  // ============================================
  {
    id: 'volume_2000',
    name: 'First Ton',
    description: 'Lift 2,000 lbs total',
    iconKey: 'weightLifter',
    category: 'volume',
    tier: 'bronze',
    requirement: 2000,
    checkType: 'total',
    checkField: 'totalVolume',
  },
  {
    id: 'volume_50000',
    name: 'Heavy Lifter',
    description: 'Lift 50,000 lbs total',
    iconKey: 'flexedBiceps',
    category: 'volume',
    tier: 'silver',
    requirement: 50000,
    checkType: 'total',
    checkField: 'totalVolume',
  },
  {
    id: 'volume_250000',
    name: 'Quarter Million',
    description: 'Lift 250,000 lbs total',
    iconKey: 'trident',
    category: 'volume',
    tier: 'silver',
    requirement: 250000,
    checkType: 'total',
    checkField: 'totalVolume',
  },
  {
    id: 'volume_500000',
    name: 'Half Million Club',
    description: 'Lift 500,000 lbs total',
    iconKey: 'crossedSwords',
    category: 'volume',
    tier: 'gold',
    requirement: 500000,
    checkType: 'total',
    checkField: 'totalVolume',
  },
  {
    id: 'volume_1000000',
    name: 'Million Pound Club',
    description: 'Lift 1,000,000 lbs total',
    iconKey: 'gemStone',
    category: 'volume',
    tier: 'platinum',
    requirement: 1000000,
    checkType: 'total',
    checkField: 'totalVolume',
  },
  {
    id: 'volume_2000000',
    name: 'Two Million Club',
    description: 'Lift 2,000,000 lbs total',
    iconKey: 'crown',
    category: 'volume',
    tier: 'platinum',
    requirement: 2000000,
    checkType: 'total',
    checkField: 'totalVolume',
  },

  // ============================================
  // EXERCISE VARIETY (4)
  // ============================================
  {
    id: 'exercises_10',
    name: 'Variety Seeker',
    description: 'Try 10 unique exercises',
    iconKey: 'barChart',
    category: 'exercises',
    tier: 'bronze',
    requirement: 10,
    checkType: 'total',
    checkField: 'uniqueExercises',
  },
  {
    id: 'exercises_25',
    name: 'Exercise Explorer',
    description: 'Try 25 unique exercises',
    iconKey: 'worldMap',
    category: 'exercises',
    tier: 'silver',
    requirement: 25,
    checkType: 'total',
    checkField: 'uniqueExercises',
  },
  {
    id: 'exercises_50',
    name: 'Movement Master',
    description: 'Try 50 unique exercises',
    iconKey: 'graduationCap',
    category: 'exercises',
    tier: 'gold',
    requirement: 50,
    checkType: 'total',
    checkField: 'uniqueExercises',
  },
  {
    id: 'exercises_100',
    name: 'Exercise Encyclopedia',
    description: 'Try 100 unique exercises',
    iconKey: 'books',
    category: 'exercises',
    tier: 'platinum',
    requirement: 100,
    checkType: 'total',
    checkField: 'uniqueExercises',
  },

  // ============================================
  // PERSONAL RECORDS (6)
  // ============================================
  {
    id: 'prs_1',
    name: 'First PR',
    description: 'Set your first personal record',
    iconKey: 'trophy',
    category: 'prs',
    tier: 'bronze',
    requirement: 1,
    checkType: 'total',
    checkField: 'totalPRs',
  },
  {
    id: 'prs_5',
    name: 'PR Starter',
    description: 'Set 5 personal records',
    iconKey: 'medal',
    category: 'prs',
    tier: 'bronze',
    requirement: 5,
    checkType: 'total',
    checkField: 'totalPRs',
  },
  {
    id: 'prs_10',
    name: 'PR Hunter',
    description: 'Set 10 personal records',
    iconKey: 'target',
    category: 'prs',
    tier: 'silver',
    requirement: 10,
    checkType: 'total',
    checkField: 'totalPRs',
  },
  {
    id: 'prs_25',
    name: 'PR Machine',
    description: 'Set 25 personal records',
    iconKey: 'gear',
    category: 'prs',
    tier: 'silver',
    requirement: 25,
    checkType: 'total',
    checkField: 'totalPRs',
  },
  {
    id: 'prs_50',
    name: 'Record Breaker',
    description: 'Set 50 personal records',
    iconKey: 'collision',
    category: 'prs',
    tier: 'gold',
    requirement: 50,
    checkType: 'total',
    checkField: 'totalPRs',
  },
  {
    id: 'prs_100',
    name: 'PR Legend',
    description: 'Set 100 personal records',
    iconKey: 'crown',
    category: 'prs',
    tier: 'platinum',
    requirement: 100,
    checkType: 'total',
    checkField: 'totalPRs',
  },

  // ============================================
  // TIME-BASED (6)
  // ============================================
  {
    id: 'time_early_bird',
    name: 'Early Bird',
    description: 'Complete a workout before 6 AM',
    iconKey: 'sunrise',
    category: 'time',
    tier: 'bronze',
    requirement: 1,
    checkType: 'custom',
    customCheck: 'workoutBeforeHour:6',
  },
  {
    id: 'time_night_owl',
    name: 'Night Owl',
    description: 'Complete a workout after 10 PM',
    iconKey: 'owl',
    category: 'time',
    tier: 'bronze',
    requirement: 1,
    checkType: 'custom',
    customCheck: 'workoutAfterHour:22',
  },
  {
    id: 'time_lunch_lifter',
    name: 'Lunch Break Lifter',
    description: 'Complete a workout between 12-1 PM',
    iconKey: 'forkAndKnife',
    category: 'time',
    tier: 'silver',
    requirement: 1,
    checkType: 'custom',
    customCheck: 'workoutBetweenHours:12:13',
  },
  {
    id: 'time_weekend_warrior',
    name: 'Weekend Warrior',
    description: 'Complete 10 weekend workouts',
    iconKey: 'partyPopper',
    category: 'time',
    tier: 'silver',
    requirement: 10,
    checkType: 'total',
    checkField: 'weekendWorkouts',
  },
  {
    id: 'time_5am_club',
    name: '5 AM Club',
    description: 'Complete 10 workouts before 6 AM',
    iconKey: 'sun',
    category: 'time',
    tier: 'gold',
    requirement: 10,
    checkType: 'total',
    checkField: 'earlyWorkouts',
  },
  {
    id: 'time_new_year',
    name: 'New Year Resolution',
    description: 'Complete a workout on January 1st',
    iconKey: 'fireworks',
    category: 'time',
    tier: 'gold',
    requirement: 1,
    checkType: 'custom',
    customCheck: 'workoutOnDate:01-01',
  },

  // ============================================
  // CONSISTENCY (6)
  // ============================================
  {
    id: 'consistency_perfect_week',
    name: 'Perfect Week',
    description: 'Complete 4+ workouts in one week',
    iconKey: 'checkMark',
    category: 'consistency',
    tier: 'bronze',
    requirement: 1,
    checkType: 'custom',
    customCheck: 'workoutsInWeek:4',
  },
  {
    id: 'consistency_comeback',
    name: 'Comeback King',
    description: 'Workout after 7+ day break',
    iconKey: 'repeat',
    category: 'consistency',
    tier: 'bronze',
    requirement: 1,
    checkType: 'custom',
    customCheck: 'workoutAfterBreak:7',
  },
  {
    id: 'consistency_perfect_month',
    name: 'Perfect Month',
    description: '4+ workouts/week for 4 consecutive weeks',
    iconKey: 'calendarCheck',
    category: 'consistency',
    tier: 'silver',
    requirement: 1,
    checkType: 'custom',
    customCheck: 'perfectWeeksConsecutive:4',
  },
  {
    id: 'consistency_no_excuses',
    name: 'No Excuses',
    description: 'Complete a workout on a holiday',
    iconKey: 'flexedBiceps',
    category: 'consistency',
    tier: 'silver',
    requirement: 1,
    checkType: 'custom',
    customCheck: 'workoutOnHoliday',
  },
  {
    id: 'consistency_monthly_regular',
    name: 'Monthly Regular',
    description: 'Workout every week for 3 months',
    iconKey: 'sportsmedal',
    category: 'consistency',
    tier: 'gold',
    requirement: 12,
    checkType: 'custom',
    customCheck: 'consecutiveWeeksWithWorkout:12',
  },
  {
    id: 'consistency_year_round',
    name: 'Year-Round Athlete',
    description: 'Workout every month for 12 months',
    iconKey: 'globe',
    category: 'consistency',
    tier: 'platinum',
    requirement: 12,
    checkType: 'custom',
    customCheck: 'consecutiveMonthsWithWorkout:12',
  },

  // ============================================
  // WORKOUT STYLE (4)
  // ============================================
  {
    id: 'style_quick',
    name: 'Quick & Dirty',
    description: 'Complete a workout under 30 minutes',
    iconKey: 'zap',
    category: 'style',
    tier: 'bronze',
    requirement: 1,
    checkType: 'custom',
    customCheck: 'workoutDurationUnder:30',
  },
  {
    id: 'style_marathon',
    name: 'Marathon Session',
    description: 'Complete a workout over 90 minutes',
    iconKey: 'runner',
    category: 'style',
    tier: 'silver',
    requirement: 1,
    checkType: 'custom',
    customCheck: 'workoutDurationOver:90',
  },
  {
    id: 'style_century_reps',
    name: 'Century Reps',
    description: '100+ reps in a single workout',
    iconKey: 'hundred',
    category: 'style',
    tier: 'silver',
    requirement: 100,
    checkType: 'single',
    checkField: 'workoutTotalReps',
  },
  {
    id: 'style_volume_king',
    name: 'Volume King',
    description: '50,000+ lbs in a single workout',
    iconKey: 'crown',
    category: 'style',
    tier: 'gold',
    requirement: 50000,
    checkType: 'single',
    checkField: 'workoutVolume',
  },

  // ============================================
  // BODY FOCUS (3)
  // ============================================
  {
    id: 'body_leg_day',
    name: 'Never Skip Leg Day',
    description: 'Complete 20 leg-focused workouts',
    iconKey: 'leg',
    category: 'body',
    tier: 'silver',
    requirement: 20,
    checkType: 'total',
    checkField: 'legWorkouts',
  },
  {
    id: 'body_push_pull',
    name: 'Push Pull Master',
    description: 'Complete 10 push + 10 pull workouts',
    iconKey: 'leftRightArrow',
    category: 'body',
    tier: 'silver',
    requirement: 10,
    checkType: 'custom',
    customCheck: 'pushAndPullWorkouts:10',
  },
  {
    id: 'body_full_body',
    name: 'Full Body Fan',
    description: 'Complete 10 full-body workouts',
    iconKey: 'repeat',
    category: 'body',
    tier: 'gold',
    requirement: 10,
    checkType: 'total',
    checkField: 'fullBodyWorkouts',
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getAchievementIcon(iconKey: keyof typeof ACHIEVEMENT_ICONS): string {
  return ACHIEVEMENT_ICONS[iconKey];
}

export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.category === category);
}

export function getAchievementsByTier(tier: AchievementTier): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.tier === tier);
}

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  workouts: 'Workout Milestones',
  streak: 'Streak Achievements',
  volume: 'Volume Achievements',
  exercises: 'Exercise Variety',
  prs: 'Personal Records',
  time: 'Time-Based',
  consistency: 'Consistency',
  style: 'Workout Style',
  body: 'Body Focus',
};

export const CATEGORY_ICONS: Record<AchievementCategory, keyof typeof ACHIEVEMENT_ICONS> = {
  workouts: 'flexedBiceps',
  streak: 'fire',
  volume: 'weightLifter',
  exercises: 'barChart',
  prs: 'trophy',
  time: 'calendar',
  consistency: 'checkMark',
  style: 'lightning',
  body: 'leg',
};

export const TIER_ORDER: Record<AchievementTier, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
};

