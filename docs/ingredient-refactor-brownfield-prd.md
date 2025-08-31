# Ingredient-First Data Model Enhancement - Brownfield PRD

## Intro Project Analysis and Context

### Assessment of Enhancement Complexity

Based on the brainstorming session, this is a **substantial architectural refactoring** that requires:
- Complete data model redesign (config-centric → ingredient-centric)
- Migration of existing Firebase data structure
- Refactoring of 2,663+ lines in App.svelte
- Creation of 7+ new service files
- UI/UX workflow changes

This definitely warrants a full PRD process as it involves multiple coordinated stories and architectural planning.

### Existing Project Overview

**Analysis Source:** IDE-based fresh analysis combined with brainstorming session insights

**Current Project State:**
The Dynamic Text Editor is a specialized web application for creating and testing dynamic text content with TPN (Total Parenteral Nutrition) advisor functions. Currently:
- Uses a config-centric data model where ingredients are embedded in configuration files
- Requires transformation between config format and editable sections (configToSections/sectionsToConfig)
- Manages ~20 ingredients across multiple hospital configurations
- Experiences significant duplication (~80% of ingredients are identical across configs)

### Available Documentation Analysis

**Available Documentation:**
- ✓ Tech Stack Documentation (CLAUDE.md)
- ✓ Architecture Documentation (docs/architecture-shards/)
- ✓ Coding Standards (TypeScript-first approach documented)
- ✓ Technical Debt Documentation (Story 1.7 refactoring progress)
- ✓ Brainstorming Session Results (comprehensive redesign blueprint)

### Enhancement Scope Definition

**Enhancement Type:**
- ✓ Major Feature Modification
- ✓ Performance/Scalability Improvements
- ✓ Technology Stack Upgrade (data layer)

**Enhancement Description:**
Refactor the entire data model to make ingredients first-class entities with direct section/test storage, eliminating the need for config-to-section transformations and reducing data duplication by ~80%.

**Impact Assessment:**
- ✓ Major Impact (architectural changes required)

### Goals and Background Context

**Goals:**
- Enable direct ingredient content editing without requiring transformations
- Reduce data duplication by 80% through intelligent deduplication
- Improve page load time through optional transformation bypass
- Better organize App.svelte through service extraction
- Maintain full backward compatibility with existing workflows

**Background Context:**
The current system requires complex bidirectional transformations between config format (how data is stored) and sections format (how content is edited). While these transformations are useful for certain workflows (like quickly testing an ingredient in config format), requiring them for all operations creates unnecessary overhead. By making ingredients first-class entities that store content directly, we can offer both direct editing AND transformation-based workflows, giving users the best of both worlds.

**Change Log:**
| Change | Date | Version | Description | Author |
|--------|------|---------|-------------|--------|
| Initial | 2025-08-31 | 1.0 | Created from brainstorming session | John (PM) |

## Requirements

### Functional Requirements

**FR1:** The system shall store ingredients as first-class entities with sections and tests as direct properties, while **preserving** configToSection and sectionToConfig transformations for flexibility.

**FR2:** The system shall provide a dual-mode workflow where users can either:
- Edit ingredients directly with their native sections/tests, OR  
- Use config format and transform to/from sections when needed (preserving current workflow)

**FR3:** The system shall provide a dedicated Ingredients tab for direct content editing AND maintain the ability to work with config format when importing/exporting.

**FR4:** The system shall automatically detect and deduplicate ingredients during config import, presenting exact matches, near matches (with similarity percentage), and unique ingredients.

**FR5:** The system shall maintain bidirectional relationship tracking between ingredients and configs, showing which configs use each ingredient and what overrides are applied.

**FR6:** The system shall support population-specific variants within ingredients (NEO, CHILD, ADOLESCENT, ADULT) with alias support (infant → NEO, pediatric → [CHILD, ADOLESCENT]) without creating duplicate ingredient entities.

**FR7:** The system shall provide a "Quick Test in Config" feature allowing users to rapidly transform an ingredient back to config format for testing in the TPN system.

**FR8:** The system shall provide a migration tool to create the new ingredient-centric structure while preserving the existing config-centric structure for backward compatibility.

### Non-Functional Requirements

**NFR1:** The system must improve page load time by offering direct ingredient access (bypassing transformation when not needed).

**NFR2:** The system must reduce data storage by approximately 80% through ingredient deduplication.

**NFR3:** The refactored App.svelte must be better organized through extraction of services and components (target: under 2,000 lines).

**NFR4:** The system must maintain both data access patterns (direct and transformed) with sub-100ms response time.

