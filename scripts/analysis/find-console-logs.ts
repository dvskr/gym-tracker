import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface LogLocation {
  file: string;
  line: number;
  content: string;
  type: 'log' | 'error' | 'warn' | 'debug' | 'info';
}

async function findConsoleLogs(): Promise<void> {
  const files = await glob('**/*.{ts,tsx}', {
    ignore: ['node_modules/**', 'scripts/**', '.expo/**', '*.d.ts'],
    cwd: process.cwd(),
  });

  const results: LogLocation[] = [];
  const summary: Record<string, number> = {};
  const byType: Record<string, number> = { log: 0, error: 0, warn: 0, debug: 0, info: 0 };

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const match = line.match(/console\.(log|error|warn|debug|info)\s*\(/);
      if (match) {
        const type = match[1] as LogLocation['type'];
        results.push({
          file,
          line: index + 1,
          content: line.trim().slice(0, 120),
          type,
        });
        summary[file] = (summary[file] || 0) + 1;
        byType[type] = (byType[type] || 0) + 1;
      }
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 CONSOLE LOG ANALYSIS');
  console.log('='.repeat(60));
  console.log(`\nTotal: ${results.length} console statements in app code\n`);
  
  console.log('By type:');
  Object.entries(byType)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  console.${type}: ${count}`);
    });

  console.log('\nTop 20 files by count:');
  Object.entries(summary)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([file, count]) => {
      console.log(`  ${count.toString().padStart(4)} - ${file}`);
    });

  // Group by directory
  const byDir: Record<string, number> = {};
  for (const file of Object.keys(summary)) {
    const dir = path.dirname(file).split(path.sep)[0] || file;
    byDir[dir] = (byDir[dir] || 0) + summary[file];
  }

  console.log('\nBy directory:');
  Object.entries(byDir)
    .sort((a, b) => b[1] - a[1])
    .forEach(([dir, count]) => {
      console.log(`  ${count.toString().padStart(4)} - ${dir}/`);
    });

  // Show sample logs that should be replaced
  console.log('\n' + '='.repeat(60));
  console.log('📋 SAMPLE LOGS TO REVIEW');
  console.log('='.repeat(60));
  
  const sampleCategories = [
    { pattern: /\[SYNC\]/i, name: 'SYNC logs' },
    { pattern: /\[AUTH\]/i, name: 'AUTH logs' },
    { pattern: /\[AI\]/i, name: 'AI logs' },
    { pattern: /\[WORKOUT\]/i, name: 'WORKOUT logs' },
    { pattern: /\[NAV\]/i, name: 'NAV logs' },
    { pattern: /\[DEBUG\]/i, name: 'DEBUG logs' },
    { pattern: /error/i, name: 'Error-related logs' },
  ];

  for (const category of sampleCategories) {
    const matching = results.filter(r => category.pattern.test(r.content));
    if (matching.length > 0) {
      console.log(`\n${category.name} (${matching.length}):`);
      matching.slice(0, 3).forEach(r => {
        console.log(`  ${r.file}:${r.line}`);
        console.log(`    ${r.content.slice(0, 80)}...`);
      });
    }
  }

  // Write detailed report
  fs.writeFileSync(
    'console-log-report.json',
    JSON.stringify({ 
      total: results.length,
      byType,
      byDirectory: byDir,
      summary, 
      results 
    }, null, 2)
  );
  console.log('\n✅ Detailed report written to console-log-report.json');
}

findConsoleLogs().catch(console.error);

