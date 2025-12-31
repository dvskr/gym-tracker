import { useEffect, useState } from 'react';
import { preloadAllImages, preloadThumbnails, preloadGifs } from '@/lib/images/preloadService';

interface PreloadState {
  isLoading: boolean;
  progress: number;
  phase: 'idle' | 'thumbnails' | 'gifs' | 'complete';
}

export function useImagePreload(options?: {
  thumbnailsOnly?: boolean;
  gifsOnly?: boolean;
  enabled?: boolean;
}) {
  const [state, setState] = useState<PreloadState>({
    isLoading: false,
    progress: 0,
    phase: 'idle',
  });

  useEffect(() => {
    if (options?.enabled === false) return;

    const preload = async () => {
      setState({ isLoading: true, progress: 0, phase: 'thumbnails' });

      try {
        if (options?.thumbnailsOnly) {
          await preloadThumbnails((p) => {
            setState({ isLoading: true, progress: p.percentage, phase: 'thumbnails' });
          });
        } else if (options?.gifsOnly) {
          await preloadGifs((p) => {
            setState({ isLoading: true, progress: p.percentage, phase: 'gifs' });
          });
        } else {
          await preloadAllImages((p) => {
            setState({
              isLoading: true,
              progress: p.percentage,
              phase: p.percentage < 50 ? 'thumbnails' : 'gifs',
            });
          });
        }
      } catch (error) {
        console.error('[useImagePreload] Error:', error);
      }

      setState({ isLoading: false, progress: 100, phase: 'complete' });
    };

    preload();
  }, [options?.enabled, options?.thumbnailsOnly, options?.gifsOnly]);

  return state;
}

