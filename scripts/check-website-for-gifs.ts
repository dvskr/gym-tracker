import * as https from 'https';
import { config } from 'dotenv';

config();

// List of external IDs that are missing
const missingExternalIds = [
  '0056', '0154', '0803', '0596', '0593', '0175', '1350', '0107',
  '0443', '0602', '0601', '0471', '0570', '0577', '0583', '0603',
  '0631', '0668', '0544', '0697', '3236', '1495', '1349'
];

function checkWebsiteForGif(externalId: string): Promise<{ found: boolean; url?: string }> {
  return new Promise((resolve) => {
    // Check if ExerciseDB website has the GIF
    const websiteUrl = `https://www.exercisedb.io/exercises/exercise/${externalId}`;
    
    https.get(websiteUrl, (res) => {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        // Look for GIF URLs in the HTML
        const gifRegex = /https?:\/\/[^\s"']+\.gif/gi;
        const matches = html.match(gifRegex);
        
        if (matches && matches.length > 0) {
          resolve({ found: true, url: matches[0] });
        } else {
          resolve({ found: false });
        }
      });
    }).on('error', () => {
      resolve({ found: false });
    });
  });
}

async function scanWebsite() {
  console.log('\n= CHECKING EXERCISEDB WEBSITE FOR GIFS\n');
  console.log('═'.repeat(70));
  
  let found = 0;
  let notFound = 0;
  
  for (const externalId of missingExternalIds) {
    process.stdout.write(`Checking ${externalId}... `);
    
    const result = await checkWebsiteForGif(externalId);
    
    if (result.found) {
      console.log(`✅ FOUND: ${result.url}`);
      found++;
    } else {
      console.log(`❌ Not found`);
      notFound++;
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n═'.repeat(70));
  console.log(`= RESULTS`);
  console.log(`✅ Found on website: ${found}`);
  console.log(`❌ Not found: ${notFound}`);
}

scanWebsite();
