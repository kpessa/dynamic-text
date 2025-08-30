import { test, expect } from '@playwright/test';

test.describe('AI Test Generation', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to the app
		await page.goto('/');
		
		// Wait for the app to load
		await page.waitForSelector('.app-container');
	});

	test('should display Generate Tests button for dynamic sections', async ({ page }) => {
		// Add a dynamic section
		await page.click('button:has-text("+ JavaScript")');
		
		// Wait for the section to be added
		await page.waitForSelector('.section.dynamic');
		
		// Check if the Generate Tests button is visible
		const generateButton = page.locator('button:has-text("🤖 Generate Tests")');
		await expect(generateButton).toBeVisible();
	});

	test('should open AI test generator modal when Generate Tests is clicked', async ({ page }) => {
		// Add a dynamic section
		await page.click('button:has-text("+ JavaScript")');
		await page.waitForSelector('.section.dynamic');
		
		// Enter some code in the dynamic section
		const codeEditor = page.locator('.section.dynamic .CodeMirror');
		await codeEditor.click();
		await page.keyboard.type('return me.getValue("weight") * 2;');
		
		// Click Generate Tests button
		await page.click('button:has-text("🤖 Generate Tests")');
		
		// Wait for the modal to appear
		await page.waitForSelector('.ai-generator-modal');
		
		// Verify modal content
		await expect(page.locator('text=Generate test cases automatically')).toBeVisible();
		await expect(page.locator('button:has-text("Generate Tests")')).toBeVisible();
		await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
	});

	test('should handle API call and display generated tests', async ({ page }) => {
		// Mock the API response
		await page.route('**/api/generate-tests', async route => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					success: true,
					tests: {
						basicFunctionality: [
							{
								name: 'Weight Calculation Test',
								variables: { weight: 70 },
								expectedOutput: '140',
								description: 'Tests weight doubling calculation'
							},
							{
								name: 'Zero Weight Test',
								variables: { weight: 0 },
								expectedOutput: '0',
								description: 'Tests edge case with zero weight'
							}
						]
					}
				})
			});
		});
		
		// Add a dynamic section
		await page.click('button:has-text("+ JavaScript")');
		await page.waitForSelector('.section.dynamic');
		
		// Open AI test generator
		await page.click('button:has-text("🤖 Generate Tests")');
		await page.waitForSelector('.ai-generator-modal');
		
		// Click Generate Tests in the modal
		await page.click('.ai-generator-modal button:has-text("Generate Tests")');
		
		// Wait for tests to be displayed
		await page.waitForSelector('text=Generated Test Cases');
		
		// Verify generated tests are displayed
		await expect(page.locator('text=Weight Calculation Test')).toBeVisible();
		await expect(page.locator('text=Zero Weight Test')).toBeVisible();
		
		// Verify checkboxes are present and checked by default
		const checkboxes = page.locator('.ai-generator-modal input[type="checkbox"]');
		await expect(checkboxes).toHaveCount(2);
		
		// Check that all are selected by default
		for (let i = 0; i < 2; i++) {
			await expect(checkboxes.nth(i)).toBeChecked();
		}
		
		// Verify Import button shows correct count
		await expect(page.locator('button:has-text("Import Selected (2)")')).toBeVisible();
	});

	test('should handle test selection and import', async ({ page }) => {
		// Mock the API response
		await page.route('**/api/generate-tests', async route => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					success: true,
					tests: {
						basicFunctionality: [
							{
								name: 'Test 1',
								variables: { x: 5 },
								expectedOutput: '10'
							},
							{
								name: 'Test 2',
								variables: { x: 10 },
								expectedOutput: '20'
							}
						]
					}
				})
			});
		});
		
		// Add a dynamic section
		await page.click('button:has-text("+ JavaScript")');
		await page.waitForSelector('.section.dynamic');
		
		// Open AI test generator and generate tests
		await page.click('button:has-text("🤖 Generate Tests")');
		await page.click('.ai-generator-modal button:has-text("Generate Tests")');
		await page.waitForSelector('text=Generated Test Cases');
		
		// Deselect one test
		const firstCheckbox = page.locator('.ai-generator-modal input[type="checkbox"]').first();
		await firstCheckbox.uncheck();
		
		// Verify Import button shows updated count
		await expect(page.locator('button:has-text("Import Selected (1)")')).toBeVisible();
		
		// Import selected tests
		await page.click('button:has-text("Import Selected (1)")');
		
		// Verify modal closes
		await expect(page.locator('.ai-generator-modal')).not.toBeVisible();
		
		// Verify test was added to the section
		await page.click('button:has-text("Show Tests")');
		await expect(page.locator('.test-case').filter({ hasText: 'Test 2' })).toBeVisible();
	});

	test('should handle Select All and Deselect All functionality', async ({ page }) => {
		// Mock the API response
		await page.route('**/api/generate-tests', async route => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					success: true,
					tests: {
						basicFunctionality: [
							{ name: 'Test 1', variables: {}, expectedOutput: 'output1' },
							{ name: 'Test 2', variables: {}, expectedOutput: 'output2' },
							{ name: 'Test 3', variables: {}, expectedOutput: 'output3' }
						]
					}
				})
			});
		});
		
		// Add dynamic section and generate tests
		await page.click('button:has-text("+ JavaScript")');
		await page.click('button:has-text("🤖 Generate Tests")');
		await page.click('.ai-generator-modal button:has-text("Generate Tests")');
		await page.waitForSelector('text=Generated Test Cases');
		
		// Click Deselect All
		await page.click('button:has-text("Deselect All")');
		
		// Verify all checkboxes are unchecked
		const checkboxes = page.locator('.ai-generator-modal input[type="checkbox"]');
		for (let i = 0; i < 3; i++) {
			await expect(checkboxes.nth(i)).not.toBeChecked();
		}
		
		// Verify Import button is disabled
		const importButton = page.locator('button:has-text("Import Selected")');
		await expect(importButton).toBeDisabled();
		
		// Click Select All
		await page.click('button:has-text("Select All")');
		
		// Verify all checkboxes are checked
		for (let i = 0; i < 3; i++) {
			await expect(checkboxes.nth(i)).toBeChecked();
		}
		
		// Verify Import button shows correct count
		await expect(page.locator('button:has-text("Import Selected (3)")')).toBeVisible();
	});

	test('should display error message when API fails', async ({ page }) => {
		// Mock API error response
		await page.route('**/api/generate-tests', async route => {
			await route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({
					error: 'AI service not configured',
					details: 'GEMINI_API_KEY environment variable is missing'
				})
			});
		});
		
		// Add dynamic section and try to generate tests
		await page.click('button:has-text("+ JavaScript")');
		await page.click('button:has-text("🤖 Generate Tests")');
		await page.click('.ai-generator-modal button:has-text("Generate Tests")');
		
		// Wait for error message
		await page.waitForSelector('text=AI service not configured');
		
		// Verify error is displayed in the modal
		await expect(page.locator('.alert.variant-filled-error')).toBeVisible();
		await expect(page.locator('text=AI service not configured')).toBeVisible();
	});

	test('should show loading state during test generation', async ({ page }) => {
		// Mock slow API response
		await page.route('**/api/generate-tests', async route => {
			await page.waitForTimeout(2000); // Simulate slow response
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					success: true,
					tests: { basicFunctionality: [] }
				})
			});
		});
		
		// Add dynamic section and start generating tests
		await page.click('button:has-text("+ JavaScript")');
		await page.click('button:has-text("🤖 Generate Tests")');
		await page.click('.ai-generator-modal button:has-text("Generate Tests")');
		
		// Verify loading state is shown
		await expect(page.locator('text=Generating...')).toBeVisible();
		await expect(page.locator('.ai-generator-modal .spinner')).toBeVisible();
		
		// Wait for generation to complete
		await page.waitForSelector('text=Generated Test Cases', { timeout: 5000 });
	});

	test('should handle network failure with retry', async ({ page }) => {
		let requestCount = 0;
		
		// Mock API to fail twice then succeed
		await page.route('**/api/generate-tests', async route => {
			requestCount++;
			if (requestCount < 3) {
				await route.abort('failed');
			} else {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						success: true,
						tests: {
							basicFunctionality: [
								{ name: 'Retry Test', variables: {}, expectedOutput: 'success' }
							]
						}
					})
				});
			}
		});
		
		// Add dynamic section and generate tests
		await page.click('button:has-text("+ JavaScript")');
		await page.click('button:has-text("🤖 Generate Tests")');
		await page.click('.ai-generator-modal button:has-text("Generate Tests")');
		
		// Wait for successful generation after retries
		await page.waitForSelector('text=Retry Test', { timeout: 10000 });
		
		// Verify test was generated successfully
		await expect(page.locator('text=Retry Test')).toBeVisible();
	});

	test('should cancel test generation modal', async ({ page }) => {
		// Add dynamic section
		await page.click('button:has-text("+ JavaScript")');
		await page.waitForSelector('.section.dynamic');
		
		// Open AI test generator
		await page.click('button:has-text("🤖 Generate Tests")');
		await page.waitForSelector('.ai-generator-modal');
		
		// Click Cancel button
		await page.click('.ai-generator-modal button:has-text("Cancel")');
		
		// Verify modal is closed
		await expect(page.locator('.ai-generator-modal')).not.toBeVisible();
	});

	test('should close modal when clicking backdrop', async ({ page }) => {
		// Add dynamic section
		await page.click('button:has-text("+ JavaScript")');
		
		// Open AI test generator
		await page.click('button:has-text("🤖 Generate Tests")');
		await page.waitForSelector('.ai-generator-modal');
		
		// Click on the backdrop
		await page.click('.modal-backdrop');
		
		// Verify modal is closed
		await expect(page.locator('.ai-generator-modal')).not.toBeVisible();
	});

	test('should handle TPN mode with population type', async ({ page }) => {
		// Mock API response with TPN-specific tests
		await page.route('**/api/generate-tests', async route => {
			const request = route.request();
			const body = request.postDataJSON();
			
			// Verify TPN mode parameters are sent
			expect(body.tpnMode).toBeTruthy();
			expect(body.patientType).toBeDefined();
			
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					success: true,
					tests: {
						basicFunctionality: [
							{
								name: 'TPN Weight Calculation',
								variables: { weight: 3.5 },
								expectedOutput: '7',
								description: 'Neonatal weight calculation'
							}
						]
					}
				})
			});
		});
		
		// Enable TPN mode (this would be done through app settings)
		// For testing, we'll add a section with TPN context
		await page.click('button:has-text("+ JavaScript")');
		
		// Generate tests
		await page.click('button:has-text("🤖 Generate Tests")');
		await page.click('.ai-generator-modal button:has-text("Generate Tests")');
		
		// Verify TPN-specific test is generated
		await page.waitForSelector('text=TPN Weight Calculation');
		await expect(page.locator('text=Neonatal weight calculation')).toBeVisible();
	});

	test('should integrate imported tests with existing test runner', async ({ page }) => {
		// Mock API response
		await page.route('**/api/generate-tests', async route => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					success: true,
					tests: {
						basicFunctionality: [
							{
								name: 'Generated Test',
								variables: { x: 5 },
								expectedOutput: '10'
							}
						]
					}
				})
			});
		});
		
		// Add dynamic section
		await page.click('button:has-text("+ JavaScript")');
		await page.waitForSelector('.section.dynamic');
		
		// Generate and import tests
		await page.click('button:has-text("🤖 Generate Tests")');
		await page.click('.ai-generator-modal button:has-text("Generate Tests")');
		await page.waitForSelector('text=Generated Test Cases');
		await page.click('button:has-text("Import Selected")');
		
		// Verify test appears in the test runner
		await page.click('button:has-text("Show Tests")');
		await expect(page.locator('.test-case').filter({ hasText: 'Generated Test' })).toBeVisible();
		
		// Run the imported test
		await page.click('.test-case button:has-text("Run")');
		
		// Verify test can be executed (exact behavior depends on implementation)
		// This would need to be adjusted based on how test execution is displayed
		await page.waitForTimeout(1000); // Wait for test execution
	});
});