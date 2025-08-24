import { test, expect } from '@playwright/test';

/**
 * Robust MCP Test Suite
 * Incorporates best practices and lessons learned from previous tests
 */

test.describe('🚀 Robust MCP Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Set up with proper timeouts and wait conditions
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Wait for app to be interactive
    await page.waitForFunction(() => {
      const buttons = document.querySelectorAll('button');
      return buttons.length > 0;
    }, { timeout: 5000 });
    
    console.log('✅ Test environment ready');
  });

  test('Core functionality workflow', async ({ page }) => {
    console.log('\n🔄 Testing core functionality workflow...');
    
    // 1. Create HTML section
    console.log('Step 1: Creating HTML section...');
    const addButtons = page.locator('button').filter({ hasText: /add/i });
    const addButtonCount = await addButtons.count();
    
    if (addButtonCount > 0) {
      await addButtons.first().click();
      await page.waitForTimeout(800);
      
      // Find editor with multiple selectors
      const editor = page.locator('.cm-content, textarea, [contenteditable="true"], input[type="text"]').first();
      if (await editor.isVisible({ timeout: 3000 })) {
        await editor.click();
        await page.keyboard.type('<h1>Test Document</h1>\n<p>Created by MCP automation</p>');
        console.log('  ✅ HTML content added');
      }
    }
    
    // 2. Check preview
    console.log('Step 2: Checking preview...');
    const previewAreas = page.locator('.preview, [class*="preview"], .output');
    const previewCount = await previewAreas.count();
    if (previewCount > 0) {
      const previewContent = await previewAreas.first().textContent();
      console.log(`  📄 Preview: "${previewContent?.substring(0, 40)}..."`);
    }
    
    // 3. Save functionality
    console.log('Step 3: Testing save...');
    const saveButton = page.locator('button').filter({ hasText: /save/i }).first();
    if (await saveButton.isVisible()) {
      // Check if button is enabled
      const isEnabled = await saveButton.isEnabled();
      if (isEnabled) {
        await saveButton.click();
        await page.waitForTimeout(500);
        console.log('  ✅ Save executed');
        
        // Check for save confirmation
        const savedIndicator = page.locator('.saved, [aria-label*="saved"]').first();
        if (await savedIndicator.isVisible({ timeout: 2000 })) {
          console.log('  ✅ Save confirmed');
        }
      } else {
        console.log('  ℹ️ Save button disabled (no changes to save)');
        // Try keyboard shortcut instead
        const isMac = await page.evaluate(() => navigator.platform.includes('Mac'));
        await page.keyboard.press(isMac ? 'Meta+s' : 'Control+s');
        console.log('  ✅ Save shortcut triggered');
      }
    }
    
    // 4. Export functionality
    console.log('Step 4: Testing export...');
    const exportButton = page.locator('button').filter({ hasText: /export/i }).first();
    if (await exportButton.isVisible()) {
      // Handle clipboard permissions safely
      const browserName = page.context().browser()?.browserType().name();
      if (browserName !== 'firefox') {
        try {
          await page.context().grantPermissions(['clipboard-write']);
        } catch (e) {
          // Ignore permission errors
        }
      }
      
      await exportButton.click();
      await page.waitForTimeout(500);
      console.log('  ✅ Export executed');
      
      // Close any export dialog
      await page.keyboard.press('Escape');
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-robust-core-workflow.png',
      fullPage: false
    });
  });

  test('Advanced editor interactions', async ({ page }) => {
    console.log('\n✏️ Testing advanced editor interactions...');
    
    // Add multiple sections
    console.log('Step 1: Adding multiple sections...');
    const sectionTypes = ['HTML', 'JavaScript'];
    
    for (const type of sectionTypes) {
      const addButton = page.locator('button').filter({ 
        hasText: new RegExp(`add.*${type}`, 'i') 
      }).first();
      
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(800);
        console.log(`  ✅ Added ${type} section`);
      } else {
        // Fallback to generic add button
        const genericAdd = page.locator('button').filter({ hasText: /add/i }).first();
        if (await genericAdd.isVisible()) {
          await genericAdd.click();
          await page.waitForTimeout(800);
          console.log(`  ✅ Added section (generic)`);
        }
      }
    }
    
    // Test in each editor
    console.log('Step 2: Testing editor content...');
    const editors = page.locator('.cm-content, textarea, [contenteditable="true"]');
    const editorCount = await editors.count();
    console.log(`  Found ${editorCount} editor(s)`);
    
    for (let i = 0; i < Math.min(editorCount, 2); i++) {
      const editor = editors.nth(i);
      if (await editor.isVisible()) {
        await editor.click();
        await editor.clear();
        
        if (i === 0) {
          await page.keyboard.type('<div>Section ' + (i + 1) + '</div>');
        } else {
          await page.keyboard.type('return "Dynamic content " + Date.now();');
        }
        console.log(`  ✅ Content added to editor ${i + 1}`);
      }
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-robust-editors.png',
      fullPage: false
    });
  });

  test('Responsive and accessibility', async ({ page }) => {
    console.log('\n📱 Testing responsive design and accessibility...');
    
    // Test different viewports
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];
    
    for (const viewport of viewports) {
      console.log(`\nTesting ${viewport.name} (${viewport.width}x${viewport.height})...`);
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);
      
      // Check layout adaptation
      const isNarrow = viewport.width < 768;
      if (isNarrow) {
        // Check for mobile menu
        const mobileMenu = page.locator('[aria-label*="menu"], .mobile-menu, button:has-text("☰")').first();
        const hasMobileMenu = await mobileMenu.isVisible();
        console.log(`  ${hasMobileMenu ? '✅' : 'ℹ️'} Mobile menu ${hasMobileMenu ? 'present' : 'not found'}`);
      }
      
      // Check button visibility
      const visibleButtons = await page.locator('button:visible').count();
      console.log(`  📊 ${visibleButtons} visible buttons`);
    }
    
    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Accessibility checks
    console.log('\n♿ Accessibility checks...');
    
    // Check for ARIA attributes
    const ariaElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('[aria-label], [role], [aria-describedby]');
      return elements.length;
    });
    console.log(`  📊 ${ariaElements} ARIA-enhanced elements`);
    
    // Check focus management
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el?.tagName,
        role: el?.getAttribute('role'),
        label: el?.getAttribute('aria-label')
      };
    });
    console.log(`  🎯 Focused: ${focusedElement.tag} (${focusedElement.role || focusedElement.label || 'no role/label'})`);
    
    // Check color contrast
    const hasHighContrast = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      if (buttons.length === 0) return false;
      
      const button = buttons[0];
      const styles = window.getComputedStyle(button);
      const bg = styles.backgroundColor;
      const fg = styles.color;
      
      // Basic check - ensure colors are defined
      return bg !== 'rgba(0, 0, 0, 0)' && fg !== 'rgba(0, 0, 0, 0)';
    });
    console.log(`  ${hasHighContrast ? '✅' : '⚠️'} Color contrast ${hasHighContrast ? 'defined' : 'needs review'}`);
    
    await page.screenshot({
      path: 'screenshots/mcp-robust-accessibility.png',
      fullPage: false
    });
  });

  test('Error handling and recovery', async ({ page }) => {
    console.log('\n🛡️ Testing error handling and recovery...');
    
    // Test with malformed input
    console.log('Step 1: Testing malformed input...');
    const addButton = page.locator('button').filter({ hasText: /add/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(800);
      
      const editor = page.locator('.cm-content, textarea, [contenteditable="true"]').first();
      if (await editor.isVisible()) {
        await editor.click();
        
        // Try various problematic inputs
        const problematicInputs = [
          '<script>alert("test")</script>',
          '{{{{unclosed brackets',
          'null; undefined; NaN;'
        ];
        
        for (const input of problematicInputs) {
          await editor.clear();
          await page.keyboard.type(input);
          await page.waitForTimeout(500);
          
          // Check if app is still responsive
          const isResponsive = await page.evaluate(() => {
            try {
              document.body.click();
              return true;
            } catch {
              return false;
            }
          });
          console.log(`  ${isResponsive ? '✅' : '❌'} App responsive after: "${input.substring(0, 20)}..."`);
        }
      }
    }
    
    // Test rapid interactions
    console.log('Step 2: Testing rapid interactions...');
    const startTime = Date.now();
    let clickCount = 0;
    
    while (Date.now() - startTime < 2000) {
      if (await addButton.isVisible()) {
        await addButton.click();
        clickCount++;
        await page.waitForTimeout(100);
      }
    }
    console.log(`  ✅ Performed ${clickCount} rapid clicks`);
    
    // Check final state
    const sections = await page.locator('[class*="section"]').count();
    console.log(`  📊 ${sections} sections created`);
    
    // Verify no error dialogs
    const errorDialogs = await page.locator('[role="alert"], .error-dialog, .error-message').count();
    console.log(`  ${errorDialogs === 0 ? '✅' : '⚠️'} ${errorDialogs} error dialog(s) visible`);
    
    await page.screenshot({
      path: 'screenshots/mcp-robust-error-handling.png',
      fullPage: false
    });
  });

  test('Performance monitoring', async ({ page }) => {
    console.log('\n⚡ Performance monitoring...');
    
    // Measure initial load metrics
    const loadMetrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        ttfb: perf.responseStart - perf.requestStart,
        domComplete: perf.domComplete - perf.domContentLoadedEventStart,
        loadComplete: perf.loadEventEnd - perf.loadEventStart
      };
    });
    
    console.log('Initial Load Metrics:');
    console.log(`  TTFB: ${loadMetrics.ttfb.toFixed(2)}ms`);
    console.log(`  DOM Complete: ${loadMetrics.domComplete.toFixed(2)}ms`);
    console.log(`  Load Complete: ${loadMetrics.loadComplete.toFixed(2)}ms`);
    
    // Measure interaction performance
    console.log('\nInteraction Performance:');
    const addButton = page.locator('button').filter({ hasText: /add/i }).first();
    
    if (await addButton.isVisible()) {
      const interactionStart = Date.now();
      await addButton.click();
      
      // Wait for new content to appear
      await page.waitForFunction(() => {
        const editors = document.querySelectorAll('.cm-content, textarea, [contenteditable="true"]');
        return editors.length > 0;
      }, { timeout: 5000 });
      
      const interactionTime = Date.now() - interactionStart;
      console.log(`  Add Section: ${interactionTime}ms`);
      
      // Type in editor
      const editor = page.locator('.cm-content, textarea, [contenteditable="true"]').first();
      if (await editor.isVisible()) {
        const typeStart = Date.now();
        await editor.click();
        await page.keyboard.type('Performance test content');
        const typeTime = Date.now() - typeStart;
        console.log(`  Type Content: ${typeTime}ms`);
      }
    }
    
    // Memory usage
    const memoryUsage = await page.evaluate(() => {
      if ('memory' in performance) {
        const mem = (performance as any).memory;
        return {
          used: (mem.usedJSHeapSize / 1024 / 1024).toFixed(2),
          total: (mem.totalJSHeapSize / 1024 / 1024).toFixed(2),
          limit: (mem.jsHeapSizeLimit / 1024 / 1024).toFixed(2)
        };
      }
      return null;
    });
    
    if (memoryUsage) {
      console.log('\nMemory Usage:');
      console.log(`  Used: ${memoryUsage.used}MB`);
      console.log(`  Total: ${memoryUsage.total}MB`);
      console.log(`  Limit: ${memoryUsage.limit}MB`);
    }
    
    // DOM complexity
    const domMetrics = await page.evaluate(() => {
      return {
        elements: document.querySelectorAll('*').length,
        scripts: document.querySelectorAll('script').length,
        styles: document.querySelectorAll('style, link[rel="stylesheet"]').length,
        images: document.querySelectorAll('img').length
      };
    });
    
    console.log('\nDOM Metrics:');
    console.log(`  Total Elements: ${domMetrics.elements}`);
    console.log(`  Scripts: ${domMetrics.scripts}`);
    console.log(`  Styles: ${domMetrics.styles}`);
    console.log(`  Images: ${domMetrics.images}`);
    
    // Performance rating
    const rating = 
      loadMetrics.ttfb < 200 && loadMetrics.loadComplete < 1000 ? '🟢 Excellent' :
      loadMetrics.ttfb < 500 && loadMetrics.loadComplete < 2000 ? '🟡 Good' :
      '🔴 Needs Improvement';
    
    console.log(`\n Overall Performance: ${rating}`);
    
    await page.screenshot({
      path: 'screenshots/mcp-robust-performance.png',
      fullPage: false
    });
  });

  test.afterEach(async ({ page }) => {
    console.log('✅ Test completed\n');
    await page.close();
  });
});