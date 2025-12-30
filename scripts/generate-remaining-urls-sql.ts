import * as fs from 'fs';
import * as path from 'path';

const urls = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'supabase-urls.json'), 'utf-8')
);

// Get the last 37 URLs (the ones we just uploaded)
const last37 = urls.slice(-37);

const sql = last37
  .map((u: any) => `UPDATE exercises SET gif_url = '${u.url}' WHERE id = '${u.id}';`)
  .join('\n');

fs.writeFileSync(
  path.join(__dirname, 'update-remaining-37-urls.sql'),
  sql
);

console.log(`✅ Generated SQL for ${last37.length} remaining URLs`);
console.log(`📄 File: scripts/update-remaining-37-urls.sql`);

