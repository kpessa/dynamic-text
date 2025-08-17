---
description: Comprehensive project review for rapid prototyping insights - analyzes codebase, identifies bottlenecks, and updates knowledge base
tools: [Task, Bash, Grep, Read, Write, MultiEdit, Glob, LS]
---

# Project Review: Rapid Prototyping Analysis

Performing comprehensive codebase analysis to identify development velocity blockers and opportunities...

## Phase 1: Test Health Check

!npm test 2>&1 | tail -50

## Phase 2: TypeScript & Build Analysis

!npm run typecheck 2>&1 | tail -30

!npm run build 2>&1 | grep -E "(warning|error|built|size|chunk)" | tail -20

## Phase 3: Code Quality Analysis

### Duplicate Code Detection
!find src -name "*.svelte" -o -name "*.ts" -o -name "*.js" | xargs grep -l "OLD - Remove" | head -10

### Console Noise Analysis
!grep -r "console\." src --include="*.ts" --include="*.js" --include="*.svelte" | wc -l

### Bundle Size Check
!du -sh dist 2>/dev/null || echo "No dist folder yet"

## Phase 4: Architecture Review

### Component Organization
!find src -type f -name "*.svelte" | sed 's|/[^/]*$||' | sort | uniq -c | sort -rn | head -10

### Service Layer Analysis
!find src -type d -name "*service*" -o -name "*Service*" | sort

### Test Coverage
!find src -name "*.test.ts" -o -name "*.test.js" | wc -l

## Phase 5: Generate Comprehensive Review

Use the codebase-analyst agent to perform deep analysis and identify:
1. Critical blockers preventing rapid development
2. Technical debt impacting velocity
3. Performance bottlenecks
4. Missing abstractions and patterns
5. Opportunities for improvement

Then generate a comprehensive review document with prioritized action items.

## Phase 6: Update Knowledge Base

Generate review documentation at:
- `_knowledge/06-Reviews/REVIEW-$(date +%Y-%m-%d).md`
- Update `_knowledge/00-Overview/CURRENT_STATE.md`
- Create `_knowledge/06-Reviews/RAPID_PROTOTYPING_ROADMAP.md`

## Output Format

The review will provide:
1. **Critical Issues** (P0) - Must fix immediately
2. **High Priority** (P1) - Significant velocity impact
3. **Medium Priority** (P2) - Quality of life improvements
4. **Low Priority** (P3) - Nice to have

Each issue includes:
- Problem description
- Impact on development speed
- Estimated fix time
- Specific files/locations
- Recommended solution

## Automation Triggers

This review can help:
- Before major refactoring
- After dependency updates
- Weekly development health checks
- Pre-deployment validation
- Technical debt assessment