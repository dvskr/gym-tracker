import { useState, useCallback } from 'react';
import { aiService } from '@/lib/ai/aiService';
import { AIMessage, AIOptions, AIResponse, AILimitError } from '@/lib/ai/types';
import { useAIStore } from '@/stores/aiStore';

export function useAIRequest() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const { limits, setLimits, decrementRemaining } = useAIStore();

  const makeRequest = useCallback(async (
    messages: AIMessage[],
    options?: AIOptions
  ): Promise<AIResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await aiService.complete(messages, options);
      
      // Update store with new limits
      if (response.limits) {
        setLimits(response.limits as any);
      } else {
        decrementRemaining();
      }

      return response;

    } catch (err) {
      if (err instanceof AILimitError) {
        setLimits(err.limits);
        setShowLimitModal(true);
        setError('Daily AI limit reached');
      } else {
        setError('AI request failed. Please try again.');
      }
      return null;

    } finally {
      setIsLoading(false);
    }
  }, [setLimits, decrementRemaining]);

  const closeLimitModal = useCallback(() => {
    setShowLimitModal(false);
  }, []);

  return {
    makeRequest,
    isLoading,
    error,
    showLimitModal,
    closeLimitModal,
    limits,
  };
}

