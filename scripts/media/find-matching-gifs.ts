import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

// ============================================
// CONFIGURATION
// ============================================
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GIF_BUCKET = 'exercise-gifs';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// FUZZY MATCHING UTILITIES
// ============================================

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove all special chars
    .trim();
}

function createSearchVariants(name: string): string[] {
  const variants: string[] = [];
  const lower = name.toLowerCase();
  
  // Original
  variants.push(lower);
  
  // Remove "machine" suffix
  variants.push(lower.replace(/\s*machine\s*$/i, ''));
  
  // Different separators
  variants.push(lower.replace(/\s+/g, '-'));
  variants.push(lower.replace(/\s+/g, '_'));
  variants.push(lower.replace(/\s+/g, ''));
  
  // Remove parentheses content
  variants.push(lower.replace(/\s*\([^)]*\)/g, ''));
  
  // Remove common words
  variants.push(lower.replace(/\b(barbell|dumbbell|cable|machine|lever)\b/gi, '').replace(/\s+/g, ' ').trim());
  
  return [...new Set(variants)];
}

function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);
  
  // Exact match
  if (norm1 === norm2) return 1.0;
  
  // Contains match
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.8;
  
  // Levenshtein distance
  const matrix: number[][] = [];
  const len1 = norm1.length;
  const len2 = norm2.length;
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (norm1[i - 1] === norm2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}

// ============================================
// MAIN FUNCTION
// ============================================

async function findMatchingGifs() {
  console.log('');
  console.log('🔍 FUZZY MATCHING: FIND GIFS FOR BROKEN EXERCISES');
  console.log('═'.repeat(70));
  console.log('');

  // ========================================
  // Step 1: Get broken exercises
  // ========================================
  console.log('📋 Step 1: Fetching broken exercises from database...');
  
  const { data: brokenExercises, error: dbError } = await supabase
    .from('exercises')
    .select('id, name, external_id, gif_url, equipment, category')
    .eq('is_active', true)
    .or('gif_url.is.null,gif_url.not.like.%.gif');

  if (dbError) {
    console.error('❌ Database error:', dbError.message);
    process.exit(1);
  }

  console.log(`✅ Found ${brokenExercises?.length || 0} broken exercises\n`);

  // ========================================
  // Step 2: List all files in storage
  // ========================================
  console.log('📁 Step 2: Listing all GIF files in storage...');
  
  const { data: storageFiles, error: storageError } = await supabase.storage
    .from(GIF_BUCKET)
    .list('', { limit: 1000 });

  if (storageError) {
    console.error('❌ Storage error:', storageError.message);
    process.exit(1);
  }

  const gifFiles = storageFiles?.filter(f => f.name.endsWith('.gif')) || [];
  console.log(`✅ Found ${gifFiles.length} GIF files in storage\n`);

  // ========================================
  // Step 3: Fuzzy match each exercise
  // ========================================
  console.log('🔎 Step 3: Finding potential matches...\n');
  console.log('═'.repeat(70));

  const results: any[] = [];
  let foundMatches = 0;
  let noMatches = 0;

  for (const exercise of brokenExercises || []) {
    console.log(`\n📌 ${exercise.name}`);
    console.log(`   External ID: ${exercise.external_id || 'N/A'}`);
    console.log(`   Current gif_url: ${exercise.gif_url || 'NULL'}`);
    
    // Generate search variants
    const searchVariants = createSearchVariants(exercise.name);
    
    // Find best matches
    const matches = gifFiles.map(file => {
      const fileNameWithoutExt = file.name.replace('.gif', '');
      let maxSimilarity = 0;
      
      // Check against all variants
      for (const variant of searchVariants) {
        const similarity = calculateSimilarity(variant, fileNameWithoutExt);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }
      
      return {
        filename: file.name,
        similarity: maxSimilarity
      };
    })
    .filter(m => m.similarity > 0.4) // Only keep reasonable matches
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5); // Top 5 matches

    if (matches.length > 0) {
      console.log(`   🎯 Potential matches:`);
      matches.forEach((match, idx) => {
        const confidence = match.similarity >= 0.8 ? '🟢 HIGH' : 
                          match.similarity >= 0.6 ? '🟡 MEDIUM' : '🔴 LOW';
        console.log(`      ${idx + 1}. ${match.filename} (${(match.similarity * 100).toFixed(0)}% ${confidence})`);
      });
      foundMatches++;
    } else {
      console.log(`   ❌ No potential matches found`);
      noMatches++;
    }

    results.push({
      exercise,
      matches
    });
  }

  // ========================================
  // Step 4: Summary
  // ========================================
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(70));
  console.log(`Total broken exercises: ${brokenExercises?.length || 0}`);
  console.log(`Exercises with potential matches: ${foundMatches}`);
  console.log(`Exercises with no matches: ${noMatches}`);

  // High confidence matches
  const highConfidence = results.filter(r => r.matches.length > 0 && r.matches[0].similarity >= 0.8);
  if (highConfidence.length > 0) {
    console.log(`\n🟢 HIGH CONFIDENCE MATCHES (${highConfidence.length}):`);
    highConfidence.forEach(r => {
      console.log(`   • ${r.exercise.name} → ${r.matches[0].filename}`);
    });
  }

  // Medium confidence matches
  const mediumConfidence = results.filter(r => r.matches.length > 0 && r.matches[0].similarity >= 0.6 && r.matches[0].similarity < 0.8);
  if (mediumConfidence.length > 0) {
    console.log(`\n🟡 MEDIUM CONFIDENCE MATCHES (${mediumConfidence.length}):`);
    mediumConfidence.forEach(r => {
      console.log(`   • ${r.exercise.name} → ${r.matches[0].filename}`);
    });
  }

  // Low confidence matches
  const lowConfidence = results.filter(r => r.matches.length > 0 && r.matches[0].similarity < 0.6);
  if (lowConfidence.length > 0) {
    console.log(`\n🔴 LOW CONFIDENCE MATCHES (${lowConfidence.length}):`);
    lowConfidence.forEach(r => {
      console.log(`   • ${r.exercise.name} → ${r.matches[0].filename} (${(r.matches[0].similarity * 100).toFixed(0)}%)`);
    });
  }

  console.log('\n🎉 Analysis complete!\n');
}

// Run
findMatchingGifs().catch(console.error);
