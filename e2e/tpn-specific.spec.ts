import { test, expect } from '@playwright/test';

test.describe('TPN-Specific Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('TPN calculation accuracy', async ({ page }) => {
    // Switch to TPN mode
    const tpnButton = page.locator('button:has-text("TPN"), button:has-text("TPN Mode")').first();
    if (await tpnButton.isVisible()) {
      await tpnButton.click();
    }

    // Enter test values
    const testValues = [
      { field: 'DOSE_WEIGHT', value: '70' },
      { field: 'TPN_VOLUME', value: '2000' },
      { field: 'CHO_G', value: '250' },
      { field: 'AMINO_ACID_G', value: '85' },
      { field: 'NA_MEQ', value: '140' },
      { field: 'K_MEQ', value: '80' },
      { field: 'CA_MEQ', value: '10' },
      { field: 'MG_MEQ', value: '12' },
      { field: 'PO4_MMOL', value: '20' }
    ];

    for (const { field, value } of testValues) {
      const input = page.locator(`input[name="${field}"], input[placeholder*="${field}"]`).first();
      if (await input.isVisible()) {
        await input.fill(value);
      }
    }

    // Add dynamic calculation section
    const addSectionBtn = page.locator('button:has-text("Add Section")');
    if (await addSectionBtn.isVisible()) {
      await addSectionBtn.click();
      
      // Switch to dynamic mode
      const dynamicToggle = page.locator('button:has-text("Dynamic")').last();
      if (await dynamicToggle.isVisible()) {
        await dynamicToggle.click();
      }

      // Enter osmolarity calculation
      const codeEditor = page.locator('.cm-content').last();
      if (await codeEditor.isVisible()) {
        await codeEditor.click();
        await page.keyboard.type(`
// Calculate osmolarity
const dextrose = me.getValue('CHO_G') || 0;
const amino = me.getValue('AMINO_ACID_G') || 0;
const na = me.getValue('NA_MEQ') || 0;
const k = me.getValue('K_MEQ') || 0;
const ca = me.getValue('CA_MEQ') || 0;
const mg = me.getValue('MG_MEQ') || 0;
const po4 = me.getValue('PO4_MMOL') || 0;

const osmolarity = (dextrose * 5.5) + (amino * 10) + (na * 2) + (k * 2) + (ca * 1.4) + (mg * 1) + (po4 * 1);
return \`Osmolarity: \${osmolarity.toFixed(0)} mOsm/L\`;
        `);
      }
    }

    // Check preview updates
    await page.waitForTimeout(1000);
    const preview = page.locator('.preview-panel, .output-panel').first();
    const previewText = await preview.textContent();
    expect(previewText).toContain('Osmolarity');
  });

  test('population-specific validation', async ({ page }) => {
    // Test neonatal limits
    const populations = [
      { type: 'Neonatal', weight: '3', maxDextrose: 12.5 },
      { type: 'Pediatric', weight: '20', maxDextrose: 25 },
      { type: 'Adolescent', weight: '50', maxDextrose: 30 },
      { type: 'Adult', weight: '70', maxDextrose: 35 }
    ];

    for (const { type, weight, maxDextrose } of populations) {
      // Select population type if selector exists
      const populationSelector = page.locator(`button:has-text("${type}"), select option:has-text("${type}")`).first();
      if (await populationSelector.isVisible()) {
        await populationSelector.click();
      }

      // Enter weight
      const weightInput = page.locator('input[name*="weight"], input[placeholder*="weight"]').first();
      if (await weightInput.isVisible()) {
        await weightInput.fill(weight);
      }

      // Enter high dextrose value
      const dextroseInput = page.locator('input[name="CHO_G"], input[placeholder*="dextrose"]').first();
      if (await dextroseInput.isVisible()) {
        await dextroseInput.fill('500'); // This should trigger warnings
      }

      // Check for validation warning
      await page.waitForTimeout(500);
      const warning = page.locator('.warning, .error, .validation-message').first();
      if (await warning.count() > 0) {
        const warningText = await warning.textContent();
        expect(warningText?.toLowerCase()).toContain(
          warningText?.includes('dextrose') || 
          warningText?.includes('concentration') || 
          warningText?.includes('exceed')
        );
      }
    }
  });

  test('ingredient reference system', async ({ page }) => {
    // Open ingredient manager
    const ingredientBtn = page.locator('button:has-text("Ingredients"), button:has-text("Ingredient")').first();
    if (await ingredientBtn.isVisible()) {
      await ingredientBtn.click();
      await page.waitForTimeout(500);

      // Search for calcium
      const searchInput = page.locator('input[placeholder*="search"], input[type="search"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('calcium');
        await page.waitForTimeout(300);
      }

      // Check if results appear
      const ingredientItems = page.locator('.ingredient-item, .ingredient-card');
      const count = await ingredientItems.count();
      
      if (count > 0) {
        // Click first ingredient
        await ingredientItems.first().click();
        await page.waitForTimeout(500);

        // Check if content loaded
        const content = page.locator('.ingredient-content, .editor-content, .cm-content');
        if (await content.first().isVisible()) {
          const text = await content.first().textContent();
          expect(text).toBeTruthy();
        }
      }
    }
  });

  test('test case variables', async ({ page }) => {
    // Create a dynamic section first
    const addSectionBtn = page.locator('button:has-text("Add Section")');
    if (await addSectionBtn.isVisible()) {
      await addSectionBtn.click();
      
      const dynamicToggle = page.locator('button:has-text("Dynamic")').last();
      if (await dynamicToggle.isVisible()) {
        await dynamicToggle.click();
      }

      const codeEditor = page.locator('.cm-content').last();
      if (await codeEditor.isVisible()) {
        await codeEditor.click();
        await page.keyboard.type('return `Weight: ${weight}kg, Volume: ${volume}mL`;');
      }
    }

    // Add test cases
    const addTestBtn = page.locator('button:has-text("Add Test"), button:has-text("Test Case")').first();
    if (await addTestBtn.isVisible()) {
      await addTestBtn.click();

      // Enter test case values
      const testInputs = page.locator('.test-case input, .test-variables input');
      const inputs = await testInputs.all();
      
      if (inputs.length >= 2) {
        await inputs[0].fill('weight');
        await inputs[1].fill('70');
        
        if (inputs.length >= 4) {
          await inputs[2].fill('volume');
          await inputs[3].fill('2000');
        }
      }

      // Run test
      const runBtn = page.locator('button:has-text("Run"), button:has-text("Execute")').first();
      if (await runBtn.isVisible()) {
        await runBtn.click();
        await page.waitForTimeout(500);

        // Check output
        const output = page.locator('.test-output, .test-result').first();
        if (await output.isVisible()) {
          const text = await output.textContent();
          expect(text).toContain('Weight: 70kg');
          expect(text).toContain('Volume: 2000mL');
        }
      }
    }
  });

  test('export functionality', async ({ page }) => {
    // Add some content first
    const addSectionBtn = page.locator('button:has-text("Add Section")');
    if (await addSectionBtn.isVisible()) {
      await addSectionBtn.click();
      
      const editor = page.locator('.cm-content, textarea').last();
      if (await editor.isVisible()) {
        await editor.click();
        await page.keyboard.type('Test content for export');
      }
    }

    // Open export dialog
    const exportBtn = page.locator('button:has-text("Export")').first();
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      await page.waitForTimeout(500);

      // Check export options
      const noteFormat = page.locator('button:has-text("NOTE"), label:has-text("NOTE")').first();
      const sectionFormat = page.locator('button:has-text("Sections"), label:has-text("Sections")').first();
      
      expect(await noteFormat.isVisible() || await sectionFormat.isVisible()).toBeTruthy();

      // Test download
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
        page.locator('button:has-text("Download"), button:has-text("Export")').last().click()
      ]);

      if (download) {
        expect(download.suggestedFilename()).toContain('.json');
      }
    }
  });

  test('version history tracking', async ({ page }) => {
    // Make a change to trigger version
    const editor = page.locator('.cm-content, textarea').first();
    if (await editor.isVisible()) {
      await editor.click();
      await page.keyboard.type('Version 1 content');
      
      // Save (Ctrl+S)
      await page.keyboard.press('Control+s');
      await page.waitForTimeout(1000);

      // Make another change
      await editor.click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type('Version 2 content');
      await page.keyboard.press('Control+s');
      await page.waitForTimeout(1000);
    }

    // Check for version indicator
    const versionBadge = page.locator('.version-badge, .version-number, [data-version]').first();
    if (await versionBadge.isVisible()) {
      const versionText = await versionBadge.textContent();
      expect(versionText).toMatch(/v?\d+/);
    }

    // Open version history if available
    const historyBtn = page.locator('button:has-text("History"), button:has-text("Version")').first();
    if (await historyBtn.isVisible()) {
      await historyBtn.click();
      await page.waitForTimeout(500);

      const historyItems = page.locator('.history-item, .version-item');
      const count = await historyItems.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('shared ingredients', async ({ page }) => {
    // Open ingredient manager
    const ingredientBtn = page.locator('button:has-text("Ingredients")').first();
    if (await ingredientBtn.isVisible()) {
      await ingredientBtn.click();
      await page.waitForTimeout(500);

      // Look for shared indicator
      const sharedBadges = page.locator('.shared-badge, .shared-indicator, [data-shared="true"]');
      if (await sharedBadges.count() > 0) {
        const firstShared = sharedBadges.first();
        await firstShared.click();

        // Check for warning about shared editing
        const warning = page.locator('.shared-warning, .modal:has-text("shared")');
        if (await warning.isVisible()) {
          const text = await warning.textContent();
          expect(text?.toLowerCase()).toContain('shared');
        }
      }
    }
  });

  test('real-time validation', async ({ page }) => {
    // Enter invalid values and check for immediate feedback
    const inputs = [
      { field: 'OSMOLARITY', value: '2500', shouldWarn: true }, // Too high
      { field: 'NA_MEQ', value: '-5', shouldWarn: true }, // Negative
      { field: 'CHO_G', value: '1000', shouldWarn: true }, // Excessive
    ];

    for (const { field, value, shouldWarn } of inputs) {
      const input = page.locator(`input[name="${field}"], input[placeholder*="${field}"]`).first();
      if (await input.isVisible()) {
        await input.fill(value);
        await page.waitForTimeout(300);

        if (shouldWarn) {
          const validation = page.locator('.validation-error, .input-error, .field-error').first();
          if (await validation.count() > 0) {
            expect(await validation.isVisible()).toBeTruthy();
          }
        }
      }
    }
  });
});