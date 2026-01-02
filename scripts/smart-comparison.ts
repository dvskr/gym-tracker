import * as fs from 'fs';

// Strong's exercises
const strongExercises = [
  "Ab Wheel", "Aerobics", "Arnold Press", "Around the World",
  "Back Extension", "Back Extension (Machine)", "Ball Slams", "Battle Ropes", 
  "Bench Dip", "Bench Press (Barbell)", "Bench Press (Cable)", "Bench Press (Dumbbell)", 
  "Bench Press (Smith Machine)", "Bench Press - Close Grip", "Bench Press - Wide Grip",
  "Bent Over One Arm Row (Dumbbell)", "Bent Over Row (Band)", "Bent Over Row (Barbell)", 
  "Bent Over Row (Dumbbell)", "Bent Over Row - Underhand (Barbell)",
  "Bicep Curl (Barbell)", "Bicep Curl (Cable)", "Bicep Curl (Dumbbell)", "Bicep Curl (Machine)",
  "Bicycle Crunch", "Box Jump", "Box Squat (Barbell)", "Bulgarian Split Squat", "Burpee",
  "Cable Crossover", "Cable Crunch", "Cable Kickback", "Cable Pull Through", "Cable Twist",
  "Calf Press on Leg Press", "Calf Press on Seated Leg Press",
  "Chest Dip", "Chest Dip (Assisted)", "Chest Fly", "Chest Fly (Band)", "Chest Fly (Dumbbell)",
  "Chest Press (Band)", "Chest Press (Machine)", "Chin Up", "Chin Up (Assisted)",
  "Clean (Barbell)", "Clean and Jerk (Barbell)", "Climbing",
  "Concentration Curl (Dumbbell)", "Cross Body Crunch", "Crunch", "Crunch (Machine)", 
  "Crunch (Stability Ball)", "Cycling", "Cycling (Indoor)",
  "Deadlift (Band)", "Deadlift (Barbell)", "Deadlift (Dumbbell)", "Deadlift (Smith Machine)",
  "Deadlift High Pull (Barbell)", "Decline Bench Press (Barbell)", "Decline Bench Press (Dumbbell)",
  "Decline Bench Press (Smith Machine)", "Decline Crunch", "Deficit Deadlift (Barbell)",
  "Elliptical Machine",
  "Face Pull (Cable)", "Flat Knee Raise", "Flat Leg Raise", "Floor Press (Barbell)",
  "Front Raise (Band)", "Front Raise (Barbell)", "Front Raise (Cable)", "Front Raise (Dumbbell)",
  "Front Raise (Plate)", "Front Squat (Barbell)",
  "Glute Ham Raise", "Glute Kickback (Machine)", "Goblet Squat (Kettlebell)", "Good Morning (Barbell)",
  "Hack Squat", "Hack Squat (Barbell)", "Hammer Curl (Band)", "Hammer Curl (Cable)",
  "Hammer Curl (Dumbbell)", "Hand Gripper", "Handstand Push Up", "Hang Clean (Barbell)",
  "Hang Snatch (Barbell)", "Hanging Knee Raise", "Hanging Leg Raise", "High Knee Skips",
  "Hiking", "Hip Abductor (Machine)", "Hip Adductor (Machine)", "Hip Thrust (Barbell)",
  "Hip Thrust (Bodyweight)",
  "Incline Bench Press (Barbell)", "Incline Bench Press (Cable)", "Incline Bench Press (Dumbbell)",
  "Incline Bench Press (Smith Machine)", "Incline Chest Fly (Dumbbell)", "Incline Chest Press (Machine)",
  "Incline Curl (Dumbbell)", "Incline Row (Dumbbell)", "Inverted Row (Bodyweight)",
  "Iso-Lateral Chest Press (Machine)", "Iso-Lateral Row (Machine)",
  "Jackknife Sit Up", "Jump Rope", "Jump Shrug (Barbell)", "Jump Squat", "Jumping Jack",
  "Kettlebell Swing", "Kettlebell Turkish Get Up", "Kipping Pull Up", "Knee Raise (Captain's Chair)",
  "Kneeling Pulldown (Band)", "Knees to Elbows",
  "Lat Pulldown (Cable)", "Lat Pulldown (Machine)", "Lat Pulldown (Single Arm)",
  "Lat Pulldown - Underhand (Band)", "Lat Pulldown - Underhand (Cable)", "Lat Pulldown - Wide Grip (Cable)",
  "Lateral Box Jump", "Lateral Raise (Band)", "Lateral Raise (Cable)", "Lateral Raise (Dumbbell)",
  "Lateral Raise (Machine)", "Leg Extension (Machine)", "Leg Press",
  "Lunge (Barbell)", "Lunge (Bodyweight)", "Lunge (Dumbbell)", "Lying Leg Curl (Machine)",
  "Mountain Climber", "Muscle Up",
  "Oblique Crunch", "Overhead Press (Barbell)", "Overhead Press (Cable)", "Overhead Press (Dumbbell)",
  "Overhead Press (Smith Machine)", "Overhead Squat (Barbell)",
  "Pec Deck (Machine)", "Pendlay Row (Barbell)", "Pistol Squat", "Plank", "Power Clean",
  "Power Snatch (Barbell)", "Preacher Curl (Barbell)", "Preacher Curl (Dumbbell)",
  "Preacher Curl (Machine)", "Press Under (Barbell)", "Pull Up", "Pull Up (Assisted)",
  "Pull Up (Band)", "Pullover (Dumbbell)", "Pullover (Machine)", "Push Press",
  "Push Up", "Push Up (Band)", "Push Up (Knees)",
  "Rack Pull (Barbell)", "Reverse Crunch", "Reverse Curl (Band)", "Reverse Curl (Barbell)",
  "Reverse Curl (Dumbbell)", "Reverse Fly (Cable)", "Reverse Fly (Dumbbell)", "Reverse Fly (Machine)",
  "Reverse Grip Concentration Curl (Dumbbell)", "Reverse Plank", "Romanian Deadlift (Barbell)",
  "Romanian Deadlift (Dumbbell)", "Rowing (Machine)", "Running", "Running (Treadmill)", "Russian Twist",
  "Seated Calf Raise (Machine)", "Seated Calf Raise (Plate Loaded)", "Seated Leg Curl (Machine)",
  "Seated Leg Press (Machine)", "Seated Overhead Press (Barbell)", "Seated Overhead Press (Dumbbell)",
  "Seated Palms Up Wrist Curl (Dumbbell)", "Seated Row (Cable)", "Seated Row (Machine)",
  "Seated Wide-Grip Row (Cable)",
  "Shoulder Press (Machine)", "Shoulder Press (Plate Loaded)", "Shrug (Barbell)", "Shrug (Dumbbell)",
  "Shrug (Machine)", "Shrug (Smith Machine)", "Side Bend (Band)", "Side Bend (Cable)",
  "Side Bend (Dumbbell)", "Side Plank", "Single Leg Bridge", "Sit Up", "Skating", "Skiing",
  "Skullcrusher (Barbell)", "Skullcrusher (Dumbbell)", "Snatch (Barbell)", "Snatch Pull (Barbell)",
  "Snowboarding", "Split Jerk (Barbell)", "Squat (Band)", "Squat (Barbell)", "Squat (Bodyweight)",
  "Squat (Dumbbell)", "Squat (Machine)", "Squat (Smith Machine)", "Squat Row (Band)",
  "Standing Calf Raise (Barbell)", "Standing Calf Raise (Bodyweight)", "Standing Calf Raise (Dumbbell)",
  "Standing Calf Raise (Machine)", "Standing Calf Raise (Smith Machine)", "Step-up",
  "Stiff Leg Deadlift (Barbell)", "Stiff Leg Deadlift (Dumbbell)", "Straight Leg Deadlift (Band)",
  "Stretching", "Strict Military Press (Barbell)", "Sumo Deadlift (Barbell)",
  "Sumo Deadlift High Pull (Barbell)", "Superman", "Swimming",
  "T Bar Row", "Thruster (Barbell)", "Thruster (Kettlebell)", "Toes To Bar", "Torso Rotation (Machine)",
  "Trap Bar Deadlift", "Triceps Dip", "Triceps Dip (Assisted)", "Triceps Extension",
  "Triceps Extension (Barbell)", "Triceps Extension (Cable)", "Triceps Extension (Dumbbell)",
  "Triceps Extension (Machine)", "Triceps Pushdown (Cable - Straight Bar)",
  "Upright Row (Barbell)", "Upright Row (Cable)", "Upright Row (Dumbbell)",
  "V Up", "Walking", "Wide Pull Up", "Wrist Roller", "Yoga", "Zercher Squat (Barbell)"
];

