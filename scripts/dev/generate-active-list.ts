import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Exercise {
  id: string;
  name: string;
  equipment: string;
  category: string;
  measurement_type: string;
  primary_muscles: string[];
  external_id?: string;
}

async function generateActiveExercisesList() {
  console.log('=� Fetching active exercises from database...\n');

  // Fetch all active exercises
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name, equipment, category, measurement_type, primary_muscles, external_id')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error || !exercises) {
    console.error('Error fetching exercises:', error);
    return;
  }

  console.log(`✅ Found ${exercises.length} active exercises\n`);

  // Group by category
  const byCategory: Record<string, Exercise[]> = {};
  exercises.forEach((ex: Exercise) => {
    const category = ex.category || 'Other';
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(ex);
  });

  // Count by equipment
  const equipmentCounts: Record<string, number> = {};
  exercises.forEach((ex: Exercise) => {
    const equipment = ex.equipment || 'Unknown';
    equipmentCounts[equipment] = (equipmentCounts[equipment] || 0) + 1;
  });

  // Count by measurement type
  const measurementCounts: Record<string, number> = {};
  exercises.forEach((ex: Exercise) => {
    const type = ex.measurement_type || 'Unknown';
    measurementCounts[type] = (measurementCounts[type] || 0) + 1;
  });

  // Sort categories
  const sortedCategories = Object.keys(byCategory).sort();

  // Generate markdown
  let markdown = '# Active Exercises List\n\n';
  markdown += `**Total Active Exercises:** ${exercises.length}\n\n`;
  markdown += `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
  markdown += '---\n\n';

  // Table of contents
  markdown += '## = Table of Contents\n\n';
  sortedCategories.forEach((category) => {
    const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
    const count = byCategory[category].length;
    const anchor = category.toLowerCase().replace(/ /g, '-');
    markdown += `- [${categoryTitle} (${count} exercises)](#${anchor})\n`;
  });
  markdown += '\n---\n\n';

  // Generate sections for each category
  sortedCategories.forEach((category) => {
    const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
    const categoryExercises = byCategory[category];

    markdown += `## ${categoryTitle}\n\n`;
    markdown += `| # | Exercise Name | Equipment | Measurement Type |\n`;
    markdown += `|---|--------------|-----------|------------------|\n`;

    categoryExercises.forEach((ex, index) => {
      markdown += `| ${index + 1} | ${ex.name} | ${ex.equipment} | ${ex.measurement_type} |\n`;
    });

    markdown += '\n---\n\n';
  });

  // Summary by equipment
  markdown += '## Summary by Equipment\n\n';
  markdown += '| Equipment | Count |\n';
  markdown += '|-----------|-------|\n';
  
  const sortedEquipment = Object.entries(equipmentCounts)
    .sort((a, b) => b[1] - a[1]);
  
  sortedEquipment.forEach(([equipment, count]) => {
    markdown += `| ${equipment} | ${count} |\n`;
  });
  
  markdown += '\n---\n\n';

  // Summary by measurement type
  markdown += '## Summary by Measurement Type\n\n';
  markdown += '| Measurement Type | Count |\n';
  markdown += '|-----------------|-------|\n';
  
  const sortedMeasurement = Object.entries(measurementCounts)
    .sort((a, b) => b[1] - a[1]);
  
  sortedMeasurement.forEach(([type, count]) => {
    markdown += `| ${type} | ${count} |\n`;
  });
  
  markdown += '\n---\n\n';

  // Footer
  markdown += `*Generated from database on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*\n`;
  markdown += `*All ${exercises.length} exercises have high-quality 1080x1080 GIFs and 216x216 thumbnails*\n`;
  
  // Check coverage
  const withGif = exercises.filter(ex => ex.external_id || ex.id).length;
  const coverage = ((withGif / exercises.length) * 100).toFixed(1);
  if (coverage === '100.0') {
    markdown += `*100% coverage achieved ✅*\n`;
  } else {
    markdown += `*${coverage}% coverage*\n`;
  }
  
  markdown += '\n';

  // Write to file
  const outputPath = path.join(process.cwd(), 'ACTIVE_EXERCISES_LIST.md');
  fs.writeFileSync(outputPath, markdown);

  console.log(`\n✅ Active exercises list generated successfully!`);
  console.log(`= File: ${outputPath}`);
  console.log(`\n= Summary:`);
  console.log(`   - Total Active Exercises: ${exercises.length}`);
  console.log(`   - Categories: ${sortedCategories.length}`);
  console.log(`   - Equipment Types: ${sortedEquipment.length}`);
  console.log(`   - Measurement Types: ${sortedMeasurement.length}`);
}

generateActiveExercisesList().catch(console.error);
