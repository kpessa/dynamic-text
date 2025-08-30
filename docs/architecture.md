# TPN Dynamic Text Editor Fullstack Architecture Document

## Introduction

This document outlines the complete fullstack architecture for the **TPN Dynamic Text Editor**, including both frontend implementation and backend services integration. It serves as the single source of truth for AI-driven development, ensuring consistency across your restoration efforts and future enhancements.

This unified approach combines what would traditionally be separate backend and frontend architecture documents, streamlining the development process for your modern fullstack application where these concerns are increasingly intertwined.

### Starter Template or Existing Project

**Status: Existing Project - Post-Refactoring Restoration**

This is an existing brownfield project that underwent a major refactoring from a monolithic structure to a component-based architecture. The current implementation uses:
- No starter template (custom-built from scratch)
- Mixed component patterns (legacy + Skeleton UI v3)
- Established Firebase integration
- Existing test infrastructure with Playwright and Vitest

Key constraints from existing codebase:
- Must maintain backward compatibility with existing Firebase data structures
- Must preserve the JSON export format for compatibility with downstream systems
- Must work within the secure Web Worker execution model already implemented
- Must reconcile dual component systems (legacy vs Skeleton UI)

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-30 | 2.0 | Fullstack architecture for restoration | Winston, Architect |
| 2025-01-29 | 1.1 | Updated for restoration epic | Winston, Architect |
| 2025-01-29 | 1.0 | Initial brownfield analysis | John, PM |

## High Level Architecture

### Technical Summary

The TPN Dynamic Text Editor is a specialized single-page application built with Svelte 5 and deployed as a static site with serverless functions. It uses a component-based frontend architecture with Web Worker sandboxing for secure JavaScript execution. The backend leverages Firebase for real-time data persistence and authentication, with Vercel Functions providing AI-powered test generation. The system achieves PRD goals through real-time reactivity via Svelte stores, secure code execution in isolated workers, and a dual-mode editor supporting both static HTML and dynamic JavaScript content with live preview capabilities.

### Platform and Infrastructure Choice

**Platform:** Vercel + Firebase
**Key Services:** Vercel (hosting, serverless functions), Firebase (Firestore, Auth), CDN (Babel standalone)
**Deployment Host and Regions:** Vercel Edge Network (global), Firebase multi-region (us-central1 primary)

### Repository Structure

**Structure:** Monorepo (single package)
**Monorepo Tool:** pnpm workspaces (native)
**Package Organization:** Single package with modular service/component architecture

### High Level Architecture Diagram

```mermaid
graph TB
    subgraph "Client Browser"
        UI[Svelte 5 SPA]
        WW[Web Worker<br/>JS Sandbox]
        LS[Local Storage]
    end
    
    subgraph "Vercel Edge"
        CF[CDN/Static Assets]
        VF[Serverless Functions<br/>AI Test Gen]
    end
    
    subgraph "Firebase"
        AUTH[Firebase Auth]
        FS[Firestore DB]
        RT[Realtime Sync]
    end
    
    subgraph "External"
        BABEL[Babel CDN]
        AI[Google Gemini API]
    end
    
    UI -->|Secure Execution| WW
    UI -->|Cache| LS
    UI -->|Static Files| CF
    UI -->|API Calls| VF
    UI -->|Auth/Data| AUTH
    UI -->|CRUD| FS
    FS -->|Sync| RT
    VF -->|Generate| AI
    WW -->|Load| BABEL
    
    style UI fill:#e1f5fe
    style WW fill:#fff3e0
    style FS fill:#e8f5e9
```

### Architectural Patterns

- **Component-Based Architecture:** Svelte 5 components with runes for reactivity - _Rationale:_ Enables modular development and easier testing of individual features
- **Web Worker Sandboxing:** Isolated JavaScript execution environment - _Rationale:_ Prevents user code from accessing main application context, ensuring security
- **Store-Based State Management:** Centralized Svelte stores with $state runes - _Rationale:_ Provides predictable state updates and enables reactive UI updates
- **Serverless Functions:** Stateless API endpoints for AI operations - _Rationale:_ Scales automatically and reduces infrastructure overhead
- **Event-Driven Updates:** Reactive effects trigger on state changes - _Rationale:_ Ensures UI stays synchronized with data model
- **Progressive Enhancement:** Core functionality works offline, enhanced features require connection - _Rationale:_ Provides resilient user experience
- **Repository Pattern:** Service layer abstracts data operations - _Rationale:_ Decouples UI from data persistence logic

## Tech Stack

This is the DEFINITIVE technology selection for the entire project. All development must use these exact versions.

### Technology Stack Table

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

## Data Models

### Core Data Models

#### Section Model
**Purpose:** Represents a content block that can be either static HTML or dynamic JavaScript

**Key Attributes:**
- `id`: string - Unique identifier (UUID)
- `type`: 'static' | 'dynamic' - Content type
- `name`: string - Display name for the section
- `content`: string - HTML or JavaScript code
- `order`: number - Position in the document
- `testCases`: TestCase[] - Associated tests (dynamic only)
- `isActive`: boolean - Whether section is enabled

**TypeScript Interface:**
```typescript
interface Section {
  id: string;
  type: 'static' | 'dynamic';
  name: string;
  content: string;
  order: number;
  testCases?: TestCase[];
  isActive: boolean;
}
```

**Relationships:**
- Has many TestCases (1:N)
- Belongs to Reference (N:1)

#### TestCase Model
**Purpose:** Defines test scenarios for dynamic JavaScript sections

**Key Attributes:**
- `id`: string - Unique identifier
- `name`: string - Test case name
- `variables`: Record<string, any> - Input values for test
- `expectedOutput`: string - Expected result
- `expectedStyles`: string - Expected CSS styles
- `result`: 'pass' | 'fail' | 'pending' - Test execution status

