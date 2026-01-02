import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/utils/logger';
import { aiService } from './aiService';
import { FITNESS_COACH_SYSTEM_PROMPT } from './prompts';

export interface FormTip {
  exerciseName: string;
  cues: string[];
  commonMistakes: string[];
  breathingPattern: string;
  safetyTips?: string[];
  cachedAt: string;
}

// Pre-cached tips for common exercises (saves API calls & provides instant results)
const CACHED_TIPS: Record<string, FormTip> = {
  'bench press': {
    exerciseName: 'Bench Press',
    cues: [
      'Retract shoulder blades and squeeze them together',
      'Plant feet firmly on the floor',
      'Lower bar to mid-chest with elbows at 45°',
      'Drive through your feet as you press',
    ],
    commonMistakes: [
      'Bouncing bar off chest',
      'Flaring elbows to 90°',
      'Lifting hips off bench',
    ],
    breathingPattern: 'Inhale on the way down, exhale as you press up',
    safetyTips: ['Always use spotter for heavy weights', 'Use safety bars if training alone'],
    cachedAt: 'static',
  },
  'squat': {
    exerciseName: 'Squat',
    cues: [
      'Brace core before descending',
      'Push knees out over toes',
      'Keep chest up and back neutral',
      'Drive through full foot, not just heels',
    ],
    commonMistakes: [
      'Knees caving inward (valgus collapse)',
      'Rising onto toes',
      'Excessive forward lean',
    ],
    breathingPattern: 'Big breath at top, brace core, descend, exhale at top',
    safetyTips: ['Use safety bars in rack', 'Start light to master form'],
    cachedAt: 'static',
  },
  'deadlift': {
    exerciseName: 'Deadlift',
    cues: [
      'Bar over mid-foot, shins nearly touching',
      'Push the floor away rather than pulling up',
      'Keep bar close to body throughout',
      'Lock out with glutes, not by leaning back',
    ],
    commonMistakes: [
      'Rounding lower back',
      'Bar drifting away from body',
      'Jerking the bar off floor',
    ],
    breathingPattern: 'Breath and brace at bottom, exhale at lockout',
    safetyTips: ['Keep spine neutral throughout', 'Use belt for heavy loads'],
    cachedAt: 'static',
  },
  'overhead press': {
    exerciseName: 'Overhead Press',
    cues: [
      'Start with bar on upper chest',
      'Press bar up in straight line',
      'Move head back slightly to clear bar path',
      'Lock out overhead with biceps by ears',
    ],
    commonMistakes: [
      'Excessive lower back arch',
      'Pressing bar forward instead of up',
      'Not achieving full lockout',
    ],
    breathingPattern: 'Breath at bottom, press, exhale at top',
    cachedAt: 'static',
  },
  'pull-up': {
    exerciseName: 'Pull-up',
    cues: [
      'Start from dead hang with arms fully extended',
      'Pull shoulder blades down and back first',
      'Pull until chin clears bar',
      'Control descent, don\'t drop',
    ],
    commonMistakes: [
      'Using momentum/kipping',
      'Partial range of motion',
      'Shrugging shoulders at top',
    ],
    breathingPattern: 'Exhale as you pull up, inhale on the way down',
    cachedAt: 'static',
  },
  'barbell row': {
    exerciseName: 'Barbell Row',
    cues: [
      'Hinge at hips with chest over bar',
      'Pull to lower chest/upper abs',
      'Keep elbows close to body (45°)',
      'Squeeze shoulder blades at top',
    ],
    commonMistakes: [
      'Using too much body English',
      'Pulling to neck instead of chest',
      'Standing too upright',
    ],
    breathingPattern: 'Exhale as you row, inhale as you lower',
    cachedAt: 'static',
  },
  'romanian deadlift': {
    exerciseName: 'Romanian Deadlift',
    cues: [
      'Start from standing with slight knee bend',
      'Push hips back while maintaining neutral spine',
      'Lower bar along thighs to mid-shin',
      'Feel stretch in hamstrings, not lower back',
    ],
    commonMistakes: [
      'Squatting instead of hinging',
      'Rounding the back',
      'Bending knees too much',
    ],
    breathingPattern: 'Inhale as you lower, exhale as you stand',
    cachedAt: 'static',
  },
};

class FormTipsService {
  private cache = new Map<string, FormTip>();
  private readonly CACHE_STORAGE_KEY = '@gym/form_tips_cache';
  private isInitialized = false;

  /**
   * Get form tips for an exercise (with intelligent caching)
   */
  async getFormTips(exerciseName: string): Promise<FormTip> {
    // Initialize cache on first use
    if (!this.isInitialized) {
      await this.loadCache();
      this.isInitialized = true;
    }

    const normalizedName = exerciseName.toLowerCase().trim();
    
    // Check static cache first (instant results for common exercises)
    if (CACHED_TIPS[normalizedName]) {
      return CACHED_TIPS[normalizedName];
    }

    // Check dynamic cache
    const cached = this.cache.get(normalizedName);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    // Generate with AI
    try {
      const tips = await this.generateTips(exerciseName);
      this.cache.set(normalizedName, tips);
      await this.saveCache();
      return tips;
    } catch (error) {
 logger.error('Failed to generate form tips:', error);
      // Return generic tips on error
      return this.getGenericTips(exerciseName);
    }
  }

