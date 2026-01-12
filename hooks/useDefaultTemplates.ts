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
        // Use enriched fallback templates as primary source - they have curated exercise names
        // that match exactly with database entries, avoiding fuzzy matching issues
        const enrichedFallbacks = await getEnrichedFallbackTemplates();
        
        if (enrichedFallbacks.length > 0 && enrichedFallbacks.every(t => t.exercises.length >= 3)) {
          setTemplates(enrichedFallbacks);
        } else {
          // Fallback to dynamically fetched templates if enrichment fails
          logger.log('Enriched fallbacks incomplete, trying dynamic fetch');
          const dbTemplates = await fetchDefaultTemplates();
          if (dbTemplates.length > 0 && dbTemplates.every(t => t.exercises.length >= 3)) {
            setTemplates(dbTemplates);
          } else {
            // Last resort: use raw fallback templates
            setTemplates(FALLBACK_TEMPLATES);
          }
        }
      } catch (err: unknown) {
        logger.error('Error loading default templates:', err);
        setError('Failed to load templates');
        // Use raw fallback templates on error
        setTemplates(FALLBACK_TEMPLATES);
      } finally {
        setIsLoading(false);
      }
    }

    loadTemplates();
  }, []);

  return { templates, isLoading, error };
}


