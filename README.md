# 💪 Gym Tracker - Workout Tracking App

> A comprehensive mobile workout tracking application with AI coaching (chat only), database-driven features, and advanced progress analytics.

![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-blue)
![React Native](https://img.shields.io/badge/React%20Native-0.81-green)
![Expo](https://img.shields.io/badge/Expo-SDK%2054-purple)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## ⚠️ **IMPORTANT: README ACCURACY DISCLAIMER**

This README has been updated with **brutal honesty** about the current state of features. Many features have infrastructure code but are not yet fully integrated or production-ready.

### 📊 **Feature Status Legend:**
- ✅ **Fully Implemented & Working** - Feature is complete and actively used
- ⚠️ **Partially Implemented** - Code exists but not fully integrated or has limitations
- 🚧 **In Development** - Infrastructure exists but not production-ready
- ❌ **Not Implemented** - Planned but not yet built
- 💀 **Dead Code** - Exists in codebase but never integrated

### 🔍 **Known Misinformation Corrections:**

1. **Exercise Count (423)**: ⚠️ UNVERIFIED - Number appears in comments but not confirmed against actual database
2. **"Production Ready"**: ❌ MISLEADING - More accurately "Development Complete" - missing EAS config, RevenueCat incomplete
3. **Offline-First Architecture**: 🚧 INFRASTRUCTURE EXISTS - Full sync queue & conflict resolution code exists but NOT actively used in app
4. **Apple Health Integration (iOS)**: ❌ NOT IMPLEMENTED - All functions are stubs returning false (Coming Soon message shown)
5. **Health Connect (Android)**: ⚠️ PARTIALLY IMPLEMENTED - Code exists, settings UI works, but automatic sync integration unclear
6. **"Post-Workout Analysis"**: 💀 NEVER EXISTED - No component found, incorrect to say it was "removed"
7. **EAS Build Instructions**: ⚠️ EXAMPLE ONLY - No `eas.json` configuration exists in project
8. **RevenueCat**: ⚠️ PARTIALLY CONFIGURED - Package installed, code exists, but missing API key in env template
9. **"Social Features"**: ⚠️ BASIC ONLY - Workout sharing is just export/share sheet, not a social network

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
- [Offline Architecture Status](#-offline-architecture-status)
- [Health Integrations Status](#-health-integrations-status)
- [Monetization](#-monetization)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**Gym Tracker** is a mobile workout tracking application designed to help fitness enthusiasts log workouts, track progress, and achieve their fitness goals. Built with React Native and Expo, it features a hybrid AI system where only the Coach Chat uses real AI (OpenAI GPT-4o-mini), while other "AI" features are efficient database queries and algorithms.

### What Makes This App Different?

- **~400+ Exercise Library**: Large exercise database with animated GIFs and muscle targeting (exact count unverified)
- **Hybrid AI System**: Only Coach Chat uses OpenAI API; other features are database/algorithm-based (zero API costs)
- **Smart Workout Suggestions**: Database-driven workout planning based on recovery and history
- **Progress Tracking**: Complete PR tracking, volume analytics, and strength progression
- **Body Tracking**: Weight, measurements, and progress photos
- **Template System**: Create and manage workout templates
- **Real-time Features**: PR celebrations, rest timers, achievement system

### Current Development Status

**✅ Production-Track Features:**
- Core workout tracking and logging
- Exercise library with media
- AI Coach Chat (real OpenAI integration)
- Progress analytics and charts
- Body tracking (weight, measurements, photos)
- Template management
- Achievement and notification systems
- Settings and customization

**🚧 Infrastructure Built But Not Integrated:**
- Offline-first sync system (code exists, not actively used)
- Conflict resolution (implemented but workouts save directly to cloud)
- Multi-device sync queue (ready but not integrated)

**❌ Planned But Not Implemented:**
- Apple Health integration (iOS - stub only)
- Full Health Connect automation (Android - partial)
- Social features beyond basic export
- Meal planning
- Advanced analytics

### Target Audience

- **Gym Enthusiasts**: Lifters who want detailed tracking and progressive overload
- **Beginners**: Users new to fitness who need guidance and workout suggestions
- **Athletes**: Competitive individuals tracking personal records
- **Coaches**: Professionals using templates for clients

---

## ✨ Key Features

### 🏋️ Core Workout Features (✅ Fully Working)

#### **Workout Logging**
- ✅ Quick workout creation from templates or scratch
- ✅ Live workout tracking with exercise cards
- ✅ One-tap set completion with instant feedback
- ✅ Support for 4 set types: Normal, Warmup, Dropset, Failure
- ✅ RPE (Rate of Perceived Exertion) tracking
- ✅ Real-time PR (Personal Record) detection
- ✅ Exercise notes and observations
- ✅ Workout duration and volume tracking

#### **Rest Timer (✅ Fully Working)**
- ✅ Configurable rest periods per exercise
- ✅ Auto-start after set completion (optional)
- ✅ Visual countdown with progress bar
- ✅ +30 second quick extend button
- ✅ Skip rest timer option
- ✅ Background countdown continues
- ✅ Push notifications when rest complete
- ✅ Sound and vibration alerts (customizable)
- ✅ 10-second warning haptic feedback

#### **Exercise Execution**
- ✅ Previous workout reference (shows last weight/reps)
- ✅ Auto-fill from last session (optional)
- ✅ Flexible measurement support:
  - Weight & Reps (traditional)
  - Duration (for planks, holds)
  - Distance (for cardio)
  - Assisted weight (for machines)
- ✅ Reorder exercises via drag-and-drop
- ✅ Replace exercises mid-workout
- ✅ Delete exercises from active workout
- ✅ PR celebration animations and confetti
- ⚠️ Heart rate monitoring during workout (infrastructure exists, integration unclear)

### 📚 Exercise Library (⚠️ Mostly Working)

#### **Database Statistics**
- **Total Exercises**: ~400+ active exercises (exact count unverified - "423" appears in comments)
- **Categories**: 10 muscle groups
- **Equipment Types**: 17 different equipment categories
- **Media Assets**: ~474 GIFs + ~847 thumbnails (directory counts, not verified against storage)

#### **Exercise Categories**

| Category | Examples |
|----------|----------|
| **Back** | Pull-ups, Rows, Lat Pulldowns, Deadlifts |
| **Chest** | Bench Press, Flyes, Push-ups, Dips |
| **Upper Legs** | Squats, Lunges, Leg Press, Romanian Deadlifts |
| **Shoulders** | Overhead Press, Lateral Raises, Face Pulls |
| **Upper Arms** | Bicep Curls, Tricep Extensions, Dips |
| **Lower Legs** | Calf Raises (seated, standing, donkey) |
| **Waist/Core** | Crunches, Planks, Russian Twists, Leg Raises |
| **Cardio** | Treadmill, Rowing, Bike, Jump Rope |
| **Full Body** | Burpees, Kettlebell Swings, Thrusters |
| **Lower Arms** | Wrist Curls, Forearm Exercises |

#### **Exercise Features (✅ Working)**
- ✅ Animated GIFs for visual demonstration
- ✅ Thumbnail previews for fast loading
- ✅ Muscle targeting (primary and secondary muscles)
- ✅ Equipment filtering
- ✅ Fast fuzzy search using Fuse.js
- ✅ Favorites system
- ✅ Custom exercise creation
- ✅ Exercise history tracking
- ✅ PR tracking per exercise

### 📈 Progress Tracking (✅ Fully Working)

#### **Personal Records (PRs)**
- ✅ **Max Weight PR**: Heaviest weight lifted for any rep count
- ✅ **Max Reps PR**: Most reps performed at a specific weight
- ✅ **Max Volume PR**: Highest total weight × reps in a single set
- ✅ Real-time detection during workout
- ✅ PR celebration with animations and confetti
- ✅ Trophy icons and badges
- ✅ Sound effects and haptic feedback
- ✅ PR history timeline

#### **Analytics & Statistics (✅ Working)**
- ✅ Total workouts completed
- ✅ Current and longest streaks
- ✅ Total volume lifted (all-time)
- ✅ Average workout duration
- ✅ Workouts per week/month
- ✅ Volume tracking (daily, weekly, monthly)
- ✅ Strength progression charts
- ✅ One-rep max (1RM) estimates
- ✅ Muscle group distribution
- ✅ Exercise frequency tracking

### 📷 Body Tracking (✅ Fully Working)

#### **Weight Logging**
- ✅ Quick weight entry from home screen
- ✅ Weight history timeline
- ✅ Weight chart with trend line
- ✅ Daily/weekly/monthly views
- ✅ Goal weight setting
- ✅ Weight gain/loss calculations
- ⚠️ Sync with Apple Health/Health Connect (see Health Integration section)

#### **Body Measurements**
- ✅ Comprehensive measurements (chest, waist, hips, etc.)
- ✅ Biceps, forearms, thighs, calves (left/right)
- ✅ Body fat percentage
- ✅ Measurement history with charts
- ✅ Progress tracking

#### **Progress Photos**
- ✅ Front, side, back pose presets
- ✅ Photo gallery with date stamps
- ✅ Before/after comparison slider
- ✅ Grid view of photo timeline
- ✅ Fullscreen photo viewer
- ✅ Photo metadata (date, weight, measurements)
- ✅ Private and secure storage

### 🤖 AI Coaching System (✅ Hybrid - 1 Real AI + 5 Database Features)

The app features a hybrid coaching system with **one true AI feature** (Coach Chat powered by OpenAI GPT-4o-mini) and multiple intelligent rule-based features with enterprise-grade rate limiting and cost protection.

#### **AI Features Breakdown**

1. **AI Coach Chat** 🤖 *(REAL AI - OpenAI GPT-4o-mini)* - ✅ **FULLY WORKING**
   - Interactive chat interface for fitness questions
   - Personalized responses based on your workout history
   - Can suggest complete workouts with "Start This Workout" button
   - Rate limited (10 free/day, 100 premium/day)
   - Cost: ~$0.0003 per message
   - **Status**: Production-ready, actively used

2. **Workout Suggestions** 📊 *(Database-driven)* - ✅ **FULLY WORKING**
   - Recovery-based workout recommendations
   - Muscle group analysis from workout history
   - Personalized exercise selection from your history
   - Zero API costs (pure database queries)
   - **Status**: Active on Workout tab

3. **Progressive Overload Recommendations** 🧮 *(Rule-based algorithm)* - ✅ **FULLY WORKING**
   - Intelligent weight and rep recommendations
   - Based on last 30 days of performance
   - Smart weight increments (2.5-10 lbs based on current weight)
   - Fatigue-adjusted for later sets
   - Zero API costs (pure calculations)
   - **Status**: Shows during active workout

4. **Form Tips** 📚 *(Database-driven)* - ✅ **FULLY WORKING**
   - Pre-written form cues for exercises
   - Breathing techniques and safety tips
   - Common mistakes to avoid
   - Zero API costs (database lookups)
   - **Status**: Available during workout (lightbulb icon)

5. **Plateau Detection** 📈 *(Rule-based algorithm)* - ✅ **FULLY WORKING**
   - Monitors progress across all exercises
   - Alerts when stagnation detected (4+ sessions)
   - Provides actionable recommendations
   - Zero API costs (pure algorithmic detection)
   - **Status**: Shows on home screen

6. **Recovery Status** ⏱️ *(Time-based calculations)* - ✅ **FULLY WORKING**
   - Estimates muscle group recovery
   - Based on training frequency and volume
   - Standard recovery windows (48-72 hours)
   - Suggests optimal workout focus
   - Zero API costs (time calculations)
   - **Status**: Active on home screen

**Cost Efficiency**: Only 1 out of 6 "AI" features actually uses OpenAI API. The rest are sophisticated database queries and algorithms that work completely offline and incur zero costs.

### 📋 Templates & Planning (✅ Fully Working)

#### **Workout Templates**
- ✅ Create custom workout templates
- ✅ Pre-built templates for common splits
- ✅ Template folders/organization
- ✅ Duplicate and edit templates
- ✅ Start workout from template (one-tap)
- ✅ Template preview before starting
- ✅ Recently used templates

#### **Default Templates**
- Push Day (Chest, Shoulders, Triceps)
- Pull Day (Back, Biceps)
- Leg Day (Quads, Hamstrings, Glutes, Calves)
- Upper Body
- Lower Body
- Full Body
- Arm Day

### 🔔 Notifications (✅ Fully Working)

#### **Notification Types**
1. ✅ **Rest Timer**: Alerts when rest period completes
2. ✅ **Workout Reminders**: Scheduled reminders for specific days/times
3. ✅ **PR Celebrations**: Instant notification when PR achieved
4. ✅ **Achievement Notifications**: Streak milestones, workout counts, volume milestones
5. ✅ **Engagement Notifications**: Inactivity reminders, streak risk alerts, weekly summaries

#### **Notification Settings**
- ✅ Master enable/disable toggle
- ✅ Per-type controls
- ✅ Sound and vibration settings
- ✅ Quiet hours configuration
- ✅ Custom reminder scheduling

### ⚙️ Settings & Customization (✅ Fully Working)

- ✅ **Unit System**: Imperial (lbs, inches) or Metric (kg, cm)
- ✅ **Theme**: Dark mode, Light mode, or System default
- ✅ **Workout Preferences**: Rest timer defaults, auto-start, sound, haptics
- ✅ **Plate Calculator**: Barbell weight and available plate configuration
- ✅ **Account Settings**: Email, password, profile picture, display name
- ✅ **Privacy Settings**: Data export, account deletion

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
| **OpenAI GPT-4o-mini** | AI coaching chat only | ~$0.0003 per message (0.03¢) |

### Platform Integrations

| Platform | Library | Purpose | Status |
|----------|---------|---------|--------|
| **iOS** | `react-native-health` | Apple Health integration | ❌ Not implemented (stub) |
| **Android** | `expo-health-connect`, `react-native-health-connect` | Health Connect integration | ⚠️ Partial |
| **Notifications** | `expo-notifications` | Push notifications | ✅ Working |
| **Error Tracking** | `@sentry/react-native` | Production error monitoring | ✅ Configured |
| **Purchases** | `react-native-purchases` | In-app purchases (RevenueCat) | ⚠️ Partial config |

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
├── app/                      # Expo Router screens
│   ├── (auth)/              # Login, signup, forgot password
│   ├── (tabs)/              # Main tab navigation
│   │   ├── index.tsx        # Home screen
│   │   ├── workout.tsx      # Workout planning
│   │   ├── history.tsx      # Workout history
│   │   ├── progress.tsx     # Charts and analytics
│   │   └── profile.tsx      # User profile
│   ├── body/                # Body tracking screens
│   ├── coach.tsx            # AI coach chat
│   ├── exercise/            # Exercise library
│   ├── notifications.tsx    # Notification center
│   ├── prs.tsx             # Personal records
│   ├── settings/           # 19 settings screens
│   ├── template/           # Template management
│   └── workout/            # Active workout screens
│       ├── active.tsx       # Live workout tracking
│       ├── complete.tsx     # Post-workout summary
│       └── [id].tsx         # Workout detail view
│
├── components/              # Reusable components
│   ├── ai/                 # AI-related UI (11 components)
│   ├── body/               # Body tracking UI
│   ├── health/             # Health integration UI
│   ├── workout/            # Workout-specific UI (12 components)
│   └── ui/                 # Base UI components
│
├── lib/                    # Business logic
│   ├── ai/                 # AI service (25 files)
│   ├── api/                # Supabase API calls (15 files)
│   ├── health/             # Health integrations (9 files)
│   ├── notifications/      # Notification system (10 files)
│   ├── sync/               # Offline sync (7 files) - 🚧 Not integrated
│   ├── storage/            # Local storage
│   ├── utils/              # Utilities (30 files)
│   └── supabase.ts         # Supabase client
│
├── stores/                 # Zustand state stores
│   ├── authStore.ts        # Authentication
│   ├── workoutStore.ts     # Active workout state (1236 lines)
│   ├── exerciseStore.ts    # Exercise library cache
│   ├── settingsStore.ts    # App settings (persistent)
│   └── ...                 # 10 total stores
│
├── hooks/                  # Custom React hooks (22 files)
├── types/                  # TypeScript type definitions
├── supabase/              # Supabase configuration
│   ├── functions/         # Edge functions
│   │   ├── ai-complete/   # AI proxy function
│   │   ├── delete-user/   # User deletion function
│   │   └── exercise-search/ # Exercise search function
│   └── migrations/        # Database migrations (49 files)
│
├── scripts/               # Development scripts
│   ├── media/            # Exercise media management (40 scripts)
│   ├── db/               # Database utilities (11 scripts)
│   ├── analysis/         # Code analysis (9 scripts)
│   └── dev/              # Development tools (13 scripts)
│
├── tests/                 # Test files
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── mocks/            # Test mocks
│
├── exercise-gifs/        # Exercise GIF files (~474 files)
├── exercise-thumbnails/  # Thumbnail images (~847 files)
└── assets/               # App assets
```

### Data Flow (Current Implementation)

```
User Action (UI Interaction)
    ↓
Component (React Native)
    ↓
Store (Zustand)
    ↓
API Layer (lib/api/)
    ↓
Supabase Client (DIRECT CALL)
    ↓
PostgreSQL Database
    ↓
Realtime Broadcast
    ↓
Other Devices Updated (if online)
```

**Note**: Despite having offline-first infrastructure (`useOfflineFirst` hook, sync queue, conflict resolver), the app currently makes **direct Supabase calls** without local-first caching.

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
   # Note: EXPO_PUBLIC_REVENUECAT_API_KEY not in template - RevenueCat partially configured
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

8. **Start development server**
   ```bash
   npm start
   ```

9. **Run on device/simulator**
    ```bash
    # iOS Simulator (Mac only)
    npm run ios
    
    # Android Emulator
    npm run android
    
    # Web (limited features)
    npm run web
    ```

### Quick Start (Development)

If you just want to get the app running quickly:

```bash
# 1. Install dependencies
npm install

# 2. Set up minimal .env
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
# EXPO_PUBLIC_REVENUECAT_API_KEY - Not in template, RevenueCat incomplete
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

---

## 💾 Database Schema

### Core Tables (✅ Verified)

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
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_workouts INTEGER DEFAULT 0,
  total_volume NUMERIC DEFAULT 0,
  -- 30+ settings columns
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `exercises`
Exercise library
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
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  total_volume NUMERIC,
  total_sets INTEGER,
  total_reps INTEGER,
  rating INTEGER,
  template_id UUID,
  health_synced BOOLEAN DEFAULT false,
  health_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

For complete database schema with all tables, see [Database Schema Documentation](database-schema.md).

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
```

### Test Structure

```
tests/
├── setup.ts              # Test configuration
├── unit/                 # Unit tests
└── mocks/                # Test mocks
```

### Test Coverage

Coverage thresholds are enforced for critical files:
- `lib/utils/calculations.ts`: 90%
- `lib/sync/**/*.ts`: 80%
- `stores/workoutStore.ts`: 70%

---

## 🚀 Deployment

### ⚠️ Important: EAS Configuration Not Set Up

The project **does not have EAS configuration**. The following are example instructions:

#### Example iOS Build (Requires EAS Setup)

1. **Install EAS CLI**: `npm install -g eas-cli`
2. **Configure EAS**: `eas build:configure` (creates `eas.json`)
3. **Build**: `eas build --platform ios`
4. **Submit**: `eas submit --platform ios`

#### Example Android Build (Requires EAS Setup)

1. **Configure**: `eas build:configure`
2. **Build**: `eas build --platform android`
3. **Submit**: `eas submit --platform android`

**Note**: Before deploying, you need to:
- Create `eas.json` configuration
- Configure app signing
- Set up environment variables in EAS
- Complete RevenueCat configuration if using premium features

---

## 📜 Scripts

The `scripts/` directory contains utility scripts for database management, media processing, and development tasks.

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

# Testing
npm test                     # Run tests
npm run test:coverage        # Run with coverage
```

---

## 🤖 AI System

### Architecture Overview

The app features a hybrid AI system with **one true AI feature** and multiple intelligent rule-based features:

```
┌─────────────────────────────────────────────────┐
│  ONLY AI Feature: Coach Chat                     │
│  Mobile App → AI Service → Edge Function → OpenAI│
│  - Rate limiting (10 free/100 premium per day)   │
│  - Usage tracking                                 │
│  - Cost protection                                │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│  All Other "AI" Features (Database/Calculations) │
│  - Workout Suggestions: Database queries         │
│  - Progressive Overload: Math calculations       │
│  - Form Tips: Database lookups                   │
│  - Plateau Detection: Statistical analysis       │
│  - Recovery Status: Timestamp calculations       │
│  - All FREE, work offline                        │
└─────────────────────────────────────────────────┘
```

### Feature Breakdown

| Feature | Type | API Calls | Cost | Status |
|---------|------|-----------|------|--------|
| **AI Coach Chat** | 🤖 Real AI | ✅ YES | ~$0.0003/msg | ✅ Working |
| **Workout Suggestions** | 📊 Database | ❌ NO | Free | ✅ Working |
| **Progressive Overload** | 🧮 Math | ❌ NO | Free | ✅ Working |
| **Form Tips** | 📚 Database | ❌ NO | Free | ✅ Working |
| **Plateau Detection** | 📈 Algorithm | ❌ NO | Free | ✅ Working |
| **Recovery Status** | ⏱️ Time calc | ❌ NO | Free | ✅ Working |

**Cost Efficiency**: Only 1 feature uses OpenAI API, making the app extremely cost-effective.

---

## 🌐 Offline Architecture Status

### ⚠️ **IMPORTANT: Infrastructure Built But Not Integrated**

The codebase contains a **complete offline-first architecture** with sync queue, conflict resolution, and local storage. However, **this infrastructure is not currently used** in the production app flow.

### 🚧 **What EXISTS (But Isn't Used):**

1. **`hooks/useOfflineFirst.ts`** (272 lines)
   - ✅ Complete offline-first hook implementation
   - ❌ **NEVER IMPORTED** in any `app/` screen
   - Status: Dead code

2. **`lib/sync/syncQueue.ts`** (296 lines)
   - ✅ Full sync queue with retry logic
   - ✅ Exponential backoff (max 5 attempts)
   - ⚠️ Used in settings UI, but not in main workout flow
   - Status: Partially integrated

3. **`lib/sync/conflictResolver.ts`** (407 lines)
   - ✅ 4 conflict strategies (server_wins, client_wins, latest_wins, manual)
   - ✅ Smart merging for workouts and templates
   - ⚠️ Available but rarely triggered
   - Status: Ready but unused

4. **`lib/storage/localDatabase.ts`**
   - ✅ AsyncStorage wrapper for local data
   - ⚠️ Used for some caching, but not offline-first pattern
   - Status: Partially used

### ✅ **What ACTUALLY WORKS:**

**Current Implementation:**
```typescript
// What happens when you complete a workout:
1. User taps "Finish Workout"
2. workoutStore.endWorkout() called
3. DIRECT INSERT to Supabase (if online)
4. If offline: Error shown to user
5. No local queue, no automatic retry
```

**The app requires internet to save workouts.**

### 📝 **Honest Current State:**

- **Online**: ✅ Works perfectly - saves directly to Supabase
- **Offline**: ❌ Cannot complete workouts - will show error
- **Sync Queue**: 🚧 Exists but not used for main workout flow
- **Conflict Resolution**: 🚧 Ready but rarely triggered
- **Multi-device**: ✅ Works via Supabase Realtime (when online)

### 🔮 **Future Integration:**

To make this truly offline-first:
1. Replace direct Supabase calls with `useOfflineFirst` hook
2. Save workouts to local storage first
3. Add to sync queue
4. Sync in background when online
5. Handle conflicts automatically

**Estimated effort**: 2-4 weeks of refactoring

---

## 🏥 Health Integrations Status

### ❌ **Apple Health (iOS) - NOT IMPLEMENTED**

**Current Status**: Complete stub/placeholder

```typescript
// lib/health/healthService.ios.ts - ALL FUNCTIONS RETURN FALSE:

async checkAvailability(): Promise<boolean> {
    logger.log('ℹ️ Health integration not yet available on iOS');
    return false;  // ALWAYS FALSE
}

async saveWorkout(workout): Promise<boolean> {
    logger.log('ℹ️ Apple Health sync not yet available...');
    return false;  // DOES NOTHING
}

async readWeight(): Promise<[]> {
    return [];  // RETURNS EMPTY
}
```

**What users see**: Settings → Health shows "Coming Soon" message

**Features Claimed vs Reality:**
- ❌ Bidirectional weight sync - **NOT IMPLEMENTED**
- ❌ Workout export - **NOT IMPLEMENTED**
- ❌ Heart rate monitoring - **NOT IMPLEMENTED**
- ❌ Body measurements sync - **NOT IMPLEMENTED**
- ❌ Steps import - **NOT IMPLEMENTED**
- ❌ Sleep data - **NOT IMPLEMENTED**

**Status**: 0% complete, all stubs

---

### ⚠️ **Health Connect (Android) - PARTIALLY IMPLEMENTED**

**Current Status**: Code exists, unclear integration

#### ✅ **What Exists:**
1. **Full implementation** in `lib/health/healthService.android.ts` (1,710 lines)
2. Uses actual `react-native-health-connect` package
3. Settings UI with permissions management
4. Functions for:
   - Reading heart rate, steps, sleep, weight
   - Writing workouts, calories, weight
   - Permission handling

#### ⚠️ **What's Unclear:**
```typescript
// lib/health/workoutSync.ts EXISTS
export async function syncWorkoutToHealth(workout): Promise<boolean> {
  // ... checks settings ...
  const synced = await healthService.saveWorkout(workoutData);
  return synced;
}

// BUT: Cannot confirm this is called after completing a workout
// Searched: workoutStore.ts, app/workout/active.tsx, app/workout/complete.tsx
// Result: NO calls to syncWorkoutToHealth found
```

#### 🔍 **Automatic Sync Status:**

**Unknown if automatic health sync happens after workouts.**

Possibilities:
1. Manual sync only (user must trigger in settings)
2. Automatic but async (happens in background)
3. Not integrated yet (code ready but not called)

**What we know:**
- ✅ Settings UI works (can enable/disable health sync)
- ✅ Code to sync workouts exists
- ⚠️ Unknown if automatic sync happens after completing workout
- ✅ Manual sync might work (not tested)

#### 📊 **Android Health Features Status:**

| Feature | Code Exists | Integration Status |
|---------|-------------|-------------------|
| Workout export | ✅ Yes | ⚠️ Unknown |
| Weight sync | ✅ Yes | ⚠️ Unknown |
| Heart rate read | ✅ Yes | ⚠️ Unknown |
| Steps read | ✅ Yes | ⚠️ Unknown |
| Sleep read | ✅ Yes | ⚠️ Unknown |
| Settings UI | ✅ Yes | ✅ Working |

**Overall Android Status**: 40% complete - Infrastructure ready, integration unclear

---

### 🎯 **Health Integration Summary:**

| Platform | Status | Percentage | Notes |
|----------|--------|-----------|-------|
| **iOS** | ❌ Not Implemented | 0% | All stubs returning false |
| **Android** | ⚠️ Partial | 40% | Code exists, unclear if used |
| **Overall** | 🚧 In Development | 20% | Needs testing and integration work |

**Honest Assessment**: Health integration is not production-ready despite having code for Android.

---

## 💰 Monetization

### Pricing Model

**Free Tier** (Always Free):
- ✅ Unlimited workout logging
- ✅ Complete exercise library
- ✅ All progress tracking and charts
- ✅ Body tracking and progress photos
- ✅ Template management
- ✅ PR tracking
- ✅ **UNLIMITED**: Workout Suggestions, Progressive Overload, Form Tips, Plateau Detection, Recovery Status (all database-based)
- ❌ Limited: AI Coach Chat (10 messages/day)

**Premium Tier** ($9.99/month or $79.99/year):
- ✅ Everything in Free
- ✅ Unlimited AI Coach Chat (100 messages/day vs 10/day)
- ✅ Priority support
- ✅ Early access to features

**⚠️ Note**: RevenueCat integration is **partially configured**. Package installed but API key not in env template.

### Cost Analysis (Actual)

**Premium User Costs**:
- AI usage: ~$0.40-1.00/month (20-40 chat messages)
- Infrastructure: ~$1/month (database, storage)
- **Total**: ~$1.40-2.00/month per user
- **Profit margin**: 80-85% at $9.99/month

**Free User Costs**:
- AI: ~$0.05-0.06/month (~5-7 chat messages)
- Infrastructure: ~$0.10/month
- **Total**: ~$0.15-0.16/month per free user

**Key Insight**: Extremely profitable because only 1 feature uses paid AI at $0.0003/message.

---

## 🗺 Roadmap

### Version 1.0 (Current - Development Complete) ✅
- ✅ Complete workout tracking
- ✅ Exercise library with media
- ✅ AI coaching system (hybrid)
- ✅ Progress tracking and analytics
- ✅ Body tracking
- ✅ Template management
- ✅ Notification system
- ✅ Settings and customization

### Missing for Production Release 🚧
- 🚧 Complete offline-first integration
- 🚧 Apple Health implementation (iOS)
- 🚧 Health Connect integration verification (Android)
- 🚧 EAS build configuration
- 🚧 RevenueCat complete setup
- 🚧 App Store assets and listings

### Version 1.2 (Next 3-6 Months) 🔮
- [ ] Offline-first refactoring (integrate existing code)
- [ ] Apple Health integration (iOS)
- [ ] Verify and complete Health Connect (Android)
- [ ] Social features (share workouts with friends)
- [ ] Exercise form video library
- [ ] Integration with Fitbit, Garmin, Whoop

### Version 2.0 (Future) 🌟
- [ ] Real-time co-training with friends
- [ ] Personal trainer marketplace
- [ ] Video form analysis using AI
- [ ] Voice-controlled workout logging
- [ ] Apple Watch standalone app
- [ ] Web dashboard

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

---

## 📄 License

MIT License - See LICENSE file for details

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
- **GitHub Issues**: [Report bugs](https://github.com/yourusername/gym-tracker/issues)

---

## 📊 Final Transparency Summary

### ✅ **What's 100% Working:**
- Core workout tracking and logging
- Exercise library with search and filters
- AI Coach Chat (real OpenAI integration)
- Progress tracking (PRs, volume, analytics)
- Body tracking (weight, measurements, photos)
- Template system
- Achievements and notifications
- Settings and customization

### 🚧 **What's Built But Not Integrated:**
- Offline-first sync system (296 lines, unused)
- Conflict resolution (407 lines, ready)
- `useOfflineFirst` hook (272 lines, never imported)

### ⚠️ **What's Partially Complete:**
- Health Connect (Android) - Code exists, integration unclear
- RevenueCat - Package installed, API key missing
- EAS deployment - No configuration file

### ❌ **What's Not Implemented:**
- Apple Health (iOS) - Complete stub (0% done)
- Automatic health sync verification
- Production deployment configuration
- Social features beyond basic export

---

**Built with ❤️ and brutal honesty for the fitness community**

**Version**: 1.0.0 (Development Complete)  
**Last Updated**: January 2026  
**Platform**: iOS, Android  
**Framework**: React Native (Expo)  
**Backend**: Supabase (PostgreSQL)  
**AI**: OpenAI GPT-4o-mini (Chat only)
