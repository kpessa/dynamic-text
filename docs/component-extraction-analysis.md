# App.svelte Component Extraction Analysis

## Current State
- **Total Lines**: 3,556 lines
- **Target**: < 500 lines
- **Reduction Required**: 86%

## Identified Component Boundaries

### 1. SectionManager Component
**Lines to Extract**: ~800-1000 lines
**Responsibilities**:
- Section CRUD operations (addSection, deleteSection, updateSectionContent, handleConvertToDynamic)
- Section ordering/drag-drop (handleSectionDragStart, handleSectionDragOver, handleSectionDrop, handleSectionDragEnd)
- Section state management (sections array, nextSectionId)
- Section validation and change tracking

**State to Move**:
- sections
- nextSectionId
- draggedSection
- editingSection
- originalSections

**Functions to Move**:
- addSection()
- deleteSection()
- updateSectionContent()
- handleConvertToDynamic()
- setSections()
- clearEditor()
- handleSectionDragStart/Over/Drop/End()
- checkForChanges()

### 2. PreviewEngine Component  
**Lines to Extract**: ~600-800 lines
**Responsibilities**:
- Code transpilation (transpileCode)
- Code evaluation (evaluateCode)
- HTML sanitization (sanitizeHTML)
- Mock me object creation (createMockMe)
- Style extraction and application
- Preview rendering logic

**State to Move**:
- previewMode
- previewCollapsed

**Functions to Move**:
- sanitizeHTML()
- createMockMe()
- transpileCode()
- evaluateCode()
- extractStylesFromHTML()
- stripHTML()

### 3. TestRunner Component
**Lines to Extract**: ~400-500 lines (exists partially)
**Responsibilities**:
- Test case management (add, update, delete)
- Test execution (runSingleTest, runSectionTests, runAllTests)
- Test validation logic
- Test results tracking

**State to Move**:
- activeTestCase
- expandedTestCases
- testSummary
- showTestSummary
- currentTestResults

**Functions to Move**:
- addTestCase()
- updateTestCase()
- deleteTestCase()
- setActiveTestCase()
- validateTestOutput()
- validateStyles()
- runSingleTest()
- runSectionTests()
- runAllTests()
- toggleTestCases()

### 4. FirebaseSync Component
**Lines to Extract**: ~300-400 lines
**Responsibilities**:
- Firebase authentication
- Auto-save/load logic
- Reference management
- Population type management
- Sync status tracking

**State to Move**:
- firebaseEnabled
- currentHealthSystem
- currentPopulationType
- showPopulationDropdown
- availablePopulations
- loadingPopulations

**Functions to Move**:
- Firebase initialization effects
- Population type switching logic
- Authentication state management

### 5. ImportExportManager Component
**Lines to Extract**: ~400-500 lines
**Responsibilities**:
- JSON export (sectionsToJSON, sectionsToLineObjects)
- Configurator format export
- Import handling
- Export modal management
- Copy to clipboard

**State to Move**:
- showOutput
- outputMode
- copied
- showExportModal
- pendingReferenceData
- showSelectiveApply

**Functions to Move**:
- sectionsToJSON()
- sectionsToLineObjects()
- copyToClipboard()
- Export formatting logic

### 6. TPNManager Component (optional, not in original spec)
**Lines to Extract**: ~300-400 lines
**Responsibilities**:
- TPN mode management
- TPN instance handling
- Ingredient value management
- Key reference management

**State to Move**:
- tpnMode
- currentTPNInstance
- showKeyReference
- tpnPanelExpanded
- currentIngredientValues

**Functions to Move**:
- handleTPNValuesChange()
- handleKeyInsert()
- handleIngredientChange()
- getIngredientBadgeColor()

## Data Flow Architecture

### Props Interface
```typescript
// SectionManager
interface SectionManagerProps {
  tpnMode: boolean;
  currentTPNInstance: any;
  onSectionsChange: (sections: Section[]) => void;
  onHasUnsavedChanges: (hasChanges: boolean) => void;
}

// PreviewEngine
interface PreviewEngineProps {
  sections: Section[];
  activeTestCase: Record<string, any>;
  tpnMode: boolean;
  currentTPNInstance: any;
  currentIngredientValues: Record<string, any>;
}

// TestRunner
interface TestRunnerProps {
  sections: Section[];
  tpnMode: boolean;
  currentTPNInstance: any;
  onSectionsUpdate: (sections: Section[]) => void;
  onTestComplete: (results: TestResults) => void;
}

// FirebaseSync
interface FirebaseSyncProps {
  sections: Section[];
  currentIngredient: string;
  currentReferenceName: string;
  onLoad: (data: any) => void;
  onSyncStatusChange: (status: SyncStatus) => void;
}

// ImportExportManager
interface ImportExportManagerProps {
  sections: Section[];
  currentIngredient: string;
  currentReferenceName: string;
  onImport: (data: any) => void;
}
```

## Event Communication
- Parent-child via props and event dispatching
- Shared state via stores (if needed)
- Direct function callbacks for simple interactions

## Implementation Order
1. SectionManager (biggest impact on line reduction)
2. PreviewEngine (clear separation of concerns)
3. TestRunner (partially exists, needs consolidation)
4. ImportExportManager (clean extraction)
5. FirebaseSync (complex but isolated)
6. Final App.svelte refactor

## Expected Result
- App.svelte: ~400-500 lines (orchestrator only)
- Each component: 400-800 lines (manageable size)
- Clear separation of concerns
- Improved testability
- Easier maintenance