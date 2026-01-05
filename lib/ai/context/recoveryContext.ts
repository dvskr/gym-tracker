/**
 * Recovery and wellness context building for AI prompts
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

/**
 * Build recovery context from daily check-in
 */
export const buildRecoveryContext = async (userId: string): Promise<string> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('checkin_date', today)
      .single();

    if (error || !data) {
      return '';
    }

    let context = '\nToday\'s Recovery Status:\n';
    
    if (data.sleep_quality) {
      const quality = ['Terrible', 'Poor', 'Average', 'Good', 'Excellent'][data.sleep_quality - 1];
      context += `- Sleep Quality: ${quality} (${data.sleep_quality}/5)`;
      if (data.sleep_hours) {
        context += ` - ${data.sleep_hours} hours`;
      }
      context += '\n';
    }
    
    if (data.energy_level) {
      const energy = ['Very Low', 'Low', 'Moderate', 'High', 'Very High'][data.energy_level - 1];
      context += `- Energy Level: ${energy} (${data.energy_level}/5)\n`;
    }
    
    if (data.stress_level) {
      const stress = ['Very Low', 'Low', 'Moderate', 'High', 'Very High'][data.stress_level - 1];
      context += `- Stress Level: ${stress} (${data.stress_level}/5)\n`;
    }
    
    if (data.soreness_level) {
      const soreness = ['None', 'Mild', 'Moderate', 'Significant', 'Severe'][data.soreness_level - 1];
      context += `- Muscle Soreness: ${soreness} (${data.soreness_level}/5)\n`;
    }

    if (data.notes) {
      context += `- Notes: ${data.notes}\n`;
    }

    // Add recommendations based on recovery status
    const recommendations: string[] = [];
    
    if (data.sleep_quality && data.sleep_quality <= 2) {
      recommendations.push('Poor sleep detected - consider lighter training or deload');
    }
    
    if (data.energy_level && data.energy_level <= 2) {
      recommendations.push('Low energy - focus on recovery or light movement');
    }
    
    if (data.stress_level && data.stress_level >= 4) {
      recommendations.push('High stress - avoid high-intensity training, prioritize rest');
    }
    
    if (data.soreness_level && data.soreness_level >= 4) {
      recommendations.push('High soreness - consider active recovery, mobility work');
    }

    if (recommendations.length > 0) {
      context += '\nRecovery Recommendations:\n';
      recommendations.forEach(rec => {
        context += `⚠️ ${rec}\n`;
      });
    }

    return context;
  } catch (error) {
    logger.error('Error building recovery context:', error);
    return '';
  }
};

/**
 * Build injury/limitation context for AI prompts
 */
export const buildInjuryContext = async (userId: string): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('user_injuries')
      .select('body_part, injury_type, severity, avoid_exercises, avoid_movements, notes')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error || !data || data.length === 0) {
      return '';
    }

    let context = '\n⚠️ IMPORTANT - Active Injuries/Limitations:\n';
    
    for (const injury of data) {
      context += `\n${injury.body_part.replace('_', ' ').toUpperCase()}`;
      if (injury.injury_type) {
        context += ` (${injury.injury_type})`;
      }
      context += ` - Severity: ${injury.severity}\n`;
      
      if (injury.avoid_movements && injury.avoid_movements.length > 0) {
        context += `  ❌ Avoid movements: ${injury.avoid_movements.join(', ')}\n`;
      }
      
      if (injury.avoid_exercises && injury.avoid_exercises.length > 0) {
        context += `  ❌ Avoid exercises: ${injury.avoid_exercises.join(', ')}\n`;
      }
      
      if (injury.notes) {
        context += `  📝 Note: ${injury.notes}\n`;
      }
    }

    context += '\n⚠️ CRITICAL INSTRUCTIONS:\n';
    context += '- DO NOT suggest any avoided exercises or movements\n';
    context += '- Suggest safe alternatives that don\'t stress injured areas\n';
    context += '- Consider injury severity when programming volume/intensity\n';
    context += '- Prioritize injury-safe exercises even if suboptimal\n';

    return context;
  } catch (error) {
    logger.error('Error building injury context:', error);
    return '';
  }
};

