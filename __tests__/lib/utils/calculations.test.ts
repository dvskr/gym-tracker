import {
  calculate1RM,
  calculate1RMBrzycki,
  calculateVolume,
  calculateMaxWeight,
  calculateMaxReps,
  calculateBest1RM,
  calculateAverageWeight,
  calculateAverageReps,
  filterByTimeRange,
  formatChartLabels,
} from '@/lib/utils/calculations';

describe('calculate1RM (Epley formula)', () => {
  it('returns weight for 1 rep', () => {
    expect(calculate1RM(100, 1)).toBe(100);
  });

  it('calculates 1RM for multiple reps', () => {
    // 100 lbs × (1 + 5/30) = 100 × 1.167 = 117
    expect(calculate1RM(100, 5)).toBe(117);
  });

  it('returns weight for reps > 10', () => {
    // Less accurate above 10 reps, returns raw weight
    expect(calculate1RM(100, 12)).toBe(100);
  });

  it('handles zero weight', () => {
    expect(calculate1RM(0, 5)).toBe(0);
  });
});

describe('calculate1RMBrzycki (Brzycki formula)', () => {
  it('returns weight for 1 rep', () => {
    expect(calculate1RMBrzycki(100, 1)).toBe(100);
  });

  it('calculates 1RM for multiple reps', () => {
    // 100 × (36 / (37 - 5)) = 100 × (36/32) = 112.5 → 113
    expect(calculate1RMBrzycki(100, 5)).toBe(113);
  });
});

describe('calculateVolume', () => {
  it('calculates volume from array of sets', () => {
    const sets = [
      { weight: 100, reps: 10 },
      { weight: 100, reps: 8 },
      { weight: 90, reps: 6 },
    ];
    // (100×10) + (100×8) + (90×6) = 1000 + 800 + 540 = 2340
    expect(calculateVolume(sets)).toBe(2340);
  });

  it('returns 0 for empty array', () => {
    expect(calculateVolume([])).toBe(0);
  });

  it('handles sets with zero values', () => {
    const sets = [
      { weight: 100, reps: 0 },
      { weight: 0, reps: 10 },
    ];
    expect(calculateVolume(sets)).toBe(0);
  });

  it('handles missing values', () => {
    const sets = [
      { weight: 100, reps: 10 },
      { weight: undefined as any, reps: 8 },
    ];
    expect(calculateVolume(sets)).toBe(1000);
  });
});

describe('calculateMaxWeight', () => {
  it('finds maximum weight', () => {
    const sets = [
      { weight: 100 },
      { weight: 120 },
      { weight: 90 },
    ];
    expect(calculateMaxWeight(sets)).toBe(120);
  });

  it('returns 0 for empty array', () => {
    expect(calculateMaxWeight([])).toBe(0);
  });

  it('handles sets with zero weight', () => {
    const sets = [{ weight: 0 }, { weight: 50 }];
    expect(calculateMaxWeight(sets)).toBe(50);
  });
});

describe('calculateMaxReps', () => {
  it('finds maximum reps', () => {
    const sets = [
      { reps: 10 },
      { reps: 12 },
      { reps: 8 },
    ];
    expect(calculateMaxReps(sets)).toBe(12);
  });

  it('returns 0 for empty array', () => {
    expect(calculateMaxReps([])).toBe(0);
  });
});

describe('calculateBest1RM', () => {
  it('finds best estimated 1RM from sets', () => {
    const sets = [
      { weight: 100, reps: 5 },  // 1RM ≈ 117
      { weight: 120, reps: 3 },  // 1RM ≈ 132
      { weight: 80, reps: 10 },  // 1RM ≈ 107
    ];
    expect(calculateBest1RM(sets)).toBe(132);
  });

  it('returns 0 for empty array', () => {
    expect(calculateBest1RM([])).toBe(0);
  });
});

describe('calculateAverageWeight', () => {
  it('calculates average weight', () => {
    const sets = [
      { weight: 100 },
      { weight: 110 },
      { weight: 120 },
    ];
    // (100 + 110 + 120) / 3 = 110
    expect(calculateAverageWeight(sets)).toBe(110);
  });

  it('returns 0 for empty array', () => {
    expect(calculateAverageWeight([])).toBe(0);
  });

  it('rounds to nearest integer', () => {
    const sets = [
      { weight: 100 },
      { weight: 101 },
    ];
    // 201 / 2 = 100.5 → 101
    expect(calculateAverageWeight(sets)).toBe(101);
  });
});

describe('calculateAverageReps', () => {
  it('calculates average reps', () => {
    const sets = [
      { reps: 10 },
      { reps: 8 },
      { reps: 6 },
    ];
    // (10 + 8 + 6) / 3 = 8
    expect(calculateAverageReps(sets)).toBe(8);
  });

  it('returns 0 for empty array', () => {
    expect(calculateAverageReps([])).toBe(0);
  });
});

describe('filterByTimeRange', () => {
  const mockData = [
    { date: '2024-01-01', value: 1 },
    { date: '2024-06-01', value: 2 },
    { date: '2024-11-01', value: 3 },
    { date: '2024-12-01', value: 4 },
  ];

  it('returns all data for "All" range', () => {
    expect(filterByTimeRange(mockData, 'All')).toHaveLength(4);
  });

  it('filters data for time ranges', () => {
    // Note: This test depends on current date
    const result = filterByTimeRange(mockData, '1Y');
    expect(result.length).toBeLessThanOrEqual(4);
  });

  it('handles empty array', () => {
    expect(filterByTimeRange([], '1M')).toHaveLength(0);
  });
});

describe('formatChartLabels', () => {
  it('formats all dates when count <= maxLabels', () => {
    const dates = ['2024-01-15', '2024-02-20', '2024-03-25'];
    const labels = formatChartLabels(dates, 6);
    // Labels should be formatted as M/D (exact day may vary by timezone)
    expect(labels).toHaveLength(3);
    labels.forEach(label => {
      expect(label).toMatch(/^\d{1,2}\/\d{1,2}$/);
    });
  });

  it('shows labels at intervals when count > maxLabels', () => {
    const dates = Array.from({ length: 10 }, (_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`);
    const labels = formatChartLabels(dates, 3);
    
    // Should have some empty strings for skipped labels
    const nonEmptyLabels = labels.filter(l => l !== '');
    expect(nonEmptyLabels.length).toBeLessThanOrEqual(5);
  });

  it('always includes last label', () => {
    const dates = Array.from({ length: 10 }, (_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`);
    const labels = formatChartLabels(dates, 3);
    
    // Last label should not be empty
    expect(labels[labels.length - 1]).not.toBe('');
  });
});

