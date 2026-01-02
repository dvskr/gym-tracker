/**
 * Unit Conversion Utilities
 * All conversions are done for display purposes only.
 * Database values should always be stored in base units (lbs, cm).
 */

export const CONVERSION = {
  LBS_TO_KG: 0.453592,
  KG_TO_LBS: 2.20462,
  INCHES_TO_CM: 2.54,
  CM_TO_INCHES: 0.393701,
  MILES_TO_KM: 1.60934,
  KM_TO_MILES: 0.621371,
} as const;

// Weight conversions
export function convertWeight(
  value: number, 
  from: 'lbs' | 'kg', 
  to: 'lbs' | 'kg'
): number {
  if (from === to) return value;
  if (from === 'lbs' && to === 'kg') return value * CONVERSION.LBS_TO_KG;
  return value * CONVERSION.KG_TO_LBS;
}

export function lbsToKg(lbs: number): number {
  return lbs * CONVERSION.LBS_TO_KG;
}

export function kgToLbs(kg: number): number {
  return kg * CONVERSION.KG_TO_LBS;
}

// Length conversions
export function convertMeasurement(
  value: number,
  from: 'in' | 'cm',
  to: 'in' | 'cm'
): number {
  if (from === to) return value;
  if (from === 'in' && to === 'cm') return value * CONVERSION.INCHES_TO_CM;
  return value * CONVERSION.CM_TO_INCHES;
}

export function inchesToCm(inches: number): number {
  return inches * CONVERSION.INCHES_TO_CM;
}

export function cmToInches(cm: number): number {
  return cm * CONVERSION.CM_TO_INCHES;
}

export function feetAndInchesToCm(feet: number, inches: number): number {
  const totalInches = feet * 12 + inches;
  return inchesToCm(totalInches);
}

export function cmToFeetAndInches(cm: number): { feet: number; inches: number } {
  const totalInches = cmToInches(cm);
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

// Distance conversions
export function convertDistance(
  value: number,
  from: 'mi' | 'km',
  to: 'mi' | 'km'
): number {
  if (from === to) return value;
  if (from === 'mi' && to === 'km') return value * CONVERSION.MILES_TO_KM;
  return value * CONVERSION.KM_TO_MILES;
}

export function milesToKm(miles: number): number {
  return miles * CONVERSION.MILES_TO_KM;
}

export function kmToMiles(km: number): number {
  return km * CONVERSION.KM_TO_MILES;
}

// Formatting functions
export function formatWeight(value: number, unit: 'lbs' | 'kg', decimals: number = 1): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }
  return `${value.toFixed(decimals)} ${unit}`;
}

export function formatMeasurement(
  value: number,
  unit: 'in' | 'cm',
  decimals: number = 1
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }
  return `${value.toFixed(decimals)} ${unit}`;
}

export function formatHeight(value: number, unit: 'imperial' | 'metric'): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }

  if (unit === 'imperial') {
    const { feet, inches } = cmToFeetAndInches(value);
    return `${feet}' ${inches}"`;
  } else {
    return `${value.toFixed(0)} cm`;
  }
}

// Display conversions (from database units to user preference)
export function convertWeightForDisplay(
  valueInLbs: number | null,
  targetUnit: 'lbs' | 'kg'
): number | null {
  if (valueInLbs === null || valueInLbs === undefined) {
    return null;
  }
  return convertWeight(valueInLbs, 'lbs', targetUnit);
}

export function convertMeasurementForDisplay(
  valueInCm: number | null,
  targetUnit: 'in' | 'cm'
): number | null {
  if (valueInCm === null || valueInCm === undefined) {
    return null;
  }
  return convertMeasurement(valueInCm, 'cm', targetUnit);
}

// Input conversions (from user input to database units)
export function convertWeightToDatabase(
  value: number,
  sourceUnit: 'lbs' | 'kg'
): number {
  return convertWeight(value, sourceUnit, 'lbs');
}

export function convertMeasurementToDatabase(
  value: number,
  sourceUnit: 'in' | 'cm'
): number {
  return convertMeasurement(value, sourceUnit, 'cm');
}

// Helper to get weight unit label
export function getWeightUnitLabel(system: 'imperial' | 'metric'): 'lbs' | 'kg' {
  return system === 'imperial' ? 'lbs' : 'kg';
}

// Helper to get measurement unit label
export function getMeasurementUnitLabel(system: 'imperial' | 'metric'): 'in' | 'cm' {
  return system === 'imperial' ? 'in' : 'cm';
}

// Conversion preview
export function getConversionPreview(system: 'imperial' | 'metric'): string {
  if (system === 'imperial') {
    return '100 kg = 220.5 lbs\n180 cm = 5\' 11"';
  } else {
    return '150 lbs = 68 kg\n6\' 0" = 183 cm';
  }
}
