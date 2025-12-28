import React, { useState } from 'react';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { SyncStatusSheet } from './SyncStatusSheet';

interface SyncStatusProps {
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Combined Sync Status component
 * Shows indicator that opens detailed sheet when tapped
 */
export function SyncStatus({ showLabel = true, size = 'medium' }: SyncStatusProps) {
  const [sheetVisible, setSheetVisible] = useState(false);

  return (
    <>
      <SyncStatusIndicator
        onPress={() => setSheetVisible(true)}
        showLabel={showLabel}
        size={size}
      />
      
      <SyncStatusSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </>
  );
}

export default SyncStatus;

