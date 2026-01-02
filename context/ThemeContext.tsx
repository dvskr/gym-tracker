import React, { createContext, useContext, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../stores/settingsStore';
import { themes, ThemeMode, ThemeColors } from '../lib/theme/colors';

interface ThemeContextValue {
  theme: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
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

  const value: ThemeContextValue = {
    theme: activeTheme,
    colors,
    isDark: activeTheme === 'dark',
    isLight: activeTheme === 'light',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return context;
}
