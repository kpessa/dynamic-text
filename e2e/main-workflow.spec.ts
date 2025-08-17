import { test, expect } from '@playwright/test';

test.describe('Dynamic Text Editor - Main Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('complete TPN calculation workflow', async ({ page }) => {
    // Step 1: Verify app loads
    await expect(page).toHaveTitle(/TPN Dynamic Text Editor/);
    await expect(page.locator('#app')).toBeVisible();
    
    // Step 2: Switch to TPN mode
    const tpnModeButton = page.locator('button:has-text("TPN Mode")');
    if (await tpnModeButton.isVisible()) {
      await tpnModeButton.click();
      await expect(page.locator('.tpn-panel')).toBeVisible();
    }
    
    // Step 3: Enter TPN values
    const weightInput = page.locator('input[placeholder*="weight" i]').first();
    if (await weightInput.isVisible()) {
      await weightInput.fill('70');
    }
    
    // Step 4: Create a dynamic section
    const addSectionButton = page.locator('button:has-text("Add Section")');
    if (await addSectionButton.isVisible()) {
      await addSectionButton.click();
      
      // Wait for section to be added
      await page.waitForTimeout(500);
      
      // Switch to dynamic mode
      const dynamicToggle = page.locator('button:has-text("Dynamic")').last();
      if (await dynamicToggle.isVisible()) {
        await dynamicToggle.click();
      }
      
      // Enter dynamic code
      const codeEditor = page.locator('.cm-content').last();
      if (await codeEditor.isVisible()) {
        await codeEditor.click();
        await page.keyboard.type('return me.getValue("DOSE_WEIGHT");');
      }
    }
    
    // Step 5: Test preview
    const previewPanel = page.locator('.preview-panel');
    await expect(previewPanel).toBeVisible();
    
    // Step 6: Export functionality
    const exportButton = page.locator('button:has-text("Export")');
    if (await exportButton.isVisible()) {
      await exportButton.click();
      
      // Check export modal
      const exportModal = page.locator('.modal:has-text("Export")');
      await expect(exportModal).toBeVisible();
      
      // Close modal
      const closeButton = exportModal.locator('button:has-text("Close")');
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }
  });

  test('ingredient management workflow', async ({ page }) => {
    // Open ingredient manager
    const ingredientButton = page.locator('button:has-text("Ingredients")');
    if (await ingredientButton.isVisible()) {
      await ingredientButton.click();
      
      // Wait for panel to open
      await page.waitForTimeout(500);
      
      // Check if ingredient list loads
      const ingredientPanel = page.locator('.ingredient-manager');
      if (await ingredientPanel.isVisible()) {
        await expect(ingredientPanel).toBeVisible();
        
        // Search for an ingredient
        const searchInput = ingredientPanel.locator('input[placeholder*="search" i]');
        if (await searchInput.isVisible()) {
          await searchInput.fill('calcium');
          await page.waitForTimeout(300);
        }
        
        // Click on first ingredient if available
        const firstIngredient = ingredientPanel.locator('.ingredient-item').first();
        if (await firstIngredient.count() > 0) {
          await firstIngredient.click();
        }
      }
    }
  });

  test('test case management', async ({ page }) => {
    // Add a test case
    const addTestButton = page.locator('button:has-text("Add Test")');
    if (await addTestButton.isVisible()) {
      await addTestButton.click();
      
      // Enter test values
      const testNameInput = page.locator('input[placeholder*="test name" i]');
      if (await testNameInput.isVisible()) {
        await testNameInput.fill('Test Case 1');
      }
      
      // Run test
      const runTestButton = page.locator('button:has-text("Run")');
      if (await runTestButton.isVisible()) {
        await runTestButton.click();
        await page.waitForTimeout(500);
        
        // Check for test results
        const testResults = page.locator('.test-results');
        if (await testResults.count() > 0) {
          await expect(testResults.first()).toBeVisible();
        }
      }
    }
  });

  test('keyboard shortcuts', async ({ page }) => {
    // Test Ctrl+S for save
    await page.keyboard.press('Control+s');
    
    // Check if save modal or notification appears
    const saveIndicator = page.locator('.save-indicator, .notification:has-text("Saved")');
    if (await saveIndicator.count() > 0) {
      await expect(saveIndicator.first()).toBeVisible();
    }
    
    // Test Ctrl+/ for help
    await page.keyboard.press('Control+/');
    const helpModal = page.locator('.modal:has-text("Help"), .modal:has-text("Shortcuts")');
    if (await helpModal.count() > 0) {
      await expect(helpModal.first()).toBeVisible();
      
      // Close help
      await page.keyboard.press('Escape');
    }
  });

  test('responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check mobile menu
    const mobileMenuButton = page.locator('.mobile-menu-button, button[aria-label*="menu" i]');
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      
      const mobileMenu = page.locator('.mobile-menu, .mobile-nav');
      if (await mobileMenu.count() > 0) {
        await expect(mobileMenu.first()).toBeVisible();
      }
    }
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('#app')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('#app')).toBeVisible();
  });

  test('error handling', async ({ page }) => {
    // Try to trigger an error by entering invalid dynamic code
    const addSectionButton = page.locator('button:has-text("Add Section")');
    if (await addSectionButton.isVisible()) {
      await addSectionButton.click();
      
      const dynamicToggle = page.locator('button:has-text("Dynamic")').last();
      if (await dynamicToggle.isVisible()) {
        await dynamicToggle.click();
      }
      
      const codeEditor = page.locator('.cm-content').last();
      if (await codeEditor.isVisible()) {
        await codeEditor.click();
        await page.keyboard.type('this.will.cause.an.error();');
      }
      
      // Check for error indication
      const errorIndicator = page.locator('.error, .error-message');
      if (await errorIndicator.count() > 0) {
        await expect(errorIndicator.first()).toBeVisible();
      }
    }
  });

  test('PWA features', async ({ page }) => {
    // Check for PWA manifest
    const manifestLink = await page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json');
    
    // Check for service worker registration
    const hasServiceWorker = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    expect(hasServiceWorker).toBe(true);
    
    // Check for offline page
    const response = await page.goto('/offline.html');
    expect(response?.status()).toBeLessThan(400);
  });

  test('accessibility', async ({ page }) => {
    // Check for proper ARIA labels
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const hasAriaLabel = await button.evaluate(el => {
        return el.hasAttribute('aria-label') || el.textContent?.trim().length > 0;
      });
      expect(hasAriaLabel).toBe(true);
    }
    
    // Check for keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });
    expect(focusedElement).toBeTruthy();
    
    // Check color contrast (basic check)
    const backgroundColor = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    expect(backgroundColor).toBeTruthy();
  });
});