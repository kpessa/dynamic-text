#!/bin/bash

# Pre-commit verification script
# Run this before committing to ensure code quality

echo "🔍 Running pre-commit checks..."
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if any check fails
FAILED=0

# Run TypeScript type checking
echo "📘 Checking TypeScript..."
pnpm run typecheck > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ TypeScript check failed${NC}"
  echo "   Run 'pnpm run typecheck' to see errors"
  FAILED=1
else
  echo -e "${GREEN}✓ TypeScript check passed${NC}"
fi
echo ""

# Run Svelte checking
echo "🎨 Checking Svelte components..."
pnpm run check > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Svelte check failed${NC}"
  echo "   Run 'pnpm run check' to see errors"
  FAILED=1
else
  echo -e "${GREEN}✓ Svelte check passed${NC}"
fi
echo ""

# Check for critical files
echo "📁 Checking critical files..."
CRITICAL_FILES=(
  "src/main.ts"
  "src/App.svelte"
  "src/lib/firebase.ts"
  "src/stores/uiStore.svelte.ts"
)

MISSING_FILES=()
for file in "${CRITICAL_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    MISSING_FILES+=("$file")
  fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
  echo -e "${RED}❌ Missing critical files:${NC}"
  for file in "${MISSING_FILES[@]}"; do
    echo "   - $file"
  done
  FAILED=1
else
  echo -e "${GREEN}✓ All critical files present${NC}"
fi
echo ""

# Check for unresolved imports
echo "🔗 Checking imports..."
IMPORT_ERRORS=$(grep -r "Failed to resolve import" src/ 2>/dev/null | wc -l)
if [ $IMPORT_ERRORS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Found potential import issues${NC}"
  echo "   Check browser console for 'Failed to resolve import' errors"
fi
echo ""

# Optional: Run unit tests (can be slow)
if [ "$1" == "--with-tests" ]; then
  echo "🧪 Running unit tests..."
  pnpm run test:unit > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Unit tests failed${NC}"
    echo "   Run 'pnpm run test:unit' to see failures"
    FAILED=1
  else
    echo -e "${GREEN}✓ Unit tests passed${NC}"
  fi
  echo ""
fi

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All pre-commit checks passed!${NC}"
  echo ""
  echo "Safe to commit your changes."
  exit 0
else
  echo -e "${RED}❌ Pre-commit checks failed!${NC}"
  echo ""
  echo "Please fix the issues above before committing."
  echo "You can bypass these checks with 'git commit --no-verify'"
  echo "(not recommended)"
  exit 1
fi