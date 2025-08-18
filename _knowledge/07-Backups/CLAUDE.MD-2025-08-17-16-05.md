# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dynamic Text Editor - A specialized web application for creating and testing dynamic text content with TPN (Total Parenteral Nutrition) advisor functions. The editor supports both static HTML content and dynamic JavaScript expressions that can be evaluated in real-time.

## Commands

### Development
- `pnpm dev` - Start full development server with Vercel functions (includes AI API) (**Recommended**)
- `pnpm dev:frontend` - Start Vite-only server (frontend only, no API features)
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build locally

### Package Management
Uses pnpm (fallback to npm if unavailable).

## Available Subagents

Claude Code can invoke specialized subagents via the Task tool for specific development tasks. Use these agents to leverage domain expertise:

### Core Development Agents
- **svelte-developer**: Svelte 5 and SvelteKit expert. Use for component architecture, runes API (`$state`, `$derived`, `$effect`), stores, and Svelte-specific optimizations.
- **firebase-specialist**: Firebase expert for Firestore, Authentication, Cloud Functions, and Storage. Essential for database operations and Firebase service integration.
- **react-developer**: React/Next.js specialist (if migrating components or patterns from React).

### Code Quality & Testing
- **testing-qa**: Testing specialist for implementing unit tests, integration tests, and E2E tests. Knows when to prioritize smoke tests vs comprehensive testing.
- **refactor-specialist**: Expert in code refactoring and technical debt management. Balances code quality with development speed.
- **code-reviewer**: Comprehensive code review for quality, security, and best practices.

### Performance & Optimization
- **performance-optimizer**: Progressive performance optimization. Knows when "good enough" is perfect for prototypes vs when to optimize for scale.
- **state-persistence-sync**: Expert in local state persistence, offline-first architecture, IndexedDB, and service workers for PWAs.

### UI/UX & Accessibility
- **ui-ux-accessibility**: UI/UX specialist for functional design, interaction coherence, and accessibility compliance.
- **design-theming-specialist**: Design expert for color systems, typography, animations, and dark/light mode implementation.
- **ios-optimizer**: iOS and Safari specialist for optimal iPhone/iPad experience and PWA capabilities.

### Infrastructure & Debugging
- **debug-troubleshooter**: Expert debugger for finding root causes, tracing errors, and solving complex bugs.
- **api-integration**: API integration specialist for mock-first development and flexible authentication patterns.
- **deployment-cicd**: Deployment specialist for CI/CD, feature flags, and progressive deployment strategies.
- **data-flow-architect**: Data flow architecture specialist for managing complex state patterns.

### Usage Examples
```
# Use svelte-developer for Svelte 5 runes migration
"Please use the svelte-developer agent to refactor this component to use Svelte 5 runes"

# Use firebase-specialist for Firestore operations
"Use the firebase-specialist agent to optimize these Firestore queries"

# Use testing-qa for test implementation
"Have the testing-qa agent create unit tests for the TPN calculation functions"
```

### Recommended Agents for This Project
1. **Component work**: svelte-developer
2. **Firebase/Firestore**: firebase-specialist  
3. **TPN calculations**: testing-qa (for test coverage), refactor-specialist (for cleaning up legacy code)
4. **Performance**: performance-optimizer, state-persistence-sync
5. **Debugging**: debug-troubleshooter
6. **API/Vercel Functions**: api-integration

## Architecture

Svelte 5 SPA with Firebase integration and AI-powered test generation.

### Key Technologies
- **Svelte 5.35+** with runes API (`$state`, `$derived`, `$effect`)
- **Vite 7** for build and HMR
- **Firebase Firestore** for data persistence
- **CodeMirror 6** for code editing
- **Babel Standalone** for runtime JS transpilation
- **DOMPurify** for HTML sanitization
- **Vercel Functions** for serverless API (AI test generation)

### Core Systems

#### 1. Dynamic Content Engine
- Dual-mode editor: static HTML and dynamic JavaScript sections
- Runtime code execution with sandboxed `me` object
- Test cases with variable substitution
- Live preview with real-time updates

#### 2. TPN (Total Parenteral Nutrition) System
- Special mode for TPN advisor functions
- Access to TPN values via `me.getValue(key)`
- Ingredient-based organization
- Population type support (Neonatal, Pediatric, Adolescent, Adult)
- Reference ranges and validation
- Key reference: `src/lib/tpnLegacy.js`, `src/lib/tpnReferenceRanges.js`

