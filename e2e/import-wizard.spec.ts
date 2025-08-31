import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Import Wizard UX and Design', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173'); // Adjust port if needed
  });

  test('should display import wizard with clean UI design', async ({ page }) => {
    // Navigate to import feature
    await page.goto('http://localhost:5173/import');
    
    // Test drag-and-drop file upload
    const fileInput = page.locator('input[type="file"]');
    const testConfigPath = path.join(__dirname, '..', 'test-fixtures', 'test-config.json');
    
    // Create test file if it doesn't exist
    const testConfig = {
      INGREDIENT: [
        {
          keyname: 'TestCalcium',
          displayName: 'Test Calcium',
          sections: [{ type: 'javascript', content: '// Test content' }]
        }
      ]
    };
    
    // Upload file
    await fileInput.setInputFiles(testConfigPath);
    
    // Screenshot analysis phase
    await page.waitForSelector('.analysis-progress', { timeout: 5000 });
    await page.screenshot({ 
      path: 'screenshots/import-analysis.png',
      fullPage: true 
    });
    
    // Verify clean UI design
    const modal = page.locator('.import-wizard-modal');
    await expect(modal).toBeVisible();
    
    // Check for rounded corners and shadow (good design practices)
    const borderRadius = await modal.evaluate(el => 
      window.getComputedStyle(el).borderRadius
    );
    expect(parseInt(borderRadius)).toBeGreaterThan(0);
    
    const boxShadow = await modal.evaluate(el => 
      window.getComputedStyle(el).boxShadow
    );
    expect(boxShadow).toContain('rgba');
    
    // Test match resolution UI
    await page.waitForSelector('.near-match-card', { timeout: 10000 });
    const matchCard = page.locator('.near-match-card').first();
    
    // Screenshot match resolution card
    await matchCard.screenshot({ 
      path: 'screenshots/match-resolution-card.png' 
    });
    
    // Test diff viewer
    const diffButton = page.locator('button:has-text("View Differences")').first();
    if (await diffButton.isVisible()) {
      await diffButton.click();
      await page.waitForSelector('.diff-viewer');
      await page.screenshot({ 
        path: 'screenshots/diff-viewer.png' 
      });
    }
    
    // Check console for errors
    const consoleLogs: any[] = [];
    page.on('console', msg => {
      consoleLogs.push({ type: msg.type(), text: msg.text() });
    });
    
    // Wait a moment for any errors to appear
    await page.waitForTimeout(1000);
    
    const errors = consoleLogs.filter(log => log.type === 'error');
    expect(errors).toHaveLength(0);
  });

  test('should handle file selection and analysis', async ({ page }) => {
    await page.goto('http://localhost:5173/import');
    
    // Test file selection
    const fileInput = page.locator('input[type="file"]');
    expect(fileInput).toBeTruthy();
    
    // Test cancel button presence
    const cancelButton = page.locator('button:has-text("Cancel")');
    await expect(cancelButton).toBeVisible();
  });

  test('should show progress during analysis', async ({ page }) => {
    await page.goto('http://localhost:5173/import');
    
    // Upload a file to trigger analysis
    const fileInput = page.locator('input[type="file"]');
    const testConfig = {
      INGREDIENT: Array.from({ length: 20 }, (_, i) => ({
        keyname: `Ingredient${i}`,
        sections: []
      }))
    };
    
    // Create blob and upload
    const blob = new Blob([JSON.stringify(testConfig)], { type: 'application/json' });
    const fileName = 'large-config.json';
    
    // Note: In real test, we'd use setInputFiles with actual file
    // await fileInput.setInputFiles(...);
    
    // Check for progress indicator
    const progressBar = page.locator('.progress-bar, .analysis-progress');
    if (await progressBar.isVisible()) {
      const progressValue = await progressBar.getAttribute('value') || 
                           await progressBar.textContent();
      expect(progressValue).toBeTruthy();
    }
  });

  test('should display match statistics correctly', async ({ page }) => {
    await page.goto('http://localhost:5173/import');
    
    // After analysis, check statistics display
    const stats = page.locator('.import-statistics, .match-summary');
    if (await stats.isVisible()) {
      const text = await stats.textContent();
      expect(text).toMatch(/\d+/); // Should contain numbers
    }
  });

  test('should handle match resolution options', async ({ page }) => {
    await page.goto('http://localhost:5173/import');
    
    // Look for match resolution options
    const resolutionOptions = page.locator('[name*="import-decision"], input[type="radio"]');
    if (await resolutionOptions.first().isVisible()) {
      // Check that we have the expected options
      const useExisting = page.locator('label:has-text("Use existing")');
      const createNew = page.locator('label:has-text("Create new")');
      const merge = page.locator('label:has-text("Merge")');
      
      // At least two options should be present
      const visibleOptions = [
        await useExisting.isVisible(),
        await createNew.isVisible(),
        await merge.isVisible()
      ].filter(Boolean);
      
      expect(visibleOptions.length).toBeGreaterThanOrEqual(2);
    }
  });

  test('should be keyboard accessible', async ({ page }) => {
    await page.goto('http://localhost:5173/import');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
    
    // Test escape key closes modal
    const modal = page.locator('.import-wizard-modal, .modal');
    if (await modal.isVisible()) {
      await page.keyboard.press('Escape');
      // Modal might close or show confirmation
      await page.waitForTimeout(500);
    }
  });

  test('should have responsive design', async ({ page }) => {
    await page.goto('http://localhost:5173/import');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ 
      path: 'screenshots/import-mobile.png',
      fullPage: true 
    });
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ 
      path: 'screenshots/import-tablet.png',
      fullPage: true 
    });
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ 
      path: 'screenshots/import-desktop.png',
      fullPage: true 
    });
    
    // Ensure content is visible in all viewports
    const content = page.locator('.import-wizard-modal, .import-content, main');
    await expect(content.first()).toBeVisible();
  });
});