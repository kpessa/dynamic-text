<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { sections } from '../../stores/sectionStore.svelte.ts';
  import { ingredientsBySection } from '../../stores/ingredientStore.svelte.ts';
  import { isValidKey, isCalculatedValue } from '../tpnLegacy.js';
  
  interface TestResult {
    passed: boolean;
    output: string;
    expectedOutput?: string;
    error?: string;
    outputPassed?: boolean;
    stylesPassed?: boolean;
    actualStyles?: Record<string, string>;
    expectedStyles?: Record<string, string>;
  }
  
  interface SectionTestResult {
    sectionId: number;
    passed: number;
    failed: number;
    results: TestResult[];
  }
  
  interface TestSummary {
    totalSections: number;
    sectionsWithTests: number;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    sectionResults: SectionTestResult[];
    timestamp: Date;
  }
  
  interface Props {
    activeTestCase?: Record<number, TestCase>;
    expandedTestCases?: Record<number, boolean>;
    tpnMode?: boolean;
    evaluateCode?: (code: string, variables: Record<string, any>) => string;
    extractStylesFromHTML?: (html: string) => Record<string, string>;
    stripHTML?: (html: string) => string;
    onTestCaseUpdate?: (sectionId: number, index: number, updates: Partial<TestCase>) => void;
    onTestSummaryUpdate?: (summary: TestSummary | null) => void;
    onActiveTestCaseChange?: (sectionId: number, testCase: TestCase) => void;
  }
  
  let {
    sections = [],
    activeTestCase = {},
    expandedTestCases = {},
    tpnMode = false,
    evaluateCode = () => '',
    extractStylesFromHTML = () => ({}),
    stripHTML = () => '',
    onTestCaseUpdate = () => {},
    onTestSummaryUpdate = () => {},
    onActiveTestCaseChange = () => {}
  }: Props = $props();
  
  const dispatch = createEventDispatcher();
  
  let testSummary = $state<TestSummary | null>(null);
  let showTestSummary = $state(false);
  let currentTestResults = $state<Record<number, TestResult[]>>({});
  
  // Auto-populate test cases with extracted ingredients
  $effect(() => {
    Object.entries(ingredientsBySection).forEach(([sectionId, { allKeys }]) => {
      const section = sections.find(s => s.id === parseInt(sectionId));
      if (section && section.testCases) {
        section.testCases.forEach(testCase => {
          // Add any new keys that aren't already in the test case
          allKeys.forEach(key => {
            // Skip calculated values - they don't need to be in test variables
            if (isCalculatedValue(key)) {
              return;
            }
            
            if (testCase.variables[key] === undefined) {
              // Set default value based on whether it's a TPN key or custom
              if (isValidKey(key)) {
                // For TPN keys, use appropriate defaults
                testCase.variables[key] = 0;
              } else {
                // For custom keys, use empty string
                testCase.variables[key] = '';
              }
            }
          });
          
          // Remove variables that are no longer referenced in the code
          // But keep calculated values out of the variables
          Object.keys(testCase.variables).forEach(key => {
            if (!allKeys.includes(key) || isCalculatedValue(key)) {
              delete testCase.variables[key];
            }
          });
        });
      }
    });
  });
  
  // Add test case to a section
  export function addTestCase(sectionId: number) {
    const section = sections.find(s => s.id === sectionId);
    if (section?.type === 'dynamic') {
      const dynamicSection = section as DynamicSection;
      const newTestCase: TestCase = {
        name: `Test ${dynamicSection.testCases.length + 1}`,
        variables: {}
      };
      
      dynamicSection.testCases = [...(dynamicSection.testCases || []), newTestCase];
      
      dispatch('testCaseAdded', { sectionId, testCase: newTestCase });
    }
  }
  
  // Update test case
  export function updateTestCase(sectionId: number, index: number, updates: Partial<TestCase>) {
    const section = sections.find(s => s.id === sectionId) as DynamicSection;
    if (section?.testCases?.[index]) {
      section.testCases[index] = { ...section.testCases[index], ...updates };
      onTestCaseUpdate(sectionId, index, updates);
      
      dispatch('testCaseUpdated', { sectionId, index, updates });
    }
  }
  
  // Delete test case
  export function deleteTestCase(sectionId: number, index: number) {
    const section = sections.find(s => s.id === sectionId) as DynamicSection;
    if (section?.testCases) {
      section.testCases = section.testCases.filter((_, i) => i !== index);
      
      // Update active test case if needed
      if (activeTestCase[sectionId] === section.testCases[index]) {
        const newActiveTest = section.testCases[0] || { name: 'Default', variables: {} };
        onActiveTestCaseChange(sectionId, newActiveTest);
      }
      
      dispatch('testCaseDeleted', { sectionId, index });
    }
  }
  
  // Set active test case for a section
  export function setActiveTestCase(sectionId: number, testCase: TestCase) {
    onActiveTestCaseChange(sectionId, testCase);
    
    // If this test has expectations, run it immediately
    if (testCase.expectedOutput || testCase.expectedStyles) {
      runSingleTest(sectionId, testCase);
    }
    
    dispatch('activeTestCaseChanged', { sectionId, testCase });
  }
  
  // Toggle test cases panel for a section
  export function toggleTestCases(sectionId: number) {
    expandedTestCases[sectionId] = !expandedTestCases[sectionId];
    dispatch('testCasesToggled', { sectionId, expanded: expandedTestCases[sectionId] });
  }
  
  // Validate test output against expectations
  function validateTestOutput(actual: string, expected?: string, matchType: string = 'contains'): boolean {
    const actualText = stripHTML(actual).trim();
    const expectedText = (expected || '').trim();
    
    if (!expectedText) return true; // No expectation means pass
    
    switch (matchType) {
      case 'exact':
        return actualText === expectedText;
      case 'contains':
        return actualText.includes(expectedText);
      case 'regex':
        try {
          const regex = new RegExp(expectedText);
          return regex.test(actualText);
        } catch {
          return false;
        }
      default:
        return actualText.includes(expectedText);
    }
  }
  
  // Validate styles
  function validateStyles(actualStyles: Record<string, string>, expectedStyles?: Record<string, string>): { 
    passed: boolean; 
    mismatches: Record<string, { expected: string; actual: string }> 
  } {
    if (!expectedStyles || Object.keys(expectedStyles).length === 0) {
      return { passed: true, mismatches: {} };
    }
    
    const mismatches: Record<string, { expected: string; actual: string }> = {};
    
    for (const [prop, expectedValue] of Object.entries(expectedStyles)) {
      const actualValue = actualStyles[prop] || '';
      if (actualValue !== expectedValue) {
        mismatches[prop] = { expected: expectedValue, actual: actualValue };
      }
    }
    
    return {
      passed: Object.keys(mismatches).length === 0,
      mismatches
    };
  }
  
  // Run a single test case
  export function runSingleTest(sectionId: number, testCase: TestCase): TestResult {
    const section = sections.find(s => s.id === sectionId) as DynamicSection;
    if (!section) {
      return { passed: false, output: '', error: 'Section not found' };
    }
    
    // Evaluate the code with test variables
    const output = evaluateCode(section.content, testCase.variables || {});
    
    // Validate output if expectations exist
    const outputPassed = validateTestOutput(output, testCase.expectedOutput, testCase.matchType);
    
    // Extract and validate styles if style expectations exist
    const actualStyles = extractStylesFromHTML(output);
    const styleValidation = validateStyles(actualStyles, testCase.expectedStyles);
    
    const result: TestResult = {
      passed: outputPassed && styleValidation.passed,
      output,
      expectedOutput: testCase.expectedOutput,
      outputPassed,
      stylesPassed: styleValidation.passed,
      actualStyles,
      expectedStyles: testCase.expectedStyles
    };
    
    // Store the result for display
    if (!currentTestResults[sectionId]) {
      currentTestResults[sectionId] = [];
    }
    
    const testIndex = section.testCases?.findIndex(tc => tc === testCase) ?? -1;
    if (testIndex !== -1) {
      currentTestResults[sectionId][testIndex] = result;
      
      // Update the test case with the result
      updateTestCase(sectionId, testIndex, {
        ...testCase,
        lastResult: result
      });
    }
    
    dispatch('testExecuted', { sectionId, testCase, result });
    
    return result;
  }
  
  // Run all tests for a section
  export function runSectionTests(sectionId: number): SectionTestResult {
    const section = sections.find(s => s.id === sectionId) as DynamicSection;
    if (!section?.testCases) {
      return { sectionId, passed: 0, failed: 0, results: [] };
    }
    
    const results: TestResult[] = [];
    let passed = 0;
    let failed = 0;
    
    for (const testCase of section.testCases) {
      if (testCase.expectedOutput || testCase.expectedStyles) {
        const result = runSingleTest(sectionId, testCase);
        results.push(result);
        
        if (result.passed) {
          passed++;
        } else {
          failed++;
        }
      }
    }
    
    return { sectionId, passed, failed, results };
  }
  
  // Run all tests across all sections
  export function runAllTests() {
    const sectionResults: SectionTestResult[] = [];
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let sectionsWithTests = 0;
    
    for (const section of sections) {
      if (section.type === 'dynamic') {
        const sectionResult = runSectionTests(section.id);
        
        if (sectionResult.results.length > 0) {
          sectionResults.push(sectionResult);
          sectionsWithTests++;
          totalTests += sectionResult.results.length;
          passedTests += sectionResult.passed;
          failedTests += sectionResult.failed;
        }
      }
    }
    
    const summary: TestSummary = {
      totalSections: sections.filter(s => s.type === 'dynamic').length,
      sectionsWithTests,
      totalTests,
      passedTests,
      failedTests,
      sectionResults,
      timestamp: new Date()
    };
    
    testSummary = summary;
    showTestSummary = true;
    onTestSummaryUpdate(summary);
    
    dispatch('allTestsCompleted', { summary });
    
    return summary;
  }
  
  // Handle imported tests
  export function handleImportTests(sectionId: number, testsToImport: TestCase[]) {
    const section = sections.find(s => s.id === sectionId) as DynamicSection;
    if (!section) return;
    
    // Add imported tests to the section
    section.testCases = [...(section.testCases || []), ...testsToImport];
    
    dispatch('testsImported', { sectionId, tests: testsToImport });
  }
  
  // Get test results for a section
  export function getSectionTestResults(sectionId: number): TestResult[] {
    return currentTestResults[sectionId] || [];
  }
  
  // Clear all test results
  export function clearTestResults() {
    currentTestResults = {};
    testSummary = null;
    showTestSummary = false;
    onTestSummaryUpdate(null);
    
    dispatch('testResultsCleared');
  }
