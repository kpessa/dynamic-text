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