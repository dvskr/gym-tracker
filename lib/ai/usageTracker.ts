import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/utils/logger';

export interface UsageData {
  requests: number;
  tokens: number;
  lastReset: string;
}

export interface UsageStats extends UsageData {
  requestsRemaining: number;
  tokensRemaining: number;
  percentUsed: number;
  estimatedCost: number;
  daysUntilReset: number;
}

export interface UsageCheck {
  allowed: boolean;
  reason?: string;
  limitType?: 'requests' | 'tokens';
}

class AIUsageTracker {
  private readonly STORAGE_KEY = '@gym/ai_usage';
  private readonly MONTHLY_REQUEST_LIMIT = 500;
  private readonly MONTHLY_TOKEN_LIMIT = 100000;
  private readonly TOKEN_COST_PER_1K = 0.00015; // gpt-4o-mini pricing

  private usage: UsageData = {
    requests: 0,
    tokens: 0,
    lastReset: new Date().toISOString(),
  };

  private isInitialized = false;

  /**
   * Initialize usage tracker (call on app start)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await this.loadUsage();
    await this.checkAndResetMonthly();
    this.isInitialized = true;
  }

  /**
   * Track a completed AI request
   */
  async trackRequest(tokens: number): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    await this.checkAndResetMonthly();

    this.usage.requests++;
    this.usage.tokens += tokens;

    await this.saveUsage();
  }

  /**
   * Check if user can make another request
   */
  async canMakeRequest(): Promise<UsageCheck> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    await this.checkAndResetMonthly();

    // Check request limit
    if (this.usage.requests >= this.MONTHLY_REQUEST_LIMIT) {
      return {
        allowed: false,
        reason: `Monthly request limit (${this.MONTHLY_REQUEST_LIMIT}) reached. Resets next month.`,
        limitType: 'requests',
      };
    }

    // Check token limit
    if (this.usage.tokens >= this.MONTHLY_TOKEN_LIMIT) {
      return {
        allowed: false,
        reason: `Monthly token limit (${this.MONTHLY_TOKEN_LIMIT.toLocaleString()}) reached. Resets next month.`,
        limitType: 'tokens',
      };
    }

    return { allowed: true };
  }

  /**
   * Get current usage statistics
   */
  async getUsage(): Promise<UsageStats> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    await this.checkAndResetMonthly();

    const requestsRemaining = Math.max(0, this.MONTHLY_REQUEST_LIMIT - this.usage.requests);
    const tokensRemaining = Math.max(0, this.MONTHLY_TOKEN_LIMIT - this.usage.tokens);
    const percentUsed = Math.min(
      100,
      Math.round((this.usage.requests / this.MONTHLY_REQUEST_LIMIT) * 100)
    );
    const estimatedCost = (this.usage.tokens / 1000) * this.TOKEN_COST_PER_1K;
    const daysUntilReset = this.getDaysUntilReset();

    return {
      ...this.usage,
      requestsRemaining,
      tokensRemaining,
      percentUsed,
      estimatedCost,
      daysUntilReset,
    };
  }

  /**
   * Manually reset usage (for testing or user request)
   */
  async reset(): Promise<void> {
    this.usage = {
      requests: 0,
      tokens: 0,
      lastReset: new Date().toISOString(),
    };
    await this.saveUsage();
  }

  /**
   * Get warning level based on usage
   */
  async getWarningLevel(): Promise<'none' | 'warning' | 'critical'> {
    const stats = await this.getUsage();

    if (stats.percentUsed >= 95) {
      return 'critical';
    } else if (stats.percentUsed >= 80) {
      return 'warning';
    }

    return 'none';
  }

  /**
   * Check if usage is approaching limits
   */
  async isApproachingLimit(): Promise<boolean> {
    const stats = await this.getUsage();
    return stats.percentUsed >= 80;
  }

  /**
   * Get usage warning message
   */
  async getWarningMessage(): Promise<string | null> {
    const level = await getWarningLevel();
    const stats = await this.getUsage();

    if (level === 'critical') {
      return `�a��� You've used ${stats.percentUsed}% of your monthly AI limit (${stats.requestsRemaining} requests left)`;
    } else if (level === 'warning') {
      return `You've used ${stats.percentUsed}% of your monthly AI limit`;
    }

    return null;
  }

  /**
   * Calculate days until monthly reset
   */
  private getDaysUntilReset(): number {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const daysRemaining = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysRemaining;
  }

  /**
   * Check if it's a new month and reset if needed
   */
  private async checkAndResetMonthly(): Promise<void> {
    const lastReset = new Date(this.usage.lastReset);
    const now = new Date();

    const isDifferentMonth =
      lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear();

    if (isDifferentMonth) {
 logger.log('x& New month detected, resetting AI usage stats');
      await this.reset();
    }
  }

  /**
   * Load usage from storage
   */
  private async loadUsage(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) {
        this.usage = JSON.parse(data);
      }
    } catch (error) {
 logger.error('Failed to load AI usage data:', error);
      // Keep defaults
    }
  }

  /**
   * Save usage to storage
   */
  private async saveUsage(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.usage));
    } catch (error) {
 logger.error('Failed to save AI usage data:', error);
    }
  }

  /**
   * Get limits for display
   */
  getLimits(): { requests: number; tokens: number } {
    return {
      requests: this.MONTHLY_REQUEST_LIMIT,
      tokens: this.MONTHLY_TOKEN_LIMIT,
    };
  }
}

export const aiUsageTracker = new AIUsageTracker();
