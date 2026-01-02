import { useEffect, useState, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import { eventEmitter, Events } from '../lib/utils/eventEmitter';
import { realtimeSync } from '../lib/sync/realtime';

/**
 * Hook to listen for real-time workout updates
 * Automatically refreshes data when changes occur on other devices
 */
export function useRealtimeWorkouts(onUpdate?: () => void) {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const unsubscribe = eventEmitter.on(Events.WORKOUTS_UPDATED, (payload) => {
      logger.log('ðŸ“¡ Workouts updated via real-time:', payload);
      setLastUpdate(new Date());
      onUpdate?.();
    });

    return () => unsubscribe();
  }, [onUpdate]);

  return { lastUpdate };
}

/**
 * Hook to listen for real-time template updates
 */
export function useRealtimeTemplates(onUpdate?: () => void) {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const unsubscribe = eventEmitter.on(Events.TEMPLATES_UPDATED, (payload) => {
      logger.log('ðŸ“¡ Templates updated via real-time:', payload);
      setLastUpdate(new Date());
      onUpdate?.();
    });

    return () => unsubscribe();
  }, [onUpdate]);

  return { lastUpdate };
}

/**
 * Hook to listen for real-time weight log updates
 */
export function useRealtimeWeightLog(onUpdate?: () => void) {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const unsubscribe = eventEmitter.on(Events.WEIGHT_LOG_UPDATED, (payload) => {
      logger.log('ðŸ“¡ Weight log updated via real-time:', payload);
      setLastUpdate(new Date());
      onUpdate?.();
    });

    return () => unsubscribe();
  }, [onUpdate]);

  return { lastUpdate };
}

/**
 * Hook to listen for real-time measurement updates
 */
export function useRealtimeMeasurements(onUpdate?: () => void) {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const unsubscribe = eventEmitter.on(Events.MEASUREMENTS_UPDATED, (payload) => {
      logger.log('ðŸ“¡ Measurements updated via real-time:', payload);
      setLastUpdate(new Date());
      onUpdate?.();
    });

    return () => unsubscribe();
  }, [onUpdate]);

  return { lastUpdate };
}

/**
 * Hook to listen for real-time personal record updates
 */
export function useRealtimePersonalRecords(onUpdate?: () => void) {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const unsubscribe = eventEmitter.on(Events.PERSONAL_RECORDS_UPDATED, (payload) => {
      logger.log('ðŸ“¡ Personal records updated via real-time:', payload);
      setLastUpdate(new Date());
      onUpdate?.();
    });

    return () => unsubscribe();
  }, [onUpdate]);

  return { lastUpdate };
}

/**
 * Hook to monitor real-time connection status
 */
export function useRealtimeStatus() {
  const [isConnected, setIsConnected] = useState(realtimeSync.isActive());
  const [subscriptionCount, setSubscriptionCount] = useState(0);

  const updateStatus = useCallback(() => {
    setIsConnected(realtimeSync.isActive());
    setSubscriptionCount(realtimeSync.getSubscriptionCount());
  }, []);

  useEffect(() => {
    // Initial status
    updateStatus();

    // Listen for connection changes
    const unsubscribeConnected = eventEmitter.on(Events.REALTIME_CONNECTED, () => {
      updateStatus();
    });

    const unsubscribeDisconnected = eventEmitter.on(Events.REALTIME_DISCONNECTED, () => {
      updateStatus();
    });

    // Update periodically
    const interval = setInterval(updateStatus, 5000);

    return () => {
      unsubscribeConnected();
      unsubscribeDisconnected();
      clearInterval(interval);
    };
  }, [updateStatus]);

  return {
    isConnected,
    subscriptionCount,
    status: realtimeSync.getStatus(),
  };
}

/**
 * Hook to listen for conflict detection
 */
export function useConflictDetection(onConflict?: (conflict: any) => void) {
  const [conflictCount, setConflictCount] = useState(0);
  const [latestConflict, setLatestConflict] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = eventEmitter.on(Events.CONFLICT_DETECTED, (conflict) => {
      logger.log('âš ï¸ Conflict detected:', conflict);
      setConflictCount(prev => prev + 1);
      setLatestConflict(conflict);
      onConflict?.(conflict);
    });

    return () => unsubscribe();
  }, [onConflict]);

  return { conflictCount, latestConflict };
}

/**
 * Generic hook to listen for any event
 */
export function useEvent(event: string, callback: (data?: any) => void) {
  useEffect(() => {
    const unsubscribe = eventEmitter.on(event, callback);
    return () => unsubscribe();
  }, [event, callback]);
}

export default useRealtimeWorkouts;