// Load our exercises
const ourExercisesRaw = fs.readFileSync('scripts/exercise-names-list.txt', 'utf-8');
const ourExercises = ourExercisesRaw.split('\n').filter(Boolean);

// INTELLIGENT NORMALIZATION
function normalizeForComparison(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, '') // Remove parentheses content
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

// EXTRACT CORE MOVEMENT
function extractCoreMovement(name: string): string {
  const normalized = normalizeForComparison(name);
  
  // Remove common prefixes/modifiers
  return normalized
    .replace(/^(barbell|dumbbell|cable|band|lever|machine|smith|ez|kettlebell|bodyweight)\s+/g, '')
    .replace(/\s+(barbell|dumbbell|cable|band|lever|machine|smith|ez|kettlebell|bodyweight)$/g, '')
    .replace(/^(assisted|seated|standing|lying|incline|decline|kneeling)\s+/g, '')
    .replace(/\s+(assisted|seated|standing|lying|incline|decline|kneeling)$/g, '')
    .trim();
}

// SMART MATCHING
function findBestMatch(strongEx: string, ourExercises: string[]): any {
  const strongNorm = normalizeForComparison(strongEx);
  const strongCore = extractCoreMovement(strongEx);
  
  let bestMatch: any = null;
  let bestScore = 0;
  
  for (const ourEx of ourExercises) {
    const ourNorm = normalizeForComparison(ourEx);
    const ourCore = extractCoreMovement(ourEx);
    
    let score = 0;
    
    // Exact match after normalization
    if (strongNorm === ourNorm) {
      score = 100;
    }
    // Core movement exact match
    else if (strongCore === ourCore && strongCore.length > 3) {
      score = 90;
    }
    // Strong core is substring of our core
    else if (ourCore.includes(strongCore) && strongCore.length > 4) {
      score = 80;
    }
    // Our core is substring of strong core
    else if (strongCore.includes(ourCore) && ourCore.length > 4) {
      score = 75;
    }
    // Significant word overlap
    else {
      const strongWords = new Set(strongCore.split(' '));
      const ourWords = new Set(ourCore.split(' '));
      const intersection = [...strongWords].filter(w => ourWords.has(w) && w.length > 2);
      
      if (intersection.length >= 2) {
        score = 60 + (intersection.length * 5);
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        ourExercise: ourEx,
        score: score,
        strongNorm: strongNorm,
        ourNorm: ourNorm,
        strongCore: strongCore,
        ourCore: ourCore
      };
    }
  }
  
  // Only return if confidence is high enough
  return bestScore >= 70 ? bestMatch : null;
}

