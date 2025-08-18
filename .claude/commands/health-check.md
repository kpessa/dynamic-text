---
description: Quick project health check - identifies immediate blockers for rapid prototyping
tools: [Bash, Grep, Read]
---

# Quick Review: Development Velocity Check

Running quick health check to identify immediate blockers...

## Test Status
!npm test 2>&1 | grep -E "(passing|failing|Test Suites)" | head -5

## TypeScript Errors
!npm run typecheck 2>&1 | grep -E "error TS" | wc -l

## Bundle Size
!npm run build 2>&1 | grep -E "dist.*kB" | tail -5

## Duplicate Code Count
!grep -r "OLD - Remove" src --include="*.svelte" --include="*.ts" | wc -l

## Console Noise
!grep -r "console\." src --include="*.ts" --include="*.js" --include="*.svelte" | wc -l

## Component Organization
!echo "Components in src/lib: $(find src/lib -name "*.svelte" | wc -l)"
!echo "Components in src/components: $(find src/components -name "*.svelte" 2>/dev/null | wc -l)"
!echo "Total Svelte files: $(find src -name "*.svelte" | wc -l)"

## Quick Summary

Based on the metrics above, here are the immediate priorities:

1. **If tests failing > 10**: Fix test suite first
2. **If TypeScript errors > 0**: Resolve type issues
3. **If bundle > 3MB**: Implement code splitting
4. **If duplicates > 20**: Clean duplicate code
5. **If console.* > 100**: Add proper logging system

Use `/audit` for comprehensive analysis and detailed recommendations.