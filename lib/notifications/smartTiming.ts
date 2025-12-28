import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserActivity {
  workoutTimes: number[]; // Hours of day (0-23)
  workoutDays: number[]; // Days of week (0-6, Sunday = 0)
  averageWorkoutDuration: number; // minutes
}

export interface SmartSchedule {
  days: number[];
  time: { hour: number; minute: number };
  confidence: 'low' | 'medium' | 'high';
}

class SmartTimingService {
  private readonly STORAGE_KEY = '@gym/user_activity';

  /**
   * Record when user works out to learn their patterns
   */
  async recordWorkoutTime(startTime: Date, durationMinutes?: number): Promise<void> {
    try {
      const activity = await this.getActivity();
      
      const hour = startTime.getHours();
      const day = startTime.getDay();
      
      // Add to history
      activity.workoutTimes.push(hour);
      activity.workoutDays.push(day);
      
      // Update average duration if provided
      if (durationMinutes !== undefined) {
        const currentAvg = activity.averageWorkoutDuration || 60;
        const count = Math.min(activity.workoutTimes.length, 30);
        activity.averageWorkoutDuration = Math.round(
          (currentAvg * (count - 1) + durationMinutes) / count
        );
      }
      
      // Keep last 30 data points for rolling average
      activity.workoutTimes = activity.workoutTimes.slice(-30);
      activity.workoutDays = activity.workoutDays.slice(-30);
      
      await this.saveActivity(activity);
      
      console.log(`📊 Recorded workout: ${this.getDayName(day)} at ${hour}:00`);
      console.log(`📈 Total recorded workouts: ${activity.workoutTimes.length}`);
    } catch (error) {
      console.error('Failed to record workout time:', error);
    }
  }

  /**
   * Get optimal reminder time based on workout history
   */
  async getOptimalReminderTime(): Promise<{ hour: number; minute: number }> {
    const activity = await this.getActivity();
    
    if (activity.workoutTimes.length < 5) {
      // Not enough data, use default (6 PM)
      console.log('⚠️ Not enough data for smart timing, using default (6 PM)');
      return { hour: 18, minute: 0 };
    }

    // Find most common workout hour
    const hourCounts = new Map<number, number>();
    for (const hour of activity.workoutTimes) {
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }

    const sortedHours = [...hourCounts.entries()]
      .sort((a, b) => b[1] - a[1]);
    
    const mostCommonHour = sortedHours[0][0];
    const occurrences = sortedHours[0][1];

    console.log(`🎯 Most common workout hour: ${mostCommonHour}:00 (${occurrences} times)`);

    // Remind 1 hour before typical workout time
    let reminderHour = mostCommonHour - 1;
    let reminderMinute = 0;
    
    if (reminderHour < 0) {
      reminderHour = 23;
    }

    // If workout is early morning, remind the night before
    if (mostCommonHour >= 5 && mostCommonHour < 8) {
      reminderHour = 20; // 8 PM the night before
      reminderMinute = 0;
    }

    return { hour: reminderHour, minute: reminderMinute };
  }

