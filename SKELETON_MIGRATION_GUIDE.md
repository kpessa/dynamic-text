# Skeleton UI Migration Guide

## Overview
This guide shows how to integrate the new Skeleton UI components into your application.

## Components Created

### 1. NavbarActions.svelte
- **Location**: `/src/lib/NavbarActions.svelte`
- **Status**: ✅ Updated with Skeleton UI
- **Changes**: Uses Skeleton button variants, Tailwind utilities for responsive design

### 2. SidebarSkeleton.svelte
- **Location**: `/src/lib/SidebarSkeleton.svelte`
- **Status**: ✅ New component with Skeleton UI
- **Features**: Accordion, badges, cards, form controls

### 3. IngredientManagerSkeleton.svelte
- **Location**: `/src/lib/IngredientManagerSkeleton.svelte`
- **Status**: ✅ New component with Skeleton UI
- **Features**: Grid layout, cards, badges, progress bars, slide toggles

### 4. ExportModalSkeleton.svelte
- **Location**: `/src/lib/ExportModalSkeleton.svelte`
- **Status**: ✅ New component with Skeleton UI
- **Features**: Modal system, radio groups, slide toggles

### 5. PreferencesModalSkeleton.svelte
- **Location**: `/src/lib/PreferencesModalSkeleton.svelte`
- **Status**: ✅ New component with Skeleton UI
- **Features**: LightSwitch, slide toggles, keyboard shortcuts table

### 6. TestGeneratorModalSkeleton.svelte
- **Location**: `/src/lib/TestGeneratorModalSkeleton.svelte`
- **Status**: ✅ New component with Skeleton UI
- **Features**: Tab groups, checkboxes, badges, responsive grid

### 7. DuplicateReportModalSkeleton.svelte
- **Location**: `/src/lib/DuplicateReportModalSkeleton.svelte`
- **Status**: ✅ New component with Skeleton UI
- **Features**: Accordion, statistics cards, badges

## Integration Steps

### Step 1: Update App.svelte Imports

Replace old imports with new Skeleton components:

```svelte
<script>
  // Old imports
  // import NavbarActions from './lib/NavbarActions.svelte';
  // import Sidebar from './lib/Sidebar.svelte';
  // import IngredientManager from './lib/IngredientManager.svelte';
  
  // New imports
  import NavbarActions from './lib/NavbarActions.svelte'; // Already updated
  import SidebarSkeleton from './lib/SidebarSkeleton.svelte';
  import IngredientManagerSkeleton from './lib/IngredientManagerSkeleton.svelte';
  import ExportModalSkeleton from './lib/ExportModalSkeleton.svelte';
  import PreferencesModalSkeleton from './lib/PreferencesModalSkeleton.svelte';
  import TestGeneratorModalSkeleton from './lib/TestGeneratorModalSkeleton.svelte';
  import DuplicateReportModalSkeleton from './lib/DuplicateReportModalSkeleton.svelte';
  
  // Initialize Skeleton stores
  import { initializeStores, Modal, Toast, Drawer } from '@skeletonlabs/skeleton';
  import SkeletonProvider from './lib/SkeletonProvider.svelte';
  
  // Initialize stores at app start
  initializeStores();
</script>
```

### Step 2: Wrap App with Provider

```svelte
<SkeletonProvider>
  <!-- Your app content -->
  <div class="app">
    <!-- Components here -->
  </div>
  
  <!-- Skeleton UI components -->
  <Modal />
  <Toast />
  <Drawer />
</SkeletonProvider>
```

### Step 3: Update Component Usage

#### NavbarActions (Already Updated)
No changes needed - component already uses Skeleton UI internally.

#### Sidebar
Replace:
```svelte
<Sidebar 
  {onLoadReference}
  {onSaveReference}
  {currentSections}
/>
```

With:
```svelte
<SidebarSkeleton 
  {onLoadReference}
  {onSaveReference}
  {currentSections}
/>
```

#### IngredientManager
Replace:
```svelte
<IngredientManager 
  {onSelectIngredient}
  bind:currentIngredient
/>
```

