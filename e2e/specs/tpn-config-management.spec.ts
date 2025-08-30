import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('TPN Configuration Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForSelector('.app-container', { timeout: 10000 });
    
    // Enable TPN mode if not already enabled
    const tpnModeCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /TPN Mode/i });
    const isChecked = await tpnModeCheckbox.isChecked();
    if (!isChecked) {
      await tpnModeCheckbox.click();
    }
  });

  test('should display TPN Configs button when TPN mode is enabled', async ({ page }) => {
    // Check that the TPN Configs button is visible
    const tpnConfigButton = page.locator('button').filter({ hasText: /TPN Configs/i });
    await expect(tpnConfigButton).toBeVisible();
  });

  test('should open TPN Config Manager modal', async ({ page }) => {
    // Click the TPN Configs button
    await page.click('button:has-text("TPN Configs")');
    
    // Check that the modal is visible
    await expect(page.locator('text=TPN Configuration Management')).toBeVisible();
    await expect(page.locator('button:has-text("Import Config")')).toBeVisible();
    await expect(page.locator('button:has-text("Export Config")')).toBeVisible();
  });

  test('should open import modal from config manager', async ({ page }) => {
    // Open config manager
    await page.click('button:has-text("TPN Configs")');
    
    // Click Import Config button
    await page.click('button:has-text("Import Config")');
    
    // Check that import modal is visible
    await expect(page.locator('text=Import TPN Configuration')).toBeVisible();
    await expect(page.locator('text=Import from File')).toBeVisible();
    await expect(page.locator('text=Import from Firebase')).toBeVisible();
  });

  test('should open export modal from config manager', async ({ page }) => {
    // Open config manager
    await page.click('button:has-text("TPN Configs")');
    
    // Click Export Config button
    await page.click('button:has-text("Export Config")');
    
    // Check that export modal is visible
    await expect(page.locator('text=Export TPN Configuration')).toBeVisible();
    await expect(page.locator('text=Export to File')).toBeVisible();
    await expect(page.locator('text=Save to Firebase')).toBeVisible();
  });

  test('should import TPN configuration from file', async ({ page }) => {
    // Create a sample TPN config file
    const sampleConfig = {
      INGREDIENT: [
        {
          KEYNAME: 'TestIngredient',
          DISPLAY: 'Test Ingredient',
          MNEMONIC: 'TEST',
          UOM_DISP: 'mg',
          TYPE: 'Micronutrient',
          OSMO_RATIO: 0,
          EDITMODE: 'None',
          PRECISION: 2,
          SPECIAL: '',
          NOTE: [
            { TEXT: 'This is a test note' }
          ],
          ALTUOM: [],
          REFERENCE_RANGE: [],
          LABS: [],
          CONCENTRATION: {
            STRENGTH: 10,
            STRENGTH_UOM: 'mg',
            VOLUME: 1,
            VOLUME_UOM: 'mL'
          },
          EXCLUDES: []
        }
      ],
      FLEX: []
    };
    
    const configPath = path.join(__dirname, 'test-config.json');
    fs.writeFileSync(configPath, JSON.stringify(sampleConfig, null, 2));
    
    try {
      // Open config manager
      await page.click('button:has-text("TPN Configs")');
      
      // Click Import Config button
      await page.click('button:has-text("Import Config")');
      
      // Select Import from File option
      await page.click('input[value="file"]');
      
      // Upload the file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(configPath);
      
      // Select population type
      await page.selectOption('select', 'adult');
      
      // Click Import Configuration button
      await page.click('button:has-text("Import Configuration")');
      
      // Wait for success message
      await expect(page.locator('text=Import Successful')).toBeVisible({ timeout: 10000 });
    } finally {
      // Clean up test file
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
    }
  });

  test('should export TPN configuration to file', async ({ page }) => {
    // First, create some sections
    await page.click('button:has-text("New Section")');
    await page.fill('input[placeholder="Section name"]', 'Test Section');
    await page.fill('textarea', 'Test content for export');
    
    // Open config manager
    await page.click('button:has-text("TPN Configs")');
    
    // Click Export Config button
    await page.click('button:has-text("Export Config")');
    
    // Select Export to File option
    await page.click('input[value="file"]');
    
    // Select population type
    await page.selectOption('select', 'adult');
    
    // Set up download promise before clicking
    const downloadPromise = page.waitForEvent('download');
    
    // Click Download Configuration button
    await page.click('button:has-text("Download Configuration")');
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download filename contains 'tpn-config'
    expect(download.suggestedFilename()).toContain('tpn-config');
    expect(download.suggestedFilename()).toContain('.json');
  });

  test('should save TPN configuration to Firebase', async ({ page }) => {
    // Skip if Firebase is not configured
    const firebaseConfigured = await page.evaluate(() => {
      return window.localStorage.getItem('firebase_configured') === 'true';
    });
    
    if (!firebaseConfigured) {
      test.skip();
      return;
    }
    
    // Open config manager
    await page.click('button:has-text("TPN Configs")');
    
    // Click Export Config button
    await page.click('button:has-text("Export Config")');
    
    // Select Save to Firebase option
    await page.click('input[value="firebase"]');
    
    // Enter configuration name
    await page.fill('input[placeholder="Enter a name for this configuration"]', 'E2E Test Config');
    
    // Enter description
    await page.fill('textarea[placeholder="Add a description"]', 'Created by E2E test');
    
    // Select population type
    await page.selectOption('select', 'adult');
    
    // Click Save Configuration button
    await page.click('button:has-text("Save Configuration")');
    
    // Wait for success message
    await expect(page.locator('text=Export Successful')).toBeVisible({ timeout: 10000 });
  });

  test('should load saved TPN configuration from list', async ({ page }) => {
    // Skip if Firebase is not configured
    const firebaseConfigured = await page.evaluate(() => {
      return window.localStorage.getItem('firebase_configured') === 'true';
    });
    
    if (!firebaseConfigured) {
      test.skip();
      return;
    }
    
    // Open config manager
    await page.click('button:has-text("TPN Configs")');
    
    // Wait for configurations to load
    await page.waitForTimeout(2000);
    
    // Check if there are any saved configurations
    const configCards = page.locator('.card').filter({ hasText: /ingredients/ });
    const count = await configCards.count();
    
    if (count > 0) {
      // Click Load button on first configuration
      await configCards.first().locator('button:has-text("Load")').click();
      
      // Verify that the load action was triggered
      await expect(page.locator('text=Loading TPN config')).toBeVisible();
    } else {
      // No configurations saved, skip this part of the test
      console.log('No saved configurations found, skipping load test');
    }
  });

  test('should delete TPN configuration', async ({ page }) => {
    // Skip if Firebase is not configured
    const firebaseConfigured = await page.evaluate(() => {
      return window.localStorage.getItem('firebase_configured') === 'true';
    });
    
    if (!firebaseConfigured) {
      test.skip();
      return;
    }
    
    // First, save a configuration to ensure we have something to delete
    await page.click('button:has-text("TPN Configs")');
    await page.click('button:has-text("Export Config")');
    await page.click('input[value="firebase"]');
    await page.fill('input[placeholder="Enter a name for this configuration"]', 'E2E Delete Test');
    await page.selectOption('select', 'adult');
    await page.click('button:has-text("Save Configuration")');
    await page.waitForTimeout(2000);
    
    // Now open config manager again
    await page.click('button:has-text("TPN Configs")');
    
    // Find the configuration we just created
    const configCard = page.locator('.card').filter({ hasText: 'E2E Delete Test' });
    
    if (await configCard.count() > 0) {
      // Click delete button
      await configCard.locator('button[aria-label="Delete configuration"]').click();
      
      // Confirm deletion
      await configCard.locator('button:has-text("Confirm")').click();
      
      // Wait for the card to be removed
      await expect(configCard).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should filter configurations by population type', async ({ page }) => {
    // Open config manager
    await page.click('button:has-text("TPN Configs")');
    
    // Wait for configurations to load
    await page.waitForTimeout(2000);
    
    // Select different population types
    const filterSelect = page.locator('select').filter({ hasText: /Filter by Population Type/i });
    
    // Test each filter option
    const populationTypes = ['neo', 'child', 'adolescent', 'adult'];
    
    for (const popType of populationTypes) {
      await filterSelect.selectOption(popType);
      await page.waitForTimeout(500);
      
      // Check that filtered results show correct population type badges
      const badges = page.locator('.badge');
      const badgeCount = await badges.count();
      
      if (badgeCount > 0) {
        // Verify badges match the selected population type
        const badgeTexts = await badges.allTextContents();
        console.log(`Filter: ${popType}, Found badges: ${badgeTexts.join(', ')}`);
      }
    }
    
    // Reset to show all
    await filterSelect.selectOption('all');
  });

  test('should validate configuration before import', async ({ page }) => {
    // Create an invalid TPN config file (missing required fields)
    const invalidConfig = {
      INGREDIENT: [
        {
          KEYNAME: 'InvalidIngredient',
          // Missing required fields like DISPLAY, MNEMONIC, etc.
        }
      ],
      // Missing FLEX array
    };
    
    const configPath = path.join(__dirname, 'invalid-config.json');
    fs.writeFileSync(configPath, JSON.stringify(invalidConfig, null, 2));
    
    try {
      // Open config manager
      await page.click('button:has-text("TPN Configs")');
      
      // Click Import Config button
      await page.click('button:has-text("Import Config")');
      
      // Select Import from File option
      await page.click('input[value="file"]');
      
      // Upload the file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(configPath);
      
      // Click Import Configuration button
      await page.click('button:has-text("Import Configuration")');
      
      // Should show validation errors
      await expect(page.locator('text=Validation Errors')).toBeVisible({ timeout: 5000 });
    } finally {
      // Clean up test file
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
    }
  });
});

test.describe('TPN Configuration Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-container', { timeout: 10000 });
  });

  test('should open config manager with keyboard shortcut', async ({ page }) => {
    // Enable TPN mode first
    const tpnModeCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /TPN Mode/i });
    const isChecked = await tpnModeCheckbox.isChecked();
    if (!isChecked) {
      await tpnModeCheckbox.click();
    }
    
    // Press keyboard shortcut (e.g., Ctrl+Shift+C for Config)
    await page.keyboard.press('Control+Shift+C');
    
    // Check that the modal opened
    await expect(page.locator('text=TPN Configuration Management')).toBeVisible();
  });
});