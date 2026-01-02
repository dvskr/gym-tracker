import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { config } from 'dotenv';

// Load environment variables
config();

// ============================================
// CONFIGURATION
// ============================================
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

const GIF_BUCKET = 'exercise-gifs';
const THUMBNAIL_BUCKET = 'exercise-thumbnails';
const THUMBNAIL_SIZE = 256; // 2x retina for 128px display
const PNG_QUALITY = 90;

// ============================================
// VALIDATION
// ============================================
if (!SUPABASE_URL) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Get it from: Supabase Dashboard → Settings → API → service_role key');
  console.error('Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=your-key-here');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// HELPER FUNCTIONS
// ============================================

function downloadFile(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });
    
    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function createThumbnail(gifBuffer: Buffer): Promise<Buffer> {
  try {
    // Extract first frame from GIF and convert to PNG
    return await sharp(gifBuffer, { 
      animated: false,
      pages: 1
    })
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'cover',
        position: 'center',
      })
      .png({ quality: PNG_QUALITY, compressionLevel: 6 })
      .toBuffer();
  } catch {
    // Fallback: try without animation options
    return await sharp(gifBuffer)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'cover',
        position: 'center',
      })
      .png({ quality: PNG_QUALITY, compressionLevel: 6 })
      .toBuffer();
  }
}

async function uploadThumbnail(filename: string, buffer: Buffer): Promise<boolean> {
  const { error } = await supabase.storage
    .from(THUMBNAIL_BUCKET)
    .upload(filename, buffer, {
      contentType: 'image/png',
      upsert: true,
    });

  return !error;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('');
  console.log('=�  THUMBNAIL GENERATOR');
  console.log('═'.repeat(50));
  console.log(`=� Source bucket:      ${GIF_BUCKET}`);
  console.log(`=� Destination bucket: ${THUMBNAIL_BUCKET}`);
  console.log(`=� Thumbnail size:     ${THUMBNAIL_SIZE}x${THUMBNAIL_SIZE}px (2x retina)`);
  console.log(` Format:             PNG`);
  console.log('═'.repeat(50));
  console.log('');

  // ========================================
  // Step 1: Get all GIFs
  // ========================================
  console.log('=� Fetching GIF list from Supabase...');
  
  const { data: gifFiles, error: listError } = await supabase.storage
    .from(GIF_BUCKET)
    .list('', { limit: 1000 });

  if (listError) {
    console.error('❌ Failed to list GIFs:', listError.message);
    process.exit(1);
  }

  const gifs = gifFiles?.filter(f => f.name.endsWith('.gif')) ?? [];
  console.log(`✅ Found ${gifs.length} GIF files\n`);

  if (gifs.length === 0) {
    console.log('�  No GIF files found in bucket!');
    process.exit(0);
  }

  // ========================================
  // Step 2: Get existing thumbnails
  // ========================================
  console.log('=� Checking existing thumbnails...');
  
  const { data: existingFiles } = await supabase.storage
    .from(THUMBNAIL_BUCKET)
    .list('', { limit: 1000 });

  const existingSet = new Set(existingFiles?.map(f => f.name) ?? []);
  console.log(`✅ Found ${existingSet.size} existing thumbnails\n`);

  // ========================================
  // Step 3: Process GIFs
  // ========================================
  console.log('= Generating thumbnails...\n');

  let created = 0;
  let skipped = 0;
  let failed = 0;
  const failures: string[] = [];

  for (let i = 0; i < gifs.length; i++) {
    const gif = gifs[i];
    const gifName = gif.name;
    const pngName = gifName.replace('.gif', '.png');
    const progress = `[${String(i + 1).padStart(3)}/${gifs.length}]`;

    // Skip if exists
    if (existingSet.has(pngName)) {
      skipped++;
      continue;
    }

    process.stdout.write(`${progress} Processing ${gifName}...`);

    try {
      // Get URL
      const { data: urlData } = supabase.storage
        .from(GIF_BUCKET)
        .getPublicUrl(gifName);

      // Download
      const gifBuffer = await downloadFile(urlData.publicUrl);

      // Create thumbnail
      const pngBuffer = await createThumbnail(gifBuffer);

      // Upload
      const success = await uploadThumbnail(pngName, pngBuffer);

      if (success) {
        created++;
        console.log(` ✅`);
      } else {
        failed++;
        failures.push(gifName);
        console.log(` ❌ Upload failed`);
      }
    } catch (error: any) {
      failed++;
      failures.push(`${gifName}: ${error.message}`);
      console.log(` ❌ ${error.message}`);
    }

    // Rate limit protection
    await new Promise(r => setTimeout(r, 50));
  }

  // ========================================
  // Step 4: Summary
  // ========================================
  console.log('');
  console.log('═'.repeat(50));
  console.log('=� RESULTS');
  console.log('═'.repeat(50));
  console.log(`✅ Created:  ${created}`);
  console.log(`�  Skipped:  ${skipped} (already exist)`);
  console.log(`❌ Failed:   ${failed}`);
  console.log(`=� Total:    ${existingSet.size + created} thumbnails`);
  console.log('═'.repeat(50));

  if (failures.length > 0 && failures.length <= 10) {
    console.log('\n❌ Failed files:');
    failures.forEach(f => console.log(`   • ${f}`));
  }

  console.log('\n Done!\n');
}

main().catch(console.error);
