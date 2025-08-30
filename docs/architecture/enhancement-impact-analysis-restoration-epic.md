# Enhancement Impact Analysis (Restoration Epic)

## Files That Will Need Modification

Based on the restoration requirements in the PRD, these files will be the primary focus:

- **`src/App.svelte`**: This component is central to the issues. It contains legacy functions, manages a large amount of state, and handles the orchestration that is currently broken. Much of the work will involve refactoring and fixing logic here.
- **`src/lib/firebaseDataService.ts`**: To ensure save/load functionality is robust and handles the full application state correctly.
- **`src/lib/services/secureCodeExecution.ts`**: To verify that the `me` context is correctly passed to the web worker and that errors are handled gracefully.
- **`src/lib/services/testingService.ts`**: To restore the full functionality of creating, editing, and running test cases.
- **`src/lib/services/exportService.ts`**: To fix any issues with the JSON export format, especially the dynamic text delimiters.
- **`api/generate-tests.ts`**: To re-enable and verify the AI test generation feature.

## New Files/Modules Needed

It is unlikely that new files will be needed. The focus is on restoring and refactoring existing functionality. However, new unit/integration tests should be created in the `tests/` and `src/lib/__tests__/` directories to cover the restored features.

## Integration Considerations

- **Component Reconciliation**: The primary challenge will be reconciling the behavior of legacy components and new Skeleton-based components. The `USE_SKELETON_UI` flag will be critical in managing this.
- **State Hydration**: When loading data from Firebase, ensuring the Svelte stores are correctly and reactively updated is critical. This is a key integration point between `firebaseDataService.ts` and the stores in `src/lib/stores/`.
- **Legacy Logic**: Care must be taken when removing or refactoring functions marked as "OLD" in `App.svelte` to ensure no critical logic is lost. The git history will be an important reference.
