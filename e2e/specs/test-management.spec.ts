import { test, expect, type Page } from '@playwright/test';

// Helper to create a dynamic section with test cases
async function createDynamicSection(page: Page, sectionName: string = 'Test Section') {
  // Add a new dynamic section
  await page.click('button:has-text("Add Dynamic Section")');
  
  // Wait for the new section to appear
  await page.waitForSelector('.section');
  
  // Update section name
  const sectionNameInput = page.locator('.section-name').last();
  await sectionNameInput.fill(sectionName);
  
  // Enter some JavaScript code
  const editButton = page.locator('.edit-section-btn').last();
  await editButton.click();
  
  const codeEditor = page.locator('.CodeMirror-line').last();
  await codeEditor.click();
  await page.keyboard.type('return "Hello " + (me.getValue("name") || "World");');
  
  // Stop editing
  await page.click('button:has-text("Done Editing")');
  
  return page.locator('.section').last();
}

test.describe('Test Case Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174/');
    // Wait for app to load
    await page.waitForSelector('.app-container', { timeout: 10000 });
  });

  test('should add a test case to a dynamic section', async ({ page }) => {
    // Create a dynamic section
    const section = await createDynamicSection(page);
    
    // Expand test cases panel
    const testToggle = section.locator('.test-cases-toggle');
    await testToggle.click();
    
    // Add a test case
    await section.locator('button:has-text("+ Add Test")').click();
    
    // Verify test case was added
    const testCases = section.locator('.test-case');
    await expect(testCases).toHaveCount(2); // Default + new one
  });

  test('should edit test case properties', async ({ page }) => {
    const section = await createDynamicSection(page);
    
    // Expand test cases
    await section.locator('.test-cases-toggle').click();
    
    // Edit test case name
    const testNameInput = section.locator('.test-case-name').first();
    await testNameInput.fill('Custom Test Name');
    
    // Add a variable
    await section.locator('.add-var-btn').first().click();
    await page.keyboard.type('name'); // Variable name prompt
    await page.keyboard.press('Enter');
    
    // Set variable value
    const varValueInput = section.locator('.var-value').first();
    await varValueInput.fill('John');
    
    // Set expected output
    const expectedOutput = section.locator('.expected-output').first();
    await expectedOutput.fill('Hello John');
    
    // Select match type
    const matchTypeSelect = section.locator('.match-type-select').first();
    await matchTypeSelect.selectOption('exact');
    
    // Verify values are set
    await expect(testNameInput).toHaveValue('Custom Test Name');
    await expect(varValueInput).toHaveValue('John');
    await expect(expectedOutput).toHaveValue('Hello John');
    await expect(matchTypeSelect).toHaveValue('exact');
  });

  test('should run a single test case', async ({ page }) => {
    const section = await createDynamicSection(page);
    
    // Expand test cases
    await section.locator('.test-cases-toggle').click();
    
    // Set up test case
    await section.locator('.add-var-btn').first().click();
    await page.keyboard.type('name');
    await page.keyboard.press('Enter');
    
    const varValueInput = section.locator('.var-value').first();
    await varValueInput.fill('Alice');
    
    const expectedOutput = section.locator('.expected-output').first();
    await expectedOutput.fill('Hello Alice');
    
    // Run the test
    await section.locator('.test-case-run').first().click();
    
    // Wait for test result
    await page.waitForSelector('.test-result', { timeout: 5000 });
    
    // Verify test passed
    const testResult = section.locator('.test-result').first();
    await expect(testResult).toHaveClass(/passed/);
    await expect(testResult).toContainText('Test Passed');
  });

  test('should show failed test with error details', async ({ page }) => {
    const section = await createDynamicSection(page);
    
    // Expand test cases
    await section.locator('.test-cases-toggle').click();
    
    // Set up test case with wrong expectation
    const expectedOutput = section.locator('.expected-output').first();
    await expectedOutput.fill('Wrong Output');
    
    const matchTypeSelect = section.locator('.match-type-select').first();
    await matchTypeSelect.selectOption('exact');
    
    // Run the test
    await section.locator('.test-case-run').first().click();
    
    // Wait for test result
    await page.waitForSelector('.test-result', { timeout: 5000 });
    
    // Verify test failed
    const testResult = section.locator('.test-result').first();
    await expect(testResult).toHaveClass(/failed/);
    await expect(testResult).toContainText('Test Failed');
    await expect(testResult).toContainText('Output mismatch');
  });

  test('should duplicate a test case', async ({ page }) => {
    const section = await createDynamicSection(page);
    
    // Expand test cases
    await section.locator('.test-cases-toggle').click();
    
    // Set up original test case
    const testNameInput = section.locator('.test-case-name').first();
    await testNameInput.fill('Original Test');
    
    // Duplicate the test case
    await section.locator('.test-case-duplicate').first().click();
    
    // Verify duplicate was created
    const testCases = section.locator('.test-case');
    await expect(testCases).toHaveCount(2);
    
    // Verify duplicate has "(Copy)" suffix
    const duplicateName = section.locator('.test-case-name').nth(1);
    await expect(duplicateName).toHaveValue('Original Test (Copy)');
  });

  test('should delete a test case', async ({ page }) => {
    const section = await createDynamicSection(page);
    
    // Expand test cases and add extra test case
    await section.locator('.test-cases-toggle').click();
    await section.locator('button:has-text("+ Add Test")').click();
    
    // Verify we have 2 test cases
    let testCases = section.locator('.test-case');
    await expect(testCases).toHaveCount(2);
    
    // Delete the second test case
    await section.locator('.test-case-delete').nth(1).click();
    
    // Confirm deletion (if there's a confirmation dialog)
    page.on('dialog', dialog => dialog.accept());
    
    // Verify test case was deleted
    testCases = section.locator('.test-case');
    await expect(testCases).toHaveCount(1);
  });

  test('should edit variables as JSON', async ({ page }) => {
    const section = await createDynamicSection(page);
    
    // Expand test cases
    await section.locator('.test-cases-toggle').click();
    
    // Click JSON edit button
    await section.locator('.json-edit-btn').first().click();
    
    // Handle the prompt
    page.on('dialog', async dialog => {
      if (dialog.type() === 'prompt') {
        await dialog.accept('{"x": 10, "y": 20, "name": "Test"}');
      }
    });
    
    // Wait for variables to update
    await page.waitForTimeout(500);
    
    // Verify variables were set
    const varValues = section.locator('.var-value');
    const values = await varValues.allTextContents();
    expect(values.some(v => v.includes('10') || v.includes('20') || v.includes('Test'))).toBeTruthy();
  });

  test('should run all tests for a section', async ({ page }) => {
    const section = await createDynamicSection(page);
    
    // Expand test cases
    await section.locator('.test-cases-toggle').click();
    
    // Add multiple test cases
    await section.locator('button:has-text("+ Add Test")').click();
    await section.locator('button:has-text("+ Add Test")').click();
    
    // Set up expectations for each test
    const expectedOutputs = section.locator('.expected-output');
    await expectedOutputs.nth(0).fill('Hello World');
    await expectedOutputs.nth(1).fill('Hello');
    await expectedOutputs.nth(2).fill('World');
    
    // Set match types
    const matchSelects = section.locator('.match-type-select');
    await matchSelects.nth(0).selectOption('exact');
    await matchSelects.nth(1).selectOption('contains');
    await matchSelects.nth(2).selectOption('contains');
    
    // Run all tests for the section
    await section.locator('button:has-text("Run All")').click();
    
    // Wait for results
    await page.waitForTimeout(1000);
    
    // Verify results are displayed
    const testResults = section.locator('.test-result');
    await expect(testResults).toHaveCount(3);
  });

  test('should show test coverage metrics', async ({ page }) => {
    // Create multiple sections
    await createDynamicSection(page, 'Section 1');
    await createDynamicSection(page, 'Section 2');
    
    // Add test cases to first section only
    const firstSection = page.locator('.section').first();
    await firstSection.locator('.test-cases-toggle').click();
    await firstSection.locator('.expected-output').first().fill('Test output');
    
    // Look for coverage metrics (if displayed)
    const coverageMetrics = page.locator('.coverage-metrics');
    if (await coverageMetrics.isVisible()) {
      await expect(coverageMetrics).toContainText('Test Coverage');
      await expect(coverageMetrics).toContainText('Sections with tests');
    }
  });

  test('should handle different match types correctly', async ({ page }) => {
    const section = await createDynamicSection(page);
    
    // Expand test cases
    await section.locator('.test-cases-toggle').click();
    
    // Add three test cases for different match types
    await section.locator('button:has-text("+ Add Test")').click();
    await section.locator('button:has-text("+ Add Test")').click();
    
    // Test 1: Exact match
    const test1 = section.locator('.test-case').nth(0);
    await test1.locator('.expected-output').fill('Hello World');
    await test1.locator('.match-type-select').selectOption('exact');
    
    // Test 2: Contains match
    const test2 = section.locator('.test-case').nth(1);
    await test2.locator('.expected-output').fill('Hello');
    await test2.locator('.match-type-select').selectOption('contains');
    
    // Test 3: Regex match
    const test3 = section.locator('.test-case').nth(2);
    await test3.locator('.expected-output').fill('Hello.*');
    await test3.locator('.match-type-select').selectOption('regex');
    
    // Run all tests
    await section.locator('button:has-text("Run All")').click();
    
    // Wait for results
    await page.waitForTimeout(1000);
    
    // Verify all tests based on match type
    const results = section.locator('.test-result');
    
    // First test should pass with exact match
    await expect(results.nth(0)).toHaveClass(/passed/);
    
    // Second test should pass with contains
    await expect(results.nth(1)).toHaveClass(/passed/);
    
    // Third test should pass with regex
    await expect(results.nth(2)).toHaveClass(/passed/);
  });

  test('should handle test execution errors gracefully', async ({ page }) => {
    // Create section with invalid code
    await page.click('button:has-text("Add Dynamic Section")');
    await page.waitForSelector('.section');
    
    const section = page.locator('.section').last();
    const editButton = section.locator('.edit-section-btn');
    await editButton.click();
    
    // Enter code that will cause an error
    const codeEditor = page.locator('.CodeMirror-line').last();
    await codeEditor.click();
    await page.keyboard.type('throw new Error("Test error");');
    
    await page.click('button:has-text("Done Editing")');
    
    // Expand test cases and run test
    await section.locator('.test-cases-toggle').click();
    await section.locator('.test-case-run').first().click();
    
    // Wait for error result
    await page.waitForSelector('.test-result', { timeout: 5000 });
    
    // Verify error is displayed
    const testResult = section.locator('.test-result').first();
    await expect(testResult).toHaveClass(/failed/);
    await expect(testResult).toContainText('Error');
  });

  test('should maintain test state when toggling panels', async ({ page }) => {
    const section = await createDynamicSection(page);
    
    // Expand test cases and set up a test
    await section.locator('.test-cases-toggle').click();
    
    const testNameInput = section.locator('.test-case-name').first();
    await testNameInput.fill('Persistent Test');
    
    const expectedOutput = section.locator('.expected-output').first();
    await expectedOutput.fill('Test Output');
    
    // Collapse test cases
    await section.locator('.test-cases-toggle').click();
    await expect(section.locator('.test-case-list')).not.toBeVisible();
    
    // Expand again
    await section.locator('.test-cases-toggle').click();
    
    // Verify data persisted
    await expect(testNameInput).toHaveValue('Persistent Test');
    await expect(expectedOutput).toHaveValue('Test Output');
  });

  test('should show test count in header', async ({ page }) => {
    const section = await createDynamicSection(page);
    
    // Check initial test count
    const testToggle = section.locator('.test-cases-toggle');
    await expect(testToggle).toContainText('Test Cases (1)');
    
    // Expand and add more tests
    await testToggle.click();
    await section.locator('button:has-text("+ Add Test")').click();
    await section.locator('button:has-text("+ Add Test")').click();
    
    // Verify count updated
    await expect(testToggle).toContainText('Test Cases (3)');
  });

  test('should handle complex variable types', async ({ page }) => {
    const section = await createDynamicSection(page);
    
    // Expand test cases
    await section.locator('.test-cases-toggle').click();
    
    // Add multiple variables
    const testCase = section.locator('.test-case').first();
    
    // Add string variable
    await testCase.locator('.add-var-btn').click();
    await page.keyboard.type('str');
    await page.keyboard.press('Enter');
    const strInput = testCase.locator('.var-value').nth(0);
    await strInput.fill('text value');
    
    // Add number variable
    await testCase.locator('.add-var-btn').click();
    await page.keyboard.type('num');
    await page.keyboard.press('Enter');
    const numInput = testCase.locator('.var-value').nth(1);
    await numInput.fill('42');
    
    // Add boolean-like variable
    await testCase.locator('.add-var-btn').click();
    await page.keyboard.type('bool');
    await page.keyboard.press('Enter');
    const boolInput = testCase.locator('.var-value').nth(2);
    await boolInput.fill('true');
    
    // Verify all variables are present
    const varRows = testCase.locator('.variable-row');
    await expect(varRows).toHaveCount(3);
  });

  test('should support drag-and-drop reordering of test cases', async ({ page }) => {
    const section = await createDynamicSection(page);
    
    // Expand test cases
    await section.locator('.test-cases-toggle').click();
    
    // Add multiple test cases with unique names
    await section.locator('button:has-text("+ Add Test")').click();
    await section.locator('button:has-text("+ Add Test")').click();
    await section.locator('button:has-text("+ Add Test")').click();
    
    // Name the test cases uniquely
    const testNames = ['First Test', 'Second Test', 'Third Test', 'Fourth Test'];
    for (let i = 0; i < 4; i++) {
      const nameInput = section.locator('.test-case-name').nth(i);
      await nameInput.fill(testNames[i]);
    }
    
    // Verify initial order
    for (let i = 0; i < 4; i++) {
      const nameInput = section.locator('.test-case-name').nth(i);
      await expect(nameInput).toHaveValue(testNames[i]);
    }
    
    // Perform drag and drop: move Second Test (index 1) to position 3
    const secondTest = section.locator('.test-case').nth(1);
    const fourthTest = section.locator('.test-case').nth(3);
    
    // Get the drag handle for the second test
    const dragHandle = secondTest.locator('.drag-handle');
    
    // Perform the drag operation
    await dragHandle.hover();
    await page.mouse.down();
    await fourthTest.hover();
    await page.mouse.up();
    
    // Wait for reordering to complete
    await page.waitForTimeout(500);
    
    // Verify new order: First, Third, Fourth, Second
    const expectedOrder = ['First Test', 'Third Test', 'Fourth Test', 'Second Test'];
    for (let i = 0; i < 4; i++) {
      const nameInput = section.locator('.test-case-name').nth(i);
      await expect(nameInput).toHaveValue(expectedOrder[i]);
    }
  });

  test('should show visual feedback during drag operation', async ({ page }) => {
    const section = await createDynamicSection(page);
    
    // Expand test cases and add multiple tests
    await section.locator('.test-cases-toggle').click();
    await section.locator('button:has-text("+ Add Test")').click();
    await section.locator('button:has-text("+ Add Test")').click();
    
    // Start drag operation
    const firstTest = section.locator('.test-case').first();
    const dragHandle = firstTest.locator('.drag-handle');
    
    await dragHandle.hover();
    await page.mouse.down();
    
    // Check for dragging class
    await expect(firstTest).toHaveClass(/dragging/);
    
    // Move to another test case
    const thirdTest = section.locator('.test-case').nth(2);
    await thirdTest.hover();
    
    // Check for drag-over class
    await expect(thirdTest).toHaveClass(/drag-over/);
    
    // Complete the drag
    await page.mouse.up();
    
    // Verify classes are removed
    await expect(firstTest).not.toHaveClass(/dragging/);
    await expect(thirdTest).not.toHaveClass(/drag-over/);
  });
});