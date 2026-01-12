const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function generateExerciseMenu() {
  // Fetch ONLY active exercises
  const { data, error, count } = await supabase
    .from('exercises')
    .select('name, category, primary_muscles, equipment', { count: 'exact' })
    .eq('is_active', true)
    .order('category')
    .order('name');

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log(`Fetched ${count} active exercises from database`);

  // Group by category
  const grouped = {};
  data.forEach(exercise => {
    const category = exercise.category || 'other';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(exercise.name);
  });

  // Build output string
  let output = '// AUTO-GENERATED: All active exercises from database\n';
  output += '// Do not edit manually - regenerate using: node scripts/generate-exercise-menu.js\n\n';
  output += 'export const AI_EXERCISE_MENU = {\n';
  Object.keys(grouped).sort().forEach(category => {
    output += `  '${category}': [\n`;
    grouped[category].forEach(name => {
      output += `    '${name.replace(/'/g, "\\'")}',\n`;
    });
    output += '  ],\n';
  });
  output += '};\n\n';
  output += `// Total: ${data.length} active exercises across ${Object.keys(grouped).length} categories\n\n`;
  
  // Add helper function that uses ALL exercises
  output += `/**
 * Get a formatted string of exercises for AI prompt
 * Returns ALL available exercises organized by category
 */
export function getExercisePromptList(): string {
  let prompt = '🏋️ AVAILABLE EXERCISES - Use EXACT names from this list:\\n\\n';
  
  // Use ALL exercises from the database
  Object.entries(AI_EXERCISE_MENU).forEach(([category, exercises]) => {
    prompt += \`\${category.toUpperCase()} (\${exercises.length}):\\n\`;
    prompt += exercises.join(', ') + '\\n\\n';
  });
  
  prompt += '⚠️ CRITICAL RULES:\\n';
  prompt += '1. Use ONLY exercises from the list above (EXACT names, case-insensitive)\\n';
  prompt += '2. Do NOT make up exercise names\\n';
  prompt += '3. Do NOT modify or abbreviate names\\n';
  prompt += '4. Choose 4-6 exercises that work well together\\n';
  
  return prompt;
}

/**
 * Get all exercise names as a flat array for validation
 */
export function getAllExerciseNames(): string[] {
  return Object.values(AI_EXERCISE_MENU).flat();
}
`;

  // Write to file with UTF-8 encoding (no BOM)
  const outputPath = path.join(__dirname, '..', 'lib', 'ai', 'exerciseMenu.ts');
  fs.writeFileSync(outputPath, output, { encoding: 'utf8' });
  
  console.log(`✅ Generated ${outputPath}`);
  console.log(`✅ Total: ${data.length} active exercises across ${Object.keys(grouped).length} categories`);
  
  // Show category breakdown
  console.log('\nCategory breakdown:');
  Object.keys(grouped).sort().forEach(cat => {
    console.log(`  ${cat}: ${grouped[cat].length} exercises`);
  });
}

generateExerciseMenu().catch(console.error);
