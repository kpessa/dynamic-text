#!/usr/bin/env node

import fs from 'fs';
import { glob } from 'glob';

const patterns = ['src/**/*.ts', 'src/**/*.js', 'src/**/*.svelte'];
const skipPatterns = ['**/node_modules/**', '**/dist/**'];

function fixPartialComments(content) {
  let fixed = content;
  
  // Fix pattern: // word: { at end of line
  fixed = fixed.replace(/\/\/\s*(\w+):\s*{\s*$/gm, '      $1: {');
  
  // Fix pattern: // 'string': value,
  fixed = fixed.replace(/\/\/\s*'([^']+)':\s*([^,]+),?\s*$/gm, "      '$1': $2,");
  
  // Fix pattern where we have // }, or // } by itself
  fixed = fixed.replace(/^\s*\/\/\s*(}\s*[,;]?)$/gm, '      $1');
  
  // Fix orphaned closing brackets after // comments
  fixed = fixed.replace(/\/\/[^\n]*\n(\s*)(},?)\s*$/gm, (match, indent, bracket) => {
    return match.split('\n')[0] + '\n' + indent + bracket;
  });
  
  return fixed;
}

async function main() {
  console.log('Final syntax cleanup...');
  
  let totalFiles = 0;
  let fixedFiles = 0;
  
  for (const pattern of patterns) {
    const files = glob.sync(pattern, { ignore: skipPatterns });
    
    for (const file of files) {
      totalFiles++;
      try {
        const content = fs.readFileSync(file, 'utf8');
        const fixed = fixPartialComments(content);
        
        if (content !== fixed) {
          fs.writeFileSync(file, fixed);
          console.log(`Fixed: ${file}`);
          fixedFiles++;
        }
      } catch (error) {
        console.error(`Error processing ${file}:`, error.message);
      }
    }
  }
  
  console.log(`\nProcessed ${totalFiles} files`);
  console.log(`Fixed ${fixedFiles} files`);
}

main();