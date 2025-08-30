# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TPN Dynamic Text Editor - A specialized web application for creating and testing dynamic medical text content with Total Parenteral Nutrition (TPN) advisor functions. The app supports dual-mode editing (static HTML and dynamic JavaScript), real-time preview, and AI-powered test generation.

## Design 
- Keep components to 300-500 lines of code.  If they become more, look to refactor.

## Key Commands

### Development
```bash
pnpm dev              # Start dev server (default port 5173, may use 5174 if occupied)
pnpm dev:api          # Start API server for AI features
pnpm dev:monitor      # Monitor development with health checks
```

### Testing & Quality
```bash
pnpm test:unit        # Run unit tests
pnpm test:e2e         # Run Playwright E2E tests
pnpm typecheck        # TypeScript type checking
pnpm check            # Svelte component checking
pnpm pre-commit       # Run all pre-commit checks (required before commits)
```

### Building & Deployment
```bash
pnpm build            # Production build
pnpm preview          # Preview production build
pnpm build:analyze    # Build with bundle analysis
```

## Architecture Overview

### Technology Stack
- **Framework**: Svelte 5 with runes (`$state`, `$derived`, `$effect`)
- **Build Tool**: Vite 7
- **UI Framework**: Skeleton UI v3 (CSS-only, no JS components)
- **Styling**: Tailwind CSS v4 + SCSS modules
- **State Management**: Svelte 5 runes-based stores
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Backend**: Firebase (optional) + Vercel Functions (AI)

### Core Architecture Patterns

#### 1. Store Pattern (Svelte 5 Runes)
All stores use Svelte 5's new runes system:
```typescript
// Pattern: src/stores/*.svelte.ts
class Store {
  private _state = $state<T>(initialValue);
  get state() { return this._state; }
  derived = $derived(computation);
}
```
Key stores:
- `sectionStore.svelte.ts` - Document sections management
- `workspaceStore.svelte.ts` - Workspace state and persistence
- `tpnStore.svelte.ts` - TPN calculations and medical data
- `uiStore.svelte.ts` - UI state and preferences

#### 2. Service Layer Architecture
Services are organized in a hierarchical structure:
```
src/lib/services/
├── base/           # Core infrastructure services
│   ├── CacheService.ts
│   ├── ErrorService.ts
│   └── SyncService.ts
├── domain/         # Business logic services
│   ├── IngredientService.ts
│   ├── ReferenceService.ts
│   └── ConfigService.ts
└── FirebaseService.ts  # Main orchestrator
```

#### 3. Secure Code Execution
Dynamic JavaScript sections are executed in a sandboxed environment:
- Located in `src/lib/services/secureCodeExecution.ts`
- Uses Babel for transpilation (loaded from CDN)
- Provides controlled access to TPN functions via `me` object
- Implements timeout and error boundaries

#### 4. Component Organization
Components follow a modular structure:
- Main components in `src/lib/` (e.g., `Sidebar.svelte`, `CodeEditor.svelte`)
- Skeleton UI variants in `src/lib/*Skeleton.svelte`
- Shared utilities in `src/lib/utils/`
- Test files colocated in `__tests__/` directories

### Critical Implementation Notes

#### Skeleton UI v3 Migration
**Important**: Skeleton v3 provides CSS classes only, not Svelte components. Do not import components like `Modal`, `Toast`, `RadioGroup` from `@skeletonlabs/skeleton`. Instead:
- Use native HTML elements with Skeleton CSS classes
- Implement modal/toast functionality with custom Svelte components
- Replace component imports with event-driven patterns

#### Firebase Integration
Firebase is optional and controlled by environment variables:
```bash
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```
Services automatically handle offline mode when Firebase is unavailable.

#### Performance Optimizations
- Code splitting via Vite's `manualChunks` configuration
- Babel loaded from CDN, not bundled
- Lazy loading for heavy components (CodeMirror, Firebase)
- Service Worker for offline support and caching
- Bundle size monitoring with warnings at 500KB

#### TPN Mode
When enabled, provides access to medical calculation functions:
- `me.getValue(key)` - Access TPN values
- `me.ingredients` - Ingredient data
- `me.populationType` - Current population type
The TPN context is injected during secure code execution.