**NFR5:** Both workflows (direct editing and transformation-based) must be equally supported and documented.

**NFR6:** All refactoring must follow TypeScript-first development with proper type safety.

### Compatibility Requirements

**CR1:** The system must maintain full backward compatibility with the existing transformation functions (configToSections/sectionsToConfig).

**CR2:** The system must support both data models simultaneously during a transition period, allowing gradual migration.

**CR3:** The UI must maintain visual consistency with the existing design system, using the same CodeMirror editor, preview engine, and component library.

**CR4:** The system must continue to integrate with the existing Vercel Functions API for AI test generation without modification.

**CR5:** The existing config import/export functionality must be preserved and enhanced, not replaced.

## Technical Constraints and Integration Requirements

### Existing Technology Stack

**Languages**: TypeScript, JavaScript, HTML, CSS
**Frameworks**: Svelte 5.35+ (with runes API), Vite 7
**Database**: Firebase Firestore
**Infrastructure**: Vercel (hosting & serverless functions)
**External Dependencies**: CodeMirror 6, Babel Standalone, DOMPurify, Firebase SDK

### TPN Advisor Type System

**Population Type Structure**:
- **Core Types**: `TPNAdvisorType = 'NEO' | 'CHILD' | 'ADOLESCENT' | 'ADULT'`
- **Alias Support**: `TPNAdvisorAlias = 'neonatal' | 'child' | 'adolescent' | 'adult' | 'infant'`
- **Special Mapping**: 'pediatric' → ['CHILD', 'ADOLESCENT'] (multi-mapping alias)

**Type Definitions**:
```typescript
// From src/types/tpn.ts
export type TPNAdvisorType = 'NEO' | 'CHILD' | 'ADOLESCENT' | 'ADULT';
export type TPNAdvisorAlias = 'neonatal' | 'child' | 'adolescent' | 'adult' | 'infant';

export interface TPNAdvisorAliasMap {
  readonly infant: 'NEO';
  readonly neonatal: 'NEO';
  readonly child: 'CHILD';
  readonly adolescent: 'ADOLESCENT';
  readonly adult: 'ADULT';
  readonly pediatric: 'CHILD' | 'ADOLESCENT';
}
```

**Ingredient Variant Structure**:
- Variants stored as `Record<TPNAdvisorType, PopulationVariant>`
- Alias resolution handled at service layer
- Backward compatibility for legacy population names

### Integration Approach

**Database Integration Strategy**: 
- Create parallel `/ingredients` collection alongside existing `/configs` collection
- Maintain bidirectional references between ingredients and configs
- Use Firebase transactions for atomic updates when modifying shared ingredients
- Implement gradual migration with both structures coexisting

**API Integration Strategy**: 
- Preserve all existing API contracts for config operations
- Add new ingredient-specific endpoints alongside existing ones
- Maintain transformation APIs for converting between formats
- Keep AI test generation API unchanged

**Frontend Integration Strategy**: 
- Add new Svelte components for ingredient management alongside existing config components
- Use Svelte 5 runes (`$state`, `$derived`) for reactive ingredient state
- Maintain existing CodeMirror integration for both editing modes
- Implement progressive enhancement - old features keep working while new ones are added

**Testing Integration Strategy**: 
- Keep existing test infrastructure for config workflows
- Add parallel test suites for ingredient-first workflows
- Create integration tests that verify both paths work correctly
- Implement migration verification tests

### Code Organization and Standards

**File Structure Approach**: 
```
src/lib/
├── models/          # NEW: TypeScript interfaces
│   ├── ingredient.ts
│   └── config.ts
├── services/        # Split existing + new services
│   ├── ingredientService.ts (NEW)
│   ├── configService.ts (refactored)
│   └── transformService.ts (preserved)
├── components/      # New components
│   ├── IngredientEditor.svelte
│   └── IngredientList.svelte
└── legacy/          # Preserved functionality
    └── transformations.js
```

**Naming Conventions**: 
- Ingredient entities: `ingredient*` prefix (ingredientService, ingredientStore)
- Config entities: `config*` prefix (maintained)
- Shared functionality: descriptive names (deduplicationService)

**Coding Standards**: 
- TypeScript-first with strict typing for new code
- Preserve existing JavaScript where stable
- Follow existing Svelte 5 runes patterns
- Maintain current error handling patterns

**Documentation Standards**: 
- Document both workflows (direct and transformation-based)
- Update CLAUDE.md with new architecture patterns
- Create migration guide for developers

### Deployment and Operations

**Build Process Integration**: 
- No changes to Vite build configuration required
- Ensure tree-shaking removes unused code paths
- Bundle size monitoring for both old and new code

