# Versioning & Ingredient Management Roadmap

## Overview
This roadmap breaks down the versioning and ingredient management system into manageable stories. Each phase builds on the previous one, but many can be implemented independently.

**Complexity Legend:**
- 🟢 Easy (1-2 hours)
- 🟡 Medium (2-4 hours)  
- 🔴 Hard (4+ hours)

**Status Legend:**
- ✅ Complete
- 🚧 In Progress
- ⏳ Planned
- 🔮 Future/Optional

---

## Phase 0: Quick Fixes & Improvements
*Immediate issues that improve current functionality*

### P0.1: Fix Config Ingredient Clicking
- ✅ **Status**: Complete
- 🟢 **Complexity**: Easy
- **Story**: When clicking ingredients in config sidebar, check both `notes` and `NOTE` fields
- **Acceptance**: Config ingredients are clickable and load content

### P0.2: Improve Import Feedback
- ✅ **Status**: Complete
- 🟢 **Complexity**: Easy
- **Story**: Show better feedback during config import (progress, success, errors)
- **Acceptance**: User sees clear import status and results
- **Completed**: Added progress bar, status messages, and import summary

### P0.3: Basic Ingredient Search
- ✅ **Status**: Complete
- 🟢 **Complexity**: Easy
- **Story**: Add search/filter to ingredient lists
- **Acceptance**: Can search ingredients by name across configs
- **Completed**: Added search for both Firebase ingredients and config ingredients in sidebar

---

## Phase 1: Basic Versioning Foundation
*Minimal viable versioning - just track changes*

### P1.1: Add Version Tracking to Ingredients
- ✅ **Status**: Complete
- 🟡 **Complexity**: Medium
- **Story**: Add version number and modified timestamp to ingredient saves
- **Tasks**:
  - [x] Add `version`, `lastModified`, `modifiedBy` fields
  - [x] Increment version on save
  - [x] Show version in UI
- **Acceptance**: Each save creates a new version number
- **Completed**: Version tracking added to ingredients and references, displays version badge

### P1.2: Simple History List
- ✅ **Status**: Complete
- 🟢 **Complexity**: Easy
- **Story**: Show list of versions for an ingredient
- **Tasks**:
  - [x] Create versions subcollection
  - [x] Store snapshot on each save
  - [x] Basic version list UI
- **Acceptance**: Can see version history with timestamps
- **Completed**: VersionHistory component with clickable version badges

### P1.3: Basic Diff View
- ✅ **Status**: Complete
- 🟡 **Complexity**: Medium
- **Story**: Compare current version with previous
- **Tasks**:
  - [x] Implement diff algorithm
  - [x] Create diff viewer component
  - [x] Highlight changes
- **Acceptance**: Can see what changed between versions
- **Completed**: Compare view in VersionHistory component shows side-by-side differences

### P1.4: Revert to Previous Version
- ✅ **Status**: Complete
- 🟢 **Complexity**: Easy
- **Story**: Restore a previous version
- **Tasks**:
  - [x] Add revert button to history
  - [x] Copy old version to current
  - [x] Create new version entry
- **Acceptance**: Can rollback to any previous version
- **Completed**: Restore functionality in VersionHistory component with confirmation

---

## Phase 2: Two-Layer Architecture
*Separate imported (baseline) from working (editable) copies*

### P2.1: Preserve Original Imports
- ✅ **Status**: Complete
- 🟡 **Complexity**: Medium
- **Story**: Keep imported configs immutable as baseline
- **Tasks**:
  - [x] Store imports in separate collection (baselineConfigs)
  - [x] Never modify after import
  - [x] Link working copies to baselines
- **Acceptance**: Original imports remain unchanged
- **Completed**: Created baselineConfigs collection, stores original data immutably

### P2.2: Create Working Copy Layer
- ✅ **Status**: Complete (Partially)
- 🔴 **Complexity**: Hard
- **Story**: Separate editable working copies from baselines
- **Tasks**:
  - [ ] Create workingIngredients collection (deferred - using references)
  - [x] Convert NOTE to sections on import
  - [x] Link working to baseline
  - [x] Update UI to use working copies
- **Acceptance**: Edits happen in working layer only
- **Completed**: Using references as working copies, sections conversion working

