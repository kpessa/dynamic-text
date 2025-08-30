# TPN Dynamic Text Editor Brownfield Architecture Document

## Introduction

This document captures the CURRENT STATE of the TPN Dynamic Text Editor codebase, including technical debt, workarounds, and real-world patterns. It serves as a reference for AI agents working on enhancements.

### Document Scope

Focused on areas relevant to: **Functionality Restoration & Stabilization** as defined in the [PRD](./prd.md).

### Change Log

| Date   | Version | Description                 | Author    |
| ------ | ------- | --------------------------- | --------- |
| 2025-08-29 | 1.1     | Updated for restoration epic | Winston, Architect |
| 2025-08-29 | 1.0     | Initial brownfield analysis | John, PM |

## Quick Reference - Key Files and Entry Points

### Critical Files for Understanding the System

- **Main Entry**: `src/App.svelte`
- **Configuration**: `vite.config.ts`, `svelte.config.js`, `tailwind.config.js`, `tsconfig.json`
- **Core Business Logic**: `src/lib/services/`
- **State Management**: `src/lib/stores/`
- **Secure Code Execution**: `src/lib/services/secureCodeExecution.ts` (and its web worker)
- **Firebase Integration**: `src/lib/firebase.ts`, `src/lib/firebaseDataService.ts`
- **Key UI Components**: `src/lib/components/`, `src/lib/CodeEditor.svelte`
- **Testing**: `e2e/` for end-to-end tests, `src/lib/__tests__/` for unit tests.

### Enhancement Impact Areas (Restoration Epic)

Based on the PRD, the following areas are the primary focus for restoration:

- **Firebase Save/Load**: `src/lib/firebaseDataService.ts`, `src/App.svelte` (save/load functions), `src/lib/stores/` (hydration/serialization logic).
- **Dynamic Text Execution**: `src/lib/services/secureCodeExecution.ts`, `public/workers/codeExecutor.js`, `src/lib/services/codeExecutionService.ts`.
- **Live Preview**: `src/App.svelte` (state propagation), `src/lib/components/Preview.svelte`.
- **Test Case Management**: `src/lib/services/testingService.ts`, `src/lib/components/TestRunner.svelte`, `src/lib/stores/testStore.ts`.
- **Import/Export**: `src/lib/services/exportService.ts`, `src/App.svelte` (import/export handlers).
- **AI Test Generation**: `api/generate-tests.ts`.

## High Level Architecture

### Technical Summary

The project is a modern, single-page web application designed to manage and test dynamic medical reference texts. It provides a dual-mode editor (HTML/JavaScript) with a live preview for creating content used in Total Parenteral Nutrition (TPN) calculations. The system is built on Svelte 5, leveraging its reactive capabilities for a fluid user experience. It uses Firebase for real-time data persistence and optional user authentication. A key architectural feature is the use of a Web Worker to execute user-provided JavaScript in a secure sandbox, preventing it from impacting the main application thread. The application is designed to be component-based, with a clear separation of concerns between UI components, services, and state management (stores).

### Actual Tech Stack (from package.json)

| Category | Technology | Version | Notes |
| --- | --- | --- | --- |
| Runtime | Node.js | (Not specified, typical for Vite) | Development environment |
| Framework | Svelte | ^5.35.5 | Core UI framework, using Runes API |
| Bundler | Vite | ^7.0.4 | Build tool and dev server |
| Styling | Tailwind CSS | ^4.1.12 | Utility-first CSS framework |
| UI Components | Skeleton | ^3.1.8 | Svelte component library |
| Code Editor | CodeMirror 6 | ^6.0.2 | For syntax highlighting and editing |
| Testing (E2E) | Playwright | ^1.50.1 | For end-to-end testing |
| Testing (Unit) | Vitest | ^2.1.8 | For unit and component testing |
| Database | Firebase Firestore | ^12.0.0 | Real-time NoSQL database |
| Authentication | Firebase Auth | ^12.0.0 | For user authentication |
| JS Transpiler | Babel (Standalone) | ^7.28.2 | Loaded from CDN for in-browser transpilation |
| HTML Sanitizer | DOMPurify | ^3.2.6 | For sanitizing HTML content |
| Language | TypeScript | ^5.9.2 | For static typing |

