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
    runId: 'aggressive-match',
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
      path: '/exercises?limit=2000',
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

function normalizeForMatching(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove all special chars and spaces
    .trim();
}

function generateVariations(name: string): string[] {
  const variations: string[] = [name];
  const lower = name.toLowerCase();
  
  // Remove equipment type suffixes
  const equipmentTypes = ['machine', 'cable', 'barbell', 'dumbbell', 'kettlebell', 'band', 'body weight', 'bodyweight'];
  for (const equip of equipmentTypes) {
    if (lower.includes(equip)) {
      variations.push(lower.replace(equip, '').trim());
      variations.push(lower.replace(new RegExp(`\\b${equip}\\b`, 'g'), '').trim());
    }
  }
  
  // Add/remove common prefixes/suffixes
  const replacements: Record<string, string[]> = {
    'overhead press': ['shoulder press', 'military press'],
    'lat pulldown': ['pulldown', 'lat pull down', 'lateral pulldown'],
    'leg extension': ['quad extension'],
    'leg curl': ['hamstring curl', 'lying leg curl'],
    'seated row': ['cable row', 'rowing'],
    'hip thrust': ['glute bridge', 'hip thrusts'],
    'pec deck': ['pec fly', 'chest fly machine', 'butterfly'],
    'bulgarian split squat': ['split squat', 'rear foot elevated split squat'],
    'box jump': ['jump box'],
    'pistol squat': ['one leg squat', 'single leg squat'],
    'muscle up': ['muscle-up', 'muscleup'],
    'face pull': ['rear delt pull', 'facepull'],
    'ab wheel': ['roller', 'ab roller'],
    'battle ropes': ['battle rope'],
    'russian twist': ['seated twist'],
    'v up': ['v-up', 'v sit up'],
    'mountain climber': ['mountain climbers'],
    't bar row': ['t-bar row', 'tbar row'],
    'cable crunch': ['kneeling cable crunch'],
    'reverse fly': ['rear delt fly', 'reverse flye'],
    'handstand push up': ['handstand pushup', 'hspu'],
    'jump rope': ['skipping', 'rope skip'],
    'kettlebell swing': ['kb swing', 'swing'],
    'turkish get up': ['tgu', 'get up'],
    'power clean': ['clean'],
    'clean and jerk': ['clean & jerk'],
    'hang clean': ['hang power clean'],
    'hang snatch': ['hang power snatch'],
    'deficit deadlift': ['deadlift'],
    'rack pull': ['rackpull'],
    'glute kickback': ['kickback', 'donkey kick'],
    'hip abductor': ['abductor'],
    'hip adductor': ['adductor'],
    'ball slams': ['medicine ball slam', 'slam ball'],
    'knees to elbows': ['k2e', 'toes to bar'],
    'superman': ['back extension'],
    'wrist roller': ['forearm roller']
  };

  for (const [key, values] of Object.entries(replacements)) {
    if (lower.includes(key)) {
      for (const val of values) {
        variations.push(lower.replace(key, val));
        variations.push(val);
      }
    }
  }

  return [...new Set(variations)]; // Remove duplicates
}

function calculateMatchScore(targetName: string, candidateName: string): number {
  const normTarget = normalizeForMatching(targetName);
  const normCandidate = normalizeForMatching(candidateName);
  
  // Exact match
  if (normTarget === normCandidate) return 1.0;
  
  // Contains match
  if (normTarget.includes(normCandidate) || normCandidate.includes(normTarget)) {
    const shorter = Math.min(normTarget.length, normCandidate.length);
    const longer = Math.max(normTarget.length, normCandidate.length);
    return shorter / longer;
  }
  
  // Character overlap
  let overlap = 0;
  for (const char of normTarget) {
    if (normCandidate.includes(char)) {
      overlap++;
    }
  }
  
  return overlap / Math.max(normTarget.length, normCandidate.length);
}

function findBestMatch(targetName: string, candidates: Exercise[]): { match: Exercise; score: number; variation: string } | null {
  const variations = generateVariations(targetName);
  let bestMatch: Exercise | null = null;
  let bestScore = 0;
  let bestVariation = targetName;
  
  for (const variation of variations) {
    for (const candidate of candidates) {
      const score = calculateMatchScore(variation, candidate.name);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
        bestVariation = variation;
      }
    }
  }
  
  // Lowered threshold to 50% to catch more matches
  if (bestMatch && bestScore >= 0.5) {
    return { match: bestMatch, score: bestScore, variation: bestVariation };
  }
  
  return null;
}