// RUN COMPARISON
console.log('= Running SMART comparison...\n');
console.log(`Strong exercises: ${strongExercises.length}`);
console.log(`Our exercises: ${ourExercises.length}\n`);

const results = {
  definiteMatches: [] as any[],
  likelyMatches: [] as any[],
  trulyMissing: [] as string[],
  duplicatesFound: [] as any[]
};

for (const strongEx of strongExercises) {
  const match = findBestMatch(strongEx, ourExercises);
  
  if (match) {
    if (match.score >= 90) {
      results.definiteMatches.push({ strong: strongEx, ...match });
    } else {
      results.likelyMatches.push({ strong: strongEx, ...match });
    }
  } else {
    results.trulyMissing.push(strongEx);
  }
}

// Find potential duplicates in OUR exercises
const coreMovements = new Map<string, string[]>();
for (const ourEx of ourExercises) {
  const core = extractCoreMovement(ourEx);
  if (!coreMovements.has(core)) {
    coreMovements.set(core, []);
  }
  coreMovements.get(core)!.push(ourEx);
}

for (const [core, exercises] of coreMovements.entries()) {
  if (exercises.length > 5 && core.length > 3) { // More than 5 variations
    results.duplicatesFound.push({
      coreMovement: core,
      count: exercises.length,
      exercises: exercises.slice(0, 10) // Show first 10
    });
  }
}

