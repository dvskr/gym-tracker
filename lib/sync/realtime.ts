import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';
import { supabase } from '../supabase';
import { localDB } from '../storage/localDatabase';
import { conflictResolver } from './conflictResolver';
import { eventEmitter, Events } from '../utils/eventEmitter';

/**
 * Real-time Sync - Subscribes to Supabase real-time changes
 * Automatically updates local data when changes occur on other devices
 */
class RealtimeSync {
  private channels: Map<string, RealtimeChannel> = new Map();
  private userId: string | null = null;
  private isInitialized = false;

  /**
   * Initialize real-time subscriptions for a user
   * Call this after successful authentication
   */
  async init(userId: string): Promise<void> {
    if (this.isInitialized && this.userId === userId) {
      logger.log('�a� Real-time sync already initialized for this user');
      return;
    }

    // Cleanup previous subscriptions if switching users
    if (this.isInitialized) {
      await this.cleanup();
    }

    this.userId = userId;
    
    logger.log('�a� Initializing real-time sync for user:', userId);

    try {
      // Subscribe to all tables
      await this.subscribeToWorkouts();
      await this.subscribeToTemplates();
      await this.subscribeToWeightLog();
      await this.subscribeToMeasurements();
      await this.subscribeToPersonalRecords();

      this.isInitialized = true;
      eventEmitter.emit(Events.REALTIME_CONNECTED);
      
      logger.log('�S& Real-time sync initialized successfully');
    } catch (error) {
      logger.error('�R Failed to initialize real-time sync:', error);
      eventEmitter.emit(Events.REALTIME_ERROR, error);
      throw error;
    }
  }

  /**
   * Cleanup all subscriptions
   * Call this on logout
   */
  async cleanup(): Promise<void> {
    logger.log('�x�� Cleaning up real-time subscriptions...');

    // Remove all channels
    for (const [name, channel] of this.channels.entries()) {
      try {
        await supabase.removeChannel(channel);
        logger.log(`�S& Removed channel: ${name}`);
      } catch (error) {
        logger.error(`�R Error removing channel ${name}:`, error);
      }
    }

    this.channels.clear();
    this.userId = null;
    this.isInitialized = false;
    
    eventEmitter.emit(Events.REALTIME_DISCONNECTED);
    logger.log('�S& Real-time sync cleanup complete');
  }

  /**
   * Check if real-time sync is active
   */
  isActive(): boolean {
    return this.isInitialized && this.userId !== null;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.userId;
  }

  // ============================================================================
  // WORKOUTS SUBSCRIPTION
  // ============================================================================

  private async subscribeToWorkouts(): Promise<void> {
    const channel = supabase
      .channel('workouts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workouts',
          filter: `user_id=eq.${this.userId}`,
        },
        (payload) => this.handleWorkoutChange(payload)
      )
      .subscribe((status) => {
        logger.log('Workouts channel status:', status);
      });

