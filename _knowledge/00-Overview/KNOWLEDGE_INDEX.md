# Knowledge Base Index
*Comprehensive Research & Documentation Hub*
*Last Updated: 2025-01-25*
*Status: Post-Comprehensive Audit*

## 🚨 Critical Status Alert

**Project Health**: 6.2/10 - Requires immediate attention
**Critical Issues**: App.svelte (2,476 lines), Security rule mismatches, Test coverage uncertainty

## Quick Reference Guide

This searchable index helps you find information quickly across the entire knowledge base. Use Ctrl/Cmd+F to search for keywords.

## 🎯 Current Priority Areas (Post-Audit)

### P0 Critical Issues - Must Address Immediately
- **[Current State Assessment](/home/pessk/code/dynamic-text/_knowledge/00-Overview/CURRENT_STATE.md)** - Complete project health assessment
- **[Comprehensive Audit 2025-01-25](/home/pessk/code/dynamic-text/_knowledge/06-Reviews/comprehensive-audit-2025-01-25-1045.md)** - Critical issues identified
- **[Rapid Prototyping Roadmap](/home/pessk/code/dynamic-text/_knowledge/06-Reviews/RAPID_PROTOTYPING_ROADMAP.md)** - 6-week improvement plan

### P1 Architecture Crisis
- **App.svelte**: 2,476 lines (495% over CLAUDE.md limit) - [Architecture Audit](/home/pessk/code/dynamic-text/_knowledge/02-Architecture/AUDIT-2025-08-17.md)
- **Component Violations**: Monolithic architecture blocking development
- **Service Duplication**: [Service Consolidation Analysis](/home/pessk/code/dynamic-text/_knowledge/02-Architecture/service-architecture-consolidation-analysis-2025-08-17.md)

### P1 Security & Medical Safety
- **Firebase Security**: Rules mismatch threatens medical data - [Security Audit](/home/pessk/code/dynamic-text/_knowledge/01-Research/Security/AUDIT-2025-08-17.md)
- **HIPAA Compliance**: Not ready for medical deployment
- **Medical Calculations**: Partial test coverage for safety-critical TPN functions

## 📑 Index by Topic (Updated with Audit Findings)

### A
- **Accessibility**: [ACCESSIBILITY_IMPROVEMENTS.md](../04-Decisions/ACCESSIBILITY_IMPROVEMENTS.md), [DEVELOPMENT_WORKFLOW.md](../08-Workflows/DEVELOPMENT_WORKFLOW.md), [src/lib/utils/accessibility.js](../../src/lib/utils/accessibility.js)
- **AI Integration**: [AI_INTEGRATION.md](../04-Integration/AI_INTEGRATION.md), [AI_TEST_GENERATION_TROUBLESHOOTING.md](../05-Testing/AI_TEST_GENERATION_TROUBLESHOOTING.md), [api/generate-tests.ts](../../api/generate-tests.ts)
- **Anonymous Authentication**: [AUTHENTICATION.md](../07-Security/AUTHENTICATION.md), [firebase-architecture-analysis.md](../01-Research/Firebase/firebase-architecture-analysis.md)
- **App Refactoring**: 🔴 **CRITICAL** - [APP_REFACTORING_SUMMARY.md](../02-Architecture/APP_REFACTORING_SUMMARY.md), [Architecture Audit](/home/pessk/code/dynamic-text/_knowledge/02-Architecture/AUDIT-2025-08-17.md)
- **Architecture**: 🔴 **NEEDS IMMEDIATE ATTENTION** - [SYSTEM_ARCHITECTURE.md](../02-Architecture/SYSTEM_ARCHITECTURE.md), [VERSIONING_ROADMAP.md](../02-Architecture/VERSIONING_ROADMAP.md)
- **Audit Results**: 🔴 **NEW** - [Comprehensive Audit](/home/pessk/code/dynamic-text/_knowledge/06-Reviews/comprehensive-audit-2025-01-25-1045.md), [Current State](/home/pessk/code/dynamic-text/_knowledge/00-Overview/CURRENT_STATE.md)

