import {
  convertWeight,
  lbsToKg,
  kgToLbs,
  convertMeasurement,
  inchesToCm,
  cmToInches,
  feetAndInchesToCm,
  cmToFeetAndInches,
  convertDistance,
  milesToKm,
  kmToMiles,
  formatWeight,
  formatMeasurement,
  formatHeight,
  convertWeightForDisplay,
  convertMeasurementForDisplay,
  convertWeightToDatabase,
  convertMeasurementToDatabase,
  getWeightUnitLabel,
  getMeasurementUnitLabel,
  CONVERSION,
} from '@/lib/utils/unitConversion';

describe('Weight Conversions', () => {
  describe('lbsToKg', () => {
    it('converts pounds to kilograms', () => {
      expect(lbsToKg(100)).toBeCloseTo(45.36, 1);
    });

    it('handles zero', () => {
      expect(lbsToKg(0)).toBe(0);
    });
  });

  describe('kgToLbs', () => {
    it('converts kilograms to pounds', () => {
      expect(kgToLbs(45.36)).toBeCloseTo(100, 0);
    });

    it('handles zero', () => {
      expect(kgToLbs(0)).toBe(0);
    });
  });

  describe('convertWeight', () => {
    it('returns same value when units match', () => {
      expect(convertWeight(100, 'lbs', 'lbs')).toBe(100);
      expect(convertWeight(50, 'kg', 'kg')).toBe(50);
    });

    it('converts lbs to kg', () => {
      expect(convertWeight(220, 'lbs', 'kg')).toBeCloseTo(99.79, 1);
    });

    it('converts kg to lbs', () => {
      expect(convertWeight(100, 'kg', 'lbs')).toBeCloseTo(220.46, 1);
    });
  });
});

describe('Length Conversions', () => {
  describe('inchesToCm', () => {
    it('converts inches to centimeters', () => {
      expect(inchesToCm(12)).toBeCloseTo(30.48, 1);
    });
  });

  describe('cmToInches', () => {
    it('converts centimeters to inches', () => {
      expect(cmToInches(30.48)).toBeCloseTo(12, 0);
    });
  });

  describe('convertMeasurement', () => {
    it('returns same value when units match', () => {
      expect(convertMeasurement(12, 'in', 'in')).toBe(12);
      expect(convertMeasurement(30, 'cm', 'cm')).toBe(30);
    });

    it('converts inches to cm', () => {
      expect(convertMeasurement(10, 'in', 'cm')).toBeCloseTo(25.4, 1);
    });

    it('converts cm to inches', () => {
      expect(convertMeasurement(25.4, 'cm', 'in')).toBeCloseTo(10, 0);
    });
  });

  describe('feetAndInchesToCm', () => {
    it('converts feet and inches to cm', () => {
      // 6 feet = 182.88 cm
      expect(feetAndInchesToCm(6, 0)).toBeCloseTo(182.88, 1);
    });

    it('handles feet with additional inches', () => {
      // 5'10" = 177.8 cm
      expect(feetAndInchesToCm(5, 10)).toBeCloseTo(177.8, 1);
    });
  });

  describe('cmToFeetAndInches', () => {
    it('converts cm to feet and inches', () => {
      const result = cmToFeetAndInches(183);
      expect(result.feet).toBe(6);
      expect(result.inches).toBe(0);
    });

    it('handles fractional heights', () => {
      const result = cmToFeetAndInches(175);
      expect(result.feet).toBe(5);
      expect(result.inches).toBeCloseTo(9, 0);
    });
  });
});

describe('Distance Conversions', () => {
  describe('milesToKm', () => {
    it('converts miles to kilometers', () => {
      expect(milesToKm(1)).toBeCloseTo(1.609, 2);
    });
  });

  describe('kmToMiles', () => {
    it('converts kilometers to miles', () => {
      expect(kmToMiles(1.609)).toBeCloseTo(1, 1);
    });
  });

  describe('convertDistance', () => {
    it('returns same value when units match', () => {
      expect(convertDistance(5, 'mi', 'mi')).toBe(5);
      expect(convertDistance(8, 'km', 'km')).toBe(8);
    });

    it('converts miles to km', () => {
      expect(convertDistance(5, 'mi', 'km')).toBeCloseTo(8.05, 1);
    });

    it('converts km to miles', () => {
      expect(convertDistance(10, 'km', 'mi')).toBeCloseTo(6.21, 1);
    });
  });
});