**Deployment Strategy**: 
- Feature flag for ingredient-first UI (gradual rollout)
- Database migration as separate deployment step
- Ability to run in hybrid mode indefinitely
- Zero-downtime deployment using Vercel

**Monitoring and Logging**: 
- Track usage of direct vs transformation workflows
- Monitor performance of both access patterns
- Log migration progress and any data inconsistencies
- Alert on degraded performance in either mode

**Configuration Management**: 
- Environment variable for feature toggle: `VITE_INGREDIENT_FIRST_ENABLED`
- Firebase security rules update for new collections
- Backward-compatible configuration schema

### Risk Assessment and Mitigation

**Technical Risks**: 
- Maintaining two data access patterns increases complexity
- Potential for data inconsistency between ingredient and config representations
- Increased bundle size from supporting both workflows

**Integration Risks**: 
- Firebase security rules might need careful updates to handle new collection
- Potential race conditions when multiple users edit shared ingredients
- Cache invalidation complexity with two data models

**Deployment Risks**: 
- Migration script failure could leave data in inconsistent state
- Users might be confused by two different editing modes
- Rollback complexity if issues discovered post-deployment

**Mitigation Strategies**: 
- Implement comprehensive data validation at both model layers
- Use Firebase transactions for all cross-collection operations
- Create detailed user documentation explaining when to use each mode
- Build migration with checkpoint/resume capability
- Implement gradual rollout with feature flags
- Maintain transformation functions as safety net

## Epic and Story Structure

### Epic Approach

**Epic Structure Decision**: Single comprehensive epic for the ingredient-first enhancement

This is a cohesive architectural enhancement where all parts work together to deliver the ingredient-first capability. While extensive, the work is interconnected - the data models, services, UI components, and migration tools all support the singular goal of enabling direct ingredient editing while preserving existing functionality.

## Epic 1: Ingredient-First Data Model Enhancement

**Epic Goal**: Enable direct ingredient content editing while preserving config transformation capabilities, reducing data duplication by 80% and improving application maintainability.

**Integration Requirements**: All new functionality must coexist with existing config-based workflows. Users should be able to seamlessly switch between direct ingredient editing and config transformation modes. No existing functionality should be broken or removed.

### Story 1.1: Create Ingredient Data Models and TypeScript Interfaces

As a developer,
I want to define the new ingredient and config manifest data structures,
so that we have a type-safe foundation for the enhancement.

**Acceptance Criteria:**
1. TypeScript interface for Ingredient entity with sections, tests, and variants using TPNAdvisorType
2. TypeScript interface for ConfigManifest that references ingredients
3. Type definitions for migration and transformation utilities with alias support
4. All interfaces properly exported and documented
5. No breaking changes to existing type definitions
6. Integration with TPN advisor type system from src/types/tpn.ts

**Integration Verification:**
- IV1: Existing config interfaces remain unchanged and functional
- IV2: New interfaces can coexist with legacy types without conflicts
- IV3: Build process completes without TypeScript errors

### Story 1.2: Implement Ingredient Service Layer

As a developer,
I want to create service classes for ingredient CRUD operations,
so that we can manage ingredients as first-class entities.

**Acceptance Criteria:**
1. IngredientService with methods for create, read, update, delete
2. Direct section/test editing methods without transformation
3. Variant management for TPN advisor types (NEO, CHILD, ADOLESCENT, ADULT) with alias support
4. Proper error handling and validation
5. Firebase Firestore integration for persistence
6. Alias resolution methods for population type mapping

**Integration Verification:**
- IV1: Existing firebaseDataService continues to work unchanged
- IV2: Both services can operate on same Firebase instance simultaneously
- IV3: No performance degradation in existing config operations

### Story 1.3: Build Config-to-Ingredient Transformation Bridge

As a developer,
I want to create bidirectional transformation utilities,
so that users can convert between ingredient and config formats on demand.

**Acceptance Criteria:**
1. Preserve existing configToSections and sectionsToConfig functions
2. Add ingredientToConfig transformation for quick testing
3. Add configToIngredient extraction for migration
4. Maintain full fidelity in round-trip transformations
5. Performance optimization for transformation operations

**Integration Verification:**
- IV1: Existing transformation functions produce identical output
- IV2: New transformations integrate with existing TPN calculation engine
- IV3: Round-trip transformation preserves all data without loss

### Story 1.4: Create Ingredient Management UI Components

As a user,
I want dedicated UI for managing ingredients directly,
so that I can edit content without dealing with config format.

