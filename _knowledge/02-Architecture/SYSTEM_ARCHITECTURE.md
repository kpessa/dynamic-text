# System Architecture - Dynamic Text Editor

## Overview

The Dynamic Text Editor is a modern single-page application (SPA) built with Svelte 5, featuring a sophisticated architecture that balances medical accuracy requirements with performance and developer experience.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                         Client (Browser)                      │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   Presentation Layer                  │   │
│  │  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐ │   │
│  │  │  App.svelte │ │  Components  │ │    Modals    │ │   │
│  │  │   (Main)    │ │  (50+ files) │ │  (Dialogs)   │ │   │
│  │  └─────────────┘ └──────────────┘ └──────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│                              ↕                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    State Management                   │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────────┐  │   │
│  │  │ Section    │ │ Workspace  │ │     Test       │  │   │
│  │  │   Store    │ │   Store    │ │     Store      │  │   │
│  │  └────────────┘ └────────────┘ └────────────────┘  │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────────┐  │   │
│  │  │    TPN     │ │     UI     │ │   Event Bus    │  │   │
│  │  │   Store    │ │   Store    │ │                │  │   │
│  │  └────────────┘ └────────────┘ └────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                              ↕                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    Service Layer                      │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │              Firebase Service                   │ │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌──────────────┐    │ │   │
│  │  │  │Ingredient│ │Reference│ │    Config    │    │ │   │
│  │  │  │ Service │ │ Service │ │   Service    │    │ │   │
│  │  │  └─────────┘ └─────────┘ └──────────────┘    │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │              Base Services                      │ │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌──────────────┐    │ │   │
│  │  │  │  Cache  │ │  Error  │ │     Sync     │    │ │   │
│  │  │  │ Service │ │ Service │ │   Service    │    │ │   │
│  │  │  └─────────┘ └─────────┘ └──────────────┘    │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│                              ↕                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   Worker Threads                      │   │
│  │  ┌──────────────┐           ┌──────────────────┐    │   │
│  │  │ TPN Worker   │           │   Code Worker    │    │   │
│  │  │(Calculations)│           │   (Execution)    │    │   │
│  │  └──────────────┘           └──────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
│                              ↕                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   Service Worker                      │   │
│  │         (PWA, Offline Support, Caching)              │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                               ↕
┌──────────────────────────────────────────────────────────────┐
│                     External Services                         │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Firebase   │  │  Gemini API  │  │     Vercel       │  │
│  │  (Database)  │  │(AI Testing)  │  │   (Functions)    │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Core Architecture Principles

### 1. Separation of Concerns
- **Presentation Layer**: UI components and user interaction
- **State Management**: Centralized state with reactive stores
- **Service Layer**: Business logic and external integrations
- **Worker Layer**: Heavy computations off main thread
- **Infrastructure**: PWA, caching, and offline support

### 2. Medical Safety First
- All calculations validated against reference ranges
- Immutable audit trails for compliance
- Version control for all changes
- Error boundaries for graceful failures

### 3. Performance Optimization
- Web Workers for TPN calculations
- Multi-tier caching strategy
- Lazy loading and code splitting
- Service Worker for offline capability

### 4. Developer Experience
- TypeScript for type safety
- Hot module replacement
- Comprehensive testing infrastructure
- Knowledge-first documentation

## Layer Descriptions

### Presentation Layer

The presentation layer consists of Svelte 5 components organized by feature:

```
src/
├── App.svelte                 # Main application orchestrator (needs refactoring)
├── components/                # Refactored components
│   ├── StatusBar.svelte      # Document status display
│   ├── EditorWorkspace.svelte # Editor container
│   └── IngredientContextBar.svelte # Context display
└── lib/                       # Feature components
    ├── CodeEditor.svelte      # CodeMirror integration
    ├── TPNTestPanel.svelte    # TPN testing interface
    └── IngredientManager.svelte # Ingredient CRUD
```

**Key Characteristics:**
- Svelte 5 runes for reactivity ($state, $derived, $effect)
- Component composition over inheritance
- Props for configuration, events for communication
- Lazy loading for heavy components

### State Management Layer

Centralized state management using Svelte stores:

```javascript
// Store Architecture
sectionStore.svelte.ts    // Document sections and content
workspaceStore.svelte.ts  // Workspace and save state
testStore.svelte.ts       // Test execution and results
tpnStore.svelte.ts        // TPN-specific state
uiStore.svelte.ts         // UI state (modals, panels)
```

**State Flow:**
1. Components dispatch actions to stores
2. Stores update state immutably
3. Derived values automatically recompute
4. Components re-render with new state

### Service Layer

Domain-driven service architecture:

```
src/lib/services/
├── FirebaseService.ts         # Service orchestration
├── domain/
│   ├── IngredientService.ts  # Ingredient operations
│   ├── ReferenceService.ts   # Reference management
│   └── ConfigService.ts      # Configuration handling
├── base/
│   ├── CacheService.ts       # Multi-tier caching
│   ├── ErrorService.ts       # Error handling
│   └── SyncService.ts        # Real-time sync
└── workerService.ts           # Worker thread management
```

