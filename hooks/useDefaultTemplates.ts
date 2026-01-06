import { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import { fetchDefaultTemplates, getEnrichedFallbackTemplates, FALLBACK_TEMPLATES, DefaultTemplate } from '@/lib/templates/defaultTemplates';

export function useDefaultTemplates() {
  const [templates, setTemplates] = useState<DefaultTemplate[]>(FALLBACK_TEMPLATES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTemplates() {
      setIsLoading(true);
      try {
        const dbTemplates = await fetchDefaultTemplates();
        
        // Only use DB templates if we got valid results
        if (dbTemplates.length > 0 && dbTemplates.every(t => t.exercises.length >= 3)) {
          setTemplates(dbTemplates);
        } else {
 logger.log('Using enriched fallback templates - DB templates incomplete');
          // Use enriched fallback templates that match exercise names to database
          const enrichedFallbacks = await getEnrichedFallbackTemplates();
          if (enrichedFallbacks.length > 0) {
            setTemplates(enrichedFallbacks);
          } else {
            // Last resort: use raw fallback templates
            setTemplates(FALLBACK_TEMPLATES);
          }
        }
      } catch (err: unknown) {
 logger.error('Error loading default templates:', err);
        setError('Failed to load templates');
        // Try to use enriched fallbacks even on error
        try {
          const enrichedFallbacks = await getEnrichedFallbackTemplates();
          if (enrichedFallbacks.length > 0) {
            setTemplates(enrichedFallbacks);
          } else {
            setTemplates(FALLBACK_TEMPLATES);
          }
        } catch {
          setTemplates(FALLBACK_TEMPLATES);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadTemplates();
  }, []);

  return { templates, isLoading, error };
}

