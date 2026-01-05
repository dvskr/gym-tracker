import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function exportExercises() {
  console.log('Fetching exercises from database...');
  
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, equipment, primary_muscles, category')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching exercises:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('No exercises found.');
    process.exit(0);
  }

  console.log(`Found ${data.length} active exercises. Generating markdown...`);

  // Generate markdown content
  let markdown = `# Active Exercises List\n\n`;
  markdown += `**Total Exercises:** ${data.length}\n\n`;
  markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  markdown += `---\n\n`;

  // Group by category
  const byCategory: { [key: string]: typeof data } = {};
  data.forEach(exercise => {
    const cat = exercise.category || 'Uncategorized';
    if (!byCategory[cat]) {
      byCategory[cat] = [];
    }
    byCategory[cat].push(exercise);
  });

  // Write by category
  markdown += `## Exercises by Category\n\n`;
  Object.keys(byCategory).sort().forEach(category => {
    markdown += `### ${category} (${byCategory[category].length})\n\n`;
    markdown += `| Name | Equipment | Primary Muscles | ID |\n`;
    markdown += `|------|-----------|-----------------|----|\n`;
    byCategory[category].forEach(exercise => {
      const muscles = exercise.primary_muscles?.join(', ') || 'N/A';
      markdown += `| ${exercise.name} | ${exercise.equipment || 'N/A'} | ${muscles} | \`${exercise.id}\` |\n`;
    });
    markdown += `\n`;
  });

  // Group by equipment
  const byEquipment: { [key: string]: typeof data } = {};
  data.forEach(exercise => {
    const equip = exercise.equipment || 'No Equipment';
    if (!byEquipment[equip]) {
      byEquipment[equip] = [];
    }
    byEquipment[equip].push(exercise);
  });

  markdown += `---\n\n`;
  markdown += `## Exercises by Equipment\n\n`;
  Object.keys(byEquipment).sort().forEach(equipment => {
    markdown += `### ${equipment} (${byEquipment[equipment].length})\n\n`;
    markdown += `| Name | Category | Primary Muscles |\n`;
    markdown += `|------|----------|----------------|\n`;
    byEquipment[equipment].forEach(exercise => {
      const muscles = exercise.primary_muscles?.join(', ') || 'N/A';
      markdown += `| ${exercise.name} | ${exercise.category || 'N/A'} | ${muscles} |\n`;
    });
    markdown += `\n`;
  });

  // Summary stats
  markdown += `---\n\n`;
  markdown += `## Summary Statistics\n\n`;
  markdown += `### By Category\n\n`;
  markdown += `| Category | Count |\n`;
  markdown += `|----------|-------|\n`;
  Object.keys(byCategory).sort().forEach(category => {
    markdown += `| ${category} | ${byCategory[category].length} |\n`;
  });

  markdown += `\n### By Equipment\n\n`;
  markdown += `| Equipment | Count |\n`;
  markdown += `|-----------|-------|\n`;
  Object.keys(byEquipment).sort().forEach(equipment => {
    markdown += `| ${equipment} | ${byEquipment[equipment].length} |\n`;
  });

  // Write to file
  const outputPath = path.join(process.cwd(), 'EXERCISES_LIST.md');
  fs.writeFileSync(outputPath, markdown, 'utf-8');

  console.log(`\n✅ Markdown file created: EXERCISES_LIST.md`);
  console.log(`📊 Total exercises exported: ${data.length}`);
  console.log(`📁 Categories: ${Object.keys(byCategory).length}`);
  console.log(`🔧 Equipment types: ${Object.keys(byEquipment).length}`);
}

exportExercises();

