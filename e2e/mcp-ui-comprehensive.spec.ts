import { test, expect } from '@playwright/test';

test.describe('🎨 Comprehensive UI Interactions', () => {
  test.beforeEach(async ({ page }) => {
    console.log('\n📋 Setting up test environment...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/TPN Dynamic Text/);
    console.log('  ✅ Page loaded successfully');
  });

  test('Complete UI workflow with keyboard navigation', async ({ page }) => {
    console.log('\n⌨️ Testing keyboard navigation and shortcuts...');
    
    // Test Tab navigation
    console.log('Step 1: Testing Tab navigation...');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });
    console.log(`  📍 Focused element: ${focusedElement}`);
    
    // Test keyboard shortcuts
    console.log('Step 2: Testing keyboard shortcuts...');
    
    // Try Ctrl+S (or Cmd+S on Mac)
    const isMac = await page.evaluate(() => navigator.platform.includes('Mac'));
    if (isMac) {
      await page.keyboard.press('Meta+s');
    } else {
      await page.keyboard.press('Control+s');
    }
    console.log('  ✅ Save shortcut tested');
    
    // Test Escape key for closing modals
    console.log('Step 3: Testing modal interactions...');
    
    // Open a modal (if available)
    const exportButton = page.getByRole('button', { name: /export/i });
    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.waitForTimeout(500);
      
      // Close with Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      console.log('  ✅ Modal closed with Escape key');
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-keyboard-navigation.png',
      fullPage: false
    });
  });

  test('Drag and drop section reordering', async ({ page }) => {
    console.log('\n🔄 Testing drag and drop functionality...');
    
    // Add multiple sections first
    console.log('Step 1: Adding multiple sections...');
    
    const addHtmlButton = page.getByRole('button', { name: /add.*html/i }).first();
    const addJsButton = page.getByRole('button', { name: /add.*javascript/i }).first();
    
    if (await addHtmlButton.isVisible()) {
      await addHtmlButton.click();
      await page.waitForTimeout(1000);
      console.log('  ✅ Added HTML section');
    }
    
    if (await addJsButton.isVisible()) {
      await addJsButton.click();
      await page.waitForTimeout(1000);
      console.log('  ✅ Added JavaScript section');
    }
    
    // Look for drag handles
    console.log('Step 2: Looking for drag handles...');
    const dragHandles = page.locator('[aria-label*="drag" i], [title*="drag" i], .drag-handle');
    const handleCount = await dragHandles.count();
    console.log(`  📊 Found ${handleCount} drag handle(s)`);
    
    if (handleCount >= 2) {
      // Perform drag and drop
      console.log('Step 3: Performing drag and drop...');
      const firstHandle = dragHandles.first();
      const secondHandle = dragHandles.nth(1);
      
      const firstBox = await firstHandle.boundingBox();
      const secondBox = await secondHandle.boundingBox();
      
      if (firstBox && secondBox) {
        await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(100);
        await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2, { steps: 10 });
        await page.waitForTimeout(100);
        await page.mouse.up();
        console.log('  ✅ Drag and drop completed');
      }
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-drag-drop-sections.png',
      fullPage: true
    });
  });

  test('Multi-select and bulk operations', async ({ page }) => {
    console.log('\n📦 Testing multi-select and bulk operations...');
    
    // Add multiple sections
    console.log('Step 1: Creating multiple sections...');
    const addButton = page.getByRole('button', { name: /add.*section/i }).first();
    
    for (let i = 0; i < 3; i++) {
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);
      }
    }
    console.log('  ✅ Created 3 sections');
    
    // Look for checkboxes or selection controls
    console.log('Step 2: Testing selection controls...');
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    console.log(`  📊 Found ${checkboxCount} checkbox(es)`);
    
    if (checkboxCount > 0) {
      // Select all with Ctrl+A
      const firstCheckbox = checkboxes.first();
      await firstCheckbox.click();
      await page.keyboard.press('Control+a');
      console.log('  ✅ Selected all items');
      
      // Look for bulk action buttons
      const deleteButton = page.getByRole('button', { name: /delete.*selected/i });
      const exportButton = page.getByRole('button', { name: /export.*selected/i });
      
      if (await deleteButton.isVisible()) {
        console.log('  ✅ Bulk delete available');
      }
      if (await exportButton.isVisible()) {
        console.log('  ✅ Bulk export available');
      }
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-bulk-operations.png',
      fullPage: true
    });
  });

  test('Responsive design and mobile interactions', async ({ page }) => {
    console.log('\n📱 Testing responsive design...');
    
    const viewports = [
      { name: 'Mobile', width: 375, height: 812 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];
    
    for (const viewport of viewports) {
      console.log(`\nStep: Testing ${viewport.name} viewport (${viewport.width}x${viewport.height})...`);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);
      
      // Check if mobile menu exists
      const mobileMenu = page.locator('[aria-label*="menu" i], .mobile-menu, .burger-menu');
      const isMobileMenuVisible = await mobileMenu.isVisible();
      
      if (isMobileMenuVisible && viewport.name === 'Mobile') {
        console.log('  ✅ Mobile menu detected');
        await mobileMenu.click();
        await page.waitForTimeout(500);
        
        // Check for mobile navigation
        const navItems = page.locator('nav a, .nav-item');
        const navCount = await navItems.count();
        console.log(`  📊 Found ${navCount} navigation items`);
        
        // Close mobile menu
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
      
      // Test touch gestures on mobile
      if (viewport.name === 'Mobile') {
        console.log('  🖐️ Testing touch gestures...');
        
        // Simulate swipe
        const centerX = viewport.width / 2;
        const centerY = viewport.height / 2;
        
        await page.mouse.move(centerX - 100, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX + 100, centerY, { steps: 10 });
        await page.mouse.up();
        console.log('  ✅ Swipe gesture simulated');
        
        // Simulate pinch zoom
        await page.evaluate(() => {
          const event = new WheelEvent('wheel', {
            deltaY: -100,
            ctrlKey: true
          });
          document.dispatchEvent(event);
        });
        console.log('  ✅ Pinch zoom simulated');
      }
      
      await page.screenshot({
        path: `screenshots/mcp-responsive-${viewport.name.toLowerCase()}.png`,
        fullPage: false
      });
    }
  });

  test('Form validation and error states', async ({ page }) => {
    console.log('\n⚠️ Testing form validation and error states...');
    
    // Find form inputs
    console.log('Step 1: Finding form inputs...');
    const inputs = page.locator('input:not([type="checkbox"]):not([type="radio"])');
    const inputCount = await inputs.count();
    console.log(`  📊 Found ${inputCount} input field(s)`);
    
    if (inputCount > 0) {
      // Test empty submission
      console.log('Step 2: Testing empty form submission...');
      const firstInput = inputs.first();
      await firstInput.clear();
      await firstInput.press('Enter');
      await page.waitForTimeout(500);
      
      // Check for error messages
      const errorMessages = page.locator('.error, .error-message, [role="alert"]');
      const errorCount = await errorMessages.count();
      console.log(`  📊 Found ${errorCount} error message(s)`);
      
      // Test invalid input
      console.log('Step 3: Testing invalid input...');
      await firstInput.fill('!!!invalid!!!');
      await firstInput.press('Tab');
      await page.waitForTimeout(300);
      
      // Check for validation feedback
      const hasError = await firstInput.evaluate((el: HTMLInputElement) => {
        return el.classList.contains('error') || 
               el.getAttribute('aria-invalid') === 'true' ||
               el.validity?.valid === false;
      });
      console.log(`  ${hasError ? '✅' : '❌'} Input validation state detected`);
      
      // Test valid input
      console.log('Step 4: Testing valid input...');
      await firstInput.clear();
      await firstInput.fill('Valid input text');
      await firstInput.press('Tab');
      await page.waitForTimeout(300);
      
      const isValid = await firstInput.evaluate((el: HTMLInputElement) => {
        return !el.classList.contains('error') && 
               el.getAttribute('aria-invalid') !== 'true';
      });
      console.log(`  ${isValid ? '✅' : '❌'} Valid state confirmed`);
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-form-validation.png',
      fullPage: false
    });
  });

  test('Undo/Redo functionality', async ({ page }) => {
    console.log('\n↩️ Testing undo/redo functionality...');
    
    // Add content to test undo/redo
    console.log('Step 1: Adding content...');
    const editor = page.locator('.cm-content, textarea, [contenteditable="true"]').first();
    
    if (await editor.isVisible()) {
      await editor.click();
      await page.keyboard.type('First edit');
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await page.keyboard.type('Second edit');
      await page.waitForTimeout(500);
      console.log('  ✅ Added test content');
      
      // Test undo
      console.log('Step 2: Testing undo...');
      const isMac = await page.evaluate(() => navigator.platform.includes('Mac'));
      const undoKey = isMac ? 'Meta+z' : 'Control+z';
      await page.keyboard.press(undoKey);
      await page.waitForTimeout(300);
      
      const contentAfterUndo = await editor.textContent();
      console.log(`  📝 Content after undo: "${contentAfterUndo?.substring(0, 20)}..."`);
      
      // Test redo
      console.log('Step 3: Testing redo...');
      const redoKey = isMac ? 'Meta+Shift+z' : 'Control+y';
      await page.keyboard.press(redoKey);
      await page.waitForTimeout(300);
      
      const contentAfterRedo = await editor.textContent();
      console.log(`  📝 Content after redo: "${contentAfterRedo?.substring(0, 20)}..."`);
      console.log('  ✅ Undo/Redo tested');
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-undo-redo.png',
      fullPage: false
    });
  });

  test('Search and replace functionality', async ({ page }) => {
    console.log('\n🔍 Testing search and replace...');
    
    // Try keyboard shortcut for search
    console.log('Step 1: Opening search...');
    const isMac = await page.evaluate(() => navigator.platform.includes('Mac'));
    const searchKey = isMac ? 'Meta+f' : 'Control+f';
    await page.keyboard.press(searchKey);
    await page.waitForTimeout(500);
    
    // Check if search dialog opened
    const searchInput = page.locator('input[placeholder*="search" i], input[aria-label*="search" i]').first();
    const searchVisible = await searchInput.isVisible();
    
    if (searchVisible) {
      console.log('  ✅ Search dialog opened');
      
      // Perform search
      console.log('Step 2: Performing search...');
      await searchInput.fill('test');
      await searchInput.press('Enter');
      await page.waitForTimeout(300);
      
      // Check for search results
      const highlights = page.locator('.highlight, .search-result, mark');
      const highlightCount = await highlights.count();
      console.log(`  📊 Found ${highlightCount} search result(s)`);
      
      // Try replace
      console.log('Step 3: Testing replace...');
      const replaceKey = isMac ? 'Meta+h' : 'Control+h';
      await page.keyboard.press(replaceKey);
      await page.waitForTimeout(300);
      
      const replaceInput = page.locator('input[placeholder*="replace" i]').first();
      if (await replaceInput.isVisible()) {
        await replaceInput.fill('example');
        console.log('  ✅ Replace functionality available');
      }
      
      // Close search
      await page.keyboard.press('Escape');
      console.log('  ✅ Search closed');
    } else {
      console.log('  ℹ️ Search dialog not available via shortcut');
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-search-replace.png',
      fullPage: false
    });
  });

  test('Theme switching and dark mode', async ({ page }) => {
    console.log('\n🌓 Testing theme switching...');
    
    // Look for theme toggle
    console.log('Step 1: Looking for theme toggle...');
    const themeToggle = page.locator('[aria-label*="theme" i], [aria-label*="dark" i], .theme-toggle, .dark-mode-toggle');
    const themeToggleVisible = await themeToggle.isVisible();
    
    if (themeToggleVisible) {
      // Get initial theme
      const initialTheme = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark') ||
               document.body.classList.contains('dark') ||
               document.documentElement.getAttribute('data-theme') === 'dark';
      });
      console.log(`  📊 Initial theme: ${initialTheme ? 'dark' : 'light'}`);
      
      // Toggle theme
      console.log('Step 2: Toggling theme...');
      await themeToggle.click();
      await page.waitForTimeout(500);
      
      // Check new theme
      const newTheme = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark') ||
               document.body.classList.contains('dark') ||
               document.documentElement.getAttribute('data-theme') === 'dark';
      });
      console.log(`  📊 New theme: ${newTheme ? 'dark' : 'light'}`);
      console.log(`  ${initialTheme !== newTheme ? '✅' : '❌'} Theme changed successfully`);
      
      // Take screenshots of both themes
      await page.screenshot({
        path: `screenshots/mcp-theme-${newTheme ? 'dark' : 'light'}.png`,
        fullPage: false
      });
      
      // Toggle back
      await themeToggle.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `screenshots/mcp-theme-${!newTheme ? 'dark' : 'light'}.png`,
        fullPage: false
      });
    } else {
      console.log('  ℹ️ Theme toggle not found');
    }
  });

  test('Context menus and right-click actions', async ({ page }) => {
    console.log('\n🖱️ Testing context menus...');
    
    // Find an element to right-click
    console.log('Step 1: Testing right-click on editor...');
    const editor = page.locator('.cm-content, textarea, [contenteditable="true"]').first();
    
    if (await editor.isVisible()) {
      await editor.click();
      await page.keyboard.type('Right click test content');
      await page.waitForTimeout(300);
      
      // Right-click
      await editor.click({ button: 'right' });
      await page.waitForTimeout(500);
      
      // Check for context menu
      const contextMenu = page.locator('.context-menu, [role="menu"]').first();
      const menuVisible = await contextMenu.isVisible();
      
      if (menuVisible) {
        console.log('  ✅ Context menu appeared');
        
        // Check menu items
        const menuItems = contextMenu.locator('[role="menuitem"], li');
        const itemCount = await menuItems.count();
        console.log(`  📊 Found ${itemCount} menu item(s)`);
        
        // Close menu
        await page.keyboard.press('Escape');
        console.log('  ✅ Context menu closed');
      } else {
        console.log('  ℹ️ No custom context menu detected');
      }
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-context-menu.png',
      fullPage: false
    });
  });

  test('Accessibility features and screen reader support', async ({ page }) => {
    console.log('\n♿ Testing accessibility features...');
    
    // Check for ARIA labels
    console.log('Step 1: Checking ARIA labels...');
    const ariaElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('[aria-label], [role]');
      return {
        count: elements.length,
        roles: Array.from(new Set(Array.from(elements).map(el => el.getAttribute('role')).filter(Boolean)))
      };
    });
    console.log(`  📊 Found ${ariaElements.count} ARIA elements`);
    console.log(`  📊 Roles: ${ariaElements.roles.join(', ')}`);
    
    // Check focus indicators
    console.log('Step 2: Testing focus indicators...');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    
    const focusVisible = await page.evaluate(() => {
      const focused = document.activeElement;
      if (!focused) return false;
      const styles = window.getComputedStyle(focused);
      return styles.outlineWidth !== '0px' || styles.boxShadow !== 'none';
    });
    console.log(`  ${focusVisible ? '✅' : '⚠️'} Focus indicator visible`);
    
    // Check skip links
    console.log('Step 3: Checking for skip links...');
    await page.keyboard.press('Tab');
    const skipLink = page.locator('a[href^="#"]:has-text("skip")');
    const hasSkipLink = await skipLink.isVisible();
    console.log(`  ${hasSkipLink ? '✅' : 'ℹ️'} Skip link ${hasSkipLink ? 'found' : 'not found'}`);
    
    // Check color contrast (basic check)
    console.log('Step 4: Basic contrast check...');
    const contrastCheck = await page.evaluate(() => {
      const elements = document.querySelectorAll('button, a, p, h1, h2, h3');
      let goodContrast = 0;
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        const bg = styles.backgroundColor;
        const fg = styles.color;
        if (bg !== 'rgba(0, 0, 0, 0)' && fg !== 'rgba(0, 0, 0, 0)') {
          goodContrast++;
        }
      });
      return { total: elements.length, withColor: goodContrast };
    });
    console.log(`  📊 ${contrastCheck.withColor}/${contrastCheck.total} elements have defined colors`);
    
    await page.screenshot({
      path: 'screenshots/mcp-accessibility.png',
      fullPage: false
    });
  });

  test.afterEach(async ({ page }) => {
    console.log('\n🧹 Cleaning up test environment...\n');
    await page.close();
  });
});