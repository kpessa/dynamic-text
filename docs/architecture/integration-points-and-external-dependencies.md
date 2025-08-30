# Integration Points and External Dependencies

- **Firebase**: The most critical external dependency. Used for data persistence, authentication, and real-time synchronization. All interactions are managed through the `firebaseDataService.ts`.
- **Google Generative AI**: Used by the `api/generate-tests.ts` endpoint for AI-powered test case generation. Requires a `GEMINI_API_KEY`.
- **Babel CDN**: Used for transpiling user-provided JavaScript in the browser.
