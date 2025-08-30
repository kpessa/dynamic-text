# Unified Project Structure

```plaintext
tpn-dynamic-text-editor/
├── .github/                    # CI/CD workflows
│   └── workflows/
│       ├── ci.yaml            # Test and lint on PR
│       └── deploy.yaml        # Deploy to Vercel on merge
├── src/                       # Frontend application
│   ├── lib/
│   │   ├── components/        # UI components
│   │   │   ├── layout/       # Layout components
│   │   │   ├── editor/       # Editor components
│   │   │   ├── preview/      # Preview components
│   │   │   └── testing/      # Test runner components
│   │   ├── services/         # Business logic services
│   │   │   ├── base/         # Core services
│   │   │   ├── secureCodeExecution.ts
│   │   │   ├── firebaseDataService.ts
│   │   │   ├── exportService.ts
│   │   │   └── testingService.ts
│   │   ├── stores/           # Svelte stores
│   │   │   ├── sectionStore.svelte.ts
│   │   │   ├── testStore.svelte.ts
│   │   │   └── workspaceStore.svelte.ts
│   │   ├── utils/            # Utility functions
│   │   │   ├── lazyBabel.ts
│   │   │   └── helpers.ts
│   │   ├── types.ts          # TypeScript definitions
│   │   └── firebase.ts       # Firebase configuration
│   ├── routes/               # SvelteKit routes (if migrating)
│   ├── app.html             # HTML template
│   ├── app.css              # Global styles
│   └── App.svelte           # Main component
├── api/                      # Serverless functions
│   ├── generate-tests.ts    # AI test generation
│   ├── health.ts            # Health check
│   └── _lib/                # Shared API utilities
│       ├── auth.ts
│       ├── gemini.ts
│       └── errors.ts
├── public/                   # Static assets
│   ├── workers/
│   │   └── codeExecutor.js  # Web Worker for sandboxing
│   └── favicon.ico
├── e2e/                      # Playwright E2E tests
│   ├── fixtures/
│   ├── specs/
│   └── playwright.config.ts
├── tests/                    # Unit tests
│   ├── components/
│   ├── services/
│   └── setup.ts
├── scripts/                  # Build/deploy scripts
│   ├── pre-commit.sh
│   └── deploy.sh
├── docs/                     # Documentation
│   ├── prd.md
│   ├── brownfield-architecture.md
│   └── fullstack-architecture.md
├── .env.example             # Environment template
├── package.json             # Dependencies
├── pnpm-lock.yaml          # Lock file
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Vite configuration
├── tailwind.config.js      # Tailwind configuration
├── svelte.config.js        # Svelte configuration
├── vercel.json             # Vercel deployment config
├── firebase.json           # Firebase configuration
├── firestore.rules         # Security rules
├── firestore.indexes.json  # Database indexes
└── README.md               # Project documentation
```
