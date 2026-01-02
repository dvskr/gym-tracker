import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function auditExerciseSchema() {
  console.log('');
  console.log('= EXERCISE TABLE SCHEMA AUDIT');
  console.log('═'.repeat(60));
  console.log('');

  // ========================================
  // Step 1: Get table columns
  // ========================================
  console.log('=� Step 1: Checking all columns in exercises table...\n');

  // Get a sample row and check its keys
  const { data: sampleRows } = await supabase
    .from('exercises')
    .select('*')
    .eq('is_active', true)
    .limit(1);

  if (sampleRows && sampleRows.length > 0) {
    const allColumns = Object.keys(sampleRows[0]);
    
    console.log(`Found ${allColumns.length} total columns:\n`);
    
    // Categorize columns
    const imageColumns: string[] = [];
    const metadataColumns: string[] = [];
    const otherColumns: string[] = [];
    
    allColumns.forEach(col => {
      const lower = col.toLowerCase();
      if (lower.includes('url') || lower.includes('image') || lower.includes('gif') || 
          lower.includes('thumbnail') || lower.includes('photo') || lower.includes('picture')) {
        imageColumns.push(col);
      } else if (lower.includes('id') || lower.includes('name') || lower.includes('external')) {
        metadataColumns.push(col);
      } else {
        otherColumns.push(col);
      }
    });
    
    console.log('=  IMAGE-RELATED COLUMNS:');
    if (imageColumns.length === 0) {
      console.log('   (none found)');
    } else {
      imageColumns.forEach(col => {
        const value = sampleRows[0][col];
        const preview = value ? (typeof value === 'string' ? value.substring(0, 50) : JSON.stringify(value).substring(0, 50)) : 'NULL';
        console.log(`   • ${col}: ${preview}${value && value.length > 50 ? '...' : ''}`);
      });
    }
    
    console.log('\n= KEY METADATA COLUMNS:');
    metadataColumns.forEach(col => {
      const value = sampleRows[0][col];
      console.log(`   • ${col}: ${value}`);
    });
    
    console.log('\n= OTHER COLUMNS:');
    console.log(`   ${otherColumns.join(', ')}`);
  }

  // ========================================
  // Step 2: Check image column usage stats
  // ========================================
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('= Step 2: Image Column Usage Statistics');
  console.log('═'.repeat(60));
  console.log('');

  // Check gif_url
  const { count: totalActive } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  const { count: hasGifUrl } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .not('gif_url', 'is', null)
    .neq('gif_url', '');

  const { count: emptyGifUrl } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('gif_url', '');

  console.log('gif_url column:');
  console.log(`   Total active exercises: ${totalActive}`);
  console.log(`   Has gif_url (not null): ${hasGifUrl}`);
  console.log(`   Empty string gif_url:   ${emptyGifUrl || 0}`);
  console.log(`   NULL gif_url:           ${(totalActive || 0) - (hasGifUrl || 0) - (emptyGifUrl || 0)}`);

  // ========================================
  // Step 3: Sample data
  // ========================================
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('= Step 3: Sample Exercise Data');
  console.log('═'.repeat(60));
  console.log('');

  const { data: samples } = await supabase
    .from('exercises')
    .select('id, name, external_id, gif_url')
    .eq('is_active', true)
    .order('name')
    .limit(10);

  samples?.forEach((ex, i) => {
    console.log(`${i + 1}. ${ex.name}`);
    console.log(`   ID: ${ex.id}`);
    console.log(`   External ID: ${ex.external_id || 'NULL'}`);
    const gifFilename = ex.gif_url ? ex.gif_url.split('/').pop() : 'NULL';
    console.log(`   GIF: ${gifFilename}`);
    console.log('');
  });

  // ========================================
  // Step 4: Check for exercises missing gif_url
  // ========================================
  console.log('═'.repeat(60));
  console.log('  Exercises Without GIF URLs (Active)');
  console.log('═'.repeat(60));
  console.log('');

  const { data: missingGifs } = await supabase
    .from('exercises')
    .select('id, name, external_id, equipment, category')
    .eq('is_active', true)
    .is('gif_url', null);

  if (missingGifs && missingGifs.length > 0) {
    console.log(`Found ${missingGifs.length} active exercises without GIF URLs:\n`);
    missingGifs.forEach((ex, i) => {
      console.log(`${i + 1}. ${ex.name}`);
      console.log(`   Equipment: ${ex.equipment || 'N/A'}`);
      console.log(`   Category: ${ex.category || 'N/A'}`);
      console.log('');
    });
  } else {
    console.log('✅ All active exercises have GIF URLs!');
  }

  // ========================================
  // Step 5: Recommendations
  // ========================================
  console.log('═'.repeat(60));
  console.log('=� RECOMMENDATIONS');
  console.log('═'.repeat(60));
  console.log('');

  const hasOnlyGifUrl = imageColumns.length === 1 && imageColumns[0] === 'gif_url';
  
  if (hasOnlyGifUrl) {
    console.log('✅ Schema is CLEAN:');
    console.log('   • Only one image column: gif_url');
    console.log('   • No redundant columns');
    console.log('');
    console.log('> Do we need a thumbnail_url column?');
    console.log('');
    console.log('   ❌ NO - Not recommended because:');
    console.log('      • getThumbnailUrl() already converts gif_url → thumbnail URL');
    console.log('      • Adding thumbnail_url would be redundant');
    console.log('      • Thumbnail URL is DERIVED from gif_url (just change extension)');
    console.log('      • One source of truth is better (DRY principle)');
    console.log('');
    console.log('   ✅ Current approach is optimal:');
    console.log('      • Store: gif_url only');
    console.log('      • Derive: thumbnail URL at runtime');
    console.log('      • Benefit: Never out of sync, one field to maintain');
  } else if (imageColumns.length > 1) {
    console.log('  Multiple image columns detected:');
    imageColumns.forEach(col => console.log(`   • ${col}`));
    console.log('');
    console.log('   Consider consolidating to a single gif_url column.');
  }
  
  console.log('');
}

auditExerciseSchema().catch(console.error);
