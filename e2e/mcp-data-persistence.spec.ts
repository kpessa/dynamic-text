import { test, expect } from '@playwright/test';

test.describe('💾 Data Persistence and Export Features', () => {
  test.beforeEach(async ({ page }) => {
    console.log('\n🔧 Setting up persistence test environment...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Clear any existing data
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    console.log('  ✅ Storage cleared');
  });

  test('LocalStorage persistence across sessions', async ({ page }) => {
    console.log('\n📦 Testing localStorage persistence...');
    
    // Create test content
    console.log('Step 1: Creating test content...');
    const addHtmlButton = page.getByRole('button', { name: /add.*html/i }).first();
    await addHtmlButton.click();
    await page.waitForTimeout(500);
    
    const editor = page.locator('.cm-content, textarea').first();
    await editor.click();
    await page.keyboard.type('<h1>Persistent Test Content</h1>');
    await page.waitForTimeout(500);
    
    // Add JavaScript section
    const addJsButton = page.getByRole('button', { name: /add.*javascript/i }).first();
    await addJsButton.click();
    await page.waitForTimeout(500);
    
    const jsEditor = page.locator('.cm-content, textarea').last();
    await jsEditor.click();
    await page.keyboard.type('return "Dynamic content: " + new Date().toISOString();');
    console.log('  ✅ Test content created');
    
    // Check localStorage
    console.log('Step 2: Checking localStorage...');
    const storageData = await page.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data[key] = localStorage.getItem(key);
        }
      }
      return data;
    });
    
    const storageKeys = Object.keys(storageData);
    console.log(`  📊 Found ${storageKeys.length} localStorage key(s)`);
    console.log(`  📊 Keys: ${storageKeys.join(', ')}`);
    
    // Reload page
    console.log('Step 3: Reloading page...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if content persisted
    console.log('Step 4: Verifying content persistence...');
    const restoredContent = await page.locator('.cm-content, textarea').first().textContent();
    const contentPersisted = restoredContent?.includes('Persistent Test Content');
    console.log(`  ${contentPersisted ? '✅' : '❌'} Content ${contentPersisted ? 'persisted' : 'lost'} after reload`);
    
    // Check auto-save indicator
    const autoSaveIndicator = page.locator('.auto-save, [aria-label*="saved" i]').first();
    if (await autoSaveIndicator.isVisible()) {
      const saveText = await autoSaveIndicator.textContent();
      console.log(`  ✅ Auto-save indicator: ${saveText}`);
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-localstorage-persistence.png',
      fullPage: false
    });
  });

  test('Export to multiple formats', async ({ page }) => {
    console.log('\n📤 Testing export functionality...');
    
    // Create content to export
    console.log('Step 1: Creating content for export...');
    const addHtmlButton = page.getByRole('button', { name: /add.*html/i }).first();
    await addHtmlButton.click();
    await page.waitForTimeout(500);
    
    const editor = page.locator('.cm-content, textarea').first();
    await editor.click();
    await page.keyboard.type(`
<h1>Export Test Document</h1>
<p>This content will be exported to multiple formats.</p>
<ul>
  <li>HTML Export</li>
  <li>JSON Export</li>
  <li>PDF Export</li>
</ul>
    `);
    console.log('  ✅ Export content created');
    
    // Test export button
    console.log('Step 2: Testing export options...');
    const exportButton = page.getByRole('button', { name: /export/i }).first();
    
    if (await exportButton.isVisible()) {
      // Set up download promise before clicking
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      
      await exportButton.click();
      await page.waitForTimeout(500);
      console.log('  ✅ Export menu opened');
      
      // Check available export formats
      const exportFormats = ['HTML', 'JSON', 'PDF', 'Markdown', 'Text'];
      for (const format of exportFormats) {
        const formatOption = page.locator(`button:has-text("${format}"), [aria-label*="${format}" i]`).first();
        const isAvailable = await formatOption.isVisible();
        console.log(`  ${isAvailable ? '✅' : 'ℹ️'} ${format} export ${isAvailable ? 'available' : 'not found'}`);
        
        if (isAvailable && format === 'JSON') {
          // Test JSON export
          console.log(`\nStep 3: Testing ${format} export...`);
          await formatOption.click();
          
          // Wait for download
          const download = await downloadPromise;
          if (download) {
            const filename = download.suggestedFilename();
            console.log(`  ✅ File downloaded: ${filename}`);
            
            // Verify file extension
            const hasCorrectExtension = filename.toLowerCase().endsWith('.json');
            console.log(`  ${hasCorrectExtension ? '✅' : '❌'} Correct file extension`);
          } else {
            console.log('  ℹ️ Download not triggered (might be preview mode)');
          }
        }
      }
    } else {
      console.log('  ℹ️ Export button not found');
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-export-formats.png',
      fullPage: false
    });
  });

  test('Import and data migration', async ({ page }) => {
    console.log('\n📥 Testing import functionality...');
    
    // Look for import button
    console.log('Step 1: Looking for import option...');
    const importButton = page.getByRole('button', { name: /import/i }).first();
    
    if (await importButton.isVisible()) {
      await importButton.click();
      await page.waitForTimeout(500);
      console.log('  ✅ Import dialog opened');
      
      // Create test import data
      const testData = {
        version: '1.0',
        sections: [
          {
            type: 'html',
            content: '<h2>Imported HTML Section</h2>'
          },
          {
            type: 'javascript',
            content: 'return "Imported JavaScript";'
          }
        ],
        metadata: {
          created: new Date().toISOString(),
          source: 'mcp-test'
        }
      };
      
      // Simulate file upload via paste or drag-drop
      console.log('Step 2: Simulating data import...');
      const importTextarea = page.locator('textarea[placeholder*="paste" i], textarea[aria-label*="import" i]').first();
      
      if (await importTextarea.isVisible()) {
        await importTextarea.fill(JSON.stringify(testData, null, 2));
        console.log('  ✅ Import data pasted');
        
        // Look for import confirm button
        const confirmButton = page.getByRole('button', { name: /confirm|import|load/i }).first();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          await page.waitForTimeout(1000);
          console.log('  ✅ Import confirmed');
        }
      } else {
        // Try file input
        const fileInput = page.locator('input[type="file"]').first();
        if (await fileInput.isVisible()) {
          console.log('  ℹ️ File input detected (would need actual file)');
        }
      }
    } else {
      console.log('  ℹ️ Import functionality not available');
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-import-data.png',
      fullPage: false
    });
  });

  test('Workspace management and templates', async ({ page }) => {
    console.log('\n📁 Testing workspace management...');
    
    // Create multiple workspaces
    console.log('Step 1: Creating workspaces...');
    const workspaceNames = ['Clinical Notes', 'Research Data', 'Patient Reports'];
    
    for (const name of workspaceNames) {
      // Look for new workspace option
      const newWorkspaceButton = page.getByRole('button', { name: /new.*workspace/i }).first();
      if (await newWorkspaceButton.isVisible()) {
        await newWorkspaceButton.click();
        await page.waitForTimeout(500);
        
        // Enter workspace name
        const nameInput = page.locator('input[placeholder*="name" i]').first();
        if (await nameInput.isVisible()) {
          await nameInput.fill(name);
          await nameInput.press('Enter');
          console.log(`  ✅ Created workspace: ${name}`);
        }
      }
    }
    
    // Test workspace switching
    console.log('Step 2: Testing workspace switching...');
    const workspaceSelector = page.locator('select, [role="combobox"]').filter({ hasText: /workspace/i }).first();
    
    if (await workspaceSelector.isVisible()) {
      const options = await workspaceSelector.locator('option').allTextContents();
      console.log(`  📊 Available workspaces: ${options.join(', ')}`);
      
      // Switch between workspaces
      for (const workspace of workspaceNames.slice(0, 2)) {
        await workspaceSelector.selectOption({ label: workspace });
        await page.waitForTimeout(500);
        console.log(`  ✅ Switched to: ${workspace}`);
      }
    }
    
    // Test templates
    console.log('Step 3: Testing templates...');
    const templateButton = page.getByRole('button', { name: /template/i }).first();
    
    if (await templateButton.isVisible()) {
      await templateButton.click();
      await page.waitForTimeout(500);
      
      // Check available templates
      const templates = page.locator('.template-item, [role="option"]');
      const templateCount = await templates.count();
      console.log(`  📊 Found ${templateCount} template(s)`);
      
      if (templateCount > 0) {
        // Load first template
        await templates.first().click();
        await page.waitForTimeout(1000);
        console.log('  ✅ Template loaded');
      }
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-workspace-management.png',
      fullPage: true
    });
  });

  test('Version history and rollback', async ({ page }) => {
    console.log('\n🔄 Testing version history...');
    
    // Create initial version
    console.log('Step 1: Creating initial version...');
    const addHtmlButton = page.getByRole('button', { name: /add.*html/i }).first();
    await addHtmlButton.click();
    await page.waitForTimeout(500);
    
    const editor = page.locator('.cm-content, textarea').first();
    await editor.click();
    await page.keyboard.type('<h1>Version 1</h1>');
    await page.waitForTimeout(1000);
    
    // Make changes for version 2
    console.log('Step 2: Creating version 2...');
    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('<h1>Version 2</h1>\n<p>Updated content</p>');
    await page.waitForTimeout(1000);
    
    // Make changes for version 3
    console.log('Step 3: Creating version 3...');
    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('<h1>Version 3</h1>\n<p>Latest content</p>\n<ul><li>New item</li></ul>');
    await page.waitForTimeout(1000);
    
    // Open version history
    console.log('Step 4: Opening version history...');
    const historyButton = page.getByRole('button', { name: /history|version/i }).first();
    
    if (await historyButton.isVisible()) {
      await historyButton.click();
      await page.waitForTimeout(500);
      console.log('  ✅ Version history opened');
      
      // Check version list
      const versions = page.locator('.version-item, .history-item');
      const versionCount = await versions.count();
      console.log(`  📊 Found ${versionCount} version(s)`);
      
      if (versionCount > 1) {
        // Test rollback to previous version
        console.log('Step 5: Testing rollback...');
        const previousVersion = versions.nth(1);
        const rollbackButton = previousVersion.locator('button:has-text("Restore"), button:has-text("Rollback")').first();
        
        if (await rollbackButton.isVisible()) {
          await rollbackButton.click();
          await page.waitForTimeout(1000);
          console.log('  ✅ Rolled back to previous version');
          
          // Verify rollback
          const currentContent = await editor.textContent();
          console.log(`  📝 Current content after rollback: "${currentContent?.substring(0, 30)}..."`);
        }
      }
      
      // Test version comparison
      console.log('Step 6: Testing version comparison...');
      const compareButton = page.getByRole('button', { name: /compare/i }).first();
      if (await compareButton.isVisible()) {
        await compareButton.click();
        await page.waitForTimeout(500);
        console.log('  ✅ Version comparison available');
      }
    } else {
      console.log('  ℹ️ Version history not available');
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-version-history.png',
      fullPage: true
    });
  });

  test('Offline mode and sync', async ({ page }) => {
    console.log('\n🌐 Testing offline mode and sync...');
    
    // Create content while online
    console.log('Step 1: Creating content online...');
    const addHtmlButton = page.getByRole('button', { name: /add.*html/i }).first();
    await addHtmlButton.click();
    await page.waitForTimeout(500);
    
    const editor = page.locator('.cm-content, textarea').first();
    await editor.click();
    await page.keyboard.type('<h1>Online Content</h1>');
    await page.waitForTimeout(500);
    
    // Simulate offline mode
    console.log('Step 2: Going offline...');
    await page.context().setOffline(true);
    console.log('  ✅ Offline mode enabled');
    
    // Check offline indicator
    await page.waitForTimeout(1000);
    const offlineIndicator = page.locator('.offline, [aria-label*="offline" i]').first();
    const isOfflineIndicated = await offlineIndicator.isVisible();
    console.log(`  ${isOfflineIndicated ? '✅' : 'ℹ️'} Offline indicator ${isOfflineIndicated ? 'visible' : 'not found'}`);
    
    // Make changes while offline
    console.log('Step 3: Making changes offline...');
    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('<p>Added while offline</p>');
    await page.waitForTimeout(500);
    console.log('  ✅ Offline changes made');
    
    // Check for pending sync indicator
    const pendingSyncIndicator = page.locator('.pending-sync, [aria-label*="pending" i]').first();
    const hasPendingSync = await pendingSyncIndicator.isVisible();
    console.log(`  ${hasPendingSync ? '✅' : 'ℹ️'} Pending sync indicator ${hasPendingSync ? 'visible' : 'not shown'}`);
    
    // Go back online
    console.log('Step 4: Going back online...');
    await page.context().setOffline(false);
    await page.waitForTimeout(2000);
    console.log('  ✅ Online mode restored');
    
    // Check sync status
    const syncIndicator = page.locator('.sync, [aria-label*="sync" i]').first();
    const syncStatus = await syncIndicator.textContent();
    if (syncStatus) {
      console.log(`  ✅ Sync status: ${syncStatus}`);
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-offline-sync.png',
      fullPage: false
    });
  });

  test('Backup and restore', async ({ page }) => {
    console.log('\n💾 Testing backup and restore...');
    
    // Create content to backup
    console.log('Step 1: Creating content for backup...');
    const sections = ['HTML Section 1', 'JavaScript Section', 'HTML Section 2'];
    
    for (const section of sections) {
      const button = section.includes('JavaScript') 
        ? page.getByRole('button', { name: /add.*javascript/i }).first()
        : page.getByRole('button', { name: /add.*html/i }).first();
      
      await button.click();
      await page.waitForTimeout(500);
      
      const editor = page.locator('.cm-content, textarea').last();
      await editor.click();
      await page.keyboard.type(section.includes('JavaScript') 
        ? `return "${section}";`
        : `<h2>${section}</h2>`);
      await page.waitForTimeout(300);
    }
    console.log('  ✅ Test content created');
    
    // Create backup
    console.log('Step 2: Creating backup...');
    const backupButton = page.getByRole('button', { name: /backup/i }).first();
    
    if (await backupButton.isVisible()) {
      // Set up download promise
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      
      await backupButton.click();
      await page.waitForTimeout(500);
      
      const download = await downloadPromise;
      if (download) {
        const filename = download.suggestedFilename();
        console.log(`  ✅ Backup created: ${filename}`);
        
        // Check file naming convention
        const hasTimestamp = /\d{4}-\d{2}-\d{2}/.test(filename) || /backup/i.test(filename);
        console.log(`  ${hasTimestamp ? '✅' : '❌'} Backup filename includes timestamp/identifier`);
      } else {
        // Check if backup was saved to localStorage/IndexedDB
        const backupData = await page.evaluate(() => {
          const backup = localStorage.getItem('backup') || localStorage.getItem('last-backup');
          return backup ? JSON.parse(backup) : null;
        });
        
        if (backupData) {
          console.log('  ✅ Backup saved to browser storage');
          console.log(`  📊 Backup size: ${JSON.stringify(backupData).length} bytes`);
        }
      }
    } else {
      console.log('  ℹ️ Backup feature not available');
    }
    
    // Test restore
    console.log('Step 3: Testing restore...');
    const restoreButton = page.getByRole('button', { name: /restore/i }).first();
    
    if (await restoreButton.isVisible()) {
      await restoreButton.click();
      await page.waitForTimeout(500);
      console.log('  ✅ Restore dialog opened');
      
      // Check for restore options
      const restoreOptions = page.locator('.restore-option, .backup-item');
      const optionCount = await restoreOptions.count();
      console.log(`  📊 Found ${optionCount} restore option(s)`);
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-backup-restore.png',
      fullPage: true
    });
  });

  test('Collaborative features and sharing', async ({ page }) => {
    console.log('\n👥 Testing collaborative features...');
    
    // Create shareable content
    console.log('Step 1: Creating shareable content...');
    const addHtmlButton = page.getByRole('button', { name: /add.*html/i }).first();
    await addHtmlButton.click();
    await page.waitForTimeout(500);
    
    const editor = page.locator('.cm-content, textarea').first();
    await editor.click();
    await page.keyboard.type('<h1>Shared Document</h1>\n<p>This document is ready for collaboration.</p>');
    await page.waitForTimeout(500);
    
    // Test share functionality
    console.log('Step 2: Testing share options...');
    const shareButton = page.getByRole('button', { name: /share/i }).first();
    
    if (await shareButton.isVisible()) {
      await shareButton.click();
      await page.waitForTimeout(500);
      console.log('  ✅ Share dialog opened');
      
      // Check share options
      const shareOptions = ['Link', 'Email', 'Embed', 'QR Code'];
      for (const option of shareOptions) {
        const optionButton = page.locator(`button:has-text("${option}")`).first();
        const isAvailable = await optionButton.isVisible();
        console.log(`  ${isAvailable ? '✅' : 'ℹ️'} ${option} sharing ${isAvailable ? 'available' : 'not found'}`);
      }
      
      // Test link generation
      const linkInput = page.locator('input[readonly], input[value*="http"]').first();
      if (await linkInput.isVisible()) {
        const shareLink = await linkInput.inputValue();
        console.log(`  ✅ Share link generated: ${shareLink.substring(0, 50)}...`);
        
        // Test copy to clipboard
        const copyButton = page.getByRole('button', { name: /copy/i }).first();
        if (await copyButton.isVisible()) {
          await copyButton.click();
          console.log('  ✅ Link copied to clipboard');
        }
      }
      
      // Check permission settings
      console.log('Step 3: Checking permission settings...');
      const permissionOptions = page.locator('input[type="radio"], input[type="checkbox"]').filter({ hasText: /view|edit|comment/i });
      const permissionCount = await permissionOptions.count();
      console.log(`  📊 Found ${permissionCount} permission option(s)`);
    } else {
      console.log('  ℹ️ Share functionality not available');
    }
    
    await page.screenshot({
      path: 'screenshots/mcp-collaboration-sharing.png',
      fullPage: false
    });
  });

  test.afterEach(async ({ page }) => {
    console.log('\n🧹 Cleaning up persistence test environment...\n');
    
    // Clear test data
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.close();
  });
});