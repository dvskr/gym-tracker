/**
 * Seed script to populate exercises from ExerciseDB API into Supabase
 * 
 * Run with: npm run seed:exercises
 * 
 * This is a one-time operation to populate the database with all exercises.
 * After running this, the app will fetch exercises from Supabase instead of the API.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const EXERCISEDB_API_KEY = process.env.EXPO_PUBLIC_EXERCISEDB_API_KEY!;

// Create Supabase client with service role key for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const EXERCISEDB_BASE_URL = 'https://exercisedb.p.rapidapi.com';

interface ExerciseDBExercise {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  gifUrl: string;
  secondaryMuscles: string[];
  instructions: string[];
}

interface SupabaseExercise {
  external_id: string;
  name: string;
  description: string | null;
  instructions: string[];
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string | null;
  category: string | null;
  difficulty: string | null;
  gif_url: string | null;
  is_custom: boolean;
}

async function fetchExercisesFromAPI(): Promise<ExerciseDBExercise[]> {
  const allExercises: ExerciseDBExercise[] = [];
  let offset = 0;
  const limit = 10; // RapidAPI free tier limit per request
  const maxExercises = 2000; // Safety limit
  
  console.log(' Starting to fetch exercises from ExerciseDB API...');
  console.log('   (This may take a while due to API rate limits)\n');

  while (offset < maxExercises) {
    try {
      console.log(`=� Fetching batch at offset ${offset}...`);
      
      const response = await fetch(
        `${EXERCISEDB_BASE_URL}/exercises?limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers: {
            'x-rapidapi-key': EXERCISEDB_API_KEY,
            'x-rapidapi-host': 'exercisedb.p.rapidapi.com',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error: ${response.status} - ${errorText}`);
        break;
      }

      const exercises: ExerciseDBExercise[] = await response.json();
      
      if (exercises.length === 0) {
        console.log('✅ No more exercises to fetch');
        break;
      }

      allExercises.push(...exercises);
      console.log(`   Got ${exercises.length} exercises (Total: ${allExercises.length})`);

      offset += limit;

      // If we got less than the limit, we've reached the end
      if (exercises.length < limit) {
        console.log('✅ Reached end of exercises');
        break;
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('❌ Error fetching exercises:', error);
      break;
    }
  }

  console.log(`\n=� Total exercises fetched: ${allExercises.length}\n`);
  return allExercises;
}

function transformExercise(exercise: ExerciseDBExercise): SupabaseExercise {
  return {
    external_id: exercise.id,
    name: exercise.name,
    description: `Target: ${exercise.target}. Body part: ${exercise.bodyPart}.`,
    instructions: exercise.instructions || [],
    primary_muscles: [exercise.target, exercise.bodyPart].filter(Boolean),
    secondary_muscles: exercise.secondaryMuscles || [],
    equipment: exercise.equipment || null,
    category: exercise.bodyPart || null,
    difficulty: null, // ExerciseDB doesn't provide difficulty
    gif_url: exercise.gifUrl || null,
    is_custom: false,
  };
}

async function seedExercises() {
  console.log('=� Exercise Seeding Script Started\n');
  console.log('='.repeat(50));
  
  // Validate environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials. Check your .env file.');
    process.exit(1);
  }
  
  if (!EXERCISEDB_API_KEY) {
    console.error('❌ Missing ExerciseDB API key. Check your .env file.');
    process.exit(1);
  }

  console.log('✅ Environment variables loaded');
  console.log(`   Supabase URL: ${SUPABASE_URL.substring(0, 30)}...`);
  console.log('='.repeat(50) + '\n');

  // Fetch exercises from API
  const apiExercises = await fetchExercisesFromAPI();
  
  if (apiExercises.length === 0) {
    console.log('� No exercises fetched from API. Exiting.');
    return;
  }

  // Transform to Supabase format
  console.log('= Transforming exercises for database...');
  const supabaseExercises = apiExercises.map(transformExercise);
  console.log(`   Transformed ${supabaseExercises.length} exercises\n`);

  // Insert into database in batches
  console.log('=� Inserting exercises into Supabase...\n');
  
  const batchSize = 100;
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < supabaseExercises.length; i += batchSize) {
    const batch = supabaseExercises.slice(i, i + batchSize);
    
    try {
      const { data, error } = await supabase
        .from('exercises')
        .upsert(batch, { 
          onConflict: 'external_id',
          ignoreDuplicates: true 
        })
        .select('id');

      if (error) {
        console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error.message);
        errors += batch.length;
      } else {
        inserted += data?.length || 0;
        console.log(`   Batch ${Math.floor(i / batchSize) + 1}: Inserted ${data?.length || 0} exercises`);
      }
    } catch (err) {
      console.error(`❌ Exception inserting batch:`, err);
      errors += batch.length;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('=� SEEDING COMPLETE');
  console.log('='.repeat(50));
  console.log(`   ✅ Inserted: ${inserted}`);
  console.log(`   � Skipped (duplicates): ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   =� Total processed: ${supabaseExercises.length}`);
  console.log('='.repeat(50) + '\n');

  // Verify count in database
  const { count } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true });
  
  console.log(`= Total exercises in database: ${count}\n`);
}

// Run the script
seedExercises()
  .then(() => {
    console.log('✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('=� Script failed:', error);
    process.exit(1);
  });

