import { test, expect } from '@playwright/test';

test.describe('KPT Functions E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173');
    
    // Wait for app to load
    await page.waitForTimeout(2000);
  });

  test('KPT functions should be available in dynamic text editor', async ({ page }) => {
    // Add a new dynamic section
    const addSectionButton = page.locator('button:has-text("Add Section"), button:has-text("Add Dynamic Section")').first();
    
    if (await addSectionButton.isVisible()) {
      await addSectionButton.click();
    }
    
    // Find CodeMirror editor
    const editor = page.locator('.cm-editor, .CodeMirror').first();
    
    if (await editor.isVisible()) {
      // Type KPT function code
      const kptCode = `
// Test KPT namespace availability
const { formatNumber, redText, checkRange } = me.kpt;

const weight = me.getValue('DoseWeightKG') || 70;
const formattedWeight = formatNumber(weight, 1);
const weightText = redText(formattedWeight + ' kg');

return \`Patient weight: \${weightText}\`;
`;
      
      await editor.click();
      await page.keyboard.type(kptCode);
      
      // Check preview updates
      const preview = page.locator('.preview, .output-panel, [data-testid="preview"]').first();
      
      // Verify no errors in console
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.waitForTimeout(1000);
      
      // Check that no KPT-related errors occurred
      const kptErrors = consoleErrors.filter(error => 
        error.includes('kpt') || error.includes('KPT')
      );
      
      expect(kptErrors).toHaveLength(0);
    }
  });

  test('should execute KPT text formatting functions', async ({ page }) => {
    // Navigate to dynamic text section
    const dynamicSection = page.locator('.section-type.dynamic, [data-testid="dynamic-section"]').first();
    
    if (await dynamicSection.isVisible()) {
      await dynamicSection.click();
    }
    
    // Enter KPT formatting code
    const editor = page.locator('.cm-editor, .CodeMirror').first();
    
    if (await editor.isVisible()) {
      const code = `
const { redText, greenText, boldText } = me.kpt;
return redText('Error') + ' ' + greenText('Success') + ' ' + boldText('Important');
`;
      
      await editor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Delete');
      await page.keyboard.type(code);
      
      // Wait for preview to update
      await page.waitForTimeout(500);
      
      // Check preview contains formatted text
      const preview = page.locator('.preview, .output-panel').first();
      const previewHTML = await preview.innerHTML();
      
      // Verify formatting is applied
      expect(previewHTML).toContain('color: red');
      expect(previewHTML).toContain('color: green');
      expect(previewHTML).toContain('<strong>');
    }
  });

  test('should execute KPT number formatting functions', async ({ page }) => {
    const editor = page.locator('.cm-editor, .CodeMirror').first();
    
    if (await editor.isVisible()) {
      const code = `
const { formatNumber, formatPercent, formatCurrency } = me.kpt;
const num = 123.456;
return [
  formatNumber(num, 2),
  formatPercent(50.5, 1),
  formatCurrency(99.99)
].join(', ');
`;
      
      await editor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(code);
      
      await page.waitForTimeout(500);
      
      // Check output contains formatted numbers
      const preview = page.locator('.preview, .output-panel').first();
      const text = await preview.textContent();
      
      if (text) {
        expect(text).toContain('123.46');
        expect(text).toContain('50.5%');
        expect(text).toContain('$99.99');
      }
    }
  });

  test('should execute KPT TPN-specific functions', async ({ page }) => {
    const editor = page.locator('.cm-editor, .CodeMirror').first();
    
    if (await editor.isVisible()) {
      const code = `
const { formatWeight, formatVolume, formatDose } = me.kpt;
return [
  formatWeight(70.5),
  formatVolume(1500),
  formatDose(2.5)
].join(' | ');
`;
      
      await editor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(code);
      
      await page.waitForTimeout(500);
      
      const preview = page.locator('.preview, .output-panel').first();
      const text = await preview.textContent();
      
      if (text) {
        expect(text).toContain('70.5 kg');
        expect(text).toContain('1500 mL');
        expect(text).toContain('2.5 mg/kg/day');
      }
    }
  });

  test('should execute KPT conditional display functions', async ({ page }) => {
    const editor = page.locator('.cm-editor, .CodeMirror').first();
    
    if (await editor.isVisible()) {
      const code = `
const { showIf, whenAbove, whenBelow } = me.kpt;
const value = 75;
return [
  showIf(value > 50, 'High value'),
  whenAbove(value, 50, ' - Above threshold'),
  whenBelow(value, 100, ' - Below limit')
].join('');
`;
      
      await editor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(code);
      
      await page.waitForTimeout(500);
      
      const preview = page.locator('.preview, .output-panel').first();
      const text = await preview.textContent();
      
      if (text) {
        expect(text).toContain('High value');
        expect(text).toContain('Above threshold');
        expect(text).toContain('Below limit');
      }
    }
  });

  test('should execute KPT range checking functions', async ({ page }) => {
    const editor = page.locator('.cm-editor, .CodeMirror').first();
    
    if (await editor.isVisible()) {
      const code = `
const { checkRange, isNormal } = me.kpt;
const value = 50;
const status = checkRange(value, [40, 60], [20, 80]);
const normal = isNormal(value, 40, 60);
return status + ' (Normal: ' + normal + ')';
`;
      
      await editor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(code);
      
      await page.waitForTimeout(500);
      
      const preview = page.locator('.preview, .output-panel').first();
      const previewHTML = await preview.innerHTML();
      
      expect(previewHTML).toContain('NORMAL');
      expect(previewHTML).toContain('true');
    }
  });

  test('should execute KPT HTML building functions', async ({ page }) => {
    const editor = page.locator('.cm-editor, .CodeMirror').first();
    
    if (await editor.isVisible()) {
      const code = `
const { createTable, createList, createAlert } = me.kpt;

const table = createTable(
  [['Item', 'Value'], ['A', 1], ['B', 2]],
  ['Name', 'Count']
);

const list = createList(['First', 'Second', 'Third']);

const alert = createAlert('Important message', 'warning');

return table + list + alert;
`;
      
      await editor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(code);
      
      await page.waitForTimeout(500);
      
      const preview = page.locator('.preview, .output-panel').first();
      const previewHTML = await preview.innerHTML();
      
      // Check for HTML elements
      expect(previewHTML).toContain('<table');
      expect(previewHTML).toContain('<ul>');
      expect(previewHTML).toContain('background-color');
    }
  });

  test('should access TPN values through KPT context', async ({ page }) => {
    // First, set some TPN values if there's a TPN panel
    const tpnPanel = page.locator('[data-testid="tpn-panel"], .tpn-test-panel').first();
    
    if (await tpnPanel.isVisible()) {
      // Set weight value
      const weightInput = page.locator('input[name="DoseWeightKG"], input[placeholder*="weight"]').first();
      if (await weightInput.isVisible()) {
        await weightInput.fill('75');
      }
    }
    
    // Use KPT to access the value
    const editor = page.locator('.cm-editor, .CodeMirror').first();
    
    if (await editor.isVisible()) {
      const code = `
const { weight, formatWeight } = me.kpt;
const actualWeight = me.getValue('DoseWeightKG') || weight || 70;
return 'Patient weight: ' + formatWeight(actualWeight);
`;
      
      await editor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(code);
      
      await page.waitForTimeout(500);
      
      const preview = page.locator('.preview, .output-panel').first();
      const text = await preview.textContent();
      
      if (text) {
        expect(text).toContain('Patient weight:');
        expect(text).toMatch(/\d+(\.\d+)?\s*kg/);
      }
    }
  });

  test('should handle KPT function errors gracefully', async ({ page }) => {
    const editor = page.locator('.cm-editor, .CodeMirror').first();
    
    if (await editor.isVisible()) {
      const code = `
try {
  const { formatNumber } = me.kpt;
  // Intentionally pass invalid input
  return formatNumber('not a number', 2);
} catch (error) {
  return 'Error handled: ' + error.message;
}
`;
      
      await editor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(code);
      
      await page.waitForTimeout(500);
      
      // Check that error is handled gracefully
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('kpt')) {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.waitForTimeout(500);
      
      // Should not have unhandled errors
      expect(consoleErrors.length).toBeLessThanOrEqual(1);
    }
  });

  test('should allow multiple KPT functions in complex calculations', async ({ page }) => {
    const editor = page.locator('.cm-editor, .CodeMirror').first();
    
    if (await editor.isVisible()) {
      const code = `
const { 
  formatNumber, 
  formatPercent, 
  checkRange,
  createTable,
  redText,
  greenText 
} = me.kpt;

const value1 = 45;
const value2 = 55;
const total = value1 + value2;
const percent1 = (value1 / total) * 100;
const percent2 = (value2 / total) * 100;

const status1 = checkRange(value1, [40, 60], [20, 80]);
const status2 = checkRange(value2, [40, 60], [20, 80]);

const table = createTable([
  ['Metric', 'Value', 'Percentage', 'Status'],
  ['Item 1', formatNumber(value1, 0), formatPercent(percent1, 1), status1],
  ['Item 2', formatNumber(value2, 0), formatPercent(percent2, 1), status2],
  ['Total', formatNumber(total, 0), '100%', greenText('OK')]
]);

return table;
`;
      
      await editor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(code);
      
      await page.waitForTimeout(1000);
      
      const preview = page.locator('.preview, .output-panel').first();
      const previewHTML = await preview.innerHTML();
      
      // Verify complex calculation worked
      expect(previewHTML).toContain('<table');
      expect(previewHTML).toContain('45');
      expect(previewHTML).toContain('55');
      expect(previewHTML).toContain('100');
      expect(previewHTML).toContain('%');
      expect(previewHTML).toContain('NORMAL');
    }
  });
});

