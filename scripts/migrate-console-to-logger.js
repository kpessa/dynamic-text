#!/usr/bin/env node

/**
 * Script to migrate console.* statements to the new logger system
 * Usage: node scripts/migrate-console-to-logger.js [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const isDryRun = process.argv.includes('--dry-run');

// Mapping of console methods to logger methods
const consoleToLogger = {
  'console.log': 'logInfo',
  'console.debug': 'logDebug',
  'console.info': 'logInfo',
  'console.warn': 'logWarn',
  'console.error': 'logError'
};

// Files to skip
const skipPatterns = [
  '**/node_modules/**',
  '**/dist/**',
  '**/coverage/**',
  '**/*.test.ts',
  '**/*.test.js',
  '**/*.spec.ts',
  '**/*.spec.js',
  '**/logger.ts',
  '**/scripts/**'
];

// Context detection patterns
const contextPatterns = {
  firebase: /firebase|firestore|auth|collection|document/i,
  tpn: /tpn|ingredient|reference|population|calculation/i,
  ui: /component|render|click|input|form|modal|button/i,
  api: /fetch|api|endpoint|request|response/i,
  validation: /validate|validation|error|invalid/i
};

function detectContext(line, filePath) {
  // Check file path for context
  if (filePath.includes('firebase')) return 'Firebase';
  if (filePath.includes('tpn')) return 'TPN';
  if (filePath.includes('components')) return 'UI';
  
  // Check line content for context
  for (const [context, pattern] of Object.entries(contextPatterns)) {
    if (pattern.test(line)) {
      return context.charAt(0).toUpperCase() + context.slice(1);
    }
  }
  
  return null;
}

function migrateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let modified = false;
  let needsImport = false;
  const importSet = new Set();
  
  const processedLines = lines.map((line, index) => {
    // Skip if already using logger
    if (line.includes('logger.') || line.includes('log')) {
      return line;
    }
    
    // Check for console statements
    for (const [consoleMethod, loggerMethod] of Object.entries(consoleToLogger)) {
      const pattern = new RegExp(`\\b${consoleMethod.replace('.', '\\.')}\\s*\\(`, 'g');
      
      if (pattern.test(line)) {
        modified = true;
        needsImport = true;
        importSet.add(loggerMethod);
        
        // Detect context
        const context = detectContext(line, filePath);
        
        // Replace console with logger
        let newLine = line.replace(pattern, `${loggerMethod}(`);
        
        // Add context if detected and not already present
        if (context && !line.includes('"') && !line.includes("'")) {
          // Simple case: single string argument
          newLine = newLine.replace(
            new RegExp(`${loggerMethod}\\(([^)]+)\\)`),
            `${loggerMethod}($1, '${context}')`
          );
        }
        
        return newLine;
      }
    }
    
    return line;
  });
  
  if (modified) {
    // Add import statement if needed
    if (needsImport) {
      const imports = Array.from(importSet).join(', ');
      const importStatement = `import { ${imports} } from '@/lib/logger';`;
      
      // Find where to insert import
      let insertIndex = 0;
      for (let i = 0; i < processedLines.length; i++) {
        if (processedLines[i].startsWith('import')) {
          insertIndex = i + 1;
        } else if (insertIndex > 0) {
          break;
        }
      }
      
      // Check if import already exists
      const hasLoggerImport = processedLines.some(line => 
        line.includes("from '@/lib/logger'") || 
        line.includes('from "@/lib/logger"') ||
        line.includes("from '../logger'") ||
        line.includes("from './logger'")
      );
      
      if (!hasLoggerImport) {
        processedLines.splice(insertIndex, 0, importStatement);
      }
    }
    
    const newContent = processedLines.join('\n');
    
    if (isDryRun) {
      console.log(`Would modify: ${filePath}`);
      console.log('Changes:');
      // Show diff
      lines.forEach((line, i) => {
        if (line !== processedLines[i]) {
          console.log(`  - ${line}`);
          console.log(`  + ${processedLines[i]}`);
        }
      });
    } else {
      fs.writeFileSync(filePath, newContent);
      console.log(`Modified: ${filePath}`);
    }
    
    return true;
  }
  
  return false;
}

function main() {
  console.log(isDryRun ? 'DRY RUN MODE - No files will be modified' : 'Migrating console statements to logger...');
  
  // Find all TypeScript and JavaScript files
  const patterns = ['src/**/*.ts', 'src/**/*.js', 'src/**/*.svelte'];
  let totalFiles = 0;
  let modifiedFiles = 0;
  
  patterns.forEach(pattern => {
    const files = glob.sync(pattern, { ignore: skipPatterns });
    
    files.forEach(file => {
      totalFiles++;
      if (migrateFile(file)) {
        modifiedFiles++;
      }
    });
  });
  
  console.log(`\nProcessed ${totalFiles} files`);
  console.log(`Modified ${modifiedFiles} files`);
  
  if (!isDryRun && modifiedFiles > 0) {
    console.log('\nDon\'t forget to:');
    console.log('1. Review the changes');
    console.log('2. Run tests to ensure everything works');
    console.log('3. Update any remaining complex console statements manually');
  }
}

main();