**Acceptance Criteria:**
1. IngredientList component showing all available ingredients
2. IngredientEditor for direct section/test editing
3. Visual indicators for shared/unique/modified ingredients
4. Search and filter capabilities
5. Integration with existing CodeMirror editor

**Integration Verification:**
- IV1: Existing Sidebar component continues to function
- IV2: UI maintains consistent styling with current application
- IV3: No conflicts with existing Svelte components

### Story 1.5: Implement Smart Import with Deduplication

As a user,
I want the system to intelligently detect duplicate ingredients during import,
so that we reduce redundant data storage.

**Acceptance Criteria:**
1. Import wizard that analyzes incoming config files
2. Automatic detection of exact matches (100% similarity)
3. Identification of near matches with similarity percentage
4. User interface for resolving near matches
5. Creation of only truly unique ingredients

**Integration Verification:**
- IV1: Existing import functionality remains available
- IV2: Legacy configs can still be imported in original format
- IV3: Import performance meets or exceeds current benchmarks

### Story 1.6: Build Migration Tool and Data Converter

As a developer,
I want automated migration from config-centric to ingredient-centric structure,
so that we can convert existing data without manual intervention.

**Acceptance Criteria:**
1. Migration script that processes all existing configs
2. Extraction and deduplication of ingredients
3. Creation of config manifests with ingredient references
4. Verification of data integrity post-migration
5. Rollback capability if migration fails

**Integration Verification:**
- IV1: Original config data remains untouched during migration
- IV2: Migration can be run in dry-run mode for testing
- IV3: System remains operational during migration process

### Story 1.7: Add Usage Analytics and Relationship Tracking

As a user,
I want to see which configs use each ingredient and how,
so that I can understand the impact of my changes.

**Acceptance Criteria:**
1. Usage panel showing configs that reference each ingredient
2. Override tracking for config-specific modifications
3. Impact analysis when editing shared ingredients
4. Merge suggestions for similar ingredients
5. Visual relationship diagram (optional)

**Integration Verification:**
- IV1: Analytics don't impact application performance
- IV2: Relationship data stays synchronized with actual usage
- IV3: Existing config operations update relationships correctly

### Story 1.8: Implement Feature Flags and Gradual Rollout

As a product owner,
I want to control the rollout of ingredient-first features,
so that we can gradually introduce changes and monitor adoption.

**Acceptance Criteria:**
1. Feature flag for enabling/disabling ingredient-first UI
2. Analytics to track usage of new vs. legacy workflows
3. A/B testing capability for different user groups
4. Admin panel for feature flag management
5. Graceful degradation when features are disabled

**Integration Verification:**
- IV1: Application works correctly with feature flag disabled
- IV2: No performance impact from feature flag checks
- IV3: Users can switch between modes without data loss

### Story 1.9: Create Documentation and Migration Guide

As a developer or user,
I want comprehensive documentation for the new ingredient-first workflow,
so that I can understand when and how to use each approach.

**Acceptance Criteria:**
1. Update CLAUDE.md with new architecture patterns
2. Create user guide for ingredient-first workflow
3. Document when to use direct editing vs. transformation
4. Migration guide for developers
5. Troubleshooting guide for common issues

**Integration Verification:**
- IV1: Documentation covers both old and new workflows
- IV2: Clear guidance on choosing appropriate workflow
- IV3: Migration steps are tested and verified

---

## Story Sequencing Rationale

1. **Foundation first** (Stories 1.1-1.3): Establish data models and core services
2. **UI layer** (Stories 1.4-1.5): Build user-facing features on solid foundation
3. **Migration** (Story 1.6): Convert data once UI is ready
4. **Enhancement** (Stories 1.7-1.8): Add value-added features
5. **Documentation** (Story 1.9): Capture learnings and guide adoption

This sequence ensures each story builds on the previous one while maintaining system stability throughout. The existing system remains fully functional at every step.

## Success Metrics

- 80% reduction in data duplication across configs
- Sub-100ms response time for both direct and transformation workflows
- Zero data loss during migration
- 50% of users adopting ingredient-first workflow within 30 days
- App.svelte reduced to under 2,000 lines
- No increase in bug reports related to existing functionality

## Next Steps

1. Review and approve this PRD with stakeholders
2. Hand off to Scrum Master for story refinement and estimation
3. Create technical spike for migration tool prototype
4. Set up feature flag infrastructure
5. Begin Story 1.1 implementation

---

*Document Version: 1.0*
*Created: 2025-08-31*
*Author: John (Product Manager)*
*Source: Brainstorming Session - Ingredient Data Model Redesign*