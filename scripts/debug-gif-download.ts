import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as https from 'https';
import * as http from 'http';

config();

// ============================================
// CONFIGURATION
// ============================================
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || process.env.EXPO_PUBLIC_EXERCISEDB_API_KEY || '';
const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

const GIF_BUCKET = 'exercise-gifs';

// ============================================
// VALIDATION
// ============================================
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

if (!RAPIDAPI_KEY) {
  console.error('❌ Missing RAPIDAPI_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// DEBUG HELPER
// ============================================
function debugLog(hypothesisId: string, location: string, message: string, data: any) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/068831e1-39c2-46d3-afd8-7578e38ed77a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location,message,data,timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId})}).catch(()=>{});
  // #endregion
}

// ============================================
// TEST EXERCISE: Use one known working ID
// ============================================
const TEST_EXERCISES = [
  { exerciseId: '784203d7-39aa-49a6-9ecb-7dfb807556e5', externalId: '0056', name: 'barbell lying close-grip triceps extension' },
  { exerciseId: 'test-known', externalId: '0001', name: '3/4 sit-up (KNOWN WORKING)' }, // Test with known working ID
];

// ============================================
// URL PATTERN TESTER
// ============================================
async function testUrlPatterns(externalId: string): Promise<{url: string, status: number} | null> {
  // #region agent log
  debugLog('H1-H2', 'debug-gifs.ts:60', 'Testing URL patterns', { externalId });
  // #endregion
  
  const patterns = [
    `https://v2.exercisedb.io/image/${externalId}`,
    `https://v2.exercisedb.io/image/${externalId}.gif`,
    `https://v2.exercisedb.io/image/${parseInt(externalId)}`, // Remove leading zeros
    `https://v2.exercisedb.io/image/${parseInt(externalId)}.gif`,
    `https://exercisedb.p.rapidapi.com/image/${externalId}`,
  ];

  for (const url of patterns) {
    try {
      const status = await testUrl(url, false);
      
      // #region agent log
      debugLog('H1', 'debug-gifs.ts:75', 'URL pattern test result', { url, status, externalId });
      // #endregion
      
      if (status === 200) {
        return { url, status };
      }
    } catch (error: any) {
      // Continue to next pattern
    }
  }

  // Try with authentication
  for (const url of patterns.slice(0, 4)) { // Only try non-RapidAPI URLs with auth
    try {
      const status = await testUrl(url, true);
      
      // #region agent log
      debugLog('H4', 'debug-gifs.ts:92', 'URL with auth test', { url, status, withAuth: true });
      // #endregion
      
      if (status === 200) {
        return { url, status };
      }
    } catch (error: any) {
      // Continue
    }
  }

  return null;
}

function testUrl(url: string, withAuth: boolean): Promise<number> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const options: any = {
      method: 'GET',
      headers: withAuth ? {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      } : {}
    };

    const req = protocol.get(url, options, (res) => {
      // #region agent log
      debugLog('H1-H4', 'debug-gifs.ts:121', 'HTTP response received', {
        url,
        status: res.statusCode,
        headers: res.headers,
        withAuth
      });
      // #endregion
      
      res.resume(); // Drain response
      resolve(res.statusCode || 0);
    });

    req.on('error', (e) => {
      // #region agent log
      debugLog('H1', 'debug-gifs.ts:133', 'HTTP request error', { url, error: e.message });
      // #endregion
      reject(e);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// ============================================
// CHECK IF EXERCISE EXISTS IN API
// ============================================
async function checkExerciseExists(externalId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const options = {
      method: 'GET',
      hostname: RAPIDAPI_HOST,
      path: `/exercises/exercise/${externalId}`,
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    };

    // #region agent log
    debugLog('H3-H5', 'debug-gifs.ts:161', 'Checking if exercise exists in API', { externalId, path: options.path });
    // #endregion

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const exists = parsed && parsed.id === externalId;
          
          // #region agent log
          debugLog('H3', 'debug-gifs.ts:173', 'Exercise API check result', {
            externalId,
            status: res.statusCode,
            exists,
            responseFields: Object.keys(parsed || {}),
            responseData: parsed
          });
          // #endregion
          
          resolve(exists);
        } catch (e) {
          // #region agent log
          debugLog('H3', 'debug-gifs.ts:185', 'Failed to parse API response', { externalId, error: (e as Error).message, rawData: data.substring(0, 200) });
          // #endregion
          resolve(false);
        }
      });
    });

    req.on('error', () => resolve(false));
    req.setTimeout(10000, () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

// ============================================
// MAIN DEBUG FUNCTION
// ============================================
async function debugGifDownload() {
  console.log('= DEBUG MODE: Testing GIF Download Issues\n');
  console.log('═'.repeat(80));
  console.log('Testing with 2 exercises:');
  console.log('  1. Exercise 0056 (broken)');
  console.log('  2. Exercise 0001 (known working from earlier test)');
  console.log('═'.repeat(80));
  console.log('');

  for (const exercise of TEST_EXERCISES) {
    console.log(`\n[${exercise.name}]`);
    console.log(`  External ID: ${exercise.externalId}`);

    // H3: Check if exercise exists in API
    console.log('  = Step 1: Checking if exercise exists in API...');
    const exists = await checkExerciseExists(exercise.externalId);
    console.log(`     ${exists ? '✅' : '❌'} Exercise ${exists ? 'EXISTS' : 'DOES NOT EXIST'} in API`);

    // H1, H2, H4: Test different URL patterns
    console.log('  = Step 2: Testing URL patterns...');
    const workingUrl = await testUrlPatterns(exercise.externalId);
    
    if (workingUrl) {
      console.log(`     ✅ FOUND WORKING URL: ${workingUrl.url}`);
      console.log(`     Status: ${workingUrl.status}`);
    } else {
      console.log(`     ❌ NO WORKING URL FOUND`);
    }

    console.log('');
  }

  console.log('═'.repeat(80));
  console.log('=� DEBUG COMPLETE');
  console.log('═'.repeat(80));
  console.log('');
  console.log('Check debug.log file for detailed hypothesis results');
}

// Run debug
debugGifDownload().catch((error) => {
  console.error('Debug error:', error);
  process.exit(1);
});

