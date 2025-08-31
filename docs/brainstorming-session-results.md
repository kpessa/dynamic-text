# Brainstorming Session: Ingredient Data Model Redesign

**Session Date:** 2025-08-31
**Topic:** Making ingredients first-class entities in the data model
**Participants:** User (Product Owner), Mary (Business Analyst)
**Goal:** Restructure data model to eliminate config-to-section transformations

## Executive Summary

- **Session Focus:** Redesigning the ingredient data model to make ingredients first-class entities
- **Techniques Used:** Entity Relationship Mapping, Pain Point to Solution Bridge, "What If" Scenarios, UI/UX Flow Design
- **Total Concepts Generated:** 15+ architectural patterns and UI flows
- **Key Outcome:** Complete blueprint for migrating from config-centric to ingredient-centric architecture

## Technique 1: Entity Relationship Mapping

### Core Entity Structure Developed

**Ingredient Entity (First-Class)**
```javascript
{
  id: "calcium",              // Simple, readable ID
  displayName: "Calcium",     
  category: "Salt",          
  sections: [...],           // Direct storage - no transformation!
  tests: [...],              // Direct storage - no transformation!
  variants: {                // Population-specific differences
    "neonatal": {...},
    "adult": {...}
  },
  metadata: {...}
}
```

**Config Manifest (Lightweight Reference)**
```javascript
{
  id: "choc-pediatric-tpn",
  source: "refs/child-build-main-choc.json",
  ingredientRefs: [
    { ingredientId: "calcium", overrides: null },
    { ingredientId: "phosphate", overrides: {...} }
  ]
}
```

### Key Insights
- Ingredients store content directly (sections & tests)
- Configs become lightweight "recipes" that reference ingredients
- Variants handle population-specific differences without duplication
- Simple IDs (e.g., "calcium") improve searchability and maintainability

## Technique 2: Pain Point to Solution Bridge

### Pain Points Identified → Solutions Developed

1. **"Bunch of config files hard to organize"**
   - **Solution:** Config Registry with source tracking and metadata
   - Configs link to ingredients rather than embedding them

2. **"Need to see which configs share ingredients"**
   - **Solution:** Ingredient Usage Service for cross-config analysis
   - Shows which configs use each ingredient with override tracking

3. **"Config-to-section transformation overhead"**
   - **Solution:** Direct section/test storage in ingredients
   - Eliminates transformation entirely

### Architectural Insights
```
INGREDIENTS (First-class with content)
    ↓ Referenced by
CONFIG REGISTRY (Lightweight compositions)
    ↓ Analyzed by
USAGE/DIFF SERVICE (Analysis layer)
```

## Technique 3: "What If" Scenarios

### Config Source Tracking Scenario
- Track original file source for each config
- Maintain SHA256 hashes for change detection
- Enable regeneration in original format

### Auto-Deduplication Scenario
```javascript
ImportAnalysis {
  exact_matches: 17,    // Will link to existing
  near_matches: 3,      // Review needed (85% similarity)
  unique: 2             // Will create new
}
```

### Configs as Views Scenario
- Configs become "views" that compose ingredients
- Ingredients track which configs use them
- Bidirectional relationship visibility

## Technique 4: UI/UX Flow Design

### Navigation Structure
1. **Ingredients Tab** - Direct access to content editing
2. **Configs Tab** - Lightweight composition management
3. **Import Flow** - Smart deduplication wizard
4. **Analysis View** - Usage patterns and merge opportunities

### Key UI Principles Developed
- Ingredients First: Main workflow is editing ingredient content directly
- Smart Import: Auto-detects and suggests deduplication
- Clear Relationships: Always visible usage tracking
- Minimal Clicks: Direct access to sections/tests

### Visual Indicators System
- ✅ Shared/deduplicated
- ⚠️ Similar (potential merge)
- 🆕 Unique to this config
- 📍 Has overrides

## Migration & Refactoring Strategy

### Phase 1: Data Model Creation (Non-Breaking)
- New TypeScript interfaces for Ingredient and ConfigManifest
- Parallel services alongside existing code

### Phase 2: Service Layer Development
- IngredientService for direct CRUD operations
- ConfigManifestService for composition management
- Migration utilities for one-time conversion

### Phase 3: UI Component Refactoring
- Split monolithic components into focused units
- IngredientList, ConfigManager, ImportWizard

### Phase 4: Core Application Refactoring
- App.svelte transformation removal (2,663 lines → ~1,500 lines estimated)
- Direct section/test editing implementation
- Remove configToSections/sectionsToConfig functions

### Critical Files Identified for Refactoring
1. App.svelte - Remove transformations
2. firebaseDataService.js - Split into focused services
3. Sidebar.svelte - Decompose into smaller components
4. tpnLegacy.js - Remove transformation logic
5. NEW: 7+ new files for models and services

## Action Planning

### Top 3 Priority Ideas

1. **Create Parallel Data Models**
   - **Rationale:** Non-breaking foundation for migration
   - **Next Steps:** Define TypeScript interfaces, create service stubs
   - **Resources:** TypeScript documentation, existing schema.txt
   - **Timeline:** 1 week

2. **Build Migration Tool**
   - **Rationale:** Automated conversion reduces risk
   - **Next Steps:** Content hashing implementation, deduplication logic
   - **Resources:** Existing contentHashing.js, Firebase admin SDK
   - **Timeline:** 1 week

3. **Implement Smart Import UI**
   - **Rationale:** User-facing value immediately visible
   - **Next Steps:** Import wizard component, diff visualization
   - **Resources:** Existing DiffViewer component patterns
   - **Timeline:** 2 weeks

## Reflection & Follow-up

### What Worked Well
- Progressive technique application built comprehensive solution
- Real config examples (child-build-main-choc.json) grounded discussions
- UI/UX exploration clarified user workflow benefits

### Areas for Further Exploration
- Performance optimization for large ingredient sets
- Collaborative editing conflict resolution
- Version control strategy for ingredients
- API design for external system integration

### Recommended Follow-up Techniques
- User Story Mapping for detailed workflow definition
- Risk Assessment Matrix for migration planning
- Prototype Development for UI validation

### Questions for Future Sessions
1. How should ingredient versioning work independently from configs?
2. Should ingredients support branching/merging like Git?
3. How to handle breaking changes in ingredient structure?
4. What analytics would be most valuable for ingredient usage?

## Key Decisions Made

1. **Ingredients will be first-class entities** with direct section/test storage
2. **Configs become lightweight manifests** that reference ingredients
3. **Simple, readable IDs** (e.g., "calcium") over complex keys
4. **Phased migration approach** to minimize risk
5. **UI-first design** prioritizing direct content editing

## Success Metrics

- Elimination of config-to-section transformation code
- Reduction in data duplication (target: 80% reduction)
- Improved page load time (target: 50% faster)
- Reduced App.svelte size (target: from 2,663 to <1,500 lines)
- Zero data loss during migration

---

*This document captures the outcomes of our brainstorming session on ingredient data model redesign. It serves as the foundation for creating a formal Product Requirements Document (PRD) and subsequent development stories.*