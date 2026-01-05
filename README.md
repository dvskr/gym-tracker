# 🏋️ Gym Tracker

A modern, full-featured workout tracking app built with React Native, Expo, and Supabase.

## 🚀 Features

- **Authentication**: Secure user authentication with email/password
- **Workout Tracking**: Log exercises, sets, reps, and weights in real-time
- **Templates**: Create and use pre-made workout templates
- **History**: View past workouts and track progress over time
- **Progress Analytics**: Visualize your fitness journey with charts and stats
- **Custom Exercises**: Add your own exercises or use the built-in database
- **Dark Mode**: Beautiful dark theme optimized for gym environments

## 📦 Tech Stack

- **Framework**: React Native with Expo Router
- **Styling**: React Native StyleSheet API
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React Native
- **TypeScript**: Full type safety

## 📁 Project Structure

```
gym-tracker/
├── app/                          # Expo Router pages
│   ├── (auth)/                   # Auth screens (login, signup)
│   ├── (tabs)/                   # Main tabs (home, workout, history, progress, profile)
│   ├── workout/                  # Workout screens
│   ├── exercise/                 # Exercise screens
│   └── template/                 # Template screens
├── components/                   # Reusable components
│   ├── ui/                       # Basic UI components
│   ├── workout/                  # Workout-specific components
│   └── exercise/                 # Exercise-specific components
├── lib/                          # Core functionality
│   ├── supabase.ts              # Supabase client configuration
│   ├── api/                      # API functions
│   ├── services/                 # External services
│   └── utils/                    # Utility functions
├── stores/                       # Zustand stores
│   └── authStore.ts             # Authentication state
├── hooks/                        # Custom React hooks
├── types/                        # TypeScript types
│   └── database.ts              # Generated Supabase types
└── supabase/                     # Supabase configuration
    └── migrations/               # Database migrations
```

## 🗄️ Database Schema

The app uses Supabase with the following tables:

- **profiles**: User profiles with fitness preferences
- **exercises**: Exercise database (pre-loaded + custom)
- **workouts**: Workout sessions
- **workout_exercises**: Exercises in a workout
- **workout_sets**: Individual sets (weight, reps, RPE)
- **workout_templates**: Saved workout templates
- **template_exercises**: Exercises in templates

All tables have Row Level Security (RLS) enabled for data protection.

## 🛠️ Setup

### Prerequisites

- Node.js 18+
- Expo CLI
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/dvskr/gym-tracker.git
   cd gym-tracker
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` and fill in your Supabase credentials:
   - `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (for scripts only)

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Set up Supabase**
   ```bash
   npx supabase login
   npx supabase link --project-ref your_project_ref
   npx supabase db push
   ```

5. **Start the development server**
   ```bash
   npx expo start
   ```

## 📱 Running the App

- **iOS**: Press `i` in the terminal or scan the QR code with Expo Go
- **Android**: Press `a` in the terminal or scan the QR code with Expo Go
- **Web**: Press `w` in the terminal

## 🔐 Authentication

The app uses Supabase Auth with:
- Email/password authentication
- Secure token storage using Expo SecureStore
- Auto-refresh tokens
- Profile auto-creation on signup

## 🎨 Theming

The app uses a custom dark theme with React Native StyleSheet API:
- Primary colors: Blue (500, 600, 700)
- Dark backgrounds: Slate (800, 900, 950)

Theme values are defined in `lib/theme/` and `lib/styles/`.

## 🚧 Development Status

✅ **Completed:**
- Project setup and configuration
- Database schema and migrations
- Authentication flow (login/signup)
- Basic navigation structure
- Supabase integration
- TypeScript types generation

🔨 **In Progress:**
- Workout tracking UI
- Exercise search and selection
- Template management
- History and analytics

📋 **Planned:**
- ExerciseDB API integration
- Rest timer with haptic feedback
- Progress charts and statistics
- 1RM calculator
- Export workout data
- Social features (share workouts)

## 📄 License

MIT License - feel free to use this project for learning or building your own gym tracker!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

Created by [@dvskr](https://github.com/dvskr)

---

**Happy lifting! 💪**