### Testing Strategy
- Unit tests with Vitest for services and utilities
- Component tests with Testing Library
- E2E tests with Playwright for critical user flows
- Pre-commit checks ensure all tests pass

### Error Handling
- Centralized error service (`ErrorService.ts`)
- Health monitoring system (`healthMonitor.ts`)
- Structured logging with levels (error, warn, info, debug)
- Performance monitoring for critical operations

### Development Workflow
1. Run `pnpm dev` to start development server
2. Make changes with hot module replacement
3. Run `pnpm pre-commit` before committing
4. Tests must pass and TypeScript must compile without errors

### Key File Paths
- Entry point: `src/main.ts`
- Main app: `src/App.svelte`
- Store definitions: `src/stores/*.svelte.ts`
- Services: `src/lib/services/`
- Components: `src/lib/`
- Types: `src/types/` and `src/lib/types.ts`
- Configuration: `vite.config.ts`, `tailwind.config.js`

### Known Issues & Workarounds
- Port 5173 may be in use; dev server will use 5174 as fallback
- Skeleton UI component imports will fail; use CSS classes only
- Firebase may be rate-limited in development; use offline mode
- Bundle size warnings are expected for CodeMirror chunks

## Archon Integration (When Available)

This project supports Archon MCP server for task management. When Archon is available, use it as the primary task tracking system before TodoWrite. See Archon workflow section above for detailed instructions.

---

## Project Health Status
*Last updated: 2025-01-25 10:45*

### Critical Metrics
| Metric | Current Status | Target | Health |
|--------|----------------|--------|---------|
| **Test Coverage** | 3.3% | >80% | 🔴 Critical |
| **Bundle Size** | ~1.5MB | <500KB | 🔴 Critical |
| **Build Status** | Passing | Passing | 🟢 Healthy |
| **PWA Readiness** | 75/100 | >90 | 🟡 Warning |
| **Mobile Performance** | 65/100 | >80 | 🟡 Warning |
| **iOS Safari Compatibility** | Good with issues | Good | 🟡 Warning |

### Component Health
| Component | Lines | Status | Action Required |
|-----------|-------|--------|-----------------|
| `App.svelte` | 2,477 | 🔴 Violation | Refactor (target: <500) |
| `Sidebar.svelte` | 4,247 | 🔴 Critical | Immediate refactor needed |
| Most others | <500 | 🟢 Compliant | Monitor |

### Security Status
- **Firebase Rules**: ⚠️ Mismatch with data structure
- **Dependencies**: Current (no critical vulnerabilities)
- **Code Execution**: Sandboxed (secure)

## Known Issues & Technical Debt

### P0 - Critical Issues (Must Fix)
1. **Test Coverage Crisis** (3.3%)
   - **Impact**: No safety net for refactoring
   - **Action**: Add unit tests for core services
   - **Timeline**: Immediate

2. **Bundle Size Bloat** (1.5MB vs 500KB target)
   - **Impact**: Poor mobile performance
   - **Action**: Implement code splitting, lazy loading
   - **Timeline**: Next sprint

3. **Component Size Violations**
   - `Sidebar.svelte`: 4,247 lines (847% over limit)
   - `App.svelte`: 2,477 lines (495% over limit)
   - **Action**: Break into smaller components
   - **Timeline**: Immediate

4. **Firebase Rules Mismatch**
   - **Impact**: Potential security vulnerability
   - **Action**: Align rules with actual data structure
   - **Timeline**: This week

### P1 - High Priority Issues
1. **PWA Readiness** (75/100)
   - Missing service worker optimizations
   - Incomplete offline functionality

2. **Mobile Performance** (65/100)
   - Large JavaScript bundles on mobile
   - Unoptimized images and assets

3. **iOS Safari Issues**
   - Touch gesture handling problems
   - Some layout inconsistencies

4. **Test Infrastructure**
   - E2E tests incomplete
   - No performance regression tests

5. **Error Handling**
   - Inconsistent error boundaries
   - Limited error recovery mechanisms

6. **Documentation Gaps**
   - Missing API documentation
   - Incomplete setup instructions

7. **TypeScript Coverage**
   - Some files still using `any` types
   - Missing type definitions

## Discovered Project Patterns

### Effective Patterns ✅
1. **Service Layer Architecture**
   - Clean separation of concerns
   - Hierarchical organization (base/domain)
   - Dependency injection ready

