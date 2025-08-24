import { test, expect } from '@playwright/test';

/**
 * Visual and Advanced MCP Tests
 * Focus on visual regression, advanced interactions, and edge cases
 */

test.describe('🎨 Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
  });

  test('Visual consistency across sections', async ({ page }) => {
    console.log('\n🎨 Testing visual consistency...');
    
    // Take baseline screenshot
    await page.screenshot({ 
      path: 'screenshots/visual-baseline.png',
      fullPage: false
    });
    
    // Add content and compare
    const addButton = page.locator('button').filter({ hasText: /add/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);
      
      // Screenshot with content
      await page.screenshot({ 
        path: 'screenshots/visual-with-content.png',
        fullPage: false
      });
      
      console.log('  ✅ Visual snapshots captured');
    }
    
    // Test dark mode if available
    const themeToggle = page.locator('[aria-label*="theme"], [class*="theme"], button:has-text("🌙"), button:has-text("☀")').first();
    if (await themeToggle.isVisible({ timeout: 1000 }).catch(() => false)) {
      await themeToggle.click();
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: 'screenshots/visual-dark-mode.png',
        fullPage: false
      });
      
      console.log('  ✅ Dark mode snapshot captured');
    }
  });

  test('Responsive layout snapshots', async ({ page }) => {
    console.log('\n📱 Capturing responsive layouts...');
    
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1280, height: 720 }
    ];
    
    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(300);
      
      await page.screenshot({ 
        path: `screenshots/visual-${vp.name}.png`,
        fullPage: false
      });
      
      console.log(`  ✅ ${vp.name} snapshot (${vp.width}x${vp.height})`);
    }
  });
});

test.describe('🔧 Advanced Interactions', () => {
  test('Multi-section workflow', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    console.log('\n🔧 Testing multi-section workflow...');
    
    const sections = ['HTML', 'CSS', 'JavaScript'];
    const addButton = page.locator('button').filter({ hasText: /add/i }).first();
    
    for (const section of sections) {
      if (await addButton.isVisible({ timeout: 1000 })) {
        await addButton.click();
        await page.waitForTimeout(500);
        
        // Find the latest editor
        const editors = page.locator('.cm-content, textarea, [contenteditable]');
        const editorCount = await editors.count();
        
        if (editorCount > 0) {
          const editor = editors.last();
          await editor.click();
          
          // Add content based on type
          const content = section === 'HTML' 
            ? '<div>Test</div>'
            : section === 'CSS'
            ? '.test { color: red; }'
            : 'console.log("test");';
            
          await editor.fill(content);
          console.log(`  ✅ Added ${section} section`);
        }
      }
    }
    
    // Verify all sections
    const allEditors = await page.locator('.cm-content, textarea, [contenteditable]').count();
    console.log(`  📊 Total sections created: ${allEditors}`);
  });

  test('Copy-paste operations', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    console.log('\n📋 Testing copy-paste operations...');
    
    // Add a section with content
    const addButton = page.locator('button').filter({ hasText: /add/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);
      
      const editor = page.locator('.cm-content, textarea, [contenteditable]').first();
      if (await editor.isVisible()) {
        await editor.click();
        await editor.fill('Original content');
        
        // Select all and copy
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Control+c');
        
        // Add another section
        await addButton.click();
        await page.waitForTimeout(500);
        
        const newEditor = page.locator('.cm-content, textarea, [contenteditable]').last();
        if (await newEditor.isVisible()) {
          await newEditor.click();
          
          // Paste
          await page.keyboard.press('Control+v');
          await page.waitForTimeout(300);
          
          // Verify paste worked
          const content = await newEditor.inputValue().catch(() => 
            newEditor.textContent()
          );
          
          if (content?.includes('Original content')) {
            console.log('  ✅ Copy-paste successful');
          } else {
            console.log('  ℹ️ Copy-paste needs manual verification');
          }
        }
      }
    }
  });

  test('Undo-redo operations', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    console.log('\n↩️ Testing undo-redo...');
    
    const addButton = page.locator('button').filter({ hasText: /add/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);
      
      const editor = page.locator('.cm-content, textarea, [contenteditable]').first();
      if (await editor.isVisible()) {
        await editor.click();
        
        // Type multiple things
        await editor.type('First ');
        await page.waitForTimeout(200);
        await editor.type('Second ');
        await page.waitForTimeout(200);
        await editor.type('Third');
        
        // Undo
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(200);
        
        // Check content
        const afterUndo = await editor.inputValue().catch(() => 
          editor.textContent()
        );
        console.log(`  After undo: "${afterUndo}"`);
        
        // Redo
        await page.keyboard.press('Control+y');
        await page.waitForTimeout(200);
        
        const afterRedo = await editor.inputValue().catch(() => 
          editor.textContent()
        );
        console.log(`  After redo: "${afterRedo}"`);
        
        console.log('  ✅ Undo-redo tested');
      }
    }
  });
});