**TypeScript Interface:**
```typescript
interface TestCase {
  id: string;
  name: string;
  variables: Record<string, any>;
  expectedOutput: string;
  expectedStyles?: string;
  result?: 'pass' | 'fail' | 'pending';
  actualOutput?: string;
  error?: string;
}
```

**Relationships:**
- Belongs to Section (N:1)

#### Reference Model
**Purpose:** Top-level configuration document for an ingredient

**Key Attributes:**
- `id`: string - Unique identifier
- `name`: string - Configuration name
- `sections`: Section[] - Ordered list of sections
- `populationType`: string - Patient population type
- `healthSystem`: string - Healthcare system identifier
- `metadata`: object - Additional configuration data
- `createdAt`: timestamp - Creation date
- `updatedAt`: timestamp - Last modification date
- `userId`: string - Owner's Firebase UID

**TypeScript Interface:**
```typescript
interface Reference {
  id: string;
  name: string;
  sections: Section[];
  populationType: 'adult' | 'pediatric' | 'neonatal';
  healthSystem: string;
  metadata?: {
    version?: string;
    tags?: string[];
    description?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
}
```

**Relationships:**
- Has many Sections (1:N)
- Belongs to User (N:1)

#### TPNContext Model
**Purpose:** Provides runtime context for dynamic JavaScript execution

**Key Attributes:**
- `values`: Map<string, any> - TPN calculation values
- `ingredients`: Ingredient[] - Available ingredients
- `populationType`: string - Current population context

**TypeScript Interface:**
```typescript
interface TPNContext {
  getValue: (key: string) => any;
  ingredients: Array<{
    name: string;
    concentration: number;
    unit: string;
  }>;
  populationType: 'adult' | 'pediatric' | 'neonatal';
  healthSystem: string;
}
```

**Relationships:**
- Injected into dynamic section execution
- Read-only access from sandboxed code

## API Specification

### REST API Specification

```yaml
openapi: 3.0.0
info:
  title: TPN Dynamic Text Editor API
  version: 1.0.0
  description: REST API for AI test generation and future enhancements
servers:
  - url: https://tpn-editor.vercel.app/api
    description: Production server
  - url: http://localhost:5173/api
    description: Local development

paths:
  /generate-tests:
    post:
      summary: Generate test cases using AI
      description: Analyzes dynamic JavaScript code and generates comprehensive test cases
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - code
                - sectionName
              properties:
                code:
                  type: string
                  description: JavaScript code to analyze
                sectionName:
                  type: string
                  description: Name of the section for context
                context:
                  type: object
                  description: Optional TPN context for test generation
                  properties:
                    populationType:
                      type: string
                      enum: [adult, pediatric, neonatal]
                    availableVariables:
                      type: array
                      items:
                        type: string
            example:
              code: "return me.getValue('weight') * 2;"
              sectionName: "Weight Calculation"
              context:
                populationType: "adult"
                availableVariables: ["weight", "height", "age"]
      responses:
        '200':
          description: Successfully generated test cases
          content:
            application/json:
              schema:
                type: object
                properties:
                  testCases:
                    type: array
                    items:
                      type: object
                      properties:
                        name:
                          type: string
                        variables:
                          type: object
                        expectedOutput:
                          type: string
                        description:
                          type: string
              example:
                testCases:
                  - name: "Standard adult weight"
                    variables:
                      weight: 70
                    expectedOutput: "140"
                    description: "Tests normal adult weight calculation"
                  - name: "Edge case - minimum weight"
                    variables:
                      weight: 1
                    expectedOutput: "2"
                    description: "Tests boundary condition"
        '400':
          description: Invalid request
        '500':
          description: Server error or AI service unavailable

  /health:
    get:
      summary: Health check endpoint
      description: Verifies API availability
      responses:
        '200':
          description: Service is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum: [healthy]
                  timestamp:
                    type: string
                    format: date-time

components:
  securitySchemes:
    firebaseAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: Firebase ID token for authenticated requests

  headers:
    X-Request-ID:
      description: Unique request identifier for tracing
      schema:
        type: string
        format: uuid
```

### Firebase Firestore Operations

While not a traditional REST API, the application uses Firebase SDK for data operations:

**Collections:**
- `references/{referenceId}` - Reference documents
- `users/{userId}/references/{referenceId}` - User-specific references

**Operations:**
- `create()` - Save new reference configuration
- `update()` - Modify existing reference
- `get()` - Retrieve reference by ID
- `list()` - Query user's references
- `delete()` - Remove reference
- `onSnapshot()` - Real-time updates subscription

## Components

### Frontend Components

#### App Component
**Responsibility:** Main application orchestrator and layout manager

**Key Interfaces:**
- Manages global application state
- Coordinates between all major UI components
- Handles Firebase authentication flow
- Manages save/load operations

**Dependencies:** All stores, Firebase services, all major components

**Technology Stack:** Svelte 5 with runes, TypeScript

#### CodeEditor Component
**Responsibility:** Provides syntax-highlighted code editing for HTML and JavaScript

**Key Interfaces:**
- `value: string` - Current code content
- `language: 'html' | 'javascript'` - Syntax mode
- `onChange: (value: string) => void` - Change handler
- `error?: string` - Display syntax errors

**Dependencies:** CodeMirror 6, theme configuration

**Technology Stack:** Svelte 5 wrapper around CodeMirror 6

#### Preview Component
**Responsibility:** Renders live preview of sections with sandboxed JavaScript execution

**Key Interfaces:**
- `sections: Section[]` - Sections to render
- `tpnContext: TPNContext` - Runtime context for dynamic sections
- `onError: (error: Error) => void` - Error handler

**Dependencies:** SecureCodeExecution service, DOMPurify

**Technology Stack:** Svelte 5, Web Worker for sandboxing

