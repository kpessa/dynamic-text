import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import AITestGenerator from '../AITestGenerator.svelte';
import type { Section } from '$lib/types';
import { aiTestService } from '$lib/services/aiTestService';

// Mock the aiTestService
vi.mock('$lib/services/aiTestService', () => ({
	aiTestService: {
		generateTests: vi.fn()
	}
}));

// Mock the toast store
vi.mock('@skeletonlabs/skeleton', () => ({
	getToastStore: () => ({
		trigger: vi.fn()
	})
}));

describe('AITestGenerator', () => {
	const mockSection: Section = {
		id: 1,
		type: 'dynamic',
		content: 'return x * 2;',
		testCases: []
	};

	const mockOnImport = vi.fn();
	const mockOnCancel = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the initial state correctly', () => {
		const { getByText } = render(AITestGenerator, {
			props: {
				section: mockSection,
				onImport: mockOnImport,
				onCancel: mockOnCancel
			}
		});

		expect(getByText(/Generate test cases automatically/)).toBeTruthy();
		expect(getByText('Generate Tests')).toBeTruthy();
		expect(getByText('Cancel')).toBeTruthy();
	});

	it('should call aiTestService when Generate Tests is clicked', async () => {
		const mockTests = [
			{
				name: 'Test 1',
				variables: { x: 5 },
				expectedOutput: '10',
				description: 'Basic multiplication test'
			}
		];

		vi.mocked(aiTestService.generateTests).mockResolvedValueOnce(mockTests);

		const { getByText } = render(AITestGenerator, {
			props: {
				section: mockSection,
				onImport: mockOnImport,
				onCancel: mockOnCancel
			}
		});

		const generateButton = getByText('Generate Tests');
		await fireEvent.click(generateButton);

		await waitFor(() => {
			expect(aiTestService.generateTests).toHaveBeenCalledWith(
				mockSection.content,
				`Section ${mockSection.id}`,
				undefined
			);
		});
	});

	it('should display generated tests for selection', async () => {
		const mockTests = [
			{
				name: 'Test 1',
				variables: { x: 5 },
				expectedOutput: '10',
				description: 'Basic test',
				matchType: 'exact' as const
			},
			{
				name: 'Test 2',
				variables: { x: 0 },
				expectedOutput: '0',
				description: 'Zero test',
				matchType: 'exact' as const
			}
		];

		vi.mocked(aiTestService.generateTests).mockResolvedValueOnce(mockTests);

		const { getByText, getAllByRole } = render(AITestGenerator, {
			props: {
				section: mockSection,
				onImport: mockOnImport,
				onCancel: mockOnCancel
			}
		});

		await fireEvent.click(getByText('Generate Tests'));

		await waitFor(() => {
			expect(getByText('Generated Test Cases')).toBeTruthy();
			expect(getByText('Test 1')).toBeTruthy();
			expect(getByText('Test 2')).toBeTruthy();
		});

		const checkboxes = getAllByRole('checkbox');
		expect(checkboxes).toHaveLength(2);
		// All should be selected by default
		checkboxes.forEach(checkbox => {
			expect((checkbox as HTMLInputElement).checked).toBe(true);
		});
	});

	it('should handle test selection and deselection', async () => {
		const mockTests = [
			{
				name: 'Test 1',
				variables: { x: 5 },
				expectedOutput: '10',
				matchType: 'exact' as const
			}
		];

		vi.mocked(aiTestService.generateTests).mockResolvedValueOnce(mockTests);

		const { getByText, getByRole } = render(AITestGenerator, {
			props: {
				section: mockSection,
				onImport: mockOnImport,
				onCancel: mockOnCancel
			}
		});

		await fireEvent.click(getByText('Generate Tests'));

		await waitFor(() => {
			expect(getByText('Test 1')).toBeTruthy();
		});

		const checkbox = getByRole('checkbox');
		expect((checkbox as HTMLInputElement).checked).toBe(true);

		// Deselect
		await fireEvent.click(checkbox);
		expect((checkbox as HTMLInputElement).checked).toBe(false);

		// The import button should be disabled
		const importButton = getByText(/Import Selected/);
		expect((importButton as HTMLButtonElement).disabled).toBe(true);
	});

	it('should call onImport with selected tests', async () => {
		const mockTests = [
			{
				name: 'Test 1',
				variables: { x: 5 },
				expectedOutput: '10',
				matchType: 'exact' as const
			},
			{
				name: 'Test 2',
				variables: { x: 10 },
				expectedOutput: '20',
				matchType: 'exact' as const
			}
		];

		vi.mocked(aiTestService.generateTests).mockResolvedValueOnce(mockTests);

		const { getByText } = render(AITestGenerator, {
			props: {
				section: mockSection,
				onImport: mockOnImport,
				onCancel: mockOnCancel
			}
		});

		await fireEvent.click(getByText('Generate Tests'));

		await waitFor(() => {
			expect(getByText('Test 1')).toBeTruthy();
		});

		const importButton = getByText(/Import Selected \(2\)/);
		await fireEvent.click(importButton);

		expect(mockOnImport).toHaveBeenCalledWith(mockTests);
	});

	it('should handle Select All and Deselect All', async () => {
		const mockTests = [
			{
				name: 'Test 1',
				variables: { x: 5 },
				expectedOutput: '10',
				matchType: 'exact' as const
			},
			{
				name: 'Test 2',
				variables: { x: 10 },
				expectedOutput: '20',
				matchType: 'exact' as const
			}
		];

		vi.mocked(aiTestService.generateTests).mockResolvedValueOnce(mockTests);

		const { getByText, getAllByRole } = render(AITestGenerator, {
			props: {
				section: mockSection,
				onImport: mockOnImport,
				onCancel: mockOnCancel
			}
		});

		await fireEvent.click(getByText('Generate Tests'));

		await waitFor(() => {
			expect(getByText('Test 1')).toBeTruthy();
		});

		// Deselect all
		await fireEvent.click(getByText('Deselect All'));
		const checkboxes = getAllByRole('checkbox');
		checkboxes.forEach(checkbox => {
			expect((checkbox as HTMLInputElement).checked).toBe(false);
		});

		// Select all
		await fireEvent.click(getByText('Select All'));
		checkboxes.forEach(checkbox => {
			expect((checkbox as HTMLInputElement).checked).toBe(true);
		});
	});

	it('should display error message on generation failure', async () => {
		vi.mocked(aiTestService.generateTests).mockRejectedValueOnce(
			new Error('API service unavailable')
		);

		const { getByText } = render(AITestGenerator, {
			props: {
				section: mockSection,
				onImport: mockOnImport,
				onCancel: mockOnCancel
			}
		});

		await fireEvent.click(getByText('Generate Tests'));

		await waitFor(() => {
			expect(getByText('API service unavailable')).toBeTruthy();
		});
	});

	it('should show loading state during generation', async () => {
		vi.mocked(aiTestService.generateTests).mockImplementation(
			() => new Promise(resolve => setTimeout(() => resolve([]), 100))
		);

		const { getByText } = render(AITestGenerator, {
			props: {
				section: mockSection,
				onImport: mockOnImport,
				onCancel: mockOnCancel
			}
		});

		await fireEvent.click(getByText('Generate Tests'));

		expect(getByText('Generating...')).toBeTruthy();
	});

	it('should call onCancel when Cancel button is clicked', async () => {
		const { getByText } = render(AITestGenerator, {
			props: {
				section: mockSection,
				onImport: mockOnImport,
				onCancel: mockOnCancel
			}
		});

		await fireEvent.click(getByText('Cancel'));

		expect(mockOnCancel).toHaveBeenCalled();
	});

	it('should handle sections with population type context', async () => {
		const sectionWithPopulation: any = {
			...mockSection,
			populationType: 'pediatric' as const
		};

		vi.mocked(aiTestService.generateTests).mockResolvedValueOnce([]);

		const { getByText } = render(AITestGenerator, {
			props: {
				section: sectionWithPopulation,
				onImport: mockOnImport,
				onCancel: mockOnCancel
			}
		});

		await fireEvent.click(getByText('Generate Tests'));

		await waitFor(() => {
			expect(aiTestService.generateTests).toHaveBeenCalledWith(
				sectionWithPopulation.content,
				`Section ${sectionWithPopulation.id}`,
				{ populationType: 'pediatric' }
			);
		});
	});
});