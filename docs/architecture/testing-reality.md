# Testing Reality

- **E2E Tests**: Very strong. The `e2e/` directory is well-populated with specs for all major workflows.
- **Unit Tests**: Present but coverage is likely incomplete. Located in `tests/` and `src/lib/__tests__/`.
- **Running Tests**:
    ```bash
    pnpm test:e2e # Runs Playwright E2E tests
    pnpm test:unit # Runs Vitest unit tests
    ```