### B
- **Babel**: [WORKER_INTEGRATION.md](../04-Integration/WORKER_INTEGRATION.md), [public/workers/codeWorker.js](../../public/workers/codeWorker.js)
- **Batch Operations**: [firebase-architecture-analysis.md](../01-Research/Firebase/firebase-architecture-analysis.md)
- **Build Optimization**: 🟡 **PERFORMANCE ISSUE** - [BUNDLE_OPTIMIZATION.md](../06-Performance/BUNDLE_OPTIMIZATION.md), [vite.config.ts](../../vite.config.ts), [Performance Audit](/home/pessk/code/dynamic-text/_knowledge/01-Research/Performance/AUDIT-2025-08-17.md)
- **Bundle Size**: 🟡 **300% OVER TARGET** - Current ~1.5MB, Target <800KB

### C
- **Caching**: [CACHING_STRATEGIES.md](../03-Patterns/CACHING_STRATEGIES.md), [src/lib/services/base/CacheService.ts](../../src/lib/services/base/CacheService.ts)
- **CHOC Import**: [CHOC_IMPORT_FIX.md](../07-Issues/CHOC_IMPORT_FIX.md)
- **CodeMirror**: [COMPONENT_HIERARCHY.md](../02-Architecture/COMPONENT_HIERARCHY.md), [src/lib/CodeEditor.svelte](../../src/lib/CodeEditor.svelte)
- **Component Testing**: 🔴 **COVERAGE CRISIS** - [UNIT_TEST_PATTERNS.md](../05-Testing/UNIT_TEST_PATTERNS.md), [TEST_COVERAGE_IMPROVEMENT_SUMMARY.md](../05-Testing/TEST_COVERAGE_IMPROVEMENT_SUMMARY.md), [Testing Audit](/home/pessk/code/dynamic-text/_knowledge/01-Research/Testing/AUDIT-2025-08-17.md)
- **Component Size Violations**: 🔴 **CRITICAL** - App.svelte (2,476 lines), Sidebar.svelte (4,247 lines), IngredientManager.svelte (2,491 lines)
- **Content Hashing**: [src/lib/contentHashing.ts](../../src/lib/contentHashing.ts)
- **Conversion Testing**: [AUTO_CONVERSION_TEST_PLAN.md](../07-Issues/AUTO_CONVERSION_TEST_PLAN.md)
- **Critical Path Issues**: 🔴 **NEW** - [Rapid Prototyping Roadmap](/home/pessk/code/dynamic-text/_knowledge/06-Reviews/RAPID_PROTOTYPING_ROADMAP.md)

### D
- **Data Flow**: [STATE_MANAGEMENT.md](../02-Architecture/STATE_MANAGEMENT.md), [Data Flow Audit](/home/pessk/code/dynamic-text/_knowledge/03-Data-Flow/AUDIT-2025-08-17.md)
- **Debugging**: [DEBUGGING_WORKFLOW.md](../08-Workflows/DEBUGGING_WORKFLOW.md)
- **Deployment**: 🔴 **BLOCKED BY CRITICAL ISSUES** - [DEPLOYMENT_WORKFLOW.md](../08-Workflows/DEPLOYMENT_WORKFLOW.md)
- **Derived Values**: [REACTIVE_PATTERNS.md](../03-Patterns/REACTIVE_PATTERNS.md), [$derived usage](../01-Research/Svelte/svelte-patterns-analysis.md)
- **Design System**: [DESIGN_SYSTEM_IMPLEMENTATION.md](../03-Components/Styling/DESIGN_SYSTEM_IMPLEMENTATION.md)
- **Development Velocity**: 🔴 **40% SLOWER** due to monolithic architecture

