# Frontend Architecture

## Component Architecture

### Component Organization
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

### Component Template
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

## State Management Architecture

### State Structure
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

### State Management Patterns
- Use Svelte 5 runes ($state, $derived, $effect) for reactivity
- Centralized stores for shared state
- Local component state for UI-only concerns
- Derived values computed automatically
- Effects for side effects and subscriptions

## Routing Architecture

### Route Organization
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

### Protected Route Pattern
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

## Frontend Services Layer

### API Client Setup
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

### Service Example
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
