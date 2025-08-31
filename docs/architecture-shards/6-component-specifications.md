# 6. Component Specifications

## Core Development Standards

### TypeScript First
- **ALWAYS use TypeScript over JavaScript** - Only use .js when absolutely necessary
- All new files must be `.ts` or `.svelte` with TypeScript
- Migrate existing JavaScript files to TypeScript when modifying

### Svelte 5 Store Conventions
- **Store files MUST use `.svelte.ts` extension** to enable Svelte 5 runes
- Use `$state`, `$derived`, and `$effect` runes for reactive state
- Example: `sectionStore.svelte.ts`, `workspaceStore.svelte.ts`

### Component Size Management
- **Target: <500 lines per component**
- Components exceeding 500 lines MUST be refactored
- Break large components into smaller, focused units
- Extract business logic into services
- Extract repeated UI patterns into sub-components

### Clean Codebase Principles
- **ZERO TOLERANCE for regressions** - Never break existing functionality
- **Eliminate ALL code duplication** - Extract shared logic immediately
- **Remove ambiguity** - Code intent must be crystal clear
- When finding duplicated/confused code:
  1. Stop current work
  2. Refactor to eliminate duplication
  3. Ensure no behavioral changes
  4. Continue with original task

### Refactoring Rules
1. **Test coverage required** before refactoring
2. **Incremental changes** - Small, verifiable steps
3. **Maintain functionality** - No behavior changes
4. **Document decisions** - Comment why, not what

## Testing & Debugging with Playwright MCP

### Browser Automation Available
- **Playwright MCP server** integrated for real-time debugging
- Access DOM elements via `mcp__playwright__browser_snapshot`
- Monitor console output with `mcp__playwright__browser_console_messages`
- Take screenshots with `mcp__playwright__browser_take_screenshot`
- Navigate and interact with `mcp__playwright__browser_*` commands

### Debugging Workflow
1. Launch browser with `mcp__playwright__browser_navigate`
2. Capture state with snapshots and screenshots
3. Inspect console for errors/warnings
4. Validate UI interactions and flows
5. Document visual regressions with screenshots

## UI/UX Quality Standards

### Design Principles
- **Clean** - Minimal clutter, clear visual hierarchy, thoughtful whitespace
- **Modern** - Contemporary design patterns, smooth animations, responsive
- **Intuitive** - Self-explanatory UI, consistent interactions, clear feedback

### Visual Quality Checks
- Take screenshots at key breakpoints (mobile/tablet/desktop)
- Verify consistent spacing and alignment
- Ensure readable typography and contrast
- Validate interactive states (hover/focus/active)
- Check loading states and error handling

### User Experience Requirements
- **Response time** - Interactions < 100ms feedback
- **Accessibility** - Keyboard navigation, ARIA labels, focus management
- **Error recovery** - Clear error messages, graceful degradation
- **Visual consistency** - Unified color scheme, consistent components
- **Mobile-first** - Touch-friendly targets, responsive layouts

### Screenshot Documentation
- Capture before/after for UI changes
- Document user flows with screenshot sequences
- Save error states for debugging
- Archive UI evolution for design reviews

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
