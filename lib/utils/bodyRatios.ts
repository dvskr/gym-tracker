// Body ratio calculations and interpretations

// ============================================
// Types
// ============================================

export type Gender = 'male' | 'female';
export type RatioType = 'waist_to_hip' | 'chest_to_waist' | 'shoulder_to_waist';

export interface RatioResult {
  value: number;
  interpretation: 'excellent' | 'good' | 'average' | 'below_average';
  message: string;
  color: string;
}

export interface HealthyRange {
  min: number;
  max: number;
  optimal: number;
}

export interface BodyComposition {
  totalWeight: number;
  bodyFatPercent: number;
  fatMass: number;
  leanMass: number;
  estimatedMuscleMass: number;
}

// ============================================
// Ratio Calculations
// ============================================

/**
 * Calculate waist-to-hip ratio
 * Lower is generally healthier (indicates less abdominal fat)
 */
export function calculateWaistToHip(waist: number, hips: number): number {
  if (hips === 0) return 0;
  return Math.round((waist / hips) * 100) / 100;
}

/**
 * Interpret waist-to-hip ratio for health risk
 * Men: < 0.90 healthy, > 1.0 high risk
 * Women: < 0.80 healthy, > 0.85 high risk
 */
export function interpretWaistToHip(
  ratio: number,
  gender: 'male' | 'female'
): 'low' | 'moderate' | 'high' {
  if (gender === 'male') {
    if (ratio < 0.90) return 'low';
    if (ratio < 1.0) return 'moderate';
    return 'high';
  } else {
    if (ratio < 0.80) return 'low';
    if (ratio < 0.85) return 'moderate';
    return 'high';
  }
}

/**
 * Calculate chest-to-waist ratio
 * Higher indicates more V-taper (desirable for aesthetics)
 */
export function calculateChestToWaist(chest: number, waist: number): number {
  if (waist === 0) return 0;
  return Math.round((chest / waist) * 100) / 100;
}

/**
 * Calculate shoulder-to-waist ratio
 * Higher indicates broader shoulders relative to waist (V-taper)
 */
export function calculateShoulderToWaist(shoulders: number, waist: number): number {
  if (waist === 0) return 0;
  return Math.round((shoulders / waist) * 100) / 100;
}

// ============================================
// Healthy Ranges
// ============================================

/**
 * Get healthy range for a ratio type
 */
export function getHealthyRange(ratioType: RatioType, gender: Gender): HealthyRange {
  switch (ratioType) {
    case 'waist_to_hip':
      // Lower is better for health
      return gender === 'male'
        ? { min: 0.85, max: 0.95, optimal: 0.90 }
        : { min: 0.75, max: 0.85, optimal: 0.80 };

    case 'chest_to_waist':
      // Higher is better for aesthetics
      return gender === 'male'
        ? { min: 1.2, max: 1.5, optimal: 1.35 }
        : { min: 1.15, max: 1.4, optimal: 1.25 };

    case 'shoulder_to_waist':
      // Higher is better for V-taper
      return gender === 'male'
        ? { min: 1.4, max: 1.7, optimal: 1.618 } // Golden ratio!
        : { min: 1.3, max: 1.5, optimal: 1.4 };

    default:
      return { min: 0, max: 1, optimal: 0.5 };
  }
}

/**
 * Interpret a ratio value
 */
export function interpretRatio(
  value: number,
  ratioType: RatioType,
  gender: Gender
): RatioResult {
  const range = getHealthyRange(ratioType, gender);

  // For waist-to-hip, lower is better
  if (ratioType === 'waist_to_hip') {
    if (value <= range.optimal) {
      return {
        value,
        interpretation: 'excellent',
        message: 'Excellent - Low health risk',
        color: '#22c55e',
      };
    } else if (value <= range.max) {
      return {
        value,
        interpretation: 'good',
        message: 'Good - Moderate health risk',
        color: '#84cc16',
      };
    } else if (value <= range.max + 0.1) {
      return {
        value,
        interpretation: 'average',
        message: 'Above average - Consider reducing',
        color: '#f59e0b',
      };
    } else {
      return {
        value,
        interpretation: 'below_average',
        message: 'High - Health risk elevated',
        color: '#ef4444',
      };
    }
  }

  // For chest-to-waist and shoulder-to-waist, higher is better
  if (value >= range.optimal) {
    return {
      value,
      interpretation: 'excellent',
      message: ratioType === 'shoulder_to_waist'
        ? 'Excellent V-taper!'
        : 'Excellent proportions!',
      color: '#22c55e',
    };
  } else if (value >= range.min) {
    return {
      value,
      interpretation: 'good',
      message: 'Good proportions',
      color: '#84cc16',
    };
  } else if (value >= range.min - 0.1) {
    return {
      value,
      interpretation: 'average',
      message: 'Room for improvement',
      color: '#f59e0b',
    };
  } else {
    return {
      value,
      interpretation: 'below_average',
      message: 'Below target range',
      color: '#ef4444',
    };
  }
}

