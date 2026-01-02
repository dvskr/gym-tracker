import { useSettingsStore } from '../stores/settingsStore';
import {
  // Weight
  displayWeight,
  convertWeightForDisplay,
  convertWeightToCanonical,
  getWeightLabel,
  formatWeight,
  roundWeightToPlate,
  getPlateIncrements,
  getWeightIncrementButtons,
  // Length
  displayLength,
  convertLengthForDisplay,
  convertLengthToCanonical,
  getLengthLabel,
  formatLength,
  // Height
  displayHeight,
  convertHeightToCanonical,
  parseHeightToFeetInches,
  // Types
  UnitSystem,
} from '../lib/utils/units';

/**
 * Hook to get current unit settings and conversion utilities
 * 
 * All DB values are stored in canonical units (lbs, inches)
 * This hook provides utilities to convert for display and input
 */
export function useUnits() {
  const unitSystem = useSettingsStore((state) => state.unitSystem);

  return {
    // Current unit system
    unitSystem,

    // ============================================
    // WEIGHT (Exercise weights)
    // ============================================
    weight: {
      label: getWeightLabel(unitSystem),
      
      // Display DB value (lbs) as string in user's unit
      display: (lbs: number | null | undefined, decimals?: number) =>
        displayWeight(lbs, unitSystem, decimals),
      
      // Display with unit label (e.g., "135 lbs" or "61.2 kg")
      format: (lbs: number | null | undefined, decimals?: number) =>
        formatWeight(lbs, unitSystem, decimals),
      
      // Convert DB value to number in user's unit (for calculations/charts)
      toDisplay: (lbs: number) =>
        convertWeightForDisplay(lbs, unitSystem),
      
      // Convert user input to lbs for DB storage
      toCanonical: (value: number) =>
        convertWeightToCanonical(value, unitSystem),
      
      // Round to plate-friendly value
      round: (value: number, increment?: 'small' | 'large') =>
        roundWeightToPlate(value, unitSystem, increment),
      
      // Available plate sizes
      plates: getPlateIncrements(unitSystem),
      
      // Increment button values
      increments: getWeightIncrementButtons(unitSystem),
    },

    // ============================================
    // BODY WEIGHT (Same as weight, separate for clarity)
    // ============================================
    bodyWeight: {
      label: getWeightLabel(unitSystem),
      display: (lbs: number | null | undefined, decimals?: number) =>
        displayWeight(lbs, unitSystem, decimals),
      format: (lbs: number | null | undefined, decimals?: number) =>
        formatWeight(lbs, unitSystem, decimals),
      toDisplay: (lbs: number) =>
        convertWeightForDisplay(lbs, unitSystem),
      toCanonical: (value: number) =>
        convertWeightToCanonical(value, unitSystem),
    },

    // ============================================
    // LENGTH (Body measurements: chest, waist, arms, etc.)
    // ============================================
    length: {
      label: getLengthLabel(unitSystem),
      
      // Display DB value (inches) as string in user's unit
      display: (inches: number | null | undefined, decimals?: number) =>
        displayLength(inches, unitSystem, decimals),
      
      // Display with unit label (e.g., "42 in" or "107 cm")
      format: (inches: number | null | undefined, decimals?: number) =>
        formatLength(inches, unitSystem, decimals),
      
      // Convert DB value to number in user's unit
      toDisplay: (inches: number) =>
        convertLengthForDisplay(inches, unitSystem),
      
      // Convert user input to inches for DB storage
      toCanonical: (value: number) =>
        convertLengthToCanonical(value, unitSystem),
    },

    // ============================================
    // HEIGHT (Special formatting: 5'11" or 180 cm)
    // ============================================
    height: {
      label: unitSystem === 'metric' ? 'cm' : 'ft/in',
      
      // Display formatted height
      display: (inches: number | null | undefined) =>
        displayHeight(inches, unitSystem),
      
      // Convert input to inches for DB
      toCanonical: (value: number, feet?: number) =>
        convertHeightToCanonical(value, unitSystem, feet),
      
      // Parse inches to feet/inches (for imperial input fields)
      parse: (inches: number) =>
        parseHeightToFeetInches(inches),
    },
    
    // Legacy compatibility (deprecated - use weight.label instead)
    weightUnit: getWeightLabel(unitSystem),
    measurementUnit: getLengthLabel(unitSystem),
  };
}