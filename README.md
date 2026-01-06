# 💪 Gym Tracker - AI-Powered Workout Tracking App

> A comprehensive, production-ready gym workout tracking application with AI coaching, offline support, health integrations, and advanced progress analytics.

![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-blue)
![React Native](https://img.shields.io/badge/React%20Native-0.81-green)
![Expo](https://img.shields.io/badge/Expo-SDK%2054-purple)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## 📖 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Core Workout Features](#core-workout-features)
- [Exercise Library](#exercise-library)
- [Progress Tracking](#progress-tracking)
- [Body Tracking](#body-tracking)
- [AI Coaching System](#ai-coaching-system)
- [Templates & Planning](#templates--planning)
- [Data & Sync](#data--sync)
- [Health Integrations](#health-integrations)
- [Notifications](#notifications)
- [Settings & Customization](#settings--customization)
- [Technical Stack](#technical-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Pricing Strategy](#pricing-strategy)
- [Roadmap](#roadmap)

---

## 🎯 Overview

**Gym Tracker** is a full-featured mobile workout tracking application designed to help fitness enthusiasts of all levels log workouts, track progress, and achieve their fitness goals. Built with modern technologies and production-ready best practices, this app combines the simplicity of manual tracking with the intelligence of AI-powered coaching.

### What Makes This App Different?

- **423+ Exercise Library**: Comprehensive database with animated GIFs, muscle targeting, and equipment filters
- **AI-Powered Coaching**: GPT-4 based workout suggestions, form tips, plateau detection, and progressive overload recommendations
- **True Offline-First**: Full functionality without internet, with automatic conflict resolution when syncing
- **Health Integration**: Bidirectional sync with Apple Health (iOS) and Health Connect (Android)
- **Smart Notifications**: Workout reminders, rest timer alerts, PR celebrations, and engagement notifications
- **Production Ready**: Complete error handling, monitoring, rate limiting, and cost protection

### Target Audience

- **Gym Enthusiasts**: Serious lifters who want detailed tracking and progressive overload
- **Beginners**: Users new to fitness who need AI guidance and workout suggestions
- **Athletes**: Competitive individuals tracking personal records and performance metrics
- **Coaches**: Professionals using templates and data analysis for clients

---

## ✨ Key Features

### 🏋️ Core Workout Features

#### **Workout Logging**
- ✅ Quick workout creation from templates or scratch
- ✅ Live workout tracking with exercise cards
- ✅ One-tap set completion with instant feedback
- ✅ Support for 4 set types: Normal, Warmup, Dropset, Failure
- ✅ RPE (Rate of Perceived Exertion) tracking
- ✅ Real-time PR (Personal Record) detection
- ✅ Exercise notes and custom observations
- ✅ Workout duration tracking
- ✅ Total volume calculations

#### **Rest Timer**
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
- ✅ Heart rate monitoring during workout (if connected)

#### **Workout Management**
- ✅ Save workout as template
- ✅ Edit workout after completion
- ✅ Delete workouts
- ✅ Duplicate workouts
- ✅ View workout history
- ✅ Export workout data (JSON/CSV)
- ✅ Share workout summary

---

## 📚 Exercise Library

### **Database Statistics**
- **Total Exercises**: 423 active exercises
- **Categories**: 10 muscle groups
- **Equipment Types**: 17 different equipment categories
- **Media Assets**: 474 exercise GIFs + 847 thumbnails

### **Exercise Categories**

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

### **Equipment Types**

Barbell, Dumbbell, Cable, Body Weight, Leverage Machine, Smith Machine, Kettlebell, Resistance Bands, EZ Bar, Sled Machine, Medicine Ball, Stability Ball, Rope, Trap Bar, Elliptical, Stepmill

### **Exercise Features**
- ✅ **Animated GIFs**: Visual demonstration for every exercise
- ✅ **Thumbnail Previews**: Fast-loading preview images
- ✅ **Muscle Targeting**: Primary and secondary muscles highlighted
- ✅ **Equipment Filtering**: Filter by available gym equipment
- ✅ **Search & Autocomplete**: Fast fuzzy search using Fuse.js
- ✅ **Favorites System**: Quick access to frequently used exercises
- ✅ **Custom Exercises**: Create your own exercises with measurement types
- ✅ **Exercise History**: See all past performances for any exercise
- ✅ **PRs Per Exercise**: Track max weight, max reps, max volume

---

## 📈 Progress Tracking

### **Personal Records (PRs)**

#### **PR Types Tracked**
1. **Max Weight PR**: Heaviest weight lifted for any rep count
2. **Max Reps PR**: Most reps performed at a specific weight
3. **Max Volume PR**: Highest total weight × reps in a single set

#### **PR Detection**
- ✅ Real-time detection during workout
- ✅ Automatic comparison with historical data
- ✅ Instant PR celebration with animations
- ✅ Confetti cannon animation (optional)
- ✅ Trophy icons and badges
- ✅ Sound effects (optional)
- ✅ Haptic feedback
- ✅ PR notifications
- ✅ PR history timeline
- ✅ PR leaderboard (per exercise)

### **Analytics & Statistics**

#### **Workout Stats**
- ✅ Total workouts completed
- ✅ Current streak (consecutive days)
- ✅ Longest streak record
- ✅ Total volume lifted (all-time)
- ✅ Average workout duration
- ✅ Workouts per week/month
- ✅ Rest days analysis

#### **Volume Tracking**
- ✅ Daily volume chart
- ✅ Weekly volume trends
- ✅ Monthly volume comparison
- ✅ Volume by muscle group
- ✅ Volume by exercise
- ✅ Progressive overload visualization

#### **Strength Progression**
- ✅ Weight progression charts per exercise
- ✅ Rep progression over time
- ✅ One-rep max (1RM) estimates
- ✅ Strength standards comparison
- ✅ Muscle group distribution pie chart
- ✅ Exercise frequency heatmap

### **Visual Charts**
- Line charts for weight progression
- Bar charts for volume comparison
- Sparklines for quick trends
- Heatmaps for workout frequency
- Pie charts for muscle distribution

---

## 📷 Body Tracking

### **Weight Logging**
- ✅ Quick weight entry from home screen
- ✅ Weight history timeline
- ✅ Weight chart with trend line
- ✅ Daily/weekly/monthly views
- ✅ Goal weight setting
- ✅ Weight gain/loss calculations
- ✅ Body weight sparkline on home
- ✅ Sync with Apple Health/Health Connect

### **Body Measurements**
Comprehensive body measurement tracking with:
- ✅ Chest, Waist, Hips
- ✅ Biceps (Left/Right)
- ✅ Forearms (Left/Right)
- ✅ Thighs (Left/Right)
- ✅ Calves (Left/Right)
- ✅ Shoulders, Neck
- ✅ Body fat percentage
- ✅ Measurement history with charts
- ✅ Progress photos integration

### **Progress Photos**
- ✅ Front, side, back pose presets
- ✅ Photo gallery with date stamps
- ✅ Before/after comparison slider
- ✅ Grid view of photo timeline
- ✅ Fullscreen photo viewer
- ✅ Photo metadata (date, weight, measurements)
- ✅ Delete/edit photos
- ✅ Private and secure storage

### **Body Composition Goals**
- ✅ Set target weight
- ✅ Track progress toward goal
- ✅ Estimated time to goal
- ✅ Weight gain/loss recommendations
- ✅ Calorie estimates based on activity

---

## 🤖 AI Coaching System

### **Production-Ready AI Architecture**

The app features a complete AI coaching system powered by OpenAI GPT-4, with enterprise-grade rate limiting, usage tracking, and cost protection.

#### **System Architecture**
```
Mobile App → AI Service → Supabase Edge Function → OpenAI API
                ↓
          Rate Limiting
                ↓
          Usage Tracking
                ↓
          Cost Protection
```

### **AI Features**

#### **1. Daily Workout Suggestions**
**What it does**: Analyzes your recent workout history, personal records, recovery status, and available equipment to suggest the optimal workout for today.

**Triggers**: Displayed on home screen, refreshes daily

**Data Used**:
- Last 14 days of workout history
- Muscle group recovery times
- Personal records and plateaus
- Available gym equipment
- Fitness goals and experience level
- Current streak and motivation

**Example Output**:
```
Type: Pull Day
Reason: Your back hasn't been trained in 4 days and is fully recovered. 
Focus on vertical and horizontal pulling movements.

Exercises:
- Pull-ups: 4 sets × 8-10 reps
- Barbell Rows: 4 sets × 8-10 reps
- Cable Lat Pulldowns: 3 sets × 12-15 reps
- Face Pulls: 3 sets × 15-20 reps
```

**Features**:
- Equipment filtering (only suggests exercises you can do)
- Injury avoidance (respects injury restrictions)
- Split-based planning (Push/Pull/Legs awareness)
- Progressive overload consideration
- Confidence scoring (high/medium/low)

#### **2. Progressive Overload Recommendations**
**What it does**: Provides intelligent weight and rep recommendations for each set based on historical performance.

**Triggers**: Shown below each set in active workout

**Data Used**:
- Last 10 sessions of the exercise
- Set-by-set historical performance
- PR tracking
- Fatigue accumulation (later sets)

**Example Output**:
```
Weight: 185 lbs
Reps: 8
Reasoning: "You hit 8 reps at 185lbs for 2+ sessions. Time to add 5lbs! 💪"
Confidence: High
Progress Type: Weight increase
```

**Logic**:
- If you hit target reps for 2+ sessions → increase weight
- If you didn't hit target → increase reps
- Later sets get fatigue-adjusted recommendations
- Compares against PR to detect new records

#### **3. AI Form Tips**
**What it does**: Provides real-time form cues and safety tips for exercises.

**Triggers**: Expandable section in exercise card during workout

**Data Used**:
- Exercise name and type
- Common form mistakes database
- Your injury history

**Example Output**:
```
Barbell Bench Press - Form Tips:
✓ Keep shoulder blades retracted and depressed
✓ Maintain slight arch in lower back
✓ Lower bar to mid-chest, not neck
✓ Drive through your heels
⚠️ Avoid flaring elbows past 45 degrees
⚠️ Don't bounce bar off chest
```

#### **4. Post-Workout Analysis**
**What it does**: Provides comprehensive AI-powered analysis after completing a workout.

**Triggers**: Shown on workout completion screen

**Data Used**:
- Current workout data (volume, sets, exercises)
- Comparison with previous similar workout
- PR achievements
- Workout streak and frequency

**Example Output**:
```
Summary: "Great pull session! You increased total volume by 12% 
compared to last week and hit a new PR on barbell rows. Keep this 
momentum going!"

Highlights:
• New PR: Barbell Row - 205 lbs × 8 reps
• 15% volume increase vs. last pull day
• Perfect 4-day recovery between pull sessions

Improvements:
• Consider adding another back width exercise
• Your rear delts are underworked - add more face pulls

Next Workout Tip: "Focus on legs next. It's been 5 days since your 
last leg day - prioritize squats and hamstring work."

Estimated Calories: 387 kcal
Total Volume: 12,450 lbs
Muscles Worked: Lats, Upper Back, Biceps, Rear Delts
```

#### **5. Plateau Detection**
**What it does**: Monitors your progress across all exercises and alerts you when stagnation is detected.

**Triggers**: Automatic scan weekly, shown in notifications center

**Detection Criteria**:
- No weight increase for 4+ sessions
- No rep increase for 4+ sessions
- Declining performance trend

**Example Alert**:
```
⚠️ Plateau Detected: Bench Press

You've been stuck at 185 lbs for 6 sessions. 

Recommendations:
• Try a deload week (reduce weight by 20%)
• Increase training frequency
• Add variation exercises (incline bench, dumbbell press)
• Check recovery and nutrition
```

#### **6. Recovery Status**
**What it does**: Estimates muscle group recovery based on training frequency and intensity.

**Triggers**: Shown on home screen and in workout planning

**Data Used**:
- Last workout per muscle group
- Volume and intensity of that workout
- Typical recovery times (48-72 hours)

**Example Output**:
```
Recovery Status:
✅ Chest: Fully recovered (3 days rest)
⚠️ Legs: Still recovering (1 day rest)
✅ Back: Fully recovered (4 days rest)
❌ Shoulders: Overtrained (trained 2 days in a row)
```

#### **7. AI Coach Chat**
**What it does**: Interactive chat interface where you can ask fitness questions.

**Triggers**: Dedicated "AI Coach" screen

**Example Questions**:
- "How do I break through a squat plateau?"
- "What's a good workout split for 4 days a week?"
- "Should I train arms on push or pull day?"
- "How much protein should I eat to build muscle?"

### **AI System Technical Details**

#### **Rate Limiting & Cost Protection**
- **Free Tier**: 10 AI requests per day (~$0.30/day, $9/month)
- **Premium Tier**: 100 AI requests per day (~$3/day, $90/month)
- Rate limits enforced at database level
- 30-second cache for limit checks
- Automatic fallback to rule-based suggestions

#### **Usage Tracking**
Every AI request logs:
- User ID
- Request type (suggestion, analysis, form tips, etc.)
- Tokens used (input + output)
- Cost in cents
- Model used (gpt-4o-mini)
- Success/failure status
- Timestamp

Dashboard analytics:
- Today's usage
- Monthly usage
- All-time usage
- Cost per user
- Request type breakdown

#### **Fallback System**
If AI is unavailable or rate limit is hit:
- Rule-based workout suggestions (analyzes recent history programmatically)
- Static form tips from database
- Template-based workout analysis

#### **Models Used**
- **Primary**: `gpt-4o-mini` (fast, cost-effective, $0.03 per request)
- **Pricing**: $0.00015 per 1K input tokens, $0.0006 per 1K output tokens

---

## 📋 Templates & Planning

### **Workout Templates**

#### **Template Features**
- ✅ Create custom workout templates
- ✅ Name templates (e.g., "Push Day A", "Full Body")
- ✅ Add exercises with preset sets/reps
- ✅ Template folders/organization
- ✅ Duplicate templates
- ✅ Edit templates
- ✅ Delete templates
- ✅ Start workout from template (one-tap)
- ✅ Template preview before starting
- ✅ Recently used templates

#### **Default Templates**
The app includes pre-built templates for common workout splits:
- Push Day (Chest, Shoulders, Triceps)
- Pull Day (Back, Biceps)
- Leg Day (Quads, Hamstrings, Glutes, Calves)
- Upper Body
- Lower Body
- Full Body
- Arm Day

#### **Template Folders**
Organize templates into folders:
- Personal Templates
- Push/Pull/Legs Split
- Bodybuilding
- Strength Training
- Archived Templates

---

## ☁️ Data & Sync

### **Offline-First Architecture**

The app is designed to work perfectly without internet connection, with intelligent syncing when connectivity is restored.

#### **Offline Capabilities**
✅ Log workouts completely offline
✅ View all historical data
✅ Create/edit templates
✅ Track body weight and measurements
✅ View exercise library
✅ Access all settings
✅ View charts and analytics
✅ (Only AI features require internet)

### **Sync System**

#### **How Sync Works**
1. All changes are saved to **local device storage** first (instant)
2. Changes are added to a **sync queue**
3. When online, sync queue processes operations automatically
4. **Conflict resolution** handles simultaneous edits from multiple devices
5. Real-time updates via Supabase Realtime (when online)

#### **Conflict Resolution**
**Strategy**: Last-write-wins with intelligent merging

**Example Conflict**:
```
Device A (offline): Completes "Bench Press" with 185 lbs × 8 reps
Device B (offline): Completes "Bench Press" with 190 lbs × 6 reps

Resolution: Both entries are kept with timestamps, user sees both in history
```

**Conflict Types Handled**:
- Workout edits from multiple devices
- Template modifications
- Body measurements
- Settings changes
- Exercise additions

#### **Sync Queue Features**
- ✅ Automatic retry with exponential backoff
- ✅ Maximum 5 retry attempts
- ✅ Manual sync trigger
- ✅ Sync status indicator
- ✅ Sync conflict viewer (in settings)
- ✅ Resolve conflicts manually
- ✅ Force push/pull data

#### **Multi-Device Support**
- ✅ Register multiple devices per account
- ✅ View active devices in settings
- ✅ Remove old devices
- ✅ Device-specific settings (local only)
- ✅ Last synced timestamp per device

### **Data Export & Backup**

#### **Backup Features**
- ✅ Manual backup to Supabase Storage
- ✅ Automatic weekly backups (optional)
- ✅ Export all data as JSON
- ✅ Export workout history as CSV
- ✅ Backup includes:
  - All workouts
  - Templates
  - Body measurements
  - Photos
  - Settings
  - PRs
  - Exercise history

#### **Data Import**
- ✅ Import from previous backup
- ✅ Import from CSV (workout data)
- ✅ Merge or replace existing data

---

## 🏥 Health Integrations

### **Apple Health (iOS)**

#### **Permissions Required**
- Read: Weight, Heart Rate, Steps, Sleep
- Write: Workouts, Active Calories, Weight

#### **Features**
- ✅ **Bidirectional Weight Sync**: Weight logged in app syncs to Health, weight in Health syncs to app
- ✅ **Workout Export**: Completed workouts saved to Health with:
  - Workout type (Strength Training, Cardio, etc.)
  - Duration
  - Calories burned
  - Heart rate (if available)
- ✅ **Heart Rate Monitoring**: Real-time heart rate during workout (if Apple Watch connected)
- ✅ **Body Measurements**: Sync body measurements to Health
- ✅ **Steps Import**: View daily steps on home dashboard
- ✅ **Sleep Data**: Import sleep duration for recovery tracking

### **Health Connect (Android)**

#### **Permissions Required**
- Read: Weight, Heart Rate, Steps, Sleep
- Write: Exercise Sessions, Active Calories, Weight

#### **Features**
- ✅ **Weight Sync**: Bidirectional weight synchronization
- ✅ **Exercise Sessions**: Export completed workouts
- ✅ **Heart Rate**: Real-time monitoring during workouts
- ✅ **Steps & Activity**: Daily step count
- ✅ **Sleep Tracking**: Sleep data for recovery insights

### **Health Sync Settings**
Configure what data to sync:
- ✅ Enable/disable health sync globally
- ✅ Auto-sync on workout completion
- ✅ Sync weight bidirectionally
- ✅ Sync body measurements
- ✅ Read heart rate
- ✅ Read steps
- ✅ Read sleep
- ✅ Manual sync trigger
- ✅ Last synced timestamp

---

## 🔔 Notifications

### **Notification Types**

#### **1. Rest Timer Notifications**
- Triggers when rest timer completes
- Shows "Rest complete! Ready for your next set?"
- Sound and vibration (customizable)
- Works in background
- Tapping opens active workout

#### **2. Workout Reminders**
- Schedule reminders for specific days/times
- Customizable message
- Weekly recurring schedule
- Multiple reminders supported
- Example: "Tuesday 6:00 PM - Leg Day!"

#### **3. PR Celebrations**
- Instant notification when PR is achieved
- Shows exercise name and new record
- Trophy icon and confetti
- Sound effect (optional)
- Saved to notification center

#### **4. Achievement Notifications**
- **Streak Milestones**: 7, 30, 100, 365 day streaks
- **Workout Milestones**: 10, 50, 100, 500 workouts
- **Volume Milestones**: 100K, 500K, 1M lbs total
- **Special Achievements**: First workout, first PR, etc.

#### **5. Engagement Notifications**
**Smart Timing**: Uses ML to find optimal reminder time based on past workout patterns

- **Inactivity Reminders**: "You haven't worked out in 3 days. Let's get back on track!"
- **Streak Risk**: "Don't lose your 15-day streak! Workout today to keep it going."
- **Weekly Summary**: "This week you completed 4 workouts and lifted 42,000 lbs!"
- **Comeback Encouragement**: "Welcome back! Ready to start fresh?"

### **Notification Settings**

#### **Master Controls**
- ✅ Enable/disable all notifications
- ✅ Enable/disable by type (reminders, PRs, achievements, etc.)

#### **Detailed Settings**
- ✅ Rest timer sound on/off
- ✅ Rest timer vibration on/off
- ✅ PR celebrations on/off
- ✅ PR sound on/off
- ✅ PR confetti on/off
- ✅ Achievement notifications on/off
- ✅ Achievement sounds on/off
- ✅ Inactivity reminders on/off
- ✅ Streak reminders on/off
- ✅ Weekly summary on/off

#### **Quiet Hours**
- ✅ Enable quiet hours
- ✅ Set start time (e.g., 10:00 PM)
- ✅ Set end time (e.g., 7:00 AM)
- ✅ No notifications during quiet hours

---

## ⚙️ Settings & Customization

### **Unit System**
- ✅ Imperial (lbs, inches)
- ✅ Metric (kg, cm)
- ✅ Auto-convert historical data

### **Theme**
- ✅ Dark mode (default)
- ✅ Light mode
- ✅ System default (follows device)

### **Workout Preferences**
- ✅ Rest timer default (30-300 seconds)
- ✅ Auto-start timer after set
- ✅ Sound enabled/disabled
- ✅ Haptic feedback enabled/disabled
- ✅ Show previous workout reference
- ✅ Auto-fill sets from last workout

### **Plate Calculator**
- ✅ Barbell weight (45 lbs, 35 lbs, etc.)
- ✅ Available plate sizes
- ✅ Standard plates (45, 35, 25, 10, 5, 2.5 lbs)
- ✅ Custom plate configuration

### **Account Settings**
- ✅ Change email
- ✅ Change password
- ✅ Profile picture
- ✅ Display name
- ✅ Account deletion
- ✅ Privacy settings

---

## 🛠 Technical Stack

### **Frontend**

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

### **UI Libraries**

| Library | Purpose |
|---------|---------|
| `@shopify/flash-list` | Performant lists |
| `react-native-chart-kit` | Charts and graphs |
| `react-native-svg` | Vector graphics |
| `react-native-calendars` | Calendar picker |
| `react-native-confetti-cannon` | PR celebrations |
| `expo-image` | Optimized image loading |
| `expo-linear-gradient` | Gradient backgrounds |

### **Backend**

| Technology | Purpose |
|------------|---------|
| **Supabase** | Backend-as-a-Service |
| **PostgreSQL** | Primary database |
| **Supabase Realtime** | WebSocket subscriptions |
| **Supabase Storage** | File storage (photos, backups) |
| **Supabase Edge Functions** | Serverless functions |
| **Supabase Auth** | Authentication |

### **AI/ML**

| Service | Purpose | Cost |
|---------|---------|------|
| **OpenAI GPT-4o-mini** | AI coaching, workout suggestions, form tips | $0.03 per request |

### **Platform Integrations**

| Platform | Library | Purpose |
|----------|---------|---------|
| **iOS** | `react-native-health` | Apple Health integration |
| **Android** | `expo-health-connect`, `react-native-health-connect` | Health Connect integration |
| **Notifications** | `expo-notifications` | Push notifications |
| **Error Tracking** | `@sentry/react-native` | Production error monitoring |

### **Development Tools**

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit testing |
| **@testing-library/react-native** | Component testing |
| **TSX** | TypeScript execution for scripts |
| **Dotenv** | Environment variable management |
| **Sharp** | Image processing (thumbnails) |

---

## 🏗 Architecture

### **Project Structure**

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
│   ├── settings/           # 20 settings screens
│   ├── template/           # Template management
│   └── workout/            # Active workout screens
│       ├── active.tsx       # Live workout tracking
│       ├── complete.tsx     # Post-workout summary
│       └── [id].tsx         # Workout detail view
├── components/              # Reusable components
│   ├── ai/                 # AI-related UI (15 components)
│   ├── body/               # Body tracking UI
│   ├── health/             # Health integration UI
│   ├── home/               # Home screen widgets
│   ├── modals/             # Modal dialogs
│   ├── notifications/      # Notification components
│   ├── sync/               # Sync status UI
│   ├── template/           # Template components
│   ├── ui/                 # Base UI components
│   └── workout/            # Workout-specific UI (12 components)
├── lib/                    # Business logic
│   ├── ai/                 # AI service (23 files)
│   │   ├── aiService.ts    # Main AI client
│   │   ├── workoutSuggestions.ts
│   │   ├── workoutAnalysis.ts
│   │   ├── progressiveOverload.ts
│   │   ├── plateauDetection.ts
│   │   ├── formTips.ts
│   │   ├── recoveryService.ts
│   │   └── contextBuilder.ts
│   ├── api/                # Supabase API calls (15 files)
│   ├── health/             # Health integrations (9 files)
│   ├── notifications/      # Notification system (10 files)
│   ├── sync/               # Offline sync (7 files)
│   ├── storage/            # Local storage
│   ├── utils/              # Utilities (30 files)
│   └── supabase.ts         # Supabase client
├── stores/                 # Zustand stores
│   ├── aiStore.ts          # AI state
│   ├── authStore.ts        # Authentication
│   ├── checkinStore.ts     # Daily check-ins
│   ├── exerciseStore.ts    # Exercise data
│   ├── injuryStore.ts      # Injury tracking
│   ├── notificationStore.ts # Notifications
│   ├── settingsStore.ts    # App settings
│   └── workoutStore.ts     # Workout state (1200+ lines)
├── hooks/                  # Custom React hooks (20 hooks)
├── types/                  # TypeScript types
│   ├── database.ts         # Supabase generated types
│   ├── exercise-measurements.ts
│   └── notifications.ts
├── supabase/              # Supabase configuration
│   ├── functions/         # Edge functions
│   │   └── ai-complete/   # AI proxy function
│   └── migrations/        # Database migrations (44 files)
├── scripts/               # Development scripts
│   ├── media/            # Exercise media management (40 scripts)
│   ├── db/               # Database utilities (10 scripts)
│   ├── analysis/         # Exercise analysis (9 scripts)
│   └── dev/              # Development tools (13 scripts)
├── exercise-gifs/        # 474 exercise GIFs
├── exercise-thumbnails/  # 847 thumbnail images
└── assets/               # App assets (icons, sounds)
```

### **Data Flow**

```
User Action
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

### **State Management Pattern**

The app uses Zustand for state management with three types of stores:

1. **Persistent Stores** (saved to device):
   - `settingsStore` - User preferences
   - `authStore` - Authentication state
   - `workoutStore` - Active workout data (cleared on save)

2. **Session Stores** (in-memory only):
   - `exerciseStore` - Exercise library cache
   - `notificationStore` - Notification state
   - `aiStore` - AI usage tracking

3. **Hybrid Stores** (selective persistence):
   - `checkinStore` - Daily check-ins with cache

### **API Layer Design**

All Supabase interactions go through typed API functions:

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
- Type safety
- Centralized error handling
- Easy testing
- Consistent data transformations

---

## 💾 Database Schema

### **Core Tables**

#### **profiles**
User profile and settings
- `id` (uuid, references auth.users)
- `email`, `full_name`, `avatar_url`
- `weight_unit`, `measurement_unit`
- `fitness_goals`, `experience_level`
- `available_equipment[]` (text array)
- `injury_restrictions[]` (text array)
- `current_streak`, `longest_streak`
- `total_workouts`, `total_volume`
- Settings columns (30+ boolean/numeric fields)

#### **exercises**
Exercise library (423 exercises)
- `id` (uuid)
- `name`, `category`, `equipment`
- `primary_muscles[]`, `secondary_muscles[]`
- `gif_url`, `thumbnail_url`
- `instructions`, `tips[]`
- `measurement_type` (weight_reps, duration, distance, assisted)
- `is_active` (boolean)

#### **workouts**
Completed workouts
- `id` (uuid)
- `user_id` (uuid)
- `name`, `notes`
- `started_at`, `completed_at`
- `duration_seconds`
- `total_volume`
- `exercises` (jsonb) - nested exercise/set data
- `health_synced`, `health_synced_at`
- `heart_rate_avg`, `heart_rate_max`

#### **templates**
Workout templates
- `id` (uuid)
- `user_id` (uuid)
- `name`, `description`
- `exercises` (jsonb)
- `folder_id` (uuid)
- `is_default` (boolean)
- `last_used_at`

#### **personal_records**
PR tracking
- `id` (uuid)
- `user_id` (uuid)
- `exercise_id` (uuid)
- `pr_type` (weight, reps, volume)
- `weight`, `reps`, `volume`
- `weight_unit`
- `achieved_at`

#### **body_weights**
Weight history
- `id` (uuid)
- `user_id` (uuid)
- `weight`, `unit`
- `measured_at`
- `health_synced`, `health_synced_at`
- `notes`

#### **body_measurements**
Body measurements
- `id` (uuid)
- `user_id` (uuid)
- `chest`, `waist`, `hips`
- `bicep_left`, `bicep_right`
- `thigh_left`, `thigh_right`
- `calf_left`, `calf_right`
- `shoulders`, `neck`
- `body_fat_percentage`
- `measured_at`
- `unit`

#### **progress_photos**
Progress photos
- `id` (uuid)
- `user_id` (uuid)
- `photo_url` (storage)
- `photo_type` (front, side, back)
- `taken_at`
- `weight`, `notes`

#### **ai_usage**
AI request tracking
- `id` (uuid)
- `user_id` (uuid)
- `request_type` (suggestion, analysis, form_tips, etc.)
- `tokens_used`, `cost_cents`
- `model` (gpt-4o-mini)
- `success` (boolean)
- `created_at`

#### **ai_feedback**
AI response ratings
- `id` (uuid)
- `user_id` (uuid)
- `ai_usage_id` (uuid)
- `feature` (string)
- `rating` (thumbs_up, thumbs_down)
- `context` (jsonb)

#### **daily_checkins**
Daily mood/energy tracking
- `id` (uuid)
- `user_id` (uuid)
- `checkin_date`
- `mood` (1-5)
- `energy` (1-5)
- `soreness[]` (muscle groups)
- `sleep_quality` (1-5)
- `notes`

#### **user_injuries**
Injury tracking
- `id` (uuid)
- `user_id` (uuid)
- `body_part` (shoulder, knee, back, etc.)
- `description`
- `severity` (minor, moderate, severe)
- `occurred_at`
- `recovered_at`
- `is_active` (boolean)

#### **notifications**
Notification history
- `id` (uuid)
- `user_id` (uuid)
- `type` (pr, achievement, reminder, engagement)
- `title`, `message`
- `data` (jsonb)
- `read` (boolean)
- `created_at`

#### **user_devices**
Multi-device tracking
- `id` (uuid)
- `user_id` (uuid)
- `device_name`, `device_type`
- `push_token`
- `last_active_at`

#### **custom_exercises**
User-created exercises
- `id` (uuid)
- `user_id` (uuid)
- `name`, `category`, `equipment`
- `measurement_type`
- `notes`
- `is_public` (boolean)
- `status` (pending, approved, rejected) - if public

### **Database Functions**

#### **can_use_ai(user_id)**
Returns AI rate limit status
```sql
{
  allowed: boolean,
  used: number,
  limit: number,
  remaining: number,
  tier: 'free' | 'premium',
  is_premium: boolean
}
```

#### **log_ai_usage(...)**
Logs AI request with usage tracking

#### **get_ai_usage_stats(user_id)**
Returns usage statistics (today, month, all-time)

#### **detect_personal_record(...)**
Checks if a set is a new PR

#### **calculate_workout_volume(workout_id)**
Calculates total volume for workout

---

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+ installed
- Expo CLI installed (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator
- Supabase account (free tier works)
- OpenAI API key (optional, for AI features)

### **Installation**

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/gym-tracker.git
cd gym-tracker/gym-tracker
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Supabase**
- Create project at supabase.com
- Copy `.env.example` to `.env`
- Add your Supabase URL and anon key

4. **Run database migrations**
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
npm run db:seed
```

6. **Upload exercise media** (optional, uses pre-uploaded GIFs)
```bash
npm run media:upload
```

7. **Start development server**
```bash
npm start
```

8. **Run on device/simulator**
```bash
npm run ios      # iOS Simulator
npm run android  # Android Emulator
```

### **Environment Variables**

Create `.env` file:
```bash
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=your-openai-key  # For AI features (optional)
```

---

## ⚙️ Configuration

### **Supabase Setup**

1. **Enable Realtime** (for multi-device sync)
2. **Configure Storage Buckets**:
   - `avatars` (public)
   - `progress-photos` (private)
   - `backups` (private)
   - `exercise-media` (public)
3. **Set up Edge Functions**:
```bash
cd supabase/functions
supabase functions deploy ai-complete
supabase secrets set OPENAI_API_KEY=your-key
```

### **AI Configuration**

Edit rate limits in Supabase SQL Editor:
```sql
-- In can_use_ai function
v_daily_limit := CASE 
  WHEN v_is_premium THEN 100
  ELSE 10
END;
```

### **Notification Configuration**

Configure in `app.json`:
```json
{
  "expo": {
    "plugins": [
      ["expo-notifications", {
        "icon": "./assets/notification-icon.png",
        "color": "#3b82f6"
      }]
    ]
  }
}
```

---

## 💰 Pricing Strategy

### **Freemium Model**

#### **Free Tier** (Always Free)
✅ Unlimited workout logging
✅ Complete exercise library (423 exercises)
✅ All progress tracking and charts
✅ Body tracking and progress photos
✅ Template management
✅ Offline support
✅ Health sync (Apple Health, Health Connect)
✅ PR tracking and celebrations
✅ Basic notifications
❌ Limited AI features (10 requests/day)

#### **Premium Tier** ($9.99/month or $79.99/year)
✅ Everything in Free
✅ **Unlimited AI coaching** (100 requests/day)
✅ Advanced workout analysis
✅ Personalized plateau detection
✅ Custom workout programming
✅ Priority support
✅ Early access to new features
✅ Export all data (CSV, JSON)
✅ Cloud backup storage (10 GB)

### **Monetization Breakdown**

**Target Revenue**: $50K MRR at 5,000 paying users

**Costs per User** (Premium):
- AI usage: ~$3/month (100 requests)
- Infrastructure: ~$1/month (database, storage)
- Total: ~$4/month per user
- Profit margin: 60%

**Free Tier Costs**:
- AI: ~$0.30/month (10 requests)
- Infrastructure: ~$0.10/month
- Subsidized by premium users (acceptable at 10:1 ratio)

### **Alternative Revenue Streams**
1. **Coaching Marketplace**: Take 20% commission on personal trainer bookings
2. **Premium Templates**: $2.99 per professional program
3. **Equipment Affiliate Links**: Amazon Associates for gym equipment
4. **White-label B2B**: License to gyms/trainers at $199/month

---

## 🗺 Roadmap

### **Version 1.1** (Current - Production Ready)
✅ Complete workout tracking
✅ Exercise library with media
✅ AI coaching system
✅ Offline sync
✅ Health integrations
✅ Notification system
✅ Body tracking

### **Version 1.2** (Next 2 Months)
- [ ] Social features (follow friends, share workouts)
- [ ] Workout challenges and leaderboards
- [ ] Exercise form video tutorials (user-generated)
- [ ] Meal planning integration
- [ ] Barcode scanner for nutrition tracking
- [ ] Integration with Fitbit, Garmin, Whoop

### **Version 2.0** (Q3 2025)
- [ ] Workout with friends (real-time co-training)
- [ ] Personal trainer marketplace
- [ ] Video form analysis using AI (record set, get feedback)
- [ ] Voice-controlled workout logging
- [ ] Apple Watch app (standalone)
- [ ] Web dashboard for coaches

### **Version 2.5** (Q4 2025)
- [ ] Program builder (create 8-12 week training programs)
- [ ] Periodization planning
- [ ] Injury rehabilitation programs
- [ ] Integration with smart gym equipment (Tonal, Tempo, etc.)
- [ ] AR form feedback (using device camera)

---

## 📱 App Store Listing

### **Title**
Gym Tracker - AI Workout Log

### **Subtitle**
Workout Logger with AI Coach & Progress Tracking

### **Description**

**Track Workouts. Build Muscle. Get Stronger.**

Gym Tracker is the ultimate workout logging app for serious lifters. With 423+ exercises, AI-powered coaching, and comprehensive progress analytics, you'll have everything you need to reach your fitness goals.

**🏋️ COMPLETE WORKOUT TRACKING**
• Quick and easy workout logging
• 423+ exercises with animated demonstrations
• Customizable rest timer with notifications
• Automatic PR (personal record) detection
• Support for all training styles (strength, hypertrophy, endurance)

**🤖 AI COACHING & GUIDANCE**
• Daily workout suggestions based on your history
• Intelligent weight/rep recommendations
• Post-workout analysis and feedback
• Plateau detection and breakthrough strategies
• Real-time form tips and safety cues

**📊 PROGRESS ANALYTICS**
• Detailed strength progression charts
• Volume tracking by muscle group
• Personal record timeline
• Body weight and measurement tracking
• Progress photos with comparison slider

**☁️ WORKS OFFLINE**
• Full functionality without internet
• Automatic cloud sync when online
• Multi-device support
• Conflict resolution for simultaneous edits

**💪 HEALTH INTEGRATIONS**
• Apple Health sync (iOS)
• Health Connect sync (Android)
• Heart rate monitoring during workouts
• Automatic workout export

**🎯 PREMIUM FEATURES**
• Unlimited AI coaching requests
• Advanced analytics
• Export all data
• Priority support

Download now and start building your best body!

---

### **Keywords**
gym, workout, fitness, weightlifting, bodybuilding, exercise, tracker, log, AI coach, personal trainer, progress, muscle, strength, training

### **Screenshots Needed**
1. Active workout screen (showing exercise cards, rest timer)
2. Home screen (with workout suggestions, streak, stats)
3. Exercise library (search, filters, GIF previews)
4. Progress charts (weight progression, volume trends)
5. PR celebration screen (confetti, trophy)
6. Body tracking (weight chart, measurements)
7. AI coach chat interface
8. Template library

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
- **Discord**: Join our community
- **GitHub Issues**: Report bugs and request features

---

**Built with ❤️ for the fitness community**