### Repository Structure Reality Check

- **Type**: Monorepo (single package)
- **Package Manager**: pnpm
- **Notable**:
    - Extensive use of Playwright for E2E testing, with a large number of spec files in `e2e/`.
    - A `.bmad-core` directory is present, indicating the use of the BMad agent-based development method.
    - A significant number of screenshots and UI mockups are stored in `.playwright-mcp/` and `screenshots/`, suggesting a strong focus on UI testing and development.

## Source Tree and Module Organization

### Project Structure (Actual)

```text
project-root/
├── src/
│   ├── lib/
│   │   ├── components/      # Reusable UI components (some legacy, some Skeleton-based)
│   │   ├── services/        # Core business logic (code execution, export, testing)
│   │   ├── stores/          # Svelte stores for reactive state management
│   │   ├── utils/           # Utility functions (lazy loading, helpers)
│   │   ├── __tests__/       # Unit tests for library code
│   │   └── App.svelte       # Main application component / entry point
│   └── api/                 # Serverless functions (e.g., for AI test generation)
├── e2e/                   # Playwright end-to-end tests
├── public/                # Static assets, including web worker scripts
├── docs/                  # Project documentation
├── tests/                 # Vitest unit and component tests
└── scripts/               # Helper scripts for development and CI
```

### Key Modules and Their Purpose

- **`src/App.svelte`**: The main application component. It orchestrates all other components and services, manages high-level state, and defines the overall layout.
- **`src/lib/services/codeExecutionService.ts`**: Contains functions for transpiling (Babel), sanitizing (DOMPurify), and evaluating user-provided code.
- **`src/lib/services/secureCodeExecution.ts`**: Implements the Web Worker logic to run JavaScript securely in a sandboxed environment.
- **`src/lib/services/testingService.ts`**: Handles the creation, validation, and execution of test cases for dynamic content.
- **`src/lib/services/exportService.ts`**: Manages the conversion of the application's internal section-based format to the required JSON output format.
- **`src/lib/firebase.ts` & `firebaseDataService.ts`**: Encapsulates all interaction with Firebase for authentication and Firestore database operations (saving/loading configurations).
- **`src/lib/stores/`**: Contains Svelte stores (`sectionStore`, `testStore`, `workspaceStore`) that manage the application's reactive state in a centralized way.
- **`e2e/`**: Contains a comprehensive suite of Playwright tests covering main workflows, UI interactions, and edge cases.

## Data Models and APIs

### Data Models

The core data model is managed within the application's state and is not formally defined by a schema like in a traditional backend. The main data structures are:

- **Section**: An object representing a piece of content, either `static` (HTML) or `dynamic` (JavaScript). It includes an `id`, `type`, `name`, and `content`. Dynamic sections also contain an array of `testCases`.
- **TestCase**: An object associated with a dynamic section, containing `name`, `variables` (input for the JS code), and `expectedOutput`/`expectedStyles` for validation.
- **Reference**: The top-level object stored in Firebase, representing a full configuration for an ingredient. It contains an array of `sections`, population type, health system, and other metadata.

These models are implicitly defined and managed in `src/lib/stores/sectionStore.svelte.ts` and `src/lib/services/sectionService.ts`.

### API Specifications

- **External APIs**: The application integrates with the Firebase Firestore API for all database operations.
- **Internal APIs**: A serverless function exists at `api/generate-tests.ts`, which likely integrates with an AI service (e.g., Google Gemini, as indicated by `@google/generative-ai` in `package.json`) to generate test cases.

## Technical Debt and Known Issues

