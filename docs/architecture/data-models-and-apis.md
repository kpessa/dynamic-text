# Data Models and APIs

## Data Models

The core data model is managed within the application's state and is not formally defined by a schema like in a traditional backend. The main data structures are:

- **Section**: An object representing a piece of content, either `static` (HTML) or `dynamic` (JavaScript). It includes an `id`, `type`, `name`, and `content`. Dynamic sections also contain an array of `testCases`.
- **TestCase**: An object associated with a dynamic section, containing `name`, `variables` (input for the JS code), and `expectedOutput`/`expectedStyles` for validation.
- **Reference**: The top-level object stored in Firebase, representing a full configuration for an ingredient. It contains an array of `sections`, population type, health system, and other metadata.

These models are implicitly defined and managed in `src/lib/stores/sectionStore.svelte.ts` and `src/lib/services/sectionService.ts`.

## API Specifications

- **External APIs**: The application integrates with the Firebase Firestore API for all database operations.
- **Internal APIs**: A serverless function exists at `api/generate-tests.ts`, which likely integrates with an AI service (e.g., Google Gemini, as indicated by `@google/generative-ai` in `package.json`) to generate test cases.
