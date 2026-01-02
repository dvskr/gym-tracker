#!/usr/bin/env node
/**
 * Scan codebase for irregular/corrupted characters and fix them.
 * Focuses on TypeScript/JavaScript files with corrupted emojis and unicode.
 */

import * as fs from 'fs';
import * as path from 'path';

// Known corrupted patterns and their fixes
// Using hex/unicode escapes to avoid corruption in this file itself
const CORRUPTED_PATTERNS: Array<[RegExp, string]> = [
  // Generic replacement character
  [/�/g, ''],
  
  // Common corrupted emoji patterns
  [/\uFFFD/g, ''],  // Replacement character
  [/ï¿½/g, ''],  // UTF-8 mojibake replacement
  
  // These will be caught by the generic � pattern above
];

// Directories to scan
const SCAN_DIRS = ['app', 'components', 'lib', 'stores', 'hooks'];

// File extensions to check
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Directories to skip
const SKIP_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'scripts'];

interface Fix {
  file: string;
  line: number;
  oldText: string;
  newText: string;
  charFound: string;
}

class CharacterFixer {
  private rootDir: string;
  private fixes: Fix[] = [];
  private filesScanned = 0;
  private filesFixed = 0;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  private shouldSkipDir(dirPath: string): boolean {
    return SKIP_DIRS.some(skip => dirPath.includes(path.sep + skip + path.sep) || dirPath.endsWith(path.sep + skip));
  }

  private hasCorruptedChars(content: string): boolean {
    // Check for replacement character
    return content.includes('\uFFFD') || content.includes('�') || content.includes('ï¿½');
  }

  private fixContent(content: string): {
    fixed: string;
    fixes: Array<{ line: number; oldText: string; newText: string; charFound: string }>;
  } {
    let fixed = content;
    const fixes: Array<{ line: number; oldText: string; newText: string; charFound: string }> = [];

    if (!this.hasCorruptedChars(content)) {
      return { fixed, fixes };
    }

    // Process line by line to track changes
    const lines = content.split('\n');
    const newLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const originalLine = line;
      let changed = false;
      let charFound = '';

      // Check for replacement character or corrupted patterns
      if (line.includes('\uFFFD') || line.includes('�') || line.includes('ï¿½')) {
        // Remove the corrupted character
        const before = line;
        line = line.replace(/\uFFFD/g, '').replace(/�/g, '').replace(/ï¿½/g, '');

        if (line !== before) {
          changed = true;
          charFound = 'Replacement character (�)';
        }
      }

      if (changed) {
        fixes.push({
          line: i + 1,
          oldText: originalLine.trim().substring(0, 60) + (originalLine.length > 60 ? '...' : ''),
          newText: line.trim().substring(0, 60) + (line.length > 60 ? '...' : ''),
          charFound,
        });
      }

      newLines.push(line);
    }

    fixed = newLines.join('\n');
    return { fixed, fixes };
  }

  private scanFile(filePath: string): boolean {
    try {
      // Read file
      const originalContent = fs.readFileSync(filePath, 'utf-8');
      this.filesScanned++;

      // Check if file has corrupted chars
      if (!this.hasCorruptedChars(originalContent)) {
        return false;
      }

      // Fix content
      const { fixed: fixedContent, fixes } = this.fixContent(originalContent);

      // If changes were made, write back
      if (fixedContent !== originalContent) {
        fs.writeFileSync(filePath, fixedContent, 'utf-8');

        // Record fixes
        const relPath = path.relative(this.rootDir, filePath).replace(/\\/g, '/');
        fixes.forEach(fix => {
          this.fixes.push({
            file: relPath,
            line: fix.line,
            oldText: fix.oldText,
            newText: fix.newText,
            charFound: fix.charFound,
          });
        });

        this.filesFixed++;
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
      return false;
    }
  }

  private scanDirectory(dirPath: string): void {
    if (this.shouldSkipDir(dirPath)) {
      return;
    }

    try {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        let stat;

        try {
          stat = fs.statSync(fullPath);
        } catch {
          continue;
        }

        if (stat.isDirectory()) {
          this.scanDirectory(fullPath);
        } else if (stat.isFile()) {
          const ext = path.extname(fullPath);
          if (EXTENSIONS.includes(ext)) {
            this.scanFile(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  public scanAll(): void {
    for (const dirName of SCAN_DIRS) {
      const dirPath = path.join(this.rootDir, dirName);
      if (fs.existsSync(dirPath)) {
        console.log(`Scanning ${dirName}/...`);
        this.scanDirectory(dirPath);
      }
    }
  }

  public generateReport(): string {
    const lines: string[] = [];
    lines.push('='.repeat(80));
    lines.push('IRREGULAR CHARACTER FIX REPORT');
    lines.push('='.repeat(80));
    lines.push('');
    lines.push(`Files scanned: ${this.filesScanned}`);
    lines.push(`Files fixed: ${this.filesFixed}`);
    lines.push(`Total fixes: ${this.fixes.length}`);
    lines.push('');

    if (this.fixes.length > 0) {
      lines.push('FIXES APPLIED:');
      lines.push('-'.repeat(80));

      // Group by file
      const fileGroups: Record<string, Array<{ line: number; oldText: string; newText: string; charFound: string }>> = {};
      this.fixes.forEach(fix => {
        if (!fileGroups[fix.file]) {
          fileGroups[fix.file] = [];
        }
        fileGroups[fix.file].push({
          line: fix.line,
          oldText: fix.oldText,
          newText: fix.newText,
          charFound: fix.charFound,
        });
      });

      // Sort files alphabetically
      const sortedFiles = Object.keys(fileGroups).sort();

      sortedFiles.forEach(file => {
        lines.push('');
        lines.push(`📄 ${file}`);
        // Sort fixes by line number
        fileGroups[file].sort((a, b) => a.line - b.line).forEach(fix => {
          lines.push(`   Line ${fix.line}: ${fix.charFound}`);
          lines.push(`      Before: ${fix.oldText}`);
          lines.push(`      After:  ${fix.newText}`);
        });
      });

      lines.push('');
      lines.push('='.repeat(80));
      lines.push('✅ ALL IRREGULAR CHARACTERS FIXED!');
      lines.push('='.repeat(80));
    } else {
      lines.push('✅ No irregular characters found! Codebase is clean.');
      lines.push('='.repeat(80));
    }

    return lines.join('\n');
  }
}

// Main execution
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 Scanning codebase for irregular characters...');
console.log('');

const fixer = new CharacterFixer(rootDir);
fixer.scanAll();

console.log('');
const report = fixer.generateReport();
console.log(report);

// Write report to file
const reportPath = path.join(rootDir, 'IRREGULAR_CHARACTERS_FIX_REPORT.md');
fs.writeFileSync(reportPath, report, 'utf-8');

console.log(`\n📄 Report saved to: ${reportPath}`);