- **Component Inconsistency**: The codebase contains a mix of older, custom-built Svelte components and newer components based on the Skeleton UI library. `App.svelte` has feature flags (`USE_SKELETON_UI`) and conditional rendering to manage this, indicating an ongoing migration. This is a likely source of the issues targeted by the restoration epic.
- **Legacy Functions**: `App.svelte` contains several functions marked as "OLD - Remove duplicate function" (e.g., `transpileCodeOld`, `sectionsToJSONOld`). This suggests that refactoring has occurred, but cleanup is incomplete and is a key part of the restoration effort.
- **Testing Gaps**: While E2E test coverage appears extensive, unit test coverage is less clear. The `document-project` task template notes "Unit Tests: 60% coverage (Jest)" as an example, but the actual coverage needs to be determined by running `vitest --coverage`. Restoring functionality will require adding targeted unit and integration tests for the affected features.
- **State Management**: While Svelte 5 runes and dedicated stores are used, there is still a significant amount of local UI state managed directly in `App.svelte`. Some of this could likely be moved to more focused stores or child components as part of the stabilization.

### Workarounds and Gotchas

- **Babel via CDN**: Babel is loaded from a CDN at runtime (`lazyBabel.ts`). This is a performance optimization but creates a dependency on the CDN being available.
- **Firebase Configuration**: Firebase credentials must be provided via environment variables (`.env` file) for the integration to work.
- **Manual Test Population**: The `$effect` hook in `App.svelte` that auto-populates test cases with ingredients is complex and could be a source of bugs.

## Integration Points and External Dependencies

- **Firebase**: The most critical external dependency. Used for data persistence, authentication, and real-time synchronization. All interactions are managed through the `firebaseDataService.ts`.
- **Google Generative AI**: Used by the `api/generate-tests.ts` endpoint for AI-powered test case generation. Requires a `GEMINI_API_KEY`.
- **Babel CDN**: Used for transpiling user-provided JavaScript in the browser.

## Development and Deployment

### Local Development Setup

1.  Run `pnpm install` to install dependencies.
2.  Create a `.env` file with Firebase and Gemini API keys.
3.  Run `pnpm dev` to start the Vite development server.

### Build and Deployment Process

- **Build Command**: `pnpm build` (uses Vite).
- **Deployment**: The presence of `vercel.json` and the `vercel` dependency suggests the project is deployed on the Vercel platform. Deployment is likely handled automatically via Vercel's Git integration.

## Testing Reality

- **E2E Tests**: Very strong. The `e2e/` directory is well-populated with specs for all major workflows.
- **Unit Tests**: Present but coverage is likely incomplete. Located in `tests/` and `src/lib/__tests__/`.
- **Running Tests**:
    ```bash
    pnpm test:e2e # Runs Playwright E2E tests
    pnpm test:unit # Runs Vitest unit tests
    ```

## Enhancement Impact Analysis (Restoration Epic)

### Files That Will Need Modification

Based on the restoration requirements in the PRD, these files will be the primary focus:

- **`src/App.svelte`**: This component is central to the issues. It contains legacy functions, manages a large amount of state, and handles the orchestration that is currently broken. Much of the work will involve refactoring and fixing logic here.
- **`src/lib/firebaseDataService.ts`**: To ensure save/load functionality is robust and handles the full application state correctly.
- **`src/lib/services/secureCodeExecution.ts`**: To verify that the `me` context is correctly passed to the web worker and that errors are handled gracefully.
- **`src/lib/services/testingService.ts`**: To restore the full functionality of creating, editing, and running test cases.
- **`src/lib/services/exportService.ts`**: To fix any issues with the JSON export format, especially the dynamic text delimiters.
- **`api/generate-tests.ts`**: To re-enable and verify the AI test generation feature.

### New Files/Modules Needed

It is unlikely that new files will be needed. The focus is on restoring and refactoring existing functionality. However, new unit/integration tests should be created in the `tests/` and `src/lib/__tests__/` directories to cover the restored features.

### Integration Considerations

- **Component Reconciliation**: The primary challenge will be reconciling the behavior of legacy components and new Skeleton-based components. The `USE_SKELETON_UI` flag will be critical in managing this.
- **State Hydration**: When loading data from Firebase, ensuring the Svelte stores are correctly and reactively updated is critical. This is a key integration point between `firebaseDataService.ts` and the stores in `src/lib/stores/`.
- **Legacy Logic**: Care must be taken when removing or refactoring functions marked as "OLD" in `App.svelte` to ensure no critical logic is lost. The git history will be an important reference.
