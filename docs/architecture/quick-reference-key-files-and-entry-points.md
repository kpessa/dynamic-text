# Quick Reference - Key Files and Entry Points

## Critical Files for Understanding the System

- **Main Entry**: `src/App.svelte`
- **Configuration**: `vite.config.ts`, `svelte.config.js`, `tailwind.config.js`, `tsconfig.json`
- **Core Business Logic**: `src/lib/services/`
- **State Management**: `src/lib/stores/`
- **Secure Code Execution**: `src/lib/services/secureCodeExecution.ts` (and its web worker)
- **Firebase Integration**: `src/lib/firebase.ts`, `src/lib/firebaseDataService.ts`
- **Key UI Components**: `src/lib/components/`, `src/lib/CodeEditor.svelte`
- **Testing**: `e2e/` for end-to-end tests, `src/lib/__tests__/` for unit tests.

## Enhancement Impact Areas (Restoration Epic)

Based on the PRD, the following areas are the primary focus for restoration:

- **Firebase Save/Load**: `src/lib/firebaseDataService.ts`, `src/App.svelte` (save/load functions), `src/lib/stores/` (hydration/serialization logic).
- **Dynamic Text Execution**: `src/lib/services/secureCodeExecution.ts`, `public/workers/codeExecutor.js`, `src/lib/services/codeExecutionService.ts`.
- **Live Preview**: `src/App.svelte` (state propagation), `src/lib/components/Preview.svelte`.
- **Test Case Management**: `src/lib/services/testingService.ts`, `src/lib/components/TestRunner.svelte`, `src/lib/stores/testStore.ts`.
- **Import/Export**: `src/lib/services/exportService.ts`, `src/App.svelte` (import/export handlers).
- **AI Test Generation**: `api/generate-tests.ts`.
