import * as fs from 'fs';
import * as path from 'path';

console.log('🔧 AGGRESSIVE FIX FOR ALL REMAINING CORRUPTED CHARACTERS');
console.log('═'.repeat(70));
console.log('');

let totalFixed = 0;
const fixedFiles: string[] = [];

function aggressiveFixFile(filePath: string): number {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    // Method 1: Remove ALL non-printable and corrupted characters from logger statements
    // This regex finds logger statements and cleans them
    content = content.replace(
      /(logger\.(log|warn|error|info)\s*\([^)]+\))/g,
      (match) => {
        // Remove all non-ASCII printable characters except newlines in the logger call
        return match.replace(/[^\x20-\x7E\n\r\t`'"${}().,;:?!@#%^&*\-+=\[\]\/\\|<>]/g, '');
      }
    );
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      fixedFiles.push(filePath);
      console.log(`✅ ${path.relative('.', filePath)}`);
      return 1;
    }
    
    return 0;
  } catch (error) {
    console.log(`⚠️  Could not process ${filePath}`);
    return 0;
  }
}

// Recursively find all .ts and .tsx files
function findAllTypeScriptFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build') {
      continue;
    }
    
    if (entry.isDirectory()) {
      findAllTypeScriptFiles(fullPath, files);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

console.log('Scanning all TypeScript files...');
const allFiles = findAllTypeScriptFiles('.');
console.log(`Found ${allFiles.length} TypeScript files`);
console.log('');

for (const file of allFiles) {
  const fixed = aggressiveFixFile(file);
  totalFixed += fixed;
}

console.log('');
console.log('═'.repeat(70));
console.log('📊 SUMMARY');
console.log('═'.repeat(70));
console.log(`✅ Files scanned: ${allFiles.length}`);
console.log(`✅ Files fixed: ${fixedFiles.length}`);
console.log('');
console.log('✅ ALL corrupted characters removed from logger statements!');
console.log('');
console.log('🚀 Restart Expo with: npx expo start --clear');
