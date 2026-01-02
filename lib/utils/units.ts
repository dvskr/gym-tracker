// ============================================
// CONVERSION CONSTANTS
// ============================================

const LBS_TO_KG = 0.453592;
const KG_TO_LBS = 2.20462;
const INCHES_TO_CM = 2.54;
const CM_TO_INCHES = 0.393701;

// Types
export type UnitSystem = 'imperial' | 'metric';

// ============================================
// WEIGHT CONVERSIONS (Exercise weights, body weight)
// ============================================

/**
 * Display weight from DB (lbs) in user's preferred unit
 */
export function displayWeight(
  weightInLbs: number | null | undefined,
  unitSystem: UnitSystem,
  decimals: number = 1
): string {
  if (weightInLbs === null || weightInLbs === undefined) return '--';
  
  if (unitSystem === 'metric') {
    return (weightInLbs * LBS_TO_KG).toFixed(decimals);
  }
  return weightInLbs.toFixed(decimals);
}

/**
 * Convert weight for display (returns number)
 */
export function convertWeightForDisplay(
  weightInLbs: number,
  unitSystem: UnitSystem
): number {
  if (unitSystem === 'metric') {
    return weightInLbs * LBS_TO_KG;
  }
  return weightInLbs;
}

/**
 * Convert user input to canonical (lbs) for storage
 */
export function convertWeightToCanonical(
  weight: number,
  unitSystem: UnitSystem
): number {
  if (unitSystem === 'metric') {
    // User entered kg, convert to lbs for storage
    return weight * KG_TO_LBS;
  }
  // User entered lbs, store as-is
  return weight;
}

/**
 * Get weight unit label
 */
export function getWeightLabel(unitSystem: UnitSystem): string {
  return unitSystem === 'metric' ? 'kg' : 'lbs';
}

/**
 * Format weight with unit label
 */
export function formatWeight(
  weightInLbs: number | null | undefined,
  unitSystem: UnitSystem,
  decimals: number = 1
): string {
  const value = displayWeight(weightInLbs, unitSystem, decimals);
  return `${value} ${getWeightLabel(unitSystem)}`;
}

/**
 * Round weight to nearest plate-friendly increment
 */
export function roundWeightToPlate(
  weight: number,
  unitSystem: UnitSystem,
  increment: 'small' | 'large' = 'large'
): number {
  if (unitSystem === 'metric') {
    const step = increment === 'small' ? 1.25 : 2.5;
    return Math.round(weight / step) * step;
  } else {
    const step = increment === 'small' ? 2.5 : 5;
    return Math.round(weight / step) * step;
  }
}

/**
 * Get common plate increments for the unit system
 */
export function getPlateIncrements(unitSystem: UnitSystem): number[] {
  if (unitSystem === 'metric') {
    return [1.25, 2.5, 5, 10, 15, 20, 25];
  }
  return [2.5, 5, 10, 25, 35, 45];
}

/**
 * Get weight increment buttons based on unit system
 */
export function getWeightIncrementButtons(unitSystem: UnitSystem): number[] {
  if (unitSystem === 'metric') {
    return [1.25, 2.5, 5, 10];
  }
  return [2.5, 5, 10, 25];
}

// ============================================
// LENGTH CONVERSIONS (Body measurements)
// ============================================

/**
 * Display length from DB (inches) in user's preferred unit
 */
export function displayLength(
  lengthInInches: number | null | undefined,
  unitSystem: UnitSystem,
  decimals: number = 1
): string {
  if (lengthInInches === null || lengthInInches === undefined) return '--';
  
  if (unitSystem === 'metric') {
    return (lengthInInches * INCHES_TO_CM).toFixed(decimals);
  }
  return lengthInInches.toFixed(decimals);
}

/**
 * Convert length for display (returns number)
 */
export function convertLengthForDisplay(
  lengthInInches: number,
  unitSystem: UnitSystem
): number {
  if (unitSystem === 'metric') {
    return lengthInInches * INCHES_TO_CM;
  }
  return lengthInInches;
}

/**
 * Convert user input to canonical (inches) for storage
 */
export function convertLengthToCanonical(
  length: number,
  unitSystem: UnitSystem
): number {
  if (unitSystem === 'metric') {
    // User entered cm, convert to inches for storage
    return length * CM_TO_INCHES;
  }
  // User entered inches, store as-is
  return length;
}

/**
 * Get length unit label
 */
export function getLengthLabel(unitSystem: UnitSystem): string {
  return unitSystem === 'metric' ? 'cm' : 'in';
}

/**
 * Format length with unit label
 */
export function formatLength(
  lengthInInches: number | null | undefined,
  unitSystem: UnitSystem,
  decimals: number = 1
): string {
  const value = displayLength(lengthInInches, unitSystem, decimals);
  return `${value} ${getLengthLabel(unitSystem)}`;
}

// ============================================
// HEIGHT CONVERSIONS (Special formatting)
// ============================================

/**
 * Display height - Imperial shows feet'inches", Metric shows cm
 */
export function displayHeight(
  heightInInches: number | null | undefined,
  unitSystem: UnitSystem
): string {
  if (heightInInches === null || heightInInches === undefined) return '--';
  
  if (unitSystem === 'metric') {
    const cm = heightInInches * INCHES_TO_CM;
    return `${cm.toFixed(0)} cm`;
  }
  
  // Imperial: show as feet'inches"
  const feet = Math.floor(heightInInches / 12);
  const inches = Math.round(heightInInches % 12);
  return `${feet}'${inches}"`;
}

/**
 * Convert height input to canonical (inches)
 * For imperial: pass feet and inches separately
 * For metric: pass cm value
 */
export function convertHeightToCanonical(
  value: number,
  unitSystem: UnitSystem,
  feet?: number
): number {
  if (unitSystem === 'metric') {
    // Input is cm, convert to inches
    return value * CM_TO_INCHES;
  }
  
  // Imperial: if feet provided, calculate total inches
  if (feet !== undefined) {
    return (feet * 12) + value;
  }
  
  // Already in total inches
  return value;
}

/**
 * Parse height from inches to feet/inches object (for imperial input)
 */
export function parseHeightToFeetInches(heightInInches: number): { feet: number; inches: number } {
  const feet = Math.floor(heightInInches / 12);
  const inches = Math.round(heightInInches % 12);
  return { feet, inches };
}