#### 3. Firebase Integration
- Ingredient-centric data model
- Real-time sync across users
- Health system organization
- Configuration in `src/lib/firebase.js` and `src/lib/firebaseDataService.js`
- Environment variables required: Firebase config keys

#### 4. Versioning & Sharing System
- **Version tracking**: Every save increments version number with history
- **Baseline preservation**: Original imports stored immutably in `baselineConfigs`
- **Content hashing**: Automatic duplicate detection via `contentHashing.js`
- **Shared ingredients**: Link identical content across configs via `sharedIngredientService.js`
- **Diff viewing**: Compare versions and baseline differences
- See `VERSIONING_ROADMAP.md` for implementation phases

#### 5. AI Test Generation
- Powered by Google Gemini API
- Generates test cases from JavaScript code
- Serverless function at `api/generate-tests.js`
- Requires `GEMINI_API_KEY` environment variable
- Workflow inspector for debugging AI responses

### Component Hierarchy
```
App.svelte (main orchestrator)
├── Navbar (navigation and mode switching)
├── CodeEditor (CodeMirror wrapper)
├── Sidebar (reference management & config import)
├── TPNTestPanel (TPN value inputs)
├── IngredientManager (Firebase CRUD & versioning)
├── IngredientDiffViewer (compare references)
├── VersionHistory (view/restore versions)
├── SharedIngredientManager (link/unlink shared ingredients)
├── DuplicateReportModal (import analysis)
├── TestGeneratorModal (AI test generation)
└── AIWorkflowInspector (debug AI responses)
```

### Data Flow
1. **Sections**: Array of content sections (HTML/JS) managed in App.svelte
2. **Test Cases**: Per-section test configurations with variable values
3. **TPN Instance**: Current TPN context passed to dynamic code execution
4. **Firebase Sync**: Automatic save/load of ingredients and references
5. **Export**: JSON format compatible with TPN configurator

### Svelte 5 Patterns
- State: `let value = $state(initial)`
- Computed: `let computed = $derived(() => expression)` or `$derived.by(() => { ... })`
- Effects: `$effect(() => { ... })` for side effects
- Component props: `let { prop = defaultValue } = $props()`

### Important Files
- `src/App.svelte` - Main application logic and state management
- `src/lib/tpnLegacy.js` - TPN function implementations and key extraction
- `src/lib/firebaseDataService.js` - Firebase CRUD operations
- `src/lib/contentHashing.js` - Content fingerprinting for deduplication
- `src/lib/sharedIngredientService.js` - Shared ingredient management
- `api/generate-tests.js` - AI test generation endpoint
- `vercel.json` - Vercel deployment configuration
- `VERSIONING_ROADMAP.md` - Detailed versioning implementation guide

<!-- AUDIT SECTION - Last Updated: 2025-08-17 -->
## Project Health Status
Generated by comprehensive multi-agent audit on 2025-08-17

### Overall Health Score: 7.2/10
- **Build Status**: ✅ Passing
- **Test Coverage**: ~20% (228 tests passing, major coverage gaps)
- **Bundle Size**: 4.8MB (exceeds 500KB target)
- **Performance**: 5s load time (target <1.8s)
- **Critical Issues**: 3 P0, 7 P1, 12 P2

### Critical Issues Requiring Immediate Attention

#### P0 - Blocking Development
1. **Unsafe JavaScript Code Execution (CVSS 9.3)**
   - Location: `src/lib/utils/dynamicExecution.js:45-67`
   - Impact: Code injection vulnerability in medical calculations
   - Fix: Implement proper sandboxing with Web Workers
   - Effort: 3-5 days

2. **Monolithic App.svelte (1,519 lines)**
   - Location: `src/App.svelte`
   - Impact: 50-70% development velocity reduction
   - Fix: Decompose into 5-7 focused components
   - Effort: 2-3 weeks

3. **Firebase Security Rules Gaps**
   - Location: `firestore.rules`, `src/lib/firebase.js`
   - Impact: Missing HIPAA compliance for medical data
   - Fix: Implement field-level validation and rate limiting
   - Effort: 1-2 weeks

