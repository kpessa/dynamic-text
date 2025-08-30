# Coding Standards

## Critical Fullstack Rules

- **Type Sharing:** Always define shared types in `src/lib/types.ts` and import from there
- **API Calls:** Never make direct HTTP calls - use the service layer (`apiClient`)
- **Environment Variables:** Access only through `import.meta.env` for Vite, never `process.env` directly in frontend
- **Error Handling:** All API routes must use the standard error handler from `api/_lib/errors.ts`
- **State Updates:** Never mutate state directly - use proper Svelte store methods or runes
- **Secure Execution:** All user JavaScript must run through `SecureCodeExecution` service
- **HTML Sanitization:** All user HTML must pass through DOMPurify before rendering
- **Firebase Operations:** Use `firebaseDataService` wrapper, never direct SDK calls in components

## Naming Conventions

| Element | Frontend | Backend | Example |
|---------|----------|---------|---------|
| Components | PascalCase | - | `UserProfile.svelte` |
| Stores | camelCase | - | `sectionStore.svelte.ts` |
| Services | camelCase | camelCase | `exportService.ts` |
| API Routes | - | kebab-case | `/api/generate-tests` |
| Types/Interfaces | PascalCase | PascalCase | `Section`, `TestCase` |
| Constants | UPPER_SNAKE | UPPER_SNAKE | `MAX_RETRIES` |
| CSS Classes | kebab-case | - | `section-editor` |
| Event Handlers | handleX | - | `handleClick` |
