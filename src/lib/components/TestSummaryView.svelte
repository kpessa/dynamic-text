<script lang="ts">
  import { sectionStore } from '../../stores/sectionStore.svelte.ts';
  import { testStore } from '../../stores/testStore.svelte.ts';
  import { runTestCase } from '../services/testingService';
  import TestResultDisplay from './TestResultDisplay.svelte';
  
  interface TestSummary {
    sections: Array<{
      sectionId: number;
      sectionName: string;
      results: Array<{
        testCase: any;
        result: any;
      }>;
    }>;
    summary: {
      total: number;
      passed: number;
      failed: number;
      timestamp: number;
    };
  }
  
  let isRunningTests = $state(false);
  let testProgress = $state({ current: 0, total: 0 });
  let testSummary = $state<TestSummary | null>(null);
  let showSummary = $state(false);
  let exportFormat = $state<'json' | 'csv' | 'html'>('json');
  
  const sections = $derived(sectionStore.sections);
  const dynamicSections = $derived(sections.filter(s => s.type === 'dynamic'));
  
  async function runAllTests() {
    if (isRunningTests) return;
    
    isRunningTests = true;
    testSummary = null;
    
    const allResults: TestSummary['sections'] = [];
    
    // Count total tests
    let totalTests = 0;
    dynamicSections.forEach(section => {
      if (section.testCases) {
        totalTests += section.testCases.filter(tc => 
          tc.expected || tc.expectedOutput || tc.expectedStyles
        ).length;
      }
    });
    
    testProgress = { current: 0, total: totalTests };
    
    // Run tests for each section
    for (const section of dynamicSections) {
      if (section.testCases && section.testCases.length > 0) {
        const sectionResults = [];
        
        for (const testCase of section.testCases) {
          if (testCase.expected || testCase.expectedOutput || testCase.expectedStyles) {
            const result = runTestCase(section.content, testCase);
            sectionResults.push({ testCase, result });
            testProgress.current++;
            
            // Update UI periodically
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
        
        if (sectionResults.length > 0) {
          allResults.push({
            sectionId: section.id,
            sectionName: section.name || `Section ${section.id}`,
            results: sectionResults
          });
        }
      }
    }
    
    // Calculate summary
    const total = allResults.reduce((sum, sr) => sum + sr.results.length, 0);
    const passed = allResults.reduce((sum, sr) => 
      sum + sr.results.filter(r => r.result.passed).length, 0);
    
    testSummary = {
      sections: allResults,
      summary: {
        total,
        passed,
        failed: total - passed,
        timestamp: Date.now()
      }
    };
    
    showSummary = true;
    isRunningTests = false;
    testProgress = { current: 0, total: 0 };
    
    // Store in testStore for persistence
    testStore.setTestSummary(testSummary);
  }
  
  function exportTestResults() {
    if (!testSummary) return;
    
    let content = '';
    let filename = `test-results-${new Date().toISOString().split('T')[0]}`;
    let mimeType = '';
    
    switch (exportFormat) {
      case 'json':
        content = JSON.stringify(testSummary, null, 2);
        filename += '.json';
        mimeType = 'application/json';
        break;
        
      case 'csv':
        const csvRows = ['Section,Test Name,Status,Error'];
        testSummary.sections.forEach(section => {
          section.results.forEach(({ testCase, result }) => {
            csvRows.push([
              section.sectionName,
              testCase.name,
              result.passed ? 'PASSED' : 'FAILED',
              result.error || ''
            ].map(v => `"${v}"`).join(','));
          });
        });
        content = csvRows.join('\n');
        filename += '.csv';
        mimeType = 'text/csv';
        break;
        
      case 'html':
        content = generateHTMLReport(testSummary);
        filename += '.html';
        mimeType = 'text/html';
        break;
    }
    
    // Create download link
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  function generateHTMLReport(summary: TestSummary): string {
    const passRate = ((summary.summary.passed / summary.summary.total) * 100).toFixed(1);
    
    return `<!DOCTYPE html>
<html>
<head>
  <title>Test Results Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .summary { display: flex; gap: 20px; margin: 20px 0; }
    .stat { flex: 1; padding: 15px; background: white; border: 1px solid #dee2e6; border-radius: 6px; text-align: center; }
    .stat.passed { border-color: #28a745; background: #d4edda; }
    .stat.failed { border-color: #dc3545; background: #f8d7da; }
    .section { margin: 20px 0; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; }
    .test { margin: 10px 0; padding: 10px; border-left: 3px solid; }
    .test.passed { border-color: #28a745; background: #f0f9f1; }
    .test.failed { border-color: #dc3545; background: #fef5f6; }
    .error { color: #721c24; margin-top: 5px; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Test Results Report</h1>
    <p>Generated: ${new Date(summary.summary.timestamp).toLocaleString()}</p>
  </div>
  
  <div class="summary">
    <div class="stat">
      <h3>Total Tests</h3>
      <p style="font-size: 2em;">${summary.summary.total}</p>
    </div>
    <div class="stat passed">
      <h3>Passed</h3>
      <p style="font-size: 2em;">${summary.summary.passed}</p>
    </div>
    <div class="stat failed">
      <h3>Failed</h3>
      <p style="font-size: 2em;">${summary.summary.failed}</p>
    </div>
    <div class="stat">
      <h3>Pass Rate</h3>
      <p style="font-size: 2em;">${passRate}%</p>
    </div>
  </div>
  
  ${summary.sections.map(section => `
    <div class="section">
      <h2>${section.sectionName}</h2>
      ${section.results.map(({ testCase, result }) => `
        <div class="test ${result.passed ? 'passed' : 'failed'}">
          <strong>${result.passed ? '✅' : '❌'} ${testCase.name}</strong>
          ${result.error ? `<div class="error">Error: ${result.error}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `).join('')}
</body>
</html>`;
  }
  
  // Coverage metrics calculation
  const testCoverage = $derived.by(() => {
    const totalSections = dynamicSections.length;
    const sectionsWithTests = dynamicSections.filter(s => 
      s.testCases && s.testCases.length > 0
    ).length;
    const sectionsWithExpectations = dynamicSections.filter(s => 
      s.testCases && s.testCases.some(tc => 
        tc.expected || tc.expectedOutput || tc.expectedStyles
      )
    ).length;
    
    return {
      totalSections,
      sectionsWithTests,
      sectionsWithExpectations,
      coveragePercent: totalSections > 0 
        ? ((sectionsWithExpectations / totalSections) * 100).toFixed(1)
        : '0'
    };
  });
</script>

<div class="test-summary-container">
  <div class="test-controls">
    <button 
      onclick={runAllTests}
      disabled={isRunningTests || dynamicSections.length === 0}
      class="run-all-btn"
    >
      {#if isRunningTests}
        🔄 Running Tests... ({testProgress.current}/{testProgress.total})
      {:else}
        ▶️ Run All Tests
      {/if}
    </button>
    
    {#if testSummary}
      <button 
        onclick={() => showSummary = !showSummary}
        class="summary-btn"
      >
        📊 {showSummary ? 'Hide' : 'Show'} Summary 
        ({testSummary.summary.passed}/{testSummary.summary.total})
      </button>
      
      <div class="export-controls">
        <select bind:value={exportFormat} class="export-select">
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
          <option value="html">HTML Report</option>
        </select>
        <button onclick={exportTestResults} class="export-btn">
          📥 Export Results
        </button>
      </div>
    {/if}
  </div>
  
  <div class="coverage-metrics">
    <span class="metric">
      📊 Test Coverage: {testCoverage.coveragePercent}%
    </span>
    <span class="metric">
      📝 Sections with tests: {testCoverage.sectionsWithTests}/{testCoverage.totalSections}
    </span>
    <span class="metric">
      ✅ Sections with expectations: {testCoverage.sectionsWithExpectations}/{testCoverage.totalSections}
    </span>
  </div>
  
  {#if isRunningTests}
    <div class="progress-bar-container">
      <div 
        class="progress-bar"
        style="width: {(testProgress.current / testProgress.total) * 100}%"
      />
    </div>
  {/if}
  
  {#if showSummary && testSummary}
    <div class="summary-modal">
      <div class="summary-content">
        <div class="summary-header">
          <h2>Test Results Summary</h2>
          <button onclick={() => showSummary = false} class="close-btn">×</button>
        </div>
        
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
          {#each testSummary.sections as section}
            <div class="section-result">
              <h3>{section.sectionName}</h3>
              <div class="test-list">
                {#each section.results as { testCase, result }, index}
                  <TestResultDisplay {testCase} {result} {index} />
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .test-summary-container {
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    margin: 1rem 0;
  }
  
  .test-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }
  
  .run-all-btn {
    padding: 0.75rem 1.5rem;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.2s;
  }
  
  .run-all-btn:hover:not(:disabled) {
    background: #218838;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
  }
  
  .run-all-btn:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
  
  .summary-btn {
    padding: 0.75rem 1.5rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;
  }
  
  .summary-btn:hover {
    background: #0056b3;
  }
  
  .export-controls {
    display: flex;
    gap: 0.5rem;
    margin-left: auto;
  }
  
  .export-select {
    padding: 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    background: white;
    font-size: 0.9rem;
  }
  
  .export-btn {
    padding: 0.5rem 1rem;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }
  
  .export-btn:hover {
    background: #5a6268;
  }
  
  .coverage-metrics {
    display: flex;
    gap: 2rem;
    margin-top: 1rem;
    padding: 0.75rem;
    background: white;
    border-radius: 6px;
    font-size: 0.9rem;
  }
  
  .metric {
    color: #495057;
  }
  
  .progress-bar-container {
    margin-top: 1rem;
    height: 8px;
    background: #e9ecef;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .progress-bar {
    height: 100%;
    background: #007bff;
    transition: width 0.3s;
  }
  
  .summary-modal {
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
  
  .summary-content {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    max-width: 90%;
    width: 1200px;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  .summary-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .summary-header h2 {
    margin: 0;
    color: #212529;
  }
  
  .close-btn {
    width: 2rem;
    height: 2rem;
    border: none;
    background: #dc3545;
    color: white;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .close-btn:hover {
    background: #c82333;
  }
  
  .summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .stat {
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    text-align: center;
  }
  
  .stat.passed {
    background: #d4edda;
    color: #155724;
  }
  
  .stat.failed {
    background: #f8d7da;
    color: #721c24;
  }
  
  .stat-label {
    display: block;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
    opacity: 0.8;
  }
  
  .stat-value {
    display: block;
    font-size: 1.8rem;
    font-weight: bold;
  }
  
  .section-results {
    margin-top: 2rem;
  }
  
  .section-result {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: #f8f9fa;
    border-radius: 8px;
  }
  
  .section-result h3 {
    margin: 0 0 1rem 0;
    color: #495057;
  }
  
  .test-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  @media (max-width: 768px) {
    .test-controls {
      flex-direction: column;
      align-items: stretch;
    }
    
    .export-controls {
      margin-left: 0;
      margin-top: 0.5rem;
    }
    
    .coverage-metrics {
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .summary-content {
      padding: 1rem;
    }
  }
</style>