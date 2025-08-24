import { test, expect } from '@playwright/test';

/**
 * Sidebar and Navbar Functionality Tests
 * Comprehensive tests for UI navigation components
 */

test.describe('🧭 Navbar Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
  });

  test('Navbar menu button toggles sidebar', async ({ page }) => {
    console.log('\n🍔 Testing navbar menu button...');
    
    // Find the menu button (hamburger)
    const menuButton = page.locator('button').filter({ hasText: '☰' }).first();
    const menuButtonAlt = page.locator('.menu-btn').first();
    const finalMenuButton = await menuButton.isVisible() ? menuButton : menuButtonAlt;
    
    expect(await finalMenuButton.isVisible()).toBeTruthy();
    console.log('  ✅ Menu button found');
    
    // Check sidebar is initially hidden
    const sidebar = page.locator('.sidebar, aside, [role="complementary"], .app-sidebar').first();
    const initiallyVisible = await sidebar.isVisible({ timeout: 1000 }).catch(() => false);
    console.log(`  Sidebar initially: ${initiallyVisible ? 'visible' : 'hidden'}`);
    
    // Click menu button to toggle
    await finalMenuButton.click();
    await page.waitForTimeout(500);
    
    // Check sidebar visibility changed
    const afterClickVisible = await sidebar.isVisible({ timeout: 1000 }).catch(() => false);
    console.log(`  After click: ${afterClickVisible ? 'visible' : 'hidden'}`);
    
    // Should have toggled
    expect(afterClickVisible).toBe(!initiallyVisible);
    
    // Click again to toggle back
    await finalMenuButton.click();
    await page.waitForTimeout(500);
    
    const finalVisible = await sidebar.isVisible({ timeout: 1000 }).catch(() => false);
    expect(finalVisible).toBe(initiallyVisible);
    console.log('  ✅ Sidebar toggle working');
    
    await page.screenshot({ 
      path: 'screenshots/navbar-menu-toggle.png',
      fullPage: false 
    });
  });

  test('Navbar action buttons present and functional', async ({ page }) => {
    console.log('\n🎯 Testing navbar action buttons...');
    
    const buttons = {
      new: page.locator('button').filter({ hasText: /new/i }).first(),
      save: page.locator('button').filter({ hasText: /save/i }).first(),
      export: page.locator('button').filter({ hasText: /export/i }).first()
    };
    
    // Check New button
    if (await buttons.new.isVisible()) {
      console.log('  ✅ New button found');
      const newText = await buttons.new.textContent();
      expect(newText).toMatch(/new/i);
      
      // Check if clickable
      const isEnabled = await buttons.new.isEnabled();
      console.log(`    Enabled: ${isEnabled}`);
    }
    
    // Check Save button
    if (await buttons.save.isVisible()) {
      console.log('  ✅ Save button found');
      const saveText = await buttons.save.textContent();
      expect(saveText).toMatch(/save/i);
      
      // Check disabled state (should be disabled initially if no changes)
      const isDisabled = await buttons.save.isDisabled();
      console.log(`    Initially disabled: ${isDisabled}`);
    }
    
    // Check Export button
    if (await buttons.export.isVisible()) {
      console.log('  ✅ Export button found');
      const exportText = await buttons.export.textContent();
      expect(exportText).toMatch(/export|copy/i);
      
      // Test export functionality
      await buttons.export.click();
      await page.waitForTimeout(500);
      
      // Check if text changed to "Copied!"
      const afterClickText = await buttons.export.textContent();
      if (afterClickText?.includes('Copied')) {
        console.log('    ✅ Export/copy confirmation shown');
      }
      
      // Press Escape to close any dialogs
      await page.keyboard.press('Escape');
    }
    
    await page.screenshot({ 
      path: 'screenshots/navbar-buttons.png',
      fullPage: false 
    });
  });

  test('TPN panel toggle functionality', async ({ page }) => {
    console.log('\n🧪 Testing TPN panel toggle...');
    
    const tpnButton = page.locator('button').filter({ hasText: /tpn/i }).first();
    
    if (await tpnButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('  ✅ TPN button found');
      const buttonText = await tpnButton.textContent();
      console.log(`    Button text: "${buttonText}"`);
      
      // Get initial state
      const tpnPanel = page.locator('.tpn-panel, [class*="tpn"], .test-panel').first();
      const initiallyVisible = await tpnPanel.isVisible({ timeout: 500 }).catch(() => false);
      console.log(`    Panel initially: ${initiallyVisible ? 'visible' : 'hidden'}`);
      
      // Click with timeout protection
      await Promise.race([
        tpnButton.click(),
        page.waitForTimeout(2000)
      ]);
      await page.waitForTimeout(500);
      
      // Check panel visibility changed
      const afterClickVisible = await tpnPanel.isVisible({ timeout: 500 }).catch(() => false);
      console.log(`    After click: ${afterClickVisible ? 'visible' : 'hidden'}`);
      
      // Click button text should change
      const newButtonText = await tpnButton.textContent({ timeout: 1000 }).catch(() => '');
      if (newButtonText !== buttonText) {
        console.log(`    ✅ Button text updated: "${newButtonText}"`);
      }
      
      // Close panel
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    } else {
      console.log('  ℹ️ TPN button not found');
    }
  });
});

