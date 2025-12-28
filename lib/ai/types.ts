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
    costCents?: number;
  };
  limits?: {
    used: number;
    limit: number;
    remaining: number;
    tier: string;
  };
  isFallback?: boolean;
}

export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  requestType?: string;
}

export interface AIUsageStats {
  today: { requests: number; tokens: number; cost_cents: number };
  month: { requests: number; tokens: number; cost_cents: number };
  all_time: { requests: number; tokens: number; cost_cents: number };
}

export interface AILimitStatus {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  tier: 'free' | 'premium';
  is_premium: boolean;
}

export class AILimitError extends Error {
  constructor(
    message: string,
    public limits: AILimitStatus
  ) {
    super(message);
    this.name = 'AILimitError';
  }
}