**Service Responsibilities:**
- Business logic encapsulation
- External API integration
- Data validation and transformation
- Error handling and recovery
- Performance optimization

### Worker Thread Layer

Offloading heavy computations:

```javascript
// TPN Worker (public/workers/tpnWorker.js)
- TPN calculations (osmolarity, concentrations)
- Population-specific validations
- Batch calculation processing
- Result caching (LRU, 100 entries)

// Code Worker (public/workers/codeWorker.js)
- JavaScript code transpilation (Babel)
- Safe code execution sandbox
- Medical helper functions
- Performance monitoring
```

**Worker Communication:**
```javascript
// Main thread
const result = await workerService.calculate({
  type: 'osmolarity',
  data: tpnValues
});

// Worker thread
self.onmessage = (e) => {
  const { type, data } = e.data;
  const result = calculate(type, data);
  self.postMessage({ result });
};
```

### Infrastructure Layer

PWA and offline support:

```javascript
// Service Worker (public/sw.js)
- Static asset caching
- Dynamic content caching
- API response caching
- Offline fallback pages
- Background sync

// Cache Strategy
├── Cache First (static assets)
├── Network First (API calls)
├── Stale While Revalidate (dynamic content)
└── Cache Only (offline mode)
```

## Data Flow Architecture

### 1. User Input Flow
```
User Action → Component → Store Action → State Update → Re-render
                ↓
            Event Bus → Other Components
```

### 2. Data Persistence Flow
```
Store Update → Service Layer → Firebase
                ↓
            Local Cache → IndexedDB
```

### 3. Calculation Flow
```
Input Values → Worker Thread → Calculation → Cache → Result
                                    ↓
                              Validation → Safety Check
```

## Technology Stack

### Frontend Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| Svelte | 5.35+ | UI framework with runes |
| Vite | 7.0 | Build tool and dev server |
| TypeScript | 5.0+ | Type safety |
| SCSS | - | Styling with 7-1 pattern |
| CodeMirror | 6 | Code editing |

### Backend Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| Firebase | 9+ | Database and auth |
| Firestore | - | NoSQL database |
| Vercel | - | Hosting and functions |
| Gemini API | - | AI test generation |

### Testing Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| Vitest | - | Unit testing |
| Playwright | - | E2E testing |
| Happy DOM | - | DOM simulation |

## Security Architecture

### Authentication
- Firebase Anonymous Auth for basic access
- Custom auth for admin features
- Session persistence across browser sessions
- Rate limiting for API calls

### Data Protection
- Firestore security rules
- Input sanitization (DOMPurify)
- Content Security Policy
- HTTPS enforcement

### Medical Safety
- Calculation validation
- Range checking
- Audit logging
- Version control

## Performance Architecture

### Build Optimization
```javascript
// vite.config.ts - Manual chunking
vendor: ['svelte']
codemirror: ['@codemirror/*']
firebase: ['firebase/*']
ai: ['@google/generative-ai']
```

### Runtime Optimization
- Lazy component loading
- Virtual scrolling for lists
- Memoized calculations
- Debounced updates

### Monitoring
- Web Vitals tracking
- Custom metrics (TPN calculation time)
- Error reporting
- Performance budgets

## Scalability Considerations

### Horizontal Scaling
- Stateless application design
- CDN for static assets
- Edge functions for API
- Database sharding ready

### Vertical Scaling
- Worker thread pooling
- Efficient memory management
- Progressive loading
- Cache optimization

## Technical Debt

### Current Issues
1. **App.svelte monolith** (3000+ lines)
2. **Mixed JS/TS** migration incomplete
3. **Test coverage** at 3.3%
4. **Bundle size** optimization needed

### Improvement Plan
1. Extract components from App.svelte
2. Complete TypeScript migration
3. Expand test coverage to 80%
4. Implement better code splitting

## Future Architecture

### Planned Enhancements
1. **Micro-frontend architecture** for feature isolation
2. **GraphQL API** for efficient data fetching
3. **Redis caching** for server-side performance
4. **Kubernetes deployment** for container orchestration
5. **Event sourcing** for audit compliance

### Technology Upgrades
- SvelteKit for SSR capabilities
- Turbopack for faster builds
- Edge computing for global distribution
- WebAssembly for calculation performance

## Conclusion

The Dynamic Text Editor architecture successfully balances medical safety requirements with modern web development practices. The layered architecture provides clear separation of concerns, enabling independent scaling and testing of each layer. The use of Web Workers, Service Workers, and multi-tier caching ensures excellent performance even with complex medical calculations.

Key architectural strengths:
- **Modular design** enables feature isolation
- **Service layer** provides business logic encapsulation
- **Worker threads** prevent UI blocking
- **PWA capabilities** ensure offline functionality
- **Firebase integration** enables real-time collaboration

This architecture provides a solid foundation for continued development while maintaining the critical medical safety requirements of TPN calculations.