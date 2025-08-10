import { test, expect } from '@playwright/test';

/**
 * End-to-End tests for TPN workflow scenarios
 * Tests critical user journeys for medical TPN calculation and content creation
 */

test.describe('TPN Workflow Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for app to load
    await expect(page.locator('body')).toBeVisible();
  });

  test('should complete basic TPN content creation workflow', async ({ page }) => {
    // Step 1: Enable TPN mode
    await page.click('button:has-text("TPN Mode")', { timeout: 10000 });
    await expect(page.locator('.tpn-panel')).toBeVisible();

    // Step 2: Set basic TPN parameters
    await page.fill('input[data-key="DoseWeightKG"]', '70');
    await page.fill('input[data-key="VolumePerKG"]', '100');
    await page.fill('input[data-key="Protein"]', '2.5');
    await page.fill('input[data-key="Carbohydrates"]', '15');
    await page.fill('input[data-key="Fat"]', '3');

    // Step 3: Add a new dynamic section
    await page.click('button:has-text("Add Dynamic Section")');
    
    // Wait for section to appear
    await expect(page.locator('.section-editor').first()).toBeVisible();

    // Step 4: Add dynamic content that uses TPN values
    const dynamicContent = `
      const totalVol = me.getValue('TotalVolume');
      const doseWeight = me.getValue('DoseWeightKG');
      const protein = me.getValue('Protein');
      return \`Total Volume: \${totalVol} mL for \${doseWeight} kg patient (Protein: \${protein} g/kg/day)\`;
    `;
    
    await page.fill('.code-editor textarea', dynamicContent);

    // Step 5: Verify preview shows calculated values
    const previewPanel = page.locator('.preview-panel');
    await expect(previewPanel).toContainText('Total Volume: 7000 mL');
    await expect(previewPanel).toContainText('70 kg patient');
    await expect(previewPanel).toContainText('Protein: 2.5 g/kg/day');

    // Step 6: Add a test case with different values
    await page.click('button:has-text("Add Test Case")');
    
    const testVariables = '{ "DoseWeightKG": 50, "VolumePerKG": 120 }';
    await page.fill('textarea[placeholder*="variables"]', testVariables);
    
    const expectedResult = 'Total Volume: 6000 mL for 50 kg patient';
    await page.fill('textarea[placeholder*="expected"]', expectedResult);

    // Step 7: Run test to verify calculation
    await page.click('button:has-text("Run Tests")');
    
    // Verify test results
    await expect(page.locator('.test-results .passed')).toBeVisible();
  });

  test('should handle TPN safety calculations and warnings', async ({ page }) => {
    // Enable TPN mode
    await page.click('button:has-text("TPN Mode")');
    
    // Set up parameters that might trigger safety warnings
    await page.fill('input[data-key="DoseWeightKG"]', '70');
    await page.fill('input[data-key="VolumePerKG"]', '60'); // Lower volume = higher concentration
    await page.fill('input[data-key="Carbohydrates"]', '20'); // High carb load
    await page.select('select[data-key="IVAdminSite"]', 'Peripheral');

    // Add dynamic section for osmolarity calculation
    await page.click('button:has-text("Add Dynamic Section")');
    
    const osmolarityContent = `
      const osmo = me.getValue('OsmoValue');
      const dexPercent = me.getValue('DexPercent');
      const adminSite = me.getValue('IVAdminSite');
      
      let warning = '';
      if (adminSite === 'Peripheral' && osmo > 800) {
        warning = ' ⚠️ WARNING: Osmolarity too high for peripheral administration!';
      }
      if (adminSite === 'Peripheral' && dexPercent > 12.5) {
        warning += ' ⚠️ WARNING: Dextrose concentration too high for peripheral!';
      }
      
      return \`Osmolarity: \${osmo} mOsm/L, Dextrose: \${me.maxP(dexPercent, 1)}%\${warning}\`;
    `;
    
    await page.fill('.code-editor textarea', osmolarityContent);

    // Verify warnings appear in preview
    const preview = page.locator('.preview-panel');
    await expect(preview).toContainText('⚠️ WARNING');
    await expect(preview).toContainText('Osmolarity:');
    await expect(preview).toContainText('Dextrose:');
  });

  test('should support ingredient reference management', async ({ page }) => {
    // Navigate to ingredient management
    await page.click('button:has-text("Ingredients")');
    
    // Add new ingredient reference
    await page.fill('input[placeholder*="ingredient name"]', 'Sodium Chloride');
    await page.click('button:has-text("Add Ingredient")');
    
    // Add reference content
    await page.click('button:has-text("Add Dynamic Section")');
    
    const sodiumContent = `
      const sodium = me.getValue('Sodium');
      const doseWeight = me.getValue('DoseWeightKG');
      const totalSodium = sodium * doseWeight;
      
      return \`Sodium: \${sodium} mEq/kg/day (Total: \${me.maxP(totalSodium, 1)} mEq)\`;
    `;
    
    await page.fill('.code-editor textarea', sodiumContent);
    
    // Enable TPN mode to test with values
    await page.click('button:has-text("TPN Mode")');
    await page.fill('input[data-key="Sodium"]', '3');
    await page.fill('input[data-key="DoseWeightKG"]', '70');
    
    // Verify calculation in preview
    await expect(page.locator('.preview-panel')).toContainText('Sodium: 3 mEq/kg/day');
    await expect(page.locator('.preview-panel')).toContainText('Total: 210 mEq');
    
    // Save reference
    await page.click('button:has-text("Save Reference")');
    
    // Verify saved successfully
    await expect(page.locator('.success-message')).toContainText('saved');
  });

  test('should handle multiple test cases and validation', async ({ page }) => {
    // Create complex dynamic section
    await page.click('button:has-text("Add Dynamic Section")');
    
    const complexContent = `
      const protein = me.getValue('Protein');
      const carbs = me.getValue('Carbohydrates');
      const fat = me.getValue('Fat');
      const doseWeight = me.getValue('DoseWeightKG');
      
      const proteinKcal = protein * 4 * doseWeight;
      const carbKcal = carbs * 4 * doseWeight;
      const fatKcal = fat * 9 * doseWeight;
      const totalKcal = proteinKcal + carbKcal + fatKcal;
      const kcalPerKg = totalKcal / doseWeight;
      
      return \`Total Energy: \${me.maxP(totalKcal, 0)} kcal (\${me.maxP(kcalPerKg, 1)} kcal/kg)\`;
    `;
    
    await page.fill('.code-editor textarea', complexContent);

    // Add multiple test cases
    const testCases = [
      {
        name: 'Adult Standard',
        variables: '{ "Protein": 1.5, "Carbohydrates": 4, "Fat": 1, "DoseWeightKG": 70 }',
        expected: 'Total Energy: 1330 kcal (19.0 kcal/kg)'
      },
      {
        name: 'Pediatric High Calorie',
        variables: '{ "Protein": 3, "Carbohydrates": 12, "Fat": 3, "DoseWeightKG": 20 }',
        expected: 'Total Energy: 1320 kcal (66.0 kcal/kg)'
      },
      {
        name: 'Neonatal',
        variables: '{ "Protein": 3.5, "Carbohydrates": 10, "Fat": 3, "DoseWeightKG": 3 }',
        expected: 'Total Energy: 243 kcal (81.0 kcal/kg)'
      }
    ];

    for (const testCase of testCases) {
      await page.click('button:has-text("Add Test Case")');
      
      // Fill in test case details
      const testCaseContainer = page.locator('.test-case').last();
      await testCaseContainer.locator('input[placeholder*="test name"]').fill(testCase.name);
      await testCaseContainer.locator('textarea[placeholder*="variables"]').fill(testCase.variables);
      await testCaseContainer.locator('textarea[placeholder*="expected"]').fill(testCase.expected);
    }

    // Run all tests
    await page.click('button:has-text("Run Tests")');
    
    // Verify all tests pass
    const testResults = page.locator('.test-results');
    await expect(testResults).toContainText('3 passed');
    await expect(testResults).toContainText('0 failed');
    
    // Verify individual test results
    await expect(testResults).toContainText('Adult Standard: ✅');
    await expect(testResults).toContainText('Pediatric High Calorie: ✅');
    await expect(testResults).toContainText('Neonatal: ✅');
  });

  test('should export TPN configuration correctly', async ({ page }) => {
    // Set up complete TPN configuration
    await page.click('button:has-text("TPN Mode")');
    
    // Basic parameters
    await page.fill('input[data-key="DoseWeightKG"]', '70');
    await page.fill('input[data-key="VolumePerKG"]', '100');
    await page.fill('input[data-key="InfuseOver"]', '24');
    
    // Macronutrients
    await page.fill('input[data-key="Protein"]', '2.5');
    await page.fill('input[data-key="Carbohydrates"]', '15');
    await page.fill('input[data-key="Fat"]', '3');
    
    // Electrolytes
    await page.fill('input[data-key="Sodium"]', '3');
    await page.fill('input[data-key="Potassium"]', '2');
    await page.fill('input[data-key="Calcium"]', '0.5');
    await page.fill('input[data-key="Magnesium"]', '0.3');
    await page.fill('input[data-key="Phosphate"]', '1');
    
    // Add content sections
    await page.click('button:has-text("Add Dynamic Section")');
    
    const summaryContent = `
      const totalVol = me.getValue('TotalVolume');
      const dexPercent = me.getValue('DexPercent');
      const osmo = me.getValue('OsmoValue');
      const adminSite = me.getValue('IVAdminSite');
      
      return \`
        <h3>TPN Summary</h3>
        <p>Total Volume: \${totalVol} mL</p>
        <p>Dextrose Concentration: \${me.maxP(dexPercent, 1)}%</p>
        <p>Osmolarity: \${osmo} mOsm/L</p>
        <p>Administration: \${adminSite}</p>
      \`;
    `;
    
    await page.fill('.code-editor textarea', summaryContent);
    
    // Export configuration
    await page.click('button:has-text("Export")');
    
    // Verify export dialog
    const exportDialog = page.locator('.export-dialog');
    await expect(exportDialog).toBeVisible();
    
    // Configure export settings
    await page.fill('input[name="configName"]', 'Test TPN Configuration');
    await page.fill('input[name="healthSystem"]', 'Test Hospital System');
    
    // Download export
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download JSON")');
    const download = await downloadPromise;
    
    // Verify download filename
    expect(download.suggestedFilename()).toMatch(/test.*tpn.*configuration.*\.json/i);
  });

  test('should handle error conditions gracefully', async ({ page }) => {
    // Test invalid JavaScript in dynamic section
    await page.click('button:has-text("Add Dynamic Section")');
    
    const invalidContent = 'return invalid javascript syntax !!!';
    await page.fill('.code-editor textarea', invalidContent);
    
    // Preview should show error message, not crash
    const preview = page.locator('.preview-panel');
    await expect(preview).toContainText('Error');
    
    // Test invalid TPN values
    await page.click('button:has-text("TPN Mode")');
    
    // Negative weight should be handled
    await page.fill('input[data-key="DoseWeightKG"]', '-10');
    
    // App should not crash
    await expect(page.locator('body')).toBeVisible();
    
    // Test missing required values
    await page.fill('.code-editor textarea', 'return me.getValue("NonExistentKey");');
    
    // Should handle gracefully without crashing
    await expect(preview).toBeVisible();
  });

  test('should maintain state across navigation', async ({ page }) => {
    // Set up TPN configuration
    await page.click('button:has-text("TPN Mode")');
    await page.fill('input[data-key="DoseWeightKG"]', '75');
    await page.fill('input[data-key="Protein"]', '2.8');
    
    // Add dynamic section
    await page.click('button:has-text("Add Dynamic Section")');
    await page.fill('.code-editor textarea', 'return "Test content";');
    
    // Navigate to different view
    await page.click('button:has-text("Key Reference")');
    
    // Verify key reference panel opens
    await expect(page.locator('.key-reference-panel')).toBeVisible();
    
    // Navigate back to main view
    await page.click('button:has-text("Hide Reference")');
    
    // Verify state is maintained
    await expect(page.locator('input[data-key="DoseWeightKG"]')).toHaveValue('75');
    await expect(page.locator('input[data-key="Protein"]')).toHaveValue('2.8');
    await expect(page.locator('.code-editor textarea')).toHaveValue('return "Test content";');
  });
});