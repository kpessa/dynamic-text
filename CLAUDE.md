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