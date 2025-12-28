# Debugging Lessons Learned

## Bug: "java.lang.String cannot be cast to java.lang.Boolean"

This document captures the debugging journey for the Android crash that prevented the Gym Tracker app from rendering.

---

## 1. Root Causes Identified

### 1.1 expo-router `Tabs` and `Stack` Components Crash on Android
**Problem:** The `Tabs` and `Stack` navigation components from expo-router cause the "java.lang.String cannot be cast to java.lang.Boolean" crash on certain Android devices/Expo Go versions.

**Fix:** Use `Slot` component instead and build custom navigation:
```javascript
// Instead of Tabs or Stack, use Slot
import { Slot } from 'expo-router';

export default function Layout() {
  return <Slot />;
}
```

For tab navigation, create a custom tab bar:
```javascript
import { View, TouchableOpacity, Text } from 'react-native';
import { Slot, router, usePathname } from 'expo-router';

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Slot />
      <View style={styles.tabBar}>
        {/* Custom tab buttons using TouchableOpacity */}
      </View>
    </View>
  );
}
```

**How to Avoid:**
- Test navigation components on Android early
- Have a fallback plan for custom navigation if expo-router components fail
- Keep expo-router updated to latest version

---

### 1.2 NativeWind Package Installed But Not Properly Configured
**Problem:** NativeWind v4 was installed in the project but had conflicting configuration between v2 and v4 approaches. Even after removing the configuration, having the package installed triggered native module initialization that caused type casting issues on Android.

**Fix:** Completely uninstall NativeWind:
```bash
npm uninstall nativewind
```

Also removed:
- `nativewind-env.d.ts` file
- Reference from `tsconfig.json`

**How to Avoid:**
- When abandoning a library mid-development, fully uninstall it rather than just removing config
- Test on Android immediately after adding/removing native-dependent packages
- Use `npm ls nativewind` to verify packages are actually removed

---

### 1.2 Numeric `fontWeight` Values on Android
**Problem:** Using `fontWeight: '600'`, `'700'`, `'800'`, `'500'` in StyleSheet causes Android to crash with the cast error. Android's native Text component only accepts `'normal'` or `'bold'`.

**Example of broken code:**
```javascript
// ❌ Crashes on Android
buttonText: {
  fontWeight: '600',
}
```

**Fix:**
```javascript
// ✅ Works on Android
buttonText: {
  fontWeight: 'bold',  // or 'normal'
}
```

**Files affected:** 11 files across auth screens, workout screens, and UI components.

**How to Avoid:**
- Use ESLint rule to warn against numeric fontWeight strings
- Create a shared typography scale with pre-defined styles:
  ```javascript
  // styles/typography.ts
  export const typography = {
    bold: { fontWeight: 'bold' },
    normal: { fontWeight: 'normal' },
  };
  ```
- Test on Android device early and often, not just iOS simulator/web

---

### 1.3 expo-router `Stack` Component Issues
**Problem:** The `Stack` component from expo-router with certain `screenOptions` caused rendering issues in the root layout.

**Fix:** Use `Slot` instead of `Stack` in the root layout when you don't need navigation headers:
```javascript
// ✅ Works
import { Slot } from 'expo-router';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  );
}
```

**How to Avoid:**
- Start with minimal layouts and add features incrementally
- Test each navigation change on Android immediately

---

### 1.4 Experimental Android Settings in app.json
**Problem:** `edgeToEdgeEnabled` and `predictiveBackGestureEnabled` in app.json are experimental Android features that may cause compatibility issues.

**Fix:** Remove experimental settings unless specifically needed:
```json
{
  "android": {
    "adaptiveIcon": {
      "foregroundImage": "./assets/adaptive-icon.png",
      "backgroundColor": "#ffffff"
    }
    // Removed: edgeToEdgeEnabled, predictiveBackGestureEnabled
  }
}
```

**How to Avoid:**
- Don't enable experimental features in production apps
- Read changelogs and known issues before enabling new features
- Test experimental features in isolation first

---

### 1.5 Supabase Trigger for User Profiles
**Problem:** The database trigger that auto-creates user profiles on signup failed with "database error saving new user".

**Fix:** Update the trigger with better error handling:
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Failed to create profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**How to Avoid:**
- Always add error handling to database triggers
- Use `ON CONFLICT DO NOTHING` for idempotent inserts
- Test signup flow immediately after setting up auth

---

### 1.6 Auth Store Not Initialized
**Problem:** The `authStore.initialize()` function was defined but never called, causing the app to show infinite loading state.