2. **Svelte 5 Runes Usage**
   - Consistent `$state`, `$derived`, `$effect` usage
   - Reactive store patterns
   - Modern state management

3. **Security-First Code Execution**
   - Sandboxed JavaScript execution
   - Babel transpilation from CDN
   - Controlled API access via `me` object

4. **Progressive Enhancement**
   - Firebase optional with offline fallbacks
   - Graceful degradation patterns
   - Environment-aware configurations

### Anti-Patterns ⚠️
1. **Monolithic Components**
   - Sidebar.svelte: 4,247 lines
   - App.svelte: 2,477 lines
   - Violates single responsibility principle

2. **Insufficient Testing**
   - 3.3% coverage leaves code vulnerable
   - Missing integration tests
   - No performance regression tests

3. **Bundle Optimization Neglect**
   - 300% over size target
   - Missing code splitting opportunities
   - Unoptimized asset loading

4. **Inconsistent Error Handling**
   - Some components lack error boundaries
   - Mixed error handling approaches
   - Limited recovery mechanisms

## Project-Specific Commands

### Extended Development Commands
```bash
# Performance & Monitoring
pnpm dev:performance     # Start dev server with performance monitoring
pnpm dev:test           # Start with health check monitoring
pnpm dev:verify         # Quick health verification
pnpm health:check       # Quick project health assessment
pnpm performance:audit  # Lighthouse audit
pnpm performance:measure # Custom performance measurements

# Advanced Testing
pnpm test:coverage      # Run tests with coverage report
pnpm test:e2e:ui        # Run E2E tests with UI
pnpm test:e2e:debug     # Debug E2E tests
pnpm test:all           # Run both unit and E2E tests
pnpm test:browser       # Run tests in headed browser
pnpm test:interactive   # Run specific interactive tests

# Build Analysis
pnpm build:production   # Production build with optimizations
pnpm preview:analyze    # Preview with bundle analysis
pnpm bundle:stats       # Generate bundle statistics
pnpm size-limit         # Check bundle size limits

# Pre-commit & Quality
pnpm pre-commit:full    # Full pre-commit check with tests

# Playwright MCP Integration
pnpm playwright:mcp     # Start Playwright MCP server

# Development Tools
pnpm storybook          # Start Storybook development
pnpm build-storybook    # Build Storybook
```

### Health Check Commands
```bash
# Quick health assessment
pnpm health:check

# Development monitoring
pnpm dev:monitor

# Performance measurement
pnpm performance:measure

# Bundle analysis
pnpm build:analyze && pnpm bundle:stats
```

## Tech Stack Updates

### Current Versions (Audit Findings)
| Technology | Version | Status | Notes |
|------------|---------|--------|-------|
| **Svelte** | 5.35.5 | ✅ Latest | Using runes system |
| **Vite** | 7.0.4 | ✅ Latest | Latest major version |
| **Tailwind CSS** | 4.1.12 | ✅ Latest | v4 with improved performance |
| **Skeleton UI** | 3.1.8 | ✅ Current | CSS-only (no JS components) |
| **TypeScript** | 5.9.2 | ✅ Current | Full type coverage needed |
| **Vitest** | 2.1.8 | ✅ Latest | Coverage reporting available |
| **Playwright** | 1.50.1 | ✅ Latest | MCP integration added |

### Dependencies Status
- **Firebase**: 12.0.0 (latest, optional integration)
- **CodeMirror**: 6.x (latest, lazy-loaded)
- **Babel Standalone**: 7.28.2 (CDN-loaded for security)
- **Vercel Functions**: 5.3.11 (AI integration)

### Recommended Updates
1. **Testing Libraries**: All current
2. **Build Tools**: Consider Vite plugins for bundle optimization
3. **Performance**: Add `@vercel/speed-insights` for monitoring
4. **PWA**: Update service worker implementation

### Breaking Changes to Monitor
- **Svelte 5**: Runes are stable, but watch for store patterns
- **Tailwind v4**: Some utility classes may change
- **Skeleton UI v3**: Component-less architecture requires custom implementations

---
*Health status and audit findings last updated: 2025-01-25 10:45*
*Backup created: `_knowledge/07-Backups/CLAUDE.MD-2025-01-25-10-45.md`*