#### TestRunner Component
**Responsibility:** Manages and executes test cases for dynamic sections

**Key Interfaces:**
- `section: Section` - Target section with tests
- `onTestComplete: (results: TestResult[]) => void` - Results callback
- `generateTests: () => Promise<TestCase[]>` - AI generation trigger

**Dependencies:** Testing service, Code execution service

**Technology Stack:** Svelte 5, async test execution

#### Sidebar Component
**Responsibility:** Section management and navigation

**Key Interfaces:**
- `sections: Section[]` - List of all sections
- `activeSection: string` - Currently selected section
- `onSectionSelect: (id: string) => void` - Selection handler
- `onSectionCreate/Delete/Reorder` - CRUD operations

**Dependencies:** Section store, drag-and-drop utilities

**Technology Stack:** Svelte 5, Skeleton UI styling

### Backend Services

#### SecureCodeExecution Service
**Responsibility:** Sandboxed JavaScript execution with TPN context injection

**Key Interfaces:**
- `execute(code: string, context: TPNContext): Promise<ExecutionResult>`
- `validate(code: string): ValidationResult`
- `transpile(code: string): string`

**Dependencies:** Web Worker, Babel CDN

**Technology Stack:** TypeScript, Web Worker API, Babel Standalone

#### FirebaseDataService
**Responsibility:** All Firebase operations for authentication and data persistence

**Key Interfaces:**
- `saveReference(ref: Reference): Promise<void>`
- `loadReference(id: string): Promise<Reference>`
- `listReferences(): Promise<Reference[]>`
- `authenticate(): Promise<User>`
- `subscribeToChanges(callback): Unsubscribe`

**Dependencies:** Firebase SDK (Auth, Firestore)

**Technology Stack:** TypeScript, Firebase SDK v12

#### ExportService
**Responsibility:** Convert internal format to required JSON output format

**Key Interfaces:**
- `exportToJSON(sections: Section[]): string`
- `importFromJSON(json: string): Section[]`
- `validateFormat(json: string): boolean`

**Dependencies:** Section model definitions

**Technology Stack:** TypeScript, JSON processing

#### TestingService
**Responsibility:** Test case execution and validation

**Key Interfaces:**
- `runTest(testCase: TestCase, code: string): TestResult`
- `runAllTests(section: Section): TestResult[]`
- `compareOutput(expected: string, actual: string): boolean`

**Dependencies:** SecureCodeExecution service

**Technology Stack:** TypeScript, async execution

#### AITestGenerationService (Serverless)
**Responsibility:** Generate test cases using Google Gemini AI

**Key Interfaces:**
- `POST /api/generate-tests` - HTTP endpoint
- `generateTestCases(code: string, context: any): Promise<TestCase[]>`

**Dependencies:** Google Gemini API

**Technology Stack:** TypeScript, Vercel Functions, Gemini SDK

### Component Interaction Diagram

```mermaid
graph LR
    subgraph "UI Layer"
        APP[App.svelte]
        SB[Sidebar]
        CE[CodeEditor]
        PR[Preview]
        TR[TestRunner]
    end
    
    subgraph "State Layer"
        SS[SectionStore]
        TS[TestStore]
        WS[WorkspaceStore]
    end
    
    subgraph "Service Layer"
        SCE[SecureCodeExecution]
        FDS[FirebaseDataService]
        ES[ExportService]
        TSV[TestingService]
    end
    
    subgraph "External"
        WW[Web Worker]
        FB[Firebase]
        AI[AI Service]
    end
    
    APP --> SS
    APP --> FDS
    SB --> SS
    CE --> SS
    PR --> SCE
    TR --> TSV
    TR --> AI
    
    SCE --> WW
    FDS --> FB
    TSV --> SCE
    
    SS --> WS
    TS --> SS
```

## External APIs

### Google Gemini API
- **Purpose:** Generate intelligent test cases for dynamic JavaScript sections
- **Documentation:** https://ai.google.dev/gemini-api/docs
- **Base URL(s):** https://generativelanguage.googleapis.com/v1beta
- **Authentication:** API Key (GEMINI_API_KEY environment variable)
- **Rate Limits:** 60 requests per minute (free tier)

**Key Endpoints Used:**
- `POST /models/gemini-pro:generateContent` - Generate test cases from code analysis

**Integration Notes:** Called via Vercel serverless function to protect API key. Responses are parsed and formatted into TestCase objects. Fallback to manual test creation if service unavailable.

### Firebase Services API
- **Purpose:** Authentication and real-time data persistence
- **Documentation:** https://firebase.google.com/docs/web
- **Base URL(s):** Project-specific Firebase endpoints
- **Authentication:** Firebase SDK handles auth automatically
- **Rate Limits:** 10K writes/day (free tier), unlimited reads

**Key Endpoints Used:**
- Firestore CRUD operations via SDK
- Auth operations via SDK

**Integration Notes:** SDK-based integration, no direct HTTP calls. Offline persistence enabled for resilience.

### Babel Standalone CDN
- **Purpose:** Transpile modern JavaScript to browser-compatible code
- **Documentation:** https://babeljs.io/docs/babel-standalone
- **Base URL(s):** https://unpkg.com/@babel/standalone@7.28.2/babel.min.js
- **Authentication:** None (public CDN)
- **Rate Limits:** None (CDN cached)

**Key Endpoints Used:**
- Direct script loading from CDN

**Integration Notes:** Lazy-loaded only when user creates dynamic sections. Cached in browser for performance.

## Core Workflows

