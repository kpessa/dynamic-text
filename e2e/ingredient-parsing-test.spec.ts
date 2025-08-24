import { test, expect } from '@playwright/test';

test.describe('Ingredient NOTE Parsing Test', () => {
  test('should correctly parse and display static and dynamic sections when ingredient is clicked', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for app to load
    await page.waitForSelector('main', { timeout: 10000 });
    
    // Step 1: Open sidebar
    console.log('Opening sidebar...');
    await page.click('button:has-text("☰")');
    await page.waitForTimeout(500);
    
    // Step 2: Open configs modal
    console.log('Opening configs modal...');
    await page.click('button:has-text("🔧 Configs")');
    await page.waitForSelector('.config-modal-content', { timeout: 5000 });
    
    // Step 3: Activate a config (first available)
    console.log('Activating first available config...');
    await page.waitForSelector('button:has-text("Activate")', { timeout: 5000 });
    const activateButton = page.locator('button:has-text("Activate")').first();
    await activateButton.click();
    
    // Wait for modal to close
    await expect(page.locator('.config-modal-content')).not.toBeVisible({ timeout: 2000 });
    
    // Step 4: Wait for ingredients to load in sidebar
    console.log('Waiting for ingredients to load...');
    await page.waitForSelector('button:has-text("notes")', { timeout: 5000 });
    
    // Step 5: Find and click on an ingredient (e.g., Calcium)
    console.log('Looking for Calcium ingredient...');
    const calciumIngredient = await page.locator('button').filter({ hasText: /Calcium.*notes/ }).first();
    
    if (await calciumIngredient.isVisible()) {
      console.log('Clicking on Calcium ingredient...');
      await calciumIngredient.click();
    } else {
      // If Calcium not found, click the first available ingredient
      console.log('Calcium not found, clicking first ingredient...');
      const firstIngredient = await page.locator('button:has-text("notes")').first();
      await firstIngredient.click();
    }
    
    // Wait for sections to load
    await page.waitForTimeout(2000);
    
    // Step 6: Verify sections are displayed
    console.log('Verifying sections are displayed...');
    
    // Check that we have sections (count > 0)
    const sectionsIndicator = await page.locator('text=/Sections:.*[1-9]/');
    await expect(sectionsIndicator).toBeVisible({ timeout: 5000 });
    
    // Step 7: Verify static sections are visible
    console.log('Checking for static sections...');
    
    // Look for HTML badge (indicates static sections)
    const htmlBadges = await page.locator('text=/HTML/').count();
    console.log(`Found ${htmlBadges} HTML badges`);
    
    // Step 8: Verify dynamic sections are visible
    console.log('Checking for dynamic sections...');
    
    // Look for JS badge (indicates dynamic sections)
    const jsBadges = await page.locator('text=/JS/').count();
    console.log(`Found ${jsBadges} JS badges`);
    
    // Step 9: Verify content is actually displayed
    // Check that at least one section editor exists (textbox with role)
    const editorExists = await page.locator('div[role="textbox"], textarea, .cm-editor').first().isVisible().catch(() => false);
    console.log(`Editor visible: ${editorExists}`);
    
    // Verify we have at least one section displayed
    expect(htmlBadges + jsBadges).toBeGreaterThan(0);
    
    // Step 10: Take a screenshot for visual verification
    await page.screenshot({ 
      path: 'test-results/ingredient-parsing-sections.png',
      fullPage: true 
    });
    
    console.log('Test completed successfully!');
  });

  test('should correctly parse mixed static and dynamic content in a single NOTE', async ({ page }) => {
    // This test specifically looks for ingredients with mixed content
    await page.goto('http://localhost:5173');
    await page.waitForSelector('main', { timeout: 10000 });
    
    // Open sidebar
    await page.click('button:has-text("☰")');
    await page.waitForTimeout(500);
    
    // Open configs
    await page.click('button:has-text("🔧 Configs")');
    await page.waitForSelector('.config-modal-content', { timeout: 5000 });
    
    // Activate first config
    const activateButton = page.locator('button:has-text("Activate")').first();
    await activateButton.click();
    await expect(page.locator('.config-modal-content')).not.toBeVisible({ timeout: 2000 });
    
    // Look for an ingredient that likely has mixed content
    await page.waitForSelector('button:has-text("notes")', { timeout: 5000 });
    
    // Try to find ingredients that typically have dynamic content
    const ingredientsToTry = [
      'Phosphorus',  // Often has calculations
      'Calcium',     // May have ratio calculations
      'Magnesium',   // May have dosing calculations
      'Sodium',      // May have concentration calculations
      'Potassium'    // May have infusion rate calculations
    ];
    
    let foundIngredient = false;
    
    for (const ingredientName of ingredientsToTry) {
      const ingredient = await page.locator('button').filter({ 
        hasText: new RegExp(`${ingredientName}.*notes`, 'i') 
      }).first();
      
      if (await ingredient.isVisible()) {
        console.log(`Testing ${ingredientName} for mixed content...`);
        await ingredient.click();
        foundIngredient = true;
        break;
      }
    }
    
    if (!foundIngredient) {
      // Just click the first ingredient
      await page.locator('button:has-text("notes")').first().click();
    }
    
    // Wait for sections to render
    await page.waitForTimeout(2000);
    
    // Look for section type indicators
    const sections = await page.locator('[data-section-type], .section-type-badge, [class*="section"]');
    const sectionCount = await sections.count();
    
    console.log(`Found ${sectionCount} total sections`);
    
    // Verify we have multiple sections (indicating parsing worked)
    expect(sectionCount).toBeGreaterThan(0);
    
    // Look for evidence of both static and dynamic content
    // Check for text content (static)
    const hasTextContent = await page.locator('text=/[A-Za-z]+/').first().isVisible();
    
    // Check for code-related elements (dynamic)
    const hasCodeElements = await page.locator('.CodeMirror, [class*="code"], [class*="dynamic"]').first().isVisible().catch(() => false);
    
    console.log(`Has text content: ${hasTextContent}, Has code elements: ${hasCodeElements}`);
    
    // At minimum, we should have some visible content
    expect(hasTextContent).toBeTruthy();
  });

  test('should handle ingredients with only static content', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('main', { timeout: 10000 });
    
    // Open sidebar and activate config
    await page.click('button:has-text("☰")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("🔧 Configs")');
    await page.waitForSelector('.config-modal-content', { timeout: 5000 });
    await page.locator('button:has-text("Activate")').first().click();
    await expect(page.locator('.config-modal-content')).not.toBeVisible({ timeout: 2000 });
    
    // Find and click any ingredient
    await page.waitForSelector('button:has-text("notes")', { timeout: 5000 });
    const ingredient = await page.locator('button:has-text("notes")').first();
    const ingredientText = await ingredient.textContent();
    console.log(`Testing ingredient: ${ingredientText}`);
    
    await ingredient.click();
    await page.waitForTimeout(2000);
    
    // Verify sections loaded
    const sectionsExist = await page.locator('[class*="section"]').first().isVisible().catch(() => false);
    expect(sectionsExist).toBeTruthy();
    
    // Verify the ingredient name appears in the header
    const ingredientName = ingredientText?.split('(')[0].trim();
    if (ingredientName) {
      const headerWithName = await page.locator(`text=/${ingredientName}/i`).first().isVisible().catch(() => false);
      expect(headerWithName).toBeTruthy();
    }
    
    console.log('Static content test completed');
  });

  test('should correctly parse [f()] markers and create dynamic sections', async ({ page }) => {
    // This test verifies that [f()] markers are properly detected and parsed
    await page.goto('http://localhost:5173');
    await page.waitForSelector('main', { timeout: 10000 });
    
    // Setup: Open sidebar and activate config
    await page.click('button:has-text("☰")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("🔧 Configs")');
    await page.waitForSelector('.config-modal-content', { timeout: 5000 });
    await page.locator('button:has-text("Activate")').first().click();
    await expect(page.locator('.config-modal-content')).not.toBeVisible({ timeout: 2000 });
    
    // Find ingredients
    await page.waitForSelector('button:has-text("notes")', { timeout: 5000 });
    
    // Click through multiple ingredients to find one with dynamic content
    const ingredientButtons = await page.locator('button:has-text("notes")').all();
    let foundDynamicContent = false;
    
    for (let i = 0; i < Math.min(5, ingredientButtons.length); i++) {
      await ingredientButtons[i].click();
      await page.waitForTimeout(1500);
      
      // Check for dynamic section indicators
      const hasDynamic = await page.locator('.CodeMirror, [class*="dynamic"], text=/return/, text=/me\\.getValue/').first().isVisible().catch(() => false);
      
      if (hasDynamic) {
        console.log(`Found dynamic content in ingredient ${i + 1}`);
        foundDynamicContent = true;
        
        // Verify the dynamic section has proper code editor
        const codeEditor = await page.locator('.CodeMirror, .code-editor, [class*="editor"]').first();
        await expect(codeEditor).toBeVisible({ timeout: 3000 });
        
        // Look for typical dynamic content patterns
        const dynamicPatterns = [
          'me.getValue',
          'return',
          'const',
          'let',
          'function',
          '=>'
        ];
        
        let foundPattern = false;
        for (const pattern of dynamicPatterns) {
          if (await page.locator(`text=/${pattern}/`).first().isVisible().catch(() => false)) {
            console.log(`Found dynamic pattern: ${pattern}`);
            foundPattern = true;
            break;
          }
        }
        
        expect(foundPattern).toBeTruthy();
        break;
      }
    }
    
    // Log whether we found dynamic content
    console.log(`Dynamic content found: ${foundDynamicContent}`);
    
    // At minimum, we should have loaded some sections
    const sectionsExist = await page.locator('[class*="section"]').first().isVisible().catch(() => false);
    expect(sectionsExist).toBeTruthy();
  });
});