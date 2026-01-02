import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GIF_DIR = path.join(__dirname, '../exercise-gifs');

interface Exercise {
  id: string;
  name: string;
  primary_muscles: string;
  secondary_muscles?: string;
  equipment?: string;
  is_active: boolean;
  gif_url?: string;
}

async function generateExercisesReport() {
  console.log('=� Fetching all exercises from database...\n');

  // Get list of downloaded GIF files
  let downloadedGifs: Set<string> = new Set();
  if (fs.existsSync(GIF_DIR)) {
    const gifFiles = fs.readdirSync(GIF_DIR).filter(f => f.endsWith('.gif'));
    downloadedGifs = new Set(gifFiles);
    console.log(`  Found ${gifFiles.length} downloaded GIF files locally\n`);
  } else {
    console.log(`    GIF directory not found: ${GIF_DIR}\n`);
  }

  // Fetch ALL exercises (no limit)
  let allExercises: Exercise[] = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('exercises')
      .select('id, name, primary_muscles, secondary_muscles, equipment, is_active, gif_url')
      .order('primary_muscles', { ascending: true })
      .order('name', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching exercises:', error);
      break;
    }

    if (!data || data.length === 0) break;
    
    allExercises = allExercises.concat(data);
    console.log(`  Fetched ${allExercises.length} exercises so far...`);
    
    if (data.length < pageSize) break;
    page++;
  }

  const exercises = allExercises;

  if (!exercises || exercises.length === 0) {
    console.log('No exercises found in database.');
    return;
  }

  console.log(`✅ Found ${exercises.length} exercises\n`);

  // Helper function to check if GIF is actually downloaded
  const hasDownloadedGif = (exercise: Exercise): boolean => {
    if (!exercise.gif_url) return false;
    const filename = exercise.gif_url.split('/').pop();
    return filename ? downloadedGifs.has(filename) : false;
  };

  // Group exercises by primary muscle
  const byMuscle: Record<string, Exercise[]> = {};
  exercises.forEach((ex: Exercise) => {
    const muscle = ex.primary_muscles || 'Unknown';
    if (!byMuscle[muscle]) {
      byMuscle[muscle] = [];
    }
    byMuscle[muscle].push(ex);
  });

  // Generate statistics
  const totalExercises = exercises.length;
  const activeExercises = exercises.filter((ex: Exercise) => ex.is_active).length;
  const inactiveExercises = totalExercises - activeExercises;
  const withGifs = exercises.filter((ex: Exercise) => hasDownloadedGif(ex)).length;
  const withoutGifs = totalExercises - withGifs;
  const activeWithGifs = exercises.filter((ex: Exercise) => ex.is_active && hasDownloadedGif(ex)).length;

  // Generate Markdown content
  let markdown = `# Exercise Database Report\n\n`;
  markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  markdown += `**Note:** GIF availability is based on locally downloaded files in \`exercise-gifs/\` directory.\n\n`;
  markdown += `---\n\n`;
  
  markdown += `## = Statistics\n\n`;
  markdown += `| Metric | Count | Percentage |\n`;
  markdown += `|--------|-------|------------|\n`;
  markdown += `| **Total Exercises** | ${totalExercises} | 100% |\n`;
  markdown += `| Active Exercises | ${activeExercises} | ${((activeExercises/totalExercises)*100).toFixed(1)}% |\n`;
  markdown += `| Inactive Exercises | ${inactiveExercises} | ${((inactiveExercises/totalExercises)*100).toFixed(1)}% |\n`;
  markdown += `| With Downloaded GIF | ${withGifs} | ${((withGifs/totalExercises)*100).toFixed(1)}% |\n`;
  markdown += `| Without Downloaded GIF | ${withoutGifs} | ${((withoutGifs/totalExercises)*100).toFixed(1)}% |\n`;
  markdown += `| **Active + Downloaded GIF** | ${activeWithGifs} | ${((activeWithGifs/totalExercises)*100).toFixed(1)}% |\n`;
  markdown += `\n`;

  markdown += `---\n\n`;
  markdown += `## = Exercises by Muscle Group\n\n`;
  markdown += `### Legend\n`;
  markdown += `- ✅ = Active\n`;
  markdown += `- ❌ = Inactive\n`;
  markdown += `-  = Has Downloaded GIF\n`;
  markdown += `- ⚪ = No Downloaded GIF\n\n`;
  markdown += `---\n\n`;

  // Sort muscle groups alphabetically
  const sortedMuscles = Object.keys(byMuscle).sort();

  sortedMuscles.forEach((muscle) => {
    const muscleExercises = byMuscle[muscle];
    const muscleActive = muscleExercises.filter(ex => ex.is_active).length;
    const muscleWithGifs = muscleExercises.filter(ex => hasDownloadedGif(ex)).length;
    const muscleActiveWithGifs = muscleExercises.filter(ex => ex.is_active && hasDownloadedGif(ex)).length;
    
    // Sort exercises: Active+GIF first, then Active only, then GIF only, then neither
    const sortedMuscleExercises = [...muscleExercises].sort((a, b) => {
      const aHasGif = hasDownloadedGif(a);
      const bHasGif = hasDownloadedGif(b);
      
      // Priority scoring: Active+GIF=4, Active=3, GIF=2, Neither=1
      const aScore = (a.is_active ? 2 : 0) + (aHasGif ? 2 : 0);
      const bScore = (b.is_active ? 2 : 0) + (bHasGif ? 2 : 0);
      
      if (aScore !== bScore) {
        return bScore - aScore; // Higher score first
      }
      
      // If same score, sort alphabetically
      return a.name.localeCompare(b.name);
    });
    
    markdown += `### ${muscle.charAt(0).toUpperCase() + muscle.slice(1)}\n\n`;
    markdown += `**Total:** ${muscleExercises.length} | `;
    markdown += `**Active:** ${muscleActive} | `;
    markdown += `**With Downloaded GIF:** ${muscleWithGifs} | `;
    markdown += `**Active + GIF:** ${muscleActiveWithGifs}\n\n`;
    
    markdown += `| # | Exercise Name | Category | Equipment | Active | Downloaded GIF | Secondary Muscles |\n`;
    markdown += `|---|---------------|----------|-----------|--------|----------------|-------------------|\n`;

    sortedMuscleExercises.forEach((ex, index) => {
      const activeIcon = ex.is_active ? '✅ Yes' : '❌ No';
      const gifIcon = hasDownloadedGif(ex) ? ' Yes' : '⚪ No';
      const equipment = ex.equipment || 'N/A';
      const secondary = ex.secondary_muscles || '-';
      const category = muscle;
      
      markdown += `| ${index + 1} | **${ex.name}** | ${category} | ${equipment} | ${activeIcon} | ${gifIcon} | ${secondary} |\n`;
    });

    markdown += `\n`;
  });

  // Add summary by equipment
  markdown += `---\n\n`;
  markdown += `##  Exercises by Equipment\n\n`;

  const byEquipment: Record<string, Exercise[]> = {};
  exercises.forEach((ex: Exercise) => {
    const equipment = ex.equipment || 'No Equipment';
    if (!byEquipment[equipment]) {
      byEquipment[equipment] = [];
    }
    byEquipment[equipment].push(ex);
  });

  const sortedEquipment = Object.keys(byEquipment).sort();

  markdown += `| Equipment | Total | Active | With GIF |\n`;
  markdown += `|-----------|-------|--------|----------|\n`;

  sortedEquipment.forEach((equipment) => {
    const equipmentExercises = byEquipment[equipment];
    const equipmentActive = equipmentExercises.filter(ex => ex.is_active).length;
    const equipmentWithGifs = equipmentExercises.filter(ex => hasDownloadedGif(ex)).length;
    
    markdown += `| ${equipment} | ${equipmentExercises.length} | ${equipmentActive} | ${equipmentWithGifs} |\n`;
  });

  markdown += `\n`;

  // Add active exercises with GIFs (ready to use)
  markdown += `---\n\n`;
  markdown += `## ⭐ Active Exercises with Downloaded GIFs (Ready to Use)\n\n`;
  markdown += `These ${activeWithGifs} exercises are active and have downloaded GIF animations.\n\n`;

  const readyExercises = exercises.filter((ex: Exercise) => ex.is_active && hasDownloadedGif(ex));
  const readyByMuscle: Record<string, Exercise[]> = {};
  
  readyExercises.forEach((ex: Exercise) => {
    const muscle = ex.primary_muscles || 'Unknown';
    if (!readyByMuscle[muscle]) {
      readyByMuscle[muscle] = [];
    }
    readyByMuscle[muscle].push(ex);
  });

  const sortedReadyMuscles = Object.keys(readyByMuscle).sort();

  sortedReadyMuscles.forEach((muscle) => {
    markdown += `### ${muscle.charAt(0).toUpperCase() + muscle.slice(1)} (${readyByMuscle[muscle].length})\n\n`;
    
    readyByMuscle[muscle].forEach((ex, index) => {
      markdown += `${index + 1}. **${ex.name}** - ${ex.equipment || 'N/A'}\n`;
    });
    
    markdown += `\n`;
  });

  // Write to file
  const outputPath = path.join(process.cwd(), 'EXERCISES_REPORT.md');
  fs.writeFileSync(outputPath, markdown);

  console.log(`\n✅ Report generated successfully!`);
  console.log(`= File: ${outputPath}`);
  console.log(`\n= Summary:`);
  console.log(`   - Total Exercises: ${totalExercises}`);
  console.log(`   - Active: ${activeExercises}`);
  console.log(`   - With Downloaded GIF: ${withGifs}`);
  console.log(`   - Active + Downloaded GIF: ${activeWithGifs}`);
  console.log(`   - Muscle Groups: ${sortedMuscles.length}`);
  console.log(`   - Equipment Types: ${sortedEquipment.length}`);
  console.log(`\n= Checking against ${downloadedGifs.size} locally downloaded GIF files`);
}

generateExercisesReport().catch(console.error);