### User Authentication and Load Workflow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as App.svelte
    participant FDS as FirebaseDataService
    participant FB as Firebase
    
    U->>UI: Open Application
    UI->>FDS: checkAuthState()
    FDS->>FB: onAuthStateChanged()
    
    alt User Authenticated
        FB-->>FDS: User object
        FDS-->>UI: User authenticated
        UI->>FDS: listReferences()
        FDS->>FB: Query user references
        FB-->>FDS: Reference list
        FDS-->>UI: Display references
        U->>UI: Select reference
        UI->>FDS: loadReference(id)
        FDS->>FB: Get document
        FB-->>FDS: Reference data
        FDS-->>UI: Populate editor
    else Not Authenticated
        FB-->>FDS: null
        FDS-->>UI: Anonymous mode
        UI->>UI: Load from localStorage
    end
```

### Dynamic Code Execution Workflow

```mermaid
sequenceDiagram
    participant U as User
    participant CE as CodeEditor
    participant SS as SectionStore
    participant PR as Preview
    participant SCE as SecureCodeExecution
    participant WW as Web Worker
    
    U->>CE: Write JavaScript code
    CE->>SS: Update section content
    SS->>PR: Trigger preview update
    PR->>SCE: execute(code, context)
    SCE->>SCE: Transpile with Babel
    SCE->>WW: postMessage(code, context)
    
    WW->>WW: Create sandbox
    WW->>WW: Inject TPN context
    WW->>WW: Execute code
    
    alt Success
        WW-->>SCE: Result HTML
        SCE-->>PR: Sanitized output
        PR-->>U: Display preview
    else Error
        WW-->>SCE: Error details
        SCE-->>PR: Error message
        PR-->>U: Show error
    end
```

### Test Generation and Execution Workflow

```mermaid
sequenceDiagram
    participant U as User
    participant TR as TestRunner
    participant AI as AI Service
    participant TSV as TestingService
    participant SCE as SecureCodeExecution
    
    U->>TR: Click "Generate Tests"
    TR->>AI: POST /api/generate-tests
    AI->>AI: Analyze code with Gemini
    AI-->>TR: Suggested test cases
    TR-->>U: Display test options
    U->>TR: Select tests to add
    TR->>TR: Save selected tests
    
    U->>TR: Run tests
    loop For each test
        TR->>TSV: runTest(testCase, code)
        TSV->>SCE: execute(code, variables)
        SCE-->>TSV: Execution result
        TSV->>TSV: Compare with expected
        TSV-->>TR: Test result
    end
    TR-->>U: Display results (pass/fail)
```

## Database Schema

### Firestore Document Structure

Since Firestore is a NoSQL document database, we define the schema as document structures:

```javascript
// Collection: references
{
  id: "auto-generated-id",
  name: "Calcium Gluconate Reference",
  userId: "firebase-auth-uid",  // Optional for anonymous
  populationType: "adult",
  healthSystem: "default",
  sections: [
    {
      id: "uuid-v4",
      type: "static",
      name: "Header",
      content: "<h1>Calcium Gluconate</h1>",
      order: 0,
      isActive: true
    },
    {
      id: "uuid-v4",
      type: "dynamic",
      name: "Dosage Calculation",
      content: "const dose = me.getValue('weight') * 2;\nreturn `Dose: ${dose} mg`;",
      order: 1,
      isActive: true,
      testCases: [
        {
          id: "test-uuid",
          name: "Standard Adult",
          variables: { weight: 70 },
          expectedOutput: "Dose: 140 mg",
          expectedStyles: "",
          result: "pass",
          actualOutput: "Dose: 140 mg"
        }
      ]
    }
  ],
  metadata: {
    version: "1.0.0",
    tags: ["calcium", "electrolyte"],
    description: "Reference for calcium gluconate administration"
  },
  createdAt: "2024-01-30T10:00:00Z",  // Firestore Timestamp
  updatedAt: "2024-01-30T14:30:00Z"   // Firestore Timestamp
}

// Collection: users/{userId}/preferences
{
  theme: "light",
  lastOpenedReference: "reference-id",
  defaultPopulationType: "adult",
  editorPreferences: {
    fontSize: 14,
    wordWrap: true,
    showLineNumbers: true
  }
}
```

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public references (read-only for all, write for owner)
    match /references/{referenceId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null 
        && request.auth.uid == resource.data.userId;
    }
    
    // User preferences (private)
    match /users/{userId}/preferences/{document=**} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId;
    }
    
    // User's private references
    match /users/{userId}/references/{referenceId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId;
    }
  }
}
```

### Indexes

```yaml
# firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "references",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "updatedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "references",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "populationType", "order": "ASCENDING" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    }
  ]
}
```

### Local Storage Schema

For offline/anonymous mode:

```typescript
// localStorage keys and structures
{
  "tpn_current_reference": {
    // Same structure as Firestore document
  },
  "tpn_workspace_state": {
    activeSection: "section-id",
    sidebarCollapsed: false,
    previewVisible: true
  },
  "tpn_editor_preferences": {
    theme: "light",
    fontSize: 14,
    // ... other preferences
  }
}
```

## Frontend Architecture

### Component Architecture

#### Component Organization
```text
src/lib/
├── components/
│   ├── layout/
│   │   ├── Sidebar.svelte
│   │   ├── Header.svelte
│   │   └── OutputPanel.svelte
│   ├── editor/
│   │   ├── CodeEditor.svelte
│   │   ├── SectionEditor.svelte
│   │   └── EditorToolbar.svelte
│   ├── preview/
│   │   ├── Preview.svelte
│   │   └── PreviewError.svelte
│   └── testing/
│       ├── TestRunner.svelte
│       ├── TestCase.svelte
│       └── TestResults.svelte
└── App.svelte
```

#### Component Template
```typescript
<!-- Component: src/lib/components/editor/SectionEditor.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Section } from '$lib/types';
  
  let { section = $bindable(), disabled = false }: {
    section: Section;
    disabled?: boolean;
  } = $props();
  
  const dispatch = createEventDispatcher<{
    change: { section: Section };
    delete: { id: string };
  }>();
  
  $effect(() => {
    // React to section changes
    if (section) {
      dispatch('change', { section });
    }
  });
</script>

<div class="section-editor {disabled ? 'opacity-50' : ''}">
  <!-- Component markup -->
</div>
```