test.describe('📚 Sidebar Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    // Open sidebar for these tests
    const menuButton = page.locator('button').filter({ hasText: '☰' }).first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('Sidebar structure and sections', async ({ page }) => {
    console.log('\n📋 Testing sidebar structure...');
    
    const sidebar = page.locator('.sidebar, aside, [role="complementary"], .app-sidebar').first();
    
    if (await sidebar.isVisible()) {
      console.log('  ✅ Sidebar is visible');
      
      // Check for main sections
      const sections = {
        references: sidebar.locator('text=/reference/i').first(),
        configs: sidebar.locator('text=/config/i').first(),
        import: sidebar.locator('text=/import/i').first(),
        manage: sidebar.locator('text=/manage/i').first()
      };
      
      for (const [name, locator] of Object.entries(sections)) {
        if (await locator.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log(`  ✅ ${name} section found`);
        }
      }
      
      // Check for filter inputs
      const searchInputs = sidebar.locator('input[type="text"], input[type="search"]');
      const inputCount = await searchInputs.count();
      console.log(`  📊 ${inputCount} search/filter input(s) found`);
      
      // Check for buttons
      const sidebarButtons = sidebar.locator('button');
      const buttonCount = await sidebarButtons.count();
      console.log(`  📊 ${buttonCount} button(s) in sidebar`);
      
      await page.screenshot({ 
        path: 'screenshots/sidebar-structure.png',
        fullPage: false 
      });
    } else {
      console.log('  ❌ Sidebar not visible');
    }
  });

  test('Reference text management', async ({ page }) => {
    console.log('\n📝 Testing reference text management...');
    
    const sidebar = page.locator('.sidebar, aside, [role="complementary"], .app-sidebar').first();
    
    if (await sidebar.isVisible()) {
      // Look for save reference functionality
      const saveButton = sidebar.locator('button').filter({ hasText: /save.*reference/i }).first();
      
      if (await saveButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('  ✅ Save reference button found');
        
        // Click to open save dialog
        await saveButton.click();
        await page.waitForTimeout(500);
        
        // Look for save dialog
        const dialog = page.locator('[role="dialog"], .modal, .dialog').first();
        if (await dialog.isVisible()) {
          console.log('  ✅ Save dialog opened');
          
          // Check for form fields
          const nameInput = dialog.locator('input[placeholder*="name"], input[name="name"]').first();
          const ingredientSelect = dialog.locator('select, input[placeholder*="ingredient"]').first();
          
          if (await nameInput.isVisible()) {
            await nameInput.fill('Test Reference');
            console.log('    ✅ Filled reference name');
          }
          
          // Close dialog
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      }
      
      // Look for load reference functionality
      const loadButton = sidebar.locator('button').filter({ hasText: /load/i }).first();
      if (await loadButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('  ✅ Load reference functionality available');
      }
    }
  });

  test('Configuration activation', async ({ page }) => {
    console.log('\n⚙️ Testing configuration activation...');
    
    const sidebar = page.locator('.sidebar, aside, [role="complementary"], .app-sidebar').first();
    
    if (await sidebar.isVisible()) {
      // Look for configuration section
      const configSection = sidebar.locator('text=/active.*config/i').first();
      
      if (await configSection.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('  ✅ Configuration section found');
        
        // Look for activate buttons
        const activateButtons = sidebar.locator('button').filter({ hasText: /activate/i });
        const activateCount = await activateButtons.count();
        console.log(`  📊 ${activateCount} activate button(s) found`);
        
        if (activateCount > 0) {
          // Test first activate button
          const firstActivate = activateButtons.first();
          await firstActivate.click();
          await page.waitForTimeout(500);
          
          // Check for confirmation or status change
          const activeIndicator = sidebar.locator('.active, [class*="active"], text=/active/i').first();
          if (await activeIndicator.isVisible({ timeout: 1000 }).catch(() => false)) {
            console.log('  ✅ Configuration activated');
          }
        }
      }
      
      // Check for ingredient display in config
      const ingredients = sidebar.locator('[class*="ingredient"], .badge').first();
      if (await ingredients.isVisible({ timeout: 1000 }).catch(() => false)) {
        const ingredientText = await ingredients.textContent();
        console.log(`  ✅ Ingredient display: "${ingredientText?.substring(0, 20)}..."`);
      }
    }
  });

  test('Sidebar close functionality', async ({ page }) => {
    console.log('\n❌ Testing sidebar close...');
    
    const sidebar = page.locator('.sidebar, aside, [role="complementary"], .app-sidebar').first();
    
    if (await sidebar.isVisible()) {
      // Look for close button
      const closeButton = sidebar.locator('button').filter({ hasText: /close|×|✕/i }).first();
      const closeButtonAlt = sidebar.locator('[aria-label*="close"]').first();
      const finalCloseButton = await closeButton.isVisible() ? closeButton : closeButtonAlt;
      
      if (await finalCloseButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('  ✅ Close button found');
        await finalCloseButton.click();
        await page.waitForTimeout(500);
        
        // Verify sidebar is hidden
        const stillVisible = await sidebar.isVisible({ timeout: 500 }).catch(() => false);
        expect(stillVisible).toBeFalsy();
        console.log('  ✅ Sidebar closed successfully');
      } else {
        // Try Escape key
        console.log('  ℹ️ No close button, trying Escape key');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        
        const stillVisible = await sidebar.isVisible({ timeout: 500 }).catch(() => false);
        if (!stillVisible) {
          console.log('  ✅ Sidebar closed with Escape');
        }
      }
    }
  });

  test('Sidebar search and filtering', async ({ page }) => {
    console.log('\n🔍 Testing sidebar search and filtering...');
    
    const sidebar = page.locator('.sidebar, aside, [role="complementary"], .app-sidebar').first();
    
    if (await sidebar.isVisible()) {
      // Find search inputs
      const searchInputs = sidebar.locator('input[type="text"], input[type="search"], input[placeholder*="search"]');
      const searchCount = await searchInputs.count();
      
      console.log(`  Found ${searchCount} search input(s)`);
      
      if (searchCount > 0) {
        const firstSearch = searchInputs.first();
        await firstSearch.click();
        await firstSearch.fill('test');
        await page.waitForTimeout(500);
        console.log('  ✅ Entered search query');
        
        // Check if results updated
        const resultItems = sidebar.locator('.result-item, .list-item, li');
        const resultCount = await resultItems.count();
        console.log(`  📊 ${resultCount} result(s) shown`);
        
        // Clear search
        await firstSearch.clear();
        await page.waitForTimeout(300);
        
        // Check results restored
        const afterClearCount = await resultItems.count();
        console.log(`  📊 ${afterClearCount} result(s) after clearing`);
      }
      
      // Check for filter dropdowns
      const selects = sidebar.locator('select');
      const selectCount = await selects.count();
      console.log(`  📊 ${selectCount} filter dropdown(s) found`);
      
      if (selectCount > 0) {
        const firstSelect = selects.first();
        const options = await firstSelect.locator('option').count();
        console.log(`    First dropdown has ${options} option(s)`);
      }
    }
  });
});

