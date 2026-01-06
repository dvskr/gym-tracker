import { useState, useEffect } from 'react';
import { healthService } from '@/lib/health/healthService';
import type { HeartRateStats } from '@/lib/health/healthService';

/**
 * Hook to fetch heart rate data for a time period
 */
export function useHeartRate(startTime?: Date, endTime?: Date) {
  const [stats, setStats] = useState<HeartRateStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!startTime || !endTime) {
      setStats(null);
      return;
    }

    let cancelled = false;

    async function fetchHeartRate() {
      try {
        setIsLoading(true);
        setError(null);

        const data = await healthService.getHeartRate(startTime, endTime);

        if (!cancelled) {
          setStats(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch heart rate'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchHeartRate();

    return () => {
      cancelled = true;
    };
  }, [startTime?.getTime(), endTime?.getTime()]);

  const refresh = async () => {
    if (!startTime || !endTime) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await healthService.getHeartRate(startTime, endTime);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch heart rate'));
    } finally {
      setIsLoading(false);
    }
  };

  return { stats, isLoading, error, refresh };
}

/**
 * Hook to fetch resting heart rate
 */
export function useRestingHeartRate() {
  const [restingHR, setRestingHR] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchRestingHR() {
      try {
        setIsLoading(true);
        setError(null);

        const hr = await healthService.getRestingHeartRate();
        setRestingHR(hr);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch resting heart rate'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchRestingHR();
  }, []);

  const refresh = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const hr = await healthService.getRestingHeartRate();
      setRestingHR(hr);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch resting heart rate'));
    } finally {
      setIsLoading(false);
    }
  };

  return { restingHR, isLoading, error, refresh };
}

/**
 * Hook to fetch today's heart rate data
 */
export function useTodayHeartRate() {
  const [stats, setStats] = useState<HeartRateStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTodayHR = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await healthService.getTodayHeartRate();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch today\'s heart rate'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayHR();
  }, []);

  return { stats, isLoading, error, refresh: fetchTodayHR };
}

/**
 * Hook to get heart rate zones for a user
 */
export function useHeartRateZones(age?: number) {
  if (!age || age < 1 || age > 120) {
    return null;
  }

  return healthService.getHeartRateZones(age);
}

/**
 * Hook to determine heart rate zone for a BPM value
 */
export function useHeartRateZone(bpm?: number, age?: number) {
  if (!bpm || !age || age < 1 || age > 120) {
    return null;
  }

  return healthService.getHeartRateZone(bpm, age);
}

