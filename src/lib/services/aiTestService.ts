import type { TestCase } from './testRunnerService';
import type { PopulationType } from '../types';
import { auth } from '../firebase';

interface GenerateTestsParams {
	code: string;
	sectionName: string;
	context?: {
		populationType?: PopulationType;
		availableVariables?: string[];
	};
}

interface GenerateTestsResponse {
	testCases: TestCase[];
}

class AITestService {
	private apiEndpoint = '/api/generate-tests';
	private maxRetries = 3;
	private retryDelay = 1000; // 1 second

	async generateTests(
		code: string,
		sectionName: string,
		context?: GenerateTestsParams['context']
	): Promise<TestCase[]> {
		if (!code || !sectionName) {
			throw new Error('Code and section name are required');
		}

		// Prepare request body
		const requestBody = {
			code,
			sectionName,
			context: context || {},
			// For backward compatibility with existing endpoint
			dynamicCode: code,
			variables: context?.availableVariables || this.extractVariablesFromCode(code),
			testCategory: 'all',
			tpnMode: !!context?.populationType,
			patientType: context?.populationType || 'neonatal'
		};

		// Get authentication token if available
		let authToken: string | null = null;
		try {
			if (auth && auth.currentUser) {
				authToken = await auth.currentUser.getIdToken();
			}
		} catch (error) {
			console.warn('Failed to get auth token, proceeding without authentication');
		}

		// Make API request with retry logic
		for (let attempt = 0; attempt < this.maxRetries; attempt++) {
			try {
				const response = await this.makeRequest(requestBody, authToken);
				return this.parseResponse(response);
			} catch (error) {
				if (attempt === this.maxRetries - 1) {
					throw this.handleError(error);
				}
				await this.delay(this.retryDelay * Math.pow(2, attempt)); // Exponential backoff
			}
		}

		throw new Error('Failed to generate tests after multiple attempts');
	}

	private async makeRequest(body: any, authToken: string | null): Promise<Response> {
		const headers: HeadersInit = {
			'Content-Type': 'application/json'
		};

		if (authToken) {
			headers['Authorization'] = `Bearer ${authToken}`;
		}

		const response = await fetch(this.apiEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify(body)
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
			throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
		}

		return response;
	}

	private async parseResponse(response: Response): Promise<TestCase[]> {
		const data = await response.json();

		// Handle different response formats from the API
		if (data.success && data.tests) {
			// Convert from API format to TestCase format
			return this.convertToTestCases(data.tests);
		} else if (data.testCases) {
			return data.testCases;
		} else {
			throw new Error('Invalid response format from AI service');
		}
	}

	private convertToTestCases(tests: any): TestCase[] {
		const testCases: TestCase[] = [];

		// Handle different test categories from the API response
		if (tests.basicFunctionality) {
			testCases.push(...this.mapTestCategory(tests.basicFunctionality, 'basicFunctionality'));
		}
		if (tests.edgeCases) {
			testCases.push(...this.mapTestCategory(tests.edgeCases, 'edgeCases'));
		}
		if (tests.qaBreaking) {
			testCases.push(...this.mapTestCategory(tests.qaBreaking, 'qaBreaking'));
		}

		// If no categories, assume it's a flat array
		if (testCases.length === 0 && Array.isArray(tests)) {
			return tests.map((test: any) => this.mapTestToTestCase(test));
		}

		return testCases;
	}

	private mapTestCategory(categoryTests: any[], category: string): TestCase[] {
		if (!Array.isArray(categoryTests)) return [];
		
		return categoryTests.map((test: any) => ({
			...this.mapTestToTestCase(test),
			category
		}));
	}

	private mapTestToTestCase(test: any): TestCase {
		return {
			name: test.name || 'Unnamed Test',
			variables: test.variables || {},
			expectedOutput: test.expectedOutput || test.expected || '',
			expectedStyles: test.expectedStyles,
			matchType: test.matchType || 'exact'
		};
	}

	private extractVariablesFromCode(code: string): string[] {
		const variables = new Set<string>();
		
		// Match me.getValue('variable') pattern
		const getValueRegex = /me\.getValue\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
		let match;
		while ((match = getValueRegex.exec(code)) !== null) {
			variables.add(match[1]);
		}
		
		// Match variable declarations
		const varRegex = /(?:let|const|var)\s+(\w+)\s*=/g;
		while ((match = varRegex.exec(code)) !== null) {
			variables.add(match[1]);
		}
		
		return Array.from(variables);
	}

	private handleError(error: any): Error {
		if (error instanceof Error) {
			// Check for specific error types
			if (error.message.includes('GEMINI_API_KEY')) {
				return new Error('AI service not configured. Please ensure the API key is set.');
			}
			if (error.message.includes('rate limit')) {
				return new Error('AI service rate limit exceeded. Please try again later.');
			}
			if (error.message.includes('timeout')) {
				return new Error('Request timed out. Please try again.');
			}
			if (error.message.includes('404')) {
				return new Error('AI service endpoint not found. Please check your configuration.');
			}
			return error;
		}
		return new Error('An unexpected error occurred while generating tests');
	}

	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	private generateId(): string {
		return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}
}

export const aiTestService = new AITestService();