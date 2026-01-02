import { useState, useEffect } from 'react';
import { healthService, HealthPermissions } from '@/lib/health/healthService';

export function useHealthConnect() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<HealthPermissions | null>(null);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      
      // Check if health features are available
      const available = await healthService.checkAvailability();
      setIsAvailable(available);

      if (available) {
        // Check current permissions
        const perms = await healthService.checkPermissions();
        setPermissions(perms);
        
        // Consider has permissions if any write permission is granted
        const hasAnyPermission = Object.values(perms.write).some((v) => v);
        setHasPermissions(hasAnyPermission);
      }

      setIsLoading(false);
    }

    init();
  }, []);

  const requestPermissions = async () => {
    const granted = await healthService.requestPermissions();
    setHasPermissions(granted);

    if (granted) {
      const perms = await healthService.checkPermissions();
      setPermissions(perms);
    }

    return granted;
  };

  const openSettings = async () => {
    await healthService.openHealthSettings();
  };

  return {
    isAvailable,
    hasPermissions,
    isLoading,
    permissions,
    requestPermissions,
    openSettings,
  };
}
