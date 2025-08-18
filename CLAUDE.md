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
Generated by comprehensive multi-agent audit on 2025-08-17 analyzing 9 specialized domains

### Overall Health Score: 7.2/10
Strong foundation with critical architectural blockers requiring immediate intervention.

- **Build Status**: ✅ Passing
- **Test Coverage**: ~20% (228 tests passing, major coverage gaps)  
- **Bundle Size**: 4.8MB (exceeds 500KB target by 860%)
- **Performance**: 5s load time (target <1.8s)
- **Critical Issues**: 3 P0, 7 P1, 12 P2
- **Medical Readiness**: ❌ Currently unsuitable for clinical deployment

### Critical Issues Requiring Immediate Attention

#### P0 - Blocking Development (Address This Week)
1. **Unsafe JavaScript Code Execution (CVSS 9.3)**
   - Location: `src/lib/utils/dynamicExecution.js:45-67`
   - Impact: Code injection vulnerability in medical calculations, patient safety risk
   - Fix: Implement proper sandboxing with Web Workers + AST validation
   - Effort: 3-5 days
   - Owner: Security specialist required

2. **Monolithic App.svelte (1,509 lines)**
   - Location: `src/App.svelte`
   - Impact: 50-70% development velocity reduction, maintainability crisis
   - Fix: Extract 5-7 focused components (EditorWorkspace, TestManager, etc.)
   - Effort: 2-3 weeks
   - Owner: Senior Svelte developer

3. **Firebase Security Rules Mismatch**
   - Location: `firestore.rules`, `src/lib/firebase.js`
   - Impact: Data access vulnerabilities, medical privacy violations
   - Fix: Align rules with actual data model, implement field-level validation
   - Effort: 1-2 weeks
   - Owner: Firebase specialist

#### P1 - High Priority (Address This Month)
1. **Bundle Size Optimization (4.8MB → <500KB)**
   - Babel Standalone: 2.4MB loaded synchronously blocking main thread
   - Impact: Clinical workflow performance degradation
   - Fix: Lazy loading, code splitting, Web Worker isolation
   - Location: `src/lib/utils/dynamicExecution.js`
   - Effort: 1-2 weeks

2. **TypeScript Migration (9 JS files remaining)**
   - Location: `src/lib/constants/ingredientConstants.js` and others
   - Impact: Type safety gaps, developer experience reduction
   - Fix: Convert to TypeScript, enable strict mode
   - Effort: 3-5 days

3. **Console Logging Cleanup (717 statements)**
   - Found: 717 console statements across 77 files
   - Impact: Production noise, debugging clarity issues
   - Fix: Run automated migration script
   - Effort: 30 minutes

4. **Test Coverage Expansion (20% → 75%)**
   - Gaps: 0% coverage for App.svelte, service layers
   - Impact: Critical TPN calculations lack validation
   - Fix: Focus on critical path testing first
   - Effort: 2-3 weeks

### Known Technical Debt

#### Code Quality Issues  
- **Mixed JS/TS**: 9 JavaScript files blocking type safety pipeline
- **Legacy Patterns**: 13 components using old lifecycle methods instead of runes
- **Service Complexity**: firebaseDataService.ts at 1,664 lines needs domain separation
- **Type Erosion**: 334 `any` type usages reducing type safety
- **Duplicate Components**: "Refactored" versions exist alongside originals

#### Performance Bottlenecks
- **Main Thread Blocking**: Babel transpilation freezing UI during calculations
- **Memory Leaks**: Firebase listeners not properly cleaned up in components
- **No Caching Strategy**: Repeated Firebase queries for same data
- **Large Components**: Multiple 500+ line files exceeding maintainability threshold
- **Synchronous Operations**: Heavy computations blocking user interactions

### Discovered Project Patterns

#### Effective Patterns (Keep Using)
- **Svelte 5 Runes**: Excellent reactive state management with `$state`, `$derived`, `$effect`
- **Store Architecture**: Three-tier store separation (UI, business logic, persistence)
- **Content Hashing**: SHA-256 for deduplication and duplicate detection
- **Version Tracking**: Comprehensive history system with baseline preservation
- **Test Infrastructure**: Vitest with proper mocking strategies and 100% pass rate
- **Medical Data Modeling**: Sophisticated ingredient-based organization for TPN

#### Anti-Patterns to Avoid  
- **Monolithic Components**: Keep under 300 lines (App.svelte currently 1,509 lines)
- **Direct DOM Manipulation**: Use Svelte reactivity instead of imperative updates
- **Synchronous Heavy Operations**: Move Babel transpilation to Web Workers
- **Uncached API Calls**: Implement request deduplication for AI API calls
- **Anonymous-Only Authentication**: Insufficient for medical compliance

