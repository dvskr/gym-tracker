import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY! // Need service role for updates
);

function cleanName(rawName: string): string {
  let cleaned = rawName;

  // 1. Remove junk patterns
  cleaned = cleaned.replace(/\(kneeling\)/gi, '');
  cleaned = cleaned.replace(/v\. \d+/gi, '');
  cleaned = cleaned.replace(/with arm blaster/gi, '');
  cleaned = cleaned.replace(/with towel/gi, '');
  cleaned = cleaned.replace(/with stability ball/gi, '');

  // 2. Capitalize properly
  cleaned = cleaned
    .split(' ')
    .map(word => {
      if (word === 'ez') return 'EZ';
      if (word === 'db') return 'DB';
      if (word === 'bb') return 'BB';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

  // 3. Standardize equipment names
  cleaned = cleaned.replace(/leverage machine/gi, 'Machine');
  cleaned = cleaned.replace(/body weight/gi, 'Bodyweight');
  cleaned = cleaned.replace(/ez barbell/gi, 'EZ Barbell');

  // 4. Remove extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 5. Remove leading/trailing special chars
  cleaned = cleaned.replace(/^[^\w]+|[^\w]+$/g, '');

  return cleaned;
}

async function cleanAllNames() {
  // Read selected exercises
  const selected = JSON.parse(
    fs.readFileSync('scripts/selected-400-exercises.json', 'utf-8')
  );

  console.log('🧹 Cleaning exercise names...\n');

  let cleaned = 0;
  const updates = [];

  for (const exercise of selected.exercises) {
    const original = exercise.name;
    const clean = cleanName(original);

    if (original !== clean) {
      updates.push({ id: exercise.id, original, clean });
      cleaned++;
    }
  }

  console.log(`📝 Found ${cleaned} names to clean\n`);

  // Show samples
  console.log('Sample cleanings:');
  updates.slice(0, 10).forEach(u => {
    console.log(`  ${u.original}`);
    console.log(`  → ${u.clean}\n`);
  });

  // Save for review
  fs.writeFileSync(
    'scripts/name-cleanings.json',
    JSON.stringify(updates, null, 2)
  );

  console.log('✅ Name cleanings saved to: scripts/name-cleanings.json');
  console.log('\nReview the changes, then run: npm run apply:clean-names');
}

cleanAllNames();

