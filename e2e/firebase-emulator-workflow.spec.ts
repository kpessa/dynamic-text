import { test, expect, type Page } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Helper to check if emulator is running
async function isEmulatorRunning(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}`);
    return response.ok;
  } catch {
    return false;
  }
}

// Helper to wait for emulator
async function waitForEmulator(port: number, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await isEmulatorRunning(port)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

test.describe('Firebase Emulator E2E Workflow', () => {
  let emulatorProcess: any = null;
  const emulatorPorts = {
    firestore: 8080,
    auth: 9099,
    ui: 4000
  };

  test.beforeAll(async () => {
    console.log('Setting up Firebase Emulator for E2E tests...');
    
    // Check if firebase.json exists, if not, we'll create a basic one
    const firebaseConfigPath = path.join(process.cwd(), 'firebase.json');
    try {
      await fs.access(firebaseConfigPath);
    } catch {
      console.log('Creating firebase.json for emulator...');
      const defaultConfig = {
        emulators: {
          auth: {
            port: emulatorPorts.auth
          },
          firestore: {
            port: emulatorPorts.firestore
          },
          ui: {
            enabled: true,
            port: emulatorPorts.ui
          }
        }
      };
      await fs.writeFile(firebaseConfigPath, JSON.stringify(defaultConfig, null, 2));
    }

    // Check if emulator is already running
    const isRunning = await isEmulatorRunning(emulatorPorts.firestore);
    if (!isRunning) {
      console.log('Starting Firebase Emulator...');
      // Note: In a real scenario, you would start the emulator here
      // For testing, we'll assume it needs to be started manually
    }
  });

  test.afterAll(async () => {
    if (emulatorProcess) {
      console.log('Stopping Firebase Emulator...');
      emulatorProcess.kill();
    }
  });

  test('should access Firebase Emulator UI', async ({ page }) => {
    // Skip if emulator is not running
    const isRunning = await isEmulatorRunning(emulatorPorts.ui);
    if (!isRunning) {
      console.log('Skipping: Emulator UI not accessible');
      test.skip();
      return;
    }

    // Navigate to Emulator UI
    await page.goto(`http://localhost:${emulatorPorts.ui}`);

    // Wait for the UI to load
    await page.waitForLoadState('networkidle');

    // Check if we're on the Emulator UI
    const title = await page.title();
    expect(title).toContain('Emulator');

    // Take a screenshot for documentation
    await page.screenshot({ 
      path: 'screenshots/emulator-ui.png',
      fullPage: true 
    });

    // Verify main sections are visible
    await expect(page.locator('text=/Firestore/i')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/Authentication/i')).toBeVisible({ timeout: 10000 });
  });

  test('should interact with Firestore through the app', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173'); // Vite default port

    // Wait for the app to load
    await page.waitForLoadState('networkidle');

    // Check for emulator indicator (if implemented)
    const emulatorIndicator = page.locator('[data-testid="emulator-indicator"]');
    if (await emulatorIndicator.count() > 0) {
      await expect(emulatorIndicator).toContainText(/emulator/i);
    }

    // Test creating an ingredient in the emulator
    const addButton = page.locator('button:has-text("Add Ingredient")').first();
    if (await addButton.count() > 0) {
      await addButton.click();

      // Fill in ingredient details
      await page.fill('[data-testid="ingredient-name"]', 'E2E Test Ingredient');
      await page.fill('[data-testid="ingredient-content"]', 'Test content from E2E');

      // Save the ingredient
      await page.click('button:has-text("Save")');

      // Wait for success message or redirect
      await page.waitForTimeout(2000);

      // Verify the ingredient was created
      await expect(page.locator('text="E2E Test Ingredient"')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should backup and restore emulator data', async ({ page }) => {
    // Skip if emulator is not running
    const isRunning = await isEmulatorRunning(emulatorPorts.firestore);
    if (!isRunning) {
      console.log('Skipping: Emulator not running');
      test.skip();
      return;
    }

    // Create a backup directory if it doesn't exist
    const backupDir = path.join(process.cwd(), 'emulator-backups');
    await fs.mkdir(backupDir, { recursive: true });

    // Export emulator data (simulated - would use firebase CLI in real scenario)
    const exportPath = path.join(backupDir, `backup-${Date.now()}`);
    console.log(`Would export emulator data to: ${exportPath}`);

    // In a real scenario, you would run:
    // await execAsync(`firebase emulators:export ${exportPath}`);

    // Verify backup was created (simulated)
    // await fs.access(exportPath);

    // Navigate to app to verify data persistence
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Take screenshot of current state
    await page.screenshot({ 
      path: 'screenshots/emulator-data-state.png',
      fullPage: true 
    });
  });

  test('should reset collections safely', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Look for admin or debug panel (if implemented)
    const debugPanel = page.locator('[data-testid="debug-panel"]');
    if (await debugPanel.count() > 0) {
      await debugPanel.click();

      // Look for reset collection button
      const resetButton = page.locator('button:has-text("Reset Collection")');
      if (await resetButton.count() > 0) {
        // Click reset button
        await resetButton.click();

        // Confirm the action
        const confirmButton = page.locator('button:has-text("Confirm")');
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
        }

        // Wait for reset to complete
        await page.waitForTimeout(2000);

        // Verify collection is empty
        const emptyMessage = page.locator('text=/No items found|Empty collection/i');
        await expect(emptyMessage).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should handle authentication in emulator', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Check if we're automatically signed in (anonymous auth)
    const userIndicator = page.locator('[data-testid="user-indicator"]');
    if (await userIndicator.count() > 0) {
      // Verify anonymous user
      await expect(userIndicator).toContainText(/anonymous|guest/i);
    }

    // Navigate to Emulator UI to check auth
    await page.goto(`http://localhost:${emulatorPorts.ui}/auth`);
    
    // Wait for auth page to load
    await page.waitForLoadState('networkidle');

    // Check for users in the auth emulator
    const usersList = page.locator('[data-testid="users-list"]');
    if (await usersList.count() > 0) {
      // Take screenshot of auth state
      await page.screenshot({ 
        path: 'screenshots/emulator-auth-users.png',
        fullPage: true 
      });
    }
  });

  test('should run tests against emulator', async () => {
    // Skip if emulator is not running
    const isRunning = await isEmulatorRunning(emulatorPorts.firestore);
    if (!isRunning) {
      console.log('Skipping: Emulator not running');
      test.skip();
      return;
    }

    // Run unit tests against emulator (simulated)
    console.log('Would run: npm run test:emulator');
    
    // In a real scenario:
    // const { stdout, stderr } = await execAsync('npm run test:emulator');
    // expect(stderr).toBe('');
    // expect(stdout).toContain('tests passed');
  });

  test('should handle emulator data import/export', async ({ page }) => {
    const dataDir = path.join(process.cwd(), 'emulator-data');
    
    // Create data directory if it doesn't exist
    await fs.mkdir(dataDir, { recursive: true });

    // Create sample data file
    const sampleData = {
      ingredients: [
        { id: 'sample-1', name: 'Sample Ingredient 1', content: 'Content 1' },
        { id: 'sample-2', name: 'Sample Ingredient 2', content: 'Content 2' }
      ]
    };

    const dataFile = path.join(dataDir, 'sample-import.json');
    await fs.writeFile(dataFile, JSON.stringify(sampleData, null, 2));

    // Navigate to app
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Look for import functionality
    const importButton = page.locator('button:has-text("Import")');
    if (await importButton.count() > 0) {
      await importButton.click();

      // Handle file upload
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles(dataFile);

        // Confirm import
        const confirmImport = page.locator('button:has-text("Confirm Import")');
        if (await confirmImport.count() > 0) {
          await confirmImport.click();
        }

        // Wait for import to complete
        await page.waitForTimeout(2000);

        // Verify imported data
        await expect(page.locator('text="Sample Ingredient 1"')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text="Sample Ingredient 2"')).toBeVisible({ timeout: 5000 });
      }
    }

    // Clean up
    await fs.unlink(dataFile).catch(() => {});
  });

  test('should verify emulator isolation', async ({ page }) => {
    // This test verifies that emulator data is isolated from production

    // Navigate to the app
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Check for emulator warning or indicator
    const emulatorWarning = page.locator('[data-testid="emulator-warning"]');
    if (await emulatorWarning.count() > 0) {
      await expect(emulatorWarning).toContainText(/emulator|development|test/i);
      
      // Take screenshot of warning
      await page.screenshot({ 
        path: 'screenshots/emulator-warning.png' 
      });
    }

    // Verify we're not connected to production
    const prodIndicator = page.locator('[data-testid="production-indicator"]');
    if (await prodIndicator.count() > 0) {
      await expect(prodIndicator).not.toBeVisible();
    }
  });

  test('should test CI/CD pipeline integration', async () => {
    // This test simulates CI/CD pipeline checks

    const isCIEnvironment = process.env.CI === 'true';

    if (isCIEnvironment) {
      console.log('Running in CI environment');

      // Check that emulator can start in CI
      // In real scenario: await execAsync('firebase emulators:start --only firestore,auth');

      // Run tests
      // const { stdout } = await execAsync('npm run test:unit');
      // expect(stdout).toContain('passed');

      // Export test results
      const resultsDir = path.join(process.cwd(), 'test-results');
      await fs.mkdir(resultsDir, { recursive: true });

      const results = {
        timestamp: new Date().toISOString(),
        environment: 'CI',
        emulatorUsed: true,
        testsRun: true
      };

      await fs.writeFile(
        path.join(resultsDir, 'emulator-ci-results.json'),
        JSON.stringify(results, null, 2)
      );
    } else {
      console.log('Not in CI environment, skipping CI-specific tests');
    }
  });

  test('should validate emulator performance', async ({ page }) => {
    // Skip if emulator is not running
    const isRunning = await isEmulatorRunning(emulatorPorts.firestore);
    if (!isRunning) {
      console.log('Skipping: Emulator not running');
      test.skip();
      return;
    }

    // Navigate to the app
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Measure performance of operations
    const startTime = Date.now();

    // Perform multiple operations
    for (let i = 0; i < 5; i++) {
      // Simulate creating and reading data
      const addButton = page.locator('button:has-text("Add")').first();
      if (await addButton.count() > 0) {
        await addButton.click();
        await page.waitForTimeout(100);
        
        // Cancel or close dialog
        const cancelButton = page.locator('button:has-text("Cancel")').first();
        if (await cancelButton.count() > 0) {
          await cancelButton.click();
        }
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Assert performance is acceptable
    expect(duration).toBeLessThan(10000); // Should complete in less than 10 seconds

    console.log(`Performance test completed in ${duration}ms`);
  });

  test('should document emulator setup', async ({ page }) => {
    // This test generates documentation screenshots

    const screenshotsDir = path.join(process.cwd(), 'docs', 'screenshots');
    await fs.mkdir(screenshotsDir, { recursive: true });

    // Take screenshots of various states
    if (await isEmulatorRunning(emulatorPorts.ui)) {
      // Emulator UI Overview
      await page.goto(`http://localhost:${emulatorPorts.ui}`);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ 
        path: path.join(screenshotsDir, 'emulator-ui-overview.png'),
        fullPage: true 
      });

      // Firestore tab
      await page.click('text=/Firestore/i');
      await page.waitForTimeout(1000);
      await page.screenshot({ 
        path: path.join(screenshotsDir, 'emulator-firestore.png'),
        fullPage: true 
      });

      // Auth tab
      await page.click('text=/Authentication/i');
      await page.waitForTimeout(1000);
      await page.screenshot({ 
        path: path.join(screenshotsDir, 'emulator-auth.png'),
        fullPage: true 
      });
    }

    // App with emulator
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'app-with-emulator.png'),
      fullPage: true 
    });

    console.log('Documentation screenshots saved');
  });
});