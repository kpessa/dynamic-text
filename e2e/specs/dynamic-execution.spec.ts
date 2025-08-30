import { test, expect } from '@playwright/test';

test.describe('Dynamic Text Execution', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForSelector('.editor-workspace', { timeout: 10000 });
  });

  test('should create and execute a dynamic section with TPN context', async ({ page }) => {
    // Add a new dynamic section
    await page.click('button:has-text("Add Dynamic Section")');
    
    // Wait for the dynamic section to be created
    await page.waitForSelector('.section-card.dynamic');
    
    // Find the code editor for the dynamic section
    const codeEditor = page.locator('.section-card.dynamic .code-editor').first();
    
    // Enter JavaScript code that uses the TPN context
    const dynamicCode = `
      var weight = me.getValue('DoseWeightKG') || 70;
      var bmi = me.medical.bmi(weight, 170);
      return '<p>Weight: ' + weight + ' kg</p>' +
             '<p>BMI: ' + me.round(bmi, 1) + '</p>';
    `;
    
    // Clear existing content and type new code
    await codeEditor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type(dynamicCode);
    
    // Wait for preview to update
    await page.waitForTimeout(500);
    
    // Check that the preview shows the executed result
    const preview = page.locator('.preview-html');
    await expect(preview).toContainText('Weight:');
    await expect(preview).toContainText('BMI:');
  });

  test('should handle TPN value access correctly', async ({ page }) => {
    // Add a dynamic section
    await page.click('button:has-text("Add Dynamic Section")');
    await page.waitForSelector('.section-card.dynamic');
    
    // Enter code that accesses TPN values
    const codeEditor = page.locator('.section-card.dynamic .code-editor').first();
    await codeEditor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('return "Calcium: " + me.getValue("Calcium") + " mEq";');
    
    // Enter a value in the ingredient quick input (if available)
    const calciumInput = page.locator('input[placeholder*="Calcium"]');
    if (await calciumInput.count() > 0) {
      await calciumInput.fill('2.5');
      await page.keyboard.press('Enter');
    }
    
    // Check preview
    await page.waitForTimeout(500);
    const preview = page.locator('.preview-html');
    await expect(preview).toContainText('Calcium:');
  });

  test('should display error messages for invalid JavaScript', async ({ page }) => {
    // Add a dynamic section
    await page.click('button:has-text("Add Dynamic Section")');
    await page.waitForSelector('.section-card.dynamic');
    
    // Enter invalid JavaScript code
    const codeEditor = page.locator('.section-card.dynamic .code-editor').first();
    await codeEditor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('throw new Error("Test error")');
    
    // Wait for error to appear in preview
    await page.waitForTimeout(500);
    const preview = page.locator('.preview-html');
    
    // Should show error in red
    const errorSpan = preview.locator('span[style*="color: red"]');
    await expect(errorSpan).toBeVisible();
    await expect(errorSpan).toContainText('Error');
  });

  test('should handle multiple dynamic sections', async ({ page }) => {
    // Add first dynamic section
    await page.click('button:has-text("Add Dynamic Section")');
    await page.waitForSelector('.section-card.dynamic');
    
    const firstEditor = page.locator('.section-card.dynamic .code-editor').first();
    await firstEditor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('return "<h2>Section 1</h2>";');
    
    // Add second dynamic section
    await page.click('button:has-text("Add Dynamic Section")');
    await page.waitForSelector('.section-card.dynamic:nth-of-type(2)');
    
    const secondEditor = page.locator('.section-card.dynamic:nth-of-type(2) .code-editor').first();
    await secondEditor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('return "<h2>Section 2</h2>";');
    
    // Check that both sections are rendered in preview
    await page.waitForTimeout(500);
    const preview = page.locator('.preview-html');
    await expect(preview).toContainText('Section 1');
    await expect(preview).toContainText('Section 2');
  });

  test('should use helper functions correctly', async ({ page }) => {
    // Add a dynamic section
    await page.click('button:has-text("Add Dynamic Section")');
    await page.waitForSelector('.section-card.dynamic');
    
    // Use various helper functions
    const codeEditor = page.locator('.section-card.dynamic .code-editor').first();
    await codeEditor.click();
    await page.keyboard.press('Control+A');
    
    const helperCode = `
      var result = [];
      result.push("Rounded: " + me.round(3.14159, 2));
      result.push("MaxP: " + me.maxP(3.14159, 3));
      result.push("Percentage: " + me.percentage(25, 100) + "%");
      result.push("mg to g: " + me.convertUnits.mgToG(1500) + "g");
      return result.join("<br>");
    `;
    
    await page.keyboard.type(helperCode);
    
    // Check preview contains expected results
    await page.waitForTimeout(500);
    const preview = page.locator('.preview-html');
    await expect(preview).toContainText('Rounded: 3.14');
    await expect(preview).toContainText('MaxP: 3.142');
    await expect(preview).toContainText('Percentage: 25%');
    await expect(preview).toContainText('mg to g: 1.5g');
  });

  test('should update preview in real-time when code changes', async ({ page }) => {
    // Add a dynamic section
    await page.click('button:has-text("Add Dynamic Section")');
    await page.waitForSelector('.section-card.dynamic');
    
    const codeEditor = page.locator('.section-card.dynamic .code-editor').first();
    
    // Type initial code
    await codeEditor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('return "Initial text";');
    
    // Check initial preview
    await page.waitForTimeout(500);
    let preview = page.locator('.preview-html');
    await expect(preview).toContainText('Initial text');
    
    // Update the code
    await codeEditor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('return "Updated text";');
    
    // Check updated preview
    await page.waitForTimeout(500);
    preview = page.locator('.preview-html');
    await expect(preview).toContainText('Updated text');
    await expect(preview).not.toContainText('Initial text');
  });

  test('should handle test cases for dynamic sections', async ({ page }) => {
    // Add a dynamic section
    await page.click('button:has-text("Add Dynamic Section")');
    await page.waitForSelector('.section-card.dynamic');
    
    // Write code that uses test variables
    const codeEditor = page.locator('.section-card.dynamic .code-editor').first();
    await codeEditor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('return "Value: " + (me.getValue("testVar") || 0);');
    
    // Add a test case (if UI supports it)
    const addTestButton = page.locator('button:has-text("Add Test Case")');
    if (await addTestButton.count() > 0) {
      await addTestButton.click();
      
      // Fill in test case variables
      const testVarInput = page.locator('input[placeholder*="testVar"]').first();
      if (await testVarInput.count() > 0) {
        await testVarInput.fill('42');
      }
      
      // Activate test case
      const activateButton = page.locator('button:has-text("Run Test")');
      if (await activateButton.count() > 0) {
        await activateButton.click();
      }
      
      // Check preview shows test value
      await page.waitForTimeout(500);
      const preview = page.locator('.preview-html');
      await expect(preview).toContainText('Value: 42');
    }
  });

  test('should maintain sandbox security', async ({ page }) => {
    // Add a dynamic section
    await page.click('button:has-text("Add Dynamic Section")');
    await page.waitForSelector('.section-card.dynamic');
    
    // Try to access forbidden objects (should fail)
    const codeEditor = page.locator('.section-card.dynamic .code-editor').first();
    await codeEditor.click();
    await page.keyboard.press('Control+A');
    
    // This should fail or return undefined/error
    await page.keyboard.type('return typeof window;');
    
    await page.waitForTimeout(500);
    const preview = page.locator('.preview-html');
    
    // Should either show "undefined" or an error
    const previewText = await preview.textContent();
    expect(previewText).toMatch(/undefined|Error/i);
  });

  test('should export sections with dynamic content markers', async ({ page }) => {
    // Add a dynamic section
    await page.click('button:has-text("Add Dynamic Section")');
    await page.waitForSelector('.section-card.dynamic');
    
    // Enter some dynamic code
    const codeEditor = page.locator('.section-card.dynamic .code-editor').first();
    await codeEditor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('return me.getValue("test");');
    
    // Switch to JSON output view
    const jsonTab = page.locator('button:has-text("JSON Output")');
    if (await jsonTab.count() > 0) {
      await jsonTab.click();
      
      // Check that JSON contains [f( ... )] markers
      const jsonOutput = page.locator('.json-output pre');
      const jsonText = await jsonOutput.textContent();
      
      expect(jsonText).toContain('[f(');
      expect(jsonText).toContain(')]');
    }
  });

  test('should handle performance with complex calculations', async ({ page }) => {
    // Add a dynamic section
    await page.click('button:has-text("Add Dynamic Section")');
    await page.waitForSelector('.section-card.dynamic');
    
    // Enter complex calculation code
    const codeEditor = page.locator('.section-card.dynamic .code-editor').first();
    await codeEditor.click();
    await page.keyboard.press('Control+A');
    
    const complexCode = `
      var results = [];
      for (var i = 0; i < 100; i++) {
        var weight = 70 + i;
        var bmi = me.medical.bmi(weight, 170);
        var bsa = me.medical.bsa(weight, 170);
        results.push(i + ": BMI=" + me.round(bmi, 1) + ", BSA=" + me.round(bsa, 2));
      }
      return results.slice(0, 5).join("<br>");
    `;
    
    await page.keyboard.type(complexCode);
    
    // Should execute within reasonable time (< 2 seconds)
    const startTime = Date.now();
    await page.waitForTimeout(500);
    
    const preview = page.locator('.preview-html');
    await expect(preview).toContainText('BMI=');
    
    const executionTime = Date.now() - startTime;
    expect(executionTime).toBeLessThan(2000);
  });
});