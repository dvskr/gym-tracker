import * as fs from 'fs';

// Read the selected exercises
const selected = JSON.parse(
  fs.readFileSync('scripts/selected-400-exercises.json', 'utf-8')
);

const ids = selected.exercises.map((ex: any) => `'${ex.id}'`).join(',\n  ');

const sql = `-- Update all 344 selected exercises to active
UPDATE exercises
SET is_active = true
WHERE id IN (
  ${ids}
);

-- Verify the update
SELECT COUNT(*) as active_count FROM exercises WHERE is_active = true;`;

console.log(sql);