### P2.3: Status Tracking (Modified/Clean)
- ✅ **Status**: Complete
- 🟡 **Complexity**: Medium
- **Story**: Track which ingredients are modified from baseline
- **Tasks**:
  - [x] Compare working with baseline
  - [x] Add status field (CLEAN/MODIFIED)
  - [x] Show status badges in UI
- **Acceptance**: Can see which ingredients have changes
- **Completed**: Status indicators and comparison logic implemented

### P2.4: Diff Against Baseline
- ✅ **Status**: Complete
- 🟡 **Complexity**: Medium
- **Story**: Compare working version with original import
- **Tasks**:
  - [x] Add "Compare with Import" button
  - [x] Show baseline vs working diff
  - [x] Handle NOTE vs sections format
- **Acceptance**: Can see changes from original import
- **Completed**: Modal diff viewer with side-by-side comparison

### P2.5: Revert to Baseline
- ✅ **Status**: Complete
- 🟢 **Complexity**: Easy
- **Story**: Reset working copy to match baseline
- **Tasks**:
  - [x] Add revert button
  - [x] Copy baseline to working
  - [x] Clear modified status
- **Acceptance**: Can discard changes and restore original
- **Completed**: Revert functionality with confirmation dialog

---

## Phase 3: Deduplication & Sharing
*Intelligently share identical ingredients*

### P3.1: Content Hashing
- ⏳ **Status**: Planned
- 🟡 **Complexity**: Medium
- **Story**: Generate fingerprints of ingredient content
- **Tasks**:
  - [ ] Implement hash function for NOTE arrays
  - [ ] Store hashes with ingredients
  - [ ] Update hash on changes
- **Acceptance**: Each ingredient has content hash

### P3.2: Duplicate Detection on Import
- ⏳ **Status**: Planned
- 🟡 **Complexity**: Medium
- **Story**: Identify identical ingredients during import
- **Tasks**:
  - [ ] Compare hashes during import
  - [ ] Show duplicate report
  - [ ] Highlight sharing opportunities
- **Acceptance**: Import shows which ingredients match existing

### P3.3: Manual Share/Link Ingredients
- ⏳ **Status**: Planned
- 🔴 **Complexity**: Hard
- **Story**: Manually link identical ingredients across configs
- **Tasks**:
  - [ ] Add "Share" button to ingredients
  - [ ] Update multiple configs to point to shared
  - [ ] Track which configs share ingredient
  - [ ] Show shared badge
- **Acceptance**: Can consolidate duplicates into shared

### P3.4: Edit Shared Ingredient Warning
- ⏳ **Status**: Planned
- 🟢 **Complexity**: Easy
- **Story**: Warn when editing affects multiple configs
- **Tasks**:
  - [ ] Check if ingredient is shared
  - [ ] Show warning with affected configs
  - [ ] Offer to create independent copy
- **Acceptance**: User knows impact before editing

### P3.5: Unshare/Make Independent
- ⏳ **Status**: Planned
- 🟡 **Complexity**: Medium
- **Story**: Break shared ingredient into independent copy
- **Tasks**:
  - [ ] Create copy for specific config
  - [ ] Update config to use copy
  - [ ] Remove from shared list
- **Acceptance**: Can diverge from shared version

### P3.6: Auto-deduplication Option
- 🔮 **Status**: Future
- 🔴 **Complexity**: Hard
- **Story**: Automatically share identical ingredients on import
- **Tasks**:
  - [ ] Add auto-dedupe setting
  - [ ] Implement automatic linking
  - [ ] Show what was auto-linked
  - [ ] Allow undo
- **Acceptance**: Import automatically consolidates duplicates

---

## Phase 4: Advanced Features
*Git-like operations and advanced workflows*

### P4.1: Commit Messages
- 🔮 **Status**: Future
- 🟢 **Complexity**: Easy
- **Story**: Add commit message when saving
- **Tasks**:
  - [ ] Add message field to save dialog
  - [ ] Store with version
  - [ ] Show in history
- **Acceptance**: Each version has descriptive message

