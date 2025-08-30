import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test.describe('Ingredient Management', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
    
    // Enable TPN mode to access ingredient features
    await page.click('button:has-text("Settings")');
    await page.click('label:has-text("TPN Mode")');
    await page.click('button:has-text("Close")'); // Close settings
    
    // Wait for TPN mode to be active
    await page.waitForSelector('button:has-text("Ingredients")', { timeout: 5000 });
  });

  test('should open ingredient manager', async () => {
    await page.click('button:has-text("Ingredients")');
    
    // Verify the manager opens
    await expect(page.locator('h2:has-text("Manage Ingredients")')).toBeVisible();
    await expect(page.locator('text=/Total Ingredients/')).toBeVisible();
  });

  test('should show ingredient selection UI', async () => {
    await page.click('button:has-text("Ingredients")');
    await page.click('button:has-text("Export")');
    
    // Verify ingredient selector is visible
    await expect(page.locator('text=/Select Ingredients to Export/')).toBeVisible();
    await expect(page.locator('button:has-text("Select All")')).toBeVisible();
    await expect(page.locator('button:has-text("Select None")')).toBeVisible();
  });

  test('should import single ingredient from file', async () => {
    // Create a test ingredient JSON
    const ingredientJson = {
      KEYNAME: 'TestImport',
      DISPLAY: 'Test Import Ingredient',
      MNEMONIC: 'testimp',
      UOM_DISP: 'mg',
      TYPE: 'Micronutrient',
      OSMO_RATIO: 0,
      EDITMODE: 'None',
      PRECISION: 2,
      SPECIAL: '',
      NOTE: [{ TEXT: 'Imported test ingredient' }],
      ALTUOM: [],
      REFERENCE_RANGE: [
        { THRESHOLD: 'Normal Low', VALUE: 10 },
        { THRESHOLD: 'Normal High', VALUE: 100 }
      ],
      LABS: [],
      CONCENTRATION: {
        STRENGTH: 1,
        STRENGTH_UOM: 'mg',
        VOLUME: 1,
        VOLUME_UOM: 'mL'
      },
      EXCLUDES: []
    };

    await page.click('button:has-text("Ingredients")');
    await page.click('button:has-text("Import")');
    
    // Switch to paste JSON mode
    await page.click('button:has-text("Paste JSON")');
    
    // Paste the JSON
    await page.fill('textarea', JSON.stringify(ingredientJson, null, 2));
    await page.click('button:has-text("Validate Import")');
    
    // Verify preview
    await expect(page.locator('text=/Import Preview/')).toBeVisible();
    await expect(page.locator('text=/Test Import Ingredient/')).toBeVisible();
    await expect(page.locator('text=/1 ingredient ready to import/')).toBeVisible();
    
    // Complete import
    await page.click('button:has-text("Import 1 Ingredient")');
    
    // Verify success
    await expect(page.locator('text=/Successfully imported 1 ingredient/')).toBeVisible({ timeout: 5000 });
  });

  test('should handle duplicate detection during import', async () => {
    // First, import an ingredient
    const ingredientJson = {
      KEYNAME: 'DuplicateTest',
      DISPLAY: 'Duplicate Test',
      MNEMONIC: 'duptest',
      UOM_DISP: 'mg',
      TYPE: 'Micronutrient',
      OSMO_RATIO: 0,
      EDITMODE: 'None',
      PRECISION: 2,
      SPECIAL: '',
      NOTE: [],
      ALTUOM: [],
      REFERENCE_RANGE: [],
      LABS: [],
      CONCENTRATION: {
        STRENGTH: 1,
        STRENGTH_UOM: 'mg',
        VOLUME: 1,
        VOLUME_UOM: 'mL'
      },
      EXCLUDES: []
    };

    await page.click('button:has-text("Ingredients")');
    await page.click('button:has-text("Import")');
    await page.click('button:has-text("Paste JSON")');
    await page.fill('textarea', JSON.stringify(ingredientJson, null, 2));
    await page.click('button:has-text("Validate Import")');
    await page.click('button:has-text("Import 1 Ingredient")');
    
    // Try to import the same ingredient again
    await page.click('button:has-text("Import")');
    await page.click('button:has-text("Paste JSON")');
    await page.fill('textarea', JSON.stringify(ingredientJson, null, 2));
    await page.click('button:has-text("Validate Import")');
    
    // Verify duplicate warning
    await expect(page.locator('text=/Duplicate found/')).toBeVisible();
    
    // Verify merge strategy options
    await expect(page.locator('select:has-text("Skip")')).toBeVisible();
    
    // Change strategy to rename
    await page.selectOption('select', 'rename');
    await page.click('button:has-text("Import 1 Ingredient")');
    
    // Verify renamed import
    await expect(page.locator('text=/Successfully imported/')).toBeVisible({ timeout: 5000 });
  });

  test('should export selected ingredients', async () => {
    // First import some test ingredients
    const ingredients = [
      {
        KEYNAME: 'Export1',
        DISPLAY: 'Export Test 1',
        MNEMONIC: 'exp1',
        UOM_DISP: 'mg',
        TYPE: 'Micronutrient',
        OSMO_RATIO: 0,
        EDITMODE: 'None',
        PRECISION: 2,
        SPECIAL: '',
        NOTE: [],
        ALTUOM: [],
        REFERENCE_RANGE: [],
        LABS: [],
        CONCENTRATION: { STRENGTH: 1, STRENGTH_UOM: 'mg', VOLUME: 1, VOLUME_UOM: 'mL' },
        EXCLUDES: []
      },
      {
        KEYNAME: 'Export2',
        DISPLAY: 'Export Test 2',
        MNEMONIC: 'exp2',
        UOM_DISP: 'g',
        TYPE: 'Macronutrient',
        OSMO_RATIO: 0,
        EDITMODE: 'None',
        PRECISION: 1,
        SPECIAL: '',
        NOTE: [],
        ALTUOM: [],
        REFERENCE_RANGE: [],
        LABS: [],
        CONCENTRATION: { STRENGTH: 1, STRENGTH_UOM: 'g', VOLUME: 1, VOLUME_UOM: 'mL' },
        EXCLUDES: []
      }
    ];

    await page.click('button:has-text("Ingredients")');
    await page.click('button:has-text("Import")');
    await page.click('button:has-text("Paste JSON")');
    await page.fill('textarea', JSON.stringify(ingredients, null, 2));
    await page.click('button:has-text("Validate Import")');
    await page.click('button:has-text("Import 2 Ingredients")');
    
    // Now export them
    await page.click('button:has-text("Export")');
    
    // Select all ingredients
    await page.click('button:has-text("Select All")');
    
    // Verify selection count
    await expect(page.locator('text=/2 selected/')).toBeVisible();
    
    // Preview export
    await page.click('button:has-text("Preview")');
    await expect(page.locator('text=/Export Preview/')).toBeVisible();
    
    // Verify JSON preview contains our ingredients
    const previewText = await page.locator('.json-preview').textContent();
    expect(previewText).toContain('Export1');
    expect(previewText).toContain('Export2');
  });

  test('should filter ingredients by type', async () => {
    // Import diverse ingredients
    const ingredients = [
      {
        KEYNAME: 'Macro1',
        DISPLAY: 'Macronutrient 1',
        MNEMONIC: 'mac1',
        UOM_DISP: 'g',
        TYPE: 'Macronutrient',
        OSMO_RATIO: 0,
        EDITMODE: 'None',
        PRECISION: 1,
        SPECIAL: '',
        NOTE: [],
        ALTUOM: [],
        REFERENCE_RANGE: [],
        LABS: [],
        CONCENTRATION: { STRENGTH: 1, STRENGTH_UOM: 'g', VOLUME: 1, VOLUME_UOM: 'mL' },
        EXCLUDES: []
      },
      {
        KEYNAME: 'Micro1',
        DISPLAY: 'Micronutrient 1',
        MNEMONIC: 'mic1',
        UOM_DISP: 'mg',
        TYPE: 'Micronutrient',
        OSMO_RATIO: 0,
        EDITMODE: 'None',
        PRECISION: 2,
        SPECIAL: '',
        NOTE: [],
        ALTUOM: [],
        REFERENCE_RANGE: [],
        LABS: [],
        CONCENTRATION: { STRENGTH: 1, STRENGTH_UOM: 'mg', VOLUME: 1, VOLUME_UOM: 'mL' },
        EXCLUDES: []
      }
    ];

    await page.click('button:has-text("Ingredients")');
    await page.click('button:has-text("Import")');
    await page.click('button:has-text("Paste JSON")');
    await page.fill('textarea', JSON.stringify(ingredients, null, 2));
    await page.click('button:has-text("Validate Import")');
    await page.click('button:has-text("Import 2 Ingredients")');
    
    // Test filtering
    await page.selectOption('select:has-text("All Types")', 'Macronutrient');
    
    // Verify only macronutrients are shown
    await expect(page.locator('text=/Macronutrient 1/')).toBeVisible();
    await expect(page.locator('text=/Micronutrient 1/')).not.toBeVisible();
    
    // Switch filter
    await page.selectOption('select:has-text("Macronutrient")', 'Micronutrient');
    
    // Verify only micronutrients are shown
    await expect(page.locator('text=/Micronutrient 1/')).toBeVisible();
    await expect(page.locator('text=/Macronutrient 1/')).not.toBeVisible();
  });

  test('should search ingredients', async () => {
    // Import test ingredients
    const ingredients = [
      {
        KEYNAME: 'Calcium',
        DISPLAY: 'Calcium Gluconate',
        MNEMONIC: 'caglu',
        UOM_DISP: 'mg',
        TYPE: 'Micronutrient',
        OSMO_RATIO: 0,
        EDITMODE: 'None',
        PRECISION: 2,
        SPECIAL: '',
        NOTE: [],
        ALTUOM: [],
        REFERENCE_RANGE: [],
        LABS: [],
        CONCENTRATION: { STRENGTH: 1, STRENGTH_UOM: 'mg', VOLUME: 1, VOLUME_UOM: 'mL' },
        EXCLUDES: []
      },
      {
        KEYNAME: 'Iron',
        DISPLAY: 'Iron Dextran',
        MNEMONIC: 'fedex',
        UOM_DISP: 'mg',
        TYPE: 'Micronutrient',
        OSMO_RATIO: 0,
        EDITMODE: 'None',
        PRECISION: 2,
        SPECIAL: '',
        NOTE: [],
        ALTUOM: [],
        REFERENCE_RANGE: [],
        LABS: [],
        CONCENTRATION: { STRENGTH: 1, STRENGTH_UOM: 'mg', VOLUME: 1, VOLUME_UOM: 'mL' },
        EXCLUDES: []
      }
    ];

    await page.click('button:has-text("Ingredients")');
    await page.click('button:has-text("Import")');
    await page.click('button:has-text("Paste JSON")');
    await page.fill('textarea', JSON.stringify(ingredients, null, 2));
    await page.click('button:has-text("Validate Import")');
    await page.click('button:has-text("Import 2 Ingredients")');
    
    // Search for calcium
    await page.fill('input[placeholder="Search ingredients..."]', 'calcium');
    
    // Verify search results
    await expect(page.locator('text=/Calcium Gluconate/')).toBeVisible();
    await expect(page.locator('text=/Iron Dextran/')).not.toBeVisible();
    
    // Clear search
    await page.fill('input[placeholder="Search ingredients..."]', '');
    
    // Verify all ingredients are shown again
    await expect(page.locator('text=/Calcium Gluconate/')).toBeVisible();
    await expect(page.locator('text=/Iron Dextran/')).toBeVisible();
  });

  test('should handle batch export with multiple files option', async () => {
    // Import multiple ingredients
    const ingredients = [
      {
        KEYNAME: 'Batch1',
        DISPLAY: 'Batch Export 1',
        MNEMONIC: 'bat1',
        UOM_DISP: 'mg',
        TYPE: 'Micronutrient',
        OSMO_RATIO: 0,
        EDITMODE: 'None',
        PRECISION: 2,
        SPECIAL: '',
        NOTE: [],
        ALTUOM: [],
        REFERENCE_RANGE: [],
        LABS: [],
        CONCENTRATION: { STRENGTH: 1, STRENGTH_UOM: 'mg', VOLUME: 1, VOLUME_UOM: 'mL' },
        EXCLUDES: []
      },
      {
        KEYNAME: 'Batch2',
        DISPLAY: 'Batch Export 2',
        MNEMONIC: 'bat2',
        UOM_DISP: 'g',
        TYPE: 'Macronutrient',
        OSMO_RATIO: 0,
        EDITMODE: 'None',
        PRECISION: 1,
        SPECIAL: '',
        NOTE: [],
        ALTUOM: [],
        REFERENCE_RANGE: [],
        LABS: [],
        CONCENTRATION: { STRENGTH: 1, STRENGTH_UOM: 'g', VOLUME: 1, VOLUME_UOM: 'mL' },
        EXCLUDES: []
      }
    ];

    await page.click('button:has-text("Ingredients")');
    await page.click('button:has-text("Import")');
    await page.click('button:has-text("Paste JSON")');
    await page.fill('textarea', JSON.stringify(ingredients, null, 2));
    await page.click('button:has-text("Validate Import")');
    await page.click('button:has-text("Import 2 Ingredients")');
    
    await page.click('button:has-text("Export")');
    
    // Select all ingredients
    await page.click('button:has-text("Select All")');
    
    // Select multiple files option
    await page.click('input[value="multiple"]');
    
    // Preview should show multiple file indication
    await page.click('button:has-text("Preview")');
    const previewText = await page.locator('.json-preview').textContent();
    expect(previewText).toContain('... and 1 more file(s)');
  });

  test('should validate import with invalid data', async () => {
    await page.click('button:has-text("Ingredients")');
    await page.click('button:has-text("Import")');
    await page.click('button:has-text("Paste JSON")');
    
    // Try to import invalid ingredient (missing required fields)
    const invalidIngredient = {
      KEYNAME: 'Invalid',
      // Missing DISPLAY, MNEMONIC, UOM_DISP, TYPE
    };
    
    await page.fill('textarea', JSON.stringify(invalidIngredient, null, 2));
    await page.click('button:has-text("Validate Import")');
    
    // Verify validation errors
    await expect(page.locator('text=/Validation Errors/')).toBeVisible();
    await expect(page.locator('text=/Required field missing/')).toBeVisible();
  });

  test('should handle merge strategies correctly', async () => {
    // Import initial ingredient
    const ingredient = {
      KEYNAME: 'MergeTest',
      DISPLAY: 'Original Value',
      MNEMONIC: 'merge',
      UOM_DISP: 'mg',
      TYPE: 'Micronutrient',
      OSMO_RATIO: 0,
      EDITMODE: 'None',
      PRECISION: 2,
      SPECIAL: '',
      NOTE: [],
      ALTUOM: [],
      REFERENCE_RANGE: [],
      LABS: [],
      CONCENTRATION: { STRENGTH: 1, STRENGTH_UOM: 'mg', VOLUME: 1, VOLUME_UOM: 'mL' },
      EXCLUDES: []
    };

    await page.click('button:has-text("Ingredients")');
    await page.click('button:has-text("Import")');
    await page.click('button:has-text("Paste JSON")');
    await page.fill('textarea', JSON.stringify(ingredient, null, 2));
    await page.click('button:has-text("Validate Import")');
    await page.click('button:has-text("Import 1 Ingredient")');
    
    // Import duplicate with different display value
    const duplicate = { ...ingredient, DISPLAY: 'Updated Value' };
    
    await page.click('button:has-text("Import")');
    await page.click('button:has-text("Paste JSON")');
    await page.fill('textarea', JSON.stringify(duplicate, null, 2));
    await page.click('button:has-text("Validate Import")');
    
    // Test overwrite strategy
    await page.selectOption('select', 'overwrite');
    await page.click('button:has-text("Import 1 Ingredient")');
    
    // Verify the ingredient was updated
    await expect(page.locator('td:has-text("Updated Value")')).toBeVisible();
  });

  test('should export with custom filename', async () => {
    // Import an ingredient
    const ingredient = {
      KEYNAME: 'FileNameTest',
      DISPLAY: 'Filename Test',
      MNEMONIC: 'file',
      UOM_DISP: 'mg',
      TYPE: 'Micronutrient',
      OSMO_RATIO: 0,
      EDITMODE: 'None',
      PRECISION: 2,
      SPECIAL: '',
      NOTE: [],
      ALTUOM: [],
      REFERENCE_RANGE: [],
      LABS: [],
      CONCENTRATION: { STRENGTH: 1, STRENGTH_UOM: 'mg', VOLUME: 1, VOLUME_UOM: 'mL' },
      EXCLUDES: []
    };

    await page.click('button:has-text("Ingredients")');
    await page.click('button:has-text("Import")');
    await page.click('button:has-text("Paste JSON")');
    await page.fill('textarea', JSON.stringify(ingredient, null, 2));
    await page.click('button:has-text("Validate Import")');
    await page.click('button:has-text("Import 1 Ingredient")');
    
    await page.click('button:has-text("Export")');
    
    // Select the ingredient
    await page.click('input[type="checkbox"]');
    
    // Customize filename
    await page.fill('input#filename', 'my-custom-ingredients');
    
    // Verify the filename is used
    const filenameInput = await page.locator('input#filename').inputValue();
    expect(filenameInput).toBe('my-custom-ingredients');
  });
});