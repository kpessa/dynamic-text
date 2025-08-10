<script>
  import { sectionStore } from '../../stores/sectionStore.svelte.ts';
  import { testStore } from '../../stores/testStore.svelte.ts';
  import { workspaceStore } from '../../stores/workspaceStore.svelte.ts';
  import { sectionService } from '../services/sectionService.js';
  
  // Props
  let { onRunAllTests = () => {} } = $props();
  
  // Reactive state
  const sections = $derived(sectionStore.sections);
  const dynamicSections = $derived(sectionStore.dynamicSections);
  const activeTestCase = $derived(sectionStore.activeTestCase);
  const isRunningTests = $derived(testStore.isRunningTests);
  
  async function runAllTests() {
    if (isRunningTests) return;
    
    testStore.setIsRunningTests(true);
    
    try {
      const sectionResults = [];
      
      // Run tests for each dynamic section
      for (const section of dynamicSections) {
        if (section.testCases && section.testCases.length > 0) {
          const results = [];
          
          for (const testCase of section.testCases) {
            const result = await testStore.runSingleTest(
              section.id,
              testCase,
              section.content,
              (code, variables) => sectionService.evaluateCode(code, variables)
            );
            results.push(result);
          }
          
          sectionResults.push({
            sectionId: section.id,
            sectionName: section.name,
            results
          });
        }
      }
      
      // Create and store test summary
      const summary = testStore.createTestSummary(sectionResults);
      testStore.setTestSummary(summary);
      workspaceStore.setTestResults(summary);
      
      // Trigger callback with results
      onRunAllTests(summary);
      
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      testStore.setIsRunningTests(false);
    }
  }
  
  // Keyboard shortcut handler
  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
      e.preventDefault();
      runAllTests();
    }
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

<button 
  class="run-all-tests-btn {isRunningTests ? 'running' : ''}"
  onclick={runAllTests}
  disabled={isRunningTests || dynamicSections.length === 0}
  title="Run all test cases with expectations (Ctrl/Cmd+T)"
>
  {#if isRunningTests}
    <span class="spinner"></span>
    Running Tests...
  {:else}
    🧪 Run All Tests
  {/if}
  {#if dynamicSections.length > 0}
    <span class="test-count">({dynamicSections.reduce((sum, section) => sum + section.testCases.length, 0)})</span>
  {/if}
</button>

<style>
  .run-all-tests-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }
  
  .run-all-tests-btn:hover:not(:disabled) {
    background: #218838;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
  }
  
  .run-all-tests-btn:disabled {
    background: #6c757d;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  .run-all-tests-btn.running {
    background: #007bff;
  }
  
  .run-all-tests-btn.running:hover {
    background: #0056b3;
  }
  
  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  .test-count {
    font-size: 0.8rem;
    opacity: 0.8;
    font-weight: normal;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>