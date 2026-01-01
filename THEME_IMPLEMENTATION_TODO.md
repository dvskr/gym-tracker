# Theme Implementation TODO

## Current Status
- ✅ Theme settings UI exists (`app/settings/theme.tsx`)
- ✅ Theme preference is saved to settings store
- ✅ Theme colors are defined (`lib/theme/colors.ts`)
- ❌ **Theme is not actually applied to the app**

## Problem
All screens are hardcoded to use dark theme colors in their StyleSheets:
- `backgroundColor: '#0f172a'` (dark background)
- `color: '#f1f5f9'` (light text)
- etc.

## Solution Required

### 1. Create Theme Hook
Create `hooks/useTheme.ts`:
```typescript
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/stores/settingsStore';
import { themes, getThemeColors } from '@/lib/theme/colors';

export function useTheme() {
  const { theme } = useSettingsStore();
  const systemColorScheme = useColorScheme(); // 'dark' | 'light'
  
  // Determine actual theme mode
  let themeMode: 'dark' | 'light';
  if (theme === 'system') {
    themeMode = systemColorScheme === 'dark' ? 'dark' : 'light';
  } else {
    themeMode = theme;
  }
  
  return {
    theme: themeMode,
    colors: getThemeColors(themeMode),
    isDark: themeMode === 'dark',
  };
}
```

### 2. Update Every Screen
For EACH screen/component (100+ files):

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
const MyScreen = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.text }]}>Hello</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor moved to inline style
  },
  text: {
    fontSize: 16,
    // color moved to inline style
  },
});
```

### 3. Files That Need Updates (~100+ files)
All screens in:
- `app/(tabs)/*.tsx` (5 files)
- `app/settings/*.tsx` (10+ files)
- `app/body/*.tsx` (10+ files)
- `app/workout/*.tsx` (5+ files)
- `app/exercise/*.tsx` (5+ files)
- `app/template/*.tsx` (3+ files)
- `components/**/*.tsx` (50+ files)

Each needs:
1. Import `useTheme()`
2. Get `colors` from hook
3. Replace hardcoded colors with `colors.background`, `colors.text`, etc.
4. Move color styles from StyleSheet to inline styles

### 4. StatusBar Updates
Also need to update StatusBar on each screen:
```typescript
<StatusBar style={isDark ? "light" : "dark"} />
```

## Estimated Effort
- **Time**: 20-40 hours to update all screens
- **Files**: 100+ files need changes
- **Complexity**: Medium (repetitive but tedious)

## Current Workaround
The theme setting saves correctly but only affects:
- The preview in theme settings
- Future screens if implemented

For now, the app will stay in dark mode until all screens are updated.

## Recommendation
This is a large refactor that should be done systematically:
1. Start with main tabs
2. Then settings screens
3. Then workout/exercise screens  
4. Finally all components

Or consider if light mode is a priority - if not, could leave as dark-only for now.