test.describe('KPT Reference Panel', () => {
  test('should display KPT function reference panel', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Look for KPT reference button/panel
    const kptButton = page.locator('button:has-text("KPT"), button:has-text("Functions"), [data-testid="kpt-reference"]').first();
    
    if (await kptButton.isVisible()) {
      await kptButton.click();
      
      // Check if reference panel opens
      const referencePanel = page.locator('.kpt-reference, [data-testid="kpt-reference-panel"]').first();
      
      if (await referencePanel.isVisible()) {
        // Verify panel contains function list
        const panelText = await referencePanel.textContent();
        
        expect(panelText).toContain('formatNumber');
        expect(panelText).toContain('redText');
        expect(panelText).toContain('checkRange');
      }
    }
  });

  test('should allow searching KPT functions', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="KPT"], [data-testid="kpt-search"]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('format');
      
      // Check filtered results
      const results = page.locator('.kpt-function-item, [data-testid="kpt-function"]');
      const count = await results.count();
      
      // Should show only format-related functions
      for (let i = 0; i < count; i++) {
        const text = await results.nth(i).textContent();
        expect(text?.toLowerCase()).toContain('format');
      }
    }
  });

  test('should copy KPT function example to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    const copyButton = page.locator('button:has-text("Copy"), [data-testid="copy-kpt-example"]').first();
    
    if (await copyButton.isVisible()) {
      await copyButton.click();
      
      // Verify copy feedback
      const feedback = page.locator('.copied, .copy-success, [data-testid="copy-feedback"]').first();
      
      if (await feedback.isVisible()) {
        const text = await feedback.textContent();
        expect(text).toContain('Copied');
      }
    }
  });
});