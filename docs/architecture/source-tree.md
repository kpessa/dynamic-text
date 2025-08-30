# Source Tree and Module Organization

## Project Structure (Actual)

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

## Key Modules and Their Purpose

- **`src/App.svelte`**: The main application component. It orchestrates all other components and services, manages high-level state, and defines the overall layout.
- **`src/lib/services/codeExecutionService.ts`**: Contains functions for transpiling (Babel), sanitizing (DOMPurify), and evaluating user-provided code.
- **`src/lib/services/secureCodeExecution.ts`**: Implements the Web Worker logic to run JavaScript securely in a sandboxed environment.
- **`src/lib/services/testingService.ts`**: Handles the creation, validation, and execution of test cases for dynamic content.
- **`src/lib/services/exportService.ts`**: Manages the conversion of the application's internal section-based format to the required JSON output format.
- **`src/lib/firebase.ts` & `firebaseDataService.ts`**: Encapsulates all interaction with Firebase for authentication and Firestore database operations (saving/loading configurations).
- **`src/lib/stores/`**: Contains Svelte stores (`sectionStore`, `testStore`, `workspaceStore`) that manage the application's reactive state in a centralized way.
- **`e2e/`**: Contains a comprehensive suite of Playwright tests covering main workflows, UI interactions, and edge cases.