### State Management Architecture

#### State Structure
```typescript
// src/lib/stores/sectionStore.svelte.ts
class SectionStore {
  private sections = $state<Section[]>([]);
  private activeSection = $state<string | null>(null);
  
  // Derived state
  activeSectionData = $derived(
    this.sections.find(s => s.id === this.activeSection)
  );
  
  // Methods
  addSection(section: Section) {
    this.sections = [...this.sections, section];
  }
  
  updateSection(id: string, updates: Partial<Section>) {
    this.sections = this.sections.map(s => 
      s.id === id ? { ...s, ...updates } : s
    );
  }
}

export const sectionStore = new SectionStore();
```

#### State Management Patterns
- Use Svelte 5 runes ($state, $derived, $effect) for reactivity
- Centralized stores for shared state
- Local component state for UI-only concerns
- Derived values computed automatically
- Effects for side effects and subscriptions

### Routing Architecture

#### Route Organization
```text
src/
├── routes/
│   ├── +page.svelte          # Main editor
│   ├── +layout.svelte         # App shell
│   ├── auth/
│   │   └── +page.svelte       # Auth flow
│   └── shared/
│       └── [id]/
│           └── +page.svelte   # Shared reference view
```

#### Protected Route Pattern
```typescript
// src/routes/+layout.ts
import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/firebase';

export async function load({ url }) {
  const user = await auth.currentUser;
  const protectedPaths = ['/dashboard', '/settings'];
  
  if (!user && protectedPaths.includes(url.pathname)) {
    throw redirect(303, '/auth');
  }
  
  return { user };
}
```

### Frontend Services Layer

#### API Client Setup
```typescript
// src/lib/services/api.ts
class APIClient {
  private baseURL = import.meta.env.VITE_API_URL || '/api';
  
  async generateTests(code: string, context: any): Promise<TestCase[]> {
    const response = await fetch(`${this.baseURL}/generate-tests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getToken()}`
      },
      body: JSON.stringify({ code, context })
    });
    
    if (!response.ok) throw new Error('Test generation failed');
    const data = await response.json();
    return data.testCases;
  }
  
  private async getToken(): Promise<string> {
    // Get Firebase auth token
    return await auth.currentUser?.getIdToken() || '';
  }
}

export const apiClient = new APIClient();
```

#### Service Example
```typescript
// src/lib/services/sectionService.ts
import { sectionStore } from '$lib/stores/sectionStore.svelte';
import { firebaseDataService } from './firebaseDataService';

export class SectionService {
  async createSection(type: 'static' | 'dynamic', name: string) {
    const section: Section = {
      id: crypto.randomUUID(),
      type,
      name,
      content: '',
      order: sectionStore.getSections().length,
      isActive: true,
      testCases: type === 'dynamic' ? [] : undefined
    };
    
    sectionStore.addSection(section);
    await this.persist();
    return section;
  }
  
  private async persist() {
    // Save to Firebase or localStorage
    await firebaseDataService.saveReference(
      sectionStore.exportAsReference()
    );
  }
}
```

## Backend Architecture

### Service Architecture

Since this is primarily a frontend application with serverless functions, the backend is minimal:

#### Serverless Architecture

##### Function Organization
```text
api/
├── generate-tests.ts       # AI test generation
├── health.ts              # Health check endpoint
└── _lib/
    ├── auth.ts           # Auth verification helpers
    ├── gemini.ts         # Gemini API wrapper
    └── errors.ts         # Error handling utilities
```

##### Function Template
```typescript
// api/generate-tests.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifyAuth } from './_lib/auth';
import { handleError } from './_lib/errors';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Verify authentication (optional)
    const user = await verifyAuth(req.headers.authorization);
    
    const { code, sectionName, context } = req.body;
    
    // Generate prompt for AI
    const prompt = `Generate comprehensive test cases for this JavaScript function:
    
    Section: ${sectionName}
    Context: ${JSON.stringify(context)}
    Code:
    ${code}
    
    Return test cases that cover normal cases, edge cases, and error conditions.`;
    
    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const testCases = parseTestCases(response.text());
    
    res.status(200).json({ testCases });
  } catch (error) {
    handleError(error, res);
  }
}

function parseTestCases(aiResponse: string): TestCase[] {
  // Parse AI response into structured test cases
  // Implementation details...
}
```

### Database Architecture

Since we're using Firebase Firestore (NoSQL), the database architecture focuses on document structure and access patterns:

#### Schema Design
```sql
-- Conceptual representation (Firestore is NoSQL)
-- Collection: references
CREATE COLLECTION references (
  id STRING PRIMARY KEY,
  name STRING NOT NULL,
  userId STRING,
  sections ARRAY<Section>,
  populationType ENUM('adult', 'pediatric', 'neonatal'),
  healthSystem STRING,
  metadata MAP,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  
  INDEX idx_user_updated (userId, updatedAt DESC),
  INDEX idx_population_name (populationType, name)
);

-- Embedded Section structure
TYPE Section = {
  id: STRING,
  type: ENUM('static', 'dynamic'),
  name: STRING,
  content: TEXT,
  order: INTEGER,
  isActive: BOOLEAN,
  testCases: ARRAY<TestCase>
};
```

