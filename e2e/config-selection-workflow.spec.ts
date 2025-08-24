import { test, expect } from '@playwright/test';

test.describe('TPN Config Selection Workflow', () => {
  test('should select config, close modal, load ingredients, and render sections on ingredient click', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for app to load
    await page.waitForSelector('main', { timeout: 10000 });
    
    // Open sidebar by clicking the hamburger menu
    await page.click('button:has-text("☰")');
    
    // Click the Configs button
    await page.click('button:has-text("🔧 Configs")');
    
    // Wait for modal to appear
    await page.waitForSelector('.config-modal-content', { timeout: 5000 });
    
    // Verify modal is visible
    const modalContent = await page.locator('.config-modal-content');
    await expect(modalContent).toBeVisible();
    
    // Find and click the first Activate button
    // The configs are loaded from Firebase and might vary, so we'll just activate the first one
    await page.waitForSelector('button:has-text("Activate")', { timeout: 5000 });
    const activateButton = page.locator('button:has-text("Activate")').first();
    await activateButton.click();
    
    // Verify modal closes
    await expect(modalContent).not.toBeVisible({ timeout: 2000 });
    
    // Verify sidebar shows ingredients from the activated config
    // Wait for ingredients to load (look for buttons with "notes" text)
    await page.waitForSelector('button:has-text("notes")', { timeout: 5000 });
    
    // Look for and click on Calcium ingredient
    const calciumIngredient = await page.locator('button').filter({ hasText: /Calcium.*notes/ }).first();
    await expect(calciumIngredient).toBeVisible();
    
    // Click on the Calcium ingredient
    await calciumIngredient.click();
    
    // Verify that sections are rendered in the main area
    // Wait a moment for sections to load
    await page.waitForTimeout(2000);
    
    // Check that the sections count is not 0
    const sectionsIndicator = await page.locator('text=/Sections:.*[1-9]/');
    await expect(sectionsIndicator).toBeVisible({ timeout: 5000 });
    
    // Verify that the header shows the ingredient name
    await expect(page.locator('text=/Calcium/i')).toBeVisible();
  });
  
  test('should persist selected config after page reload', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for app to load
    await page.waitForSelector('main', { timeout: 10000 });
    
    // Open sidebar
    await page.click('button:has-text("☰")');
    
    // Open configs modal
    await page.click('button:has-text("🔧 Configs")');
    await page.waitForSelector('.config-modal-content');
    
    // Activate the first available config
    await page.waitForSelector('button:has-text("Activate")', { timeout: 5000 });
    const activateButton = page.locator('button:has-text("Activate")').first();
    await activateButton.click();
    
    // Wait for modal to close
    await expect(page.locator('.config-modal-content')).not.toBeVisible({ timeout: 2000 });
    
    // Reload the page
    await page.reload();
    
    // Wait for app to load again
    await page.waitForSelector('main', { timeout: 10000 });
    
    // Open sidebar again after reload
    await page.click('button:has-text("☰")');
    
    // Verify ingredients are still loaded (look for buttons with "notes" text)
    await expect(page.locator('button:has-text("notes")').first()).toBeVisible({ timeout: 5000 });
  });
});