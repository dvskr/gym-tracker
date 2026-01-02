import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixBrokenGifUrls() {
  console.log('');
  console.log('🔧 ATTEMPTING TO FIX BROKEN GIF URLS');
  console.log('═'.repeat(70));
  console.log('');

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/068831e1-39c2-46d3-afd8-7578e38ed77a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fix-broken-urls.ts:17',message:'Script started',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  // Get exercises with broken URLs (no .gif extension)
  const { data: brokenExercises } = await supabase
    .from('exercises')
    .select('id, name, external_id, gif_url')
    .eq('is_active', true)
    .not('gif_url', 'is', null)
    .not('gif_url', 'like', '%.gif');

  console.log(`📋 Found ${brokenExercises?.length || 0} exercises with broken gif_url`);

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/068831e1-39c2-46d3-afd8-7578e38ed77a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fix-broken-urls.ts:32',message:'Broken exercises fetched',data:{count:brokenExercises?.length,exercises:brokenExercises?.slice(0,5).map(e=>({name:e.name,gif_url:e.gif_url}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  // Get all files in storage
  const { data: files } = await supabase.storage
    .from('exercise-gifs')
    .list('', { limit: 1000 });

  const storageFilenames = new Set(files?.filter(f => f.name.endsWith('.gif')).map(f => f.name) || []);
  
  console.log(`📦 Found ${storageFilenames.size} GIF files in storage`);
  console.log('');

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/068831e1-39c2-46d3-afd8-7578e38ed77a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fix-broken-urls.ts:47',message:'Storage files listed',data:{count:storageFilenames.size,sampleFiles:Array.from(storageFilenames).slice(0,10)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  let fixable = 0;
  let unfixable = 0;
  const fixableExercises: any[] = [];
  const unfixableExercises: any[] = [];

  console.log('🔍 Checking if files exist with .gif extension added...');
  console.log('');

  for (const exercise of brokenExercises || []) {
    const currentFilename = exercise.gif_url.split('/').pop(); // e.g., "0056"
    const expectedFilename = currentFilename + '.gif'; // e.g., "0056.gif"
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/068831e1-39c2-46d3-afd8-7578e38ed77a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fix-broken-urls.ts:63',message:'Checking file existence',data:{exerciseName:exercise.name,currentFilename,expectedFilename,existsInStorage:storageFilenames.has(expectedFilename)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion

    if (storageFilenames.has(expectedFilename)) {
      fixable++;
      fixableExercises.push({
        ...exercise,
        currentFilename,
        expectedFilename
      });
      console.log(`✅ ${exercise.name}`);
      console.log(`   Current: ${currentFilename}`);
      console.log(`   Fixed:   ${expectedFilename} (EXISTS in storage)`);
      console.log('');
    } else {
      unfixable++;
      unfixableExercises.push({
        ...exercise,
        currentFilename,
        expectedFilename
      });
    }
  }

  console.log('═'.repeat(70));
  console.log('📊 ANALYSIS RESULTS');
  console.log('═'.repeat(70));
  console.log(`✅ Fixable (file exists with .gif):     ${fixable}`);
  console.log(`❌ Unfixable (file doesn't exist):       ${unfixable}`);
  console.log('');

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/068831e1-39c2-46d3-afd8-7578e38ed77a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fix-broken-urls.ts:94',message:'Analysis complete',data:{fixable,unfixable,fixableList:fixableExercises.map(e=>e.name)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion

  if (fixable === 0) {
    console.log('❌ NO FIXABLE EXERCISES');
    console.log('   All 23 files genuinely do not exist in storage.');
    console.log('   They need to be manually sourced (see MISSING_GIFS_GUIDE.md)');
    console.log('');
    return;
  }

  // Show what will be fixed
  console.log('🔧 EXERCISES THAT CAN BE AUTO-FIXED:');
  console.log('═'.repeat(70));
  fixableExercises.forEach(ex => {
    const newUrl = ex.gif_url + '.gif';
    console.log(`${ex.name}`);
    console.log(`  Old: ${ex.gif_url}`);
    console.log(`  New: ${newUrl}`);
    console.log('');
  });

  // Prompt for confirmation
  console.log('═'.repeat(70));
  console.log(`Ready to update ${fixable} exercises in database.`);
  console.log('Run this script with --execute flag to apply fixes.');
  console.log('');
  console.log('Command: npx tsx scripts/fix-broken-urls.ts --execute');
  console.log('═'.repeat(70));
  console.log('');

  // Check for --execute flag
  if (process.argv.includes('--execute')) {
    console.log('🚀 APPLYING FIXES...');
    console.log('');

    let updated = 0;
    let failed = 0;

    for (const exercise of fixableExercises) {
      const newUrl = exercise.gif_url + '.gif';
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/068831e1-39c2-46d3-afd8-7578e38ed77a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fix-broken-urls.ts:141',message:'Updating exercise',data:{exerciseId:exercise.id,exerciseName:exercise.name,oldUrl:exercise.gif_url,newUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'execute',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion

      const { error } = await supabase
        .from('exercises')
        .update({ gif_url: newUrl })
        .eq('id', exercise.id);

      if (error) {
        console.log(`❌ Failed: ${exercise.name} - ${error.message}`);
        failed++;
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/068831e1-39c2-46d3-afd8-7578e38ed77a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fix-broken-urls.ts:157',message:'Update failed',data:{exerciseId:exercise.id,error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'execute',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
      } else {
        console.log(`✅ Updated: ${exercise.name}`);
        updated++;

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/068831e1-39c2-46d3-afd8-7578e38ed77a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fix-broken-urls.ts:166',message:'Update successful',data:{exerciseId:exercise.id,exerciseName:exercise.name},timestamp:Date.now(),sessionId:'debug-session',runId:'execute',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
      }
    }

    console.log('');
    console.log('═'.repeat(70));
    console.log('📊 UPDATE RESULTS');
    console.log('═'.repeat(70));
    console.log(`✅ Successfully updated: ${updated}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('');

    if (unfixable > 0) {
      console.log(`⚠️  ${unfixable} exercises still need manual GIF sourcing`);
      console.log('   See MISSING_GIFS_GUIDE.md for instructions');
    }
  }
}

fixBrokenGifUrls();

