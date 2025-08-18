#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const patterns = ['src/**/*.ts', 'src/**/*.js', 'src/**/*.svelte'];
const skipPatterns = [
  '**/node_modules/**',
  '**/dist/**',
  '**/coverage/**',
  '**/logger.ts'
];

function fixMultilineConsoleComments(content) {
  // Pattern to match multi-line console statements that start with // console.
  // These are console statements that were partially commented out
  const multilinePattern = /\/\/ console\.(log|error|warn|info|debug)\([^)]*\n([^;])+;/gm;
  
  // Replace multi-line console statements with properly commented versions
  let fixed = content;
  
  // Fix specific patterns we've seen
  // Pattern 1: console.log with object on multiple lines
  fixed = fixed.replace(
    /\/\/ console\.(log|error|warn|info|debug)\(([^,]+),\s*{\n([^}]+)}\);/gm,
    (match) => {
      const lines = match.split('\n');
      return lines.map(line => {
        // If line doesn't start with //, add it
        if (!line.trim().startsWith('//')) {
          return '      // ' + line.trim();
        }
        return line;
      }).join('\n');
    }
  );
  
  // Pattern 2: console.log split across lines with trailing content
  fixed = fixed.replace(
    /\/\/ console\.(log|error|warn|info|debug)\(([^)]+)\n\s+([^)]+)\);/gm,
    (match) => {
      return '// ' + match.replace(/\n\s+/g, ' ').replace('// //', '//');
    }
  );
  
  // Pattern 3: Fix orphaned object properties and closing brackets
  fixed = fixed.replace(
    /^(\s+)([a-zA-Z]+:\s*{[^}]*}[,]?)$/gm,
    (match, indent, content) => {
      if (!content.trim().startsWith('//')) {
        return indent + '// ' + content;
      }
      return match;
    }
  );
  
  // Pattern 4: Fix orphaned closing brackets and parentheses after console statements
  fixed = fixed.replace(
    /\/\/ console\.[^;]+\n(\s+[}\)]+;)/gm,
    (match, closing) => {
      return match.replace(closing, '      // ' + closing.trim());
    }
  );
  
  return fixed;
}

async function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fixed = fixMultilineConsoleComments(content);
    
    if (content !== fixed) {
      fs.writeFileSync(filePath, fixed);
      console.log(`Fixed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('Fixing multi-line console comments...');
  
  let totalFiles = 0;
  let fixedFiles = 0;
  
  for (const pattern of patterns) {
    const files = glob.sync(pattern, { ignore: skipPatterns });
    
    for (const file of files) {
      totalFiles++;
      if (await processFile(file)) {
        fixedFiles++;
      }
    }
  }
  
  console.log(`\nProcessed ${totalFiles} files`);
  console.log(`Fixed ${fixedFiles} files`);
}

main();