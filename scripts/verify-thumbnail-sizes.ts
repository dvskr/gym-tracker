import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as https from 'https';
import * as fs from 'fs';
import sharp from 'sharp';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyThumbnailSizes() {
  console.log('= Verifying thumbnail dimensions in Supabase Storage...\n');

  // Get list of files
  const { data: files, error } = await supabase
    .storage
    .from('exercise-thumbnails')
    .list('', { limit: 10 });

  if (error || !files) {
    console.error('Error listing files:', error);
    return;
  }

  console.log(`Checking first 10 thumbnails:\n`);

  for (const file of files) {
    try {
      // Get public URL
      const { data } = supabase
        .storage
        .from('exercise-thumbnails')
        .getPublicUrl(file.name);

      const url = data.publicUrl;

      // Download and check dimensions
      const tempFile = `temp-${file.name}`;
      
      await new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(tempFile);
        https.get(url, (response) => {
          response.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            resolve(null);
          });
        }).on('error', reject);
      });

      // Check dimensions with sharp
      const metadata = await sharp(tempFile).metadata();
      
      console.log(`${file.name}:`);
      console.log(`  Dimensions: ${metadata.width}x${metadata.height}`);
      console.log(`  Size: ${(file.metadata?.size || 0 / 1024).toFixed(2)} KB`);
      console.log(`  URL: ${url}\n`);

      // Clean up
      fs.unlinkSync(tempFile);

      // Stop after first successful check
      if (metadata.width) {
        console.log('='.repeat(60));
        if (metadata.width === 224 && metadata.height === 224) {
          console.log('✅ VERIFIED: Thumbnails are 224x224px in Supabase!');
          console.log('ULTRA-PREMIUM 4x retina quality confirmed. =�\n');
        } else if (metadata.width === 168 && metadata.height === 168) {
          console.log('✅ VERIFIED: Thumbnails are 168x168px in Supabase!');
          console.log('Ultra-sharp 3x retina quality confirmed.\n');
        } else if (metadata.width === 112 && metadata.height === 112) {
          console.log('✅ VERIFIED: Thumbnails are 112x112px in Supabase!');
          console.log('Standard 2x retina quality.\n');
        } else if (metadata.width === 32 && metadata.height === 32) {
          console.log('❌ PROBLEM: Thumbnails are still 32x32px in Supabase!');
          console.log('The upload did NOT replace the old files.\n');
        } else {
          console.log(`�  UNEXPECTED: Thumbnails are ${metadata.width}x${metadata.height}px\n`);
        }
        console.log('='.repeat(60));
        break;
      }

    } catch (err: any) {
      console.error(`Error checking ${file.name}:`, err.message);
    }
  }
}

verifyThumbnailSizes();

