# TPN Dynamic Text Editor - Technical Architecture

**Version:** 1.0  
**Date:** 2025-01-30  
**Status:** CURRENT  
**Type:** Brownfield Enhancement Architecture  

## 1. Introduction

This document outlines the technical architecture for the TPN Dynamic Text Editor, a specialized web application for creating and testing dynamic text content with Total Parenteral Nutrition (TPN) advisor functions. It serves as the guiding blueprint for the component refactoring initiative and future development.

### Document Purpose
- Define the current architecture and technical stack
- Document component structure and data flow
- Establish patterns for the refactoring initiative
- Guide AI-driven development with clear technical constraints
- Maintain consistency during the optimization phase

## 2. System Overview

### Project Classification
- **Type:** Single Page Application (SPA)
- **Architecture Style:** Component-based with Service Layer
- **Deployment:** Static hosting with serverless functions
- **State Management:** Svelte 5 runes-based reactive state
- **Data Persistence:** Firebase Firestore

### Core Capabilities
- Dual-mode content editing (HTML/JavaScript)
- Real-time preview with sandboxed execution
- TPN calculations and medical value access
- Firebase-based collaboration
- AI-powered test generation
- Version control and diff viewing
- PWA with offline support

## 3. Technology Stack

### Frontend Core
```yaml
Framework: Svelte 5.35+
  - Runes API: $state, $derived, $effect
  - Component-based architecture
  - Reactive state management
  
Build Tool: Vite 7.0.4
  - HMR support
  - Module bundling
  - Asset optimization
  
Language: TypeScript 5.9.2
  - Type safety
  - Interface definitions
  - Strict mode enabled
```

### UI/Styling
```yaml
CSS Framework: Tailwind CSS 4.1.12
  - Utility-first approach
  - Custom design tokens
  - Responsive utilities
  
Component Library: Skeleton UI 3.1.8
  - CSS-only components
  - No JavaScript dependencies
  - Theme customization
  
Preprocessor: SCSS
  - Module support
  - Variable management
  - Mixins and functions
```

### Backend Services
```yaml
Database: Firebase Firestore 12.0.0
  - Real-time sync
  - Offline persistence
  - User authentication
  
Serverless: Vercel Functions
  - AI test generation endpoint
  - API routes
  - Edge runtime support
  
Authentication: Firebase Auth
  - Anonymous sign-in
  - User management
  - Session persistence
```

### Development Tools
```yaml
Testing:
  - Vitest 2.1.8 (unit tests)
  - Playwright 1.50.1 (E2E tests)
  - Coverage reporting
  
Code Quality:
  - ESLint
  - Prettier
  - TypeScript strict mode
  
Package Manager: pnpm 10.11.0
  - Workspace support
  - Efficient dependency management
```

## 4. Architecture Patterns

### Component Architecture
```
src/
├── App.svelte                 # Main orchestrator (needs refactoring)
├── lib/
│   ├── components/            # UI components
│   │   ├── SectionManager.svelte (planned)
│   │   ├── PreviewEngine.svelte (planned)
│   │   └── TestRunner.svelte
│   ├── services/              # Business logic
│   │   ├── firebaseService.ts
│   │   ├── exportService.ts
│   │   └── aiTestService.ts
│   ├── stores/                # State management
│   │   ├── sectionStore.svelte.ts
│   │   └── workspaceStore.svelte.ts
│   └── utils/                 # Utilities
│       ├── contentHashing.js
│       └── secureCodeExecution.ts
```

### Service Layer Pattern
```typescript
// Service Interface Pattern
export interface ServiceInterface {
  // Async operations return Promises
  async operation(): Promise<Result>
  
  // State exposed via getters
  get state(): StateType
  
  // Events via callbacks
  onStateChange(callback: (state) => void): void
}

// Example: FirebaseService
class FirebaseService implements DataService {
  private db: Firestore
  
  async save(data: Document): Promise<void> {
    // Implementation
  }
  
  async load(id: string): Promise<Document> {
    // Implementation
  }
}
```

### State Management (Svelte 5 Runes)
```typescript
// Store Pattern with Runes
class SectionStore {
  // Private state with $state rune
  private _sections = $state<Section[]>([])
  
  // Public getter for reactive access
  get sections() { 
    return this._sections 
  }
  
  // Derived values with $derived
  sectionCount = $derived(() => this._sections.length)
  
  // Methods for state mutation
  addSection(section: Section) {
    this._sections = [...this._sections, section]
  }
}
```