### E
- **E2E Testing**: [E2E_TEST_PATTERNS.md](../05-Testing/E2E_TEST_PATTERNS.md), [e2e/*.spec.ts](../../e2e/)
- **Error Handling**: [ERROR_HANDLING.md](../03-Patterns/ERROR_HANDLING.md), [src/lib/services/base/ErrorService.ts](../../src/lib/services/base/ErrorService.ts)
- **Event Bus**: [src/lib/eventBus.ts](../../src/lib/eventBus.ts)

### F
- **Features**: [Features Documentation](../06-Features/README.md)
- **Firebase**: 🔴 **SECURITY MISMATCH** - [FIREBASE_INTEGRATION.md](../02-Architecture/FIREBASE_INTEGRATION.md), [FIREBASE_OPTIMIZATION.md](../02-Architecture/FIREBASE_OPTIMIZATION.md), [src/lib/firebase.ts](../../src/lib/firebase.ts), [Firebase Audit](/home/pessk/code/dynamic-text/_knowledge/01-Research/Firebase/AUDIT-2025-08-17.md)
- **Firebase Issues**: 🔴 **CRITICAL** - [FIREBASE_ID_NORMALIZATION_SUMMARY.md](../07-Issues/FIREBASE_ID_NORMALIZATION_SUMMARY.md), [FIREBASE_ID_ISSUES_SUMMARY.md](../07-Issues/FIREBASE_ID_ISSUES_SUMMARY.md)
- **Firebase Security Rules**: 🔴 **PRODUCTION RISK** - Rules expect nested structure, data is flat
- **Firestore**: [data-modeling-patterns.md](../01-Research/Firebase/data-modeling-patterns.md), [firestore.rules](../../firestore.rules)

### G
- **Gemini API**: [AI_INTEGRATION.md](../04-Integration/AI_INTEGRATION.md), [api/generate-tests.ts](../../api/generate-tests.ts)

### H
- **Health Systems**: [SINGLE_DOMAIN_HEALTH_SYSTEMS.md](../06-Features/SINGLE_DOMAIN_HEALTH_SYSTEMS.md), [src/lib/firebaseDataService.ts](../../src/lib/firebaseDataService.ts)
- **HIPAA Compliance**: 🔴 **NOT READY** - [MEDICAL_DATA_PROTECTION.md](../07-Security/MEDICAL_DATA_PROTECTION.md)

### I
- **Ingredients**: [INGREDIENT_EXTRACTION_FEATURE.md](../06-Features/INGREDIENT_EXTRACTION_FEATURE.md), [src/lib/services/domain/IngredientService.ts](../../src/lib/services/domain/IngredientService.ts)
- **Integration Testing**: 🔴 **GAPS IDENTIFIED** - [testing-infrastructure-analysis.md](../01-Research/Testing/testing-infrastructure-analysis.md)
- **Issues**: [Issues & Fixes Documentation](../07-Issues/README.md)
- **iOS Mobile**: 🟡 **TESTING GAP** - [iOS Audit](/home/pessk/code/dynamic-text/_knowledge/01-Research/iOS/audit-2025-01-25-1045.md)

### K
- **KPT Functions**: [KPT_NAMESPACE_EXAMPLES.md](../07-Issues/KPT_NAMESPACE_EXAMPLES.md), [src/lib/kptNamespace.ts](../../src/lib/kptNamespace.ts), [src/lib/KPTManager.svelte](../../src/lib/KPTManager.svelte)
- **Knowledge Gaps**: 🔴 **IDENTIFIED** - See [Current State Assessment](/home/pessk/code/dynamic-text/_knowledge/00-Overview/CURRENT_STATE.md)

### L
- **Lazy Loading**: [OPTIMIZATION_TECHNIQUES.md](../06-Performance/OPTIMIZATION_TECHNIQUES.md)
- **LCP (Largest Contentful Paint)**: [MONITORING_STRATEGY.md](../06-Performance/MONITORING_STRATEGY.md)

### M
- **Medical Safety**: 🔴 **PARTIAL COVERAGE** - [MEDICAL_SAFETY_PATTERNS.md](../03-Patterns/MEDICAL_SAFETY_PATTERNS.md)
- **Medical Compliance**: 🔴 **NOT READY FOR CLINICAL USE**
- **Memory Management**: [performance-optimization-research.md](../01-Research/Performance/performance-optimization-research.md)
- **Migration**: [MIGRATION_WORKFLOW.md](../08-Workflows/MIGRATION_WORKFLOW.md), [MIGRATION_STATUS.md](../03-Components/Styling/MIGRATION_STATUS.md)
- **Mobile Testing**: 🔴 **ABSENT** - iPad clinical usage untested
- **Monitoring**: [MONITORING_STRATEGY.md](../06-Performance/MONITORING_STRATEGY.md)
- **Monolithic Components**: 🔴 **DEVELOPMENT BLOCKER** - Multiple components exceed size limits

### O
- **Offline Support**: [OFFLINE_PATTERNS.md](../03-Patterns/OFFLINE_PATTERNS.md), [PWA_INTEGRATION.md](../04-Integration/PWA_INTEGRATION.md)
- **Osmolarity**: [MEDICAL_SAFETY_PATTERNS.md](../03-Patterns/MEDICAL_SAFETY_PATTERNS.md), [src/lib/tpnLegacy.ts](../../src/lib/tpnLegacy.ts)

### P
- **Performance**: 🟡 **BELOW CLINICAL STANDARDS** - [PERFORMANCE_GUIDELINES.md](../06-Performance/PERFORMANCE_GUIDELINES.md), [PERFORMANCE_OPTIMIZATION_GUIDE.md](../04-Decisions/PERFORMANCE_OPTIMIZATION_GUIDE.md), [Performance Audit](/home/pessk/code/dynamic-text/_knowledge/01-Research/Performance/AUDIT-2025-08-17.md)
- **Phase Completion**: [PHASE_1_COMPLETE.md](../03-Components/Styling/PHASE_1_COMPLETE.md), [PHASE_2_COMPLETE.md](../03-Components/Styling/PHASE_2_COMPLETE.md), [PHASE_2B_COMPLETE.md](../03-Components/Styling/PHASE_2B_COMPLETE.md)
- **Playwright**: [E2E_TEST_PATTERNS.md](../05-Testing/E2E_TEST_PATTERNS.md), [playwright.config.ts](../../playwright.config.ts)
- **Production Readiness**: 🔴 **NOT READY** - Critical issues block deployment
- **PWA**: [PWA_IMPLEMENTATION.md](../04-Decisions/PWA_IMPLEMENTATION.md), [PWA_INTEGRATION.md](../04-Integration/PWA_INTEGRATION.md), [public/sw.js](../../public/sw.js)

### R
- **Reactive Patterns**: [REACTIVE_PATTERNS.md](../03-Patterns/REACTIVE_PATTERNS.md)
- **Real-time Sync**: [firebase-architecture-analysis.md](../01-Research/Firebase/firebase-architecture-analysis.md)
- **Refactoring**: 🔴 **URGENT** - [Refactoring Audit](/home/pessk/code/dynamic-text/_knowledge/01-Research/Refactoring/AUDIT-2025-08-17.md)
- **Roadmap**: 🔴 **NEW** - [Rapid Prototyping Roadmap](/home/pessk/code/dynamic-text/_knowledge/06-Reviews/RAPID_PROTOTYPING_ROADMAP.md)
- **Runes**: [svelte-patterns-analysis.md](../01-Research/Svelte/svelte-patterns-analysis.md)

### S
- **SCSS Migration**: [SCSS_MIGRATION_PLAN.md](../03-Components/Styling/SCSS_MIGRATION_PLAN.md), [SCSS_MIGRATION_COMPLETE.md](../03-Components/Styling/SCSS_MIGRATION_COMPLETE.md)
- **Security**: 🔴 **CRITICAL VULNERABILITIES** - [SECURITY_PATTERNS.md](../07-Security/SECURITY_PATTERNS.md), [FIREBASE_RULES.md](../07-Security/FIREBASE_RULES.md), [Security Audit](/home/pessk/code/dynamic-text/_knowledge/01-Research/Security/AUDIT-2025-08-17.md)
- **Service Layer**: 🔴 **DUAL IMPLEMENTATIONS** - [SERVICE_LAYER.md](../02-Architecture/SERVICE_LAYER.md), [Service Architecture Analysis](/home/pessk/code/dynamic-text/_knowledge/02-Architecture/service-architecture-consolidation-analysis-2025-08-17.md)
- **Service Worker**: [public/sw.js](../../public/sw.js), [PWA_INTEGRATION.md](../04-Integration/PWA_INTEGRATION.md)
- **State Management**: [STATE_MANAGEMENT.md](../02-Architecture/STATE_MANAGEMENT.md)
- **Stores**: [src/stores/](../../src/stores/), [svelte-patterns-analysis.md](../01-Research/Svelte/svelte-patterns-analysis.md)
- **Styling**: [Styling Documentation](../03-Components/Styling/README.md)
- **Svelte 5**: ✅ **WELL IMPLEMENTED** - [svelte-patterns-analysis.md](../01-Research/Svelte/svelte-patterns-analysis.md), [Svelte Audit](/home/pessk/code/dynamic-text/_knowledge/01-Research/Svelte/AUDIT-2025-08-17.md)

### T
- **Technical Debt**: 🔴 **SIGNIFICANT ACCUMULATION** - [TECHNICAL_DEBT.md](../02-Architecture/TECHNICAL_DEBT.md), [Comprehensive Audit](/home/pessk/code/dynamic-text/_knowledge/06-Reviews/comprehensive-audit-2025-01-25-1045.md)
- **Testing**: 🔴 **COVERAGE CRISIS** - [TESTING_STRATEGY.md](../05-Testing/TESTING_STRATEGY.md), [Testing Audit](/home/pessk/code/dynamic-text/_knowledge/01-Research/Testing/AUDIT-2025-08-17.md)
- **Test Coverage Contradictions**: Claims of 100% vs audit findings of uncertainty
- **TPN Calculations**: 🔴 **PARTIAL SAFETY COVERAGE** - [MEDICAL_SAFETY_PATTERNS.md](../03-Patterns/MEDICAL_SAFETY_PATTERNS.md), [src/lib/tpnLegacy.ts](../../src/lib/tpnLegacy.ts)

### U
- **Unit Testing**: [UNIT_TEST_PATTERNS.md](../05-Testing/UNIT_TEST_PATTERNS.md)
- **UI/UX**: 🔴 **COMPONENT SIZE VIOLATIONS** - [UI/UX Audit](/home/pessk/code/dynamic-text/_knowledge/01-Research/UI-UX/AUDIT-2025-08-17.md)

### V
- **Version Control**: [src/lib/VersionHistory.svelte](../../src/lib/VersionHistory.svelte)
- **Vite**: [BUNDLE_OPTIMIZATION.md](../06-Performance/BUNDLE_OPTIMIZATION.md), [vite.config.ts](../../vite.config.ts)
- **Vitest**: [UNIT_TEST_PATTERNS.md](../05-Testing/UNIT_TEST_PATTERNS.md), [vitest.config.ts](../../vitest.config.ts)

### W
- **Web Vitals**: [MONITORING_STRATEGY.md](../06-Performance/MONITORING_STRATEGY.md)
- **Web Workers**: [WORKER_INTEGRATION.md](../04-Integration/WORKER_INTEGRATION.md), [public/workers/](../../public/workers/)
- **Workflows**: [08-Workflows/](../08-Workflows/)

## 🔍 Index by File Type (Updated)

### Critical Files Requiring Immediate Attention
- `src/App.svelte` - 🔴 **2,476 lines - EXCEEDS LIMITS BY 495%**
- `src/lib/IngredientManager.svelte` - 🔴 **2,491 lines - CRITICAL VIOLATION**
- `src/lib/Sidebar.svelte` - 🔴 **4,247 lines - EXTREME VIOLATION**
- `firestore.rules` - 🔴 **Security rules mismatch with data structure**

### Configuration Files
- `vite.config.ts` - Build configuration
- `vitest.config.ts` - Test configuration
- `playwright.config.ts` - E2E test configuration (needs mobile enablement)
- `firestore.rules` - 🔴 **Security rules (CRITICAL MISMATCH)**
- `firestore.indexes.json` - Database indexes
- `tsconfig.json` - TypeScript configuration
- `vercel.json` - Deployment configuration

### Core Application Files
- `src/App.svelte` - 🔴 **Main application (URGENT REFACTORING NEEDED)**
- `src/main.ts` - Application entry point
- `src/app.scss` - Global styles

### Store Files (Well Implemented - Svelte 5 Runes)
- `src/stores/sectionStore.svelte.ts` - Section management
- `src/stores/workspaceStore.svelte.ts` - Workspace state
- `src/stores/testStore.svelte.ts` - Test management
- `src/stores/tpnStore.svelte.ts` - TPN state
- `src/stores/uiStore.svelte.ts` - UI state

### Service Files (Needs Consolidation)
- `src/lib/firebase.ts` - Firebase configuration
- `src/lib/firebaseDataService.ts` - Data operations
- `src/lib/services/FirebaseService.ts` - 🔴 **Service orchestration (DUAL IMPLEMENTATION)**
- `src/lib/services/performanceService.ts` - Performance monitoring
- `src/lib/services/workerService.ts` - Worker management
- `src/services/` - 🔴 **Duplicate service layer (CONSOLIDATION NEEDED)**

### Worker Files
- `public/workers/tpnWorker.js` - TPN calculations
- `public/workers/codeWorker.js` - Code execution
- `public/sw.js` - Service worker

### Test Files (Status Uncertain)
- `tests/**/*.test.ts` - 🔴 **Unit tests (COVERAGE UNCERTAIN)**
- `e2e/*.spec.ts` - E2E tests
- `api/generate-tests.ts` - AI test generation

## 🏷️ Index by Pattern (Updated with Issues)

### Svelte Patterns (✅ Well Implemented)
- `$state` - Reactive state management
- `$derived` - Computed values
- `$effect` - Side effects
- `$props` - Component properties

### Firebase Patterns (🔴 Security Issues)
- Real-time sync with `onSnapshot`
- Batch operations with `writeBatch`
- Offline persistence
- 🔴 **Security rules (CRITICAL MISMATCH)**

### Performance Patterns (🟡 Needs Optimization)
- Web Worker offloading
- 🟡 **Multi-tier caching (BUNDLE SIZE ISSUES)**
- 🟡 **Lazy loading (NOT FULLY IMPLEMENTED)**
- 🟡 **Code splitting (300% OVER TARGET)**

### Testing Patterns (🔴 Coverage Crisis)
- Factory patterns for test data
- 🔴 **Medical assertions (PARTIAL COVERAGE)**
- AI-powered generation
- E2E user journeys

## 🚨 Critical Files (Updated Priority)

### Medical Safety Critical (🔴 Urgent)
- `src/lib/tpnLegacy.ts` - Core TPN calculations (PARTIAL TEST COVERAGE)
- `src/lib/tpnReferenceRanges.ts` - Medical ranges
- `src/lib/MEDICAL_SAFETY_PATTERNS.md` - Safety documentation

### Architecture Critical (🔴 Blocking Development)
- `src/App.svelte` - 🔴 **2,476 lines - IMMEDIATE REFACTORING REQUIRED**
- `src/lib/IngredientManager.svelte` - 🔴 **2,491 lines**
- `src/lib/Sidebar.svelte` - 🔴 **4,247 lines**

### Performance Critical (🟡 Clinical Impact)
- `public/workers/tpnWorker.js` - Calculation performance
- `src/lib/services/performanceService.ts` - Monitoring
- `vite.config.ts` - Build optimization (BUNDLE SIZE ISSUES)

### Security Critical (🔴 Medical Data Risk)
- `firestore.rules` - 🔴 **Database security (RULES MISMATCH)**
- `src/lib/services/base/ErrorService.ts` - Error handling
- Authentication patterns (ANONYMOUS ONLY - INAPPROPRIATE)

## 📊 Documentation Coverage (Post-Audit Assessment)

| Area | Coverage | Status | Critical Issues |
|------|----------|--------|-----------------| 
| **Current State** | 100% | 🔴 **CRITICAL** | Health assessment complete |
| **Architecture** | 100% | 🔴 **VIOLATIONS IDENTIFIED** | Component size limits exceeded |
| **Svelte Patterns** | 100% | ✅ **Complete** | Well implemented |
| **Firebase** | 100% | 🔴 **SECURITY ISSUES** | Rules mismatch identified |
| **Testing** | 100% | 🔴 **COVERAGE CRISIS** | Contradictory findings |
| **Performance** | 100% | 🟡 **OPTIMIZATION NEEDED** | Bundle size 300% over target |
| **Security** | 100% | 🔴 **VULNERABILITIES FOUND** | Medical data at risk |
| **Medical Domain** | 100% | 🔴 **PARTIAL SAFETY** | TPN calculations need full coverage |

## 📂 Newly Added Documentation (2025-01-25)

### Critical Assessments
- **[Current State Assessment](/home/pessk/code/dynamic-text/_knowledge/00-Overview/CURRENT_STATE.md)** - Complete project health metrics
- **[Comprehensive Audit 2025-01-25](/home/pessk/code/dynamic-text/_knowledge/06-Reviews/comprehensive-audit-2025-01-25-1045.md)** - Multi-domain analysis revealing critical issues
- **[Rapid Prototyping Roadmap](/home/pessk/code/dynamic-text/_knowledge/06-Reviews/RAPID_PROTOTYPING_ROADMAP.md)** - 6-week development acceleration plan

### Specialized Audits (All from 2025 audit series)
- **[Testing Audit](/home/pessk/code/dynamic-text/_knowledge/01-Research/Testing/AUDIT-2025-08-17.md)** - Coverage crisis identified
- **[Architecture Audit](/home/pessk/code/dynamic-text/_knowledge/02-Architecture/AUDIT-2025-08-17.md)** - Component violations documented
- **[Security Audit](/home/pessk/code/dynamic-text/_knowledge/01-Research/Security/AUDIT-2025-08-17.md)** - Firebase vulnerabilities found
- **[Performance Audit](/home/pessk/code/dynamic-text/_knowledge/01-Research/Performance/AUDIT-2025-08-17.md)** - Bundle size analysis
- **[UI/UX Audit](/home/pessk/code/dynamic-text/_knowledge/01-Research/UI-UX/AUDIT-2025-08-17.md)** - Component size violations
- **[Firebase Audit](/home/pessk/code/dynamic-text/_knowledge/01-Research/Firebase/AUDIT-2025-08-17.md)** - Security rule analysis
- **[Svelte Audit](/home/pessk/code/dynamic-text/_knowledge/01-Research/Svelte/AUDIT-2025-08-17.md)** - Framework implementation review
- **[Data Flow Audit](/home/pessk/code/dynamic-text/_knowledge/03-Data-Flow/AUDIT-2025-08-17.md)** - Service architecture analysis

### Architecture & Planning (Updated Status)
- [VERSIONING_ROADMAP.md](../02-Architecture/VERSIONING_ROADMAP.md) - Complete versioning system roadmap
- [FIREBASE_INTEGRATION.md](../02-Architecture/FIREBASE_INTEGRATION.md) - Firebase integration guide
- [FIREBASE_OPTIMIZATION.md](../02-Architecture/FIREBASE_OPTIMIZATION.md) - Firebase optimization strategies
- [APP_REFACTORING_SUMMARY.md](../02-Architecture/APP_REFACTORING_SUMMARY.md) - 🔴 **App.svelte refactoring URGENT**
- [Service Architecture Consolidation](/home/pessk/code/dynamic-text/_knowledge/02-Architecture/service-architecture-consolidation-analysis-2025-08-17.md) - Dual implementation issues

### Styling & Components (✅ Complete)
- [Styling Documentation Index](../03-Components/Styling/README.md) - Complete SCSS migration documentation
- [SCSS_MIGRATION_PLAN.md](../03-Components/Styling/SCSS_MIGRATION_PLAN.md) - Migration strategy
- [DESIGN_SYSTEM_IMPLEMENTATION.md](../03-Components/Styling/DESIGN_SYSTEM_IMPLEMENTATION.md) - Design system details

### Features
- [Features Documentation Index](../06-Features/README.md) - All feature documentation
- [INGREDIENT_EXTRACTION_FEATURE.md](../06-Features/INGREDIENT_EXTRACTION_FEATURE.md) - Ingredient extraction
- [SINGLE_DOMAIN_HEALTH_SYSTEMS.md](../06-Features/SINGLE_DOMAIN_HEALTH_SYSTEMS.md) - Health system support

### Technical Decisions
- [PWA_IMPLEMENTATION.md](../04-Decisions/PWA_IMPLEMENTATION.md) - PWA implementation details
- [ACCESSIBILITY_IMPROVEMENTS.md](../04-Decisions/ACCESSIBILITY_IMPROVEMENTS.md) - Accessibility enhancements
- [PERFORMANCE_OPTIMIZATION_GUIDE.md](../04-Decisions/PERFORMANCE_OPTIMIZATION_GUIDE.md) - Performance strategies

### Testing (🔴 Critical Status)
- [TEST_COVERAGE_IMPROVEMENT_SUMMARY.md](../05-Testing/TEST_COVERAGE_IMPROVEMENT_SUMMARY.md) - Test improvements
- [AI_TEST_GENERATION_TROUBLESHOOTING.md](../05-Testing/AI_TEST_GENERATION_TROUBLESHOOTING.md) - AI test generation
- [Comprehensive Testing Audit](/home/pessk/code/dynamic-text/_knowledge/01-Research/Testing/comprehensive-testing-audit-2025-08-17-1745.md) - Deep testing analysis

### Issues & Fixes
- [Issues Documentation Index](../07-Issues/README.md) - All resolved issues
- [FIREBASE_ID_NORMALIZATION_SUMMARY.md](../07-Issues/FIREBASE_ID_NORMALIZATION_SUMMARY.md) - Firebase ID fixes
- [CHOC_IMPORT_FIX.md](../07-Issues/CHOC_IMPORT_FIX.md) - CHOC import resolution

## 🔗 Quick Links (Priority Order)

### 🚨 Critical Issues - Start Here
- **[Current State Assessment](/home/pessk/code/dynamic-text/_knowledge/00-Overview/CURRENT_STATE.md)** - Project health overview
- **[Comprehensive Audit Results](/home/pessk/code/dynamic-text/_knowledge/06-Reviews/comprehensive-audit-2025-01-25-1045.md)** - Critical issues identified
- **[Rapid Prototyping Roadmap](/home/pessk/code/dynamic-text/_knowledge/06-Reviews/RAPID_PROTOTYPING_ROADMAP.md)** - Solution strategy

### Getting Started
- [README.md](./README.md)
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)
- [DEVELOPMENT_WORKFLOW.md](../08-Workflows/DEVELOPMENT_WORKFLOW.md)

### Architecture (🔴 Critical Issues)
- [SYSTEM_ARCHITECTURE.md](../02-Architecture/SYSTEM_ARCHITECTURE.md)
- [COMPONENT_HIERARCHY.md](../02-Architecture/COMPONENT_HIERARCHY.md)
- [STATE_MANAGEMENT.md](../02-Architecture/STATE_MANAGEMENT.md)
- **[Architecture Audit](/home/pessk/code/dynamic-text/_knowledge/02-Architecture/AUDIT-2025-08-17.md)** - Component violations

### Key Patterns
- [MEDICAL_SAFETY_PATTERNS.md](../03-Patterns/MEDICAL_SAFETY_PATTERNS.md)
- [REACTIVE_PATTERNS.md](../03-Patterns/REACTIVE_PATTERNS.md)
- [CACHING_STRATEGIES.md](../03-Patterns/CACHING_STRATEGIES.md)

### Testing (🔴 Coverage Crisis)
- [TESTING_STRATEGY.md](../05-Testing/TESTING_STRATEGY.md)
- [MEDICAL_TEST_SCENARIOS.md](../05-Testing/MEDICAL_TEST_SCENARIOS.md)
- **[Testing Audit](/home/pessk/code/dynamic-text/_knowledge/01-Research/Testing/AUDIT-2025-08-17.md)** - Coverage analysis

### Performance (🟡 Optimization Needed)
- [PERFORMANCE_GUIDELINES.md](../06-Performance/PERFORMANCE_GUIDELINES.md)
- [MONITORING_STRATEGY.md](../06-Performance/MONITORING_STRATEGY.md)
- **[Performance Audit](/home/pessk/code/dynamic-text/_knowledge/01-Research/Performance/AUDIT-2025-08-17.md)** - Bundle analysis

## 🎯 Knowledge Gap Summary

### Immediate Research Needs (P0)
1. **Actual Test Coverage Validation** - Resolve 100% claim vs. audit contradictions
2. **Component Decomposition Strategy** - App.svelte 2,476 → <500 lines plan
3. **Firebase Security Rules Rewrite** - Match actual data structure
4. **Bundle Size Analysis** - Current vs. target measurements
5. **Medical Compliance Audit** - HIPAA requirements gap analysis

### Development Acceleration Opportunities
- **Quick Wins**: 30 minutes each, immediate impact
- **Component Extraction**: Automated tools for refactoring
- **Testing Automation**: AI-powered test generation
- **Performance Monitoring**: Real-time regression detection
- **Quality Gates**: Automated size and coverage limits

## 📈 Success Metrics & Tracking

### Critical Path Success (6-Week Timeline)
- [ ] App.svelte: <500 lines (from 2,476)
- [ ] Firebase security: 0 critical vulnerabilities
- [ ] Test coverage: >80% with medical focus
- [ ] Bundle size: <800KB (from ~1.5MB)
- [ ] Development velocity: 70% improvement

### Quality Indicators
- **Health Score**: 6.2/10 → 9.0/10 target
- **Medical Safety**: Partial → Full TPN coverage
- **Development Experience**: 40% slower → 60% faster
- **Production Readiness**: Not ready → Clinical deployment ready

---

**⚠️ CRITICAL STATUS**: This index reflects post-comprehensive-audit findings. The project requires immediate attention to critical issues before any new feature development. Priority should be given to the 6-week rapid prototyping roadmap to achieve production readiness for medical deployment.**

*Use this index to quickly navigate the knowledge base. Press Ctrl/Cmd+F to search for any term.*
*Status as of 2025-01-25: Critical issues identified, solution roadmap established*