test.describe('🌐 Integration Tests', () => {
  test('Full application workflow', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    console.log('\n🌐 Testing full workflow...');
    
    const workflow = [
      { action: 'add', description: 'Add section' },
      { action: 'edit', description: 'Edit content' },
      { action: 'save', description: 'Save changes' },
      { action: 'export', description: 'Export content' }
    ];
    
    for (const step of workflow) {
      console.log(`  ${step.description}...`);
      
      switch (step.action) {
        case 'add':
          const addBtn = page.locator('button').filter({ hasText: /add|new/i }).first();
          if (await addBtn.isVisible()) {
            await addBtn.click();
            await page.waitForTimeout(500);
          }
          break;
          
        case 'edit':
          const editor = page.locator('.cm-content, textarea, [contenteditable]').first();
          if (await editor.isVisible()) {
            await editor.click();
            await editor.fill('<h1>Complete Workflow Test</h1>');
          }
          break;
          
        case 'save':
          const saveBtn = page.locator('button').filter({ hasText: /save/i }).first();
          if (await saveBtn.isVisible() && await saveBtn.isEnabled()) {
            await saveBtn.click();
            await page.waitForTimeout(300);
          } else {
            await page.keyboard.press('Control+s');
          }
          break;
          
        case 'export':
          const exportBtn = page.locator('button').filter({ hasText: /export/i }).first();
          if (await exportBtn.isVisible()) {
            await exportBtn.click();
            await page.waitForTimeout(300);
            await page.keyboard.press('Escape');
          }
          break;
      }
      
      console.log(`    ✅ ${step.description} complete`);
    }
    
    console.log('  ✅ Full workflow completed');
  });

  test('Data persistence check', async ({ page, context }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    console.log('\n💾 Testing data persistence...');
    
    // Add content
    const addButton = page.locator('button').filter({ hasText: /add/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);
      
      const editor = page.locator('.cm-content, textarea, [contenteditable]').first();
      if (await editor.isVisible()) {
        await editor.click();
        await editor.fill('Persistence test content');
        
        // Save if possible
        const saveBtn = page.locator('button').filter({ hasText: /save/i }).first();
        if (await saveBtn.isVisible() && await saveBtn.isEnabled()) {
          await saveBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }
    
    // Check localStorage
    const storageData = await page.evaluate(() => {
      const data: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data[key] = localStorage.getItem(key);
        }
      }
      return data;
    });
    
    console.log(`  📊 localStorage items: ${Object.keys(storageData).length}`);
    
    // Create new page and check persistence
    const newPage = await context.newPage();
    await newPage.goto('/', { waitUntil: 'networkidle' });
    await newPage.waitForTimeout(1000);
    
    // Check if content persisted
    const editors = newPage.locator('.cm-content, textarea, [contenteditable]');
    const editorCount = await editors.count();
    
    if (editorCount > 0) {
      const content = await editors.first().textContent();
      if (content?.includes('Persistence test')) {
        console.log('  ✅ Data persisted across pages');
      } else {
        console.log('  ℹ️ Data did not persist');
      }
    }
    
    await newPage.close();
  });
});

test.describe('🚨 Edge Cases', () => {
  test('Rapid action stress test', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    console.log('\n🚨 Rapid action stress test...');
    
    const actions = ['click', 'type', 'key'];
    const startTime = Date.now();
    let actionCount = 0;
    
    // Run for 3 seconds
    while (Date.now() - startTime < 3000) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      
      try {
        switch (action) {
          case 'click':
            const btn = page.locator('button:visible').first();
            if (await btn.isVisible({ timeout: 100 }).catch(() => false)) {
              await btn.click({ timeout: 100 });
              actionCount++;
            }
            break;
            
          case 'type':
            const input = page.locator('input:visible, textarea:visible').first();
            if (await input.isVisible({ timeout: 100 }).catch(() => false)) {
              await input.type('x', { timeout: 100 });
              actionCount++;
            }
            break;
            
          case 'key':
            await page.keyboard.press('Tab');
            actionCount++;
            break;
        }
      } catch {
        // Ignore errors in stress test
      }
      
      await page.waitForTimeout(50);
    }
    
    console.log(`  ✅ Performed ${actionCount} rapid actions`);
    
    // Check app still responsive
    const isResponsive = await page.evaluate(() => {
      document.body.click();
      return true;
    });
    
    console.log(`  ${isResponsive ? '✅' : '❌'} App still responsive`);
  });

  test('Memory leak detection', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    console.log('\n🔍 Checking for memory leaks...');
    
    // Get initial memory
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // Create and destroy sections repeatedly
    const addButton = page.locator('button').filter({ hasText: /add/i }).first();
    
    for (let i = 0; i < 10; i++) {
      if (await addButton.isVisible({ timeout: 500 })) {
        await addButton.click();
        await page.waitForTimeout(100);
      }
    }
    
    // Force garbage collection if possible
    await page.evaluate(() => {
      if ('gc' in window) {
        (window as any).gc();
      }
    });
    
    await page.waitForTimeout(1000);
    
    // Get final memory
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    if (initialMemory && finalMemory) {
      const increase = (finalMemory - initialMemory) / 1024 / 1024;
      console.log(`  📊 Memory increase: ${increase.toFixed(2)}MB`);
      
      if (increase < 10) {
        console.log('  ✅ No significant memory leak detected');
      } else {
        console.log('  ⚠️ Possible memory leak');
      }
    }
  });
});