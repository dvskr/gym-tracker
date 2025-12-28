/**
 * Theme Color Definitions
 * Centralized color system for dark and light themes
 */

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceHover: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryHover: string;
  success: string;
  warning: string;
  error: string;
  border: string;
  cardBackground: string;
  inputBackground: string;
  placeholder: string;
};

export const themes = {
  dark: {
    background: '#0f172a', // slate-950
    surface: '#1e293b', // slate-800
    surfaceHover: '#334155', // slate-700
    text: '#f1f5f9', // slate-100
    textSecondary: '#94a3b8', // slate-400
    textMuted: '#64748b', // slate-500
    primary: '#3b82f6', // blue-500
    primaryHover: '#2563eb', // blue-600
    success: '#22c55e', // green-500
    warning: '#f59e0b', // amber-500
    error: '#ef4444', // red-500
    border: '#334155', // slate-700
    cardBackground: '#1e293b', // slate-800
    inputBackground: '#1e293b', // slate-800
    placeholder: '#64748b', // slate-500
  },
  light: {
    background: '#f8fafc', // slate-50
    surface: '#ffffff', // white
    surfaceHover: '#f1f5f9', // slate-100
    text: '#0f172a', // slate-900
    textSecondary: '#475569', // slate-600
    textMuted: '#94a3b8', // slate-400
    primary: '#3b82f6', // blue-500
    primaryHover: '#2563eb', // blue-600
    success: '#22c55e', // green-500
    warning: '#f59e0b', // amber-500
    error: '#ef4444', // red-500
    border: '#e2e8f0', // slate-200
    cardBackground: '#ffffff', // white
    inputBackground: '#f8fafc', // slate-50
    placeholder: '#94a3b8', // slate-400
  },
} as const;

export type ThemeMode = 'dark' | 'light';

// Helper to get theme colors by mode
export function getThemeColors(mode: ThemeMode): ThemeColors {
  return themes[mode];
}

