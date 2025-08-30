# 4. Architecture Patterns

## Component Architecture
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

## Service Layer Pattern
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

## State Management (Svelte 5 Runes)
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
