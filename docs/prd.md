# TPN Dynamic Text Editor - Functionality Restoration PRD

## 1. Intro Project Analysis and Context

This Product Requirements Document (PRD) outlines the work required to restore and stabilize the TPN Dynamic Text Editor following a major refactoring effort. The project's current state, architecture, and technical stack are detailed in the [Brownfield Architecture Document](./brownfield-architecture.md).

## 2. Enhancement Scope Definition

*   **Enhancement Type:** Functionality Restoration & Stabilization, Major Feature Modification, Bug Fix and Stability Improvements.
*   **Enhancement Description:** Restore lost functionality from the recent component refactoring (legacy vs. Skeleton), stabilize the codebase by reconciling old and new components, and ensure all previously working and intended behaviors are fully functional.
*   **Impact Assessment:** Significant Impact. This effort will involve reviewing git history, comparing component versions, and potentially re-integrating logic across multiple parts of the application.

## 3. Goals and Background Context

*   **Goals:** The primary goal is to return the application to a known-good, stable state where all core features are working as intended. This will provide a reliable foundation for future development and iteration.
*   **Background:** A recent, large-scale refactoring was performed to modernize the architecture and decompose a monolithic `App.svelte` component. While architecturally beneficial, this process resulted in the loss of several complex, critical user-facing features. This effort is designed to systematically identify and restore that lost functionality.

## 4. Epic and Story Structure

This entire restoration effort will be managed under a single, comprehensive epic.

### Epic: Functionality Restoration and Stabilization

**Epic Goal:** To restore the application to a stable, fully-functional state by systematically addressing the feature gaps created during the recent architectural refactoring.

--- 

### Prioritized User Stories

#### P0: Foundational Must-Haves

**Story 1: Stabilize Firebase Save/Load Functionality**

*   **As a:** User
*   **I want:** To save my work to Firebase and load it back without losing data or state.
*   **So that:** I can trust the system to persist my work.
*   **Acceptance Criteria:**
    1.  When I click "Save", the entire state (sections, tests, etc.) must be saved to Firebase.
    2.  When I load a configuration from Firebase, the editor must be perfectly restored to its last saved state.
    3.  The UI must provide clear feedback on the save status (e.g., "Last saved at...").

**Story 2: Ensure Correct and Secure Dynamic Text Execution**

*   **As a:** User
*   **I want:** The JavaScript I write in dynamic sections to be executed correctly and securely, with full access to the TPN context (`me` object).
*   **So that:** I can create powerful, data-driven reference texts.
*   **Acceptance Criteria:**
    1.  When I use `me.getValue('some_key')`, the code must correctly retrieve the value from the active TPN context.
    2.  When my code has an error, the preview must display a clear error message.
    3.  All JavaScript execution must happen within the secure Web Worker sandbox.

**Story 3: Restore Real-Time Live Preview**

*   **As a:** User
*   **I want:** To see the rendered output of my sections update in real-time as I type.
*   **So that:** I can get immediate feedback on my work.
*   **Acceptance Criteria:**
    1.  When I edit a static HTML section, the Preview Panel must update instantly.
    2.  When I edit a dynamic JavaScript section, the code must execute and the preview must update instantly.
    3.  When I change a value in the TPN Test Panel, the preview for relevant dynamic sections must immediately re-render.

#### P1: Core Feature Restoration

**Story 4: Restore Test Case Management**

*   **As a:** User
*   **I want:** To create, edit, run, and delete test cases for each dynamic JavaScript section.
*   **So that:** I can verify my logic works correctly under different conditions.
*   **Acceptance Criteria:**
    1.  The UI for managing test cases must be accessible from each dynamic section.
    2.  I must be able to define input variables and the expected output for a test case.
    3.  When a test is run, the system must display a clear "Pass" or "Fail" result.

**Story 5: Fix Import/Export Functionality**

*   **As a:** User
*   **I want:** To reliably export my work into the required JSON format and import a configuration file.
*   **So that:** I can share my work and ensure compatibility.
*   **Acceptance Criteria:**
    1.  Export must generate a JSON file correctly representing all sections.
    2.  Import must correctly parse a valid JSON file and load the content into the editor.
    3.  The process must handle the special delimiters for dynamic text (`[f( ... )]`) correctly.

#### P2: Advanced Feature Restoration

**Story 6: Re-implement AI-Powered Test Generation**

*   **As a:** User
*   **I want:** To automatically generate test cases for my dynamic JavaScript sections using an AI service.
*   **So that:** I can save time and get comprehensive test coverage.
*   **Acceptance Criteria:**
    1.  A "Generate Tests" button must be available for dynamic sections.
    2.  Clicking the button must call the backend AI service.
    3.  The UI must display the proposed tests and allow me to select which ones to import.

**Story 7: Restore Ingredient & Config Diffing Tool**

*   **As a:** User
*   **I want:** A diffing tool to visually compare an ingredient or configuration against another version.
*   **So that:** I can easily identify changes and manage variations.
*   **Acceptance Criteria:**
    1.  A UI option to initiate a comparison must be available.
    2.  The diff view must clearly highlight additions, deletions, and modifications.

**Story 8: Re-implement Version History**

*   **As a:** User
*   **I want:** To view the history of changes for an ingredient.
*   **So that:** I can track its evolution and revert to a previous version if needed.
*   **Acceptance Criteria:**
    1.  A UI option to view version history must be available.
    2.  The history must show a list of saved versions with metadata (commit message, author, date).
    3.  I must be able to view the content of a historical version.

## 5. Out of Scope

*   Any net-new features not described in the user stories above.
*   Major architectural changes beyond what is necessary to restore functionality.
*   UI redesigns; the focus is on restoring functionality within the existing UI structure.

## 6. Sign-off

**Product Owner**: John, PM

**Lead Engineer**: _________________________

**QA Lead**: _________________________

**Date**: 2025-08-29
