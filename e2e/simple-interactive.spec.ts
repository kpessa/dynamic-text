import { test, expect } from '@playwright/test';

test.describe('Simple Interactive Test', () => {
  test('capture app state and functionality', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the app to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give extra time for any animations
    
    console.log('🚀 Starting interactive test...\n');
    
    // Take screenshot of initial state
    await page.screenshot({ 
      path: 'screenshots/app-initial.png',
      fullPage: true 
    });
    console.log('✅ Screenshot: Initial app state');
    
    // Get page title and main heading
    const pageTitle = await page.title();
    console.log(`📄 Page Title: ${pageTitle}`);
    
    // Find all visible buttons and log them
    const buttons = await page.locator('button:visible').evaluateAll(
      elements => elements.map(el => ({
        text: el.textContent?.trim(),
        title: el.getAttribute('title'),
        className: el.className
      }))
    );
    
    console.log('\n🔘 Found buttons:');
    buttons.forEach((btn, i) => {
      if (btn.text) {
        console.log(`  ${i + 1}. "${btn.text}" ${btn.title ? `(${btn.title})` : ''}`);
      }
    });
    
    // Find all input fields
    const inputs = await page.locator('input:visible').evaluateAll(
      elements => elements.map(el => ({
        type: el.type,
        placeholder: el.placeholder,
        name: el.name,
        value: el.value
      }))
    );
    
    console.log('\n📝 Found input fields:');
    inputs.forEach((input, i) => {
      console.log(`  ${i + 1}. Type: ${input.type}, Name: ${input.name || 'unnamed'}, Placeholder: "${input.placeholder || 'none'}"`);
    });
    
    // Check for main sections
    const sections = await page.locator('section, [class*="section"], [class*="panel"]').evaluateAll(
      elements => elements.map(el => ({
        className: el.className,
        id: el.id,
        visible: el.offsetParent !== null
      })).filter(el => el.visible)
    );
    
    console.log('\n📦 Found sections/panels:');
    sections.forEach((section, i) => {
      console.log(`  ${i + 1}. ${section.id || section.className}`);
    });
    
    // Try to interact with Add Section buttons using JavaScript
    console.log('\n🎯 Attempting to add a section...');
    const addButtonExists = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addButton = buttons.find(btn => 
        btn.textContent?.toLowerCase().includes('add') && 
        btn.textContent?.toLowerCase().includes('section')
      );
      if (addButton) {
        addButton.click();
        return true;
      }
      return false;
    });
    
    if (addButtonExists) {
      await page.waitForTimeout(1000);
      await page.screenshot({ 
        path: 'screenshots/app-with-section.png',
        fullPage: true 
      });
      console.log('✅ Added a section and captured screenshot');
    }
    
    // Check for code editors
    const codeEditors = await page.locator('.cm-content, .code-editor, textarea').count();
    console.log(`\n💻 Found ${codeEditors} code editor(s)`);
    
    // Check for preview panel
    const previewExists = await page.locator('.preview, [class*="preview"]').count() > 0;
    console.log(`📋 Preview panel exists: ${previewExists}`);
    
    // Test responsive behavior
    console.log('\n📱 Testing responsive design...');
    
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ 
      path: 'screenshots/app-mobile.png'
    });
    console.log('  ✅ Mobile view (375x667)');
    
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ 
      path: 'screenshots/app-tablet.png'
    });
    console.log('  ✅ Tablet view (768x1024)');
    
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ 
      path: 'screenshots/app-desktop.png'
    });
    console.log('  ✅ Desktop view (1920x1080)');
    
    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const perf = window.performance;
      return {
        loadTime: perf.timing.loadEventEnd - perf.timing.navigationStart,
        domReady: perf.timing.domContentLoadedEventEnd - perf.timing.navigationStart,
        resources: perf.getEntriesByType('resource').length
      };
    });
    
    console.log('\n⚡ Performance Metrics:');
    console.log(`  Load Time: ${metrics.loadTime}ms`);
    console.log(`  DOM Ready: ${metrics.domReady}ms`);
    console.log(`  Resources Loaded: ${metrics.resources}`);
    
    console.log('\n✅ Interactive test completed successfully!');
    console.log('📸 Screenshots saved in screenshots/ directory');
  });
  
  test('test navigation and UI interactions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    console.log('🧭 Testing navigation and interactions...\n');
    
    // Try keyboard shortcuts
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(500);
    console.log('⌨️  Tested Ctrl+S shortcut');
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    console.log('⌨️  Tested Escape key');
    
    // Check for modals or dialogs
    const modals = await page.locator('.modal, [role="dialog"]').count();
    console.log(`\n🪟 Found ${modals} modal(s)/dialog(s)`);
    
    // Check accessibility
    const ariaLabels = await page.locator('[aria-label]').count();
    const ariaRoles = await page.locator('[role]').count();
    console.log(`\n♿ Accessibility:`);
    console.log(`  Elements with aria-label: ${ariaLabels}`);
    console.log(`  Elements with role: ${ariaRoles}`);
    
    // Final state screenshot
    await page.screenshot({ 
      path: 'screenshots/app-final-state.png',
      fullPage: true 
    });
    console.log('\n✅ Final screenshot captured');
  });
});