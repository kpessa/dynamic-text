#!/bin/bash

# Simple script to comment out console statements
# Usage: ./scripts/remove-console.sh

echo "Removing console statements from source files..."

# Count before
BEFORE=$(grep -r "console\." src/ --include="*.ts" --include="*.js" --include="*.svelte" | grep -v "node_modules" | grep -v "/lib/logger" | wc -l)
echo "Found $BEFORE console statements"

# Process all source files
find src -type f \( -name "*.ts" -o -name "*.js" -o -name "*.svelte" \) -not -path "*/node_modules/*" -not -name "logger.ts" | while read file; do
  # Comment out console.log, console.debug, console.info, console.warn, console.error
  sed -i 's/^\([[:space:]]*\)console\.\(log\|debug\|info\|warn\|error\)/\1\/\/ console.\2/g' "$file"
done

# Count after
AFTER=$(grep -r "console\." src/ --include="*.ts" --include="*.js" --include="*.svelte" | grep -v "node_modules" | grep -v "/lib/logger" | grep -v "^[[:space:]]*\/\/" | wc -l)
echo "Removed $(($BEFORE - $AFTER)) console statements"
echo "$AFTER console statements remaining (likely in strings or complex expressions)"