**Fix:** Call `initialize()` in useEffect:
```javascript
useEffect(() => {
  initialize();
}, []);
```

**How to Avoid:**
- Add initialization logic to app startup checklist
- Use TypeScript to enforce required initialization patterns
- Add loading timeout with error message if initialization takes too long

---

## 2. Debugging Approach Used

### Step 1: Generate Hypotheses
For each bug, we generated 3-5 specific hypotheses about potential causes:
- Hypothesis A: fontWeight numeric strings
- Hypothesis B: SafeAreaProvider issues
- Hypothesis C: NativeWind initialization
- etc.

### Step 2: Add Instrumentation
Added `console.log` statements at key points:
```javascript
console.log('[DEBUG] RootLayout called');
console.log('[DEBUG] Before render');
setTimeout(() => console.log('[DEBUG] Render SUCCESS'), 100);
```

### Step 3: Analyze Runtime Evidence
- Checked which logs appeared before crash
- Identified exactly where in the code the crash occurred
- Used process of elimination to narrow down causes

### Step 4: Fix One Thing at a Time
- Made minimal changes
- Verified each fix with runtime logs
- Only removed instrumentation after user confirmed success

### Step 5: Clean Up
- Removed all debug logs after fixing
- Documented lessons learned

---

## 3. Prevention Checklist for Future Development

### Before Adding a Package
- [ ] Check if it has Android-specific requirements
- [ ] Test on Android immediately after installation
- [ ] Read the migration guide if upgrading versions

### When Writing Styles
- [ ] Use only `'bold'` or `'normal'` for fontWeight
- [ ] Create shared typography constants
- [ ] Test styles on Android, not just iOS/web

### When Configuring app.json
- [ ] Avoid experimental features unless necessary
- [ ] Test config changes on actual devices
- [ ] Keep a working backup of app.json

### When Using State Management
- [ ] Ensure stores are initialized on app startup
- [ ] Add timeout handling for async initialization
- [ ] Log initialization status during development

### General Best Practices
- [ ] Test on Android device early and often
- [ ] Use TypeScript strictly
- [ ] Add ESLint rules for common pitfalls
- [ ] Keep dependencies minimal and up-to-date

---

### 1.7 ExerciseDB API Free Tier Limit (10 exercises per request)
**Problem:** The ExerciseDB API on RapidAPI's free tier ignores the `limit=0` parameter and returns only 10 exercises per request.

**Symptoms:**
- Only 10 exercises displayed in the app
- API call succeeds but returns truncated data
- `limit` parameter appears to have no effect

**Fix (Workaround):** Fetch in batches with offset pagination:
```javascript
const allExercises = [];
let offset = 0;
const batchSize = 10; // Free tier limit

while (offset < maxExercises) {
  const batch = await fetchAllExercises({ limit: batchSize, offset });
  if (batch.length === 0) break;
  allExercises.push(...batch);
  offset += batchSize;
  if (batch.length < batchSize) break; // End of data
}
```

**Better Fix:** Seed exercises to your own database:
1. Create a seed script to fetch all exercises once
2. Store in Supabase `exercises` table
3. Fetch from Supabase instead of ExerciseDB API

**How to Avoid:**
- Check API documentation for rate limits and tier restrictions
- Test with free tier limits before assuming unlimited access
- Plan for data seeding early if using free-tier external APIs

---

### 1.8 Supabase Default 1000 Row Limit
**Problem:** Supabase queries return a maximum of 1000 rows by default, even without an explicit limit.

**Symptoms:**
- Exactly 1000 exercises displayed (not 1300+)
- No error returned
- Query appears successful but truncated

**Fix:** Use `.range()` for pagination:
```javascript
const allExercises = [];
const batchSize = 1000;
let offset = 0;
let hasMore = true;

while (hasMore) {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name')
    .range(offset, offset + batchSize - 1);

  if (error) throw error;

  if (data && data.length > 0) {
    allExercises.push(...data);
    offset += batchSize;
    if (data.length < batchSize) hasMore = false;
  } else {
    hasMore = false;
  }
}
```

**How to Avoid:**
- Always add pagination for tables that may exceed 1000 rows
- Check Supabase documentation for default limits
- Log row counts during development to catch truncation early

---

### 1.9 React Native Gesture Handler Setup
**Problem:** Swipe gestures require proper configuration of react-native-gesture-handler and react-native-reanimated.

