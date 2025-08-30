# Shard 2: Sidebar.svelte Refactoring
**Parent PRD:** optimization-brownfield-prd.md  
**Timeline:** Week 1, Days 3-5  
**Owner:** Senior Developer  
**Status:** BLOCKED BY SHARD 1  
**Dependencies:** Shard 1 completion recommended  

## Objective
Refactor Sidebar.svelte from 4,165 lines into 5 focused components, each under 500 lines, improving maintainability and enabling parallel development.

## Scope
### In Scope
- Extract ReferenceLibrary component (~400 lines)
- Extract ConfigBrowser component (~400 lines)
- Extract IngredientExplorer component (~450 lines)
- Extract SidebarSearch component (~200 lines)
- Extract SidebarNav component (~150 lines)
- Reduce Sidebar.svelte to container only (~300 lines)

### Out of Scope
- Changing sidebar functionality
- Modifying Firebase integration
- Altering UI design

## Technical Approach

### Component Structure
```
Sidebar.svelte (Container)
├── SidebarNav (Navigation tabs)
├── SidebarSearch (Universal search)
└── Content Area (Dynamic based on tab)
    ├── ReferenceLibrary (References tab)
    ├── ConfigBrowser (Configs tab)
    └── IngredientExplorer (Ingredients tab)
```

### Day 3-4: Core Extraction
```javascript
// New: src/lib/components/sidebar/ReferenceLibrary.svelte
export interface ReferenceLibraryProps {
  references: Reference[]
  selectedRef?: string
  onReferenceSelect: (ref: Reference) => void
  onReferenceCreate: (name: string) => void
  onReferenceDelete: (id: string) => void
}

// New: src/lib/components/sidebar/ConfigBrowser.svelte
export interface ConfigBrowserProps {
  configs: Config[]
  onConfigImport: (config: Config) => void
  onConfigSelect: (config: Config) => void
  onConfigDelete: (id: string) => void
}
```

### Day 5: Search & Navigation
```javascript
// New: src/lib/components/sidebar/SidebarSearch.svelte
export interface SidebarSearchProps {
  searchableItems: SearchableItem[]
  onSearchResults: (results: SearchResult[]) => void
  placeholder?: string
}

// New: src/lib/components/sidebar/SidebarNav.svelte
export interface SidebarNavProps {
  activeTab: 'references' | 'configs' | 'ingredients'
  onTabChange: (tab: string) => void
  collapsed: boolean
  onToggleCollapse: () => void
}
```

## Implementation Steps

### Phase 1: Preparation
1. Map all current sidebar functionality
2. Identify shared state and utilities
3. Create component folders structure
4. Set up feature flag for gradual rollout

### Phase 2: Extraction
1. **ReferenceLibrary** (Day 3 AM)
   - Move reference list logic
   - Extract CRUD operations
   - Implement selection handling

2. **ConfigBrowser** (Day 3 PM)
   - Move config management
   - Extract import logic
   - Handle config selection

3. **IngredientExplorer** (Day 4 AM)
   - Move ingredient tree
   - Extract filtering logic
   - Implement selection

4. **Search & Nav** (Day 4 PM)
   - Create universal search
   - Build navigation component
   - Wire up tab switching

### Phase 3: Integration (Day 5)
1. Connect all components
2. Verify data flow
3. Test all interactions
4. Performance optimization

## Acceptance Criteria
- [ ] Sidebar.svelte <500 lines
- [ ] All sub-components <500 lines
- [ ] Search functionality preserved
- [ ] Firebase sync maintained
- [ ] Navigation state preserved
- [ ] No UI regressions
- [ ] Responsive design intact

## Testing Checklist
- [ ] Reference CRUD operations
- [ ] Config import/export
- [ ] Ingredient selection
- [ ] Search returns correct results
- [ ] Tab navigation works
- [ ] Collapse/expand functions
- [ ] Keyboard navigation
- [ ] Mobile responsiveness

## Risk Mitigation
| Risk | Mitigation |
|------|------------|
| State management complexity | Use Svelte stores for shared state |
| Firebase sync issues | Keep Firebase logic in parent |
| Search performance | Implement debouncing |
| Component communication | Clear event contracts |

## Success Metrics
- Code reduction: 88% (4,165 → ~500 lines)
- Component reusability: High
- Test coverage: >85%
- Search performance: <100ms
- Developer satisfaction: Improved

## Deliverables
1. 5 new sidebar components
2. Refactored Sidebar.svelte
3. Component tests
4. Storybook stories (optional)
5. Documentation

## Technical Notes
- Use consistent naming: `sidebar/ComponentName.svelte`
- Implement proper TypeScript interfaces
- Follow accessibility guidelines
- Maintain keyboard navigation
- Consider future extensibility

## Dependencies
- Shard 1 patterns and utilities
- Firebase service layer
- Search utilities
- UI component library (if created)

---
**Start Date:** After Shard 1  
**Completion Date:** TBD  
**Actual Effort:** TBD  
**Review Required:** Yes - UI/UX team