import { Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Template } from '@/lib/api/templates';

// ============================================
// Text Generation
// ============================================

/**
 * Generate shareable text format for a template
 */
export function generateTemplateShareText(template: Template): string {
  let text = `🏋️ ${template.name} Template\n\n`;

  if (template.description) {
    text += `${template.description}\n\n`;
  }

  text += `Exercises:\n`;

  (template.exercises || []).forEach((ex, index) => {
    const exerciseName = ex.exercise?.name || 'Unknown Exercise';
    const sets = ex.target_sets || 3;

    let repsText = '';
    if (ex.target_reps_min && ex.target_reps_max) {
      repsText = `${ex.target_reps_min}-${ex.target_reps_max}`;
    } else if (ex.target_reps_min) {
      repsText = `${ex.target_reps_min}`;
    } else if (ex.target_reps_max) {
      repsText = `${ex.target_reps_max}`;
    } else {
      repsText = '8-12';
    }

    text += `${index + 1}. ${exerciseName} - ${sets} sets × ${repsText} reps\n`;
  });

  if (template.target_muscles && template.target_muscles.length > 0) {
    text += `\nTarget: ${template.target_muscles.join(', ')}`;
  }

  if (template.estimated_duration) {
    text += `\nDuration: ~${template.estimated_duration} min`;
  }

  text += `\n\nCreated with GymTracker 💪`;

  return text;
}

/**
 * Generate detailed text with instructions
 */
export function generateDetailedShareText(template: Template): string {
  let text = `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🏋️ ${template.name.toUpperCase()}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (template.description) {
    text += `📝 ${template.description}\n\n`;
  }

  if (template.target_muscles && template.target_muscles.length > 0) {
    text += `🎯 Target: ${template.target_muscles.join(' • ')}\n`;
  }

  if (template.estimated_duration) {
    text += `⏱️ Duration: ~${template.estimated_duration} min\n`;
  }

  text += `\n📋 EXERCISES\n`;
  text += `────────────────────────\n`;

  (template.exercises || []).forEach((ex, index) => {
    const exerciseName = ex.exercise?.name || 'Unknown Exercise';
    const sets = ex.target_sets || 3;

    let repsText = '';
    if (ex.target_reps_min && ex.target_reps_max) {
      repsText = `${ex.target_reps_min}-${ex.target_reps_max}`;
    } else if (ex.target_reps_min) {
      repsText = `${ex.target_reps_min}`;
    } else {
      repsText = '8-12';
    }

    text += `\n${index + 1}. ${exerciseName}\n`;
    text += `   ${sets} sets × ${repsText} reps`;

    if (ex.rest_seconds) {
      text += ` • ${ex.rest_seconds}s rest`;
    }

    text += `\n`;

    if (ex.notes) {
      text += `   💡 ${ex.notes}\n`;
    }
  });

  text += `\n────────────────────────\n`;
  text += `Created with GymTracker 💪\n`;

  return text;
}

// ============================================
// JSON Export
// ============================================

/**
 * Generate exportable JSON format
 */
export function generateTemplateJSON(template: Template): string {
  const exportData = {
    version: '1.0',
    type: 'gym_tracker_template',
    exported_at: new Date().toISOString(),
    template: {
      name: template.name,
      description: template.description,
      target_muscles: template.target_muscles,
      estimated_duration: template.estimated_duration,
      exercises: (template.exercises || []).map((ex) => ({
        name: ex.exercise?.name,
        external_id: ex.exercise?.external_id,
        target_sets: ex.target_sets,
        target_reps_min: ex.target_reps_min,
        target_reps_max: ex.target_reps_max,
        target_weight: ex.target_weight,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes,
      })),
    },
  };

  return JSON.stringify(exportData, null, 2);
}

// ============================================
// Share Functions
// ============================================

/**
 * Copy template text to clipboard
 */
export async function copyTemplateToClipboard(template: Template): Promise<boolean> {
  try {
    const text = generateTemplateShareText(template);
    await Clipboard.setStringAsync(text);
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
}

/**
 * Share template via system share sheet
 */
export async function shareTemplate(template: Template): Promise<boolean> {
  try {
    const text = generateTemplateShareText(template);

    const result = await Share.share(
      {
        message: text,
        title: `${template.name} - Workout Template`,
      },
      {
        dialogTitle: 'Share Template',
        subject: `${template.name} - Workout Template`,
      }
    );

    return result.action === Share.sharedAction;
  } catch (error) {
    console.error('Error sharing template:', error);
    return false;
  }
}

/**
 * Share template as JSON (for import)
 */
export async function shareTemplateAsJSON(template: Template): Promise<boolean> {
  try {
    const json = generateTemplateJSON(template);

    const result = await Share.share(
      {
        message: json,
        title: `${template.name}.json`,
      },
      {
        dialogTitle: 'Export Template',
        subject: `${template.name} - Template Export`,
      }
    );

    return result.action === Share.sharedAction;
  } catch (error) {
    console.error('Error exporting template:', error);
    return false;
  }
}

/**
 * Copy JSON to clipboard
 */
export async function copyTemplateJSONToClipboard(template: Template): Promise<boolean> {
  try {
    const json = generateTemplateJSON(template);
    await Clipboard.setStringAsync(json);
    return true;
  } catch (error) {
    console.error('Error copying JSON to clipboard:', error);
    return false;
  }
}

