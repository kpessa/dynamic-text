# Component Refactoring & UI Enhancement Plan
Generated: 2025-01-30
Branch: recovery/stable-baseline

## 🎯 Goals
1. Break all components down to <500 lines
2. Improve code maintainability
3. Enhance UI/UX consistency
4. Add proper testing coverage

## 📊 Current State Analysis

### Oversized Components
| Component | Current Lines | Target | Priority |
|-----------|--------------|--------|----------|
| Sidebar.svelte | 4,165 | <500 | P0 |
| App.svelte | 3,556 | <500 | P0 |
| IngredientManager.svelte | 2,354 | <500 | P1 |
| IngredientDiffViewer.svelte | 2,285 | <500 | P1 |
| AIWorkflowInspector.svelte | 1,408 | <500 | P2 |

## 🔨 Phase 1: App.svelte Decomposition (Week 1)

### Current Responsibilities (Too Many!)
- Section management
- Firebase operations
- Test execution
- Preview generation
- Import/export
- UI state management
- Event handling
- Modal coordination

### Refactoring Strategy
```
App.svelte (3,556 lines)
├── SectionManager.svelte (~400 lines)
│   ├── Section CRUD operations
│   ├── Reordering logic
│   └── Section state management
├── PreviewEngine.svelte (~300 lines)
│   ├── Preview generation
│   ├── Dynamic execution
│   └── Error handling
├── TestRunner.svelte (~350 lines)
│   ├── Test execution
│   ├── Variable substitution
│   └── Results management
├── FirebaseSync.svelte (~250 lines)
│   ├── Save/load operations
│   ├── Auto-save logic
│   └── Sync status
├── ImportExportManager.svelte (~300 lines)
│   ├── Import logic
│   ├── Export formatting
│   └── Clipboard operations
└── App.svelte (~400 lines) [Orchestrator only]
    ├── Component coordination
    ├── Global state
    └── Layout structure
```

### Implementation Steps
1. **Create SectionManager** (Day 1-2)
   ```bash
   # Create new component
   touch src/lib/components/SectionManager.svelte
   # Move section-related code
   # Add props interface
   # Test in isolation
   ```

2. **Extract PreviewEngine** (Day 2-3)
   ```bash
   touch src/lib/components/PreviewEngine.svelte
   # Move preview logic
   # Create clear API
   # Test with various content types
   ```

3. **Separate TestRunner** (Day 3-4)
   ```bash
   touch src/lib/components/TestRunner.svelte
   # Already exists, needs enhancement
   # Move test execution logic
   # Add proper event emitters
   ```

4. **Create FirebaseSync** (Day 4-5)
   ```bash
   touch src/lib/components/FirebaseSync.svelte
   # Extract Firebase operations
   # Add retry logic
   # Implement status indicators
   ```

5. **Test & Integrate** (Day 5)
   - Wire up all components
   - Test data flow
   - Verify no regressions

## 🔨 Phase 2: Sidebar.svelte Breakdown (Week 2)

### Current Responsibilities
- Reference text management
- Config management
- Ingredient browsing
- Search functionality
- Import/export UI
- Navigation

### Refactoring Strategy
```
Sidebar.svelte (4,165 lines)
├── ReferenceLibrary.svelte (~400 lines)
│   ├── Reference list
│   ├── CRUD operations
│   └── Selection handling
├── ConfigBrowser.svelte (~400 lines)
│   ├── Config list
│   ├── Import UI
│   └── Config selection
├── IngredientExplorer.svelte (~450 lines)
│   ├── Ingredient tree
│   ├── Search/filter
│   └── Selection
├── SidebarSearch.svelte (~200 lines)
│   ├── Search input
│   ├── Filter logic
│   └── Results display
├── SidebarNav.svelte (~150 lines)
│   ├── Tab navigation
│   ├── Section switching
│   └── Collapse/expand
└── Sidebar.svelte (~300 lines) [Container only]
    ├── Layout
    ├── State coordination
    └── Event handling
```

