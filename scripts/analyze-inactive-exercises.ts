import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Exercise {
  id: string;
  name: string;
  equipment: string;
  category: string;
  gif_url: string | null;
  measurement_type: string | null;
  is_active: boolean;
}

interface AnalysisResult {
  totalInactive: number;
  inactiveWithGifUrl: Exercise[];
  inactiveWithoutGifUrl: Exercise[];
  byEquipment: Record<string, Exercise[]>;
  missingMeasurementType: Exercise[];
  priorityExercises: Exercise[];
}

// Priority exercises to activate
const PRIORITY_EXERCISE_NAMES = [
  // Smith Machine
  'smith bench press',
  'smith incline bench press',
  'smith decline bench press',
  'smith squat',
  'smith full squat',
  'smith deadlift',
  'smith shoulder press',
  'smith seated shoulder press',
  'smith bent over row',
  'smith close-grip bench press',
  'smith reverse calf raises',
  'smith hack squat',
  'smith upright row',
  'smith lunges',
  'smith machine bicep curl',
  
  // Sled / Leg Press
  'sled 45° leg press',
  'sled 45° leg press (back pov)',
  'sled 45° leg press (side pov)',
  'sled 45° leg wide press',
  'sled hack squat',
  'sled closer hack squat',
  'sled lying squat',
  'sled calf press on leg press',
  'sled one leg calf press on leg press',
  'sled 45 degrees one leg press',
  'sled forward angled calf raise',
  
  // Cable Pushdowns
  'cable pushdown',
  'cable pushdown (with rope attachment)',
  'cable triceps pushdown (v-bar)',
  'cable reverse-grip pushdown',
  'cable one arm tricep pushdown',
  'cable kickback',
  'cable lateral raise',
  'cable curl',
  'cable one arm lateral raise',
  
  // Trap Bar
  'trap bar deadlift',
  
  // Bodyweight Basics
  'push-up',
  'push-up (wall)',
  'diamond push-up',
  'close-grip push-up',
  'pull-up',
  'wide grip pull-up',
  'rear pull-up',
  'triceps dip',
  'jump squat',
  'walking lunge',
  'forward lunge (male)',
  'mountain climber',
  'reverse crunch',
  'dead bug',
  'hanging leg raise',
  'hanging knee raise',
  'sit-up v. 2',
  
  // Kettlebell
  'kettlebell goblet squat',
  'kettlebell swing',
  'kettlebell front squat',
  'kettlebell one arm row',
  'kettlebell alternating row',
  
  // Dumbbell Popular
  'dumbbell concentration curl',
  'dumbbell hammer curl',
  'dumbbell preacher curl',
  'dumbbell one arm bent-over row',
  'dumbbell kickback',
  
  // Medicine Ball
  'medicine ball chest pass',
  'medicine ball overhead slam',
  'medicine ball chest push single response',
  
  // Resistance Band
  'resistance band seated biceps curl',
  'resistance band leg extension',
  'resistance band seated shoulder press',
  'resistance band seated chest press',
  'resistance band seated straight back row',
];

