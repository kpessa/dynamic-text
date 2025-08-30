# 6. Component Specifications

## Current Component Inventory

### Oversized Components (Need Refactoring)
| Component | Lines | Responsibility | Target |
|-----------|-------|---------------|---------|
| App.svelte | 3,556 | Orchestration, state, UI | <500 |
| Sidebar.svelte | 4,165 | Navigation, references, search | <500 |
| IngredientManager.svelte | 2,354 | CRUD, versioning, UI | <500 |
| IngredientDiffViewer.svelte | 2,285 | Diff logic, display | <500 |

### Well-Sized Components
- CodeEditor.svelte - CodeMirror wrapper
- TPNTestPanel.svelte - TPN value inputs
- TestGeneratorModal.svelte - AI test UI
- ExportModal.svelte - Export functionality
- ValidationStatus.svelte - Validation display

## Component Communication Pattern
```javascript
// Parent-Child via Props
<ChildComponent 
  data={parentData}
  on:event={handleChildEvent}
/>

// Store-based Communication
import { sectionStore } from '$stores/sectionStore.svelte.ts'

// Event Dispatching
const dispatch = createEventDispatcher()
dispatch('save', { data })

// Service Integration
import { firebaseService } from '$lib/services/firebaseService'
await firebaseService.save(data)
```
