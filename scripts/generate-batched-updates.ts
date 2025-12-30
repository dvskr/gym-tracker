import * as fs from 'fs';

// Read the selected exercises
const selected = JSON.parse(
  fs.readFileSync('scripts/selected-400-exercises.json', 'utf-8')
);

const ids = selected.exercises.map((ex: any) => ex.id);

// Split into batches of 50
const batchSize = 50;
const batches = [];

for (let i = 0; i < ids.length; i += batchSize) {
  const batch = ids.slice(i, i + batchSize);
  batches.push(batch);
}

console.log(`Total exercises: ${ids.length}`);
console.log(`Number of batches: ${batches.length}`);
console.log(`Batch size: ${batchSize}`);

// Output SQL for each batch
batches.forEach((batch, index) => {
  const idList = batch.map(id => `'${id}'`).join(',\n  ');
  console.log(`\n-- Batch ${index + 1}/${batches.length}`);
  console.log(`UPDATE exercises SET is_active = true WHERE id IN (\n  ${idList}\n);`);
});

console.log(`\n-- Verify`);
console.log(`SELECT COUNT(*) FROM exercises WHERE is_active = true;`);

