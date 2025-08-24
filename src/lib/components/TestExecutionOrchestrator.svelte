<script>
  import { logError } from '$lib/logger';
<script lang="ts">
  import { testStore } from '../../stores/testStore.svelte';
  import { sectionStore } from '../../stores/sectionStore.svelte';
  import { eventBus } from '../utils/eventBus';
  import { runTestCase, validateTestOutput } from '../services/execution/codeExecutionService';
  import type { Section, TestCase, TestResult } from '../types';
  
  interface Props {
    sections?: Section[];
    activeTestCases?: Record<number, TestCase>;
    tpnMode?: boolean;
    currentTPNInstance?: any;
    onTestComplete?: (results: TestSummary) => void;
    onTestGenerated?: (sectionId: number, tests: GeneratedTest[]) => void;
    onAITestsGenerated?: (sectionId: number, tests: any) => void;
  }
  
  interface TestSummary {
    sections: SectionTestResult[];
    summary: {
      total: number;
      passed: number;
      failed: number;
      timestamp: number;
    };
  }
  
  interface SectionTestResult {
    sectionId: number;
    results: TestResult[];
  }
  
  interface GeneratedTest {
    name: string;
    variables: Record<string, any>;
    expectedOutput?: string;
    expectedStyles?: any;
  }
  
  let {
    sections = [],
    activeTestCases = {},
    tpnMode = false,
    currentTPNInstance = null,
    onTestComplete = () => {},
    onTestGenerated = () => {},
    onAITestsGenerated = () => {}
  }: Props = $props();
  
  // Local state
  let testSummary = $state<TestSummary | null>(null);
  let showTestSummary = $state(false);
  let showTestGeneratorModal = $state(false);
  let currentGeneratedTests = $state<GeneratedTest[] | null>(null);
  let targetSectionId = $state<number | null>(null);
  let showAIWorkflowInspector = $state(false);
  let inspectorCurrentSection = $state<number | null>(null);
  let isRunningTests = $state(false);
  let testProgress = $state({ current: 0, total: 0 });
  
  // Run single test for a section
  async function runSingleTest(sectionId: number, testCase: TestCase): Promise<TestResult> {
    const section = sections.find(s => s.id === sectionId);
    if (!section || section.type !== 'dynamic') {
      return { passed: false, error: 'Invalid section or not dynamic' };
    }
    
    try {
      // Create evaluation context
      const context = tpnMode && currentTPNInstance ? {
        ...testCase.variables,
        tpnInstance: currentTPNInstance
      } : testCase.variables;
      
      // Run the test
      const result = await runTestCase(
        section.content,
        context,
        testCase.expectedOutput,
        testCase.matchType || 'exact'
      );
      
      // Validate output if expectations are set
      let passed = true;
      let error = null;
      
      if (testCase.expectedOutput !== undefined) {
        const validation = validateTestOutput(
          result.actualOutput,
          testCase.expectedOutput,
          testCase.matchType || 'exact',
          result.actualStyles,
          testCase.expectedStyles
        );
        
        passed = validation.passed;
        error = validation.error;
      }
      
      // Update test case result in store
      const testIndex = section.testCases?.findIndex(tc => tc === testCase) ?? -1;
      if (testIndex !== -1) {
        sectionStore.updateTestCase(sectionId, testIndex, {
          testResult: {
            passed,
            actualOutput: result.actualOutput,
            actualStyles: result.actualStyles,
            error: error || undefined,
            timestamp: Date.now()
          }
        });
      }
      
      return { 
        passed, 
        error,
        actualOutput: result.actualOutput,
        actualStyles: result.actualStyles
      };
      
    } catch (error) {
      logError('Test execution error:', error);
      return { 
        passed: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }
  
  // Run all tests for all sections
  async function runAllTests() {
    isRunningTests = true;
    const allResults: SectionTestResult[] = [];
    
    // Count total tests
    let totalTests = 0;
    sections.forEach(section => {
      if (section.type === 'dynamic' && section.testCases) {
        totalTests += section.testCases.length;
      }
    });
    
    testProgress = { current: 0, total: totalTests };
    
    // Run tests for each section
    for (const section of sections) {
      if (section.type === 'dynamic' && section.testCases && section.testCases.length > 0) {
        const sectionResults: TestResult[] = [];
        
        for (const testCase of section.testCases) {
          if (testCase.expectedOutput !== undefined || testCase.expectedStyles) {
            const result = await runSingleTest(section.id, testCase);
            sectionResults.push({ testCase, ...result });
            testProgress.current++;
          }
        }
        
        if (sectionResults.length > 0) {
          allResults.push({
            sectionId: section.id,
            results: sectionResults
          });
        }
      }
    }
    
    // Calculate summary
    const total = allResults.reduce((sum, sr) => sum + sr.results.length, 0);
    const passed = allResults.reduce((sum, sr) => 
      sum + sr.results.filter(r => r.passed).length, 0);
    
    const summary: TestSummary = {
      sections: allResults,
      summary: {
        total,
        passed,
        failed: total - passed,
        timestamp: Date.now()
      }
    };
    
    testSummary = summary;
    showTestSummary = true;
    isRunningTests = false;
    testProgress = { current: 0, total: 0 };
    
    // Update store
    testStore.setTestSummary(summary);
    testStore.setShowTestSummary(true);
    
    // Call parent handler
    onTestComplete(summary);
    
    // Emit event
    eventBus.emit('tests:completed', summary);
    
    return summary;
  }
  
  // Handle generated tests from AI
  function handleTestsGenerated(sectionId: number, tests: GeneratedTest[]) {
    currentGeneratedTests = tests;
    targetSectionId = sectionId;
    showTestGeneratorModal = true;
    
    // Update store
    testStore.setCurrentGeneratedTests(tests);
    testStore.setTargetSectionId(sectionId);
    
    // Call parent handler
    onTestGenerated(sectionId, tests);
    
    // Emit event
    eventBus.emit('tests:generated', { sectionId, tests });
  }
  
  // Handle AI test generation workflow
  function handleAITestsGenerated(sectionId: number, workflow: any) {
    inspectorCurrentSection = sectionId;
    showAIWorkflowInspector = true;
    
    // Update store
    testStore.setInspectorCurrentSection(sectionId);
    testStore.setShowAIWorkflowInspector(true);
    
    // Call parent handler
    onAITestsGenerated(sectionId, workflow);
    
    // Emit event
    eventBus.emit('tests:ai-workflow', { sectionId, workflow });
  }
  
  // Import generated tests
  function handleImportTests(sectionId: number, tests: GeneratedTest[]) {
    if (!targetSectionId || targetSectionId !== sectionId) return;
    
    // Add tests to the section
    tests.forEach(test => {
      sectionStore.addTestCase(sectionId, test);
    });
    
    // Clear modal
    showTestGeneratorModal = false;
    currentGeneratedTests = null;
    targetSectionId = null;
    
    // Emit event
    eventBus.emit('tests:imported', { sectionId, tests });
  }
  
  // Open AI workflow inspector
  function openAIWorkflowInspector(sectionId: number) {
    inspectorCurrentSection = sectionId;
    showAIWorkflowInspector = true;
    
    testStore.setInspectorCurrentSection(sectionId);
    testStore.setShowAIWorkflowInspector(true);
  }
  
  // Listen for test events
  $effect(() => {
    const handlers = [
      eventBus.on('tests:run-all', runAllTests),
      eventBus.on('tests:run-single', ({ sectionId, testCase }) => {
        runSingleTest(sectionId, testCase);
      }),
      eventBus.on('tests:generated', ({ sectionId, tests }) => {
        handleTestsGenerated(sectionId, tests);
      }),
      eventBus.on('tests:import', ({ sectionId, tests }) => {
        handleImportTests(sectionId, tests);
      })
    ];
    
    return () => handlers.forEach(h => h());
  });
</script>

<!-- Test Execution UI -->
<div class="test-orchestrator">
  <div class="test-controls">
    <button 
      onclick={runAllTests}
      disabled={isRunningTests}
      class="test-btn primary"
    >
      {#if isRunningTests}
        🔄 Running Tests... ({testProgress.current}/{testProgress.total})
      {:else}
        ▶️ Run All Tests
      {/if}
    </button>
    
    {#if testSummary}
      <button 
        onclick={() => showTestSummary = !showTestSummary}
        class="test-btn"
      >
        📊 Test Summary ({testSummary.summary.passed}/{testSummary.summary.total})
      </button>
    {/if}
  </div>
  
  {#if isRunningTests}
    <div class="test-progress">
      <div 
        class="progress-bar"
        style="width: {(testProgress.current / testProgress.total) * 100}%"
      />
    </div>
  {/if}
</div>

<!-- Test Summary Modal -->
{#if showTestSummary && testSummary}
  <div class="modal-backdrop">
    <div class="modal-content test-summary">
      <h2>Test Results</h2>
      
      <div class="summary-stats">
        <div class="stat">
          <span class="stat-label">Total Tests:</span>
          <span class="stat-value">{testSummary.summary.total}</span>
        </div>
        <div class="stat passed">
          <span class="stat-label">Passed:</span>
          <span class="stat-value">{testSummary.summary.passed}</span>
        </div>
        <div class="stat failed">
          <span class="stat-label">Failed:</span>
          <span class="stat-value">{testSummary.summary.failed}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Pass Rate:</span>
          <span class="stat-value">
            {((testSummary.summary.passed / testSummary.summary.total) * 100).toFixed(1)}%
          </span>
        </div>
      </div>
      
      <div class="section-results">
        {#each testSummary.sections as sectionResult}
          <div class="section-result">
            <h3>Section {sectionResult.sectionId}</h3>
            <div class="test-results">
              {#each sectionResult.results as result}
                <div class="test-result" class:passed={result.passed} class:failed={!result.passed}>
                  <span class="test-name">{result.testCase.name}</span>
                  <span class="test-status">
                    {result.passed ? '✅' : '❌'}
                  </span>
                  {#if result.error}
                    <div class="test-error">{result.error}</div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
      
      <div class="modal-actions">
        <button onclick={() => showTestSummary = false}>Close</button>
      </div>
    </div>
  </div>
{/if}

<!-- Test Generator Modal -->
{#if showTestGeneratorModal && currentGeneratedTests}
  <div class="modal-backdrop">
    <div class="modal-content">
      <h2>Generated Tests</h2>
      <p>{currentGeneratedTests.length} tests generated for Section {targetSectionId}</p>
      
      <div class="generated-tests">
        {#each currentGeneratedTests as test}
          <div class="generated-test">
            <h4>{test.name}</h4>
            <div class="test-variables">
              {#each Object.entries(test.variables) as [key, value]}
                <span class="variable">{key}: {value}</span>
              {/each}
            </div>
            {#if test.expectedOutput}
              <div class="expected">Expected: {test.expectedOutput}</div>
            {/if}
          </div>
        {/each}
      </div>
      
      <div class="modal-actions">
        <button 
          onclick={() => handleImportTests(targetSectionId, currentGeneratedTests)}
          class="primary"
        >
          Import All Tests
        </button>
        <button onclick={() => showTestGeneratorModal = false}>Cancel</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .test-orchestrator {
    padding: 0.5rem 1rem;
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
  }
  
  .test-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .test-btn {
    padding: 0.5rem 1rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }
  
  .test-btn:hover:not(:disabled) {
    background: var(--color-bg-hover);
  }
  
  .test-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .test-btn.primary {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }
  
  .test-progress {
    margin-top: 0.5rem;
    height: 4px;
    background: var(--color-bg);
    border-radius: 2px;
    overflow: hidden;
  }
  
  .progress-bar {
    height: 100%;
    background: var(--color-primary);
    transition: width 0.3s;
  }
  
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal-content {
    background: var(--color-bg);
    border-radius: 8px;
    padding: 2rem;
    max-width: 800px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  .test-summary h2 {
    margin-top: 0;
  }
  
  .summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin: 1.5rem 0;
    padding: 1rem;
    background: var(--color-bg-secondary);
    border-radius: 4px;
  }
  
  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .stat-label {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    margin-bottom: 0.25rem;
  }
  
  .stat-value {
    font-size: 1.5rem;
    font-weight: bold;
  }
  
  .stat.passed .stat-value {
    color: var(--color-success);
  }
  
  .stat.failed .stat-value {
    color: var(--color-error);
  }
  
  .section-results {
    margin: 1.5rem 0;
  }
  
  .section-result {
    margin-bottom: 1.5rem;
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }
  
  .section-result h3 {
    margin: 0 0 1rem 0;
    color: var(--color-primary);
  }
  
  .test-results {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .test-result {
    display: flex;
    align-items: center;
    padding: 0.5rem;
    border-radius: 4px;
    background: var(--color-bg-secondary);
  }
  
  .test-result.passed {
    border-left: 3px solid var(--color-success);
  }
  
  .test-result.failed {
    border-left: 3px solid var(--color-error);
  }
  
  .test-name {
    flex: 1;
    font-weight: 500;
  }
  
  .test-status {
    margin-left: 1rem;
  }
  
  .test-error {
    width: 100%;
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: var(--color-error-bg);
    color: var(--color-error);
    border-radius: 4px;
    font-size: 0.875rem;
  }
  
  .generated-tests {
    margin: 1rem 0;
  }
  
  .generated-test {
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    margin-bottom: 0.5rem;
  }
  
  .generated-test h4 {
    margin: 0 0 0.5rem 0;
    color: var(--color-primary);
  }
  
  .test-variables {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin: 0.5rem 0;
  }
  
  .variable {
    padding: 0.25rem 0.5rem;
    background: var(--color-bg-secondary);
    border-radius: 4px;
    font-size: 0.875rem;
    font-family: monospace;
  }
  
  .expected {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: var(--color-bg-secondary);
    border-radius: 4px;
    font-size: 0.875rem;
  }
  
  .modal-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }
  
  .modal-actions button {
    padding: 0.5rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg);
    cursor: pointer;
  }
  
  .modal-actions button.primary {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }
  
  .modal-actions button:hover {
    opacity: 0.9;
  }
</style>