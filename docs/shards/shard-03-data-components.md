# Shard 3: Data Component Optimization
**Parent PRD:** optimization-brownfield-prd.md  
**Timeline:** Week 2, Days 1-3  
**Owner:** Developer 2  
**Status:** BLOCKED BY SHARDS 1-2  
**Dependencies:** Shards 1-2 recommended  

## Objective
Refactor IngredientManager (2,354 lines) and IngredientDiffViewer (2,285 lines) into modular, maintainable components under 500 lines each.

## Scope
### In Scope
- Split IngredientManager into focused modules
- Modularize IngredientDiffViewer
- Extract shared utilities
- Improve Firebase integration patterns
- Add comprehensive error handling

### Out of Scope
- Changing data structures
- Modifying Firebase schema
- Altering business logic

## Technical Approach

### IngredientManager Decomposition
```
IngredientManager.svelte (2,354 lines)
├── IngredientCRUD.svelte (~400 lines)
│   ├── Create/Update/Delete operations
│   ├── Firebase sync
│   └── Validation logic
├── IngredientList.svelte (~350 lines)
│   ├── Display logic
│   ├── Sorting/filtering
│   └── Selection handling
├── IngredientVersioning.svelte (~400 lines)
│   ├── Version tracking
│   ├── History management
│   └── Rollback functionality
├── IngredientSearch.svelte (~200 lines)
│   ├── Search interface
│   ├── Filter logic
│   └── Results display
└── IngredientManager.svelte (~400 lines)
    ├── Component orchestration
    ├── State management
    └── Event coordination
```

### IngredientDiffViewer Decomposition
```
IngredientDiffViewer.svelte (2,285 lines)
├── DiffEngine.ts (~300 lines)
│   ├── Diff algorithm
│   ├── Change detection
│   └── Merge logic
├── DiffDisplay.svelte (~400 lines)
│   ├── Side-by-side view
│   ├── Inline diff view
│   └── Change highlighting
├── DiffControls.svelte (~200 lines)
│   ├── View options
│   ├── Navigation
│   └── Actions
└── IngredientDiffViewer.svelte (~300 lines)
    ├── Component coordination
    └── State management
```

## Implementation Steps

### Day 1: IngredientManager CRUD & List
1. Extract CRUD operations to separate component
2. Move list display logic
3. Implement clean interfaces
4. Test Firebase operations

### Day 2: IngredientManager Versioning & Search
1. Extract version management
2. Create search component
3. Wire up event communication
4. Verify functionality

### Day 3: IngredientDiffViewer
1. Extract diff algorithm to utility
2. Create display components
3. Add control interface
4. Integration testing

## Acceptance Criteria
- [ ] IngredientManager <500 lines
- [ ] IngredientDiffViewer <500 lines
- [ ] All sub-components <500 lines
- [ ] Firebase sync maintained
- [ ] Version history working
- [ ] Diff functionality preserved
- [ ] Performance maintained

## Testing Requirements
- Unit tests for diff algorithm
- Integration tests for Firebase
- Component tests for UI
- E2E tests for workflows
- Performance benchmarks

## Risk Mitigation
- Keep Firebase logic centralized
- Maintain backward compatibility
- Use feature flags for rollout
- Create comprehensive tests first

## Deliverables
1. Refactored components
2. Extracted utilities
3. Test suite
4. Documentation
5. Migration guide

---
**Start Date:** After Shards 1-2  
**Completion Date:** TBD  
**Review Required:** Yes