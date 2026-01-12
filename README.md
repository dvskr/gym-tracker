# 💪 Gym Tracker - AI-Powered Workout Tracking App

> A comprehensive, production-ready gym workout tracking application with AI coaching, offline-first architecture, health integrations, and advanced progress analytics.

![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-blue)
![React Native](https://img.shields.io/badge/React%20Native-0.81-green)
![Expo](https://img.shields.io/badge/Expo-SDK%2054-purple)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Technical Stack](#-technical-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Configuration](#-configuration)
- [Database Schema](#-database-schema)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Scripts](#-scripts)
- [AI System](#-ai-system)
- [Offline-First Architecture](#-offline-first-architecture)
- [Health Integrations](#-health-integrations)
- [Monetization](#-monetization)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**Gym Tracker** is a full-featured mobile workout tracking application designed to help fitness enthusiasts of all levels log workouts, track progress, and achieve their fitness goals. Built with modern technologies and production-ready best practices, this app combines manual tracking with intelligent database-driven algorithms and AI-powered coaching.

### What Makes This App Different?

- **423+ Exercise Library**: Comprehensive database with animated GIFs, muscle targeting, and equipment filters
- **Intelligent Training System**: Smart progressive overload, plateau detection, and recovery tracking using efficient algorithms
- **AI Coach Chat**: GPT-4o-mini powered conversational fitness coach
- **Smart Workout Suggestions**: Database-driven workout planning based on recovery and history
- **True Offline-First**: Full functionality without internet, with automatic conflict resolution when syncing
- **Health Integration**: Bidirectional sync with Apple Health (iOS) and Health Connect (Android)
- **Smart Notifications**: Workout reminders, rest timer alerts, PR celebrations, and engagement notifications
- **Production Ready**: Complete error handling, monitoring, rate limiting, and cost protection
- **Extremely Profitable**: Efficient hybrid AI system with minimal costs

### Target Audience

- **Gym Enthusiasts**: Serious lifters who want detailed tracking and progressive overload
- **Beginners**: Users new to fitness who need AI guidance and workout suggestions
- **Athletes**: Competitive individuals tracking personal records and performance metrics
- **Coaches**: Professionals using templates and data analysis for clients

---

## ✨ Key Features

### 🏋️ Core Workout Features

#### Workout Logging
- Quick workout creation from templates or scratch
- Live workout tracking with exercise cards
- One-tap set completion with instant feedback
- Support for 4 set types: Normal, Warmup, Dropset, Failure
- RPE (Rate of Perceived Exertion) tracking
- Real-time PR (Personal Record) detection
- Exercise notes and custom observations
- Workout duration tracking
- Total volume calculations

#### Rest Timer
- Configurable rest periods per exercise
- Auto-start after set completion (optional)
- Visual countdown with progress bar
- +30 second quick extend button
- Skip rest timer option
- Background countdown continues
- Push notifications when rest complete
- Sound and vibration alerts (customizable)
- 10-second warning haptic feedback

#### Exercise Execution
- Previous workout reference (shows last weight/reps)
- Auto-fill from last session (optional)
- Flexible measurement support:
  - Weight & Reps (traditional)
  - Duration (for planks, holds)
  - Distance (for cardio)
  - Assisted weight (for machines)
- Reorder exercises via drag-and-drop
- Replace exercises mid-workout
- Delete exercises from active workout
- PR celebration animations and confetti
- Heart rate monitoring during workout (if connected)

### 📚 Exercise Library

#### Database Statistics
- **Total Exercises**: 423 active exercises
- **Categories**: 10 muscle groups
- **Equipment Types**: 17 different equipment categories
- **Media Assets**: 474 exercise GIFs + 847 thumbnails

#### Exercise Categories

| Category | Count | Examples |
|----------|-------|----------|
| **Back** | 76 | Pull-ups, Rows, Lat Pulldowns, Deadlifts |
| **Chest** | 50 | Bench Press, Flyes, Push-ups, Dips |
| **Upper Legs** | 98 | Squats, Lunges, Leg Press, Romanian Deadlifts |
| **Shoulders** | 49 | Overhead Press, Lateral Raises, Face Pulls |
| **Upper Arms** | 59 | Bicep Curls, Tricep Extensions, Dips |
| **Lower Legs** | 23 | Calf Raises (seated, standing, donkey) |
| **Waist/Core** | 34 | Crunches, Planks, Russian Twists, Leg Raises |
| **Cardio** | 16 | Treadmill, Rowing, Bike, Jump Rope |
| **Full Body** | 9 | Burpees, Kettlebell Swings, Thrusters |
| **Lower Arms** | 9 | Wrist Curls, Forearm Exercises |

#### Exercise Features
- Animated GIFs for visual demonstration
- Thumbnail previews for fast loading
- Muscle targeting (primary and secondary muscles)
- Equipment filtering
- Fast fuzzy search using Fuse.js
- Favorites system
- Custom exercise creation
- Exercise history tracking
- PR tracking per exercise

### 📈 Progress Tracking

#### Personal Records (PRs)
- **Max Weight PR**: Heaviest weight lifted for any rep count
- **Max Reps PR**: Most reps performed at a specific weight
- **Max Volume PR**: Highest total weight × reps in a single set
- Real-time detection during workout
- PR celebration with animations and confetti
- Trophy icons and badges
- Sound effects and haptic feedback
- PR history timeline

#### Analytics & Statistics
- Total workouts completed
- Current and longest streaks
- Total volume lifted (all-time)
- Average workout duration
- Workouts per week/month
- Rest days analysis
- Volume tracking (daily, weekly, monthly)
- Strength progression charts
- One-rep max (1RM) estimates
- Muscle group distribution
- Exercise frequency heatmap

### 📷 Body Tracking

#### Weight Logging
- Quick weight entry from home screen
- Weight history timeline
- Weight chart with trend line
- Daily/weekly/monthly views
- Goal weight setting
- Weight gain/loss calculations
- Sync with Apple Health/Health Connect

#### Body Measurements
- Comprehensive measurements (chest, waist, hips, etc.)
- Biceps, forearms, thighs, calves (left/right)
- Body fat percentage
- Measurement history with charts
- Progress photos integration

#### Progress Photos
- Front, side, back pose presets
- Photo gallery with date stamps
- Before/after comparison slider
- Grid view of photo timeline
- Fullscreen photo viewer
- Photo metadata (date, weight, measurements)
- Private and secure storage

### 🤖 AI Coaching System

The app features a hybrid coaching system with one true AI feature (Coach Chat powered by OpenAI GPT-4o-mini) and multiple intelligent rule-based features, all with enterprise-grade rate limiting, usage tracking, and cost protection.

#### AI Features

1. **AI Coach Chat** 🤖 *(REAL AI - OpenAI GPT-4o-mini)*
   - Interactive chat interface for fitness questions
   - Personalized responses based on your workout history
   - Can suggest complete workouts with "Start This Workout" button
   - Rate limited (10 free/day, 100 premium/day)
   - Cost: ~$0.0003 per message

2. **Workout Suggestions** 📊 *(Database-driven)*
   - Recovery-based workout recommendations
   - Muscle group analysis from workout history
   - Personalized exercise selection from your history
   - Zero API costs (pure database queries)

3. **Progressive Overload Recommendations** 🧮 *(Rule-based algorithm)*
   - Intelligent weight and rep recommendations
   - Based on last 30 days of performance
   - Smart weight increments (2.5-10 lbs based on current weight)
   - Fatigue-adjusted for later sets
   - Zero API costs (pure calculations)

4. **Form Tips** 📚 *(Database-driven)*
   - Pre-written form cues for every exercise
   - Breathing techniques and safety tips
   - Common mistakes to avoid
   - Zero API costs (database lookups)

5. **Plateau Detection** 📈 *(Rule-based algorithm)*
   - Monitors progress across all exercises
   - Alerts when stagnation detected (4+ sessions)
   - Provides actionable recommendations
   - Zero API costs (pure algorithmic detection)

6. **Recovery Status** ⏱️ *(Time-based calculations)*
   - Estimates muscle group recovery
   - Based on training frequency and volume
   - Standard recovery windows (48-72 hours)
   - Suggests optimal workout focus
   - Zero API costs (time calculations)

**Cost Efficiency**: Only 1 out of 6 "AI" features actually uses OpenAI API. The rest are sophisticated database queries and algorithms that work completely offline and incur zero costs.

### 📋 Templates & Planning

#### Workout Templates
- Create custom workout templates
- Pre-built templates for common splits
- Template folders/organization
- Duplicate and edit templates
- Start workout from template (one-tap)
- Template preview before starting
- Recently used templates

#### Default Templates
- Push Day (Chest, Shoulders, Triceps)
- Pull Day (Back, Biceps)
- Leg Day (Quads, Hamstrings, Glutes, Calves)
- Upper Body
- Lower Body
- Full Body
- Arm Day

### ☁️ Data & Sync

#### Offline-First Architecture
- Log workouts completely offline
- View all historical data
- Create/edit templates
- Track body weight and measurements
- View exercise library
- Access all settings
- View charts and analytics

#### Sync System
- Automatic background sync when online
- Conflict resolution (last-write-wins with intelligent merging)
- Real-time updates via Supabase Realtime
- Sync queue with retry logic
- Manual sync trigger
- Sync status indicator
- Multi-device support

### 🏥 Health Integrations

#### Apple Health (iOS)
- Bidirectional weight sync
- Workout export (type, duration, calories)
- Heart rate monitoring during workouts
- Body measurements sync
- Steps import
- Sleep data for recovery tracking

#### Health Connect (Android)
- Weight sync (bidirectional)
- Exercise sessions export
- Heart rate monitoring
- Steps & activity tracking
- Sleep tracking

### 🔔 Notifications

#### Notification Types
1. **Rest Timer**: Alerts when rest period completes
2. **Workout Reminders**: Scheduled reminders for specific days/times
3. **PR Celebrations**: Instant notification when PR achieved
4. **Achievement Notifications**: Streak milestones, workout counts, volume milestones
5. **Engagement Notifications**: Inactivity reminders, streak risk alerts, weekly summaries

#### Notification Settings
- Master enable/disable toggle
- Per-type controls
- Sound and vibration settings
- Quiet hours configuration
- Custom reminder scheduling

### ⚙️ Settings & Customization

- **Unit System**: Imperial (lbs, inches) or Metric (kg, cm)
- **Theme**: Dark mode, Light mode, or System default
- **Workout Preferences**: Rest timer defaults, auto-start, sound, haptics
- **Plate Calculator**: Barbell weight and available plate configuration
- **Account Settings**: Email, password, profile picture, display name
- **Privacy Settings**: Data export, account deletion

---

## 🛠 Technical Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React Native** | 0.81.5 | Cross-platform mobile framework |
| **Expo** | SDK 54 | Development and build platform |
| **TypeScript** | 5.9.2 | Type-safe development |
| **Zustand** | 5.0.9 | State management |
| **React Query** | 5.90.16 | Server state management |
| **Expo Router** | 6.0.21 | File-based navigation |
| **React Native Reanimated** | 4.1.1 | High-performance animations |
| **Lucide React Native** | 0.562.0 | Icon library |

### UI Libraries

| Library | Purpose |
|---------|---------|
| `@shopify/flash-list` | Performant lists |
| `react-native-chart-kit` | Charts and graphs |
| `react-native-svg` | Vector graphics |
| `react-native-calendars` | Calendar picker |
| `react-native-confetti-cannon` | PR celebrations |
| `expo-image` | Optimized image loading |
| `expo-linear-gradient` | Gradient backgrounds |

### Backend

| Technology | Purpose |
|------------|---------|
| **Supabase** | Backend-as-a-Service |
| **PostgreSQL** | Primary database |
| **Supabase Realtime** | WebSocket subscriptions |
| **Supabase Storage** | File storage (photos, backups) |
| **Supabase Edge Functions** | Serverless functions |
| **Supabase Auth** | Authentication |

### AI/ML

| Service | Purpose | Cost |
|---------|---------|------|
| **OpenAI GPT-4o-mini** | AI coaching chat only | ~$0.0003 per message |

### Platform Integrations

| Platform | Library | Purpose |
|----------|---------|---------|
| **iOS** | `react-native-health` | Apple Health integration |
| **Android** | `expo-health-connect`, `react-native-health-connect` | Health Connect integration |
| **Notifications** | `expo-notifications` | Push notifications |
| **Error Tracking** | `@sentry/react-native` | Production error monitoring |
| **Purchases** | `react-native-purchases` | In-app purchases (RevenueCat) |

### Development Tools

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit testing |
| **@testing-library/react-native** | Component testing |
| **TSX** | TypeScript execution for scripts |
| **Dotenv** | Environment variable management |
| **Sharp** | Image processing (thumbnails) |

---

## 🏗 Architecture

### Project Structure

```
gym-tracker/
├── app/                      # Expo Router screens (file-based routing)
│   ├── _layout.tsx          # Root layout with providers
│   ├── index.tsx            # Landing/splash screen
│   ├── (auth)/              # Authentication screens
│   │   ├── _layout.tsx      # Auth layout
│   │   ├── login.tsx        # Login screen
│   │   ├── signup.tsx       # Signup screen
│   │   └── forgot-password.tsx
│   ├── (tabs)/              # Main tab navigation (authenticated)
│   │   ├── _layout.tsx      # Tab bar layout
│   │   ├── index.tsx        # Home screen (dashboard)
│   │   ├── workout.tsx      # Workout planning & templates
│   │   ├── history.tsx      # Workout history
│   │   ├── progress.tsx     # Charts and analytics
│   │   └── profile.tsx      # User profile
│   ├── body/                # Body tracking screens
│   │   ├── index.tsx        # Body tracking overview
│   │   ├── weight.tsx       # Weight logging
│   │   ├── weight-chart.tsx # Weight chart visualization
│   │   ├── measurements.tsx # Body measurements
│   │   ├── goal.tsx         # Body goals
│   │   └── photos/          # Progress photos
│   ├── coach.tsx            # AI coach chat
│   ├── exercise/            # Exercise library
│   │   ├── index.tsx        # Exercise list
│   │   ├── add-custom.tsx   # Create custom exercise
│   │   └── [id]/            # Exercise details
│   ├── notifications.tsx    # Notification center
│   ├── prs.tsx             # Personal records
│   ├── achievements.tsx     # Achievements screen
│   ├── settings/           # Settings screens (20 screens)
│   │   ├── account.tsx      # Account settings
│   │   ├── profile.tsx      # Profile settings
│   │   ├── units.tsx        # Unit preferences
│   │   ├── workout.tsx      # Workout preferences
│   │   ├── notifications.tsx # Notification settings
│   │   ├── health.tsx       # Health sync settings
│   │   ├── ai.tsx           # AI feature settings
│   │   ├── subscription.tsx # Premium subscription
│   │   └── ...              # More settings
│   ├── template/           # Template management
│   │   ├── index.tsx        # Template list
│   │   ├── create.tsx       # Create template
│   │   ├── add-exercise.tsx # Add exercise to template
│   │   └── [id].tsx         # Edit template
│   └── workout/            # Active workout screens
│       ├── active.tsx       # Live workout tracking
│       ├── complete.tsx     # Post-workout summary
│       └── [id].tsx         # Workout detail view
│
├── components/              # Reusable components
│   ├── ui/                 # Base UI components (buttons, inputs, cards)
│   ├── workout/            # Workout-specific components (12 files)
│   │   ├── ExerciseCard.tsx
│   │   ├── RestTimer.tsx
│   │   ├── SetRow.tsx
│   │   └── ...
│   ├── ai/                 # AI-related UI components (11 files)
│   ├── body/               # Body tracking components (4 files)
│   ├── health/             # Health integration UI (5 files)
│   ├── home/               # Home screen widgets (3 files)
│   ├── modals/             # Modal dialogs (5 files)
│   ├── notifications/      # Notification components (5 files)
│   ├── sync/               # Sync status UI (3 files)
│   └── template/           # Template components (7 files)
│
├── lib/                    # Business logic and utilities
│   ├── api/                # Supabase API calls (15 files)
│   │   ├── workouts.ts     # Workout CRUD operations
│   │   ├── exercises.ts    # Exercise library operations
│   │   ├── templates.ts    # Template operations
│   │   └── ...
│   ├── ai/                 # AI service and features (25 files)
│   │   ├── aiService.ts    # Main AI client (OpenAI integration)
│   │   ├── workoutSuggestions.ts # Database-driven suggestions
│   │   ├── progressiveOverload.ts # Rule-based calculations
│   │   ├── formTips.ts     # Database form tips
│   │   ├── plateauDetection.ts # Algorithm-based detection
│   │   ├── recoveryService.ts # Time-based calculations
│   │   └── contextBuilder.ts # User context for AI
│   ├── health/             # Health integrations (9 files)
│   │   ├── appleHealth.ts
│   │   ├── healthConnect.ts
│   │   └── ...
│   ├── notifications/      # Notification system (10 files)
│   │   ├── scheduler.ts
│   │   ├── handlers.ts
│   │   └── ...
│   ├── sync/               # Offline sync system (7 files)
│   │   ├── syncQueue.ts
│   │   ├── conflictResolver.ts
│   │   └── ...
│   ├── utils/              # Utility functions (30 files)
│   │   ├── calculations.ts # Workout calculations (volume, 1RM)
│   │   ├── validation.ts   # Form validation
│   │   ├── logger.ts       # Logging utility
│   │   └── ...
│   ├── storage/            # Local storage wrapper
│   ├── services/           # External services (5 files)
│   │   ├── revenuecat.ts   # In-app purchases
│   │   └── ...
│   ├── supabase.ts         # Supabase client configuration
│   └── sentry.ts           # Error tracking configuration
│
├── stores/                 # Zustand state stores
│   ├── authStore.ts        # Authentication state
│   ├── workoutStore.ts     # Active workout state (1200+ lines)
│   ├── exerciseStore.ts    # Exercise library cache
│   ├── settingsStore.ts    # App settings (persistent)
│   ├── notificationStore.ts # Notification state
│   ├── aiStore.ts          # AI usage tracking
│   ├── proStore.ts         # Premium subscription state
│   ├── checkinStore.ts     # Daily check-ins
│   ├── injuryStore.ts      # Injury tracking
│   └── selectors.ts        # Reusable selectors
│
├── hooks/                  # Custom React hooks (22 files)
│   ├── useAuthGuard.ts     # Auth protection
│   ├── useOfflineFirst.ts  # Offline data handling
│   ├── useHealthSync.ts    # Health integration
│   ├── useNotifications.ts # Notification management
│   ├── useProFeature.ts    # Premium feature gating
│   ├── useTheme.ts         # Theme management
│   └── ...
│
├── types/                  # TypeScript type definitions
│   ├── database.ts         # Supabase generated types
│   ├── exercise-measurements.ts
│   ├── notifications.ts
│   └── achievements.ts
│
├── contexts/               # React contexts
│   ├── ThemeContext.tsx    # Theme provider
│   └── PreloadContext.tsx  # Data preloading
│
├── supabase/              # Supabase configuration
│   ├── config.toml        # Local Supabase config
│   ├── functions/         # Edge functions
│   │   ├── ai-complete/   # AI proxy function (OpenAI)
│   │   ├── delete-user/   # User deletion function
│   │   └── exercise-search/ # Exercise search function
│   └── migrations/        # Database migrations (49 files)
│       ├── 20231001000000_initial_schema.sql
│       ├── 20231002000000_add_exercises.sql
│       └── ...
│
├── scripts/               # Development and admin scripts
│   ├── db/               # Database operations (11 files)
│   │   ├── seed-exercises.ts
│   │   ├── audit-schema.ts
│   │   └── ...
│   ├── media/            # Media processing (40 files)
│   │   ├── download-gifs.ts
│   │   ├── upload-to-supabase.ts
│   │   ├── generate-thumbnails.ts
│   │   └── ...
│   ├── analysis/         # Code analysis (9 files)
│   ├── dev/              # Dev utilities (13 files)
│   ├── data/             # Generated data files
│   ├── lib/              # Shared script utilities
│   ├── ENV_SETUP.md      # Environment setup guide
│   ├── env.template      # Environment template for scripts
│   └── README.md         # Scripts documentation
│
├── tests/                 # Test files
│   ├── setup.ts          # Test configuration
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── mocks/            # Test mocks
│
├── exercise-gifs/        # Exercise GIF files (474 files)
├── exercise-thumbnails/  # Thumbnail images (847 files)
├── assets/               # App assets
│   ├── icon.png          # App icon
│   ├── splash-icon.png   # Splash screen
│   ├── adaptive-icon.png # Android adaptive icon
│   └── sounds/           # Sound effects
│
├── app.json              # Expo configuration
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── vitest.config.ts      # Test configuration
├── metro.config.js       # Metro bundler config
├── babel.config.js       # Babel configuration
├── .gitignore            # Git ignore rules
├── env.template          # Environment template
└── README.md             # This file
```

### Data Flow

```
User Action (UI Interaction)
    ↓
Component (React Native)
    ↓
Store (Zustand)
    ↓
API Layer (lib/api/)
    ↓
[Offline Check]
    ↓ (If Online)
Supabase Client
    ↓
PostgreSQL Database
    ↓
Realtime Broadcast
    ↓
Other Devices Updated

    ↓ (If Offline)
Local Storage (AsyncStorage)
    ↓
Sync Queue
    ↓ (When Online)
Background Sync
    ↓
Supabase
```

### State Management Pattern

The app uses Zustand for state management with three types of stores:

1. **Persistent Stores** (saved to device storage):
   - `settingsStore` - User preferences and app settings
   - `authStore` - Authentication state
   - `workoutStore` - Active workout data (cleared on save)

2. **Session Stores** (in-memory only):
   - `exerciseStore` - Exercise library cache
   - `notificationStore` - Notification state
   - `aiStore` - AI usage tracking

3. **Hybrid Stores** (selective persistence):
   - `checkinStore` - Daily check-ins with cache
   - `proStore` - Premium subscription status

### API Layer Design

All Supabase interactions go through typed API functions in `lib/api/`:

```typescript
// Example: lib/api/workouts.ts
export async function saveWorkout(workout: LocalWorkout): Promise<string> {
  const { data, error } = await supabase
    .from('workouts')
    .insert([transformWorkoutForDB(workout)])
    .select('id')
    .single();
  
  if (error) throw error;
  return data.id;
}
```

**Benefits**:
- Type safety with TypeScript
- Centralized error handling
- Easy testing and mocking
- Consistent data transformations
- Single source of truth

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 18.x or higher
- **npm** or **yarn**: Latest version
- **Expo CLI**: `npm install -g expo-cli`
- **iOS Simulator** (Mac only) or **Android Emulator**
- **Supabase Account**: Free tier available at [supabase.com](https://supabase.com)
- **OpenAI API Key**: Optional, for AI chat feature

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/gym-tracker.git
   cd gym-tracker
   cd gym-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the template
   cp env.template .env
   
   # Edit .env and add your keys
   nano .env
   ```
   
   Required variables in `.env`:
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
   
   Optional variables:
   ```bash
   EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn
   EXPO_PUBLIC_EXERCISEDB_API_KEY=your-exercisedb-key
   ```

4. **Set up Supabase**
   
   a. Create a new project at [supabase.com](https://supabase.com)
   
   b. Get your credentials:
   - Go to Project Settings → API
   - Copy **Project URL** → Add to `EXPO_PUBLIC_SUPABASE_URL`
   - Copy **anon public** key → Add to `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   
   c. Run database migrations:
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Link to your project
   supabase link --project-ref your-project-ref
   
   # Run migrations
   supabase db push
   ```

5. **Seed exercise database**
   ```bash
   # First, set up scripts environment
   cd scripts
   cp env.template .env.local
   
   # Edit .env.local and add:
   # EXPO_PUBLIC_SUPABASE_URL=...
   # SUPABASE_SERVICE_ROLE_KEY=... (from Supabase dashboard)
   
   # Go back to root and seed
   cd ..
   npm run db:seed
   ```

6. **Set up Supabase Storage Buckets**
   
   Go to Supabase Dashboard → Storage → Create buckets:
   - `avatars` (public)
   - `progress-photos` (private)
   - `backups` (private)
   - `exercise-media` (public)

7. **Deploy Edge Functions** (optional, for AI features)
   ```bash
   cd supabase/functions
   
   # Deploy AI completion function
   supabase functions deploy ai-complete
   
   # Set secrets
   supabase secrets set OPENAI_API_KEY=your-openai-key
   ```

8. **Upload exercise media** (optional, pre-uploaded GIFs available)
   ```bash
   npm run media:upload
   npm run media:upload-thumbnails
   ```

9. **Start development server**
   ```bash
   npm start
   ```

10. **Run on device/simulator**
    ```bash
    # iOS Simulator (Mac only)
    npm run ios
    
    # Android Emulator
    npm run android
    
    # Web (limited features)
    npm run web
    ```

### Quick Start (Development)

If you just want to get the app running quickly without setting up all services:

```bash
# 1. Install dependencies
npm install

# 2. Set up minimal .env (without AI/Sentry)
cp env.template .env
# Add only Supabase URL and anon key

# 3. Start app
npm start

# 4. Press 'i' for iOS or 'a' for Android
```

**Note**: Without OpenAI API key, AI Coach Chat won't work, but all other features will function normally.

---

## ⚙️ Configuration

### Environment Variables

The app uses three different environment contexts:

#### 1. Client App (`.env`)
Located at: `gym-tracker/.env`

```bash
# Required
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Optional
EXPO_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
EXPO_PUBLIC_EXERCISEDB_API_KEY=your-rapidapi-key
```

#### 2. Scripts (`.env.local`)
Located at: `gym-tracker/scripts/.env.local`

```bash
# Required for admin scripts
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # NEVER expose to client!

# Optional
EXPO_PUBLIC_EXERCISEDB_API_KEY=your-rapidapi-key
```

#### 3. Edge Functions (Supabase Dashboard)
Set in: Supabase Dashboard → Edge Functions → Secrets

```bash
OPENAI_API_KEY=sk-...
RAPID_API_KEY=your-rapidapi-key

# Auto-injected by Supabase:
# SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY
```

**Security Rules**:
- ✅ Use `EXPO_PUBLIC_` prefix for client-exposed variables
- ❌ **NEVER** put service role key in client app's `.env`
- ✅ Keep service role key in scripts/.env.local (gitignored)
- ✅ Check `.gitignore` includes `.env*`

### Supabase Configuration

#### Enable Realtime
1. Go to Database → Replication
2. Enable replication for:
   - `workouts`
   - `templates`
   - `body_weights`
   - `personal_records`

#### Storage Buckets

| Bucket | Access | Purpose |
|--------|--------|---------|
| `avatars` | Public | User profile pictures |
| `progress-photos` | Private | Body progress photos |
| `backups` | Private | Data backups |
| `exercise-media` | Public | Exercise GIFs and thumbnails |

#### Row Level Security (RLS)

All tables have RLS enabled. Key policies:
- Users can only read/write their own data
- Exercise library is readable by all authenticated users
- Admin-only tables require service role key

### AI Configuration

#### Rate Limits

Edit in Supabase SQL Editor (migrations already set up):

```sql
-- Located in can_use_ai() function
v_daily_limit := CASE 
  WHEN v_is_premium THEN 100
  ELSE 10
END;
```

Current limits:
- **Free Tier**: 10 AI chat messages per day
- **Premium Tier**: 100 AI chat messages per day

**Note**: Limits only apply to AI Coach Chat. All other "AI" features (Workout Suggestions, Progressive Overload, Form Tips, Plateau Detection, Recovery Status) are unlimited because they're database/algorithm-based.

#### Models

Current model: `gpt-4o-mini`
- **Cost**: $0.15 per 1M input tokens, $0.60 per 1M output tokens
- **Average cost per message**: ~$0.0003 (0.03 cents)

To change model, edit `supabase/functions/ai-complete/index.ts`:

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini', // Change here
  messages: conversationHistory,
  // ...
});
```

### Notification Configuration

Edit in `app.json`:

```json
{
  "expo": {
    "plugins": [
      ["expo-notifications", {
        "icon": "./assets/notification-icon.png",
        "color": "#3b82f6",
        "sounds": ["./assets/sounds/rest-complete.mp3"]
      }]
    ]
  }
}
```

### Health Integration Setup

#### iOS (Apple Health)
1. Add to `app.json`:
   ```json
   {
     "ios": {
       "infoPlist": {
         "NSHealthShareUsageDescription": "We read your heart rate and steps...",
         "NSHealthUpdateUsageDescription": "We save your workouts and weight..."
       },
       "entitlements": {
         "com.apple.developer.healthkit": true
       }
     }
   }
   ```

2. Enable HealthKit capability in Apple Developer Console

#### Android (Health Connect)
1. Add to `app.json`:
   ```json
   {
     "android": {
       "permissions": [
         "android.permission.health.READ_HEART_RATE",
         "android.permission.health.READ_STEPS",
         "android.permission.health.WRITE_EXERCISE"
       ]
     }
   }
   ```

2. Install Health Connect app on Android device/emulator

---

## 💾 Database Schema

### Core Tables

#### `profiles`
User profile and settings
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  weight_unit TEXT DEFAULT 'lbs',
  measurement_unit TEXT DEFAULT 'inches',
  fitness_goals TEXT[],
  experience_level TEXT,
  available_equipment TEXT[],
  injury_restrictions TEXT[],
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_workouts INTEGER DEFAULT 0,
  total_volume NUMERIC DEFAULT 0,
  -- 30+ settings columns (rest_timer_default, auto_start_timer, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `exercises`
Exercise library (423 exercises)
```sql
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  equipment TEXT,
  primary_muscles TEXT[],
  secondary_muscles TEXT[],
  gif_url TEXT,
  thumbnail_url TEXT,
  instructions TEXT,
  tips TEXT[],
  measurement_type TEXT DEFAULT 'weight_reps',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `workouts`
Completed workouts
```sql
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  notes TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER,
  total_volume NUMERIC,
  exercises JSONB NOT NULL, -- nested exercise/set data
  health_synced BOOLEAN DEFAULT false,
  health_synced_at TIMESTAMPTZ,
  heart_rate_avg INTEGER,
  heart_rate_max INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `templates`
Workout templates
```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  exercises JSONB NOT NULL,
  folder_id UUID,
  is_default BOOLEAN DEFAULT false,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `personal_records`
PR tracking
```sql
CREATE TABLE personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  exercise_id UUID REFERENCES exercises(id),
  pr_type TEXT NOT NULL, -- 'weight', 'reps', 'volume'
  weight NUMERIC,
  reps INTEGER,
  volume NUMERIC,
  weight_unit TEXT,
  achieved_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `body_weights`
Weight history
```sql
CREATE TABLE body_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  weight NUMERIC NOT NULL,
  unit TEXT DEFAULT 'lbs',
  measured_at TIMESTAMPTZ NOT NULL,
  health_synced BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `body_measurements`
Body measurements
```sql
CREATE TABLE body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  chest NUMERIC,
  waist NUMERIC,
  hips NUMERIC,
  bicep_left NUMERIC,
  bicep_right NUMERIC,
  thigh_left NUMERIC,
  thigh_right NUMERIC,
  calf_left NUMERIC,
  calf_right NUMERIC,
  shoulders NUMERIC,
  neck NUMERIC,
  body_fat_percentage NUMERIC,
  unit TEXT DEFAULT 'inches',
  measured_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `progress_photos`
Progress photos
```sql
CREATE TABLE progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  photo_url TEXT NOT NULL,
  photo_type TEXT, -- 'front', 'side', 'back'
  taken_at TIMESTAMPTZ NOT NULL,
  weight NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `ai_usage`
AI request tracking
```sql
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  request_type TEXT NOT NULL, -- 'chat' (only real AI feature)
  tokens_used INTEGER,
  cost_cents NUMERIC,
  model TEXT,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `ai_feedback`
AI response ratings
```sql
CREATE TABLE ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  ai_usage_id UUID REFERENCES ai_usage(id),
  feature TEXT NOT NULL,
  rating TEXT NOT NULL, -- 'thumbs_up', 'thumbs_down'
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `coach_messages`
AI coach chat history
```sql
CREATE TABLE coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  role TEXT NOT NULL, -- 'user', 'assistant'
  content TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `daily_checkins`
Daily mood/energy tracking
```sql
CREATE TABLE daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  checkin_date DATE NOT NULL,
  mood INTEGER CHECK (mood >= 1 AND mood <= 5),
  energy INTEGER CHECK (energy >= 1 AND energy <= 5),
  soreness TEXT[], -- muscle groups
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, checkin_date)
);
```

#### `user_injuries`
Injury tracking
```sql
CREATE TABLE user_injuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  body_part TEXT NOT NULL,
  description TEXT,
  severity TEXT, -- 'minor', 'moderate', 'severe'
  occurred_at TIMESTAMPTZ NOT NULL,
  recovered_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `notifications`
Notification history
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `user_devices`
Multi-device tracking
```sql
CREATE TABLE user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  device_name TEXT,
  device_type TEXT,
  push_token TEXT,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `custom_exercises`
User-created exercises
```sql
CREATE TABLE custom_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  category TEXT,
  equipment TEXT,
  measurement_type TEXT DEFAULT 'weight_reps',
  notes TEXT,
  is_public BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'private', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Database Functions

#### `can_use_ai(user_id UUID)`
Returns AI rate limit status
```sql
RETURNS TABLE (
  allowed BOOLEAN,
  used INTEGER,
  limit INTEGER,
  remaining INTEGER,
  tier TEXT,
  is_premium BOOLEAN
)
```

#### `log_ai_usage(...)`
Logs AI request with usage tracking

#### `get_ai_usage_stats(user_id UUID)`
Returns usage statistics (today, month, all-time)

#### `detect_personal_record(...)`
Checks if a set is a new PR

#### `calculate_workout_volume(workout_id UUID)`
Calculates total volume for workout

### Database Indexes

Key indexes for performance:
```sql
-- Workouts by user and date
CREATE INDEX idx_workouts_user_date ON workouts(user_id, completed_at DESC);

-- PRs by user and exercise
CREATE INDEX idx_prs_user_exercise ON personal_records(user_id, exercise_id, achieved_at DESC);

-- Exercises by category and active status
CREATE INDEX idx_exercises_category_active ON exercises(category, is_active);

-- AI usage by user and date
CREATE INDEX idx_ai_usage_user_date ON ai_usage(user_id, created_at DESC);
```

---

## 🛠 Development

### Development Server

```bash
# Start Expo dev server
npm start

# Start with cache clear
npm start -- --clear

# Start on specific platform
npm run ios
npm run android
npm run web
```

### Project Scripts

```bash
# Development
npm start              # Start Expo dev server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run web            # Run on web

# Database
npm run db:seed        # Seed exercise database
npm run db:audit       # Audit database schema
npm run db:check       # Check database connectivity

# Media
npm run media:download # Download exercise GIFs
npm run media:upload   # Upload to Supabase
npm run media:verify   # Verify all media

# Testing
npm test               # Run tests in watch mode
npm run test:run       # Run tests once
npm run test:coverage  # Run with coverage

# Analysis
npm run analyze:logs   # Find console.log statements
npm run analyze:exercises # Analyze exercise data
```

### Code Style

The project uses TypeScript with strict mode enabled:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "useUnknownInCatchVariables": true
  }
}
```

**Conventions**:
- Use functional components with hooks
- Use TypeScript for all files (`.ts`, `.tsx`)
- Use arrow functions for components
- Use `const` for all variables unless reassignment needed
- Use template literals for strings with variables
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Avoid `any` type - use `unknown` or proper types

### Error Handling

All errors are caught and reported to Sentry (if configured):

```typescript
import { captureException } from '@/lib/sentry';

try {
  await riskyOperation();
} catch (error) {
  captureException(error, { context: 'additional info' });
  // Handle error gracefully
}
```

### Logging

Use the centralized logger:

```typescript
import { logger } from '@/lib/utils/logger';

logger.info('User logged in', { userId });
logger.warn('API rate limit approaching');
logger.error('Failed to save workout', error);
```

**Note**: Console logs should be removed before production. Run:
```bash
npm run analyze:logs
```

### State Management Guidelines

**When to use Zustand stores**:
- Global state needed across multiple screens
- State that needs persistence
- Complex state updates

**When to use React state**:
- Component-local state
- Temporary UI state
- Form inputs

**When to use React Query**:
- Server state (data from Supabase)
- Data that needs caching
- Data with automatic refetching

### Performance Optimization

**Image Loading**:
- Use `expo-image` for all images (auto-caching)
- Use thumbnails for lists, full images for detail views
- Preload critical images on home screen

**List Rendering**:
- Use `FlashList` for all long lists (faster than FlatList)
- Use `keyExtractor` and `getItemType` for optimal performance
- Implement `estimatedItemSize` for consistent scrolling

**Heavy Computations**:
- Move to Web Workers (if needed)
- Use `useMemo` and `useCallback` for expensive calculations
- Debounce search inputs

---

## 🧪 Testing

### Test Setup

Tests use Vitest with React Native Testing Library:

```bash
# Run tests
npm test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui
```

### Test Structure

```
tests/
├── setup.ts              # Test configuration
├── unit/                 # Unit tests
│   ├── calculations.test.ts
│   └── validation.test.ts
├── integration/          # Integration tests
│   └── workout-flow.test.ts
└── mocks/                # Test mocks
    └── supabase.ts
```

### Writing Tests

**Unit Test Example**:
```typescript
import { describe, it, expect } from 'vitest';
import { calculateOneRepMax } from '@/lib/utils/calculations';

describe('calculateOneRepMax', () => {
  it('should calculate 1RM correctly', () => {
    const result = calculateOneRepMax(100, 10);
    expect(result).toBe(133);
  });
});
```

**Component Test Example**:
```typescript
import { render, screen } from '@testing-library/react-native';
import { ExerciseCard } from '@/components/workout/ExerciseCard';

describe('ExerciseCard', () => {
  it('should render exercise name', () => {
    render(<ExerciseCard exercise={mockExercise} />);
    expect(screen.getByText('Bench Press')).toBeTruthy();
  });
});
```

### Test Coverage

Coverage thresholds are enforced for critical files:
- `lib/utils/calculations.ts`: 90%
- `lib/sync/**/*.ts`: 80%
- `stores/workoutStore.ts`: 70%

**View coverage report**:
```bash
npm run test:coverage
# Open coverage/index.html in browser
```

---

## 🚀 Deployment

### Building for Production

#### iOS (App Store)

1. **Configure app.json**:
   ```json
   {
     "expo": {
       "ios": {
         "bundleIdentifier": "com.yourcompany.gymtracker",
         "buildNumber": "1"
       }
     }
   }
   ```

2. **Build with EAS**:
   ```bash
   # Install EAS CLI
   npm install -g eas-cli
   
   # Configure EAS
   eas build:configure
   
   # Build for iOS
   eas build --platform ios
   
   # Submit to App Store
   eas submit --platform ios
   ```

#### Android (Google Play)

1. **Configure app.json**:
   ```json
   {
     "expo": {
       "android": {
         "package": "com.yourcompany.gymtracker",
         "versionCode": 1
       }
     }
   }
   ```

2. **Build with EAS**:
   ```bash
   # Build for Android
   eas build --platform android
   
   # Submit to Google Play
   eas submit --platform android
   ```

### Environment Variables in Production

**Never commit real credentials!**

Use EAS Secrets for production:
```bash
eas secret:create --scope project --name SUPABASE_URL --value your-url
eas secret:create --scope project --name SUPABASE_ANON_KEY --value your-key
eas secret:create --scope project --name SENTRY_DSN --value your-dsn
```

### Pre-deployment Checklist

- [ ] All tests passing (`npm run test:run`)
- [ ] No console.logs (`npm run analyze:logs`)
- [ ] Environment variables configured in EAS
- [ ] Sentry DSN configured for error tracking
- [ ] App icon and splash screen finalized
- [ ] Privacy policy and terms of service URLs updated
- [ ] In-app purchase products configured in RevenueCat
- [ ] Database migrations applied to production
- [ ] Edge functions deployed
- [ ] Storage buckets created and configured
- [ ] Version number incremented in app.json

### Continuous Deployment

Set up GitHub Actions for automated builds:

```yaml
# .github/workflows/build.yml
name: Build and Deploy
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
      - run: eas build --platform all --non-interactive
```

---

## 📜 Scripts

The `scripts/` directory contains utility scripts for database management, media processing, and development tasks. See [scripts/README.md](scripts/README.md) for detailed documentation.

### Quick Reference

```bash
# Database
npm run db:seed              # Seed exercises
npm run db:audit             # Audit schema
npm run db:check             # Check connectivity

# Media
npm run media:download       # Download GIFs
npm run media:upload         # Upload to Supabase
npm run media:verify         # Verify all media
npm run media:thumbnails     # Generate thumbnails

# Analysis
npm run analyze:logs         # Find console.logs
npm run analyze:exercises    # Analyze exercise data
npm run analyze:inactive     # Find inactive exercises

# Development
npm run dev:test-api         # Test ExerciseDB API
npm run dev:verify-library   # Verify exercise library
```

---

## 🤖 AI System

### Architecture Overview

The app features a hybrid AI system with one true AI feature (Coach Chat) and multiple intelligent rule-based features:

```
┌─────────────────────────────────────────────────┐
│  ONLY AI Feature: Coach Chat                     │
│  Mobile App → AI Service → Edge Function → OpenAI│
│                    ↓                              │
│              Rate Limiting                        │
│                    ↓                              │
│              Usage Tracking                       │
│                    ↓                              │
│              Cost Protection                      │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│  All Other "AI" Features (Database/Calculations) │
│  - Workout Suggestions: Database queries         │
│  - Progressive Overload: Math calculations       │
│  - Form Tips: Database lookups                   │
│  - Plateau Detection: Statistical analysis       │
│  - Recovery Status: Timestamp calculations       │
└─────────────────────────────────────────────────┘
```

### Feature Breakdown

| Feature | Type | API Calls | Cost | Implementation |
|---------|------|-----------|------|----------------|
| **AI Coach Chat** | 🤖 Real AI | ✅ YES | ~$0.0003/msg | OpenAI GPT-4o-mini |
| **Workout Suggestions** | 📊 Database | ❌ NO | Free | SQL queries + time logic |
| **Progressive Overload** | 🧮 Math | ❌ NO | Free | Historical data analysis |
| **Form Tips** | 📚 Database | ❌ NO | Free | Pre-written content |
| **Plateau Detection** | 📈 Algorithm | ❌ NO | Free | Statistical analysis |
| **Recovery Status** | ⏱️ Time calc | ❌ NO | Free | Time-based calculations |

### Rate Limiting

**Free Tier**: 10 AI chat messages per day
**Premium Tier**: 100 AI chat messages per day

**Implementation**: Rate limits are enforced at the database level using the `can_use_ai()` function with 30-second cache.

**Important**: Limits only apply to AI Coach Chat. All other features are unlimited (they're free).

### Usage Tracking

Every AI chat message is logged in the `ai_usage` table:
- User ID
- Request type (always "chat")
- Tokens used
- Cost in cents
- Model (gpt-4o-mini)
- Timestamp

View analytics:
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as requests,
  SUM(tokens_used) as total_tokens,
  SUM(cost_cents) as total_cost_cents
FROM ai_usage
WHERE user_id = 'xxx'
GROUP BY DATE(created_at);
```

### Cost Analysis

**Average Costs**:
- Free user: ~$0.05-0.06/month (~5-7 chat messages)
- Premium user: ~$0.40-1.00/month (~20-40 chat messages)

**Profit Margins**:
- Free tier: Sustainable at 100:1 ratio
- Premium tier: 80-85% profit margin at $9.99/month

### Adding New AI Features

To add a new AI feature that actually uses OpenAI:

1. Create Edge Function:
   ```bash
   supabase functions new your-feature
   ```

2. Implement in `supabase/functions/your-feature/index.ts`:
   ```typescript
   import { OpenAI } from 'openai';
   
   const openai = new OpenAI({
     apiKey: Deno.env.get('OPENAI_API_KEY'),
   });
   
   // Rate limit check
   const canUse = await checkRateLimit(userId);
   if (!canUse.allowed) {
     return new Response('Rate limit exceeded', { status: 429 });
   }
   
   // Call OpenAI
   const completion = await openai.chat.completions.create({
     model: 'gpt-4o-mini',
     messages: [...],
   });
   
   // Log usage
   await logAIUsage(userId, 'your-feature', tokens, cost);
   ```

3. Deploy:
   ```bash
   supabase functions deploy your-feature
   ```

---

## 🌐 Offline-First Architecture

### Overview

The app is designed to work perfectly without internet connection, with intelligent syncing when connectivity is restored.

### Offline Capabilities

**Fully Functional Offline**:
- ✅ Log workouts
- ✅ View workout history
- ✅ Create/edit templates
- ✅ Track body weight and measurements
- ✅ View exercise library (cached)
- ✅ Access all settings
- ✅ View charts and analytics

**Requires Internet**:
- ❌ AI Coach Chat
- ❌ Initial exercise library download
- ❌ Progress photo uploads
- ❌ Account changes

### Sync Strategy

1. **Local-First**: All changes are saved to device storage first (instant)
2. **Sync Queue**: Operations are queued for background sync
3. **Automatic Retry**: Failed syncs retry with exponential backoff
4. **Conflict Resolution**: Last-write-wins with intelligent merging
5. **Realtime Updates**: Other devices updated via WebSocket when online

### Implementation

**Offline Data Storage**:
```typescript
// lib/storage/index.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  set: async (key: string, value: any) => {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  get: async (key: string) => {
    const item = await AsyncStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  },
};
```

**Sync Queue**:
```typescript
// lib/sync/syncQueue.ts
export class SyncQueue {
  async addToQueue(operation: SyncOperation) {
    // Add to queue
    await storage.set(`sync_${operation.id}`, operation);
    
    // Try to sync immediately if online
    if (await isOnline()) {
      await this.processQueue();
    }
  }
  
  async processQueue() {
    const operations = await this.getQueuedOperations();
    
    for (const op of operations) {
      try {
        await this.execute(op);
        await this.removeFromQueue(op.id);
      } catch (error) {
        await this.incrementRetryCount(op.id);
      }
    }
  }
}
```

**Conflict Resolution**:
```typescript
// lib/sync/conflictResolver.ts
export function resolveConflict(local: any, remote: any) {
  // Last-write-wins by default
  if (local.updated_at > remote.updated_at) {
    return local;
  }
  
  // For workouts, keep both if timestamps are close
  if (Math.abs(local.updated_at - remote.updated_at) < 60000) {
    return [local, remote]; // Keep both
  }
  
  return remote;
}
```

### Network Detection

```typescript
// hooks/useNetworkStatus.ts
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
    
    return unsubscribe;
  }, []);
  
  return isOnline;
}
```

---

## 🏥 Health Integrations

### Apple Health (iOS)

**Setup**: Permissions requested automatically on first use

**Features**:
- ✅ Bidirectional weight sync
- ✅ Workout export (type, duration, calories, heart rate)
- ✅ Heart rate monitoring during workouts
- ✅ Body measurements sync
- ✅ Steps import
- ✅ Sleep data import

**Implementation**:
```typescript
// lib/health/appleHealth.ts
import AppleHealthKit from 'react-native-health';

export async function syncWorkoutToHealth(workout: Workout) {
  const options = {
    type: 'Workout',
    startDate: workout.started_at,
    endDate: workout.completed_at,
    energyBurned: workout.calories,
    metadata: {
      HKWorkoutActivityType: 'TraditionalStrengthTraining',
    },
  };
  
  await AppleHealthKit.saveWorkout(options);
}
```

### Health Connect (Android)

**Setup**: Requires Health Connect app installed

**Features**:
- ✅ Weight sync (bidirectional)
- ✅ Exercise session export
- ✅ Heart rate monitoring
- ✅ Steps tracking
- ✅ Sleep data import

**Implementation**:
```typescript
// lib/health/healthConnect.ts
import { HealthConnect } from 'react-native-health-connect';

export async function syncWorkoutToHealthConnect(workout: Workout) {
  await HealthConnect.insertRecords([{
    recordType: 'ExerciseSession',
    startTime: workout.started_at,
    endTime: workout.completed_at,
    exerciseType: HealthConnect.ExerciseType.STRENGTH_TRAINING,
    title: workout.name,
  }]);
}
```

### Configuration

Enable/disable health sync in app settings:
- Settings → Health → Enable Health Sync
- Auto-sync on workout completion
- Manual sync trigger available

---

## 💰 Monetization

### Pricing Model

**Free Tier** (Always Free):
- ✅ Unlimited workout logging
- ✅ Complete exercise library
- ✅ All progress tracking and charts
- ✅ Body tracking and progress photos
- ✅ Template management
- ✅ Offline support
- ✅ Health sync
- ✅ PR tracking
- ✅ **UNLIMITED**: Workout Suggestions, Progressive Overload, Form Tips, Plateau Detection, Recovery Status
- ❌ Limited: AI Coach Chat (10 messages/day)

**Premium Tier** ($9.99/month or $79.99/year):
- ✅ Everything in Free
- ✅ Unlimited AI Coach Chat (100 messages/day)
- ✅ Priority support
- ✅ Early access to features
- ✅ Export all data (CSV, JSON)
- ✅ Cloud backup storage (10 GB)

### Revenue Model

**Target**: $50K MRR at 5,000 paying users

**Actual Costs per User**:
- Premium user: ~$0.40-1.00/month (AI costs) + ~$1/month (infrastructure) = $1.40-2.00/month
- Free user: ~$0.05-0.06/month (AI) + ~$0.10/month (infrastructure) = $0.15-0.16/month

**Profit Margins**:
- Premium: 80-85% ($8-8.50 profit per $9.99 subscription)
- Can sustain 100+ free users per paying user

### In-App Purchases Setup

**Using RevenueCat**:

1. Configure products in RevenueCat dashboard:
   - `premium_monthly` - $9.99/month
   - `premium_yearly` - $79.99/year

2. Set up in App Store Connect / Google Play Console

3. Implementation:
   ```typescript
   // lib/services/revenuecat.ts
   import Purchases from 'react-native-purchases';
   
   export async function purchasePremium() {
     const { customerInfo } = await Purchases.purchasePackage(monthlyPackage);
     return customerInfo.entitlements.active['premium'];
   }
   ```

### Alternative Revenue Streams

1. **Coaching Marketplace**: 20% commission on trainer bookings
2. **Premium Templates**: $2.99 per professional program
3. **Equipment Affiliate**: Amazon Associates links
4. **B2B Licensing**: $199/month for gyms/trainers

---

## 🗺 Roadmap

### Version 1.1 (Current - Production Ready) ✅
- Complete workout tracking
- Exercise library with media
- AI coaching system
- Offline sync
- Health integrations
- Notification system
- Body tracking

### Version 1.2 (Next 2-3 Months)
- [ ] Social features (follow friends, share workouts)
- [ ] Workout challenges and leaderboards
- [ ] Exercise form video tutorials (user-generated)
- [ ] Meal planning integration
- [ ] Integration with Fitbit, Garmin, Whoop
- [ ] Workout program marketplace

### Version 2.0 (Q3 2026)
- [ ] Real-time co-training (workout with friends)
- [ ] Personal trainer marketplace
- [ ] Video form analysis using AI
- [ ] Voice-controlled logging
- [ ] Apple Watch standalone app
- [ ] Web dashboard for coaches

### Version 2.5 (Q4 2026)
- [ ] Program builder (8-12 week programs)
- [ ] Periodization planning
- [ ] Injury rehabilitation programs
- [ ] Smart gym equipment integration
- [ ] AR form feedback

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Write/update tests
5. Run tests: `npm test`
6. Commit: `git commit -m "feat: add amazing feature"`
7. Push: `git push origin feature/your-feature`
8. Create a Pull Request

### Commit Convention

Use conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Code style (formatting)
- `refactor:` - Code refactoring
- `test:` - Tests
- `chore:` - Maintenance

### Code Review Process

1. All PRs require 1 approval
2. All tests must pass
3. No console.logs allowed
4. TypeScript strict mode enforced

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Exercise data from ExerciseDB API
- Exercise GIFs from various fitness resources
- Icons from Lucide Icons
- Powered by Supabase, Expo, and OpenAI

---

## 📧 Contact & Support

- **Email**: support@gym-tracker-app.com
- **Website**: https://gym-tracker-app.com
- **Discord**: [Join our community](https://discord.gg/gymtracker)
- **GitHub Issues**: [Report bugs](https://github.com/yourusername/gym-tracker/issues)

---

## 📱 App Store Information

### Screenshots Needed
1. Active workout screen (exercise cards, rest timer)
2. Home screen (suggestions, streak, stats)
3. Exercise library (search, filters, GIFs)
4. Progress charts (weight progression, volume)
5. PR celebration (confetti, trophy)
6. Body tracking (weight chart, measurements)
7. AI coach chat interface
8. Template library

### Keywords
gym, workout, fitness, weightlifting, bodybuilding, exercise, tracker, log, AI coach, personal trainer, progress, muscle, strength, training, progressive overload

---

**Built with ❤️ for the fitness community**

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Platform**: iOS, Android  
**Framework**: React Native (Expo)  
**Backend**: Supabase (PostgreSQL)  
**AI**: OpenAI GPT-4o-mini
