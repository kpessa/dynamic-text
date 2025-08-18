#!/bin/bash

# Fix all @/lib/logger imports to use $lib/logger
find /home/pessk/code/dynamic-text/src -type f \( -name "*.ts" -o -name "*.js" -o -name "*.svelte" \) -exec sed -i 's|@/lib/logger|$lib/logger|g' {} \;

echo "Fixed all logger import paths from @/lib/logger to \$lib/logger"