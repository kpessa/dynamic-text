import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { aiTestService } from '../aiTestService';

// Mock fetch globally
global.fetch = vi.fn();

// Mock Firebase auth
vi.mock('../FirebaseService', () => ({
	auth: {
		currentUser: null
	}
}));

describe('AITestService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('generateTests', () => {
		it('should generate tests successfully with valid input', async () => {
			const mockResponse = {
				success: true,
				tests: {
					basicFunctionality: [
						{
							name: 'Test 1',
							variables: { x: 5 },
							expectedOutput: '10',
							description: 'Basic test'
						}
					]
				}
			};

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			const result = await aiTestService.generateTests(
				'return x * 2;',
				'Test Section'
			);

			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				name: 'Test 1',
				variables: { x: 5 },
				expectedOutput: '10'
			});

			expect(global.fetch).toHaveBeenCalledWith(
				'/api/generate-tests',
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Content-Type': 'application/json'
					})
				})
			);
		});

		it('should throw error when code is empty', async () => {
			await expect(
				aiTestService.generateTests('', 'Test Section')
			).rejects.toThrow('Code and section name are required');
		});

		it('should throw error when section name is empty', async () => {
			await expect(
				aiTestService.generateTests('return x;', '')
			).rejects.toThrow('Code and section name are required');
		});

		it('should handle API errors gracefully', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: async () => ({ error: 'Internal server error' })
			});

			await expect(
				aiTestService.generateTests('return x;', 'Test Section')
			).rejects.toThrow('Internal server error');
		});

		it('should handle rate limit errors', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: false,
				status: 429,
				json: async () => ({ error: 'rate limit exceeded' })
			});

			await expect(
				aiTestService.generateTests('return x;', 'Test Section')
			).rejects.toThrow('AI service rate limit exceeded');
		});

		it('should handle missing API key error', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: false,
				json: async () => ({ error: 'GEMINI_API_KEY not configured' })
			});

			await expect(
				aiTestService.generateTests('return x;', 'Test Section')
			).rejects.toThrow('AI service not configured');
		});

		it('should retry on network failure', async () => {
			let callCount = 0;
			(global.fetch as any).mockImplementation(() => {
				callCount++;
				if (callCount < 3) {
					return Promise.reject(new Error('Network error'));
				}
				return Promise.resolve({
					ok: true,
					json: async () => ({
						success: true,
						tests: []
					})
				});
			});

			const result = await aiTestService.generateTests(
				'return x;',
				'Test Section'
			);

			expect(result).toEqual([]);
			expect(global.fetch).toHaveBeenCalledTimes(3);
		});

		it('should extract variables from code', async () => {
			const mockResponse = {
				success: true,
				tests: []
			};

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			await aiTestService.generateTests(
				'const result = me.getValue("weight") * 2;',
				'Test Section'
			);

			const requestBody = JSON.parse(
				(global.fetch as any).mock.calls[0][1].body
			);

			expect(requestBody.variables).toContain('weight');
		});

		it('should handle context with population type', async () => {
			const mockResponse = {
				success: true,
				tests: []
			};

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			await aiTestService.generateTests(
				'return x;',
				'Test Section',
				{
					populationType: 'pediatric',
					availableVariables: ['weight', 'height']
				}
			);

			const requestBody = JSON.parse(
				(global.fetch as any).mock.calls[0][1].body
			);

			expect(requestBody.patientType).toBe('pediatric');
			expect(requestBody.variables).toEqual(['weight', 'height']);
			expect(requestBody.tpnMode).toBe(true);
		});

		it('should handle different response formats', async () => {
			// Test format with testCases directly
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					testCases: [
						{
							name: 'Direct Test',
							variables: {},
							expectedOutput: 'output'
						}
					]
				})
			});

			const result = await aiTestService.generateTests(
				'return "output";',
				'Test Section'
			);

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('Direct Test');
		});

		it('should handle invalid response format', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					invalidFormat: true
				})
			});

			await expect(
				aiTestService.generateTests('return x;', 'Test Section')
			).rejects.toThrow('Invalid response format from AI service');
		});
	});
});