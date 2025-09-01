import { test, expect } from '@playwright/test';

test.describe('KPT CRUD Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for app to load
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 });
  });

  test('should create, edit, and delete a custom KPT function', async ({ page }) => {
    // Navigate to KPT functions section
    await page.click('button:has-text("KPT Functions")');
    
    // Click create new function button
    await page.click('button:has-text("Create New Function")');
    
    // Fill in function details
    await page.fill('input[name="functionName"]', 'testCalculation');
    await page.selectOption('select[name="category"]', 'math');
    await page.fill('input[name="signature"]', 'testCalculation(a: number, b: number): number');
    await page.fill('textarea[name="description"]', 'Test calculation function');
    await page.fill('textarea[name="code"]', 'return a + b * 2;');
    
    // Save the function
    await page.click('button:has-text("Create Function")');
    
    // Verify success message
    await expect(page.locator('text=Function created successfully')).toBeVisible();
    
    // Verify function appears in list
    await expect(page.locator('text=testCalculation')).toBeVisible();
    
    // Test the function in the editor
    await page.click('button:has-text("Test Editor")');
    await page.click('button:has-text("Dynamic")');
    
    const editor = page.locator('.cm-content');
    await editor.click();
    await page.keyboard.type('const result = me.kpt.testCalculation(5, 3);\nreturn result;');
    
    // Run preview
    await page.click('button:has-text("Preview")');
    
    // Check result (5 + 3 * 2 = 11)
    await expect(page.locator('.preview-content')).toContainText('11');
    
    // Edit the function
    await page.click('button:has-text("KPT Functions")');
    await page.click('button[aria-label="Edit testCalculation"]');
    
    // Update the code
    await page.fill('textarea[name="code"]', 'return (a + b) * 2;');
    await page.click('button:has-text("Save Changes")');
    
    // Verify update success
    await expect(page.locator('text=Function updated successfully')).toBeVisible();
    
    // Test updated function
    await page.click('button:has-text("Test Editor")');
    await page.click('button:has-text("Clear")');
    await page.keyboard.type('const result = me.kpt.testCalculation(5, 3);\nreturn result;');
    await page.click('button:has-text("Preview")');
    
    // Check updated result ((5 + 3) * 2 = 16)
    await expect(page.locator('.preview-content')).toContainText('16');
    
    // Delete the function
    await page.click('button:has-text("KPT Functions")');
    await page.click('button[aria-label="Delete testCalculation"]');
    
    // Confirm deletion
    await page.click('button:has-text("Confirm Delete")');
    
    // Verify deletion success
    await expect(page.locator('text=Function deleted successfully')).toBeVisible();
    
    // Verify function no longer appears
    await expect(page.locator('text=testCalculation')).not.toBeVisible();
  });

  test('should persist custom functions across sessions', async ({ page, context }) => {
    // Create a custom function
    await page.click('button:has-text("KPT Functions")');
    await page.click('button:has-text("Create New Function")');
    
    await page.fill('input[name="functionName"]', 'persistentFunc');
    await page.selectOption('select[name="category"]', 'utility');
    await page.fill('input[name="signature"]', 'persistentFunc(): string');
    await page.fill('textarea[name="description"]', 'Persistent function test');
    await page.fill('textarea[name="code"]', 'return "I persist!";');
    
    await page.click('button:has-text("Create Function")');
    await expect(page.locator('text=Function created successfully')).toBeVisible();
    
    // Close and reopen the page
    await page.close();
    const newPage = await context.newPage();
    await newPage.goto('http://localhost:5173');
    await newPage.waitForSelector('[data-testid="app-loaded"]');
    
    // Check if function still exists
    await newPage.click('button:has-text("KPT Functions")');
    await expect(newPage.locator('text=persistentFunc')).toBeVisible();
    
    // Test the persisted function
    await newPage.click('button:has-text("Test Editor")');
    await newPage.click('button:has-text("Dynamic")');
    
    const editor = newPage.locator('.cm-content');
    await editor.click();
    await newPage.keyboard.type('return me.kpt.persistentFunc();');
    
    await newPage.click('button:has-text("Preview")');
    await expect(newPage.locator('.preview-content')).toContainText('I persist!');
  });

  test('should export and import KPT function libraries', async ({ page }) => {
    // Create multiple functions
    const functions = [
      { name: 'exportFunc1', code: 'return "func1";' },
      { name: 'exportFunc2', code: 'return "func2";' },
      { name: 'exportFunc3', code: 'return "func3";' }
    ];
    
    for (const func of functions) {
      await page.click('button:has-text("KPT Functions")');
      await page.click('button:has-text("Create New Function")');
      
      await page.fill('input[name="functionName"]', func.name);
      await page.selectOption('select[name="category"]', 'text');
      await page.fill('input[name="signature"]', `${func.name}(): string`);
      await page.fill('textarea[name="description"]', `Export test ${func.name}`);
      await page.fill('textarea[name="code"]', func.code);
      
      await page.click('button:has-text("Create Function")');
      await page.waitForSelector('text=Function created successfully');
    }
    
    // Export functions
    await page.click('button:has-text("Export Library")');
    
    // Handle download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Download Export")')
    ]);
    
    const fileName = download.suggestedFilename();
    expect(fileName).toContain('kpt-functions');
    expect(fileName).toContain('.json');
    
    // Clear all custom functions
    for (const func of functions) {
      await page.click(`button[aria-label="Delete ${func.name}"]`);
      await page.click('button:has-text("Confirm Delete")');
      await page.waitForSelector('text=Function deleted successfully');
    }
    
    // Verify functions are gone
    for (const func of functions) {
      await expect(page.locator(`text=${func.name}`)).not.toBeVisible();
    }
    
    // Import the exported file
    await page.click('button:has-text("Import Library")');
    
    // Upload the file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(await download.path());
    
    await page.click('button:has-text("Import Functions")');
    
    // Verify import success
    await expect(page.locator('text=3 functions imported successfully')).toBeVisible();
    
    // Verify all functions are restored
    for (const func of functions) {
      await expect(page.locator(`text=${func.name}`)).toBeVisible();
    }
  });

  test('should validate custom functions before saving', async ({ page }) => {
    await page.click('button:has-text("KPT Functions")');
    await page.click('button:has-text("Create New Function")');
    
    // Try to create function with invalid syntax
    await page.fill('input[name="functionName"]', 'invalidFunc');
    await page.selectOption('select[name="category"]', 'math');
    await page.fill('input[name="signature"]', 'invalidFunc(): void');
    await page.fill('textarea[name="description"]', 'Invalid function test');
    await page.fill('textarea[name="code"]', 'return {{{{;'); // Invalid syntax
    
    await page.click('button:has-text("Create Function")');
    
    // Should show validation error
    await expect(page.locator('text=Invalid function syntax')).toBeVisible();
    
    // Function should not be created
    await page.click('button:has-text("Cancel")');
    await expect(page.locator('text=invalidFunc')).not.toBeVisible();
    
    // Try with reserved keyword
    await page.click('button:has-text("Create New Function")');
    await page.fill('input[name="functionName"]', 'function'); // Reserved keyword
    
    // Should show error immediately
    await expect(page.locator('text=reserved keyword')).toBeVisible();
    
    // Try with unsafe code
    await page.fill('input[name="functionName"]', 'unsafeFunc');
    await page.fill('textarea[name="code"]', 'eval("alert(1)")'); // Unsafe code
    
    await page.click('button:has-text("Create Function")');
    await expect(page.locator('text=unsafe code patterns')).toBeVisible();
  });

  test('should handle conflicts during import', async ({ page }) => {
    // Create a function
    await page.click('button:has-text("KPT Functions")');
    await page.click('button:has-text("Create New Function")');
    
    await page.fill('input[name="functionName"]', 'conflictFunc');
    await page.selectOption('select[name="category"]', 'math');
    await page.fill('input[name="signature"]', 'conflictFunc(): number');
    await page.fill('textarea[name="description"]', 'Original function');
    await page.fill('textarea[name="code"]', 'return 1;');
    
    await page.click('button:has-text("Create Function")');
    await expect(page.locator('text=Function created successfully')).toBeVisible();
    
    // Export it
    await page.click('button:has-text("Export Library")');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Download Export")')
    ]);
    
    // Modify the existing function
    await page.click('button[aria-label="Edit conflictFunc"]');
    await page.fill('textarea[name="code"]', 'return 2;');
    await page.click('button:has-text("Save Changes")');
    
    // Import the original version
    await page.click('button:has-text("Import Library")');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(await download.path());
    
    // Should show conflict resolution dialog
    await page.click('button:has-text("Import Functions")');
    await expect(page.locator('text=Function conflict detected')).toBeVisible();
    await expect(page.locator('text=conflictFunc already exists')).toBeVisible();
    
    // Choose to skip
    await page.click('button:has-text("Skip")');
    await expect(page.locator('text=0 functions imported, 1 skipped')).toBeVisible();
    
    // Verify original version is kept
    await page.click('button[aria-label="Edit conflictFunc"]');
    const codeValue = await page.locator('textarea[name="code"]').inputValue();
    expect(codeValue).toBe('return 2;');
  });

  test('should show function version history', async ({ page }) => {
    // Create a function
    await page.click('button:has-text("KPT Functions")');
    await page.click('button:has-text("Create New Function")');
    
    await page.fill('input[name="functionName"]', 'versionedFunc');
    await page.selectOption('select[name="category"]', 'math');
    await page.fill('input[name="signature"]', 'versionedFunc(): number');
    await page.fill('textarea[name="description"]', 'Version 1');
    await page.fill('textarea[name="code"]', 'return 1;');
    
    await page.click('button:has-text("Create Function")');
    await expect(page.locator('text=Function created successfully')).toBeVisible();
    
    // Edit multiple times to create history
    for (let i = 2; i <= 3; i++) {
      await page.click('button[aria-label="Edit versionedFunc"]');
      await page.fill('textarea[name="description"]', `Version ${i}`);
      await page.fill('textarea[name="code"]', `return ${i};`);
      await page.click('button:has-text("Save Changes")');
      await page.waitForSelector('text=Function updated successfully');
    }
    
    // View version history
    await page.click('button[aria-label="Edit versionedFunc"]');
    await page.click('button:has-text("View History")');
    
    // Should show all versions
    await expect(page.locator('text=Version 1')).toBeVisible();
    await expect(page.locator('text=Version 2')).toBeVisible();
    await expect(page.locator('text=Version 3')).toBeVisible();
    
    // Restore version 1
    await page.click('button[aria-label="Restore Version 1"]');
    await page.click('button:has-text("Confirm Restore")');
    
    await expect(page.locator('text=Version restored successfully')).toBeVisible();
    
    // Verify function is restored
    const codeValue = await page.locator('textarea[name="code"]').inputValue();
    expect(codeValue).toBe('return 1;');
  });
});