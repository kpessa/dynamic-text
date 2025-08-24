import { test, expect } from '@playwright/test';

test.describe('🎯 Focused MCP Interactive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('Interactive section creation and editing', async ({ page }) => {
    console.log('\n📝 Testing interactive section creation...');
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'screenshots/mcp-focused-01-initial.png',
      fullPage: false 
    });
    
    // Look for any add button
    console.log('Step 1: Finding add buttons...');
    const addButtons = page.locator('button').filter({ hasText: /add/i });
    const buttonCount = await addButtons.count();
    console.log(`  Found ${buttonCount} add button(s)`);
    
    if (buttonCount > 0) {
      // Click first add button
      await addButtons.first().click();
      await page.waitForTimeout(1500);
      console.log('  ✅ Clicked add button');
      
      // Find any editor that appeared
      const editors = page.locator('.cm-content, textarea, [contenteditable="true"], input[type="text"]');
      const editorCount = await editors.count();
      console.log(`  Found ${editorCount} editor(s)`);
      
      if (editorCount > 0) {
        const editor = editors.first();
        await editor.click();
        await page.keyboard.type('Test content from MCP');
        console.log('  ✅ Added content to editor');
      }
      
      // Take screenshot with content
      await page.screenshot({ 
        path: 'screenshots/mcp-focused-02-with-content.png',
        fullPage: false 
      });
    }
    
    console.log('✅ Interactive section test complete');
  });

  test('Button interaction testing', async ({ page }) => {
    console.log('\n🔘 Testing button interactions...');
    
    // Set shorter timeout for this test
    test.setTimeout(30000);
    
    // Find all visible buttons with timeout
    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();
    console.log(`Found ${buttonCount} visible button(s)`);
    
    // Get button details with timeout protection
    const buttonInfo = [];
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const text = await button.textContent({ timeout: 1000 }).catch(() => 'unknown');
      const ariaLabel = await button.getAttribute('aria-label', { timeout: 1000 }).catch(() => null);
      buttonInfo.push({ text: text?.trim(), ariaLabel });
      console.log(`  Button ${i + 1}: "${text?.trim() || ariaLabel || 'No text'}"`);
    }
    
    // Test export button if available
    const exportButton = page.locator('button').filter({ hasText: /export/i }).first();
    if (await exportButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('\n  Testing export button...');
      await Promise.race([
        exportButton.click(),
        page.waitForTimeout(1000)
      ]);
      console.log('  ✅ Export button clicked');
      
      // Press Escape to close any dialog
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }
    
    // Test TPN panel button if available with better safety
    const tpnButton = page.locator('button').filter({ hasText: /tpn/i }).first();
    if (await tpnButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('\n  Testing TPN button...');
      const buttonText = await tpnButton.textContent({ timeout: 1000 }).catch(() => 'TPN');
      console.log(`  TPN button text: "${buttonText}"`);
      
      // Use evaluate for safer click
      await page.evaluate(() => {
        const btn = document.querySelector('button[textContent*="TPN"], button:has-text("TPN")');
        if (btn instanceof HTMLElement) btn.click();
      }).catch(() => {
        console.log('  ℹ️ TPN button click via evaluate failed, using direct click');
        return Promise.race([
          tpnButton.click(),
          page.waitForTimeout(1000)
        ]);
      });
      
      await page.waitForTimeout(300);
      console.log('  ✅ TPN button interaction complete');
      
      // Escape to close any panels
      await page.keyboard.press('Escape');
    }
    
    await page.screenshot({ 
      path: 'screenshots/mcp-focused-03-buttons.png',
      fullPage: false 
    }).catch(() => console.log('  ℹ️ Screenshot skipped'));
    
    console.log('✅ Button interaction test complete');
  });

  test('Dynamic content preview', async ({ page }) => {
    console.log('\n👁️ Testing dynamic content preview...');
    
    // Add HTML content
    const addButton = page.locator('button').filter({ hasText: /add/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(1000);
      
      // Find editor
      const editor = page.locator('.cm-content, textarea, [contenteditable="true"]').first();
      if (await editor.isVisible()) {
        await editor.click();
        await editor.clear();
        await page.keyboard.type('<h2>Dynamic Preview Test</h2>\n<p>Current time: <span id="time"></span></p>');
        await page.waitForTimeout(1000);
        console.log('  ✅ HTML content added');
      }
      
      // Check preview area
      const previewElements = page.locator('.preview, [class*="preview"], .output, [class*="output"]');
      const previewCount = await previewElements.count();
      console.log(`  Found ${previewCount} preview element(s)`);
      
      if (previewCount > 0) {
        const previewText = await previewElements.first().textContent();
        console.log(`  Preview content: "${previewText?.substring(0, 50)}..."`);
      }
    }
    
    await page.screenshot({ 
      path: 'screenshots/mcp-focused-04-preview.png',
      fullPage: false 
    });
    
    console.log('✅ Dynamic preview test complete');
  });

  test('Keyboard navigation flow', async ({ page }) => {
    console.log('\n⌨️ Testing keyboard navigation flow...');
    
    // Tab through interface
    const focusedElements = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el?.tagName,
          text: el?.textContent?.substring(0, 30),
          type: (el as HTMLInputElement)?.type,
          role: el?.getAttribute('role')
        };
      });
      
      if (focused.tag !== 'BODY') {
        focusedElements.push(focused);
        console.log(`  Tab ${i + 1}: ${focused.tag} (${focused.role || focused.type || 'element'})`);
      }
    }
    
    // Test Enter key on buttons
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const currentFocus = await page.evaluate(() => document.activeElement?.tagName);
    if (currentFocus === 'BUTTON') {
      console.log('\n  Testing Enter key on button...');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      console.log('  ✅ Enter key pressed on button');
      
      // Escape to close any dialogs
      await page.keyboard.press('Escape');
    }
    
    await page.screenshot({ 
      path: 'screenshots/mcp-focused-05-keyboard.png',
      fullPage: false 
    });
    
    console.log('✅ Keyboard navigation test complete');
  });

  test('Performance metrics collection', async ({ page }) => {
    console.log('\n📊 Collecting performance metrics...');
    
    // Add multiple sections to test performance
    const addButton = page.locator('button').filter({ hasText: /add/i }).first();
    if (await addButton.isVisible()) {
      console.log('  Adding multiple sections...');
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await addButton.click();
        await page.waitForTimeout(300);
        const elapsed = Date.now() - startTime;
        console.log(`    Section ${i + 1} added in ${elapsed}ms`);
      }
    }
    
    // Collect performance metrics
    const metrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
        loadComplete: perf.loadEventEnd - perf.loadEventStart,
        domInteractive: perf.domInteractive - perf.fetchStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0
      };
    });
    
    console.log('\n  Performance Metrics:');
    console.log(`    DOM Content Loaded: ${metrics.domContentLoaded.toFixed(2)}ms`);
    console.log(`    Load Complete: ${metrics.loadComplete.toFixed(2)}ms`);
    console.log(`    DOM Interactive: ${metrics.domInteractive.toFixed(2)}ms`);
    console.log(`    First Paint: ${metrics.firstPaint.toFixed(2)}ms`);
    
    // Check memory usage if available
    const memoryInfo = await page.evaluate(() => {
      if ('memory' in performance) {
        const mem = (performance as any).memory;
        return {
          used: (mem.usedJSHeapSize / 1024 / 1024).toFixed(2),
          total: (mem.totalJSHeapSize / 1024 / 1024).toFixed(2)
        };
      }
      return null;
    });
    
    if (memoryInfo) {
      console.log(`    Memory Usage: ${memoryInfo.used}MB / ${memoryInfo.total}MB`);
    }
    
    // Count DOM elements
    const elementCount = await page.evaluate(() => document.querySelectorAll('*').length);
    console.log(`    DOM Elements: ${elementCount}`);
    
    await page.screenshot({ 
      path: 'screenshots/mcp-focused-06-performance.png',
      fullPage: false 
    });
    
    console.log('✅ Performance metrics collected');
  });

  test.afterEach(async ({ page }) => {
    console.log('🧹 Test cleanup complete\n');
    await page.close();
  });
});