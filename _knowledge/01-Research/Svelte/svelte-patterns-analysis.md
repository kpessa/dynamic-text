# Svelte Patterns Analysis - Dynamic Text Editor

## Executive Summary

This document analyzes Svelte patterns found in the Dynamic Text Editor codebase, focusing on Svelte 5's runes API, component composition strategies, and performance optimizations. Based on analysis of 27+ Svelte files, this guide serves as a practical reference for development.

## Table of Contents
1. [Svelte 5 Runes Patterns](#svelte-5-runes-patterns)
2. [Store Architecture](#store-architecture)
3. [Component Composition](#component-composition)
4. [Event Handling & Communication](#event-handling--communication)
5. [Performance Patterns](#performance-patterns)
6. [Migration Strategies](#migration-strategies)
7. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
8. [Recommendations](#recommendations)

## Svelte 5 Runes Patterns

### $state - Reactive State Management

The `$state` rune replaces traditional `let` declarations for reactive state. It provides fine-grained reactivity with automatic dependency tracking.

#### Basic Usage Pattern
```javascript
// From src/App.svelte
let copied = $state(false);
let previewMode = $state('preview'); // 'preview' or 'output'
let testSummary = $state(null);
let showTestSummary = $state(false);
```

#### Complex State Objects
```javascript
// From src/stores/sectionStore.svelte.ts
let sections = $state<Section[]>([]);
let activeTestCase = $state<Record<string, TestCase>>({});
let expandedTestCases = $state<Record<string, boolean>>({});
```

#### State with Type Safety
```typescript
// From src/stores/workspaceStore.svelte.ts
let currentIngredient = $state<string>('');
let currentReferenceName = $state<string>('');
let lastSavedTime = $state<Date | null>(null);
```

### $derived - Computed Values

The `$derived` rune creates reactive computed values that automatically update when dependencies change.

#### Simple Derived Values
```javascript
// From src/App.svelte
const sections = $derived(sectionStore.sections);
const dynamicSections = $derived(sectionStore.dynamicSections);
const hasUnsavedChanges = $derived(sectionStore.hasUnsavedChanges);
```

#### Complex Computations with $derived.by()
```javascript
// From src/App.svelte - TPN ingredient categorization
let ingredientsBySection = $derived.by(() => {
  const result = {};
  
  for (const section of dynamicSections) {
    const keys = extractKeysFromCode(section.content, { 
      includeDirectKeys: true 
    });
    const directKeys = extractDirectKeysFromCode(section.content);
    
    const categorized = {
      tpnKeys: [],
      calculatedKeys: [],
      customKeys: [],
      allKeys: keys
    };
    
    keys.forEach(key => {
      if (isValidKey(key)) {
        if (isCalculatedValue(key)) {
          categorized.calculatedKeys.push(key);
        } else {
          categorized.tpnKeys.push(key);
        }
      } else if (!directKeys.includes(key)) {
        categorized.customKeys.push(key);
      }
    });
    
    result[section.id] = categorized;
  }
  
  return result;
});
```

#### Derived Arrays and Filtering
```javascript
// From src/stores/sectionStore.svelte.ts
const dynamicSections = $derived(
  sections.filter(s => s.type === 'dynamic')
);

const hasUnsavedChanges = $derived(() => {
  const currentJSON = JSON.stringify(sections);
  return currentJSON !== lastSavedState;
});
```

### $effect - Side Effects Management

The `$effect` rune replaces lifecycle hooks like `onMount` and `onDestroy`, providing a unified way to handle side effects.

#### Basic Effect Pattern
```javascript
// From src/components/StatusBar.svelte
$effect(() => {
  // Update time display every minute
  const interval = setInterval(() => {
    updateTimeDisplay();
  }, 60000);
  
  return () => clearInterval(interval); // Cleanup
});
```

#### Effects with Dependencies
```javascript
// From src/App.svelte - Modal management
$effect(() => {
  if (showIngredientManager) {
    document.body.style.overflow = 'hidden';
  }
  
  return () => {
    document.body.style.overflow = '';
  };
});
```

#### Complex Effects with Multiple Dependencies
```javascript
// From src/lib/services/performanceService.ts integration
$effect(() => {
  if (sections.length > 0 && navbarUiState.tpnMode) {
    // Track TPN calculation performance
    const startTime = performance.now();
    const results = calculateAllSections();
    const endTime = performance.now();
    
    if (endTime - startTime > 100) {
      console.warn(`Slow TPN calculation: ${endTime - startTime}ms`);
    }
  }
});
```

### $props - Component Properties

The `$props` rune provides type-safe component properties with default values.

#### Basic Props Pattern
```javascript
// From src/components/StatusBar.svelte
let { 
  documentName = 'Untitled',
  saveStatus = 'saved',
  lastSaveTime = null,
  testsPassed = 0,
  testsTotal = 0,
  showTestStatus = false
} = $props();
```

#### Props with Complex Types
```javascript
// From src/components/EditorWorkspace.svelte
let { 
  sections = [],
  editingSection = null,
  expandedTestCases = {},
  activeTestCase = {},
  navbarUiState = {},
  previewMode = 'preview',
  previewHTML = '',
  // ... 30+ more props
  onEditingSectionChange = () => {},
  onAddSection = () => {},
  onDeleteSection = () => {}
} = $props();
```

## Store Architecture

### Modern Runes-Based Stores (.svelte.ts)

```typescript
// src/stores/sectionStore.svelte.ts
export function createSectionStore() {
  let sections = $state<Section[]>([]);
  let draggedSection = $state<Section | null>(null);
  
  return {
    get sections() { return sections; },
    get dynamicSections() { 
      return $derived(sections.filter(s => s.type === 'dynamic'));
    },
    
    addSection(type: 'static' | 'dynamic') {
      const newSection: Section = {
        id: crypto.randomUUID(),
        type,
        content: '',
        testCases: type === 'dynamic' ? [createDefaultTestCase()] : undefined
      };
      sections = [...sections, newSection];
    },
    
    updateSection(id: string, updates: Partial<Section>) {
      sections = sections.map(s => 
        s.id === id ? { ...s, ...updates } : s
      );
    }
  };
}

export const sectionStore = createSectionStore();
```

### Hybrid Store Pattern (Mixing Runes and Traditional)

```javascript
// src/stores/workspaceStore.svelte.ts
function createWorkspaceStore() {
  // Runes for reactive state
  let currentIngredient = $state('');
  let firebaseEnabled = $state(false);
  
  // Derived computations
  const isModified = $derived(() => {
    return currentIngredient !== lastSavedIngredient;
  });
  
  // Traditional methods
  function reset() {
    currentIngredient = '';
    firebaseEnabled = false;
  }
  
  return {
    get currentIngredient() { return currentIngredient; },
    get firebaseEnabled() { return firebaseEnabled; },
    get isModified() { return isModified; },
    
    setIngredient: (name: string) => currentIngredient = name,
    setFirebaseEnabled: (enabled: boolean) => firebaseEnabled = enabled,
    reset
  };
}
```

## Component Composition

### Container-Presentation Pattern

```javascript
// Container Component - src/components/AppContainer.svelte
<script>
  import EditorWorkspace from './EditorWorkspace.svelte';
  import StatusBar from './StatusBar.svelte';
  import { sectionStore } from '../stores/sectionStore.svelte.ts';
  
  // Container manages state
  const sections = $derived(sectionStore.sections);
  const hasUnsavedChanges = $derived(sectionStore.hasUnsavedChanges);
  
  // Container handles business logic
  function handleSave() {
    sectionStore.save();
  }
</script>

<StatusBar {hasUnsavedChanges} onSave={handleSave} />
<EditorWorkspace {sections} />

// Presentation Component - src/components/StatusBar.svelte
<script>
  // Presentation receives props
  let { hasUnsavedChanges, onSave } = $props();
  
  // Presentation handles UI logic only
  let saveButtonText = $derived(
    hasUnsavedChanges ? 'Save Changes' : 'Saved'
  );
</script>
```

### Compound Component Pattern

```javascript
// Parent manages shared state - src/lib/IngredientManager.svelte
<script>
  let selectedIngredient = $state(null);
  let filterState = $state({ category: 'all', search: '' });
</script>

<IngredientManager.Header {filterState} />
<IngredientManager.List 
  {filterState} 
  {selectedIngredient}
  onSelect={(ing) => selectedIngredient = ing}
/>
<IngredientManager.Details {selectedIngredient} />
```

## Event Handling & Communication

### Event Bus Pattern

```javascript
// src/lib/eventBus.ts
export const Events = {
  SECTION_UPDATE: 'section:update',
  SECTION_DELETE: 'section:delete',
  TEST_RUN: 'test:run',
  DOCUMENT_SAVE: 'document:save'
} as const;

class EventBus {
  private listeners = new Map();
  
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    };
  }
  
  emit(event: string, data?: any) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }
}

export const eventBus = new EventBus();
```

### Component Event Integration

```javascript
// Emitting events
<script>
  import { eventBus, Events } from '$lib/eventBus';
  
  function updateSection(id, content) {
    sectionStore.updateContent(id, content);
    eventBus.emit(Events.SECTION_UPDATE, { id, content });
  }
</script>

// Listening to events
<script>
  import { eventBus, Events } from '$lib/eventBus';
  
  $effect(() => {
    const unsubscribe = eventBus.on(Events.SECTION_UPDATE, (data) => {
      console.log('Section updated:', data);
      // Re-run tests if needed
      if (autoTest) runTests();
    });
    
    return unsubscribe; // Cleanup
  });
</script>
```

## Performance Patterns

### Memoization with $derived

```javascript
// Expensive computation cached
const compiledSections = $derived.by(() => {
  console.log('Recompiling sections...'); // Only logs when dependencies change
  return sections.map(section => {
    if (section.type === 'dynamic') {
      return {
        ...section,
        compiled: Babel.transform(section.content, {
          presets: ['env']
        }).code
      };
    }
    return section;
  });
});
```

### Conditional Rendering

```javascript
// Lazy component loading
{#if showIngredientManager}
  <div class="modal-overlay">
    <IngredientManager />
  </div>
{/if}

// Heavy components only when needed
{#if navbarUiState.tpnMode}
  <TPNTestPanel {dynamicSections} />
{/if}
```

### Efficient List Updates

```javascript
// Keyed each blocks for optimal DOM updates
{#each sections as section (section.id)}
  <SectionItem {section} />
{/each}

// Immutable updates for reactivity
function updateSection(id, updates) {
  sections = sections.map(s => 
    s.id === id ? { ...s, ...updates } : s
  );
}
```

## Migration Strategies

### From Svelte 4 to Svelte 5

#### Before (Svelte 4)
```javascript
<script>
  import { onMount, onDestroy } from 'svelte';
  
  let count = 0;
  $: doubled = count * 2;
  
  let interval;
  
  onMount(() => {
    interval = setInterval(() => count++, 1000);
  });
  
  onDestroy(() => {
    clearInterval(interval);
  });
</script>
```

#### After (Svelte 5)
```javascript
<script>
  let count = $state(0);
  const doubled = $derived(count * 2);
  
  $effect(() => {
    const interval = setInterval(() => count++, 1000);
    return () => clearInterval(interval);
  });
</script>
```

### Gradual Migration Approach

```javascript
// Hybrid component supporting both patterns
<script>
  import { writable } from 'svelte/store';
  
  // Old store (for compatibility)
  export const countStore = writable(0);
  
  // New runes (for new features)
  let localCount = $state(0);
  
  // Bridge between old and new
  $effect(() => {
    countStore.set(localCount);
  });
  
  // Subscribe to old store
  $effect(() => {
    const unsubscribe = countStore.subscribe(value => {
      localCount = value;
    });
    return unsubscribe;
  });
</script>
```

## Anti-Patterns to Avoid

### ❌ Don't: Mutate State Directly
```javascript
// Wrong
sections[0].content = 'new content';

// Correct
sections = sections.map((s, i) => 
  i === 0 ? { ...s, content: 'new content' } : s
);
```

### ❌ Don't: Create Effects Without Cleanup
```javascript
// Wrong
$effect(() => {
  window.addEventListener('resize', handleResize);
  // Missing cleanup!
});

// Correct
$effect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
});
```

### ❌ Don't: Overuse $derived for Simple Values
```javascript
// Unnecessary
const isEven = $derived(count % 2 === 0);

// Better for simple computations
let isEven = count % 2 === 0;
```

### ❌ Don't: Mix Store Patterns Inconsistently
```javascript
// Confusing mix
let state1 = $state(0);
export const store2 = writable(0);
let state3 = $state(0);

// Better - choose one pattern per module
let state1 = $state(0);
let state2 = $state(0);
let state3 = $state(0);
```

## Recommendations

### 1. State Management Strategy
- Use `$state` for component-local state
- Use stores (.svelte.ts) for shared state
- Keep derived values close to their usage
- Minimize state - derive what you can

### 2. Component Design
- Prefer composition over inheritance
- Keep components focused (single responsibility)
- Use props for configuration, events for communication
- Implement proper TypeScript types

### 3. Performance Optimization
- Use `$derived` for expensive computations
- Implement lazy loading for heavy components
- Clean up effects to prevent memory leaks
- Use keyed each blocks for lists

### 4. Testing Approach
```javascript
// Test runes-based components
import { test, expect } from 'vitest';
import { render } from '@testing-library/svelte';

test('component with runes', async () => {
  const { component } = render(MyComponent, {
    props: { initialValue: 5 }
  });
  
  // Test derived values update
  expect(component.doubled).toBe(10);
  
  // Update state
  await component.increment();
  expect(component.doubled).toBe(12);
});
```

### 5. TypeScript Integration
```typescript
// Type-safe stores
interface StoreState {
  sections: Section[];
  activeId: string | null;
}

function createTypedStore() {
  let state = $state<StoreState>({
    sections: [],
    activeId: null
  });
  
  return {
    get state() { return state; },
    updateSection(id: string, updates: Partial<Section>) {
      state.sections = state.sections.map(s => 
        s.id === id ? { ...s, ...updates } : s
      );
    }
  };
}
```

## Conclusion

The Dynamic Text Editor effectively leverages Svelte 5's runes API while maintaining compatibility with existing patterns. Key strengths include:

1. **Consistent use of $state** for reactive state management
2. **Efficient $derived computations** for complex medical calculations
3. **Proper $effect cleanup** preventing memory leaks
4. **Type-safe $props** with sensible defaults
5. **Well-structured stores** using modern patterns

Areas for continued improvement:
- Complete migration from Svelte 4 patterns
- Expand TypeScript coverage
- Implement more granular component testing
- Optimize bundle size with better code splitting

This analysis provides a foundation for maintaining consistency and quality in Svelte development across the project.