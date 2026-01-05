import * as fs from 'fs';
import * as path from 'path';

// The external_ids from the 23 broken exercises (from previous query)
const missingExternalIds = [
  '0056', '0107', '0154', '0175', '0443', '0471', '0544', 
  '0570', '0577', '0583', '0593', '0596', '0601', 
  '0602', '0603', '0631', '0668', '0697', '0803', '1349', 
  '1350', '1495', '3236'
];

const LOCAL_GIF_FOLDER = path.join(__dirname, '..', 'exercise-gifs');

interface CheckResult {
  externalId: string;
  filename: string;
  found: boolean;
  fileSize?: number;
}

async function checkLocalGifs() {
  console.log('= CHECKING LOCAL FOLDER FOR MISSING GIFs');
  console.log('═'.repeat(80));
  console.log(`Folder: ${LOCAL_GIF_FOLDER}\n`);

  // Check if folder exists
  if (!fs.existsSync(LOCAL_GIF_FOLDER)) {
    console.error('❌ Folder does not exist:', LOCAL_GIF_FOLDER);
    return;
  }

  // Get all files in folder
  const allFiles = fs.readdirSync(LOCAL_GIF_FOLDER);
  const gifFiles = allFiles.filter(f => f.endsWith('.gif'));
  
  console.log(`Total GIF files in local folder: ${gifFiles.length}\n`);
  console.log('─'.repeat(80));
  console.log('Checking for 23 missing exercise GIFs:\n');

  // Check for each missing external_id
  const results: CheckResult[] = [];

  for (const extId of missingExternalIds) {
    const filename = `${extId}.gif`;
    const filePath = path.join(LOCAL_GIF_FOLDER, filename);
    
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      results.push({
        externalId: extId,
        filename,
        found: true,
        fileSize: stats.size
      });
      console.log(`✅ FOUND: ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);
    } else {
      results.push({
        externalId: extId,
        filename,
        found: false
      });
      console.log(`❌ MISSING: ${filename}`);
    }
  }

  const found = results.filter(r => r.found);
  const missing = results.filter(r => !r.found);

  console.log('\n═'.repeat(80));
  console.log('= SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Total checked: ${missingExternalIds.length}`);
  console.log(`✅ Found locally: ${found.length}`);
  console.log(`❌ Missing from local folder: ${missing.length}`);
  console.log('');

  if (found.length > 0) {
    console.log('✅ FILES FOUND LOCALLY (ready to upload):');
    console.log('─'.repeat(80));
    found.forEach(r => {
      console.log(`  ${r.filename} - ${(r.fileSize! / 1024).toFixed(1)} KB`);
    });
    console.log('');
    
    const totalSize = found.reduce((sum, r) => sum + (r.fileSize || 0), 0);
    console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log('');
  }

  if (missing.length > 0) {
    console.log('❌ FILES MISSING FROM LOCAL FOLDER:');
    console.log('─'.repeat(80));
    missing.forEach(r => {
      console.log(`  ${r.filename}`);
    });
    console.log('');
  }

  // Save results
  const outputData = {
    timestamp: new Date().toISOString(),
    localFolder: LOCAL_GIF_FOLDER,
    totalChecked: missingExternalIds.length,
    foundCount: found.length,
    missingCount: missing.length,
    found: found.map(r => ({
      externalId: r.externalId,
      filename: r.filename,
      fileSize: r.fileSize
    })),
    missing: missing.map(r => ({
      externalId: r.externalId,
      filename: r.filename
    }))
  };

  fs.writeFileSync(
    path.join(__dirname, 'local-gif-check-results.json'), 
    JSON.stringify(outputData, null, 2)
  );

  console.log('═'.repeat(80));
  console.log('=� Results saved to scripts/local-gif-check-results.json');
  console.log('═'.repeat(80));
  console.log('');

  // Recommendation
  console.log('= NEXT STEPS:');
  console.log('─'.repeat(80));
  
  if (found.length === missingExternalIds.length) {
    console.log(' ALL FILES FOUND!');
    console.log('');
    console.log('Next: Upload these files to Supabase with UUID names');
    console.log('      and update database gif_url values.');
  } else if (found.length > 0) {
    console.log(`✅ ${found.length} files can be uploaded immediately`);
    console.log(`❌ ${missing.length} exercises should be deactivated`);
    console.log('');
    console.log('Options:');
    console.log('1. Upload found files + deactivate exercises with missing files');
    console.log('2. Try to download missing files from external source');
  } else {
    console.log('❌ NO FILES FOUND LOCALLY');
    console.log('');
    console.log('Options:');
    console.log('1. Deactivate all 23 exercises');
    console.log('2. Download GIFs from external source (e.g., wger.de API)');
  }
  console.log('');
}

checkLocalGifs();
