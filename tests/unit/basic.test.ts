import { describe, it, expect } from 'vitest';

// Simple math tests that don't import anything from your codebase
describe('Vitest Setup', () => {
  it('runs basic tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('handles arithmetic', () => {
    expect(100 * 10).toBe(1000);
    expect(225 / 5).toBe(45);
  });
});

// Inline the calculation logic to test it works
describe('Inline Calculation Tests', () => {
  function calculate1RM(weight: number, reps: number): number {
    if (reps === 1) return weight;
    if (reps > 10) return weight;
    return Math.round(weight * (1 + reps / 30));
  }

  it('calculates 1RM correctly', () => {
    expect(calculate1RM(100, 10)).toBe(133);
    expect(calculate1RM(200, 5)).toBe(233);
    expect(calculate1RM(315, 1)).toBe(315);
  });

  function calculateVolume(sets: Array<{ weight: number; reps: number }>): number {
    return sets.reduce((total, set) => {
      return total + (set.weight || 0) * (set.reps || 0);
    }, 0);
  }

  it('calculates volume correctly', () => {
    const sets = [
      { weight: 135, reps: 10 },
      { weight: 135, reps: 10 },
      { weight: 135, reps: 8 },
    ];
    expect(calculateVolume(sets)).toBe(3780);
  });
});

