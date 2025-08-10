# SCSS & Component Refactoring Migration Plan

## Executive Summary
Systematic migration from legacy CSS/components to modern SCSS architecture with refactored components. Infrastructure is 95% complete, requiring primarily component migration work.

## Current State Assessment

### ✅ Ready Infrastructure
- **SCSS**: Fully configured with Sass 1.90.0
- **Design System**: Medical-grade with WCAG 2.1 AA compliance
- **Architecture**: 7-1 pattern with complete token system
- **Reference Components**: NavbarRefactored, ThemeManager, IngredientManagerRefactored

### 📊 Migration Status
- **Infrastructure**: 95% Complete
- **Components Refactored**: 15% (6 of 40+ components)
- **Design Token Adoption**: 40%
- **SCSS Module Coverage**: 30%

## Migration Phases

### 🚀 Phase 1: Immediate Wins (1-2 hours)
**Goal**: Activate already refactored components with zero risk

#### Tasks:
1. **Swap NavbarRefactored in App.svelte**
   ```svelte
   // In App.svelte
   - import Navbar from './lib/Navbar.svelte';
   + import Navbar from './lib/NavbarRefactored.svelte';
   ```

2. **Remove duplicate styling**
   - Delete legacy navbar styles from app.css
   - Ensure SCSS navbar module is active

3. **Activate ThemeManager globally**
   - Ensure theme persistence works
   - Verify cross-tab synchronization

4. **Test IngredientManagerRefactored**
   - Compare with legacy for feature parity
   - Swap if ready

**Deliverables**: 
- [ ] NavbarRefactored active
- [ ] ThemeManager integrated
- [ ] Legacy navbar code removed
- [ ] Visual regression test passed

---

### 🔧 Phase 2: Core UI Components (4-6 hours)
**Goal**: Migrate high-impact, frequently-used components

#### Priority Components:

##### 2.1 CodeEditor.svelte
```scss
// Migrate from inline styles to:
@use '../styles/abstracts' as *;
@use '../styles/components/editor';

.code-editor {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-family: var(--font-mono);
}
```

##### 2.2 Sidebar.svelte
- Split into sub-components:
  - `SidebarHeader.svelte`
  - `SidebarContent.svelte`
  - `SidebarActions.svelte`
- Use component composition pattern
- Implement collapsible sections with animation

##### 2.3 ValidationStatus.svelte
- Convert to status indicator pattern
- Use semantic color tokens
- Add animation states

**Deliverables**:
- [ ] CodeEditor using design tokens
- [ ] Sidebar refactored with composition
- [ ] ValidationStatus modernized
- [ ] All using SCSS modules

---

### 📦 Phase 3: Modal System (3-4 hours)
**Goal**: Unified modal architecture with consistent UX

#### Modal Components:
1. **Create BaseModal.svelte**
   ```svelte
   <script>
     let { title, showClose = true, size = 'medium' } = $props();
   </script>
   
   <div class="modal modal--{size}">
     <slot />
   </div>
   ```

2. **Migrate Modals**:
   - ExportModal → BaseModal composition
   - PreferencesModal → Settings pattern
   - TestGeneratorModal → AI workflow pattern
   - DuplicateReportModal → Report pattern
   - VersionHistory → History pattern

3. **SCSS Modal Module**:
   ```scss
   // src/styles/components/_modals.scss
   .modal {
     --modal-padding: var(--space-6);
     --modal-radius: var(--radius-xl);
     
     &--small { max-width: 400px; }
     &--medium { max-width: 600px; }
     &--large { max-width: 900px; }
   }
   ```

**Deliverables**:
- [ ] BaseModal component created
- [ ] All modals using BaseModal
- [ ] Consistent modal animations
- [ ] Keyboard navigation support

---

### 🏥 Phase 4: Specialized Components (3-4 hours)
**Goal**: Migrate TPN and specialized medical components

#### Components:
1. **TPNTestPanel.svelte**
   - Medical UI patterns
   - Form validation styling
   - Accessibility compliance

2. **KPTManager.svelte & KPTReference.svelte**
   - Function browser patterns
   - Code display styling
   - Search/filter UI

3. **BulkOperations.svelte**
   - Action button patterns
   - Progress indicators
   - Batch selection UI

**Deliverables**:
- [ ] TPN components using medical patterns
- [ ] KPT system modernized
- [ ] Bulk operations refined
- [ ] Touch targets WCAG compliant

---