#### Data Access Layer
```typescript
// src/lib/services/firebaseDataService.ts
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from '$lib/firebase';

export class FirebaseRepository {
  private readonly collectionName = 'references';
  
  async save(reference: Reference): Promise<void> {
    const docRef = doc(db, this.collectionName, reference.id);
    await setDoc(docRef, {
      ...reference,
      updatedAt: new Date()
    });
  }
  
  async findById(id: string): Promise<Reference | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    return docSnap.data() as Reference;
  }
  
  async findByUser(userId: string): Promise<Reference[]> {
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Reference);
  }
  
  async subscribeToReference(
    id: string, 
    callback: (ref: Reference) => void
  ): () => void {
    const docRef = doc(db, this.collectionName, id);
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as Reference);
      }
    });
  }
}

export const referenceRepository = new FirebaseRepository();
```

### Authentication and Authorization

#### Auth Flow
```mermaid
sequenceDiagram
    participant C as Client
    participant F as Firebase Auth
    participant API as Vercel Function
    participant FS as Firestore
    
    C->>F: signInWithPopup(Google)
    F-->>C: User + ID Token
    C->>API: Request + Bearer Token
    API->>F: Verify ID Token
    F-->>API: Token Claims
    API->>API: Process Request
    API-->>C: Response
    
    C->>FS: Direct SDK Call + Auth
    FS->>FS: Check Security Rules
    FS-->>C: Data/Error
```

#### Middleware/Guards
```typescript
// api/_lib/auth.ts
import { auth } from 'firebase-admin';

export async function verifyAuth(
  authHeader?: string
): Promise<UserClaims | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    return null; // Anonymous access allowed
  }
  
  const token = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await auth().verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role || 'user'
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// Usage in API routes
export function requireAuth(
  handler: (req: Request, res: Response, user: UserClaims) => Promise<void>
) {
  return async (req: Request, res: Response) => {
    const user = await verifyAuth(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    return handler(req, res, user);
  };
}
```

## Unified Project Structure

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

## Development Workflow

### Local Development Setup

#### Prerequisites
```bash
# Required tools
node --version  # v18+ required
pnpm --version  # v8+ required
git --version   # For version control
```

#### Initial Setup
```bash
# Clone repository
git clone https://github.com/yourorg/tpn-dynamic-text-editor.git
cd tpn-dynamic-text-editor

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Configure Firebase credentials in .env
# VITE_FIREBASE_API_KEY=your-api-key
# VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
# VITE_FIREBASE_PROJECT_ID=your-project-id
# VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
# VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
# VITE_FIREBASE_APP_ID=your-app-id
# GEMINI_API_KEY=your-gemini-api-key
```

#### Development Commands
```bash
# Start all services
pnpm dev              # Frontend at http://localhost:5173

# Start frontend only
pnpm dev:client       # Just the Svelte app

# Start backend only (if needed for testing)
pnpm dev:api          # Vercel functions locally

# Run tests
pnpm test            # Unit tests with Vitest
pnpm test:e2e        # E2E tests with Playwright
pnpm test:coverage   # Generate coverage report
```

### Environment Configuration

#### Required Environment Variables
```bash
# Frontend (.env.local)
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
VITE_API_URL=http://localhost:3000/api  # Local API

# Backend (.env)
GEMINI_API_KEY=xxx
FIREBASE_ADMIN_KEY=xxx  # For server-side auth

# Shared
NODE_ENV=development
```

## Deployment Architecture

### Deployment Strategy

**Frontend Deployment:**
- **Platform:** Vercel Edge Network
- **Build Command:** `pnpm build`
- **Output Directory:** `dist`
- **CDN/Edge:** Automatic edge caching via Vercel

**Backend Deployment:**
- **Platform:** Vercel Serverless Functions
- **Build Command:** Automatic (Vercel detects `/api` folder)
- **Deployment Method:** Git push triggers deployment

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm test:e2e
        env:
          CI: true
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Environments

| Environment | Frontend URL | Backend URL | Purpose |
|------------|--------------|-------------|---------|
| Development | http://localhost:5173 | http://localhost:3000/api | Local development |
| Staging | https://tpn-editor-staging.vercel.app | https://tpn-editor-staging.vercel.app/api | Pre-production testing |
| Production | https://tpn-editor.vercel.app | https://tpn-editor.vercel.app/api | Live environment |

## Security and Performance

### Security Requirements

**Frontend Security:**
- CSP Headers: `default-src 'self'; script-src 'self' 'unsafe-eval' unpkg.com; style-src 'self' 'unsafe-inline'`
- XSS Prevention: DOMPurify sanitization for all user HTML
- Secure Storage: Sensitive data only in memory, never localStorage

**Backend Security:**
- Input Validation: Zod schemas for all API inputs
- Rate Limiting: 60 requests/minute per IP (Vercel Edge)
- CORS Policy: Configured for specific origins only

**Authentication Security:**
- Token Storage: httpOnly cookies (when migrating from localStorage)
- Session Management: Firebase handles token refresh
- Password Policy: Enforced by Firebase Auth (min 6 chars)

### Performance Optimization

**Frontend Performance:**
- Bundle Size Target: <500KB initial load
- Loading Strategy: Code splitting by route, lazy load heavy components
- Caching Strategy: Service Worker for offline support, browser cache for assets

**Backend Performance:**
- Response Time Target: <200ms p95
- Database Optimization: Firestore indexes on common queries
- Caching Strategy: Edge caching for static responses

## Testing Strategy

### Testing Pyramid

```text
        E2E Tests (10%)
        /              \
    Integration Tests (30%)
    /                    \
Frontend Unit (30%)  Backend Unit (30%)
```

### Test Organization

#### Frontend Tests
```text
tests/
├── components/
│   ├── CodeEditor.test.ts
│   ├── Preview.test.ts
│   └── TestRunner.test.ts
├── services/
│   ├── secureCodeExecution.test.ts
│   └── exportService.test.ts
└── stores/
    └── sectionStore.test.ts
```

#### Backend Tests
```text
api/__tests__/
├── generate-tests.test.ts
└── _lib/
    ├── auth.test.ts
    └── gemini.test.ts
```

