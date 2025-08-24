import { test, expect } from '@playwright/test';

test.describe('Interactive Testing with Playwright', () => {
  test('explore app and take screenshots', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for loading screen to disappear
    const loadingScreen = page.locator('#loading-screen, .loading-screen');
    if (await loadingScreen.isVisible()) {
      await loadingScreen.waitFor({ state: 'hidden', timeout: 10000 });
    }
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'screenshots/01-initial-load.png',
      fullPage: true 
    });
    console.log('✅ Screenshot: Initial app load');
    
    // Check for main UI elements
    const title = await page.textContent('h1, .title, [class*="title"]');
    console.log(`📱 App Title: ${title}`);
    
    // Look for TPN Mode button and click it
    const tpnButton = page.locator('button:has-text("TPN"), button:has-text("Show TPN Panel")').first();
    if (await tpnButton.isVisible()) {
      await tpnButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ 
        path: 'screenshots/02-tpn-mode.png',
        fullPage: true 
      });
      console.log('✅ Screenshot: TPN Mode activated');
    }
    
    // Check for input fields and fill some test data
    const weightInput = page.locator('input[placeholder*="weight" i], input[name*="weight" i]').first();
    if (await weightInput.isVisible()) {
      await weightInput.fill('70');
      console.log('✅ Entered weight: 70kg');
    }
    
    // Add a new section
    const addSectionButtons = await page.locator('button:has-text("Add"), button:has-text("Section")').all();
    console.log(`Found ${addSectionButtons.length} add section buttons`);
    
    if (addSectionButtons.length > 0) {
      await addSectionButtons[0].click();
      await page.waitForTimeout(500);
      await page.screenshot({ 
        path: 'screenshots/03-new-section.png',
        fullPage: true 
      });
      console.log('✅ Screenshot: New section added');
    }
    
    // Check for code editor
    const codeEditor = page.locator('.cm-content, .code-editor, textarea').first();
    if (await codeEditor.isVisible()) {
      await codeEditor.click();
      await page.keyboard.type('// Test dynamic code\nreturn "Hello from Playwright!";');
      await page.screenshot({ 
        path: 'screenshots/04-code-editor.png',
        fullPage: true 
      });
      console.log('✅ Screenshot: Code editor with content');
    }
    
    // Check preview panel
    const previewPanel = page.locator('.preview, [class*="preview"]').first();
    if (await previewPanel.isVisible()) {
      const previewContent = await previewPanel.textContent();
      console.log(`📄 Preview content: ${previewContent?.substring(0, 100)}...`);
    }
    
    // Test responsive design
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ 
      path: 'screenshots/05-mobile-view.png',
      fullPage: true 
    });
    console.log('✅ Screenshot: Mobile view (375x667)');
    
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ 
      path: 'screenshots/06-tablet-view.png',
      fullPage: true 
    });
    console.log('✅ Screenshot: Tablet view (768x1024)');
    
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ 
      path: 'screenshots/07-desktop-view.png',
      fullPage: true 
    });
    console.log('✅ Screenshot: Desktop view (1920x1080)');
    
    // Get all visible buttons and their text
    const buttons = await page.locator('button:visible').all();
    console.log('\n🔘 Visible buttons:');
    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      const text = await buttons[i].textContent();
      console.log(`  - ${text?.trim()}`);
    }
    
    // Get all input fields
    const inputs = await page.locator('input:visible').all();
    console.log(`\n📝 Found ${inputs.length} visible input fields`);
    
    // Check for any error messages
    const errors = await page.locator('.error, [class*="error"]').all();
    if (errors.length > 0) {
      console.log(`\n⚠️  Found ${errors.length} error elements`);
    }
    
    // Final screenshot with all interactions
    await page.screenshot({ 
      path: 'screenshots/08-final-state.png',
      fullPage: true 
    });
    console.log('\n✅ All screenshots saved to screenshots/ directory');
  });

  test('test TPN calculations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for loading screen to disappear
    const loadingScreen = page.locator('#loading-screen, .loading-screen');
    if (await loadingScreen.isVisible()) {
      await loadingScreen.waitFor({ state: 'hidden', timeout: 10000 });
    }
    
    // Activate TPN mode
    const tpnButton = page.locator('button:has-text("TPN"), button:has-text("Show TPN Panel")').first();
    if (await tpnButton.isVisible()) {
      await tpnButton.click();
      console.log('✅ TPN Mode activated');
      
      // Enter test values for TPN calculations
      const testData = [
        { selector: 'input[name*="weight" i]', value: '70', label: 'Weight' },
        { selector: 'input[name*="volume" i]', value: '2000', label: 'Volume' },
        { selector: 'input[name*="protein" i]', value: '1.5', label: 'Protein' },
        { selector: 'input[name*="dextrose" i]', value: '250', label: 'Dextrose' },
      ];
      
      for (const field of testData) {
        const input = page.locator(field.selector).first();
        if (await input.isVisible()) {
          await input.fill(field.value);
          console.log(`  ✅ ${field.label}: ${field.value}`);
        }
      }
      
      await page.screenshot({ 
        path: 'screenshots/tpn-calculations.png',
        fullPage: true 
      });
      console.log('\n✅ TPN calculation screenshot saved');
    }
  });

  test('test ingredient management', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for ingredient-related buttons
    const ingredientButton = page.locator('button:has-text("Ingredient"), button:has-text("ingredient")').first();
    if (await ingredientButton.isVisible()) {
      await ingredientButton.click();
      await page.waitForTimeout(500);
      
      console.log('✅ Opened ingredient management');
      
      // Search for ingredients
      const searchInput = page.locator('input[placeholder*="search" i]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('calcium');
        await page.waitForTimeout(300);
        console.log('  ✅ Searched for: calcium');
      }
      
      await page.screenshot({ 
        path: 'screenshots/ingredient-management.png',
        fullPage: true 
      });
      console.log('✅ Ingredient management screenshot saved');
    }
  });
});