**Setup Required:**
1. Install packages: `npx expo install react-native-gesture-handler react-native-reanimated`
2. Add Babel plugin for Reanimated:
```javascript
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'], // Must be last
  };
};
```
3. Wrap root layout with GestureHandlerRootView:
```javascript
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Your app content */}
    </GestureHandlerRootView>
  );
}
```

**How to Avoid:**
- Follow the official react-native-gesture-handler setup guide
- Always place the Reanimated babel plugin **last** in the plugins array
- Clear cache after babel config changes: `npx expo start --clear`
- Test gestures on physical devices (simulators may have issues)

---

## 4. Useful Commands

```bash
# Check for leftover packages
npm ls <package-name>

# Clear all caches and restart
npx expo start --clear

# Check for numeric fontWeight (should return nothing)
grep -r "fontWeight.*'[0-9]" --include="*.tsx" --include="*.ts"

# Uninstall a package completely
npm uninstall <package-name>

# Seed exercises to Supabase (one-time operation)
npm run seed:exercises

# Generate Supabase TypeScript types
npx supabase gen types typescript --linked > types/supabase.ts
```

---

## 5. Key Takeaways

### Android Crashes
**The error "java.lang.String cannot be cast to java.lang.Boolean" on Android usually means:**
1. A style property has the wrong type (like fontWeight)
2. A native package is misconfigured
3. An app.json setting is incompatible
4. expo-router components (Stack/Tabs) have compatibility issues

**Always test on Android early** - many issues only appear on Android, not iOS or web.

### API & Database Limits
**When data appears truncated (10, 1000, etc.):**
1. Check API tier limits (free tiers often have hidden restrictions)
2. Check database default limits (Supabase: 1000 rows)
3. Implement pagination for large datasets
4. Consider seeding external API data to your own database

**Always log counts during development** - `console.log('Fetched:', data.length)` catches truncation early.

---

### 1.10 Shorthand Boolean Props on Android
**Problem:** JSX shorthand boolean props (e.g., `autoFocus` instead of `autoFocus={true}`) can cause the "java.lang.String cannot be cast to java.lang.Boolean" error on Android.

**Example of broken code:**
```javascript
// ❌ Crashes on Android
<TextInput
  autoFocus
  selectTextOnFocus
  multiline
/>

<LineChart
  bezier
  withDots
/>
```

**Fix:**
```javascript
// ✅ Works on Android
<TextInput
  autoFocus={true}
  selectTextOnFocus={true}
  multiline={true}
/>

<LineChart
  bezier={true}
  withDots={true}
/>
```

**Common shorthand props to watch for:**
- TextInput: `autoFocus`, `selectTextOnFocus`, `multiline`, `secureTextEntry`, `editable`
- LineChart (react-native-chart-kit): `bezier`, `withDots`, `withShadow`, `fromZero`
- ScrollView: `horizontal`, `bounces`, `scrollEnabled`
- Modal: `visible`, `transparent`, `animationType`
- StatusBar: `translucent`

**How to Avoid:**
- Always use explicit `={true}` for boolean props
- Search for shorthand booleans: `grep -E "^\s+[a-z][a-zA-Z]+$" --include="*.tsx"`
- Add ESLint rule `react/jsx-boolean-value` to enforce explicit booleans

---

### 1.11 Stack Component in Nested Layouts Causes Crash
**Problem:** Using `Stack` from expo-router in nested layout files (e.g., `app/body/_layout.tsx`, `app/body/photos/_layout.tsx`) causes the "java.lang.String cannot be cast to java.lang.Boolean" crash on Android.

**Example of broken code:**
```javascript
// ❌ Crashes on Android in app/body/_layout.tsx
import { Stack } from 'expo-router';

export default function BodyLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#020617' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="weight" />
    </Stack>
  );
}
```

**Fix:**
```javascript
// ✅ Works on Android
import { Slot } from 'expo-router';
import { View, StyleSheet } from 'react-native';

export default function BodyLayout() {
  return (
    <View style={styles.container}>
      <Slot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
});
```

**Files commonly affected:** Any `_layout.tsx` file in nested folders like:
- `app/body/_layout.tsx`
- `app/body/photos/_layout.tsx`
- `app/workout/_layout.tsx`
- `app/template/_layout.tsx`
- `app/exercise/_layout.tsx`

**How to Avoid:**
- Use `Slot` instead of `Stack` in all layout files
- If you need navigation headers, handle them in individual screens
- Check all `_layout.tsx` files when adding new feature folders