#### E2E Tests
```text
e2e/specs/
├── auth.spec.ts
├── editor.spec.ts
├── preview.spec.ts
├── testing.spec.ts
└── firebase-sync.spec.ts
```

### Test Examples

#### Frontend Component Test
```typescript
// tests/components/Preview.test.ts
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import Preview from '$lib/components/Preview.svelte';

describe('Preview Component', () => {
  it('renders static HTML content', async () => {
    const sections = [{
      id: '1',
      type: 'static' as const,
      name: 'Test',
      content: '<h1>Hello World</h1>',
      order: 0,
      isActive: true
    }];
    
    render(Preview, { props: { sections } });
    
    const heading = await screen.findByRole('heading');
    expect(heading).toHaveTextContent('Hello World');
  });
  
  it('executes dynamic JavaScript safely', async () => {
    const sections = [{
      id: '2',
      type: 'dynamic' as const,
      name: 'Dynamic',
      content: 'return "Dynamic: " + (2 + 2);',
      order: 0,
      isActive: true
    }];
    
    render(Preview, { props: { sections } });
    
    const output = await screen.findByText(/Dynamic: 4/);
    expect(output).toBeInTheDocument();
  });
});
```

#### Backend API Test
```typescript
// api/__tests__/generate-tests.test.ts
import { describe, it, expect, vi } from 'vitest';
import handler from '../generate-tests';

describe('Generate Tests API', () => {
  it('generates test cases for provided code', async () => {
    const req = {
      method: 'POST',
      body: {
        code: 'return me.getValue("weight") * 2;',
        sectionName: 'Weight Calc',
        context: { populationType: 'adult' }
      }
    };
    
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    
    await handler(req as any, res as any);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        testCases: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            variables: expect.any(Object),
            expectedOutput: expect.any(String)
          })
        ])
      })
    );
  });
});
```

#### E2E Test
```typescript
// e2e/specs/editor.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Editor Workflow', () => {
  test('create and preview dynamic section', async ({ page }) => {
    await page.goto('/');
    
    // Create new dynamic section
    await page.click('button:has-text("Add Section")');
    await page.click('button:has-text("Dynamic")');
    
    // Enter code
    const editor = page.locator('.cm-content');
    await editor.fill('return "Hello " + me.getValue("name");');
    
    // Check preview updates
    const preview = page.locator('[data-testid="preview"]');
    await expect(preview).toContainText('Hello');
    
    // Add test case
    await page.click('button:has-text("Add Test")');
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="expectedOutput"]', 'Hello Test User');
    
    // Run test
    await page.click('button:has-text("Run Tests")');
    await expect(page.locator('.test-result')).toContainText('Pass');
  });
});
```

## Coding Standards

### Critical Fullstack Rules

- **Type Sharing:** Always define shared types in `src/lib/types.ts` and import from there
- **API Calls:** Never make direct HTTP calls - use the service layer (`apiClient`)
- **Environment Variables:** Access only through `import.meta.env` for Vite, never `process.env` directly in frontend
- **Error Handling:** All API routes must use the standard error handler from `api/_lib/errors.ts`
- **State Updates:** Never mutate state directly - use proper Svelte store methods or runes
- **Secure Execution:** All user JavaScript must run through `SecureCodeExecution` service
- **HTML Sanitization:** All user HTML must pass through DOMPurify before rendering
- **Firebase Operations:** Use `firebaseDataService` wrapper, never direct SDK calls in components

### Naming Conventions

| Element | Frontend | Backend | Example |
|---------|----------|---------|---------|
| Components | PascalCase | - | `UserProfile.svelte` |
| Stores | camelCase | - | `sectionStore.svelte.ts` |
| Services | camelCase | camelCase | `exportService.ts` |
| API Routes | - | kebab-case | `/api/generate-tests` |
| Types/Interfaces | PascalCase | PascalCase | `Section`, `TestCase` |
| Constants | UPPER_SNAKE | UPPER_SNAKE | `MAX_RETRIES` |
| CSS Classes | kebab-case | - | `section-editor` |
| Event Handlers | handleX | - | `handleClick` |

## Error Handling Strategy

### Error Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Component
    participant S as Service
    participant API as API/Firebase
    participant EH as ErrorHandler
    
    U->>C: Trigger Action
    C->>S: Call Service
    S->>API: Make Request
    
    alt Success
        API-->>S: Response
        S-->>C: Data
        C-->>U: Update UI
    else API Error
        API-->>S: Error Response
        S->>EH: handleError()
        EH->>EH: Log Error
        EH->>EH: Format User Message
        EH-->>S: Error Object
        S-->>C: Formatted Error
        C-->>U: Show Error Toast
    else Network Error
        S->>EH: handleNetworkError()
        EH-->>S: Offline Message
        S-->>C: Fallback to Cache
        C-->>U: Show Offline Mode
    end
```

### Error Response Format

```typescript
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId: string;
  };
}
```

### Frontend Error Handling

```typescript
// src/lib/services/errorHandler.ts
export class ErrorHandler {
  static handle(error: unknown): UserError {
    console.error('Error occurred:', error);
    
    if (error instanceof FirebaseError) {
      return this.handleFirebaseError(error);
    }
    
    if (error instanceof NetworkError) {
      return this.handleNetworkError(error);
    }
    
    if (error instanceof ValidationError) {
      return this.handleValidationError(error);
    }
    
    // Default error
    return {
      message: 'An unexpected error occurred. Please try again.',
      code: 'UNKNOWN_ERROR',
      retry: true
    };
  }
  
