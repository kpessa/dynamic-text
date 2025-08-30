# Tech Stack

This is the DEFINITIVE technology selection for the entire project. All development must use these exact versions.

## Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Frontend Language | TypeScript | ^5.9.2 | Type-safe development | Prevents runtime errors, improves IDE support |
| Frontend Framework | Svelte | ^5.35.5 | Reactive UI framework | Modern runes API, excellent performance, small bundle |
| UI Component Library | Skeleton UI | ^3.1.8 | CSS-only components | Provides consistent styling without JS overhead |
| State Management | Svelte Stores + Runes | 5.35.5 | Reactive state | Built-in solution, no external dependencies |
| Backend Language | TypeScript | ^5.9.2 | Serverless functions | Consistency with frontend |
| Backend Framework | Vercel Functions | Latest | API endpoints | Zero-config serverless deployment |
| API Style | REST | N/A | Simple CRUD + AI endpoint | Straightforward for current needs |
| Database | Firebase Firestore | ^12.0.0 | Document storage | Real-time sync, existing integration |
| Cache | Local Storage | Browser API | Offline capability | Simple client-side persistence |
| File Storage | Firestore | ^12.0.0 | JSON document storage | Integrated with database |
| Authentication | Firebase Auth | ^12.0.0 | User management | Integrated with Firestore |
| Frontend Testing | Vitest | ^2.1.8 | Unit/component tests | Fast, Vite-native testing |
| Backend Testing | Vitest | ^2.1.8 | Function testing | Consistency with frontend |
| E2E Testing | Playwright | ^1.50.1 | End-to-end tests | Comprehensive browser testing |
| Build Tool | Vite | ^7.0.4 | Development/bundling | Fast HMR, optimized builds |
| Bundler | Vite/Rollup | ^7.0.4 | Production bundling | Tree-shaking, code splitting |
| IaC Tool | N/A | - | Not implemented | Vercel auto-deploys from Git |
| CI/CD | GitHub Actions | Latest | Automated testing/deploy | Integrated with repository |
| Monitoring | Vercel Analytics | Optional | Performance metrics | Built-in platform monitoring |
| Logging | Console + Vercel | Built-in | Debug/error tracking | Platform-provided logging |
| CSS Framework | Tailwind CSS | ^4.1.12 | Utility-first styling | Rapid development, consistent design |

**Additional Key Technologies:**
- **Code Editor:** CodeMirror 6 (^6.0.2) - Syntax highlighting for code sections
- **JS Transpiler:** Babel Standalone (^7.28.2) - CDN-loaded for browser transpilation
- **HTML Sanitizer:** DOMPurify (^3.2.6) - Security for user-generated HTML
- **AI Service:** Google Gemini API - Test case generation