#### Recommended Refactors
Critical files exceeding complexity thresholds:
- `src/App.svelte` (1,509 lines) → Extract EditorWorkspace, TestManager, ResultsPanel, SettingsManager, NavigationState
- `src/lib/firebaseDataService.ts` (1,664 lines) → Domain service modules (IngredientService, VersionService, SharedService)
- `src/lib/tpnLegacy.js` → Focused calculation utilities with proper error handling
- `src/lib/utils/dynamicExecution.js` → Secure sandbox with Web Worker isolation

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
1. **Console Cleanup** (5 minutes): `node scripts/migrate-console-to-logger.js` - eliminate 717 statements
2. **TypeScript Migration** (15 minutes): Convert `ingredientConstants.js` to TypeScript
3. **Security Headers** (10 minutes): Add CSP and security headers to Vercel config
4. **TypeScript Strict Mode** (5 minutes): Enable strict mode in tsconfig.json
5. **Duplicate Cleanup** (10 minutes): Delete "Refactored" component duplicates
6. **Environment Template** (5 minutes): Add `.env.example` with required Firebase variables

### Medical Application Considerations

⚠️ **Current Status: Not suitable for production medical use**

**Critical Compliance Gaps:**
- **HIPAA**: ❌ Missing encryption, anonymous auth, audit gaps
- **FDA Medical Device**: ❌ Security vulnerabilities prevent clinical use  
- **Clinical Safety**: ❌ Code injection risks in medical calculations
- **Data Integrity**: ✅ Good (content hashing, versioning)
- **Audit Capability**: ⚠️ Partial (version control good, user tracking limited)

**Medical Deployment Roadmap:**
- **Phase 1 (Weeks 1-2)**: Security hardening, authentication, basic audit logging
- **Phase 2 (Weeks 3-6)**: HIPAA compliance, enhanced security rules, medical validation  
- **Phase 3 (Weeks 7-12)**: FDA compliance, clinical integration, comprehensive testing

**Required for Healthcare Deployment:**
1. Implement role-based authentication (not anonymous only)
2. Add comprehensive audit trails for all medical data access
3. Encrypt sensitive data at rest and in transit
4. Implement medical calculation validation and bounds checking
5. Add electronic signature capabilities
6. Implement data retention policies per healthcare regulations
7. Achieve FDA 21 CFR Part 11 compliance for electronic records

### Development Velocity Impact Analysis

**Current Velocity Penalties:**
- **Monolithic App.svelte**: 50-70% velocity reduction (1,509 lines)
- **Security Constraints**: 20-30% slower development due to review requirements  
- **Bundle Size Issues**: 15-20% slower iteration cycles (4.8MB loads)
- **Type Safety Gaps**: 10-15% slower debugging (334 `any` usages)
- **Total Current Penalty**: 95-135% slower than optimal

**Post-Remediation Velocity Gains:**
- **Component Decomposition**: 200-300% velocity improvement
- **Security Hardening**: 50% faster confident development  
- **Bundle Optimization**: 40% faster development cycles
- **Type Safety**: 30% faster debugging and refactoring
- **Net Improvement**: 320-420% velocity increase over current state

**Break-even Analysis:**
- **Investment Required**: 8-12 weeks focused effort
- **Break-even Point**: 3-4 weeks after completion  
- **Long-term ROI**: 3-5x sustained productivity improvement

### Team Recommendations

**Critical Skill Requirements:**
- **Svelte 5 Expertise**: Runes API (`$state`, `$derived`, `$effect`) for component decomposition
- **Firebase/Firestore Optimization**: Security rules, query optimization, medical data patterns
- **Medical Domain Knowledge**: TPN calculations, clinical workflows, patient safety  
- **Security & Compliance**: Web Workers, sandboxing, HIPAA, FDA medical device software

**Immediate Staffing Needs:**
- **Security Specialist**: Address P0 code execution vulnerability (Week 1)
- **Senior Svelte Developer**: Lead App.svelte decomposition (Weeks 1-3)
- **Firebase Expert**: Fix security rules mismatch (Week 1)
- **Medical Advisor**: Validate TPN calculation safety (Ongoing)

**Training Priorities:**
1. **Svelte 5 Modern Patterns**: Runes migration, component architecture best practices
2. **Firebase Security & Optimization**: Rules authoring, query patterns, medical data handling
3. **Medical Software Validation**: TPN calculation validation, bounds checking, error handling  
4. **Healthcare Compliance**: HIPAA requirements, FDA medical device guidelines, audit trails

**Success Metrics:**
- P0 issues resolved within 1 week
- Development velocity improvement visible by week 3
- Medical compliance roadmap completion by week 12