</script>

{#if showTestSummary && testSummary}
  <div class="test-summary-modal">
    <div class="modal-backdrop" onclick={() => showTestSummary = false}></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Test Results Summary</h2>
        <button class="close-btn" onclick={() => showTestSummary = false}>×</button>
      </div>
      
      <div class="summary-stats">
        <div class="stat {testSummary.failedTests === 0 ? 'all-passed' : 'has-failures'}">
          <div class="stat-label">Overall</div>
          <div class="stat-value">
            {testSummary.passedTests}/{testSummary.totalTests} Passed
          </div>
          {#if testSummary.failedTests === 0}
            <div class="stat-badge success">✓ All tests passed!</div>
          {:else}
            <div class="stat-badge failure">{testSummary.failedTests} failed</div>
          {/if}
        </div>
        
        <div class="stat">
          <div class="stat-label">Sections</div>
          <div class="stat-value">{testSummary.sectionsWithTests}/{testSummary.totalSections}</div>
          <div class="stat-detail">with tests</div>
        </div>
      </div>
      
      <div class="section-results">
        {#each testSummary.sectionResults as sectionResult}
          <div class="section-result {sectionResult.failed === 0 ? 'passed' : 'failed'}">
            <div class="section-header">
              <span class="section-id">Section #{sectionResult.sectionId}</span>
              <span class="section-stats">
                {sectionResult.passed} passed, {sectionResult.failed} failed
              </span>
            </div>
            
            {#if sectionResult.failed > 0}
              <div class="failed-tests">
                {#each sectionResult.results as result, index}
                  {#if !result.passed}
                    <div class="failed-test">
                      <div class="test-name">Test {index + 1}</div>
                      {#if !result.outputPassed}
                        <div class="failure-reason">Output mismatch</div>
                      {/if}
                      {#if !result.stylesPassed}
                        <div class="failure-reason">Style mismatch</div>
                      {/if}
                    </div>
                  {/if}
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .test-summary-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .modal-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
  }
  
  .modal-content {
    position: relative;
    background: white;
    border-radius: 8px;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
  }
  
  .close-btn:hover {
    color: #000;
  }
  
  .summary-stats {
    padding: 1.5rem;
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1rem;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .stat {
    text-align: center;
  }
  
  .stat-label {
    font-size: 0.875rem;
    color: #666;
    margin-bottom: 0.5rem;
  }
  
  .stat-value {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  
  .stat-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .stat-badge.success {
    background: #d4edda;
    color: #155724;
  }
  
  .stat-badge.failure {
    background: #f8d7da;
    color: #721c24;
  }
  
  .stat-detail {
    font-size: 0.875rem;
    color: #666;
  }
  
  .stat.all-passed .stat-value {
    color: #28a745;
  }
  
  .stat.has-failures .stat-value {
    color: #dc3545;
  }
  
  .section-results {
    padding: 1rem;
    overflow-y: auto;
    flex: 1;
  }
  
  .section-result {
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    margin-bottom: 0.5rem;
    padding: 0.75rem;
  }
  
  .section-result.passed {
    border-color: #28a745;
    background: #f8fff9;
  }
  
  .section-result.failed {
    border-color: #dc3545;
    background: #fff8f8;
  }
  
  .section-result .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .section-id {
    font-weight: 600;
  }
  
  .section-stats {
    font-size: 0.875rem;
    color: #666;
  }
  
  .failed-tests {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #e0e0e0;
  }
  
  .failed-test {
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
  }
  
  .test-name {
    font-weight: 500;
    color: #dc3545;
  }
  
  .failure-reason {
    margin-left: 1rem;
    color: #666;
    font-size: 0.8rem;
  }
</style>