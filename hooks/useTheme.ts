import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../stores/settingsStore';
import { themes, ThemeMode, ThemeColors } from '../lib/theme/colors';

export function useTheme() {
  const systemTheme = useColorScheme();
  const { theme: userTheme } = useSettingsStore();

  // Determine active theme
  const activeTheme: ThemeMode =
    userTheme === 'system'
      ? (systemTheme === 'dark' ? 'dark' : 'light')
      : userTheme === 'dark'
      ? 'dark'
      : 'light';

  const colors: ThemeColors = themes[activeTheme];

  return {
    theme: activeTheme,
    colors,
    isDark: activeTheme === 'dark',
    isLight: activeTheme === 'light',
  };
}