// ============================================
// Body Composition
// ============================================

/**
 * Calculate body composition from weight and body fat percentage
 */
export function calculateBodyComposition(
  totalWeight: number,
  bodyFatPercent: number
): BodyComposition {
  const fatMass = (totalWeight * bodyFatPercent) / 100;
  const leanMass = totalWeight - fatMass;
  
  // Estimate muscle mass (roughly 40-50% of lean mass for average person)
  // This is a rough estimate - actual requires DEXA scan
  const estimatedMuscleMass = leanMass * 0.45;

  return {
    totalWeight: Math.round(totalWeight * 10) / 10,
    bodyFatPercent: Math.round(bodyFatPercent * 10) / 10,
    fatMass: Math.round(fatMass * 10) / 10,
    leanMass: Math.round(leanMass * 10) / 10,
    estimatedMuscleMass: Math.round(estimatedMuscleMass * 10) / 10,
  };
}

/**
 * Get body fat category
 */
export function getBodyFatCategory(
  bodyFatPercent: number,
  gender: Gender
): { category: string; color: string } {
  const ranges = gender === 'male'
    ? [
        { max: 6, category: 'Essential', color: '#ef4444' },
        { max: 13, category: 'Athletic', color: '#22c55e' },
        { max: 17, category: 'Fitness', color: '#84cc16' },
        { max: 24, category: 'Average', color: '#f59e0b' },
        { max: 100, category: 'Above Average', color: '#ef4444' },
      ]
    : [
        { max: 14, category: 'Essential', color: '#ef4444' },
        { max: 20, category: 'Athletic', color: '#22c55e' },
        { max: 24, category: 'Fitness', color: '#84cc16' },
        { max: 31, category: 'Average', color: '#f59e0b' },
        { max: 100, category: 'Above Average', color: '#ef4444' },
      ];

  for (const range of ranges) {
    if (bodyFatPercent <= range.max) {
      return { category: range.category, color: range.color };
    }
  }

  return { category: 'Unknown', color: '#64748b' };
}

// ============================================
// Chart Colors
// ============================================

export const MEASUREMENT_COLORS: Record<string, string> = {
  chest: '#3b82f6',      // Blue
  shoulders: '#06b6d4',  // Cyan
  waist: '#f59e0b',      // Amber
  hips: '#8b5cf6',       // Purple
  bicep_left: '#22c55e', // Green
  bicep_right: '#22c55e',
  forearm_left: '#10b981', // Emerald
  forearm_right: '#10b981',
  thigh_left: '#ef4444', // Red
  thigh_right: '#ef4444',
  calf_left: '#f97316',  // Orange
  calf_right: '#f97316',
  neck: '#6366f1',       // Indigo
  body_fat_percentage: '#ec4899', // Pink
};

/**
 * Get color for a measurement type
 */
export function getMeasurementColor(measurementKey: string): string {
  return MEASUREMENT_COLORS[measurementKey] || '#64748b';
}

// ============================================
// Ratio Display Names
// ============================================

export const RATIO_LABELS: Record<RatioType, string> = {
  waist_to_hip: 'Waist-to-Hip',
  chest_to_waist: 'Chest-to-Waist',
  shoulder_to_waist: 'Shoulder-to-Waist',
};

/**
 * Get all calculable ratios from measurements
 */
export function calculateAllRatios(
  measurements: {
    waist?: number;
    hips?: number;
    chest?: number;
    shoulders?: number;
  },
  gender: Gender = 'male'
): Array<{ type: RatioType; label: string; result: RatioResult | null }> {
  const ratios: Array<{ type: RatioType; label: string; result: RatioResult | null }> = [];

  if (measurements.waist && measurements.hips) {
    const value = calculateWaistToHip(measurements.waist, measurements.hips);
    ratios.push({
      type: 'waist_to_hip',
      label: RATIO_LABELS.waist_to_hip,
      result: interpretRatio(value, 'waist_to_hip', gender),
    });
  }

  if (measurements.chest && measurements.waist) {
    const value = calculateChestToWaist(measurements.chest, measurements.waist);
    ratios.push({
      type: 'chest_to_waist',
      label: RATIO_LABELS.chest_to_waist,
      result: interpretRatio(value, 'chest_to_waist', gender),
    });
  }

  if (measurements.shoulders && measurements.waist) {
    const value = calculateShoulderToWaist(measurements.shoulders, measurements.waist);
    ratios.push({
      type: 'shoulder_to_waist',
      label: RATIO_LABELS.shoulder_to_waist,
      result: interpretRatio(value, 'shoulder_to_waist', gender),
    });
  }

  return ratios;
}