async function main() {
  console.log('= AGGRESSIVE EXERCISE MATCHING (WITH VARIATIONS)\n');
  console.log('='.repeat(60));

  // #region agent log
  debugLog('aggressive-match.ts:main:start', 'Starting aggressive matching', {}, 'H1');
  // #endregion

  if (!exerciseDbApiKey) {
    console.error('❌ Missing EXPO_PUBLIC_EXERCISEDB_API_KEY in .env file');
    return;
  }

  // Step 1: Get exercises without external_id
  console.log('\n=� STEP 1: Finding exercises without external_id...');
  
  const { data: missingExercises, error } = await supabase
    .from('exercises')
    .select('id, name, equipment')
    .eq('is_active', true)
    .is('external_id', null);

  if (error) {
    console.error('Failed to fetch exercises:', error.message);
    return;
  }

  console.log(`  Found ${missingExercises?.length || 0} exercises\n`);

  // #region agent log
  debugLog('aggressive-match.ts:missing:found', 'Missing exercises found', {
    count: missingExercises?.length || 0
  }, 'H1');
  // #endregion

  // Step 2: Fetch ExerciseDB list
  console.log('< STEP 2: Fetching ExerciseDB exercise list...');
  
  let exerciseDBList: Exercise[];
  try {
    exerciseDBList = await fetchExerciseDBList();
    console.log(`  Fetched ${exerciseDBList.length} exercises\n`);
  } catch (err: any) {
    console.error(`  ❌ Failed to fetch: ${err.message}`);
    return;
  }

  // #region agent log
  debugLog('aggressive-match.ts:exercisedb:fetched', 'ExerciseDB list fetched', {
    count: exerciseDBList.length
  }, 'H2');
  // #endregion

  // Step 3: Match with variations
  console.log('= STEP 3: Matching with variations...\n');
  
  const matches: Array<{ 
    id: string; 
    name: string; 
    matchedName: string; 
    externalId: string; 
    score: number;
    variation: string;
  }> = [];
  const noMatches: string[] = [];

  for (const ex of missingExercises || []) {
    const result = findBestMatch(ex.name, exerciseDBList);
    
    if (result) {
      matches.push({
        id: ex.id,
        name: ex.name,
        matchedName: result.match.name,
        externalId: result.match.id,
        score: result.score,
        variation: result.variation
      });
      console.log(`  ✅ ${ex.name.padEnd(40)} → ${result.match.name} (${(result.score * 100).toFixed(0)}%)`);
    } else {
      noMatches.push(ex.name);
      console.log(`  ❌ ${ex.name.padEnd(40)} → No match`);
    }
  }

  // #region agent log
  debugLog('aggressive-match.ts:matching:complete', 'Matching complete', {
    matched: matches.length,
    noMatch: noMatches.length,
    sampleMatches: matches.slice(0, 10)
  }, 'H3');
  // #endregion

  // Step 4: Update database (skip duplicates)
  console.log(`\n=� STEP 4: Updating database with ${matches.length} matches...\n`);
  
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const match of matches) {
    const { error: updateError } = await supabase
      .from('exercises')
      .update({ external_id: match.externalId })
      .eq('id', match.id);

    if (updateError) {
      if (updateError.message.includes('duplicate key')) {
        skipped++;
      } else {
        failed++;
        console.error(`  ❌ Failed to update ${match.name}: ${updateError.message}`);
      }
    } else {
      updated++;
      process.stdout.write(`\r  Updated ${updated}/${matches.length}...`);
    }
  }

  console.log(`\n  ✅ Successfully updated ${updated} exercises`);
  if (skipped > 0) console.log(`  �  Skipped ${skipped} (duplicate external_id)`);
  if (failed > 0) console.log(`  ❌ Failed ${failed}`);

  // #region agent log
  debugLog('aggressive-match.ts:update:complete', 'Database update complete', {
    updated,
    skipped,
    failed
  }, 'H4');
  // #endregion

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('=� SUMMARY');
  console.log('='.repeat(60));
  console.log(`\n✅ Matched: ${matches.length}`);
  console.log(`✅ Updated: ${updated}`);
  console.log(`�  Skipped (duplicates): ${skipped}`);
  console.log(`❌ No match: ${noMatches.length}`);
  console.log(`❌ Update failed: ${failed}`);

  if (noMatches.length > 0) {
    console.log(`\n�  Exercises without matches (${noMatches.length}):`);
    noMatches.forEach(name => console.log(`   - ${name}`));
  }

  // #region agent log
  debugLog('aggressive-match.ts:main:complete', 'Aggressive matching complete', {
    matched: matches.length,
    updated,
    skipped,
    noMatch: noMatches.length
  }, 'H1');
  // #endregion

  if (updated > 0) {
    console.log('\n=� TIP: Run complete-missing-gifs.ts again to download GIFs for newly matched exercises!');
  }
}

main().catch(console.error);

