# Safe Incremental Extraction Plan

## Phase 0: Preparation ✅
- [x] Revert App.svelte to working state
- [x] Save refactored version as reference
- [x] Create test checklist
- [ ] Fix critical TypeScript errors (if blocking)

## Phase 1: Low-Risk Extractions (Utilities & Pure Functions)
These have minimal integration points and are safe to extract first:

### 1.1 Utility Functions
- [x] Extract pure utility functions (no state dependencies)
  - [x] `sanitizeHtml()` - Extracted to htmlUtils.ts
  - [x] `stripHTML()` - Extracted to htmlUtils.ts
  - [x] `extractStylesFromHTML()` - Extracted to htmlUtils.ts
  - [x] `transpileCode()` - Extracted to codeTransformUtils.ts
  - [x] `validateTestOutput()` - Extracted to validationUtils.ts
  - [x] `validateStyles()` - Extracted to validationUtils.ts
  - [x] `getPopulationColor()` - Extracted to populationUtils.ts
  - [x] `getPopulationName()` - Extracted to populationUtils.ts
  - [x] Test each function individually

### 1.2 Constants and Types
- [ ] Move constants to separate files
  - [ ] TPN constants
  - [ ] Default values
  - [ ] Configuration objects
- [ ] Ensure imports work correctly

## Phase 2: Simple Component Extractions (Display Only)
Extract components that only display data (no state mutations):

### 2.1 Display Components
- [x] Extract TPNKeyReference (already exists, just needs integration)
- [x] Extract read-only display components
  - [x] EmptyState component extracted
  - [x] SimplePreviewDisplay component extracted  
- [x] Use props for all data (no direct store access yet)
- [x] Test rendering after each

## Phase 3: State Management Migration
Move state to stores ONE piece at a time:

### 3.1 UI State (Low Risk)
- [x] Move UI flags to uiStateStore
  - [x] `showSidebar`
  - [x] `previewCollapsed`
  - [x] `showKeyReference`
- [x] Test each flag independently

### 3.2 Work Context (Medium Risk)
- [ ] Move work context piece by piece
  - [ ] Current ingredient/reference
  - [ ] Unsaved changes tracking
  - [ ] Validation state
- [ ] Keep App.svelte as coordinator initially

## Phase 4: Complex Component Extractions
Extract components with behavior (higher risk):

### 4.1 Section Management
- [ ] Extract section DISPLAY first (read-only)
- [ ] Add section EDITING capabilities
- [ ] Add drag-and-drop last
- [ ] Test thoroughly at each step

### 4.2 Preview Engine
- [ ] Extract preview rendering logic
- [ ] Keep execution in App.svelte initially
- [ ] Move execution logic after preview works
- [ ] Validate output formats

## Phase 5: Advanced Features
Only after core is stable:

### 5.1 Test Management
- [ ] Extract test case management
- [ ] Extract test execution
- [ ] Extract test result display

### 5.2 Firebase Integration
- [ ] Extract Firebase sync logic
- [ ] Extract import/export handlers
- [ ] Test data persistence

## Rollback Points
Create git commits at these milestones:
- After Phase 1 completion
- After Phase 2 completion
- After each successful store migration
- After each complex component extraction

## Success Metrics
- Zero regressions in core functionality
- All tests in checklist pass
- No performance degradation
- Code is more maintainable
- Clear separation of concerns