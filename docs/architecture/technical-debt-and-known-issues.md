# Technical Debt and Known Issues

- **Component Inconsistency**: The codebase contains a mix of older, custom-built Svelte components and newer components based on the Skeleton UI library. `App.svelte` has feature flags (`USE_SKELETON_UI`) and conditional rendering to manage this, indicating an ongoing migration. This is a likely source of the issues targeted by the restoration epic.
- **Legacy Functions**: `App.svelte` contains several functions marked as "OLD - Remove duplicate function" (e.g., `transpileCodeOld`, `sectionsToJSONOld`). This suggests that refactoring has occurred, but cleanup is incomplete and is a key part of the restoration effort.
- **Testing Gaps**: While E2E test coverage appears extensive, unit test coverage is less clear. The `document-project` task template notes "Unit Tests: 60% coverage (Jest)" as an example, but the actual coverage needs to be determined by running `vitest --coverage`. Restoring functionality will require adding targeted unit and integration tests for the affected features.
- **State Management**: While Svelte 5 runes and dedicated stores are used, there is still a significant amount of local UI state managed directly in `App.svelte`. Some of this could likely be moved to more focused stores or child components as part of the stabilization.

## Workarounds and Gotchas

- **Babel via CDN**: Babel is loaded from a CDN at runtime (`lazyBabel.ts`). This is a performance optimization but creates a dependency on the CDN being available.
- **Firebase Configuration**: Firebase credentials must be provided via environment variables (`.env` file) for the integration to work.
- **Manual Test Population**: The `$effect` hook in `App.svelte` that auto-populates test cases with ingredients is complex and could be a source of bugs.