  private static handleFirebaseError(error: FirebaseError): UserError {
    const errorMap: Record<string, string> = {
      'permission-denied': 'You don\'t have permission to perform this action.',
      'not-found': 'The requested data could not be found.',
      'already-exists': 'This item already exists.',
      'resource-exhausted': 'Too many requests. Please try again later.'
    };
    
    return {
      message: errorMap[error.code] || 'Database operation failed.',
      code: error.code,
      retry: error.code !== 'permission-denied'
    };
  }
}
```

### Backend Error Handling

```typescript
// api/_lib/errors.ts
export function handleError(error: unknown, res: VercelResponse) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  
  console.error(`[${requestId}] Error:`, error);
  
  if (error instanceof ValidationError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: error.details,
        timestamp,
        requestId
      }
    });
  }
  
  if (error instanceof AuthError) {
    return res.status(401).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication required',
        timestamp,
        requestId
      }
    });
  }
  
  // Default 500 error
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
      timestamp,
      requestId
    }
  });
}
```

## Monitoring and Observability

### Monitoring Stack

- **Frontend Monitoring:** Vercel Analytics (Core Web Vitals, custom events)
- **Backend Monitoring:** Vercel Functions logs and metrics
- **Error Tracking:** Console logging with structured format (consider Sentry for production)
- **Performance Monitoring:** Lighthouse CI in GitHub Actions

### Key Metrics

**Frontend Metrics:**
- Core Web Vitals (LCP, FID, CLS)
- JavaScript errors rate
- API response times (p50, p95, p99)
- User interactions (section creates, test runs, saves)

**Backend Metrics:**
- Request rate by endpoint
- Error rate (4xx, 5xx)
- Response time percentiles
- Database query performance
- AI API latency

## Checklist Results Report

### Executive Summary

**Overall Architecture Readiness: HIGH**
- **Project Type:** Full-stack (Frontend + Serverless Backend)
- **Sections Evaluated:** All sections including frontend-specific
- **Key Strengths:**
  - Comprehensive coverage of restoration requirements
  - Clear separation of concerns with service layer architecture
  - Strong security model with Web Worker sandboxing
  - Well-defined data models and API specifications
- **Critical Risks Identified:**
  - Technical debt from dual component system (legacy + Skeleton UI)
  - Large monolithic components need refactoring
  - Low test coverage (3.3%) poses risk for restoration work

### Section Analysis

1. **Requirements Alignment (100% Pass)**
   - All PRD restoration stories addressed
   - Non-functional requirements covered
   - Technical constraints satisfied

2. **Architecture Fundamentals (100% Pass)**
   - Clear diagrams and component definitions
   - Good separation of concerns
   - Appropriate design patterns

3. **Technical Stack & Decisions (100% Pass)**
   - Specific versions defined
   - Technology choices justified
   - Frontend/backend/data architecture complete

4. **Frontend Design & Implementation (100% Pass)**
   - Svelte 5 runes pattern well-defined
   - Component organization clear
   - API integration patterns specified

5. **Resilience & Operational Readiness (95% Pass)**
   - Comprehensive error handling
   - Monitoring through Vercel Analytics
   - Minor gap: More detailed alerting thresholds needed

6. **Security & Compliance (100% Pass)**
   - Firebase Auth for authentication
   - Web Worker sandboxing for code execution
   - DOMPurify for XSS prevention

7. **Implementation Guidance (100% Pass)**
   - Clear coding standards
   - Testing strategy defined
   - Development environment documented

8. **Dependency & Integration Management (100% Pass)**
   - External dependencies versioned
   - Firebase/Gemini integrations documented
   - Fallback strategies defined

9. **AI Agent Implementation Suitability (100% Pass)**
   - Modular service architecture
   - Clear patterns and conventions
   - Comprehensive implementation guidance

10. **Accessibility Implementation (90% Pass)**
    - Basic accessibility mentioned
    - Needs more specific WCAG compliance targets

### Risk Assessment

**Top 5 Risks by Severity:**

1. **LOW TEST COVERAGE (3.3%)** - Critical
   - Mitigation: Add unit tests for all restoration work
   - Timeline Impact: 2-3 days additional work

2. **COMPONENT SIZE VIOLATIONS** - High
   - App.svelte (2,477 lines), Sidebar.svelte (4,247 lines)
   - Mitigation: Refactor into smaller components
   - Timeline Impact: 3-4 days

3. **DUAL COMPONENT SYSTEM** - High
   - Legacy + Skeleton UI causing confusion
   - Mitigation: Complete migration to Skeleton UI
   - Timeline Impact: 2-3 days

4. **FIREBASE RULES MISMATCH** - Medium
   - Security rules don't match data structure
   - Mitigation: Update Firestore rules
   - Timeline Impact: 1 day

5. **BUNDLE SIZE (1.5MB vs 500KB target)** - Medium
   - Poor mobile performance
   - Mitigation: Implement code splitting
   - Timeline Impact: 2 days

### Recommendations

**Must-Fix Before Development:**
- Update Firestore security rules to match data model
- Add unit tests for critical services being restored
- Document the migration path from legacy to Skeleton UI components

**Should-Fix for Better Quality:**
- Refactor App.svelte into smaller components
- Implement code splitting for better performance
- Add structured logging for debugging

**Nice-to-Have Improvements:**
- Add Sentry for production error tracking
- Implement visual regression testing
- Add performance budgets to CI/CD

### AI Implementation Readiness

**Readiness Level: EXCELLENT**
- Service layer provides clear boundaries
- TypeScript interfaces define contracts
- Patterns are consistent throughout
- Web Worker isolation prevents dangerous code execution

**Areas Needing Clarification:**
- Migration strategy for dual component system
- Specific testing requirements for restored features

### Frontend-Specific Assessment

**Completeness: 95%**
- Svelte 5 runes architecture well-documented
- Component structure clearly defined
- State management patterns established
- Minor gap: More specific accessibility targets needed

---

The architecture is **ready for implementation** with the noted risk mitigations. The restoration epic can proceed with confidence given the comprehensive technical foundation documented here.