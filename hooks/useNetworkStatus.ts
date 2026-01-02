import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
  isOnline: boolean;
  isInternetReachable: boolean | null;
  connectionType: string;
  isWifi: boolean;
  isCellular: boolean;
  isConnected: boolean;
}

/**
 * Hook to monitor network connectivity status
 * Returns real-time network information
 */
export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: true,
    isInternetReachable: null,
    connectionType: 'unknown',
    isWifi: false,
    isCellular: false,
    isConnected: true,
  });

  useEffect(() => {
    // Get initial state
    NetInfo.fetch().then((state) => {
      updateNetworkStatus(state);
    });

    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((state) => {
      updateNetworkStatus(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const updateNetworkStatus = (state: NetInfoState) => {
    setNetworkStatus({
      isOnline: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      connectionType: state.type,
      isWifi: state.type === 'wifi',
      isCellular: state.type === 'cellular',
      isConnected: state.isConnected ?? false,
    });
  };

  return networkStatus;
}

/**
 * Hook to check if device is online
 * Simplified version that returns just boolean
 */
export function useIsOnline(): boolean {
  const { isOnline } = useNetworkStatus();
  return isOnline;
}

/**
 * Hook to check if on wifi (useful for large uploads/downloads)
 */
export function useIsWifi(): boolean {
  const { isWifi } = useNetworkStatus();
  return isWifi;
}

export default useNetworkStatus;