## 5. Data Models

### Core Data Structures

#### Section Model
```typescript
interface Section {
  id: string                    // Unique identifier
  type: 'static' | 'dynamic'    // Content type
  name: string                  // User-friendly name
  content: string              // HTML or JavaScript code
  order: number                // Display order
  testCases?: TestCase[]       // Associated tests
  metadata?: {
    created: Date
    modified: Date
    author?: string
  }
}
```

#### Test Case Model
```typescript
interface TestCase {
  id: string
  name: string
  variables: Record<string, any>  // Input values
  expected: string                 // Expected output
  matchType: 'exact' | 'contains' | 'regex'
  result?: {
    status: 'pass' | 'fail' | 'error'
    actual?: string
    error?: string
  }
}
```

#### TPN Context Model
```typescript
interface TPNContext {
  values: Record<string, number>     // TPN values
  ingredients: Ingredient[]          // Available ingredients
  populationType: PopulationType     // Current population
  
  // Methods available in sandbox
  getValue(key: string): number
  getObject(key: string): any
  hasValue(key: string): boolean
}
```

### Firebase Schema
```yaml
Collections:
  users/
    {userId}/
      references/
        {referenceId}/
          - name: string
          - sections: Section[]
          - version: number
          - lastModified: timestamp
          
  ingredients/
    {ingredientId}/
      - name: string
      - category: string
      - NOTE: { TEXT: string }[]
      - versions/
        {versionId}/
          - snapshot: Ingredient
          - timestamp: timestamp
          
  baselineConfigs/
    {configId}/
      - original: TPNConfig
      - imported: timestamp
      - immutable: true
```

## 6. Component Specifications

### Current Component Inventory

#### Oversized Components (Need Refactoring)
| Component | Lines | Responsibility | Target |
|-----------|-------|---------------|---------|
| App.svelte | 3,556 | Orchestration, state, UI | <500 |
| Sidebar.svelte | 4,165 | Navigation, references, search | <500 |
| IngredientManager.svelte | 2,354 | CRUD, versioning, UI | <500 |
| IngredientDiffViewer.svelte | 2,285 | Diff logic, display | <500 |

#### Well-Sized Components
- CodeEditor.svelte - CodeMirror wrapper
- TPNTestPanel.svelte - TPN value inputs
- TestGeneratorModal.svelte - AI test UI
- ExportModal.svelte - Export functionality
- ValidationStatus.svelte - Validation display

### Component Communication Pattern
```javascript
// Parent-Child via Props
<ChildComponent 
  data={parentData}
  on:event={handleChildEvent}
/>

// Store-based Communication
import { sectionStore } from '$stores/sectionStore.svelte.ts'

// Event Dispatching
const dispatch = createEventDispatcher()
dispatch('save', { data })

// Service Integration
import { firebaseService } from '$lib/services/firebaseService'
await firebaseService.save(data)
```

## 7. API Specifications

### REST API Endpoints

#### AI Test Generation
```http
POST /api/generate-tests
Content-Type: application/json
Authorization: Bearer {firebase-token}

{
  "code": "string",
  "sectionName": "string",
  "context": {
    "tpnValues": {},
    "populationType": "string"
  }
}

Response: 200 OK
{
  "tests": [
    {
      "name": "string",
      "variables": {},
      "expected": "string"
    }
  ]
}
```

### Firebase Operations
```typescript
// Save Reference
async function saveReference(userId: string, reference: Reference) {
  const docRef = doc(db, 'users', userId, 'references', reference.id)
  await setDoc(docRef, {
    ...reference,
    lastModified: serverTimestamp()
  })
}

// Load References
async function loadReferences(userId: string): Promise<Reference[]> {
  const q = query(
    collection(db, 'users', userId, 'references'),
    orderBy('lastModified', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => doc.data())
}
```

## 8. Security Architecture

### Code Execution Sandbox
```javascript
// Secure execution in Web Worker
class SecureExecutor {
  private worker: Worker
  
  async execute(code: string, context: any): Promise<Result> {
    // Transpile with Babel
    const transpiled = Babel.transform(code, {
      presets: ['env']
    })
    
    // Execute in worker with timeout
    return this.worker.postMessage({
      code: transpiled,
      context: sanitizeContext(context),
      timeout: 5000
    })
  }
}
```