    this.channels.set('workouts', channel);
  }

  private async handleWorkoutChange(
    payload: RealtimePostgresChangesPayload<any>
  ): Promise<void> {
    const { eventType, new: newData, old: oldData } = payload;

    logger.log(`�a� Workout ${eventType}:`, newData?.id || oldData?.id);

    try {
      switch (eventType) {
        case 'INSERT':
          await this.handleNewWorkout(newData);
          break;
        case 'UPDATE':
          await this.handleUpdatedWorkout(newData);
          break;
        case 'DELETE':
          await this.handleDeletedWorkout(oldData);
          break;
      }

      // Notify UI to refresh
      eventEmitter.emit(Events.WORKOUTS_UPDATED, { eventType, data: newData || oldData });
    } catch (error) {
      logger.error('Error handling workout change:', error);
    }
  }

  private async handleNewWorkout(workout: any): Promise<void> {
    const localWorkouts = await localDB.getLocalWorkouts();
    
    // Check if workout already exists locally
    if (!localWorkouts.find(w => w.id === workout.id)) {
      logger.log('�x� Adding new workout from real-time:', workout.id);
      localWorkouts.push({ ...workout, _synced: true });
      await localDB.saveLocally('@gym/workouts', localWorkouts);
    }
  }

  private async handleUpdatedWorkout(workout: any): Promise<void> {
    const localWorkouts = await localDB.getLocalWorkouts();
    const index = localWorkouts.findIndex(w => w.id === workout.id);

    if (index === -1) {
      // Doesn't exist locally - add it
      logger.log('�x� Adding workout from real-time update:', workout.id);
      localWorkouts.push({ ...workout, _synced: true });
      await localDB.saveLocally('@gym/workouts', localWorkouts);
      return;
    }

    const localWorkout = localWorkouts[index];

    // Check for conflict
    if (conflictResolver.hasConflict(localWorkout, workout)) {
      logger.log('�a���� Conflict detected during real-time update');
      
      const resolution = await conflictResolver.resolve(
        localWorkout,
        workout,
        'workouts'
      );
      
      localWorkouts[index] = resolution.data;
      
      if (resolution.conflict) {
        eventEmitter.emit(Events.CONFLICT_DETECTED, resolution.conflict);
      }
    } else {
      // No conflict - use server version
      localWorkouts[index] = { ...workout, _synced: true };
    }

    await localDB.saveLocally('@gym/workouts', localWorkouts);
  }

  private async handleDeletedWorkout(workout: any): Promise<void> {
    logger.log('�x️ Deleting workout from real-time:', workout.id);
    
    const localWorkouts = await localDB.getLocalWorkouts();
    const filtered = localWorkouts.filter(w => w.id !== workout.id);
    await localDB.saveLocally('@gym/workouts', filtered);
  }

  // ============================================================================
  // TEMPLATES SUBSCRIPTION
  // ============================================================================

  private async subscribeToTemplates(): Promise<void> {
    const channel = supabase
      .channel('templates-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workout_templates',
          filter: `user_id=eq.${this.userId}`,
        },
        (payload) => this.handleTemplateChange(payload)
      )
      .subscribe((status) => {
        logger.log('Templates channel status:', status);
      });

    this.channels.set('templates', channel);
  }

  private async handleTemplateChange(
    payload: RealtimePostgresChangesPayload<any>
  ): Promise<void> {
    const { eventType, new: newData, old: oldData } = payload;

    logger.log(`�a� Template ${eventType}:`, newData?.id || oldData?.id);

    try {
      const localTemplates = await localDB.getLocalTemplates();

      switch (eventType) {
        case 'INSERT':
          if (!localTemplates.find(t => t.id === newData.id)) {
            localTemplates.push({ ...newData, _synced: true });
          }
          break;

        case 'UPDATE':
          const index = localTemplates.findIndex(t => t.id === newData.id);
          if (index >= 0) {
            if (conflictResolver.hasConflict(localTemplates[index], newData)) {
              const resolution = await conflictResolver.resolve(
                localTemplates[index],
                newData,
                'workout_templates'
              );
              localTemplates[index] = resolution.data;
            } else {
              localTemplates[index] = { ...newData, _synced: true };
            }
          } else {
            localTemplates.push({ ...newData, _synced: true });
          }
          break;

        case 'DELETE':
          const filtered = localTemplates.filter(t => t.id !== oldData.id);
          await localDB.saveLocally('@gym/templates', filtered);
          eventEmitter.emit(Events.TEMPLATES_UPDATED, { eventType, data: oldData });
          return;
      }

      await localDB.saveLocally('@gym/templates', localTemplates);
      eventEmitter.emit(Events.TEMPLATES_UPDATED, { eventType, data: newData || oldData });
    } catch (error) {
      logger.error('Error handling template change:', error);
    }
  }

  // ============================================================================
  // WEIGHT LOG SUBSCRIPTION
  // ============================================================================

  private async subscribeToWeightLog(): Promise<void> {
    const channel = supabase
      .channel('weight-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'body_weight_log',
          filter: `user_id=eq.${this.userId}`,
        },
        (payload) => this.handleWeightChange(payload)
      )
      .subscribe((status) => {
        logger.log('Weight log channel status:', status);
      });

    this.channels.set('weight', channel);
  }

  private async handleWeightChange(
    payload: RealtimePostgresChangesPayload<any>
  ): Promise<void> {
    const { eventType, new: newData, old: oldData } = payload;

    logger.log(`�a� Weight log ${eventType}:`, newData?.id || oldData?.id);

    try {
      const localWeights = await localDB.getLocalWeights();

      switch (eventType) {
        case 'INSERT':
          if (!localWeights.find(w => w.id === newData.id)) {
            localWeights.push({ ...newData, _synced: true });
          }
          break;

        case 'UPDATE':
          const index = localWeights.findIndex(w => w.id === newData.id);
          if (index >= 0) {
            localWeights[index] = { ...newData, _synced: true };
          } else {
            localWeights.push({ ...newData, _synced: true });
          }
          break;

        case 'DELETE':
          const filtered = localWeights.filter(w => w.id !== oldData.id);
          await localDB.saveLocally('@gym/weight_log', filtered);
          eventEmitter.emit(Events.WEIGHT_LOG_UPDATED, { eventType, data: oldData });
          return;
      }

      await localDB.saveLocally('@gym/weight_log', localWeights);
      eventEmitter.emit(Events.WEIGHT_LOG_UPDATED, { eventType, data: newData || oldData });
    } catch (error) {
      logger.error('Error handling weight change:', error);
    }
  }

  // ============================================================================
  // MEASUREMENTS SUBSCRIPTION
  // ============================================================================

  private async subscribeToMeasurements(): Promise<void> {
    const channel = supabase
      .channel('measurements-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'body_measurements',
          filter: `user_id=eq.${this.userId}`,
        },
        (payload) => this.handleMeasurementChange(payload)
      )
      .subscribe((status) => {
        logger.log('Measurements channel status:', status);
      });

    this.channels.set('measurements', channel);
  }

  private async handleMeasurementChange(
    payload: RealtimePostgresChangesPayload<any>
  ): Promise<void> {
    const { eventType, new: newData, old: oldData } = payload;

    logger.log(`�a� Measurement ${eventType}:`, newData?.id || oldData?.id);

    try {
      const localMeasurements = await localDB.getLocalMeasurements();

      switch (eventType) {
        case 'INSERT':
          if (!localMeasurements.find(m => m.id === newData.id)) {
            localMeasurements.push({ ...newData, _synced: true });
          }
          break;

        case 'UPDATE':
          const index = localMeasurements.findIndex(m => m.id === newData.id);
          if (index >= 0) {
            localMeasurements[index] = { ...newData, _synced: true };
          } else {
            localMeasurements.push({ ...newData, _synced: true });
          }
          break;

        case 'DELETE':
          const filtered = localMeasurements.filter(m => m.id !== oldData.id);
          await localDB.saveLocally('@gym/measurements', filtered);
          eventEmitter.emit(Events.MEASUREMENTS_UPDATED, { eventType, data: oldData });
          return;
      }

      await localDB.saveLocally('@gym/measurements', localMeasurements);
      eventEmitter.emit(Events.MEASUREMENTS_UPDATED, { eventType, data: newData || oldData });
    } catch (error) {
      logger.error('Error handling measurement change:', error);
    }
  }

  // ============================================================================
  // PERSONAL RECORDS SUBSCRIPTION
  // ============================================================================

  private async subscribeToPersonalRecords(): Promise<void> {
    const channel = supabase
      .channel('prs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'personal_records',
          filter: `user_id=eq.${this.userId}`,
        },
        (payload) => this.handlePRChange(payload)
      )
      .subscribe((status) => {
        logger.log('Personal records channel status:', status);
      });

    this.channels.set('personal_records', channel);
  }

  private async handlePRChange(
    payload: RealtimePostgresChangesPayload<any>
  ): Promise<void> {
    const { eventType, new: newData, old: oldData } = payload;

    logger.log(`�a� PR ${eventType}:`, newData?.id || oldData?.id);

    try {
      const localPRs = await localDB.getLocalPersonalRecords();

      switch (eventType) {
        case 'INSERT':
          if (!localPRs.find(pr => pr.id === newData.id)) {
            localPRs.push({ ...newData, _synced: true });
          }
          break;

        case 'UPDATE':
          const index = localPRs.findIndex(pr => pr.id === newData.id);
          if (index >= 0) {
            localPRs[index] = { ...newData, _synced: true };
          } else {
            localPRs.push({ ...newData, _synced: true });
          }
          break;

        case 'DELETE':
          const filtered = localPRs.filter(pr => pr.id !== oldData.id);
          await localDB.saveLocally('@gym/personal_records', filtered);
          eventEmitter.emit(Events.PERSONAL_RECORDS_UPDATED, { eventType, data: oldData });
          return;
      }

      await localDB.saveLocally('@gym/personal_records', localPRs);
      eventEmitter.emit(Events.PERSONAL_RECORDS_UPDATED, { eventType, data: newData || oldData });
    } catch (error) {
      logger.error('Error handling PR change:', error);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get status of all channels
   */
  getStatus(): { [key: string]: string } {
    const status: { [key: string]: string } = {};
    
    this.channels.forEach((channel, name) => {
      status[name] = channel.state;
    });

    return status;
  }

  /**
   * Get count of active subscriptions
   */
  getSubscriptionCount(): number {
    return this.channels.size;
  }
}

// Singleton instance
export const realtimeSync = new RealtimeSync();
export default realtimeSync;

