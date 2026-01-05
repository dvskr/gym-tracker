/**
 * Accessibility helper utilities for consistent a11y props
 */

import { AccessibilityRole, AccessibilityState } from 'react-native';

interface A11yButtonProps {
  accessible: true;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityRole: 'button';
  accessibilityState?: AccessibilityState;
}

interface A11yInputProps {
  accessible: true;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

interface A11yTextProps {
  accessible: true;
  accessibilityLabel: string;
  accessibilityRole: 'text';
}

interface A11yHeaderProps {
  accessible: true;
  accessibilityLabel: string;
  accessibilityRole: 'header';
}

interface A11yImageProps {
  accessible: true;
  accessibilityLabel: string;
  accessibilityRole: 'image';
}

interface A11yToggleProps {
  accessible: true;
  accessibilityLabel: string;
  accessibilityRole: 'switch' | 'checkbox';
  accessibilityState: { checked: boolean };
}

export const a11y = {
  /**
   * Accessibility props for buttons
   */
  button: (label: string, hint?: string, state?: AccessibilityState): A11yButtonProps => ({
    accessible: true,
    accessibilityLabel: label,
    ...(hint && { accessibilityHint: hint }),
    accessibilityRole: 'button',
    ...(state && { accessibilityState: state }),
  }),

  /**
   * Accessibility props for text inputs
   */
  input: (label: string, hint?: string): A11yInputProps => ({
    accessible: true,
    accessibilityLabel: label,
    ...(hint && { accessibilityHint: hint }),
  }),

  /**
   * Accessibility props for informational text
   */
  text: (label: string): A11yTextProps => ({
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: 'text',
  }),

  /**
   * Accessibility props for section headers
   */
  header: (label: string): A11yHeaderProps => ({
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: 'header',
  }),

  /**
   * Accessibility props for images
   */
  image: (label: string): A11yImageProps => ({
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: 'image',
  }),

  /**
   * Accessibility props for toggle buttons/switches
   */
  toggle: (label: string, isChecked: boolean): A11yToggleProps => ({
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: 'checkbox',
    accessibilityState: { checked: isChecked },
  }),

  /**
   * Accessibility props for disabled elements
   */
  disabled: (label: string): A11yButtonProps => ({
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: 'button',
    accessibilityState: { disabled: true },
  }),
};

/**
 * Format a value with units for screen readers
 */
export function formatA11yValue(value: number | string, unit: string): string {
  return `${value} ${unit}`;
}

/**
 * Format set completion status for screen readers
 */
export function formatSetStatus(
  setNumber: number,
  isCompleted: boolean,
  weight?: number,
  reps?: number,
  unit?: string
): string {
  const status = isCompleted ? 'completed' : 'not completed';
  if (weight && reps) {
    return `Set ${setNumber}, ${weight} ${unit || 'pounds'} for ${reps} reps, ${status}`;
  }
  return `Set ${setNumber}, ${status}`;
}

/**
 * Format workout duration for screen readers
 */
export function formatA11yDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  if (secs > 0 && hours === 0) parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);

  return parts.join(' and ') || '0 seconds';
}

export default a11y;

