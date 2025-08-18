#!/usr/bin/env node

import fs from 'fs';
import { glob } from 'glob';

const patterns = ['src/**/*.ts', 'src/**/*.js'];
const skipPatterns = ['**/node_modules/**', '**/dist/**'];

function fixSyntaxErrors(content) {
  let fixed = content;
  
  // Fix pattern: // property: { on a line by itself - should be property: {
  fixed = fixed.replace(/^\s*\/\/\s*(\w+):\s*{$/gm, '      $1: {');
  
  // Fix pattern: // }, or // } on a line - should be }, or }
  fixed = fixed.replace(/^\s*\/\/\s*(}\s*,?)$/gm, '      $1');
  
  // Fix orphaned object properties after commented lines
  fixed = fixed.replace(/\/\/.*\n(\s+)(\w+:)/gm, (match, indent, prop) => {
    const lines = match.split('\n');
    if (lines[1] && !lines[1].includes('//')) {
      return lines[0] + '\n' + indent + prop;
    }
    return match;
  });
  
  // Fix multiline objects that were partially commented
  // Pattern: look for "// word:" followed by properties
  fixed = fixed.replace(/\/\/\s*(\w+):\s*{\n(\s+\w+:[^}]+)\n\s*}/gm, '$1: {\n$2\n      }');
  
  return fixed;
}

async function main() {
  console.log('Fixing syntax errors from partial comments...');
  
  let totalFiles = 0;
  let fixedFiles = 0;
  
  for (const pattern of patterns) {
    const files = glob.sync(pattern, { ignore: skipPatterns });
    
    for (const file of files) {
      totalFiles++;
      try {
        const content = fs.readFileSync(file, 'utf8');
        const fixed = fixSyntaxErrors(content);
        
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