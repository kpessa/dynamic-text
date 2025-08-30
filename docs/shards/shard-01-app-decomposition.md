# Shard 1: App.svelte Decomposition
**Parent PRD:** optimization-brownfield-prd.md  
**Timeline:** Week 1, Days 1-3  
**Owner:** Lead Developer  
**Status:** READY TO START  
**Dependencies:** None  

## Objective
Decompose App.svelte from 3,556 lines into 5 focused components, each under 500 lines, while maintaining all existing functionality.

## Scope
### In Scope
- Extract SectionManager component (~400 lines)
- Extract PreviewEngine component (~300 lines)  
- Extract TestRunner component (~350 lines)
- Extract FirebaseSync component (~250 lines)
- Extract ImportExportManager component (~300 lines)
- Reduce App.svelte to orchestrator only (~400 lines)

### Out of Scope
- Adding new features
- Changing existing behavior
- Modifying other components

## Technical Approach

### Day 1: SectionManager Extraction
```javascript
// New: src/lib/components/SectionManager.svelte
export interface SectionManagerProps {
  sections: Section[]
  onSectionAdd: (type: 'static' | 'dynamic') => void
  onSectionUpdate: (id: string, content: string) => void
  onSectionDelete: (id: string) => void
  onSectionReorder: (from: number, to: number) => void
}
```

**Migration Steps:**
1. Create component file with interface
2. Move section state management code
3. Move section CRUD methods
4. Implement event dispatchers
5. Update App.svelte imports
6. Test all section operations

### Day 2: PreviewEngine & TestRunner
```javascript
// New: src/lib/components/PreviewEngine.svelte
export interface PreviewEngineProps {
  sections: Section[]
  tpnContext?: TPNContext
  testVariables?: Record<string, any>
}

// Enhanced: src/lib/components/TestRunner.svelte  
export interface TestRunnerProps {
  section: Section
  testCases: TestCase[]
  onTestUpdate: (results: TestResults) => void
}
```

**Migration Steps:**
1. Extract preview generation logic
2. Move dynamic code execution
3. Separate test execution logic
4. Create clean APIs between components
5. Verify preview updates correctly

### Day 3: FirebaseSync & ImportExport
```javascript
// New: src/lib/components/FirebaseSync.svelte
export interface FirebaseSyncProps {
  data: any
  autoSave: boolean
  userId: string
  onSyncStatus: (status: SyncStatus) => void
}

// New: src/lib/components/ImportExportManager.svelte
export interface ImportExportProps {
  sections: Section[]
  onImport: (data: ImportedData) => void
  onExport: (format: ExportFormat) => void
}
```

## Acceptance Criteria
- [ ] App.svelte reduced to <500 lines
- [ ] All extracted components <500 lines each
- [ ] Zero functional regressions
- [ ] All existing tests pass
- [ ] Component boundaries clearly defined
- [ ] Event communication working
- [ ] Performance maintained or improved

## Testing Checklist
- [ ] Section CRUD operations work
- [ ] Preview updates in real-time
- [ ] Test execution functions correctly
- [ ] Firebase save/load works
- [ ] Import/export maintains data integrity
- [ ] No memory leaks introduced
- [ ] Keyboard shortcuts still function

## Rollback Plan
- Git tag before starting: `pre-shard-1`
- Feature flag: `useNewAppArchitecture`
- Keep old code commented for 1 sprint
- Parallel testing in staging

## Success Metrics
- Lines of code: App.svelte <500
- Test coverage: >80% for new components
- Performance: No degradation in Lighthouse scores
- Developer feedback: Positive on maintainability

## Deliverables
1. 5 new component files
2. Refactored App.svelte
3. Updated tests
4. Component documentation
5. Migration guide for team

## Notes
- Use Svelte 5 runes consistently
- Follow existing code style
- Document all props and events
- Consider future extensibility

---
**Start Date:** TBD  
**Completion Date:** TBD  
**Actual Effort:** TBD  
**Status Updates:** Update daily in team standup