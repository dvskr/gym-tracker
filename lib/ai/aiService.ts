import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { 
  AIMessage, 
  AIResponse, 
  AIOptions, 
  AILimitStatus, 
  AIUsageStats,
  AILimitError 
} from './types';

class AIService {
  private cachedLimits: AILimitStatus | null = null;
  private limitsLastFetched: number = 0;
  private readonly LIMITS_CACHE_MS = 30000; // Cache for 30 seconds

  // ==========================================
  // CHECK USAGE LIMITS
  // ==========================================
  async checkLimits(forceRefresh = false): Promise<AILimitStatus> {
    const now = Date.now();
    
    // Return cached if fresh
    if (
      !forceRefresh && 
      this.cachedLimits && 
      (now - this.limitsLastFetched) < this.LIMITS_CACHE_MS
    ) {
      return this.cachedLimits;
    }

    const user = useAuthStore.getState().user;
    if (!user) {
      return {
        allowed: false,
        used: 0,
        limit: 0,
        remaining: 0,
        tier: 'free',
        is_premium: false,
      };
    }

    try {
      const { data, error } = await supabase.rpc('can_use_ai', {
        p_user_id: user.id,
      });

      if (error) throw error;

      this.cachedLimits = data;
      this.limitsLastFetched = now;
      return data;

    } catch (error) {
      console.error('Failed to check AI limits:', error);
      // Default to allowing (fail open for UX)
      return {
        allowed: true,
        used: 0,
        limit: 10,
        remaining: 10,
        tier: 'free',
        is_premium: false,
      };
    }
  }

  // ==========================================
  // GET USAGE STATS
  // ==========================================
  async getUsageStats(): Promise<AIUsageStats | null> {
    const user = useAuthStore.getState().user;
    if (!user) return null;

    try {
      const { data, error } = await supabase.rpc('get_ai_usage_stats', {
        p_user_id: user.id,
      });

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Failed to get AI usage stats:', error);
      return null;
    }
  }

  // ==========================================
  // MAIN COMPLETION METHOD
  // ==========================================
  async complete(
    messages: AIMessage[],
    options: AIOptions = {}
  ): Promise<AIResponse> {
    // 1. Verify user is authenticated
    const user = useAuthStore.getState().user;
    if (!user) {
      throw new Error('Please log in to use AI features');
    }

    // 2. Check limits
    const limits = await this.checkLimits();

    if (!limits.allowed) {
      throw new AILimitError(
        `Daily AI limit reached (${limits.used}/${limits.limit})`,
        limits
      );
    }

    try {
      // 3. Verify Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Session expired. Please log in again.');
      }

      // 4. Call Edge Function
      const { data, error } = await supabase.functions.invoke('ai-complete', {
        body: { messages, options },
      });

      if (error) {
        // Check if it's a rate limit error
        if (error.message?.includes('rate_limit') || error.status === 429) {
          try {
            const errorData = JSON.parse(error.message || '{}');
            throw new AILimitError(
              errorData.message || 'Rate limit exceeded',
              errorData
            );
          } catch (parseError) {
            throw new AILimitError('Rate limit exceeded', {
              allowed: false,
              used: limits.used,
              limit: limits.limit,
              remaining: 0,
              tier: limits.tier,
              is_premium: limits.is_premium,
            });
          }
        }
        throw error;
      }

      // Log successful response for debugging
      // 3. Update cached limits
      if (data.limits) {
        this.cachedLimits = {
          ...this.cachedLimits!,
          used: data.limits.used,
          remaining: data.limits.remaining,
        };
      }

      return {
        content: data.content,
        usage: data.usage,
        limits: data.limits,
      };

    } catch (error) {
      // Re-throw limit errors
      if (error instanceof AILimitError) {
        throw error;
      }

      console.error('AI completion failed:', error);
      
      // Return fallback response
      return this.getFallbackResponse(messages, options);
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  // Simple text completion
  async ask(prompt: string, options?: AIOptions): Promise<string> {
    const response = await this.complete(
      [{ role: 'user', content: prompt }],
      options
    );
    return response.content;
  }

  // With system prompt
  async askWithContext(
    systemPrompt: string,
    userPrompt: string,
    options?: AIOptions
  ): Promise<string> {
    const response = await this.complete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      options
    );
    return response.content;
  }

  // ==========================================
  // FALLBACK RESPONSES
  // ==========================================
  private getFallbackResponse(
    messages: AIMessage[],
    options: AIOptions
  ): AIResponse {
    // Determine request type and return appropriate fallback
    const requestType = options.requestType || 'general';
    
    const fallbacks: Record<string, string> = {
      workout_suggestion: 'Based on your recent training, consider doing a Push workout today focusing on chest and shoulders.',
      form_tips: 'Focus on controlled movement, maintain proper posture, and breathe steadily throughout each rep.',
      analysis: 'Great workout! You completed all your sets. Keep up the consistency!',
      general: 'AI is temporarily unavailable. Please try again in a moment.',
    };

    return {
      content: fallbacks[requestType] || fallbacks.general,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      isFallback: true,
    };
  }

  // Clear cached limits (call after subscription change)
  clearCache(): void {
    this.cachedLimits = null;
    this.limitsLastFetched = 0;
  }
}

export const aiService = new AIService();