  /**
   * Generate tips using AI
   */
  private async generateTips(exerciseName: string): Promise<FormTip> {
    const prompt = `Provide concise form tips for the exercise: "${exerciseName}"

Respond in this exact JSON format:
{
  "exerciseName": "${exerciseName}",
  "cues": ["cue 1", "cue 2", "cue 3", "cue 4"],
  "commonMistakes": ["mistake 1", "mistake 2", "mistake 3"],
  "breathingPattern": "breathing instruction",
  "safetyTips": ["safety tip 1", "safety tip 2"]
}

Keep each cue under 12 words. Focus on the most critical technique points.`;

    const response = await aiService.askWithContext(
      FITNESS_COACH_SYSTEM_PROMPT,
      prompt,
      {
        temperature: 0.3, // Lower temp for consistent, factual responses
        maxTokens: 400,
      }
    );

    try {
      // Try to parse as JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          exerciseName: parsed.exerciseName || exerciseName,
          cues: parsed.cues || [],
          commonMistakes: parsed.commonMistakes || [],
          breathingPattern: parsed.breathingPattern || 'Breathe naturally',
          safetyTips: parsed.safetyTips,
          cachedAt: new Date().toISOString(),
        };
      }
    } catch (parseError) {
 logger.log('JSON parsing failed, extracting from text');
    }

    // Fallback: extract from text response
    return this.parseTextResponse(exerciseName, response);
  }

  /**
   * Parse tips from text response (fallback)
   */
  private parseTextResponse(exerciseName: string, text: string): FormTip {
    const lines = text.split('\n').filter(l => l.trim());
    const cues: string[] = [];
    const mistakes: string[] = [];
    const safetyTips: string[] = [];
    let breathingPattern = 'Exhale during exertion, inhale during release';
    
    for (const line of lines) {
      const cleanLine = line.replace(/^[-•*\d.]\s*/, '').trim();
      
      if (!cleanLine) continue;
      
      if (line.toLowerCase().includes('breathing') || line.toLowerCase().includes('breath')) {
        breathingPattern = cleanLine;
      } else if (line.toLowerCase().includes('safety') || line.toLowerCase().includes('spotter')) {
        safetyTips.push(cleanLine);
      } else if (line.toLowerCase().includes('mistake') || line.toLowerCase().includes('avoid') || line.toLowerCase().includes('don\'t')) {
        if (mistakes.length < 3) mistakes.push(cleanLine);
      } else if (line.match(/^\d\./) || line.match(/^[-•]/)) {
        if (cues.length < 4) cues.push(cleanLine);
      }
    }

    return {
      exerciseName,
      cues: cues.length > 0 ? cues : [
        'Maintain proper form throughout',
        'Control the weight',
        'Full range of motion',
        'Keep core engaged',
      ],
      commonMistakes: mistakes.length > 0 ? mistakes : [
        'Using too much weight',
        'Rushing through reps',
        'Poor posture',
      ],
      breathingPattern,
      safetyTips: safetyTips.length > 0 ? safetyTips : undefined,
      cachedAt: new Date().toISOString(),
    };
  }

  /**
   * Generic tips fallback
   */
  private getGenericTips(exerciseName: string): FormTip {
    return {
      exerciseName,
      cues: [
        'Maintain neutral spine throughout movement',
        'Control the weight, avoid using momentum',
        'Use full range of motion',
        'Keep core engaged and stable',
      ],
      commonMistakes: [
        'Using too much weight sacrificing form',
        'Rushing through reps',
        'Not maintaining proper posture',
      ],
      breathingPattern: 'Exhale during exertion, inhale during release',
      safetyTips: ['Start with lighter weight to master form', 'Ask for a spotter when needed'],
      cachedAt: 'generic',
    };
  }

  /**
   * Check if cached tip is still valid (30 days)
   */
  private isCacheValid(tip: FormTip): boolean {
    if (tip.cachedAt === 'static' || tip.cachedAt === 'generic') {
      return true;
    }

    const cachedDate = new Date(tip.cachedAt);
    const now = new Date();
    const daysSince = (now.getTime() - cachedDate.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSince < 30; // Cache valid for 30 days
  }

  /**
   * Load cache from AsyncStorage
   */
  private async loadCache(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(this.CACHE_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        this.cache = new Map(Object.entries(parsed));
 logger.log(`xa Loaded ${this.cache.size} cached form tips`);
      }
    } catch (error) {
 logger.error('Failed to load form tips cache:', error);
    }
  }

  /**
   * Save cache to AsyncStorage
   */
  private async saveCache(): Promise<void> {
    try {
      const obj = Object.fromEntries(this.cache);
      await AsyncStorage.setItem(this.CACHE_STORAGE_KEY, JSON.stringify(obj));
    } catch (error) {
 logger.error('Failed to save form tips cache:', error);
    }
  }

  /**
   * Clear all cached tips
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    await AsyncStorage.removeItem(this.CACHE_STORAGE_KEY);
 logger.log('x Form tips cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { staticCount: number; dynamicCount: number; total: number } {
    return {
      staticCount: Object.keys(CACHED_TIPS).length,
      dynamicCount: this.cache.size,
      total: Object.keys(CACHED_TIPS).length + this.cache.size,
    };
  }
}

export const formTipsService = new FormTipsService();