describe('Formatting Functions', () => {
  describe('formatWeight', () => {
    it('formats weight with unit', () => {
      expect(formatWeight(100, 'lbs')).toBe('100.0 lbs');
      expect(formatWeight(45.5, 'kg')).toBe('45.5 kg');
    });

    it('respects decimals parameter', () => {
      expect(formatWeight(100.123, 'lbs', 2)).toBe('100.12 lbs');
      expect(formatWeight(100, 'kg', 0)).toBe('100 kg');
    });

    it('handles null/undefined/NaN', () => {
      expect(formatWeight(null as any, 'lbs')).toBe('—');
      expect(formatWeight(undefined as any, 'kg')).toBe('—');
      expect(formatWeight(NaN, 'lbs')).toBe('—');
    });
  });

  describe('formatMeasurement', () => {
    it('formats measurement with unit', () => {
      expect(formatMeasurement(12, 'in')).toBe('12.0 in');
      expect(formatMeasurement(30.5, 'cm')).toBe('30.5 cm');
    });

    it('handles invalid values', () => {
      expect(formatMeasurement(null as any, 'in')).toBe('—');
    });
  });

  describe('formatHeight', () => {
    it('formats height in imperial (feet/inches)', () => {
      expect(formatHeight(183, 'imperial')).toBe("6' 0\"");
    });

    it('formats height in metric (cm)', () => {
      expect(formatHeight(183, 'metric')).toBe('183 cm');
    });

    it('handles invalid values', () => {
      expect(formatHeight(null as any, 'imperial')).toBe('—');
    });
  });
});

describe('Display/Database Conversions', () => {
  describe('convertWeightForDisplay', () => {
    it('converts from database (lbs) to display unit', () => {
      expect(convertWeightForDisplay(220, 'kg')).toBeCloseTo(99.79, 1);
      expect(convertWeightForDisplay(220, 'lbs')).toBe(220);
    });

    it('handles null values', () => {
      expect(convertWeightForDisplay(null, 'kg')).toBeNull();
    });
  });

  describe('convertMeasurementForDisplay', () => {
    it('converts from database (cm) to display unit', () => {
      expect(convertMeasurementForDisplay(100, 'in')).toBeCloseTo(39.37, 1);
      expect(convertMeasurementForDisplay(100, 'cm')).toBe(100);
    });

    it('handles null values', () => {
      expect(convertMeasurementForDisplay(null, 'in')).toBeNull();
    });
  });

  describe('convertWeightToDatabase', () => {
    it('converts from user unit to database (lbs)', () => {
      expect(convertWeightToDatabase(100, 'kg')).toBeCloseTo(220.46, 1);
      expect(convertWeightToDatabase(100, 'lbs')).toBe(100);
    });
  });

  describe('convertMeasurementToDatabase', () => {
    it('converts from user unit to database (cm)', () => {
      expect(convertMeasurementToDatabase(12, 'in')).toBeCloseTo(30.48, 1);
      expect(convertMeasurementToDatabase(100, 'cm')).toBe(100);
    });
  });
});

describe('Helper Functions', () => {
  describe('getWeightUnitLabel', () => {
    it('returns correct label for system', () => {
      expect(getWeightUnitLabel('imperial')).toBe('lbs');
      expect(getWeightUnitLabel('metric')).toBe('kg');
    });
  });

  describe('getMeasurementUnitLabel', () => {
    it('returns correct label for system', () => {
      expect(getMeasurementUnitLabel('imperial')).toBe('in');
      expect(getMeasurementUnitLabel('metric')).toBe('cm');
    });
  });
});

describe('Conversion Constants', () => {
  it('has correct conversion factors', () => {
    expect(CONVERSION.LBS_TO_KG).toBeCloseTo(0.4536, 3);
    expect(CONVERSION.KG_TO_LBS).toBeCloseTo(2.2046, 3);
    expect(CONVERSION.INCHES_TO_CM).toBe(2.54);
    expect(CONVERSION.CM_TO_INCHES).toBeCloseTo(0.3937, 3);
  });
});

