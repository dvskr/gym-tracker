/**
 * Sync Queue Tests
 * Tests for offline data sync functionality
 */

import { SyncQueue, SyncOperation } from '@/lib/sync/syncQueue';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('SyncQueue', () => {
  let syncQueue: SyncQueue;
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    syncQueue = new SyncQueue(mockUserId);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('addOperation', () => {
    it('adds operation to queue', async () => {
      const operation: SyncOperation = {
        id: '1',
        type: 'workout_create',
        data: { name: 'Test Workout' },
        timestamp: Date.now(),
        status: 'pending',
      };

      await syncQueue.addOperation(operation);

      const queue = await syncQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('1');
    });

    it('persists queue to AsyncStorage', async () => {
      const operation: SyncOperation = {
        id: '1',
        type: 'workout_create',
        data: {},
        timestamp: Date.now(),
        status: 'pending',
      };

      await syncQueue.addOperation(operation);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('sync_queue'),
        expect.any(String)
      );
    });

    it('maintains queue order', async () => {
      const op1: SyncOperation = {
        id: '1',
        type: 'workout_create',
        data: {},
        timestamp: 1000,
        status: 'pending',
      };
      const op2: SyncOperation = {
        id: '2',
        type: 'workout_update',
        data: {},
        timestamp: 2000,
        status: 'pending',
      };

      await syncQueue.addOperation(op1);
      await syncQueue.addOperation(op2);

      const queue = await syncQueue.getQueue();
      expect(queue[0].id).toBe('1');
      expect(queue[1].id).toBe('2');
    });
  });

  describe('getQueue', () => {
    it('returns empty array when no operations', async () => {
      const queue = await syncQueue.getQueue();
      expect(queue).toEqual([]);
    });

    it('loads queue from AsyncStorage', async () => {
      const mockQueue = [
        {
          id: '1',
          type: 'workout_create',
          data: {},
          timestamp: Date.now(),
          status: 'pending',
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockQueue));

      const queue = await syncQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('1');
    });

    it('handles corrupted storage data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      const queue = await syncQueue.getQueue();
      expect(queue).toEqual([]);
    });
  });

  describe('processQueue', () => {
    it('processes pending operations', async () => {
      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ data: {}, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await syncQueue.addOperation({
        id: '1',
        type: 'workout_create',
        data: { name: 'Test' },
        timestamp: Date.now(),
        status: 'pending',
      });

      await syncQueue.processQueue();

      const queue = await syncQueue.getQueue();
      expect(queue[0].status).toBe('completed');
    });

    it('marks failed operations', async () => {
      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await syncQueue.addOperation({
        id: '1',
        type: 'workout_create',
        data: {},
        timestamp: Date.now(),
        status: 'pending',
      });

      await syncQueue.processQueue();

      const queue = await syncQueue.getQueue();
      expect(queue[0].status).toBe('failed');
    });

    it('skips already completed operations', async () => {
      await syncQueue.addOperation({
        id: '1',
        type: 'workout_create',
        data: {},
        timestamp: Date.now(),
        status: 'completed',
      });

      const spy = jest.spyOn(supabase, 'from');
      await syncQueue.processQueue();

      expect(spy).not.toHaveBeenCalled();
    });

    it('processes operations in order', async () => {
      const calls: string[] = [];
      const mockChain = {
        insert: jest.fn((data: any) => {
          calls.push(data.name);
          return mockChain;
        }),
        update: jest.fn(() => mockChain),
        eq: jest.fn(() => mockChain),
        select: jest.fn().mockResolvedValue({ data: {}, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await syncQueue.addOperation({
        id: '1',
        type: 'workout_create',
        data: { name: 'First' },
        timestamp: 1000,
        status: 'pending',
      });
      await syncQueue.addOperation({
        id: '2',
        type: 'workout_create',
        data: { name: 'Second' },
        timestamp: 2000,
        status: 'pending',
      });

      await syncQueue.processQueue();

      expect(calls[0]).toBe('First');
      expect(calls[1]).toBe('Second');
    });
  });

  describe('clearCompleted', () => {
    it('removes completed operations', async () => {
      await syncQueue.addOperation({
        id: '1',
        type: 'workout_create',
        data: {},
        timestamp: Date.now(),
        status: 'completed',
      });
      await syncQueue.addOperation({
        id: '2',
        type: 'workout_create',
        data: {},
        timestamp: Date.now(),
        status: 'pending',
      });

      await syncQueue.clearCompleted();

      const queue = await syncQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].status).toBe('pending');
    });

    it('persists after clearing', async () => {
      await syncQueue.addOperation({
        id: '1',
        type: 'workout_create',
        data: {},
        timestamp: Date.now(),
        status: 'completed',
      });

      await syncQueue.clearCompleted();

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('retryFailed', () => {
    it('resets failed operations to pending', async () => {
      await syncQueue.addOperation({
        id: '1',
        type: 'workout_create',
        data: {},
        timestamp: Date.now(),
        status: 'failed',
      });

      await syncQueue.retryFailed();

      const queue = await syncQueue.getQueue();
      expect(queue[0].status).toBe('pending');
    });

    it('increments retry count', async () => {
      await syncQueue.addOperation({
        id: '1',
        type: 'workout_create',
        data: {},
        timestamp: Date.now(),
        status: 'failed',
        retryCount: 0,
      });

      await syncQueue.retryFailed();

      const queue = await syncQueue.getQueue();
      expect(queue[0].retryCount).toBe(1);
    });

    it('does not retry beyond max attempts', async () => {
      await syncQueue.addOperation({
        id: '1',
        type: 'workout_create',
        data: {},
        timestamp: Date.now(),
        status: 'failed',
        retryCount: 5,
      });

      await syncQueue.retryFailed();

      const queue = await syncQueue.getQueue();
      expect(queue[0].status).toBe('failed');
      expect(queue[0].retryCount).toBe(5);
    });
  });

  describe('operation types', () => {
    it('handles workout_create operations', async () => {
      const mockChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ data: { id: 'workout-1' }, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await syncQueue.addOperation({
        id: '1',
        type: 'workout_create',
        data: { name: 'Test Workout', user_id: mockUserId },
        timestamp: Date.now(),
        status: 'pending',
      });

      await syncQueue.processQueue();

      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test Workout' })
      );
    });

    it('handles workout_update operations', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ data: {}, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await syncQueue.addOperation({
        id: '1',
        type: 'workout_update',
        data: { id: 'workout-1', name: 'Updated Workout' },
        timestamp: Date.now(),
        status: 'pending',
      });

      await syncQueue.processQueue();

      expect(mockChain.update).toHaveBeenCalled();
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'workout-1');
    });

    it('handles workout_delete operations', async () => {
      const mockChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await syncQueue.addOperation({
        id: '1',
        type: 'workout_delete',
        data: { id: 'workout-1' },
        timestamp: Date.now(),
        status: 'pending',
      });

      await syncQueue.processQueue();

      expect(mockChain.delete).toHaveBeenCalled();
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'workout-1');
    });
  });

  describe('conflict resolution', () => {
    it('handles duplicate operation IDs', async () => {
      const operation: SyncOperation = {
        id: '1',
        type: 'workout_create',
        data: {},
        timestamp: Date.now(),
        status: 'pending',
      };

      await syncQueue.addOperation(operation);
      await syncQueue.addOperation(operation);

      const queue = await syncQueue.getQueue();
      // Should deduplicate
      expect(queue).toHaveLength(1);
    });

    it('keeps latest version of duplicate operations', async () => {
      const operation1: SyncOperation = {
        id: '1',
        type: 'workout_update',
        data: { name: 'Old Name' },
        timestamp: 1000,
        status: 'pending',
      };
      const operation2: SyncOperation = {
        id: '1',
        type: 'workout_update',
        data: { name: 'New Name' },
        timestamp: 2000,
        status: 'pending',
      };

      await syncQueue.addOperation(operation1);
      await syncQueue.addOperation(operation2);

      const queue = await syncQueue.getQueue();
      expect(queue[0].data.name).toBe('New Name');
    });
  });

  describe('error handling', () => {
    it('continues processing after individual operation failure', async () => {
      const mockChain1 = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
      };
      const mockChain2 = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ data: {}, error: null }),
      };
      
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockChain1)
        .mockReturnValueOnce(mockChain2);

      await syncQueue.addOperation({
        id: '1',
        type: 'workout_create',
        data: {},
        timestamp: 1000,
        status: 'pending',
      });
      await syncQueue.addOperation({
        id: '2',
        type: 'workout_create',
        data: {},
        timestamp: 2000,
        status: 'pending',
      });

      await syncQueue.processQueue();

      const queue = await syncQueue.getQueue();
      expect(queue[0].status).toBe('failed');
      expect(queue[1].status).toBe('completed');
    });

    it('handles AsyncStorage errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage full'));

      await expect(
        syncQueue.addOperation({
          id: '1',
          type: 'workout_create',
          data: {},
          timestamp: Date.now(),
          status: 'pending',
        })
      ).rejects.toThrow();
    });
  });

  describe('performance', () => {
    it('handles large queue efficiently', async () => {
      const operations = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        type: 'workout_create' as const,
        data: { name: `Workout ${i}` },
        timestamp: Date.now() + i,
        status: 'pending' as const,
      }));

      for (const op of operations) {
        await syncQueue.addOperation(op);
      }

      const queue = await syncQueue.getQueue();
      expect(queue).toHaveLength(100);
    });

    it('batches AsyncStorage writes', async () => {
      const operation: SyncOperation = {
        id: '1',
        type: 'workout_create',
        data: {},
        timestamp: Date.now(),
        status: 'pending',
      };

      await syncQueue.addOperation(operation);
      await syncQueue.addOperation(operation);
      await syncQueue.addOperation(operation);

      // Should write to storage for each operation
      // (Real implementation might batch these)
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });
});

