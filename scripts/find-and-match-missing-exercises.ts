import { createClient } from '@supabase/supabase-js';
import * as https from 'https';
import * as http from 'http';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
const exerciseDbApiKey = process.env.EXPO_PUBLIC_EXERCISEDB_API_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const LOG_ENDPOINT = 'http://127.0.0.1:7242/ingest/068831e1-39c2-46d3-afd8-7578e38ed77a';

// #region agent log
function debugLog(location: string, message: string, data: any, hypothesisId: string) {
  const payload = JSON.stringify({
    location,
    message,
    data,
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'find-and-match',
    hypothesisId
  });
  const req = http.request(LOG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
  });
  req.on('error', () => {});
  req.write(payload);
  req.end();
}
// #endregion

interface Exercise {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
}

function fetchExerciseDBList(): Promise<Exercise[]> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'exercisedb.p.rapidapi.com',
      path: '/exercises?limit=2000', // Fetch up to 2000 exercises
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': exerciseDbApiKey,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com'
      }
    };

    https.get(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const exercises = JSON.parse(data);
          resolve(exercises);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);
  
  // Exact match
  if (norm1 === norm2) return 1.0;
  
  // Contains match
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const shorter = Math.min(norm1.length, norm2.length);
    const longer = Math.max(norm1.length, norm2.length);
    return shorter / longer;
  }
  
  // Word overlap
  const words1 = norm1.split(' ');
  const words2 = norm2.split(' ');
  const overlap = words1.filter(w => words2.includes(w)).length;
  const totalWords = Math.max(words1.length, words2.length);
  
  return overlap / totalWords;
}

function findBestMatch(targetName: string, candidates: Exercise[]): { match: Exercise; score: number } | null {
  let bestMatch: Exercise | null = null;
  let bestScore = 0;
  
  for (const candidate of candidates) {
    const score = calculateSimilarity(targetName, candidate.name);
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }
  
  // Only return matches with decent confidence (>= 60%)
  if (bestMatch && bestScore >= 0.6) {
    return { match: bestMatch, score: bestScore };
  }
  
  return null;
}

async function main() {
  console.log('= FINDING AND MATCHING MISSING EXERCISES\n');
  console.log('='.repeat(60));

  // #region agent log
  debugLog('find-and-match.ts:main:start', 'Starting search and match', {}, 'H1');
  // #endregion

  if (!exerciseDbApiKey) {
    console.error('❌ Missing EXPO_PUBLIC_EXERCISEDB_API_KEY in .env file');
    return;
  }

  // Step 1: Get exercises without external_id
  console.log('\n=� STEP 1: Finding exercises without external_id...');
  
  const { data: missingExercises, error } = await supabase
    .from('exercises')
    .select('id, name, equipment, primary_muscles')
    .eq('is_active', true)
    .is('external_id', null);

  if (error) {
    console.error('Failed to fetch exercises:', error.message);
    return;
  }

  console.log(`  Found ${missingExercises?.length || 0} exercises without external_id`);

  // #region agent log
  debugLog('find-and-match.ts:missing:found', 'Missing exercises found', {
    count: missingExercises?.length || 0,
    sample: (missingExercises || []).slice(0, 10).map(e => ({ name: e.name, equipment: e.equipment }))
  }, 'H1');
  // #endregion

  // Step 2: Fetch all ExerciseDB exercises
  console.log('\n< STEP 2: Fetching ExerciseDB exercise list...');
  
  let exerciseDBList: Exercise[];
  try {
    exerciseDBList = await fetchExerciseDBList();
    console.log(`  Fetched ${exerciseDBList.length} exercises from ExerciseDB`);
  } catch (err: any) {
    console.error(`  ❌ Failed to fetch: ${err.message}`);
    return;
  }

  // #region agent log
  debugLog('find-and-match.ts:exercisedb:fetched', 'ExerciseDB list fetched', {
    count: exerciseDBList.length
  }, 'H2');
  // #endregion

  // Step 3: Match exercises
  console.log('\n= STEP 3: Matching exercises...\n');
  
  const matches: Array<{ 
    id: string; 
    name: string; 
    matchedName: string; 
    externalId: string; 
    score: number;
    equipment: string;
  }> = [];
  const noMatches: Array<{ id: string; name: string; equipment: string }> = [];

  for (const ex of missingExercises || []) {
    const result = findBestMatch(ex.name, exerciseDBList);
    
    if (result) {
      matches.push({
        id: ex.id,
        name: ex.name,
        matchedName: result.match.name,
        externalId: result.match.id,
        score: result.score,
        equipment: ex.equipment
      });
      console.log(`  ✅ ${ex.name.padEnd(40)} → ${result.match.name} (${(result.score * 100).toFixed(0)}%)`);
    } else {
      noMatches.push({ id: ex.id, name: ex.name, equipment: ex.equipment });
      console.log(`  ❌ ${ex.name.padEnd(40)} → No match found`);
    }
  }

  // #region agent log
  debugLog('find-and-match.ts:matching:complete', 'Matching complete', {
    totalMissing: missingExercises?.length || 0,
    matched: matches.length,
    noMatch: noMatches.length,
    sampleMatches: matches.slice(0, 10),
    sampleNoMatches: noMatches.slice(0, 10)
  }, 'H3');
  // #endregion

  // Step 4: Update database with matches
  console.log(`\n= STEP 4: Updating database with ${matches.length} matches...\n`);
  
  let updated = 0;
  let failed = 0;

  for (const match of matches) {
    const { error: updateError } = await supabase
      .from('exercises')
      .update({ external_id: match.externalId })
      .eq('id', match.id);

    if (updateError) {
      console.error(`  ❌ Failed to update ${match.name}: ${updateError.message}`);
      failed++;
    } else {
      updated++;
      process.stdout.write(`\r  Updated ${updated}/${matches.length} exercises...`);
    }
  }

  console.log(`\n  ✅ Successfully updated ${updated} exercises`);
  if (failed > 0) {
    console.log(`  ❌ Failed to update ${failed} exercises`);
  }

  // #region agent log
  debugLog('find-and-match.ts:update:complete', 'Database update complete', {
    updated,
    failed
  }, 'H4');
  // #endregion

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('= SUMMARY');
  console.log('='.repeat(60));
  console.log(`\n✅ Matched and updated: ${updated}`);
  console.log(`❌ No match found: ${noMatches.length}`);
  console.log(`❌ Update failed: ${failed}`);

  if (noMatches.length > 0) {
    console.log(`\n  Exercises without matches (${noMatches.length}):`);
    noMatches.forEach(ex => {
      console.log(`   - ${ex.name} (${ex.equipment})`);
    });
    console.log('\n   These may need manual mapping or custom GIF sourcing.');
  }

  // #region agent log
  debugLog('find-and-match.ts:main:complete', 'Search and match complete', {
    matched: updated,
    noMatch: noMatches.length,
    failed
  }, 'H1');
  // #endregion

  if (updated > 0) {
    console.log('\n=� TIP: Run complete-missing-gifs.ts again to download GIFs for newly matched exercises!');
  }
}

main().catch(console.error);
