# Theme System Implementation

## ✅ Files Created

### 1. `lib/theme/colors.ts`
Centralized color definitions for dark and light themes:
```typescript
export const themes = {
  dark: { background, surface, text, primary, ... },
  light: { background, surface, text, primary, ... }
}
```

**Color Palette:**
- **Dark Theme**: Slate colors (#0f172a background)
- **Light Theme**: Bright colors (#f8fafc background)
- **Consistent**: Primary, success, warning, error stay the same

### 2. `hooks/useTheme.ts`
Hook to access current theme:
```typescript
const { theme, colors, isDark, isLight } = useTheme();
```

### 3. `context/ThemeContext.tsx`
React Context provider for theme (optional if using hook directly)

### 4. `app/settings/theme.tsx`
Theme settings screen with:
- ✅ Three options: Dark, Light, Auto (system)
- ✅ Visual previews of both themes
- ✅ Icons for each mode
- ✅ Instant save

## 🎨 Usage

### Basic Usage

```typescript
import { useTheme } from '@/hooks';

function MyComponent() {
  const { colors, isDark } = useTheme();
  
  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>Hello</Text>
      <TouchableOpacity style={{ backgroundColor: colors.primary }}>
        <Text style={{ color: '#fff' }}>Button</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### With StyleSheet

```typescript
import { useTheme } from '@/hooks';
import { StyleSheet } from 'react-native';

function MyComponent() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: 16,
  },
  text: {
    color: colors.text,
    fontSize: 16,
  },
});
```

## 🎯 Color Reference

### Dark Theme
```typescript
{
  background: '#0f172a',    // Main background
  surface: '#1e293b',       // Cards, containers
  surfaceHover: '#334155',  // Hover states
  text: '#f1f5f9',          // Primary text
  textSecondary: '#94a3b8', // Secondary text
  textMuted: '#64748b',     // Muted text
  primary: '#3b82f6',       // Primary blue
  primaryHover: '#2563eb',  // Primary blue hover
  success: '#22c55e',       // Green
  warning: '#f59e0b',       // Amber
  error: '#ef4444',         // Red
  border: '#334155',        // Borders
}
```

### Light Theme
```typescript
{
  background: '#f8fafc',    // Main background
  surface: '#ffffff',       // Cards, containers
  surfaceHover: '#f1f5f9',  // Hover states
  text: '#0f172a',          // Primary text
  textSecondary: '#475569', // Secondary text
  textMuted: '#94a3b8',     // Muted text
  primary: '#3b82f6',       // Primary blue (same)
  success: '#22c55e',       // Green (same)
  warning: '#f59e0b',       // Amber (same)
  error: '#ef4444',         // Red (same)
  border: '#e2e8f0',        // Borders
}
```

## 📋 Migration Guide

### Step 1: Replace Hardcoded Colors

**Before:**
```typescript
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
  },
  text: {
    color: '#f1f5f9',
  },
});
```

**After:**
```typescript
const { colors } = useTheme();

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  text: {
    color: colors.text,
  },
});
```

### Step 2: Update StatusBar

In `app/_layout.tsx`:
```typescript
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/hooks';

export default function RootLayout() {
  const { isDark } = useTheme();
  
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/* Rest of app */}
    </>
  );
}
```

### Step 3: Update Components

Priority order for updating:
1. **Layout components** (tabs, headers)
2. **Common components** (buttons, cards, inputs)
3. **Screen components** (all screens)
4. **Specialized components** (charts, graphs)

## 🎯 Components to Update

### High Priority
- [ ] `app/(tabs)/_layout.tsx` - Tab bar
- [ ] `app/_layout.tsx` - Root layout & StatusBar
- [ ] `components/ui/Button.tsx`
- [ ] `components/ui/Card.tsx`
- [ ] `components/ui/Input.tsx`

### Medium Priority
- [ ] All tab screens (workout, history, progress, profile)
- [ ] `components/workout/SetRow.tsx`
- [ ] `components/workout/ExerciseCard.tsx`
- [ ] Settings screens

### Low Priority
- [ ] Charts and graphs
- [ ] Modal screens
- [ ] Specialized components

## 🚀 Theme Settings Screen Features

### UI Elements
- ✅ **Dark Mode**: Moon icon, "Dark colors for low light"
- ✅ **Light Mode**: Sun icon, "Bright colors for daylight"
- ✅ **Auto Mode**: Smartphone icon, "Matches your device theme"

### Preview Cards
- Shows miniature UI in dark theme
- Shows miniature UI in light theme
- Includes avatar, button, list items
- Updates when selection changes

### Behavior
- Saves to settingsStore (syncs to Supabase)
- Immediate effect throughout app
- No need to restart

## 🔧 Advanced Usage

### Custom Theme Colors
To add new colors, update `lib/theme/colors.ts`:

```typescript
export const themes = {
  dark: {
    // existing colors...
    accent: '#a855f7', // Add new color
  },
  light: {
    // existing colors...
    accent: '#9333ea', // Add new color
  },
};
```

### Conditional Styling
```typescript
const { isDark, colors } = useTheme();

<View style={{
  backgroundColor: colors.surface,
  shadowColor: isDark ? '#000' : '#999',
  shadowOpacity: isDark ? 0.5 : 0.3,
}}>
```

## 📱 System Integration

The theme system respects the device's system theme when "Auto" is selected:

```typescript
// Automatically detects system theme
const systemTheme = useColorScheme(); // from react-native

// User preference
const userTheme = useSettingsStore(state => state.theme);

// Final theme
const activeTheme = userTheme === 'system' ? systemTheme : userTheme;
```

## ✅ Testing

1. **Test Dark Mode**: Settings → Theme → Dark → Verify all screens
2. **Test Light Mode**: Settings → Theme → Light → Verify all screens
3. **Test Auto Mode**: Settings → Theme → Auto → Change device theme
4. **Test Persistence**: Close app, reopen, verify theme persists

## 🎨 Design System

### Typography
```typescript
<Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>
  Heading
</Text>
<Text style={{ color: colors.textSecondary, fontSize: 16 }}>
  Body text
</Text>
<Text style={{ color: colors.textMuted, fontSize: 14 }}>
  Muted text
</Text>
```

### Surfaces
```typescript
// Cards
<View style={{ backgroundColor: colors.surface, borderRadius: 12 }}>

// Elevated cards
<View style={{
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
}}>
```

### Buttons
```typescript
// Primary
<TouchableOpacity style={{ backgroundColor: colors.primary }}>

// Secondary
<TouchableOpacity style={{
  backgroundColor: 'transparent',
  borderWidth: 1,
  borderColor: colors.border,
}}>

// Destructive
<TouchableOpacity style={{ backgroundColor: colors.error }}>
```

---

**Status**: Core theme system complete. Ready for component migration.

**Next**: Update components one by one to use theme colors instead of hardcoded values.

