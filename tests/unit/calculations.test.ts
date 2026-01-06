import { describe, it, expect } from 'vitest';
import {
  calculate1RM,
  calculate1RMBrzycki,
  calculateVolume,
  calculateMaxWeight,
  calculateMaxReps,
  calculateBest1RM,
  calculateAverageWeight,
  calculateAverageReps,
} from '@/lib/utils/calculations';

describe('Workout Calculations', () => {
  
  describe('calculate1RM (Epley)', () => {
    it('returns exact weight for 1 rep', () => {
      expect(calculate1RM(315, 1)).toBe(315);
      expect(calculate1RM(225, 1)).toBe(225);
    });

    it('calculates 1RM for multiple reps', () => {
      expect(calculate1RM(100, 10)).toBe(133);
      expect(calculate1RM(200, 5)).toBe(233);
      expect(calculate1RM(135, 8)).toBe(171);
    });

    it('caps at 10 reps', () => {
      expect(calculate1RM(100, 15)).toBe(100);
      expect(calculate1RM(100, 20)).toBe(100);
    });

    it('handles edge cases', () => {
      expect(calculate1RM(0, 10)).toBe(0);
      expect(calculate1RM(100, 0)).toBe(100);
    });
  });

  describe('calculate1RMBrzycki', () => {
    it('returns exact weight for 1 rep', () => {
      expect(calculate1RMBrzycki(315, 1)).toBe(315);
    });

    it('calculates using Brzycki formula', () => {
      expect(calculate1RMBrzycki(100, 10)).toBe(133);
      expect(calculate1RMBrzycki(200, 5)).toBe(225);
    });
  });

  describe('calculateVolume', () => {
    it('calculates total volume', () => {
      const sets = [
        { weight: 135, reps: 10 },
        { weight: 135, reps: 10 },
        { weight: 135, reps: 8 },
      ];
      expect(calculateVolume(sets)).toBe(3780);
    });

    it('handles empty array', () => {
      expect(calculateVolume([])).toBe(0);
    });

    it('handles null values', () => {
      const sets = [
        { weight: 135, reps: 10 },
        { weight: 0, reps: 10 },
        { weight: 135, reps: 0 },
      ];
      expect(calculateVolume(sets)).toBe(1350);
    });
  });

  describe('calculateMaxWeight', () => {
    it('finds max weight', () => {
      const sets = [
        { weight: 135 },
        { weight: 185 },
        { weight: 225 },
        { weight: 205 },
      ];
      expect(calculateMaxWeight(sets)).toBe(225);
    });

    it('handles empty array', () => {
      expect(calculateMaxWeight([])).toBe(0);
    });
  });

  describe('calculateMaxReps', () => {
    it('finds max reps', () => {
      const sets = [
        { reps: 10 },
        { reps: 8 },
        { reps: 12 },
        { reps: 9 },
      ];
      expect(calculateMaxReps(sets)).toBe(12);
    });

    it('handles empty array', () => {
      expect(calculateMaxReps([])).toBe(0);
    });
  });

  describe('calculateBest1RM', () => {
    it('finds best estimated 1RM', () => {
      const sets = [
        { weight: 100, reps: 10 },
        { weight: 120, reps: 5 },
        { weight: 95, reps: 8 },
      ];
      expect(calculateBest1RM(sets)).toBe(140);
    });

    it('handles empty array', () => {
      expect(calculateBest1RM([])).toBe(0);
    });
  });

  describe('calculateAverageWeight', () => {
    it('calculates average', () => {
      const sets = [
        { weight: 100 },
        { weight: 110 },
        { weight: 120 },
      ];
      expect(calculateAverageWeight(sets)).toBe(110);
    });

    it('rounds to nearest integer', () => {
      const sets = [
        { weight: 100 },
        { weight: 105 },
      ];
      expect(calculateAverageWeight(sets)).toBe(103);
    });
  });

  describe('calculateAverageReps', () => {
    it('calculates average', () => {
      const sets = [
        { reps: 10 },
        { reps: 8 },
        { reps: 9 },
      ];
      expect(calculateAverageReps(sets)).toBe(9);
    });
  });
});

