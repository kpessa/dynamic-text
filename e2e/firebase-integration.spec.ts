import { test, expect } from '@playwright/test';

/**
 * End-to-End tests for Firebase integration scenarios
 * Tests data persistence, ingredient management, and cross-health system features
 */

test.describe('Firebase Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Mock Firebase for testing (in real scenarios, use test Firebase project)
    await page.addInitScript(() => {
      // Mock Firebase functions for E2E testing
      window.__FIREBASE_MOCK__ = true;
    });
  });

  test('should save and load ingredient references', async ({ page }) => {
    // Enable Firebase features
    await page.click('button:has-text("Enable Firebase")');
    
    // Create new ingredient
    await page.fill('input[placeholder*="ingredient name"]', 'Potassium Chloride');
    
    // Add dynamic content
    await page.click('button:has-text("Add Dynamic Section")');
    
    const potassiumContent = `
      const potassium = me.getValue('Potassium');
      const doseWeight = me.getValue('DoseWeightKG');
      const chloride = me.getValue('Chloride');
      
      const totalPotassium = potassium * doseWeight;
      const kcl = totalPotassium; // Simplified - 1 mEq K+ = 1 mEq Cl-
      
      return \`
        <h3>Potassium Chloride</h3>
        <p>Dose: \${potassium} mEq/kg/day</p>
        <p>Total Daily Dose: \${me.maxP(totalPotassium, 1)} mEq</p>
        <p>KCl Required: \${me.maxP(kcl, 1)} mEq</p>
        <p>Volume at 2 mEq/mL: \${me.maxP(kcl/2, 1)} mL</p>
      \`;
    `;
    
    await page.fill('.code-editor textarea', potassiumContent);
    
    // Set health system and population
    await page.fill('input[name="healthSystem"]', 'Children\'s Hospital Test');
    await page.selectOption('select[name="populationType"]', 'pediatric');
    
    // Save reference
    await page.click('button:has-text("Save to Firebase")');
    
    // Verify save success
    await expect(page.locator('.success-notification')).toContainText('saved successfully');
    
    // Verify reference appears in saved list
    await page.click('button:has-text("Load References")');
    await expect(page.locator('.reference-list')).toContainText('Potassium Chloride');
    await expect(page.locator('.reference-list')).toContainText('Children\'s Hospital Test');
  });

  test('should import and manage TPN configurations', async ({ page }) => {
    // Navigate to import functionality
    await page.click('button:has-text("Import Config")');
    
    // Mock file upload with test configuration
    const testConfig = {
      name: 'CHOC Adult TPN Configuration',
      healthSystem: 'Children\'s Hospital of Orange County',
      domain: 'adult',
      version: 'v1.0',
      INGREDIENT: [
        {
          KEYNAME: 'Amino Acids (Trophamine)',
          NOTE: [{
            TEXT: 'Protein source providing essential amino acids for TPN'
          }]
        },
        {
          KEYNAME: 'Dextrose',
          NOTE: [{
            TEXT: 'Primary carbohydrate source. Concentration: [f(me.getValue("DexPercent") + "%")]'
          }]
        },
        {
          KEYNAME: 'Lipids (Intralipid)',
          NOTE: [{
            TEXT: 'Essential fatty acids. Volume: [f(me.getValue("LipidVolTotal") + " mL")]'
          }]
        }
      ]
    };
    
    // Upload configuration
    await page.setInputFiles('input[type="file"]', {
      name: 'test-config.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(testConfig))
    });
    
    await page.click('button:has-text("Import")');
    
    // Verify import success
    await expect(page.locator('.import-results')).toContainText('3 ingredients imported');
    await expect(page.locator('.import-results')).toContainText('CHOC Adult TPN Configuration');
    
    // Verify ingredients are available
    await page.click('button:has-text("View Ingredients")');
    await expect(page.locator('.ingredient-list')).toContainText('Amino Acids (Trophamine)');
    await expect(page.locator('.ingredient-list')).toContainText('Dextrose');
    await expect(page.locator('.ingredient-list')).toContainText('Lipids (Intralipid)');
  });

  test('should handle duplicate detection during import', async ({ page }) => {
    // First import - create baseline
    await page.click('button:has-text("Import Config")');
    
    const originalConfig = {
      name: 'Original Config',
      INGREDIENT: [
        {
          KEYNAME: 'Sodium Chloride',
          NOTE: [{ TEXT: 'Original sodium chloride content' }]
        }
      ]
    };
    
    await page.setInputFiles('input[type="file"]', {
      name: 'original.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(originalConfig))
    });
    
    await page.click('button:has-text("Import")');
    await expect(page.locator('.import-results')).toContainText('1 ingredients imported');
    
    // Second import - with duplicates
    const duplicateConfig = {
      name: 'Duplicate Config',
      INGREDIENT: [
        {
          KEYNAME: 'Sodium Chloride',
          NOTE: [{ TEXT: 'Modified sodium chloride content' }]
        },
        {
          KEYNAME: 'New Ingredient',
          NOTE: [{ TEXT: 'Completely new ingredient' }]
        }
      ]
    };
    
    await page.setInputFiles('input[type="file"]', {
      name: 'duplicate.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(duplicateConfig))
    });
    
    await page.click('button:has-text("Import")');
    
    // Verify duplicate detection dialog
    await expect(page.locator('.duplicate-dialog')).toBeVisible();
    await expect(page.locator('.duplicate-dialog')).toContainText('1 duplicates found');
    await expect(page.locator('.duplicate-dialog')).toContainText('1 variations detected');
    
    // Choose to merge duplicates
    await page.click('button:has-text("Merge Duplicates")');
    
    // Verify merge completed
    await expect(page.locator('.import-results')).toContainText('Merged 1 duplicates');
    await expect(page.locator('.import-results')).toContainText('1 new ingredients');
  });

  test('should support cross-health system ingredient comparison', async ({ page }) => {
    // Set up ingredients from multiple health systems
    const healthSystems = [
      {
        name: 'Children\'s Hospital A',
        ingredients: [{
          name: 'Calcium Gluconate',
          content: 'Calcium dose: [f(me.getValue("Calcium") * me.getValue("DoseWeightKG"))] mEq'
        }]
      },
      {
        name: 'Children\'s Hospital B', 
        ingredients: [{
          name: 'Calcium Gluconate',
          content: 'Total calcium: [f(me.maxP(me.getValue("Calcium") * me.getValue("DoseWeightKG"), 1))] mEq/day'
        }]
      }
    ];
    
    // Import from first health system
    for (const hs of healthSystems) {
      await page.fill('input[name="healthSystem"]', hs.name);
      
      for (const ingredient of hs.ingredients) {
        await page.fill('input[placeholder*="ingredient name"]', ingredient.name);
        await page.click('button:has-text("Add Dynamic Section")');
        await page.fill('.code-editor textarea', `return \`${ingredient.content}\`;`);
        await page.click('button:has-text("Save to Firebase")');
        await expect(page.locator('.success-notification')).toBeVisible();
      }
    }
    
    // Navigate to comparison tool
    await page.click('button:has-text("Compare Ingredients")');
    
    // Select ingredient to compare
    await page.selectOption('select[name="ingredient"]', 'Calcium Gluconate');
    
    // Verify comparison shows both versions
    const comparisonPanel = page.locator('.comparison-panel');
    await expect(comparisonPanel).toContainText('Children\'s Hospital A');
    await expect(comparisonPanel).toContainText('Children\'s Hospital B');
    await expect(comparisonPanel).toContainText('Differences detected');
    
    // Test with TPN values
    await page.click('button:has-text("Test with Values")');
    await page.fill('input[data-key="Calcium"]', '0.5');
    await page.fill('input[data-key="DoseWeightKG"]', '20');
    
    // Both versions should calculate same result but display differently
    await expect(comparisonPanel).toContainText('10 mEq'); // Both should show 0.5 * 20 = 10
  });

  test('should handle version control and change tracking', async ({ page }) => {
    // Create initial version of ingredient
    await page.fill('input[placeholder*="ingredient name"]', 'Multi Vitamin');
    await page.click('button:has-text("Add Dynamic Section")');
    
    const initialContent = 'return "Multi-vitamin dose: 5 mL/day";';
    await page.fill('.code-editor textarea', initialContent);
    
    await page.fill('input[name="commitMessage"]', 'Initial multi-vitamin reference');
    await page.click('button:has-text("Save to Firebase")');
    
    await expect(page.locator('.success-notification')).toContainText('Version 1 saved');
    
    // Modify content
    const updatedContent = `
      const doseWeight = me.getValue('DoseWeightKG');
      const mvDose = doseWeight > 30 ? 10 : 5; // Adult vs pediatric dose
      return \`Multi-vitamin dose: \${mvDose} mL/day (Weight-based dosing)\`;
    `;
    
    await page.fill('.code-editor textarea', updatedContent);
    await page.fill('input[name="commitMessage"]', 'Add weight-based dosing logic');
    await page.click('button:has-text("Save to Firebase")');
    
    await expect(page.locator('.success-notification')).toContainText('Version 2 saved');
    
    // View version history
    await page.click('button:has-text("Version History")');
    
    const versionHistory = page.locator('.version-history');
    await expect(versionHistory).toContainText('Version 2');
    await expect(versionHistory).toContainText('Add weight-based dosing logic');
    await expect(versionHistory).toContainText('Version 1');
    await expect(versionHistory).toContainText('Initial multi-vitamin reference');
    
    // Revert to previous version
    await page.click('.version-history .version-1 button:has-text("Revert")');
    
    // Verify content reverted
    await expect(page.locator('.code-editor textarea')).toHaveValue(initialContent);
    
    // Verify preview shows original output
    await expect(page.locator('.preview-panel')).toContainText('Multi-vitamin dose: 5 mL/day');
  });

  test('should validate and test TPN calculations across configurations', async ({ page }) => {
    // Import multiple configurations for testing
    const configs = [
      {
        name: 'Adult Standard TPN',
        healthSystem: 'Hospital A',
        testValues: { DoseWeightKG: 70, VolumePerKG: 35, Protein: 1.5, Carbohydrates: 4, Fat: 1 }
      },
      {
        name: 'Pediatric High Calorie TPN',
        healthSystem: 'Children\'s Hospital B', 
        testValues: { DoseWeightKG: 20, VolumePerKG: 100, Protein: 3, Carbohydrates: 12, Fat: 3 }
      }
    ];
    
    for (const config of configs) {
      // Set up configuration
      await page.fill('input[name="configName"]', config.name);
      await page.fill('input[name="healthSystem"]', config.healthSystem);
      
      // Add validation test
      await page.click('button:has-text("Add Dynamic Section")');
      
      const validationContent = `
        const totalVol = me.getValue('TotalVolume');
        const dexPercent = me.getValue('DexPercent');
        const osmo = me.getValue('OsmoValue');
        const protein = me.getValue('Protein');
        const carbs = me.getValue('Carbohydrates');
        const fat = me.getValue('Fat');
        const doseWeight = me.getValue('DoseWeightKG');
        
        // Calculate total calories
        const totalKcal = (protein * 4 + carbs * 4 + fat * 9) * doseWeight;
        const kcalPerKg = totalKcal / doseWeight;
        
        // Safety checks
        let warnings = [];
        if (dexPercent > 35) warnings.push('High dextrose concentration');
        if (osmo > 900) warnings.push('High osmolarity');
        if (kcalPerKg > 120) warnings.push('High calorie density');
        
        return \`
          <div class="tpn-validation">
            <h3>\${config.name} Validation</h3>
            <p>Total Volume: \${totalVol} mL</p>
            <p>Total Calories: \${me.maxP(totalKcal, 0)} kcal (\${me.maxP(kcalPerKg, 1)} kcal/kg)</p>
            <p>Dextrose: \${me.maxP(dexPercent, 1)}%</p>
            <p>Osmolarity: \${osmo} mOsm/L</p>
            \${warnings.length ? '<div class="warnings">⚠️ ' + warnings.join(', ') + '</div>' : ''}
          </div>
        \`;
      `;
      
      await page.fill('.code-editor textarea', validationContent);
      
      // Set up test case with configuration values
      await page.click('button:has-text("Add Test Case")');
      await page.fill('textarea[placeholder*="variables"]', JSON.stringify(config.testValues));
      
      // Save configuration
      await page.click('button:has-text("Save Configuration")');
      await expect(page.locator('.success-notification')).toBeVisible();
    }
    
    // Run comprehensive validation
    await page.click('button:has-text("Run All Validations")');
    
    // Verify all configurations pass safety checks
    const validationResults = page.locator('.validation-results');
    await expect(validationResults).toContainText('Adult Standard TPN: ✅');
    await expect(validationResults).toContainText('Pediatric High Calorie TPN: ✅');
    
    // Check for any warnings
    const adultResults = validationResults.locator('.adult-standard');
    const pediatricResults = validationResults.locator('.pediatric-high-calorie');
    
    // Adult should have lower calorie density
    await expect(adultResults).toContainText('kcal/kg');
    await expect(pediatricResults).toContainText('kcal/kg');
    
    // No safety warnings should appear for standard configurations
    await expect(validationResults.locator('.warnings')).toHaveCount(0);
  });

  test('should support offline mode and sync when reconnected', async ({ page }) => {
    // Start online, make changes
    await page.fill('input[placeholder*="ingredient name"]', 'Test Offline Ingredient');
    await page.click('button:has-text("Add Dynamic Section")');
    await page.fill('.code-editor textarea', 'return "Offline test content";');
    
    // Go offline
    await page.context().setOffline(true);
    
    // Continue making changes offline
    await page.fill('input[name="commitMessage"]', 'Changes made offline');
    await page.click('button:has-text("Save")');
    
    // Verify offline indicator
    await expect(page.locator('.offline-indicator')).toBeVisible();
    await expect(page.locator('.pending-changes')).toContainText('1 change pending sync');
    
    // Go back online
    await page.context().setOffline(false);
    
    // Trigger sync
    await page.click('button:has-text("Sync Changes")');
    
    // Verify sync completed
    await expect(page.locator('.sync-success')).toContainText('Successfully synced 1 change');
    await expect(page.locator('.offline-indicator')).not.toBeVisible();
    
    // Verify data persisted
    await page.reload();
    await page.fill('input[placeholder*="ingredient name"]', 'Test Offline Ingredient');
    await page.click('button:has-text("Load")');
    await expect(page.locator('.code-editor textarea')).toHaveValue('return "Offline test content";');
  });
});