  /**
   * Get optimal days for reminders based on workout history
   */
  async getOptimalDays(): Promise<number[]> {
    const activity = await this.getActivity();
    
    if (activity.workoutDays.length < 5) {
      // Default to Mon, Wed, Fri
      console.log('⚠️ Not enough data for smart days, using default (Mon/Wed/Fri)');
      return [1, 3, 5];
    }

    // Count workout occurrences by day
    const dayCounts = new Map<number, number>();
    for (const day of activity.workoutDays) {
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    }

    // Return days with at least 2 occurrences, sorted
    const optimalDays = [...dayCounts.entries()]
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1]) // Sort by frequency
      .map(([day]) => day)
      .sort((a, b) => a - b); // Sort by day of week

    console.log('📅 Optimal workout days:', optimalDays.map(d => this.getDayName(d)).join(', '));

    return optimalDays.length > 0 ? optimalDays : [1, 3, 5];
  }

  /**
   * Get suggested schedule with confidence level
   */
  async getSuggestedSchedule(): Promise<SmartSchedule> {
    const activity = await this.getActivity();
    
    const dataPoints = activity.workoutTimes.length;
    
    const confidence: 'low' | 'medium' | 'high' = 
      dataPoints < 5 ? 'low' :
      dataPoints < 15 ? 'medium' : 'high';

    const days = await this.getOptimalDays();
    const time = await this.getOptimalReminderTime();

    console.log(`🔮 Smart schedule suggestion (${confidence} confidence):`);
    console.log(`   Days: ${days.map(d => this.getDayName(d)).join(', ')}`);
    console.log(`   Time: ${this.formatTime(time.hour, time.minute)}`);
    console.log(`   Based on ${dataPoints} workouts`);

    return {
      days,
      time,
      confidence,
    };
  }

  /**
   * Check if current time is good for sending notifications
   */
  async isGoodTimeToNotify(): Promise<boolean> {
    const now = new Date();
    const hour = now.getHours();
    
    // Never notify during quiet hours (10 PM - 8 AM)
    if (hour >= 22 || hour < 8) {
      return false;
    }

    // Get user's typical active hours
    const activity = await this.getActivity();
    
    if (activity.workoutTimes.length >= 5) {
      const activeHours = new Set(activity.workoutTimes);
      
      // Include 2 hours before/after typical workout times
      const expandedHours = new Set<number>();
      for (const h of activeHours) {
        for (let offset = -2; offset <= 2; offset++) {
          expandedHours.add((h + offset + 24) % 24);
        }
      }
      
      return expandedHours.has(hour);
    }

    // Default: good between 8 AM and 10 PM
    return true;
  }

  /**
   * Get workout statistics
   */
  async getWorkoutStats(): Promise<{
    totalRecorded: number;
    mostCommonDay: string | null;
    mostCommonHour: number | null;
    averageDuration: number;
  }> {
    const activity = await this.getActivity();
    
    let mostCommonDay: string | null = null;
    let mostCommonHour: number | null = null;

    if (activity.workoutDays.length > 0) {
      const dayCounts = new Map<number, number>();
      for (const day of activity.workoutDays) {
        dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
      }
      const topDay = [...dayCounts.entries()]
        .sort((a, b) => b[1] - a[1])[0];
      mostCommonDay = this.getDayName(topDay[0]);
    }

    if (activity.workoutTimes.length > 0) {
      const hourCounts = new Map<number, number>();
      for (const hour of activity.workoutTimes) {
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      }
      mostCommonHour = [...hourCounts.entries()]
        .sort((a, b) => b[1] - a[1])[0][0];
    }

    return {
      totalRecorded: activity.workoutTimes.length,
      mostCommonDay,
      mostCommonHour,
      averageDuration: activity.averageWorkoutDuration,
    };
  }

  /**
   * Reset activity data
   */
  async resetActivity(): Promise<void> {
    await AsyncStorage.removeItem(this.STORAGE_KEY);
    console.log('🗑️ Activity data reset');
  }

  /**
   * Get activity from storage
   */
  private async getActivity(): Promise<UserActivity> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {
        workoutTimes: [],
        workoutDays: [],
        averageWorkoutDuration: 60,
      };
    } catch (error) {
      console.error('Failed to get activity:', error);
      return {
        workoutTimes: [],
        workoutDays: [],
        averageWorkoutDuration: 60,
      };
    }
  }

  /**
   * Save activity to storage
   */
  private async saveActivity(activity: UserActivity): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(activity));
    } catch (error) {
      console.error('Failed to save activity:', error);
    }
  }

  /**
   * Get day name from day number
   */
  private getDayName(day: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day] || 'Unknown';
  }

  /**
   * Format time as string
   */
  private formatTime(hour: number, minute: number): string {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  }
}

export const smartTimingService = new SmartTimingService();