## 🎨 Phase 3: UI/Styling Improvements (Week 3)

### Design System Creation
```scss
// src/styles/tokens.scss
:root {
  // Colors
  --color-primary: #3b82f6;
  --color-secondary: #8b5cf6;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  
  // Spacing
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  // Typography
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 24px;
  
  // Borders
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  
  // Shadows
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
}
```

### Component Library
1. **Button Component**
   ```svelte
   <!-- src/lib/ui/Button.svelte -->
   <script>
     export let variant = 'primary'; // primary, secondary, danger
     export let size = 'md'; // sm, md, lg
     export let loading = false;
   </script>
   ```

2. **Card Component**
   ```svelte
   <!-- src/lib/ui/Card.svelte -->
   <script>
     export let title = '';
     export let actions = [];
   </script>
   ```

3. **Modal Component**
   ```svelte
   <!-- src/lib/ui/Modal.svelte -->
   <script>
     export let open = false;
     export let title = '';
   </script>
   ```

### UI Improvements Priority List
1. **Consistent Spacing** (Day 1)
   - Apply spacing tokens everywhere
   - Fix inconsistent margins/padding
   - Standardize component gaps

2. **Button Styling** (Day 2)
   - Create button variants
   - Add hover/active states
   - Implement loading states

3. **Form Controls** (Day 3)
   - Style inputs consistently
   - Add validation states
   - Improve focus indicators

4. **Loading States** (Day 4)
   - Add skeletons for lists
   - Implement spinners
   - Show progress indicators

5. **Error Handling** (Day 5)
   - Design error messages
   - Add toast notifications
   - Implement error boundaries

## 📈 Phase 4: Testing Infrastructure (Week 4)

### Test Coverage Goals
- Unit tests: 80% coverage
- Integration tests: Key workflows
- E2E tests: Critical paths

### Testing Strategy
```javascript
// Example test structure
describe('SectionManager', () => {
  test('adds new section', () => {});
  test('removes section', () => {});
  test('reorders sections', () => {});
  test('updates section content', () => {});
});
```

## 🚀 Implementation Checklist

### Week 1: App.svelte Refactoring
- [ ] Set up component structure
- [ ] Extract SectionManager
- [ ] Extract PreviewEngine
- [ ] Extract TestRunner
- [ ] Extract FirebaseSync
- [ ] Integration testing
- [ ] Documentation

### Week 2: Sidebar.svelte Refactoring
- [ ] Create sub-components
- [ ] Extract ReferenceLibrary
- [ ] Extract ConfigBrowser
- [ ] Extract IngredientExplorer
- [ ] Add search component
- [ ] Test integrations

### Week 3: UI/Styling
- [ ] Create design tokens
- [ ] Build component library
- [ ] Apply consistent spacing
- [ ] Improve buttons
- [ ] Style forms
- [ ] Add loading states
- [ ] Enhance error handling

### Week 4: Testing & Polish
- [ ] Write unit tests
- [ ] Add integration tests
- [ ] Update E2E tests
- [ ] Performance optimization
- [ ] Documentation update
- [ ] Final review

## 📋 Git Workflow

```bash
# For each refactoring
git checkout -b refactor/component-name
# Make changes incrementally
git add -p  # Stage selectively
git commit -m "refactor: extract XYZ from Component"
# Test thoroughly
pnpm test
# Create PR for review
```

## 🎯 Success Metrics
- All components <500 lines ✅
- Test coverage >80% ✅
- Build time <30s ✅
- No regressions ✅
- Improved developer experience ✅

## 💡 Tips for Success
1. **Incremental Changes**: Small, testable commits
2. **Maintain Functionality**: Don't break working features
3. **Test Continuously**: Run tests after each change
4. **Document As You Go**: Update docs with changes
5. **Get Feedback Early**: Share progress regularly

---

This plan provides a clear path to clean, maintainable code. Start with App.svelte (highest impact), then tackle Sidebar, followed by UI improvements. Each phase is independent enough to provide value even if you need to pause.