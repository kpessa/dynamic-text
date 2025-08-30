# Shard 4: Design System Implementation
**Parent PRD:** optimization-brownfield-prd.md  
**Timeline:** Week 3, Days 1-5  
**Owner:** UI Developer  
**Status:** READY (Can run parallel)  
**Dependencies:** None (can run independently)  

## Objective
Create a comprehensive design system with tokens, components, and consistent styling to improve UI consistency and developer velocity.

## Scope
### In Scope
- Design token system (colors, spacing, typography)
- Core UI component library
- Consistent styling patterns
- Documentation and examples
- Migration of 3+ major components

### Out of Scope
- Complete UI redesign
- New features
- Breaking changes to existing UI

## Technical Approach

### Design Token Structure
```scss
// src/styles/tokens.scss
:root {
  // Color System
  --color-primary-50: #eff6ff;
  --color-primary-500: #3b82f6;
  --color-primary-900: #1e3a8a;
  
  // Semantic Colors
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #3b82f6;
  
  // Spacing Scale
  --space-1: 0.25rem;  // 4px
  --space-2: 0.5rem;   // 8px
  --space-3: 0.75rem;  // 12px
  --space-4: 1rem;     // 16px
  --space-6: 1.5rem;   // 24px
  --space-8: 2rem;     // 32px
  
  // Typography
  --font-sans: system-ui, -apple-system, sans-serif;
  --font-mono: 'Fira Code', monospace;
  
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  
  // Shadows
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
  
  // Borders
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-full: 9999px;
}
```

### Component Library

#### 1. Button Component
```svelte
<!-- src/lib/ui/Button.svelte -->
<script lang="ts">
  export let variant: 'primary' | 'secondary' | 'danger' = 'primary'
  export let size: 'sm' | 'md' | 'lg' = 'md'
  export let loading = false
  export let disabled = false
</script>

<button
  class="btn btn-{variant} btn-{size}"
  class:loading
  {disabled}
  on:click
>
  {#if loading}
    <Spinner size={size} />
  {/if}
  <slot />
</button>
```

#### 2. Card Component
```svelte
<!-- src/lib/ui/Card.svelte -->
<script lang="ts">
  export let title = ''
  export let actions = []
</script>

<div class="card">
  {#if title}
    <div class="card-header">
      <h3>{title}</h3>
      {#if actions.length}
        <div class="card-actions">
          {#each actions as action}
            <Button {...action} />
          {/each}
        </div>
      {/if}
    </div>
  {/if}
  <div class="card-body">
    <slot />
  </div>
</div>
```

#### 3. Modal Component
```svelte
<!-- src/lib/ui/Modal.svelte -->
<script lang="ts">
  export let open = false
  export let title = ''
  export let size: 'sm' | 'md' | 'lg' = 'md'
</script>

{#if open}
  <div class="modal-backdrop" on:click={() => open = false}>
    <div class="modal modal-{size}" on:click|stopPropagation>
      <div class="modal-header">
        <h2>{title}</h2>
        <button on:click={() => open = false}>×</button>
      </div>
      <div class="modal-body">
        <slot />
      </div>
      <div class="modal-footer">
        <slot name="footer" />
      </div>
    </div>
  </div>
{/if}
```

## Implementation Plan

### Day 1-2: Token System
- [ ] Create color palette
- [ ] Define spacing scale
- [ ] Set up typography system
- [ ] Create shadow/border tokens
- [ ] Document usage

### Day 3: Core Components
- [ ] Button component + variants
- [ ] Card component
- [ ] Modal component
- [ ] Form controls (Input, Select, Textarea)
- [ ] Feedback components (Toast, Alert)

### Day 4: Advanced Components
- [ ] Table component
- [ ] Tabs component
- [ ] Dropdown component
- [ ] Loading states (Skeleton, Spinner)
- [ ] Empty states

### Day 5: Integration
- [ ] Migrate 3 major components
- [ ] Update documentation
- [ ] Create Storybook stories
- [ ] Team training

## Acceptance Criteria
- [ ] Token system covers all UI needs
- [ ] 10+ reusable components created
- [ ] 3+ major components migrated
- [ ] Documentation with examples
- [ ] Consistent styling across app
- [ ] No visual regressions

## Style Guide Examples

### Button States
```scss
.btn {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  transition: all 0.2s;
  
  &-primary {
    background: var(--color-primary-500);
    color: white;
    
    &:hover {
      background: var(--color-primary-600);
    }
  }
  
  &-secondary {
    background: transparent;
    border: 1px solid var(--color-gray-300);
    
    &:hover {
      background: var(--color-gray-50);
    }
  }
}
```

## Migration Strategy
1. Create new components alongside old
2. Use feature flags for gradual rollout
3. Migrate one section at a time
4. A/B test for user feedback
5. Remove old styles after validation

## Deliverables
1. Token system (SCSS/CSS)
2. Component library (10+ components)
3. Style guide documentation
4. Migration examples
5. Storybook setup (optional)

## Success Metrics
- Developer velocity: 40% faster UI development
- Consistency score: 95%+ adherence to system
- Bundle size: <10KB for design system
- Team satisfaction: 8+/10

---
**Start Date:** Can start immediately  
**Completion Date:** TBD  
**Review Required:** Yes - Design review