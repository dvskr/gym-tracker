/**
 * PR Detection Tests
 * Tests for Personal Record detection logic
 */

import { checkForPR, PRCheck } from '@/lib/utils/prDetection';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('prDetection', () => {
  const mockUserId = 'user-123';
  const mockExerciseId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID
  const mockExerciseName = 'Bench Press';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockPersonalRecords(records: unknown[], error: Error | null = null) {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({ data: records, error }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockChain);
    return mockChain;
  }

  describe('checkForPR', () => {
    describe('Max Weight PR', () => {
      it('detects new max weight PR when no previous records', async () => {
        mockPersonalRecords([]);

        const result = await checkForPR(mockUserId, mockExerciseId, 225, 5, mockExerciseName);

        expect(result.length).toBeGreaterThan(0);
        const maxWeightPR = result.find(r => r.prType === 'max_weight');
        expect(maxWeightPR).toBeDefined();
        expect(maxWeightPR?.newRecord).toBe(225);
        expect(maxWeightPR?.previousRecord).toBeNull();
      });

      it('detects max weight PR when weight exceeds previous', async () => {
        mockPersonalRecords([
          {
            record_type: 'max_weight',
            value: 135,
          },
        ]);

        const result = await checkForPR(mockUserId, mockExerciseId, 225, 5, mockExerciseName);

        const maxWeightPR = result.find(r => r.prType === 'max_weight');
        expect(maxWeightPR).toBeDefined();
        expect(maxWeightPR?.previousRecord).toBe(135);
        expect(maxWeightPR?.newRecord).toBe(225);
      });

      it('does not detect max weight PR when weight is equal', async () => {
        mockPersonalRecords([
          {
            record_type: 'max_weight',
            value: 225,
          },
        ]);

        const result = await checkForPR(mockUserId, mockExerciseId, 225, 6, mockExerciseName);

        const maxWeightPR = result.find(r => r.prType === 'max_weight');
        expect(maxWeightPR).toBeUndefined();
      });

      it('does not detect max weight PR when weight is lower', async () => {
        mockPersonalRecords([
          {
            record_type: 'max_weight',
            value: 225,
          },
        ]);

        const result = await checkForPR(mockUserId, mockExerciseId, 200, 8, mockExerciseName);

        const maxWeightPR = result.find(r => r.prType === 'max_weight');
        expect(maxWeightPR).toBeUndefined();
      });
    });

    describe('Max Reps PR', () => {
      it('detects max reps PR when reps exceed previous', async () => {
        mockPersonalRecords([
          {
            record_type: 'max_reps',
            value: 10,
          },
        ]);

        const result = await checkForPR(mockUserId, mockExerciseId, 135, 15, mockExerciseName);

        const maxRepsPR = result.find(r => r.prType === 'max_reps');
        expect(maxRepsPR).toBeDefined();
        expect(maxRepsPR?.previousRecord).toBe(10);
        expect(maxRepsPR?.newRecord).toBe(15);
      });

      it('detects max reps PR when no previous record', async () => {
        mockPersonalRecords([]);

        const result = await checkForPR(mockUserId, mockExerciseId, 100, 20, mockExerciseName);

        const maxRepsPR = result.find(r => r.prType === 'max_reps');
        expect(maxRepsPR).toBeDefined();
        expect(maxRepsPR?.previousRecord).toBeNull();
        expect(maxRepsPR?.newRecord).toBe(20);
      });

      it('does not detect max reps PR when reps are lower', async () => {
        mockPersonalRecords([
          {
            record_type: 'max_reps',
            value: 20,
          },
        ]);

        const result = await checkForPR(mockUserId, mockExerciseId, 135, 15, mockExerciseName);

        const maxRepsPR = result.find(r => r.prType === 'max_reps');
        expect(maxRepsPR).toBeUndefined();
      });
    });

    describe('Max Volume PR', () => {
      it('detects max volume PR when weight × reps exceeds previous', async () => {
        mockPersonalRecords([
          {
            record_type: 'max_volume',
            value: 1350, // 135 × 10
          },
        ]);

        const result = await checkForPR(mockUserId, mockExerciseId, 155, 10, mockExerciseName); // 1550

        const maxVolumePR = result.find(r => r.prType === 'max_volume');
        expect(maxVolumePR).toBeDefined();
        expect(maxVolumePR?.previousRecord).toBe(1350);
        expect(maxVolumePR?.newRecord).toBe(1550);
      });

      it('detects max volume PR with lower weight but higher reps', async () => {
        mockPersonalRecords([
          {
            record_type: 'max_volume',
            value: 1000, // 200 × 5
          },
        ]);

        const result = await checkForPR(mockUserId, mockExerciseId, 135, 10, mockExerciseName); // 1350

        const maxVolumePR = result.find(r => r.prType === 'max_volume');
        expect(maxVolumePR).toBeDefined();
        expect(maxVolumePR?.previousRecord).toBe(1000);
        expect(maxVolumePR?.newRecord).toBe(1350);
      });

      it('does not detect volume PR when volume is equal', async () => {
        mockPersonalRecords([
          {
            record_type: 'max_volume',
            value: 1350,
          },
        ]);

        const result = await checkForPR(mockUserId, mockExerciseId, 150, 9, mockExerciseName); // 1350

        const maxVolumePR = result.find(r => r.prType === 'max_volume');
        expect(maxVolumePR).toBeUndefined();
      });

      it('does not detect volume PR when volume is lower', async () => {
        mockPersonalRecords([
          {
            record_type: 'max_volume',
            value: 2000,
          },
        ]);

        const result = await checkForPR(mockUserId, mockExerciseId, 135, 10, mockExerciseName); // 1350

        const maxVolumePR = result.find(r => r.prType === 'max_volume');
        expect(maxVolumePR).toBeUndefined();
      });
    });

    describe('Multiple PRs', () => {
      it('detects all three PR types when all are achieved', async () => {
        mockPersonalRecords([
          {
            record_type: 'max_weight',
            value: 135,
          },
          {
            record_type: 'max_reps',
            value: 10,
          },
          {
            record_type: 'max_volume',
            value: 1350,
          },
        ]);

        const result = await checkForPR(mockUserId, mockExerciseId, 225, 15, mockExerciseName);

        expect(result.length).toBe(3);
        expect(result.some(r => r.prType === 'max_weight')).toBe(true);
        expect(result.some(r => r.prType === 'max_reps')).toBe(true);
        expect(result.some(r => r.prType === 'max_volume')).toBe(true);
      });

      it('detects only applicable PRs', async () => {
        mockPersonalRecords([
          {
            record_type: 'max_weight',
            value: 225,
          },
          {
            record_type: 'max_reps',
            value: 5,
          },
          {
            record_type: 'max_volume',
            value: 1125, // 225 × 5
          },
        ]);

        const result = await checkForPR(mockUserId, mockExerciseId, 225, 8, mockExerciseName); // 1800 volume

        // Should detect reps and volume PR, but not weight
        expect(result.some(r => r.prType === 'max_weight')).toBe(false);
        expect(result.some(r => r.prType === 'max_reps')).toBe(true);
        expect(result.some(r => r.prType === 'max_volume')).toBe(true);
      });

      it('detects only weight and volume when reps are lower', async () => {
        mockPersonalRecords([
          {
            record_type: 'max_weight',
            value: 135,
          },
          {
            record_type: 'max_reps',
            value: 15,
          },
          {
            record_type: 'max_volume',
            value: 1350,
          },
        ]);

        const result = await checkForPR(mockUserId, mockExerciseId, 225, 8, mockExerciseName); // 1800 volume

        expect(result.some(r => r.prType === 'max_weight')).toBe(true);
        expect(result.some(r => r.prType === 'max_reps')).toBe(false);
        expect(result.some(r => r.prType === 'max_volume')).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      it('handles database errors gracefully', async () => {
        mockPersonalRecords([], { message: 'Database error', code: '500' });

        const result = await checkForPR(mockUserId, mockExerciseId, 225, 5, mockExerciseName);

        expect(result).toEqual([]);
      });

      it('handles zero weight', async () => {
        mockPersonalRecords([]);

        const result = await checkForPR(mockUserId, mockExerciseId, 0, 10, mockExerciseName);

        // Should not detect PRs with zero weight
        expect(result).toHaveLength(0);
      });

      it('handles zero reps', async () => {
        mockPersonalRecords([]);

        const result = await checkForPR(mockUserId, mockExerciseId, 135, 0, mockExerciseName);

        // Should not detect PRs with zero reps
        expect(result).toHaveLength(0);
      });

      it('handles negative weight', async () => {
        mockPersonalRecords([]);

        const result = await checkForPR(mockUserId, mockExerciseId, -100, 10, mockExerciseName);

        expect(result).toHaveLength(0);
      });

      it('handles negative reps', async () => {
        mockPersonalRecords([]);

        const result = await checkForPR(mockUserId, mockExerciseId, 135, -10, mockExerciseName);

        expect(result).toHaveLength(0);
      });

      it('handles very large values', async () => {
        mockPersonalRecords([
          {
            record_type: 'max_weight',
            value: 999,
          },
        ]);

        const result = await checkForPR(mockUserId, mockExerciseId, 1000, 50, mockExerciseName);

        expect(result.some(r => r.prType === 'max_weight')).toBe(true);
      });

      it('returns correct PR details', async () => {
        mockPersonalRecords([
          {
            record_type: 'max_weight',
            value: 135,
          },
        ]);

        const result = await checkForPR(mockUserId, mockExerciseId, 225, 5, mockExerciseName);

        const pr = result[0];
        expect(pr.exerciseName).toBe(mockExerciseName);
        expect(pr.exerciseId).toBe(mockExerciseId);
        expect(pr.prType).toBeDefined();
        expect(pr.isNewPR).toBe(true);
      });

      it('rejects invalid exercise ID format', async () => {
        mockPersonalRecords([]);

        const result = await checkForPR(mockUserId, 'invalid-id', 225, 5, mockExerciseName);

        // Should return empty array for invalid UUID
        expect(result).toEqual([]);
      });

      it('handles null weight', async () => {
        mockPersonalRecords([]);

        const result = await checkForPR(mockUserId, mockExerciseId, null as any, 10, mockExerciseName);

        expect(result).toHaveLength(0);
      });

      it('handles null reps', async () => {
        mockPersonalRecords([]);

        const result = await checkForPR(mockUserId, mockExerciseId, 135, null as any, mockExerciseName);

        expect(result).toHaveLength(0);
      });
    });

    describe('PR Data Structure', () => {
      it('includes all required fields in PRCheck result', async () => {
        mockPersonalRecords([
          {
            record_type: 'max_weight',
            value: 135,
          },
        ]);

        const result = await checkForPR(mockUserId, mockExerciseId, 225, 5, mockExerciseName);

        const pr = result[0];
        expect(pr).toHaveProperty('isNewPR');
        expect(pr).toHaveProperty('prType');
        expect(pr).toHaveProperty('previousRecord');
        expect(pr).toHaveProperty('newRecord');
        expect(pr).toHaveProperty('exerciseId');
        expect(pr).toHaveProperty('exerciseName');
      });

      it('sets isNewPR to true for all detected PRs', async () => {
        mockPersonalRecords([]);

        const result = await checkForPR(mockUserId, mockExerciseId, 225, 5, mockExerciseName);

        expect(result.every(pr => pr.isNewPR === true)).toBe(true);
      });

      it('includes exercise name when provided', async () => {
        mockPersonalRecords([]);

        const result = await checkForPR(mockUserId, mockExerciseId, 225, 5, 'Custom Exercise');

        expect(result[0].exerciseName).toBe('Custom Exercise');
      });

      it('handles missing exercise name', async () => {
        mockPersonalRecords([]);

        const result = await checkForPR(mockUserId, mockExerciseId, 225, 5);

        expect(result[0].exerciseName).toBeUndefined();
      });
    });
  });
});