async function analyzeExercises(): Promise<AnalysisResult> {
  console.log('🔍 Analyzing inactive exercises...\n');
  
  // Fetch all inactive exercises
  const { data: inactiveExercises, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('is_active', false)
    .order('equipment', { ascending: true });
  
  if (error) {
    throw new Error(`Failed to fetch exercises: ${error.message}`);
  }
  
  const exercises = inactiveExercises as Exercise[];
  
  // Categorize results
  const result: AnalysisResult = {
    totalInactive: exercises.length,
    inactiveWithGifUrl: exercises.filter(e => e.gif_url),
    inactiveWithoutGifUrl: exercises.filter(e => !e.gif_url),
    byEquipment: {},
    missingMeasurementType: exercises.filter(e => !e.measurement_type),
    priorityExercises: [],
  };
  
  // Group by equipment
  exercises.forEach(exercise => {
    const equipment = exercise.equipment || 'unknown';
    if (!result.byEquipment[equipment]) {
      result.byEquipment[equipment] = [];
    }
    result.byEquipment[equipment].push(exercise);
  });
  
  // Find priority exercises
  result.priorityExercises = exercises.filter(e => 
    PRIORITY_EXERCISE_NAMES.some(name => 
      e.name.toLowerCase() === name.toLowerCase()
    )
  );
  
  return result;
}

async function checkLocalGifs(exercises: Exercise[]): Promise<{
  alreadyDownloaded: Exercise[];
  needsDownload: Exercise[];
}> {
  const gifDir = path.join(process.cwd(), 'exercise-gifs');
  
  const alreadyDownloaded: Exercise[] = [];
  const needsDownload: Exercise[] = [];
  
  for (const exercise of exercises) {
    if (!exercise.gif_url) {
      needsDownload.push(exercise);
      continue;
    }
    
    // Check if file exists locally
    const filename = exercise.gif_url.split('/').pop() || `${exercise.id}.gif`;
    const localPath = path.join(gifDir, filename);
    
    if (fs.existsSync(localPath)) {
      alreadyDownloaded.push(exercise);
    } else {
      needsDownload.push(exercise);
    }
  }
  
  return { alreadyDownloaded, needsDownload };
}

async function generateReport() {
  const analysis = await analyzeExercises();
  
  console.log('='.repeat(60));
  console.log('EXERCISE LIBRARY ANALYSIS REPORT');
  console.log('='.repeat(60));
  
  console.log(`\n📊 SUMMARY`);
  console.log(`   Total Inactive: ${analysis.totalInactive}`);
  console.log(`   With GIF URL: ${analysis.inactiveWithGifUrl.length}`);
  console.log(`   Without GIF URL: ${analysis.inactiveWithoutGifUrl.length}`);
  console.log(`   Missing Measurement Type: ${analysis.missingMeasurementType.length}`);
  console.log(`   Priority Exercises Found: ${analysis.priorityExercises.length}`);
  
  console.log(`\n📦 BY EQUIPMENT:`);
  Object.entries(analysis.byEquipment)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([equipment, exercises]) => {
      const withGif = exercises.filter(e => e.gif_url).length;
      console.log(`   ${equipment}: ${exercises.length} total (${withGif} with GIF URL)`);
    });
  
  console.log(`\n🎯 PRIORITY EXERCISES TO ACTIVATE:`);
  
  // Check local GIFs for priority exercises
  const { alreadyDownloaded, needsDownload } = await checkLocalGifs(analysis.priorityExercises);
  
  console.log(`   Already Downloaded: ${alreadyDownloaded.length}`);
  console.log(`   Needs Download: ${needsDownload.length}`);
  
  // Output detailed lists
  const outputDir = path.join(process.cwd(), 'scripts', 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Save priority exercises
  fs.writeFileSync(
    path.join(outputDir, 'priority-exercises.json'),
    JSON.stringify(analysis.priorityExercises, null, 2)
  );
  
  // Save exercises needing download
  fs.writeFileSync(
    path.join(outputDir, 'exercises-need-gif-download.json'),
    JSON.stringify(needsDownload, null, 2)
  );
  
  // Save exercises ready to activate (have GIF)
  fs.writeFileSync(
    path.join(outputDir, 'exercises-ready-to-activate.json'),
    JSON.stringify(alreadyDownloaded, null, 2)
  );
  
  // Generate SQL for priority exercises
  const priorityNames = analysis.priorityExercises.map(e => `'${e.name.replace(/'/g, "''")}'`);
  const sql = `
-- Priority exercises to activate
UPDATE exercises 
SET is_active = true 
WHERE name IN (
  ${priorityNames.join(',\n  ')}
);
`;
  
  fs.writeFileSync(
    path.join(outputDir, 'activate-priority-exercises.sql'),
    sql
  );
  
  console.log(`\n✅ Reports saved to scripts/output/`);
  console.log(`   - priority-exercises.json`);
  console.log(`   - exercises-need-gif-download.json`);
  console.log(`   - exercises-ready-to-activate.json`);
  console.log(`   - activate-priority-exercises.sql`);
}

generateReport().catch(console.error);

