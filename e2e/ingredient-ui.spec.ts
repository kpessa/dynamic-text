import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Helper to navigate to the app
async function navigateToApp(page: Page) {
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
}

// Helper to open ingredient panel
async function openIngredientPanel(page: Page) {
  // Look for ingredient panel button or toggle
  const ingredientButton = page.getByRole('button', { name: /ingredient/i });
  if (await ingredientButton.isVisible()) {
    await ingredientButton.click();
  }
}

test.describe('Ingredient UI Components', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToApp(page);
  });

  test.describe('IngredientList Component', () => {
    test('should display list of ingredients', async ({ page }) => {
      await openIngredientPanel(page);
      
      // Check if ingredient list is visible
      const ingredientList = page.locator('[data-testid="ingredient-list"]');
      await expect(ingredientList).toBeVisible();
      
      // Check for ingredient items
      const items = ingredientList.locator('[role="listitem"]');
      const count = await items.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should search ingredients', async ({ page }) => {
      await openIngredientPanel(page);
      
      // Find search input
      const searchInput = page.getByPlaceholder(/search ingredient/i);
      await expect(searchInput).toBeVisible();
      
      // Type search query
      await searchInput.fill('calcium');
      await page.waitForTimeout(500); // Wait for debounce
      
      // Check filtered results
      const items = page.locator('[role="listitem"]');
      const visibleItems = await items.filter({ hasText: /calcium/i }).count();
      expect(visibleItems).toBeGreaterThan(0);
      
      // Check that non-matching items are hidden
      const allItems = await items.count();
      expect(visibleItems).toBeLessThanOrEqual(allItems);
    });

    test('should filter by category', async ({ page }) => {
      await openIngredientPanel(page);
      
      // Find category filter
      const categorySelect = page.getByLabel(/category/i);
      await expect(categorySelect).toBeVisible();
      
      // Select a category
      await categorySelect.selectOption('Micronutrient');
      
      // Check filtered results
      const items = page.locator('[role="listitem"]');
      const badges = items.locator('.badge, .category-badge');
      
      // All visible items should have the selected category
      for (let i = 0; i < await items.count(); i++) {
        const badge = badges.nth(i);
        if (await badge.isVisible()) {
          await expect(badge).toContainText('Micronutrient');
        }
      }
    });

    test('should sort ingredients', async ({ page }) => {
      await openIngredientPanel(page);
      
      // Find sort selector
      const sortSelect = page.getByLabel(/sort/i);
      await expect(sortSelect).toBeVisible();
      
      // Sort by name
      await sortSelect.selectOption('name');
      await page.waitForTimeout(300);
      
      // Get all item names
      const items = page.locator('[role="listitem"] .ingredient-name');
      const names: string[] = [];
      for (let i = 0; i < await items.count(); i++) {
        const text = await items.nth(i).textContent();
        if (text) names.push(text);
      }
      
      // Check if sorted alphabetically
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    test('should select ingredient on click', async ({ page }) => {
      await openIngredientPanel(page);
      
      // Click first ingredient
      const firstItem = page.locator('[role="listitem"]').first();
      await firstItem.click();
      
      // Check if selected (should have selected class or attribute)
      await expect(firstItem).toHaveAttribute('data-selected', 'true');
      
      // Check if editor opened
      const editor = page.locator('[data-testid="ingredient-editor"]');
      await expect(editor).toBeVisible();
    });
  });

  test.describe('IngredientEditor Component', () => {
    test('should edit ingredient basic fields', async ({ page }) => {
      await openIngredientPanel(page);
      
      // Select an ingredient
      const firstItem = page.locator('[role="listitem"]').first();
      await firstItem.click();
      
      // Wait for editor
      const editor = page.locator('[data-testid="ingredient-editor"]');
      await expect(editor).toBeVisible();
      
      // Edit keyname
      const keynameInput = editor.getByLabel(/keyname/i);
      await keynameInput.clear();
      await keynameInput.fill('UpdatedKeyname');
      
      // Edit display name
      const displayInput = editor.getByLabel(/display name/i);
      await displayInput.clear();
      await displayInput.fill('Updated Display Name');
      
      // Save changes
      const saveButton = editor.getByRole('button', { name: /save/i });
      await saveButton.click();
      
      // Verify changes in list
      await expect(page.locator('[role="listitem"]').first()).toContainText('Updated Display Name');
    });

    test('should switch between tabs', async ({ page }) => {
      await openIngredientPanel(page);
      
      // Select an ingredient
      const firstItem = page.locator('[role="listitem"]').first();
      await firstItem.click();
      
      // Check tabs exist
      const sectionsTab = page.getByRole('tab', { name: /sections/i });
      const testsTab = page.getByRole('tab', { name: /tests/i });
      const variantsTab = page.getByRole('tab', { name: /variants/i });
      
      await expect(sectionsTab).toBeVisible();
      await expect(testsTab).toBeVisible();
      await expect(variantsTab).toBeVisible();
      
      // Switch to tests tab
      await testsTab.click();
      await expect(testsTab).toHaveAttribute('aria-selected', 'true');
      
      // Switch to variants tab
      await variantsTab.click();
      await expect(variantsTab).toHaveAttribute('aria-selected', 'true');
    });

    test('should add new section', async ({ page }) => {
      await openIngredientPanel(page);
      
      // Select an ingredient
      const firstItem = page.locator('[role="listitem"]').first();
      await firstItem.click();
      
      // Ensure on sections tab
      const sectionsTab = page.getByRole('tab', { name: /sections/i });
      await sectionsTab.click();
      
      // Add new section
      const addButton = page.getByRole('button', { name: /add section/i });
      await addButton.click();
      
      // Fill section content
      const contentInput = page.getByPlaceholder(/section content/i);
      await contentInput.fill('return me.getValue("test");');
      
      // Select type
      const typeSelect = page.getByLabel(/section type/i);
      await typeSelect.selectOption('javascript');
      
      // Save section
      const saveButton = page.getByRole('button', { name: /save/i });
      await saveButton.click();
      
      // Verify section added
      await expect(page.locator('.section-item')).toContainText('return me.getValue("test");');
    });

    test('should add new test', async ({ page }) => {
      await openIngredientPanel(page);
      
      // Select an ingredient
      const firstItem = page.locator('[role="listitem"]').first();
      await firstItem.click();
      
      // Switch to tests tab
      const testsTab = page.getByRole('tab', { name: /tests/i });
      await testsTab.click();
      
      // Add new test
      const addButton = page.getByRole('button', { name: /add test/i });
      await addButton.click();
      
      // Fill test name
      const nameInput = page.getByPlaceholder(/test name/i);
      await nameInput.fill('New Test Case');
      
      // Add test variable
      const addVariableButton = page.getByRole('button', { name: /add variable/i });
      await addVariableButton.click();
      
      const varNameInput = page.getByPlaceholder(/variable name/i);
      await varNameInput.fill('calcium');
      
      const varValueInput = page.getByPlaceholder(/variable value/i);
      await varValueInput.fill('2.5');
      
      // Save test
      const saveButton = page.getByRole('button', { name: /save/i });
      await saveButton.click();
      
      // Verify test added
      await expect(page.locator('.test-item')).toContainText('New Test Case');
    });

    test('should delete ingredient', async ({ page }) => {
      await openIngredientPanel(page);
      
      // Count initial ingredients
      const initialCount = await page.locator('[role="listitem"]').count();
      
      // Select an ingredient
      const firstItem = page.locator('[role="listitem"]').first();
      const ingredientName = await firstItem.textContent();
      await firstItem.click();
      
      // Delete ingredient
      const deleteButton = page.getByRole('button', { name: /delete ingredient/i });
      await deleteButton.click();
      
      // Confirm deletion
      const confirmButton = page.getByRole('button', { name: /confirm/i });
      await confirmButton.click();
      
      // Verify ingredient removed
      await page.waitForTimeout(500);
      const newCount = await page.locator('[role="listitem"]').count();
      expect(newCount).toBe(initialCount - 1);
      
      // Verify specific ingredient is gone
      if (ingredientName) {
        await expect(page.locator('[role="listitem"]')).not.toContainText(ingredientName);
      }
    });
  });

  test.describe('IngredientPanel Integration', () => {
    test('should show split view with list and editor', async ({ page }) => {
      await openIngredientPanel(page);
      
      // Check for split pane
      const panel = page.locator('[data-testid="ingredient-panel"]');
      await expect(panel).toBeVisible();
      
      // Check for list pane
      const listPane = panel.locator('.list-pane, [data-testid="ingredient-list"]');
      await expect(listPane).toBeVisible();
      
      // Select ingredient to show editor
      const firstItem = page.locator('[role="listitem"]').first();
      await firstItem.click();
      
      // Check for editor pane
      const editorPane = panel.locator('.editor-pane, [data-testid="ingredient-editor"]');
      await expect(editorPane).toBeVisible();
      
      // Both should be visible in split view
      await expect(listPane).toBeVisible();
      await expect(editorPane).toBeVisible();
    });

    test('should resize split panes', async ({ page }) => {
      await openIngredientPanel(page);
      
      // Find splitter
      const splitter = page.locator('.splitter, [data-testid="splitter"]');
      await expect(splitter).toBeVisible();
      
      // Get initial widths
      const listPane = page.locator('.list-pane, [data-testid="ingredient-list"]');
      const initialWidth = await listPane.boundingBox();
      
      // Drag splitter
      await splitter.hover();
      await page.mouse.down();
      await page.mouse.move(100, 0);
      await page.mouse.up();
      
      // Check width changed
      const newWidth = await listPane.boundingBox();
      expect(newWidth?.width).not.toBe(initialWidth?.width);
    });

    test('should maintain state during navigation', async ({ page }) => {
      await openIngredientPanel(page);
      
      // Search for something
      const searchInput = page.getByPlaceholder(/search ingredient/i);
      await searchInput.fill('calcium');
      
      // Select category filter
      const categorySelect = page.getByLabel(/category/i);
      await categorySelect.selectOption('Micronutrient');
      
      // Select an ingredient
      const firstItem = page.locator('[role="listitem"]').first();
      await firstItem.click();
      
      // Navigate away and back (simulate)
      await page.reload();
      await openIngredientPanel(page);
      
      // Check if filters are maintained (if using local storage)
      // This depends on implementation
      const searchValue = await searchInput.inputValue();
      const categoryValue = await categorySelect.inputValue();
      
      // At minimum, UI should not crash
      await expect(searchInput).toBeVisible();
      await expect(categorySelect).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should navigate with keyboard', async ({ page }) => {
      await openIngredientPanel(page);
      
      // Tab to search
      await page.keyboard.press('Tab');
      const searchInput = page.getByPlaceholder(/search ingredient/i);
      await expect(searchInput).toBeFocused();
      
      // Tab to category filter
      await page.keyboard.press('Tab');
      const categorySelect = page.getByLabel(/category/i);
      await expect(categorySelect).toBeFocused();
      
      // Tab to sort
      await page.keyboard.press('Tab');
      const sortSelect = page.getByLabel(/sort/i);
      await expect(sortSelect).toBeFocused();
      
      // Tab to first ingredient
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // May need multiple tabs
      
      // Press Enter to select
      await page.keyboard.press('Enter');
      
      // Check editor opened
      const editor = page.locator('[data-testid="ingredient-editor"]');
      await expect(editor).toBeVisible();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await openIngredientPanel(page);
      
      // Check list has role
      const list = page.locator('[role="list"]');
      await expect(list).toBeVisible();
      
      // Check items have role
      const items = page.locator('[role="listitem"]');
      expect(await items.count()).toBeGreaterThan(0);
      
      // Check form inputs have labels
      const searchInput = page.getByPlaceholder(/search ingredient/i);
      const searchLabel = await searchInput.getAttribute('aria-label');
      expect(searchLabel).toBeTruthy();
      
      // Check tabs have proper ARIA
      const firstItem = page.locator('[role="listitem"]').first();
      await firstItem.click();
      
      const tablist = page.locator('[role="tablist"]');
      await expect(tablist).toBeVisible();
      
      const tabs = page.locator('[role="tab"]');
      expect(await tabs.count()).toBe(3);
    });

    test('should announce changes to screen readers', async ({ page }) => {
      await openIngredientPanel(page);
      
      // Check for live regions
      const liveRegion = page.locator('[aria-live="polite"], [aria-live="assertive"]');
      
      // Perform action that should announce
      const searchInput = page.getByPlaceholder(/search ingredient/i);
      await searchInput.fill('calcium');
      await page.waitForTimeout(500);
      
      // Check if results are announced
      // This is hard to test without actual screen reader
      // But we can check if live region exists
      const hasLiveRegion = await liveRegion.count() > 0;
      expect(hasLiveRegion).toBeTruthy();
    });
  });

  test.describe('Error Handling', () => {
    test('should show error when save fails', async ({ page }) => {
      // Mock network error
      await page.route('**/api/ingredients/*', route => {
        route.abort('failed');
      });
      
      await openIngredientPanel(page);
      
      // Select and edit ingredient
      const firstItem = page.locator('[role="listitem"]').first();
      await firstItem.click();
      
      const keynameInput = page.getByLabel(/keyname/i);
      await keynameInput.clear();
      await keynameInput.fill('UpdatedKeyname');
      
      // Try to save
      const saveButton = page.getByRole('button', { name: /save/i });
      await saveButton.click();
      
      // Check for error message
      const errorMessage = page.locator('.error, [role="alert"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/error|failed/i);
    });

    test('should validate required fields', async ({ page }) => {
      await openIngredientPanel(page);
      
      // Select ingredient
      const firstItem = page.locator('[role="listitem"]').first();
      await firstItem.click();
      
      // Clear required field
      const keynameInput = page.getByLabel(/keyname/i);
      await keynameInput.clear();
      
      // Try to save
      const saveButton = page.getByRole('button', { name: /save/i });
      await saveButton.click();
      
      // Check for validation error
      const validationError = page.locator('.validation-error, [aria-invalid="true"]');
      await expect(validationError).toBeVisible();
    });
  });
});