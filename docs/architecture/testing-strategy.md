# Testing Strategy

## Testing Pyramid

```text
        E2E Tests (10%)
        /              \
    Integration Tests (30%)
    /                    \
Frontend Unit (30%)  Backend Unit (30%)
```

## Test Organization

### Frontend Tests
```text
tests/
├── components/
│   ├── CodeEditor.test.ts
│   ├── Preview.test.ts
│   └── TestRunner.test.ts
├── services/
│   ├── secureCodeExecution.test.ts
│   └── exportService.test.ts
└── stores/
    └── sectionStore.test.ts
```

### Backend Tests
```text
api/__tests__/
├── generate-tests.test.ts
└── _lib/
    ├── auth.test.ts
    └── gemini.test.ts
```

### E2E Tests
```text
e2e/specs/
├── auth.spec.ts
├── editor.spec.ts
├── preview.spec.ts
├── testing.spec.ts
└── firebase-sync.spec.ts
```

## Test Examples

### Frontend Component Test
```typescript
// tests/components/Preview.test.ts
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import Preview from '$lib/components/Preview.svelte';

describe('Preview Component', () => {
  it('renders static HTML content', async () => {
    const sections = [{
      id: '1',
      type: 'static' as const,
      name: 'Test',
      content: '<h1>Hello World</h1>',
      order: 0,
      isActive: true
    }];
    
    render(Preview, { props: { sections } });
    
    const heading = await screen.findByRole('heading');
    expect(heading).toHaveTextContent('Hello World');
  });
  
  it('executes dynamic JavaScript safely', async () => {
    const sections = [{
      id: '2',
      type: 'dynamic' as const,
      name: 'Dynamic',
      content: 'return "Dynamic: " + (2 + 2);',
      order: 0,
      isActive: true
    }];
    
    render(Preview, { props: { sections } });
    
    const output = await screen.findByText(/Dynamic: 4/);
    expect(output).toBeInTheDocument();
  });
});
```

### Backend API Test
```typescript
// api/__tests__/generate-tests.test.ts
import { describe, it, expect, vi } from 'vitest';
import handler from '../generate-tests';

describe('Generate Tests API', () => {
  it('generates test cases for provided code', async () => {
    const req = {
      method: 'POST',
      body: {
        code: 'return me.getValue("weight") * 2;',
        sectionName: 'Weight Calc',
        context: { populationType: 'adult' }
      }
    };
    
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    
    await handler(req as any, res as any);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        testCases: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            variables: expect.any(Object),
            expectedOutput: expect.any(String)
          })
        ])
      })
    );
  });
});
```

### E2E Test
```typescript
// e2e/specs/editor.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Editor Workflow', () => {
  test('create and preview dynamic section', async ({ page }) => {
    await page.goto('/');
    
    // Create new dynamic section
    await page.click('button:has-text("Add Section")');
    await page.click('button:has-text("Dynamic")');
    
    // Enter code
    const editor = page.locator('.cm-content');
    await editor.fill('return "Hello " + me.getValue("name");');
    
    // Check preview updates
    const preview = page.locator('[data-testid="preview"]');
    await expect(preview).toContainText('Hello');
    
    // Add test case
    await page.click('button:has-text("Add Test")');
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="expectedOutput"]', 'Hello Test User');
    
    // Run test
    await page.click('button:has-text("Run Tests")');
    await expect(page.locator('.test-result')).toContainText('Pass');
  });
});
```