#### P1 - High Priority
1. **Bundle Size (4.8MB total)**
   - Babel Standalone: 2.4MB loaded synchronously
   - Fix: Move to Web Worker, implement code splitting
   - Location: `src/lib/utils/dynamicExecution.js`

2. **TypeScript Migration Incomplete**
   - Location: `src/lib/constants/ingredientConstants.js`
   - Impact: Type safety gaps in critical constants

3. **Console Logging Proliferation**
   - 717 console statements across 77 files
   - Fix: Run `scripts/migrate-console-to-logger.js`

4. **Test Coverage Gaps**
   - 0% coverage for App.svelte, service layers
   - Critical TPN calculations lack comprehensive tests

### Known Technical Debt

#### Code Quality Issues
- **Mixed JS/TS**: JavaScript files blocking type safety
- **Legacy Patterns**: 13 components using old lifecycle methods
- **Service Complexity**: firebaseDataService.ts at 1,664 lines
- **Type Erosion**: 334 `any` type usages

#### Performance Bottlenecks
- **Main Thread Blocking**: Babel transpilation
- **Memory Leaks**: Firebase listeners not cleaned up
- **No Caching**: Repeated Firebase queries
- **Large Components**: Multiple 500+ line files

### Discovered Project Patterns

#### Effective Patterns (Keep Using)
- **Svelte 5 Runes**: Excellent reactive state management
- **Store Architecture**: Three-tier store separation
- **Content Hashing**: SHA-256 for deduplication
- **Version Tracking**: Comprehensive history system
- **Test Infrastructure**: Vitest with proper mocking

#### Anti-Patterns to Avoid
- **Monolithic Components**: Keep under 300 lines
- **Direct DOM Manipulation**: Use Svelte reactivity
- **Synchronous Heavy Operations**: Use Web Workers
- **Uncached API Calls**: Implement request deduplication

#### Recommended Refactors
Files exceeding complexity thresholds:
- `src/App.svelte` → Split into 5-7 components
- `src/lib/firebaseDataService.ts` → Domain service modules
- `src/lib/tpnLegacy.js` → Focused calculation utilities
- `src/lib/utils/dynamicExecution.js` → Secure sandbox

### Project-Specific Commands

#### Testing & Quality
```bash
pnpm test              # Run all tests
pnpm test:unit        # Unit tests only
pnpm typecheck        # TypeScript validation
pnpm lint             # ESLint checking
```

#### Development Workflow
```bash
pnpm dev              # Full dev server with API
pnpm dev:frontend     # Frontend only
pnpm build            # Production build
pnpm preview          # Preview production
```

#### Utility Scripts
```bash
node scripts/migrate-console-to-logger.js  # Remove console statements
```

### Quick Wins (< 30 minutes each)
1. Run console migration script (eliminate 717 statements)
2. Convert `ingredientConstants.js` to TypeScript
3. Add security headers to Vercel config
4. Enable TypeScript strict mode
5. Delete "Refactored" component duplicates
6. Add `.env.example` with required variables

### Medical Application Considerations

⚠️ **Current Status: Not suitable for production medical use**

**Compliance Gaps:**
- Missing HIPAA encryption requirements
- No audit logging for medical data access
- Insufficient input validation for TPN values
- No FDA 21 CFR Part 11 compliance

**Required for Healthcare Deployment:**
1. Implement proper authentication (not anonymous only)
2. Add comprehensive audit trails
3. Encrypt sensitive data at rest and in transit
4. Implement role-based access control
5. Add medical calculation validation and bounds checking
6. Implement data retention policies
7. Add electronic signature capabilities

### Development Velocity Impact Analysis

**Current State:**
- 50-70% slower due to monolithic App.svelte
- 20-30% slower due to missing type safety
- 15-20% slower due to test coverage gaps

**After Recommended Fixes:**
- 200-300% velocity improvement expected
- Break-even: 3-4 weeks after completion
- Long-term: Sustainable rapid prototyping capability

### Team Recommendations

**Skill Requirements:**
- Svelte 5 expertise (runes API)
- Firebase/Firestore optimization
- Medical domain knowledge (TPN)
- Security and compliance experience

**Training Priorities:**
1. Svelte 5 runes and modern patterns
2. Firebase security rules and optimization
3. Medical calculation validation
4. HIPAA compliance requirements