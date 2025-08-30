import { test, expect } from '@playwright/test';

test.describe('Firebase Sync Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForSelector('.sidebar', { timeout: 10000 });
  });

  test('should save document to Firebase and display last saved timestamp', async ({ page }) => {
    // Add a new static section
    await page.click('button:has-text("Add Static Section")');
    
    // Wait for section to be added
    await page.waitForSelector('.section-item');
    
    // Edit the section content
    const editor = page.locator('.CodeMirror').first();
    await editor.click();
    await page.keyboard.type('Test content for Firebase save');
    
    // Save to Firebase
    await page.click('button:has-text("Save to Firebase")');
    
    // Wait for save to complete
    await page.waitForSelector('text=/Last saved at/', { timeout: 5000 });
    
    // Verify last saved timestamp is displayed
    const timestamp = await page.textContent('.text-xs.text-gray-500');
    expect(timestamp).toContain('Last saved at');
  });

  test('should load document from Firebase and restore state', async ({ page }) => {
    // First, create and save a document
    await page.click('button:has-text("Add Static Section")');
    await page.waitForSelector('.section-item');
    
    const editor = page.locator('.CodeMirror').first();
    await editor.click();
    await page.keyboard.type('Content to be restored');
    
    // Save to Firebase
    await page.click('button:has-text("Save to Firebase")');
    await page.waitForSelector('text=/Last saved at/', { timeout: 5000 });
    
    // Clear the sections
    await page.click('button[title="Delete Section"]');
    await page.waitForSelector('.section-item', { state: 'detached' });
    
    // Load from Firebase
    await page.click('button:has-text("Load from Firebase")');
    
    // Wait for loading to complete
    await page.waitForSelector('.section-item', { timeout: 5000 });
    
    // Verify content was restored
    const restoredContent = await page.locator('.CodeMirror').first().textContent();
    expect(restoredContent).toContain('Content to be restored');
  });

  test('should handle save errors gracefully', async ({ page, context }) => {
    // Block Firebase requests to simulate error
    await context.route('**/firestore.googleapis.com/**', route => {
      route.abort();
    });
    
    // Add a section
    await page.click('button:has-text("Add Static Section")');
    await page.waitForSelector('.section-item');
    
    // Try to save (should fail)
    await page.click('button:has-text("Save to Firebase")');
    
    // Should show error notification
    await page.waitForSelector('text=/Error saving/', { timeout: 5000 });
  });

  test('should handle load errors gracefully', async ({ page, context }) => {
    // Block Firebase requests to simulate error
    await context.route('**/firestore.googleapis.com/**', route => {
      route.abort();
    });
    
    // Try to load (should fail)
    await page.click('button:has-text("Load from Firebase")');
    
    // Should show error notification
    await page.waitForSelector('text=/Error loading/', { timeout: 5000 });
  });

  test('should show loading states during save and load operations', async ({ page }) => {
    // Add a section
    await page.click('button:has-text("Add Static Section")');
    await page.waitForSelector('.section-item');
    
    // Start save operation
    const saveButton = page.locator('button:has-text("Save to Firebase")');
    await saveButton.click();
    
    // Check for loading state (button should be disabled or show spinner)
    await expect(saveButton).toBeDisabled();
    
    // Wait for save to complete
    await page.waitForSelector('text=/Last saved at/', { timeout: 5000 });
    await expect(saveButton).toBeEnabled();
    
    // Start load operation
    const loadButton = page.locator('button:has-text("Load from Firebase")');
    await loadButton.click();
    
    // Check for loading state
    await expect(loadButton).toBeDisabled();
    
    // Wait for load to complete
    await page.waitForTimeout(2000);
    await expect(loadButton).toBeEnabled();
  });

  test('should preserve dynamic sections with test cases during save/load', async ({ page }) => {
    // Add a dynamic section
    await page.click('button:has-text("Add Dynamic Section")');
    await page.waitForSelector('.section-item');
    
    // Edit the dynamic content
    const editor = page.locator('.CodeMirror').first();
    await editor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('return "Dynamic content: " + me.getValue("testVar");');
    
    // Add a test case
    const toggleButton = page.locator('button:has-text("Test Cases")').first();
    await toggleButton.click();
    
    await page.click('button:has-text("Add Test Case")');
    await page.fill('input[placeholder="Test case name"]', 'Test Case 1');
    
    // Add test variable
    await page.click('button:has-text("Add Variable")');
    await page.fill('input[placeholder="Key"]', 'testVar');
    await page.fill('input[placeholder="Value"]', 'test value');
    
    // Save to Firebase
    await page.click('button:has-text("Save to Firebase")');
    await page.waitForSelector('text=/Last saved at/', { timeout: 5000 });
    
    // Clear sections
    await page.click('button[title="Delete Section"]');
    await page.waitForSelector('.section-item', { state: 'detached' });
    
    // Load from Firebase
    await page.click('button:has-text("Load from Firebase")');
    await page.waitForSelector('.section-item', { timeout: 5000 });
    
    // Verify dynamic content was restored
    const restoredContent = await page.locator('.CodeMirror').first().textContent();
    expect(restoredContent).toContain('me.getValue("testVar")');
    
    // Verify test case was restored
    await page.click('button:has-text("Test Cases")');
    const testCaseName = await page.locator('text="Test Case 1"').isVisible();
    expect(testCaseName).toBeTruthy();
  });

  test('should handle multiple document saves with version tracking', async ({ page }) => {
    // Create first version
    await page.click('button:has-text("Add Static Section")');
    await page.waitForSelector('.section-item');
    
    const editor = page.locator('.CodeMirror').first();
    await editor.click();
    await page.keyboard.type('Version 1 content');
    
    // Save first version
    await page.click('button:has-text("Save to Firebase")');
    await page.waitForSelector('text=/Last saved at/', { timeout: 5000 });
    
    // Modify content
    await editor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('Version 2 content - updated');
    
    // Save second version
    await page.click('button:has-text("Save to Firebase")');
    
    // Wait for new timestamp
    await page.waitForTimeout(1000);
    
    // Verify timestamp was updated
    const timestamp = await page.textContent('.text-xs.text-gray-500');
    expect(timestamp).toContain('Last saved at');
    
    // Load to verify latest version
    await page.click('button:has-text("Load from Firebase")');
    await page.waitForTimeout(1000);
    
    const finalContent = await page.locator('.CodeMirror').first().textContent();
    expect(finalContent).toContain('Version 2 content - updated');
  });
});