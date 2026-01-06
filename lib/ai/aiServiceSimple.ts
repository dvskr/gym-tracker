import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  limits: {
    used: number;
    limit: number;
    remaining: number;
  };
}

export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

class AIService {
  async complete(messages: AIMessage[], options: AIOptions = {}): Promise<AIResponse> {
    const { data, error } = await supabase.functions.invoke('ai-complete', {
      body: { messages, options },
    });

    if (error) {
 logger.error('AI request failed:', error);
      
      // Check if rate limited
      if (error.message?.includes('rate_limit') || error.status === 429) {
        throw new Error('Daily AI limit reached. Upgrade for more!');
      }
      
      throw new Error('AI service unavailable');
    }

    return data;
  }

  async ask(prompt: string, options?: AIOptions): Promise<string> {
    const response = await this.complete(
      [{ role: 'user', content: prompt }],
      options
    );
    return response.content;
  }

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
}

export const aiService = new AIService();