With:
```svelte
<IngredientManagerSkeleton 
  {onSelectIngredient}
  bind:currentIngredient
/>
```

### Step 4: Update Modal Usage

#### Export Modal
Old way:
```svelte
{#if showExportModal}
  <ExportModal 
    bind:isOpen={showExportModal}
    {sections}
  />
{/if}
```

New way (using modal store):
```svelte
<script>
  import { getModalStore } from '@skeletonlabs/skeleton';
  const modalStore = getModalStore();
  
  function openExportModal() {
    modalStore.trigger({
      type: 'component',
      component: 'exportModal',
      meta: { sections, currentIngredient }
    });
  }
</script>
```

### Step 5: Register Modal Components

In your app initialization:

```javascript
// modalRegistry.js
import ExportModalSkeleton from './lib/ExportModalSkeleton.svelte';
import PreferencesModalSkeleton from './lib/PreferencesModalSkeleton.svelte';
import TestGeneratorModalSkeleton from './lib/TestGeneratorModalSkeleton.svelte';
import DuplicateReportModalSkeleton from './lib/DuplicateReportModalSkeleton.svelte';

export const modalRegistry = {
  exportModal: { ref: ExportModalSkeleton },
  preferencesModal: { ref: PreferencesModalSkeleton },
  testGeneratorModal: { ref: TestGeneratorModalSkeleton },
  duplicateReportModal: { ref: DuplicateReportModalSkeleton }
};
```

### Step 6: Update Styles

Remove old custom CSS and use Tailwind/Skeleton classes:

```svelte
<!-- Old -->
<button class="custom-btn primary">Save</button>

<!-- New -->
<button class="btn variant-filled-primary">Save</button>
```

### Step 7: Dark Mode

Skeleton handles dark mode automatically. Just use the LightSwitch component:

```svelte
<script>
  import { LightSwitch } from '@skeletonlabs/skeleton';
</script>

<LightSwitch />
```

## Common Skeleton UI Classes

### Buttons
- `btn` - Base button class
- `variant-filled-primary` - Primary filled button
- `variant-soft-secondary` - Soft secondary button  
- `variant-ghost-tertiary` - Ghost tertiary button
- `variant-filled-success` - Success button
- `variant-filled-warning` - Warning button
- `variant-filled-error` - Error button

### Cards
- `card` - Base card class
- `variant-ghost-surface` - Ghost surface card
- `variant-soft-primary` - Soft primary card
- `p-4` - Padding 4 units

### Forms
- `input` - Base input class
- `select` - Base select class
- `textarea` - Base textarea class
- `checkbox` - Checkbox class
- `radio` - Radio class
- `variant-form-material` - Material design form variant

### Layout
- `flex` - Flexbox
- `grid` - Grid
- `gap-4` - Gap 4 units
- `space-y-4` - Vertical spacing
- `hidden sm:inline` - Responsive visibility

### Typography
- `h1` through `h6` - Heading classes
- `text-sm` - Small text
- `font-bold` - Bold text
- `text-surface-600-300-token` - Surface color with dark mode support

## Benefits of Migration

1. **Consistent Design System** - All components use the same design language
2. **Dark Mode Support** - Automatic dark/light theme switching
3. **Better Accessibility** - Built-in ARIA attributes and keyboard navigation
4. **Reduced Bundle Size** - Remove custom CSS, use utility classes
5. **Faster Development** - Pre-built components and variants
6. **Medical Theme Ready** - Semantic color system for healthcare context

## Testing Checklist

- [ ] All buttons work correctly
- [ ] Modals open and close properly
- [ ] Forms validate and submit
- [ ] Dark mode toggles correctly
- [ ] Responsive design works on mobile
- [ ] Keyboard navigation functions
- [ ] Screen readers work properly
- [ ] No console errors
- [ ] Performance is maintained or improved

## Rollback Plan

If issues arise, the original components are still available:
- Original files remain unchanged
- New components have "Skeleton" suffix
- Can switch back by changing imports

## Next Steps

1. Test new components in development
2. Get user feedback on new UI
3. Remove old components once stable
4. Update remaining components
5. Remove unused CSS
6. Optimize bundle size