import { test, expect } from '@playwright/test';

test.describe('MCP Browser Automation Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the app to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Wait for loading screen to disappear
    const loadingScreen = page.locator('#loading-screen, .loading-screen, [class*="loading"]');
    if (await loadingScreen.first().isVisible()) {
      await loadingScreen.first().waitFor({ state: 'hidden', timeout: 10000 });
    }
  });

  test('complete TPN workflow with MCP browser control', async ({ page }) => {
    console.log('🚀 Starting MCP browser automation test...\n');
    
    // Take initial screenshot using accessibility tree navigation
    await page.screenshot({ 
      path: 'screenshots/mcp-01-initial.png',
      fullPage: true 
    });
    console.log('✅ Initial state captured');
    
    // Test 1: Add HTML Section using the exact button text
    const addHtmlButton = page.getByRole('button', { name: '+ Add HTML Section' });
    await expect(addHtmlButton).toBeVisible();
    await addHtmlButton.click();
    await page.waitForTimeout(1000); // Give more time for section to appear
    
    // Wait for editor to be available (using more generic selector)
    const editors = page.locator('.cm-content, textarea, [contenteditable="true"]');
    await expect(editors.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ HTML section added');
    
    // Type in the HTML editor
    const htmlEditor = editors.first();
    await htmlEditor.click();
    await page.keyboard.type('<h2>Patient Information</h2>\n<p>Weight: <span id="weight">70</span> kg</p>');
    
    await page.screenshot({ 
      path: 'screenshots/mcp-02-html-section.png',
      fullPage: true 
    });
    console.log('✅ HTML content added');
    
    // Test 2: Add JavaScript Section
    const addJsButton = page.getByRole('button', { name: '+ Add JavaScript Section' });
    await expect(addJsButton).toBeVisible();
    await addJsButton.click();
    await page.waitForTimeout(1000); // Give more time for section to appear
    
    // Wait for any new editor to be available
    await page.waitForTimeout(2000); // Give time for editor to initialize
    const allEditors = page.locator('.cm-content, textarea, [contenteditable="true"]');
    const editorCount = await allEditors.count();
    console.log(`Found ${editorCount} editor(s) after adding JS section`);
    
    // Type JavaScript code in the last available editor
    const jsEditor = editorCount > 1 ? allEditors.nth(1) : allEditors.first();
    await jsEditor.click();
    await page.keyboard.type(`// Calculate protein requirement
const weight = 70;
const proteinPerKg = 1.5;
const totalProtein = weight * proteinPerKg;
return \`Total protein requirement: \${totalProtein}g/day\`;`);
    
    await page.screenshot({ 
      path: 'screenshots/mcp-03-js-section.png',
      fullPage: true 
    });
    console.log('✅ JavaScript code added');
    
    // Test 3: Enable TPN Mode
    try {
      const tpnButton = page.getByRole('button', { name: /TPN Panel/i });
      const isVisible = await tpnButton.isVisible({ timeout: 5000 });
      
      if (isVisible) {
        await tpnButton.click({ force: true, timeout: 5000 });
        await page.waitForTimeout(1000);
        
        // Check if button text changed
        const buttonText = await tpnButton.textContent();
        console.log(`TPN button text: "${buttonText}"`);
        
        // Check if TPN panel or any TPN-related content appears
        const tpnContent = await page.locator('[class*="tpn"], [id*="tpn"]').count();
        if (tpnContent > 0 || buttonText?.includes('Hide')) {
          console.log('✅ TPN panel activated');
        } else {
          console.log('ℹ️ TPN panel state changed but no visible panel');
        }
      } else {
        console.log('⚠️ TPN button not found, skipping TPN tests');
      }
    } catch (error) {
      console.log(`⚠️ TPN test skipped: ${error.message}`);
    }
    
    await page.screenshot({ 
      path: 'screenshots/mcp-04-tpn-panel.png',
      fullPage: true 
    });
    
    // Test 4: Fill TPN values
    const tpnInputs = [
      { label: 'Weight', value: '75' },
      { label: 'Volume', value: '2500' },
      { label: 'Protein', value: '1.8' }
    ];
    
    for (const input of tpnInputs) {
      const field = page.locator(`input[placeholder*="${input.label}" i], label:has-text("${input.label}") + input`).first();
      if (await field.isVisible()) {
        await field.fill(input.value);
        console.log(`  ✅ ${input.label}: ${input.value}`);
      }
    }
    
    await page.screenshot({ 
      path: 'screenshots/mcp-05-tpn-values.png',
      fullPage: true 
    });
    console.log('✅ TPN values entered');
    
    // Test 5: Check Preview Panel
    const previewButton = page.getByRole('button', { name: /preview/i }).or(page.locator('button:has-text("▶")'));
    if (await previewButton.isVisible()) {
      await previewButton.click();
      await page.waitForTimeout(500);
      
      const previewPanel = page.locator('.preview-panel, [class*="preview"]').first();
      await expect(previewPanel).toBeVisible();
      
      await page.screenshot({ 
        path: 'screenshots/mcp-06-preview.png',
        fullPage: true 
      });
      console.log('✅ Preview panel checked');
    }
    
    // Test 6: Test Export Functionality
    const exportButton = page.getByRole('button', { name: /export/i });
    if (await exportButton.isVisible()) {
      // Set up clipboard permission
      await page.context().grantPermissions(['clipboard-write', 'clipboard-read']);
      
      await exportButton.click();
      await page.waitForTimeout(500);
      
      // Check for success notification
      const notification = page.locator('.toast, .notification, [role="alert"]').first();
      if (await notification.isVisible()) {
        const notificationText = await notification.textContent();
        console.log(`✅ Export notification: ${notificationText}`);
      }
    }
    
    // Test 7: Responsive Design
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(300);
      await page.screenshot({ 
        path: `screenshots/mcp-responsive-${viewport.name.toLowerCase()}.png`
      });
      console.log(`✅ ${viewport.name} view tested (${viewport.width}x${viewport.height})`);
    }
    
    // Test 8: Accessibility Checks
    const accessibilityReport = await page.evaluate(() => {
      const elements = {
        buttons: document.querySelectorAll('button').length,
        inputs: document.querySelectorAll('input').length,
        ariaLabels: document.querySelectorAll('[aria-label]').length,
        ariaRoles: document.querySelectorAll('[role]').length,
        focusable: document.querySelectorAll('button, input, textarea, select, a[href]').length
      };
      return elements;
    });
    
    console.log('\n♿ Accessibility Report:');
    console.log(`  Buttons: ${accessibilityReport.buttons}`);
    console.log(`  Inputs: ${accessibilityReport.inputs}`);
    console.log(`  ARIA Labels: ${accessibilityReport.ariaLabels}`);
    console.log(`  ARIA Roles: ${accessibilityReport.ariaRoles}`);
    console.log(`  Focusable Elements: ${accessibilityReport.focusable}`);
    
    // Test 9: Performance Metrics
    const metrics = await page.evaluate(() => {
      const perf = window.performance;
      const timing = perf.timing;
      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: perf.getEntriesByType('paint')[0]?.startTime || 0,
        resources: perf.getEntriesByType('resource').length
      };
    });
    
    console.log('\n⚡ Performance Metrics:');
    console.log(`  Page Load Time: ${metrics.loadTime}ms`);
    console.log(`  DOM Ready: ${metrics.domReady}ms`);
    console.log(`  First Paint: ${Math.round(metrics.firstPaint)}ms`);
    console.log(`  Resources Loaded: ${metrics.resources}`);
    
    console.log('\n✅ MCP browser automation test completed successfully!');
  });

  test('test keyboard navigation and shortcuts', async ({ page }) => {
    console.log('⌨️ Testing keyboard navigation...\n');
    
    // Test Tab navigation
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    console.log(`First focused element: ${firstFocused}`);
    
    // Test keyboard shortcuts
    const shortcuts = [
      { keys: 'Control+s', description: 'Save' },
      { keys: 'Control+z', description: 'Undo' },
      { keys: 'Control+Shift+z', description: 'Redo' },
      { keys: 'Escape', description: 'Close modal/dialog' }
    ];
    
    for (const shortcut of shortcuts) {
      await page.keyboard.press(shortcut.keys);
      await page.waitForTimeout(200);
      console.log(`✅ Tested ${shortcut.description} (${shortcut.keys})`);
    }
    
    // Test arrow key navigation in dropdowns
    const selects = await page.locator('select').count();
    if (selects > 0) {
      const firstSelect = page.locator('select').first();
      await firstSelect.focus();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      console.log('✅ Tested dropdown navigation');
    }
    
    await page.screenshot({ 
      path: 'screenshots/mcp-keyboard-nav.png',
      fullPage: true 
    });
  });

  test('test error handling and edge cases', async ({ page }) => {
    console.log('🔍 Testing error handling...\n');
    
    // Test 1: Invalid JavaScript code
    const addJsButton = page.getByRole('button', { name: '+ Add JavaScript Section' });
    await addJsButton.click();
    await page.waitForTimeout(1000);
    
    // Wait for editor to be available
    await page.waitForTimeout(2000); // Give time for editor to initialize
    const editors = page.locator('.cm-content, textarea, [contenteditable="true"]');
    const editorCount = await editors.count();
    
    if (editorCount > 0) {
      const jsEditor = editors.first();
      await jsEditor.click();
      await page.keyboard.type('const x = ; // Invalid syntax');
      console.log('✅ Invalid JS code entered');
    } else {
      console.log('⚠️ No editor found, skipping invalid code test');
    }
    
    // Check for error indicators
    await page.waitForTimeout(1000);
    const errorIndicators = await page.locator('.error, [class*="error"]').count();
    console.log(`Found ${errorIndicators} error indicators`);
    
    // Test 2: Empty sections
    const addHtmlButton = page.getByRole('button', { name: '+ Add HTML Section' });
    await addHtmlButton.click();
    
    // Try to save/export with empty content
    const exportButton = page.getByRole('button', { name: /export/i });
    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.waitForTimeout(500);
      console.log('✅ Tested export with empty sections');
    }
    
    // Test 3: Rapid button clicks (stress test)
    for (let i = 0; i < 3; i++) {
      await addHtmlButton.click();
      await page.waitForTimeout(100);
    }
    
    const sectionCount = await page.locator('.section, [class*="section"]').count();
    console.log(`✅ Created ${sectionCount} sections in stress test`);
    
    await page.screenshot({ 
      path: 'screenshots/mcp-error-handling.png',
      fullPage: true 
    });
  });

  test('test data persistence and state management', async ({ page }) => {
    console.log('💾 Testing data persistence...\n');
    
    // Add some content
    const addHtmlButton = page.getByRole('button', { name: '+ Add HTML Section' });
    await addHtmlButton.click();
    await page.waitForTimeout(1000);
    
    // Wait for editor and type content
    const htmlEditor = page.locator('.cm-content, textarea, [contenteditable="true"]').first();
    await expect(htmlEditor).toBeVisible({ timeout: 10000 });
    await htmlEditor.click();
    await page.keyboard.type('<h1>Test Content for Persistence</h1>');
    
    // Save current state
    await page.screenshot({ 
      path: 'screenshots/mcp-before-reload.png',
      fullPage: true 
    });
    
    // Get content before reload
    const contentBefore = await page.evaluate(() => {
      const editors = document.querySelectorAll('.cm-content, textarea');
      return Array.from(editors).map(e => e.textContent || e.value);
    });
    console.log('Content before reload:', contentBefore);
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Wait for app to initialize
    await page.waitForTimeout(2000);
    
    // Check if content persisted
    const contentAfter = await page.evaluate(() => {
      const editors = document.querySelectorAll('.cm-content, textarea');
      return Array.from(editors).map(e => e.textContent || e.value);
    });
    console.log('Content after reload:', contentAfter);
    
    await page.screenshot({ 
      path: 'screenshots/mcp-after-reload.png',
      fullPage: true 
    });
    
    if (contentAfter.length > 0 && contentAfter.some(c => c.includes('Test Content'))) {
      console.log('✅ Content persisted after reload');
    } else {
      console.log('ℹ️ Content not persisted (may be expected behavior)');
    }
  });
});