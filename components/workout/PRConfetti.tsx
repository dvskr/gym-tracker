import React, { useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { registerConfettiTrigger, unregisterConfettiTrigger } from '@/lib/utils/celebrations';
import { logger } from '@/lib/utils/logger';

const { width } = Dimensions.get('window');

/**
 * PR Confetti Component
 * 
 * Renders celebration confetti when a PR is achieved.
 * Automatically registers with the celebration system.
 * 
 * Usage:
 * ```tsx
 * <View style={styles.container}>
 *   {/* Your workout UI *\/}
 *   <PRConfetti />  {/* Add at the end, renders above everything *\/}
 * </View>
 * ```
 * 
 * The confetti is triggered automatically via the celebration system
 * when celebratePR() is called elsewhere in the app.
 */

export interface PRConfettiRef {
  fire: () => void;
}

export const PRConfetti = forwardRef<PRConfettiRef>((_, ref) => {
  const [shooting, setShooting] = useState(false);

  /**
   * Trigger confetti animation
   */
  const fire = useCallback(() => {
    logger.log('[PRConfetti] 🎉 FIRE CALLED - Starting confetti animation');
    setShooting(true);
    logger.log('[PRConfetti] shooting state set to true');
  }, []);

  // Expose fire method via ref (for imperative control if needed)
  useImperativeHandle(ref, () => ({
    fire,
  }));

  /**
   * Register with celebration system on mount
   * Unregister on unmount
   */
  useEffect(() => {
    logger.log('[PRConfetti] Component mounted - registering trigger');
    registerConfettiTrigger(fire);
    logger.log('[PRConfetti] Trigger registered successfully');

    return () => {
      logger.log('[PRConfetti] Component unmounting - unregistering trigger');
      unregisterConfettiTrigger();
    };
  }, [fire]);

  /**
   * Reset shooting state after animation completes
   */
  const handleAnimationEnd = useCallback(() => {
    logger.log('[PRConfetti] Animation complete');
    setShooting(false);
  }, []);

  // Don't render anything if not shooting
  if (!shooting) {
    return null;
  }

  logger.log('[PRConfetti] Rendering ConfettiCannon component');

  return (
    <ConfettiCannon
      count={150}
      origin={{ x: width / 2, y: -20 }}
      autoStart
      fadeOut
      explosionSpeed={400}
      fallSpeed={2500}
      colors={[
        '#FFD700', // Gold
        '#FFA500', // Orange
        '#FF6347', // Tomato
        '#00CED1', // Dark Turquoise
        '#9370DB', // Medium Purple
        '#3CB371', // Medium Sea Green
        '#FF69B4', // Hot Pink
        '#4169E1', // Royal Blue
      ]}
      onAnimationEnd={handleAnimationEnd}
      style={styles.confetti}
    />
  );
});

PRConfetti.displayName = 'PRConfetti';

const styles = StyleSheet.create({
  confetti: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    pointerEvents: 'none', // Don't block touches
  },
});

