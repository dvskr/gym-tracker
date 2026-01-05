# Code Examples

Reference implementations and usage examples for various app features.
These files are **not included in the production bundle**.

## AI Examples (`ai/`)

Example implementations for AI validation and specificity checking:

| File | Description |
|------|-------------|
| `specificityExamples.ts` | Examples of AI response specificity checking |
| `validationExamples.ts` | Examples of AI response validation |

---

## Sync Examples (`sync/`)

Example implementations for the offline-first sync system:

| File | Description |
|------|-------------|
| `backgroundSyncExamples.tsx` | Background sync with queue management |
| `manualSyncExamples.tsx` | Manual sync trigger examples |
| `offlineFirstUsage.tsx` | Offline-first data access patterns |
| `realtimeExamples.tsx` | Realtime subscription examples |
| `syncQueueExamples.tsx` | Sync queue management |
| `syncStatusIntegration.tsx` | UI integration for sync status |

## Usage

These are reference implementations only. Copy relevant code into your components as needed.

```tsx
// Example: Using sync status in a component
// See syncStatusIntegration.tsx for full implementation

import { useSyncStatus } from '@/lib/sync/syncStatus';

function MyComponent() {
  const { isSyncing, pendingCount } = useSyncStatus();
  
  return (
    <View>
      {isSyncing && <Text>Syncing...</Text>}
      {pendingCount > 0 && <Text>{pendingCount} pending</Text>}
    </View>
  );
}
```

## Note

These files use `.tsx` extension but are not actual React components in the app.
They serve as documentation and reference code only.

