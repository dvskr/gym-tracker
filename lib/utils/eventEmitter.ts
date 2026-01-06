import { logger } from '@/lib/utils/logger';
/**
 * Event Emitter - Simple pub/sub for app-wide events
 * Used for real-time updates and cross-component communication
 */

type EventCallback<T = unknown> = (data?: T) => void;

class EventEmitter {
  private listeners: Map<string, EventCallback[]> = new Map();

  /**
   * Subscribe to an event
   * @param event Event name
   * @param callback Function to call when event is emitted
   * @returns Unsubscribe function
   */
  on<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    const callbacks = this.listeners.get(event);
    if (!callbacks) {
      // This shouldn't happen since we just set it above, but satisfy TypeScript
      this.listeners.set(event, [callback as EventCallback]);
      const newCallbacks = this.listeners.get(event) ?? [];
      return () => {
        const index = newCallbacks.indexOf(callback as EventCallback);
        if (index > -1) {
          newCallbacks.splice(index, 1);
        }
      };
    }
    
    callbacks.push(callback as EventCallback);
    
    // Return unsubscribe function
    return () => {
      const index = callbacks.indexOf(callback as EventCallback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to an event (one-time only)
   * Automatically unsubscribes after first emit
   */
  once<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    const wrappedCallback = (data?: T) => {
      callback(data);
      unsubscribe();
    };
    
    const unsubscribe = this.on(event, wrappedCallback);
    return unsubscribe;
  }

  /**
   * Emit an event to all subscribers
   * @param event Event name
   * @param data Optional data to pass to callbacks
   */
  emit<T = unknown>(event: string, data?: T): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      // Create a copy to avoid issues if callbacks modify the array
      [...callbacks].forEach(cb => {
        try {
          cb(data);
        } catch (error) {
 logger.error(`Error in event callback for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event
   */
  off(event: string): void {
    this.listeners.delete(event);
  }

  /**
   * Remove all listeners for all events
   */
  removeAllListeners(): void {
    this.listeners.clear();
  }

  /**
   * Get count of listeners for an event
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.length || 0;
  }

  /**
   * Get all registered events
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }
}

// Singleton instance
export const eventEmitter = new EventEmitter();

// Predefined event names for type safety
export const Events = {
  // Data updates
  WORKOUTS_UPDATED: 'workouts-updated',
  TEMPLATES_UPDATED: 'templates-updated',
  WEIGHT_LOG_UPDATED: 'weight-log-updated',
  MEASUREMENTS_UPDATED: 'measurements-updated',
  PERSONAL_RECORDS_UPDATED: 'personal-records-updated',
  
  // Sync events
  SYNC_STARTED: 'sync-started',
  SYNC_COMPLETED: 'sync-completed',
  SYNC_FAILED: 'sync-failed',
  
  // Realtime events
  REALTIME_CONNECTED: 'realtime-connected',
  REALTIME_DISCONNECTED: 'realtime-disconnected',
  REALTIME_ERROR: 'realtime-error',
  
  // Conflict events
  CONFLICT_DETECTED: 'conflict-detected',
  CONFLICT_RESOLVED: 'conflict-resolved',
  
  // Network events
  NETWORK_ONLINE: 'network-online',
  NETWORK_OFFLINE: 'network-offline',
} as const;

export default eventEmitter;

