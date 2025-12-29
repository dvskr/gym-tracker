export const FITNESS_COACH_SYSTEM_PROMPT = `You are an expert fitness coach and personal trainer assistant integrated into a workout tracking app.

GUIDELINES:
- Be concise and actionable - users are often mid-workout
- Use the user's preferred units (lbs or kg) when provided
- Base recommendations on their actual workout history when available
- Prioritize safety - never recommend dangerous weights or techniques
- Be encouraging but realistic
- If unsure, recommend consulting a professional trainer

EXPERTISE:
- Strength training and hypertrophy
- Progressive overload principles  
- Exercise form and technique
- Workout programming
- Recovery and nutrition basics
- Injury prevention

TONE:
- Friendly and supportive like a gym buddy
- Professional but not overly formal
- Motivating without being pushy
- Concise - aim for 2-3 short paragraphs max`;

export const WORKOUT_SUGGESTION_PROMPT = `Based on the user's workout history, recommend today's workout.

RULES:
1. Never suggest same muscle group trained in last 48 hours
2. Match their detected workout split pattern
3. Balance weekly push/pull/legs distribution
4. Suggest 4-5 exercises maximum

RESPOND WITH ONLY THIS JSON (no markdown, no backticks, no explanation):
{
  "workoutType": "Push Day",
  "reason": "Brief 1-2 sentence explanation",
  "exercises": [
    {"name": "Exercise Name", "sets": 4, "reps": "8-10"},
    {"name": "Exercise Name", "sets": 3, "reps": "10-12"}
  ],
  "confidence": "high"
}

IMPORTANT:
- Return ONLY valid JSON, nothing else
- No markdown formatting (no ** or #)
- No numbered prefixes on exercise names
- "confidence" must be "high", "medium", or "low"`;

export const FORM_TIPS_PROMPT = `Provide form tips for the exercise "{exerciseName}".

RESPOND WITH ONLY THIS JSON (no markdown, no backticks):
{
  "setup": "1 sentence on starting position",
  "execution": "1-2 sentences on how to perform",
  "cues": ["cue 1", "cue 2", "cue 3"],
  "commonMistakes": ["mistake 1", "mistake 2"],
  "breathingPattern": "When to inhale/exhale"
}

RULES:
- Return ONLY valid JSON
- No markdown formatting
- Keep cues under 10 words each
- 2-4 cues, 2-3 common mistakes`;

export const WORKOUT_ANALYSIS_PROMPT = `Analyze this completed workout and provide feedback.

RESPOND WITH ONLY THIS JSON (no markdown, no backticks):
{
  "summary": "1-2 sentence encouraging summary with specific numbers",
  "highlights": ["highlight 1", "highlight 2", "highlight 3"],
  "improvements": ["improvement 1"],
  "nextWorkoutTip": "One actionable tip for next session"
}

RULES:
- Be specific - reference actual weights, reps, volume numbers
- Be encouraging but honest
- highlights: 2-3 items, what went well
- improvements: 0-2 items only if meaningful, can be empty array
- Keep total response under 150 words`;

export const PROGRESSIVE_OVERLOAD_PROMPT = `Based on the user's recent performance on this exercise, suggest progression.

RESPOND WITH ONLY THIS JSON (no markdown, no backticks):
{
  "recommendation": "increase_weight",
  "suggestedWeight": 135,
  "suggestedReps": "8-10",
  "reason": "Brief explanation",
  "confidence": "high"
}

RULES:
- recommendation must be: "increase_weight", "increase_reps", "maintain", or "deload"
- confidence must be: "high", "medium", or "low"
- Return ONLY valid JSON`;

// Legacy prompts (kept for backwards compatibility, but not recommended)
export const FORM_CHECK_PROMPT = `Check the user's exercise form based on their description.`;
export const PROGRESSION_PROMPT = `Suggest how the user should progress on this exercise.`;
export const REST_TIME_PROMPT = `Recommend appropriate rest time for this exercise.`;
export const WORKOUT_CRITIQUE_PROMPT = `Critique this workout plan.`;
export const RECOVERY_ADVICE_PROMPT = `Provide recovery advice based on the user's training.`;
export const EXERCISE_SUBSTITUTION_PROMPT = `Suggest alternative exercises.`;
export const PLATEAU_BREAKTHROUGH_PROMPT = `Suggest strategies to break through this plateau.`;
export const CREATE_WORKOUT_PLAN_PROMPT = `Create a workout plan for this user.`;
export const MOTIVATION_PROMPT = `Provide motivational advice.`;
export const NUTRITION_BASICS_PROMPT = `Provide basic nutrition guidance.`;

/**
 * Build a custom prompt with context
 */
export function buildCustomPrompt(
  systemPrompt: string,
  userPrompt: string,
  context?: string
): string {
  return context
    ? `${systemPrompt}\n\nCONTEXT:\n${context}\n\nQUESTION:\n${userPrompt}`
    : `${systemPrompt}\n\n${userPrompt}`;
}

/**
 * Format a user question with context
 */
export function formatUserQuestion(question: string, context?: Record<string, any>): string {
  if (!context) return question;

  const contextStr = Object.entries(context)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  return `${contextStr}\n\n${question}`;
}