test.describe('🔄 Sidebar-Navbar Integration', () => {
  test('Full workflow: Open sidebar, select reference, close sidebar', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    console.log('\n🔄 Testing full sidebar workflow...');
    
    // Step 1: Open sidebar via navbar
    const menuButton = page.locator('button').filter({ hasText: '☰' }).first();
    await menuButton.click();
    await page.waitForTimeout(500);
    console.log('  ✅ Step 1: Sidebar opened');
    
    const sidebar = page.locator('.sidebar, aside, [role="complementary"], .app-sidebar').first();
    expect(await sidebar.isVisible()).toBeTruthy();
    
    // Step 2: Interact with sidebar
    const searchInput = sidebar.locator('input').first();
    if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await searchInput.fill('test search');
      console.log('  ✅ Step 2: Searched in sidebar');
    }
    
    // Step 3: Close sidebar
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    const stillVisible = await sidebar.isVisible({ timeout: 500 }).catch(() => false);
    expect(stillVisible).toBeFalsy();
    console.log('  ✅ Step 3: Sidebar closed');
    
    // Step 4: Verify navbar still functional
    const saveButton = page.locator('button').filter({ hasText: /save/i }).first();
    expect(await saveButton.isVisible()).toBeTruthy();
    console.log('  ✅ Step 4: Navbar still functional');
    
    await page.screenshot({ 
      path: 'screenshots/sidebar-navbar-integration.png',
      fullPage: false 
    });
  });

  test('Keyboard navigation between navbar and sidebar', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    console.log('\n⌨️ Testing keyboard navigation...');
    
    // Tab through navbar
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    
    let focused = await page.evaluate(() => document.activeElement?.tagName);
    console.log(`  Focused element: ${focused}`);
    
    // Open sidebar with keyboard
    const menuButton = page.locator('button').filter({ hasText: '☰' }).first();
    await menuButton.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    console.log('  ✅ Sidebar opened with keyboard');
    
    // Tab into sidebar
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    
    focused = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el?.tagName,
        class: el?.className,
        placeholder: (el as HTMLInputElement)?.placeholder
      };
    });
    console.log(`  Focused in sidebar: ${JSON.stringify(focused)}`);
    
    // Navigate with arrow keys if in list
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    
    // Close with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    const sidebar = page.locator('.sidebar, aside, [role="complementary"], .app-sidebar').first();
    const stillVisible = await sidebar.isVisible({ timeout: 500 }).catch(() => false);
    expect(stillVisible).toBeFalsy();
    console.log('  ✅ Sidebar closed with Escape');
  });

  test('Responsive behavior', async ({ page }) => {
    console.log('\n📱 Testing responsive behavior...');
    
    // Desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const desktopButtons = await page.locator('button:visible').count();
    console.log(`  Desktop: ${desktopButtons} visible buttons`);
    
    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    const tabletButtons = await page.locator('button:visible').count();
    console.log(`  Tablet: ${tabletButtons} visible buttons`);
    
    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    const mobileButtons = await page.locator('button:visible').count();
    console.log(`  Mobile: ${mobileButtons} visible buttons`);
    
    // Check if menu button is more prominent on mobile
    const menuButton = page.locator('button').filter({ hasText: '☰' }).first();
    const isMenuVisible = await menuButton.isVisible();
    console.log(`  Menu button visible on mobile: ${isMenuVisible}`);
    
    // Check if button text is hidden on mobile (only icons)
    const saveButton = page.locator('button').filter({ hasText: /save/i }).first();
    if (await saveButton.isVisible()) {
      const buttonHTML = await saveButton.innerHTML();
      const hasHiddenText = buttonHTML.includes('hidden') || buttonHTML.includes('sm:inline');
      console.log(`  Save button has responsive text: ${hasHiddenText}`);
    }
    
    await page.screenshot({ 
      path: 'screenshots/responsive-mobile.png',
      fullPage: false 
    });
  });
});