### P4.2: Variation Detection
- 🔮 **Status**: Future
- 🔴 **Complexity**: Hard
- **Story**: Detect similar but not identical ingredients
- **Tasks**:
  - [ ] Implement similarity algorithm
  - [ ] Show variations of ingredient
  - [ ] Suggest merge opportunities
- **Acceptance**: Can find and manage variations

### P4.3: Selective Apply Changes
- 🔮 **Status**: Future
- 🔴 **Complexity**: Hard
- **Story**: Apply changes to subset of shared configs
- **Tasks**:
  - [ ] Add config selector to save
  - [ ] Handle partial updates
  - [ ] Split shared as needed
- **Acceptance**: Can update specific configs only

### P4.4: Production Validation Tracking
- 🔮 **Status**: Future
- 🟡 **Complexity**: Medium
- **Story**: Track testing/validation status
- **Tasks**:
  - [ ] Add validation status fields
  - [ ] Track test results
  - [ ] Show validation badges
- **Acceptance**: Know which versions are production-ready

### P4.5: Export for Production
- 🔮 **Status**: Future
- 🟡 **Complexity**: Medium
- **Story**: Export working copies back to NOTE format
- **Tasks**:
  - [ ] Convert sections to NOTE array
  - [ ] Validate format
  - [ ] Generate export file
- **Acceptance**: Can export for Mike's system

### P4.6: Bulk Operations
- 🔮 **Status**: Future
- 🔴 **Complexity**: Hard
- **Story**: Apply operations across multiple ingredients
- **Tasks**:
  - [ ] Multi-select ingredients
  - [ ] Bulk share/unshare
  - [ ] Bulk revert
  - [ ] Bulk status view
- **Acceptance**: Can manage many ingredients at once

---

## Implementation Strategy

### Recommended Order:
1. **Start with Phase 0** - Quick wins, immediate value
2. **Implement Phase 1** - Basic versioning gives safety
3. **Evaluate needs** - Decide if you need more complexity
4. **Phase 2 OR Phase 3** - Choose based on priority:
   - Phase 2 if you need baseline comparison
   - Phase 3 if duplicate management is more important
5. **Phase 4** - Only if you need advanced features

### Minimum Viable Implementation:
- Phase 0 + Phase 1.1-1.2 = Basic version tracking
- Add Phase 3.1-3.3 = Deduplication
- Total: ~2-3 days of work for core functionality

### Full Implementation:
- All of Phases 0-3 = ~2 weeks
- Phase 4 = Additional 1 week

---

## Notes

### Technical Decisions Made:
- [x] Use Firebase subcollections for versions (implemented)
- [x] Store full snapshots (implemented)
- [ ] Hash algorithm choice (SHA-256, MD5, custom)?
- [ ] How to handle merge conflicts?

### UI/UX Decisions Made:
- [x] Show version status as badge on ingredient cards (implemented)
- [x] Modal diff viewer (implemented in VersionHistory component)
- [ ] How prominent should sharing indicators be?
- [ ] Auto-save or explicit save?

### Risk Mitigation:
- Each phase is independently valuable
- Can stop at any phase and have working system
- Phase 0-1 provides immediate safety (version history)
- Later phases are optional enhancements

---

## Progress Tracking

### Sprint 1 (Completed)
- [x] P0.1: Fix Config Ingredient Clicking ✅
- [x] P0.2: Improve Import Feedback ✅
- [x] P1.1: Add Version Tracking ✅
- [x] P1.2: Simple History List ✅

### Sprint 2 (Completed)
- [x] P1.3: Basic Diff View ✅
- [x] P1.4: Revert to Previous ✅
- [x] P0.3: Basic Ingredient Search ✅

### Sprint 3 (Completed - January 2025)
- [x] P2.1: Preserve Original Imports ✅
- [x] P2.2: Create Working Copy Layer (Partial) ✅
- [x] P2.3: Status Tracking (Modified/Clean) ✅
- [x] P2.4: Diff Against Baseline ✅
- [x] P2.5: Revert to Baseline ✅

### Next Sprint (Planned)
- [ ] P3.1: Content Hashing
- [ ] P3.2: Duplicate Detection on Import
- [ ] P3.3: Manual Share/Link Ingredients

---

*Last Updated: January 2025*
*Completed: Phase 0, Phase 1, and Phase 2 (All items)*