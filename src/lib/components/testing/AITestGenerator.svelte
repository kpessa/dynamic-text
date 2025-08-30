<script lang="ts">
	import type { Section, TestCase } from '$lib/types';
	import { aiTestService } from '$lib/services/aiTestService';
	// import { getToastStore } from '$lib/stores/toastStore';
	
	interface Props {
		section: Section;
		onImport: (tests: TestCase[]) => void;
		onCancel: () => void;
	}
	
	let { section, onImport, onCancel }: Props = $props();
	
	// const toastStore = getToastStore();
	
	let isGenerating = $state(false);
	let generatedTests = $state<TestCase[]>([]);
	let selectedTests = $state<Set<number>>(new Set());
	let error = $state<string | null>(null);
	let showSelection = $state(false);
	
	async function handleGenerateTests() {
		isGenerating = true;
		error = null;
		selectedTests.clear();
		
		try {
			const tests = await aiTestService.generateTests(
				section.content,
				section.name || 'Unknown Section',
				section.populationType ? { 
					populationType: section.populationType
				} : undefined
			);
			
			generatedTests = tests;
			showSelection = true;
			
			// Auto-select all tests by default
			tests.forEach((_, index) => selectedTests.add(index));
			
			// toastStore.trigger({
			// 	message: `Generated ${tests.length} test cases`,
			// 	preset: 'success'
			// });
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to generate tests';
			// toastStore.trigger({
			// 	message: error,
			// 	preset: 'error'
			// });
		} finally {
			isGenerating = false;
		}
	}
	
	function toggleTestSelection(index: number) {
		if (selectedTests.has(index)) {
			selectedTests.delete(index);
		} else {
			selectedTests.add(index);
		}
		selectedTests = selectedTests; // Trigger reactivity
	}
	
	function handleImportSelected() {
		const testsToImport = generatedTests.filter((_, index) => selectedTests.has(index));
		onImport(testsToImport);
		resetState();
	}
	
	function handleSelectAll() {
		generatedTests.forEach((_, index) => selectedTests.add(index));
		selectedTests = selectedTests;
	}
	
	function handleDeselectAll() {
		selectedTests.clear();
		selectedTests = selectedTests;
	}
	
	function resetState() {
		showSelection = false;
		generatedTests = [];
		selectedTests.clear();
		error = null;
	}
</script>

<div class="ai-test-generator">
	{#if !showSelection}
		<div class="flex flex-col gap-4">
			<div class="text-sm text-surface-600 dark:text-surface-400">
				Generate test cases automatically using AI for the "{section.name}" section.
			</div>
			
			{#if error}
				<div class="alert variant-filled-error">
					<div class="alert-message">
						<p>{error}</p>
					</div>
				</div>
			{/if}
			
			<div class="flex gap-2">
				<button
					class="btn variant-filled-primary"
					onclick={handleGenerateTests}
					disabled={isGenerating}
				>
					{#if isGenerating}
						<span>⏳ Generating...</span>
					{:else}
						<span>Generate Tests</span>
					{/if}
				</button>
				
				<button
					class="btn variant-ghost"
					onclick={onCancel}
					disabled={isGenerating}
				>
					Cancel
				</button>
			</div>
		</div>
	{:else}
		<div class="flex flex-col gap-4">
			<div class="flex justify-between items-center">
				<h3 class="text-lg font-semibold">Generated Test Cases</h3>
				<div class="flex gap-2">
					<button
						class="btn btn-sm variant-ghost"
						onclick={handleSelectAll}
					>
						Select All
					</button>
					<button
						class="btn btn-sm variant-ghost"
						onclick={handleDeselectAll}
					>
						Deselect All
					</button>
				</div>
			</div>
			
			<div class="max-h-96 overflow-y-auto space-y-2">
				{#each generatedTests as test, index}
					<label class="flex items-start gap-3 p-3 card hover:variant-soft cursor-pointer">
						<input
							type="checkbox"
							class="checkbox mt-1"
							checked={selectedTests.has(index)}
							onchange={() => toggleTestSelection(index)}
						/>
						<div class="flex-1">
							<div class="font-medium">{test.name}</div>
							{#if test.description}
								<div class="text-sm text-surface-600 dark:text-surface-400 mt-1">
									{test.description}
								</div>
							{/if}
							{#if test.expectedOutput}
								<div class="text-xs font-mono bg-surface-200 dark:bg-surface-800 p-2 rounded mt-2">
									Expected: {test.expectedOutput}
								</div>
							{/if}
						</div>
					</label>
				{/each}
			</div>
			
			<div class="flex gap-2">
				<button
					class="btn variant-filled-primary"
					onclick={handleImportSelected}
					disabled={selectedTests.size === 0}
				>
					Import Selected ({selectedTests.size})
				</button>
				
				<button
					class="btn variant-ghost"
					onclick={() => {
						resetState();
						onCancel();
					}}
				>
					Cancel
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.ai-test-generator {
		padding: 1rem;
	}
</style>