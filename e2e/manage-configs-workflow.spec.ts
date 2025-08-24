import { test, expect } from '@playwright/test';

test.describe('Manage Reference Configs Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for app to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give Svelte time to mount
    
    // Look for the sidebar toggle button with various selectors
    const sidebarToggle = page.locator('button:has-text("Sidebar"), button[aria-label*="Sidebar"], .sidebar-toggle').first();
    await expect(sidebarToggle).toBeVisible({ timeout: 10000 });
    
    // Click to open sidebar
    await sidebarToggle.click();
    
    // Wait for sidebar drawer to be visible
    await expect(page.locator('.drawer-sidebar, aside, [role="complementary"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('should manage reference texts/configs from sidebar', async ({ page }) => {
    // Step 1: Click the "Configs" button in sidebar
    const manageButton = page.locator('button:has-text("🔧 Configs"), button:has-text("Configs")').first();
    await expect(manageButton).toBeVisible();
    await manageButton.click();

    // Step 2: Expect a modal to open showing saved configs
    const configModal = page.locator('dialog, [role="dialog"], .modal-backdrop').filter({ hasText: 'TPN Config Manager' });
    await expect(configModal).toBeVisible({ timeout: 5000 });

    // Step 3: Expect to see a list of saved configs from Firebase
    const configList = configModal.locator('.config-list');
    await expect(configList).toBeVisible();
    
    // Should have at least one config item (or empty state)
    const configItems = configList.locator('.config-item');
    const emptyState = configModal.locator('.no-configs, .empty-state');
    
    // Either we have configs or we have an empty state
    const configCount = await configItems.count();
    const hasConfigs = configCount > 0;
    console.log(`Found ${configCount} configs in Firebase`);
    
    if (hasConfigs) {
      // Step 4: Each config should show key information
      const firstConfig = configItems.first();
      
      // Config should have name/id
      const configInfo = firstConfig.locator('.config-info');
      await expect(configInfo).toBeVisible();
      
      // Should show metadata (health system, domain, etc.)
      const configMetadata = firstConfig.locator('.config-metadata');
      if (await configMetadata.isVisible().catch(() => false)) {
        await expect(configMetadata).toContainText(/\//); // Should have slash-separated values
      }
      
      // Should show date if available
      const configDate = firstConfig.locator('.config-date');
      if (await configDate.isVisible().catch(() => false)) {
        await expect(configDate).toContainText(/Imported/i);
      }
    } else {
      // Only check for empty state if there truly are no configs
      const emptyStateVisible = await emptyState.isVisible().catch(() => false);
      if (emptyStateVisible) {
        await expect(emptyState).toContainText(/no configs|empty/i);
      }
    }

    // Step 5: Click on a config to activate it
    if (hasConfigs) {
      const firstConfig = configItems.first();
      const configName = await firstConfig.locator('strong').first().textContent();
      
      // Click the activate button if the config is not already active
      const activateButton = firstConfig.locator('button.activate-btn, button:has-text("Activate")');
      if (await activateButton.isVisible().catch(() => false)) {
        await activateButton.click();
        
        // Wait for activation to complete
        await page.waitForTimeout(500);
        
        // Step 6: Config should now be marked as active
        await expect(firstConfig).toHaveClass(/active/);
      } else {
        // Config is already active
        await expect(firstConfig).toHaveClass(/active/);
      }
      
      // Step 7: Close the dialog to see sidebar updates
      // Force close using ESC key or click outside since button might be outside viewport
      await page.keyboard.press('Escape');
      
      // Wait for modal to close
      await expect(configModal).toBeHidden({ timeout: 5000 });
      
      // Step 8: Sidebar should update to show the active config's ingredients
      const sidebar = page.locator('aside, [role="complementary"]').first();
      
      // Should show the active config badge
      const activeConfigBadge = sidebar.locator('.active-config-badge, [class*="badge"]:has-text("uhs"), [class*="badge"]:has-text("choc")').first();
      await expect(activeConfigBadge).toBeVisible({ timeout: 5000 });
      if (configName) {
        await expect(activeConfigBadge).toContainText(configName);
      }
      
      // Should show config ingredients section header
      const configHeader = sidebar.locator('h3:has-text("Configuration Ingredients"), .config-header').first();
      await expect(configHeader).toBeVisible({ timeout: 5000 });
      
      // Should list ingredients from the activated config
      const ingredientGroups = sidebar.locator('.ingredient-type-group');
      const configIngredientItems = sidebar.locator('.config-ingredient-item, button:has(.ingredient-details)');
      
      // Wait for ingredients to load
      await page.waitForTimeout(1000);
      
      // Should have at least one ingredient group or item
      const groupCount = await ingredientGroups.count();
      const itemCount = await configIngredientItems.count();
      console.log(`Found ${groupCount} ingredient groups and ${itemCount} ingredient items`);
      expect(groupCount > 0 || itemCount > 0).toBeTruthy();
      
      // Each ingredient should show details
      if (itemCount > 0) {
        const firstIngredient = configIngredientItems.first();
        await expect(firstIngredient).toBeVisible();
        
        // Should have ingredient details
        const ingredientDetails = firstIngredient.locator('.ingredient-details, span.text-sm');
        await expect(ingredientDetails.first()).toBeVisible();
      }
    }
  });

  test('should handle Firebase connection states', async ({ page }) => {
    // Click manage configs button
    const manageButton = page.locator('button:has-text("🔧 Configs"), button:has-text("Configs")').first();
    await manageButton.click();

    const configModal = page.locator('dialog, [role="dialog"], .modal-backdrop').filter({ hasText: 'TPN Config Manager' });
    
    // Should handle loading state
    const loadingIndicator = configModal.locator('.loading-configs');
    // Loading might be too fast to catch, so this is optional
    if (await loadingIndicator.isVisible().catch(() => false)) {
      await expect(loadingIndicator).toBeHidden({ timeout: 10000 });
    }

    // Should handle offline/error state gracefully
    const errorState = configModal.locator('.error-state, [data-testid="error-state"]');
    const configList = configModal.locator('.config-list');
    
    // Either show configs or show error
    const hasError = await errorState.isVisible().catch(() => false);
    if (hasError) {
      await expect(errorState).toContainText(/offline|error|unable/i);
      // Should offer retry or offline mode
      const retryButton = configModal.locator('button:has-text("Retry"), button:has-text("Try Again")');
      await expect(retryButton).toBeVisible();
    } else {
      await expect(configList).toBeVisible();
    }
  });

  test('should persist active config across page refresh', async ({ page }) => {
    // First, activate a config
    const manageButton = page.locator('button:has-text("🔧 Configs"), button:has-text("Configs")').first();
    await manageButton.click();

    const configModal = page.locator('dialog, [role="dialog"], .modal-backdrop').filter({ hasText: 'TPN Config Manager' });
    await expect(configModal).toBeVisible();

    const configItems = configModal.locator('.config-item');
    if (await configItems.count() > 0) {
      const firstConfig = configItems.first();
      const configName = await firstConfig.locator('strong').first().textContent();
      
      // Activate the config
      const activateButton = firstConfig.locator('button.activate-btn, button:has-text("Activate")');
      if (await activateButton.isVisible().catch(() => false)) {
        await activateButton.click();
      }
      
      // Wait for activation to complete
      await page.waitForTimeout(1000);
      
      // Close the modal
      await page.keyboard.press('Escape');
      await expect(configModal).toBeHidden({ timeout: 5000 });
      
      // Refresh the page
      await page.reload();
      
      // Wait for app to reload and open sidebar again
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      const sidebarToggle = page.locator('button:has-text("Sidebar"), button[aria-label*="Sidebar"], .sidebar-toggle').first();
      await expect(sidebarToggle).toBeVisible({ timeout: 10000 });
      await sidebarToggle.click();
      await expect(page.locator('.drawer-sidebar, aside, [role="complementary"]').first()).toBeVisible({ timeout: 5000 });
      
      // Check that the config is still active in the sidebar
      const sidebar = page.locator('aside, [role="complementary"]').first();
      const activeConfigBadge = sidebar.locator('.active-config-badge');
      if (await activeConfigBadge.isVisible().catch(() => false)) {
        await expect(activeConfigBadge).toContainText(configName || '');
      }
      
      // Ingredients should still be visible
      const configHeader = sidebar.locator('.config-header:has-text("Configuration Ingredients")');
      await expect(configHeader).toBeVisible();
    }
  });

  test('should allow switching between configs', async ({ page }) => {
    const manageButton = page.locator('button:has-text("🔧 Configs"), button:has-text("Configs")').first();
    await manageButton.click();

    const configModal = page.locator('dialog, [role="dialog"], .modal-backdrop').filter({ hasText: 'TPN Config Manager' });
    const configItems = configModal.locator('.config-item');
    
    if (await configItems.count() >= 2) {
      // Activate first config
      const firstConfig = configItems.nth(0);
      const firstName = await firstConfig.locator('strong').first().textContent();
      const firstActivateButton = firstConfig.locator('button.activate-btn, button:has-text("Activate")');
      if (await firstActivateButton.isVisible().catch(() => false)) {
        await firstActivateButton.click();
        await page.waitForTimeout(500);
      }
      
      // Close modal
      await page.keyboard.press('Escape');
      await expect(configModal).toBeHidden({ timeout: 5000 });
      
      // Verify first config is active
      const sidebar = page.locator('aside, [role="complementary"]').first();
      const activeConfigBadge = sidebar.locator('.active-config-badge');
      if (await activeConfigBadge.isVisible().catch(() => false)) {
        await expect(activeConfigBadge).toContainText(firstName || '');
      }
      
      // Open modal again
      await manageButton.click();
      await expect(configModal).toBeVisible();
      
      // Activate second config
      const secondConfig = configItems.nth(1);
      const secondName = await secondConfig.locator('strong').first().textContent();
      const secondActivateButton = secondConfig.locator('button.activate-btn, button:has-text("Activate")');
      if (await secondActivateButton.isVisible().catch(() => false)) {
        await secondActivateButton.click();
        await page.waitForTimeout(500);
      }
      
      // Close modal again
      await page.keyboard.press('Escape');
      await expect(configModal).toBeHidden({ timeout: 5000 });
      
      // Verify second config replaced the first
      if (await activeConfigBadge.isVisible().catch(() => false)) {
        await expect(activeConfigBadge).toContainText(secondName || '');
        
        // First config name should no longer be displayed
        if (firstName !== secondName) {
          await expect(activeConfigBadge).not.toContainText(firstName || '');
        }
      }
    }
  });
});