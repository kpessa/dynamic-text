# Playwright MCP Test Patterns & Best Practices

## Overview

This document outlines the test patterns and best practices for using Playwright with MCP (Model Context Protocol) browser automation in the TPN Dynamic Text Editor project.

## Test Structure

### File Organization
```
e2e/
├── mcp-demo.spec.ts           # Basic MCP demonstrations
├── mcp-browser-test.spec.ts   # Core browser automation
├── mcp-advanced.spec.ts       # Advanced MCP features
├── mcp-tpn-integration.spec.ts # TPN-specific tests
└── MCP_TEST_PATTERNS.md       # This documentation
```

## Key Patterns

### 1. Robust Element Selection

Always use multiple fallback selectors:

```typescript
// ✅ Good - Multiple selector strategies
const editor = page.locator('.cm-content, textarea, [contenteditable="true"]').first();

// ✅ Good - Exact text matching for buttons
const addButton = page.getByRole('button', { name: '+ Add HTML Section' });

// ❌ Avoid - Single brittle selector
const editor = page.locator('.section-html .editor');
```

### 2. Proper Wait Strategies

```typescript
// ✅ Good - Wait for specific elements
await expect(editor).toBeVisible({ timeout: 10000 });

// ✅ Good - Wait for network idle after navigation
await page.waitForLoadState('networkidle');

// ✅ Good - Strategic timeouts for animations
await page.waitForTimeout(1000); // After adding sections

// ❌ Avoid - Arbitrary long waits
await page.waitForTimeout(5000); // Too long, wastes time
```

### 3. Console Output for Debugging

```typescript
// ✅ Good - Structured console output
console.log('🏥 TPN Calculation Workflow Test\n');
console.log('Step 1: Enabling TPN Mode...');
console.log('  ✅ TPN Mode enabled');

// ✅ Good - Progress indicators
console.log(`Found ${editorCount} editor(s)`);
```

### 4. Screenshot Documentation

```typescript
// ✅ Good - Meaningful screenshot names
await page.screenshot({
  path: 'screenshots/mcp-tpn-complete-workflow.png',
  fullPage: true
});

// ✅ Good - Visual regression snapshots
await page.screenshot({
  path: `screenshots/visual-${testState}.png`,
  fullPage: false // Consistent viewport size
});
```

## MCP-Specific Features

### 1. Browser State Management
```typescript
// LocalStorage manipulation
await page.evaluate(() => {
  localStorage.setItem('tpn-test-mode', 'true');
});

// Session storage
await page.evaluate(() => {
  sessionStorage.setItem('session-id', 'test-123');
});
```

### 2. Accessibility Tree Navigation
```typescript
// Get accessibility snapshot
const snapshot = await page.accessibility.snapshot();

// Navigate by role
const button = page.getByRole('button', { name: 'Save' });
```

### 3. Network Monitoring
```typescript
// Track API calls
page.on('request', request => {
  if (request.url().includes('api')) {
    console.log(`API Call: ${request.method()} ${request.url()}`);
  }
});
```

### 4. Performance Metrics
```typescript
const metrics = await page.evaluate(() => {
  const navigation = performance.getEntriesByType('navigation')[0];
  return {
    ttfb: navigation.responseStart - navigation.requestStart,
    domLoad: navigation.domContentLoadedEventEnd
  };
});
```

## TPN-Specific Testing

### 1. Testing Dynamic JavaScript Sections
```typescript
// Add JavaScript with TPN calculations
const tpnCode = `
const weight = 75;
const proteinReq = weight * 1.5;
return \`Protein: \${proteinReq}g/day\`;
`;
await page.keyboard.type(tpnCode);
```

### 2. Testing me.getValue() Function
```typescript
// Safe pattern for testing TPN context
const code = `
try {
  const weight = me.getValue ? me.getValue('weight') || 70 : 70;
  return \`Weight: \${weight} kg\`;
} catch (error) {
  return 'TPN context not available';
}
`;
```

### 3. Ingredient Management
```typescript
// Search for ingredients
const searchInput = page.locator('input[placeholder*="search" i]');
await searchInput.fill('amino acid');
```

## Common Issues & Solutions

### Issue 1: Elements Not Found
**Problem**: Test fails with "element not found"
**Solution**: Use more generic selectors and proper waits
```typescript
// Instead of specific class
const editor = page.locator('.cm-content, textarea, [contenteditable="true"]');
await expect(editor.first()).toBeVisible({ timeout: 10000 });
```

### Issue 2: Timing Issues
**Problem**: Actions happen too fast for the UI
**Solution**: Add strategic waits after state changes
```typescript
await addButton.click();
await page.waitForTimeout(1000); // Wait for animation
await expect(newElement).toBeVisible();
```

### Issue 3: Multiple Editors
**Problem**: Can't distinguish between multiple editors
**Solution**: Use nth() selector or count verification
```typescript
const allEditors = page.locator('.cm-content');
await expect(allEditors).toHaveCount(2);
const secondEditor = allEditors.nth(1);
```

## Running Tests

### Individual Tests
```bash
# Run specific test file
pnpm exec playwright test e2e/mcp-demo.spec.ts

# Run specific test
pnpm exec playwright test e2e/mcp-demo.spec.ts:15

# Run with visible browser
pnpm exec playwright test --headed

# Run only on Chromium
pnpm exec playwright test --project=chromium
```

### Debug Mode
```bash
# Debug mode with inspector
pnpm exec playwright test --debug

# Generate trace for debugging
pnpm exec playwright test --trace on
```

### Parallel Execution
```bash
# Run tests in parallel (default)
pnpm exec playwright test

# Run tests sequentially
pnpm exec playwright test --workers=1
```

## Best Practices

1. **Keep Tests Independent**: Each test should be able to run in isolation
2. **Use BeforeEach Wisely**: Reset state in beforeEach hooks
3. **Meaningful Test Names**: Describe what the test validates
4. **Document with Screenshots**: Capture key states for debugging
5. **Handle Errors Gracefully**: Use try-catch for non-critical operations
6. **Console Logging**: Add progress indicators for long tests
7. **Cleanup**: Close extra tabs/windows in afterEach
8. **Viewport Testing**: Test responsive behavior at key breakpoints
9. **Performance Budgets**: Fail tests if interactions are too slow
10. **Accessibility First**: Use semantic selectors when possible

## MCP Browser Control API

Key MCP-specific browser methods used:

- `browser_navigate`: Navigate to URL
- `browser_click`: Click elements by reference
- `browser_type`: Type text into elements
- `browser_snapshot`: Get accessibility tree
- `browser_take_screenshot`: Capture screenshots
- `browser_wait_for`: Wait for conditions
- `browser_evaluate`: Execute JavaScript
- `browser_console_messages`: Get console output

## Continuous Integration

For CI environments:
```typescript
// playwright.config.ts adjustments
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
});
```

## Future Enhancements

1. **Visual Regression Testing**: Implement pixel comparison
2. **API Mocking**: Mock Firebase/API responses for consistency
3. **Performance Benchmarks**: Track metrics over time
4. **Accessibility Audits**: Automated WCAG compliance checks
5. **Cross-browser Matrix**: Expand browser coverage
6. **Mobile Emulation**: Test on emulated devices
7. **Data-driven Tests**: Parameterized test scenarios
8. **Custom Reporters**: Generate TPN-specific test reports

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [MCP Protocol Spec](https://github.com/anthropics/mcp)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- Project: `e2e/` directory for examples