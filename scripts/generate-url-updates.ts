import * as fs from 'fs';
import * as path from 'path';

const urls = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'supabase-urls.json'), 'utf-8')
);

const batches: string[] = [];
const batchSize = 50;

for (let i = 0; i < urls.length; i += batchSize) {
  const batch = urls.slice(i, i + batchSize);
  const sql = batch
    .map((u: any) => `UPDATE exercises SET gif_url = '${u.url}' WHERE id = '${u.id}';`)
    .join('\n');
  batches.push(sql);
}

// Write batches
for (let i = 0; i < batches.length; i++) {
  fs.writeFileSync(
    path.join(__dirname, `url-update-batch-${i + 1}.sql`),
    batches[i]
  );
}

console.log(`✅ Created ${batches.length} SQL batch files`);
console.log(`📊 Total URLs: ${urls.length}`);
console.log(`\nRun these via MCP to update the database.`);