// GENERATE REPORT
console.log('='.repeat(70));
console.log('=� SMART COMPARISON RESULTS');
console.log('='.repeat(70));

console.log(`\n✅ DEFINITE MATCHES (${results.definiteMatches.length}):`);
console.log('These exercises exist in your database with slightly different names.\n');
results.definiteMatches.slice(0, 20).forEach(m => {
  console.log(`  ${m.strong}`);
  console.log(`    → ${m.ourExercise} (${m.score}% match)`);
});
if (results.definiteMatches.length > 20) {
  console.log(`  ... and ${results.definiteMatches.length - 20} more`);
}

console.log(`\n�  LIKELY MATCHES (${results.likelyMatches.length}):`);
console.log('These might be the same exercise - needs review.\n');
results.likelyMatches.slice(0, 15).forEach(m => {
  console.log(`  ${m.strong}`);
  console.log(`    → ${m.ourExercise} (${m.score}% match)`);
});
if (results.likelyMatches.length > 15) {
  console.log(`  ... and ${results.likelyMatches.length - 15} more`);
}

console.log(`\n❌ TRULY MISSING (${results.trulyMissing.length}):`);
console.log('These exercises are NOT in your database.\n');
results.trulyMissing.slice(0, 30).forEach(ex => {
  console.log(`  - ${ex}`);
});
if (results.trulyMissing.length > 30) {
  console.log(`  ... and ${results.trulyMissing.length - 30} more`);
}

console.log(`\n= POTENTIAL DUPLICATES IN YOUR DATABASE (${results.duplicatesFound.length} groups):`);
console.log('You have many variations of the same exercise.\n');
results.duplicatesFound.slice(0, 10).forEach(d => {
  console.log(`  "${d.coreMovement}" - ${d.count} variations:`);
  d.exercises.slice(0, 5).forEach((ex: string) => console.log(`    - ${ex}`));
  if (d.count > 5) console.log(`    ... and ${d.count - 5} more`);
});

console.log('\n' + '='.repeat(70));
console.log('=� SUMMARY:');
console.log('='.repeat(70));
console.log(`Definite Matches: ${results.definiteMatches.length}`);
console.log(`Likely Matches: ${results.likelyMatches.length}`);
console.log(`Truly Missing: ${results.trulyMissing.length}`);
console.log(`\nACTUAL GAP: ${results.trulyMissing.length} exercises (not 199!)`);
console.log(`Current Coverage: ${Math.round(((results.definiteMatches.length + results.likelyMatches.length) / strongExercises.length) * 100)}%\n`);

// Save detailed report
fs.writeFileSync(
  'scripts/smart-comparison-report.json',
  JSON.stringify(results, null, 2)
);

console.log('=� Full report saved to: scripts/smart-comparison-report.json\n');