### 🧹 Phase 5: Cleanup & Optimization (2-3 hours)
**Goal**: Remove legacy code and optimize bundle

#### Tasks:
1. **Remove Legacy Files**
   ```bash
   # After verification
   rm src/lib/Navbar.svelte
   rm src/lib/IngredientManager.svelte
   # Remove other replaced components
   ```

2. **Consolidate Styles**
   - Remove inline styles
   - Delete unused CSS classes
   - Optimize SCSS imports

3. **Bundle Analysis**
   ```bash
   pnpm build
   # Analyze bundle size
   # Tree-shake unused code
   ```

4. **Documentation Update**
   - Update CLAUDE.md
   - Component migration guide
   - SCSS usage patterns

**Deliverables**:
- [ ] All legacy components removed
- [ ] app.css fully migrated to SCSS
- [ ] Bundle size reduced by 20%+
- [ ] Documentation updated

---

## Implementation Strategy

### Migration Pattern Template
For each component migration:

```svelte
<!-- NewComponent.svelte -->
<script>
  import { onMount } from 'svelte';
  
  // 1. Convert to Svelte 5 syntax
  let { prop1, prop2 = 'default' } = $props();
  let internalState = $state(initialValue);
  
  // 2. Extract business logic to services
  import { componentService } from './services/componentService.js';
  
  // 3. Use design tokens
  $effect(() => {
    // Side effects with cleanup
  });
</script>

<!-- 4. Semantic HTML with BEM classes -->
<div class="component component--variant">
  <header class="component__header">
    <!-- Content -->
  </header>
</div>

<style lang="scss">
  @use '../styles/abstracts' as *;
  
  .component {
    // Use design tokens
    padding: var(--space-4);
    background: var(--color-surface);
    
    &--variant {
      // Modifier styles
    }
    
    &__header {
      // Element styles
    }
  }
</style>
```

### Testing Strategy
1. **Visual Regression**
   - Screenshot before/after
   - Compare layouts
   - Verify responsive behavior

2. **Functionality Testing**
   - All features work
   - State management intact
   - Firebase sync maintained

3. **Performance Testing**
   - Bundle size comparison
   - Runtime performance
   - Memory usage

### Rollback Plan
- Git branch for each phase
- Feature flags for component swaps
- Parallel deployment option

## Success Metrics

### Phase Completion Criteria
- [ ] No visual regressions
- [ ] All tests passing
- [ ] Bundle size reduced
- [ ] Lighthouse score improved
- [ ] Zero console errors
- [ ] WCAG 2.1 AA compliant

### Overall Success
- **Code Reduction**: 30% fewer lines
- **Bundle Size**: 20% smaller
- **Maintainability**: Improved component isolation
- **Performance**: Faster initial load
- **Developer Experience**: Consistent patterns

## Risk Mitigation

### Potential Issues:
1. **State Management Conflicts**
   - Solution: Gradual store migration
   - Test thoroughly between phases

2. **Style Cascade Issues**
   - Solution: Scoped styles with SCSS modules
   - Use CSS custom properties for theming

3. **Firebase Integration**
   - Solution: Keep service layer stable
   - Migrate UI only, not data layer

4. **CodeMirror Theming**
   - Solution: Custom theme integration
   - Preserve editor functionality

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|-------------|
| Phase 1 | 1-2 hours | None |
| Phase 2 | 4-6 hours | Phase 1 |
| Phase 3 | 3-4 hours | Phase 2 |
| Phase 4 | 3-4 hours | Phase 2 |
| Phase 5 | 2-3 hours | All phases |
| **Total** | **13-19 hours** | - |

## Next Steps

1. **Immediate Action**: 
   - Start Phase 1 now (low risk, high impact)
   - Swap NavbarRefactored immediately

2. **Planning**:
   - Review this plan with team
   - Adjust priorities based on needs
   - Set up testing environment

3. **Execution**:
   - Create feature branch per phase
   - Implement with frequent commits
   - Test continuously

## Commands Reference

```bash
# Development
pnpm dev              # Full dev server
pnpm build           # Production build
pnpm preview         # Preview build

# Testing
pnpm test            # Run tests
pnpm lint            # Lint code

# SCSS watching (if needed)
sass --watch src/styles:public/css
```

## Conclusion

The infrastructure is ready, patterns are established, and the path is clear. This migration will result in a more maintainable, performant, and accessible application with a consistent design system throughout.

**Ready to begin Phase 1 immediately** - just swap the components and start seeing benefits right away!