### Input Sanitization
```javascript
// HTML Sanitization
import DOMPurify from 'dompurify'

function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'div', 'span', 'h1', 'h2', 'h3', 'b', 'i', 'u'],
    ALLOWED_ATTR: ['class', 'id', 'style']
  })
}
```

### Authentication Flow
```javascript
// Firebase Auth Integration
async function initAuth() {
  onAuthStateChange((user) => {
    if (!user) {
      // Anonymous sign-in for new users
      await signInAnonymously()
    }
    // Store user context
    userStore.setUser(user)
  })
}
```

## 9. Performance Considerations

### Bundle Optimization
```javascript
// Vite Configuration
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['svelte', 'firebase'],
          'editor': ['@codemirror/core'],
          'babel': ['@babel/standalone']
        }
      }
    }
  }
}
```

### Lazy Loading
```javascript
// Dynamic imports for heavy components
const CodeEditor = lazy(() => import('./lib/CodeEditor.svelte'))
const DiffViewer = lazy(() => import('./lib/IngredientDiffViewer.svelte'))
```

### Performance Targets
- Initial Load: <3s on 3G
- Time to Interactive: <5s
- Bundle Size: <1MB (currently 1.5MB)
- Lighthouse Score: >80

## 10. Testing Strategy

### Test Pyramid
```
         /\
        /E2E\       20% - Critical paths
       /------\
      /Integr.\     20% - Component integration
     /----------\
    /   Unit     \  60% - Business logic
   /--------------\
```

### Testing Patterns
```typescript
// Unit Test Pattern
describe('SectionManager', () => {
  it('should add section', () => {
    const manager = new SectionManager()
    manager.addSection({ type: 'static' })
    expect(manager.sections).toHaveLength(1)
  })
})

// Integration Test Pattern
describe('Firebase Sync', () => {
  it('should save and retrieve', async () => {
    await firebaseService.save(data)
    const loaded = await firebaseService.load(id)
    expect(loaded).toEqual(data)
  })
})

// E2E Test Pattern
test('create document flow', async ({ page }) => {
  await page.goto('/')
  await page.click('button:has-text("Add Section")')
  await expect(page.locator('.section')).toBeVisible()
})
```

## 11. Deployment Architecture

### Infrastructure
```yaml
Hosting: Vercel
  - Static site hosting
  - Edge functions
  - Preview deployments
  
Database: Firebase
  - Firestore database
  - Authentication service
  - Cloud Storage (future)
  
CDN: Vercel Edge Network
  - Global distribution
  - Asset caching
  - Edge middleware
```

### CI/CD Pipeline
```yaml
# GitHub Actions Workflow
on: [push, pull_request]
jobs:
  test:
    - pnpm install
    - pnpm test:unit
    - pnpm test:e2e
  
  build:
    - pnpm build
    - Check bundle size
    
  deploy:
    - Vercel deployment
    - Run smoke tests
```

## 12. Future Considerations

### Planned Enhancements
- Real-time collaboration (WebRTC/WebSockets)
- Advanced diff algorithms
- Template library system
- Export to Word/PDF
- Mobile native apps

### Technical Debt
- Component size reduction (current focus)
- Test coverage improvement (3% → 80%)
- Bundle size optimization
- Performance monitoring
- Error tracking system

### Scalability Plans
- Microservices for heavy operations
- Redis caching layer
- Database sharding
- CDN optimization
- Load balancing

## Appendices

### A. File Structure
```
dynamic-text/
├── src/
│   ├── App.svelte
│   ├── main.ts
│   ├── app.css
│   └── lib/
│       ├── components/
│       ├── services/
│       ├── stores/
│       └── utils/
├── api/
│   └── generate-tests.ts
├── docs/
│   ├── architecture.md
│   ├── prd.md
│   └── stories/
├── tests/
│   ├── unit/
│   └── e2e/
└── public/
    └── assets/
```

### B. Configuration Files
- `vite.config.ts` - Build configuration
- `tailwind.config.js` - Styling configuration
- `tsconfig.json` - TypeScript configuration
- `playwright.config.ts` - E2E test configuration
- `.env` - Environment variables

### C. Development Commands
```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm test:unit    # Run unit tests
pnpm test:e2e     # Run E2E tests
pnpm preview      # Preview build
```

---

**Document Status:** COMPLETE  
**Next Review:** After refactoring completion  
**Maintained By:** Architecture Team