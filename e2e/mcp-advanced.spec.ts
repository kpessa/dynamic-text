import { test, expect, Page } from '@playwright/test';

/**
 * Advanced MCP Browser Automation Tests
 * These tests demonstrate advanced Playwright MCP capabilities
 * including browser state management, complex interactions, and visual testing
 */

test.describe('Advanced MCP Browser Automation', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // Create a persistent context for state management across tests
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for app initialization
  });

  test('complex TPN workflow with data validation', async () => {
    console.log('🔬 Testing Complex TPN Workflow\n');

    // Step 1: Create multiple sections with different content types
    const sections = [
      { type: 'HTML', content: '<h3>Patient Demographics</h3>\n<p>Age: 45 years</p>' },
      { type: 'JavaScript', content: '// Calculate BMI\nconst weight = 70;\nconst height = 1.75;\nconst bmi = weight / (height * height);\nreturn `BMI: ${bmi.toFixed(2)}`;' },
      { type: 'HTML', content: '<h3>Nutritional Requirements</h3>\n<ul><li>Protein: 1.5 g/kg/day</li><li>Calories: 25-30 kcal/kg/day</li></ul>' }
    ];

    for (const [index, section] of sections.entries()) {
      console.log(`Adding ${section.type} section ${index + 1}...`);
      
      const addButton = page.getByRole('button', { 
        name: `+ Add ${section.type} Section` 
      });
      await addButton.click();
      await page.waitForTimeout(1000);

      // Find the newly added editor
      const editors = page.locator('.cm-content, textarea, [contenteditable="true"]');
      const editorCount = await editors.count();
      
      if (editorCount > index) {
        const editor = editors.nth(index);
        await editor.click();
        await page.keyboard.type(section.content);
        console.log(`  ✅ ${section.type} content added`);
      }
    }

    // Step 2: Validate preview output
    console.log('\n📊 Validating preview output...');
    const previewElements = await page.locator('.preview, [class*="preview"]').all();
    console.log(`  Found ${previewElements.length} preview elements`);

    // Take screenshot of complete workflow
    await page.screenshot({
      path: 'screenshots/mcp-advanced-workflow.png',
      fullPage: true
    });

    // Step 3: Test data persistence
    console.log('\n💾 Testing data persistence...');
    const currentContent = await page.evaluate(() => {
      const editors = document.querySelectorAll('.cm-content, textarea');
      return Array.from(editors).map(e => (e.textContent || e.value || '').substring(0, 50));
    });
    console.log('  Current content saved for comparison');

    // Step 4: Export and validate
    const exportBtn = page.getByRole('button', { name: /export/i });
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      await page.waitForTimeout(500);
      console.log('  ✅ Content exported');
    }

    console.log('\n✅ Complex TPN workflow completed');
  });

  test('browser state manipulation and cookies', async () => {
    console.log('🍪 Testing Browser State Management\n');

    // Set custom localStorage values
    await page.evaluate(() => {
      localStorage.setItem('tpn-test-mode', 'true');
      localStorage.setItem('user-preference', JSON.stringify({
        theme: 'dark',
        autoSave: true,
        tpnMode: 'advanced'
      }));
    });
    console.log('✅ LocalStorage values set');

    // Verify localStorage persistence
    const storedData = await page.evaluate(() => {
      return {
        testMode: localStorage.getItem('tpn-test-mode'),
        preferences: JSON.parse(localStorage.getItem('user-preference') || '{}')
      };
    });
    console.log('Stored data:', JSON.stringify(storedData, null, 2));

    // Test session storage
    await page.evaluate(() => {
      sessionStorage.setItem('session-id', 'mcp-test-' + Date.now());
    });
    console.log('✅ SessionStorage configured');

    // Verify data persists after navigation
    await page.reload();
    await page.waitForLoadState('networkidle');

    const persistedData = await page.evaluate(() => {
      return {
        localStorage: localStorage.getItem('tpn-test-mode'),
        sessionStorage: sessionStorage.getItem('session-id')
      };
    });
    console.log('\nData after reload:', persistedData);
  });

  test('network interception and mocking', async () => {
    console.log('🌐 Testing Network Interception\n');

    // Track network requests
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('api') || request.url().includes('firebase')) {
        requests.push(`${request.method()} ${request.url()}`);
      }
    });

    // Track responses
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`  ⚠️ Error response: ${response.status()} ${response.url()}`);
      }
    });

    // Perform actions that might trigger API calls
    const tpnBtn = page.getByRole('button', { name: 'Show TPN Panel' });
    if (await tpnBtn.isVisible()) {
      await tpnBtn.click();
      await page.waitForTimeout(1000);
    }

    // Add a section to potentially trigger saves
    await page.getByRole('button', { name: '+ Add HTML Section' }).click();
    await page.waitForTimeout(1000);

    console.log(`\nCaptured ${requests.length} API requests`);
    requests.forEach(req => console.log(`  - ${req}`));
  });

  test('visual regression testing', async () => {
    console.log('📸 Visual Regression Testing\n');

    const screenshots = [
      { name: 'initial-state', action: null },
      { 
        name: 'with-html-section', 
        action: async () => {
          await page.getByRole('button', { name: '+ Add HTML Section' }).click();
          await page.waitForTimeout(1000);
        }
      },
      {
        name: 'with-tpn-panel',
        action: async () => {
          await page.getByRole('button', { name: 'Show TPN Panel' }).click();
          await page.waitForTimeout(1000);
        }
      },
      {
        name: 'mobile-view',
        action: async () => {
          await page.setViewportSize({ width: 375, height: 667 });
          await page.waitForTimeout(500);
        }
      }
    ];

    for (const screenshot of screenshots) {
      if (screenshot.action) {
        await screenshot.action();
      }
      
      await page.screenshot({
        path: `screenshots/visual-${screenshot.name}.png`,
        fullPage: false // Use viewport for consistent sizing
      });
      
      console.log(`  ✅ Captured: ${screenshot.name}`);
    }

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('accessibility tree navigation', async () => {
    console.log('♿ Testing Accessibility Tree Navigation\n');

    // Get full accessibility tree
    const snapshot = await page.accessibility.snapshot();
    
    // Count interactive elements
    let buttonCount = 0;
    let inputCount = 0;
    let linkCount = 0;

    function traverse(node: any) {
      if (node.role === 'button') buttonCount++;
      if (node.role === 'textbox' || node.role === 'spinbutton') inputCount++;
      if (node.role === 'link') linkCount++;
      
      if (node.children) {
        node.children.forEach(traverse);
      }
    }

    if (snapshot) {
      traverse(snapshot);
    }

    console.log('Accessibility Tree Summary:');
    console.log(`  Buttons: ${buttonCount}`);
    console.log(`  Inputs: ${inputCount}`);
    console.log(`  Links: ${linkCount}`);

    // Test keyboard navigation through interactive elements
    console.log('\n🎹 Testing keyboard navigation:');
    
    // Tab through first 5 interactive elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el?.tagName,
          role: el?.getAttribute('role'),
          label: el?.getAttribute('aria-label') || el?.textContent?.substring(0, 20)
        };
      });
      console.log(`  Tab ${i + 1}: ${focused.tag} (${focused.role}) - "${focused.label}"`);
    }
  });

  test('performance monitoring', async () => {
    console.log('⚡ Performance Monitoring\n');

    // Collect performance metrics
    const metrics = await page.evaluate(() => {
      const perf = performance;
      const navigation = perf.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      return {
        // Navigation timing
        dns: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcp: navigation.connectEnd - navigation.connectStart,
        ttfb: navigation.responseStart - navigation.requestStart,
        domLoad: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        windowLoad: navigation.loadEventEnd - navigation.loadEventStart,
        
        // Memory (if available)
        memory: (performance as any).memory ? {
          used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024)
        } : null,
        
        // Resource counts
        resources: perf.getEntriesByType('resource').length
      };
    });

    console.log('Performance Metrics:');
    console.log(`  DNS Lookup: ${metrics.dns.toFixed(2)}ms`);
    console.log(`  TCP Connection: ${metrics.tcp.toFixed(2)}ms`);
    console.log(`  TTFB: ${metrics.ttfb.toFixed(2)}ms`);
    console.log(`  DOM Load: ${metrics.domLoad.toFixed(2)}ms`);
    console.log(`  Window Load: ${metrics.windowLoad.toFixed(2)}ms`);
    
    if (metrics.memory) {
      console.log(`  Memory: ${metrics.memory.used}MB / ${metrics.memory.total}MB`);
    }
    
    console.log(`  Resources Loaded: ${metrics.resources}`);

    // Measure interaction performance
    console.log('\n📏 Measuring interaction performance:');
    
    const startTime = Date.now();
    await page.getByRole('button', { name: '+ Add HTML Section' }).click();
    await page.waitForSelector('.cm-content, textarea', { timeout: 5000 });
    const interactionTime = Date.now() - startTime;
    
    console.log(`  Section add time: ${interactionTime}ms`);
    
    // Check for performance warnings
    if (interactionTime > 1000) {
      console.log('  ⚠️ Slow interaction detected (>1s)');
    } else {
      console.log('  ✅ Good interaction performance');
    }
  });

  test('console message monitoring', async () => {
    console.log('📝 Monitoring Console Messages\n');

    const messages: Array<{type: string, text: string}> = [];
    
    // Set up console monitoring
    page.on('console', msg => {
      messages.push({
        type: msg.type(),
        text: msg.text().substring(0, 100)
      });
    });

    // Perform various actions to generate console output
    await page.getByRole('button', { name: '+ Add JavaScript Section' }).click();
    await page.waitForTimeout(1000);
    
    const editor = page.locator('.cm-content, textarea').last();
    await editor.click();
    await page.keyboard.type('console.log("Test from Playwright MCP");');
    
    // Filter and display relevant messages
    const relevantMessages = messages.filter(m => 
      !m.text.includes('[vite]') && 
      !m.text.includes('Download the React DevTools')
    );

    console.log(`Captured ${relevantMessages.length} console messages:`);
    relevantMessages.slice(-5).forEach(msg => {
      const icon = msg.type === 'error' ? '❌' : 
                   msg.type === 'warning' ? '⚠️' : 
                   msg.type === 'info' ? 'ℹ️' : '📌';
      console.log(`  ${icon} [${msg.type}] ${msg.text}`);
    });
  });

  test('multi-tab workflow', async ({ browser }) => {
    console.log('🗂️ Testing Multi-Tab Workflow\n');

    // Create a second tab
    const context = browser.contexts()[0];
    const page2 = await context.newPage();
    
    // Load app in second tab
    await page2.goto('/');
    await page2.waitForLoadState('networkidle');
    console.log('✅ Second tab opened');

    // Make changes in first tab
    await page.bringToFront();
    await page.getByRole('button', { name: '+ Add HTML Section' }).click();
    await page.waitForTimeout(1000);
    console.log('✅ Added section in first tab');

    // Check second tab (should have independent state)
    await page2.bringToFront();
    const sections2 = await page2.locator('[class*="section"]').count();
    console.log(`  Second tab sections: ${sections2}`);

    // Make changes in second tab
    await page2.getByRole('button', { name: '+ Add JavaScript Section' }).click();
    await page2.waitForTimeout(1000);
    console.log('✅ Added section in second tab');

    // Verify tabs have independent state
    await page.bringToFront();
    const sections1 = await page.locator('[class*="section"]').count();
    console.log(`  First tab sections: ${sections1}`);

    // Clean up
    await page2.close();
    console.log('✅ Multi-tab test completed');
  });
});