<script lang="ts">
  import type { TestCase, TestResult } from '../types';
  
  interface Props {
    testCase: TestCase;
    result: TestResult;
    index: number;
  }
  
  let { testCase, result, index }: Props = $props();
  
  // Create a simple diff view for failed tests
  function createDiff(expected: string, actual: string): string[] {
    const expectedLines = expected.split('\n');
    const actualLines = actual.split('\n');
    const maxLines = Math.max(expectedLines.length, actualLines.length);
    const diffLines: string[] = [];
    
    for (let i = 0; i < maxLines; i++) {
      const expectedLine = expectedLines[i] || '';
      const actualLine = actualLines[i] || '';
      
      if (expectedLine !== actualLine) {
        if (expectedLine) {
          diffLines.push(`- ${expectedLine}`);
        }
        if (actualLine) {
          diffLines.push(`+ ${actualLine}`);
        }
      } else {
        diffLines.push(`  ${expectedLine}`);
      }
    }
    
    return diffLines;
  }
  
  const showDiff = $derived(
    !result.passed && 
    testCase.expectedOutput && 
    result.actualOutput &&
    testCase.matchType === 'exact'
  );
  
  const diffLines = $derived(
    showDiff ? createDiff(testCase.expectedOutput || '', result.actualOutput || '') : []
  );
  
  const executionTime = $derived(
    result.executionTime ? new Date(result.executionTime).toLocaleTimeString() : null
  );
</script>

<div class="test-result {result.passed ? 'passed' : 'failed'}">
  <div class="result-header">
    <span class="result-status">
      {result.passed ? '✅' : '❌'} Test #{index + 1}: {testCase.name}
    </span>
    {#if executionTime}
      <span class="execution-time">
        {executionTime}
      </span>
    {/if}
  </div>
  
  {#if !result.passed}
    {#if result.error}
      <div class="result-error">
        <strong>Error:</strong>
        <pre>{result.error}</pre>
      </div>
    {/if}
    
    {#if showDiff}
      <div class="result-diff">
        <div class="diff-header">Output Diff (- expected, + actual):</div>
        <pre class="diff-content">
{#each diffLines as line}
<span class="{line.startsWith('-') ? 'diff-removed' : line.startsWith('+') ? 'diff-added' : 'diff-unchanged'}">{line}</span>
{/each}
        </pre>
      </div>
    {:else if testCase.expectedOutput && result.actualOutput}
      <div class="result-comparison">
        <div class="comparison-section">
          <strong>Expected ({testCase.matchType || 'contains'}):</strong>
          <pre>{testCase.expectedOutput}</pre>
        </div>
        <div class="comparison-section">
          <strong>Actual:</strong>
          <pre>{result.actualOutput}</pre>
        </div>
      </div>
    {/if}
    
    {#if testCase.expectedStyles && result.actualStyles}
      <div class="style-comparison">
        <strong>Style Comparison:</strong>
        <table class="style-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Expected</th>
              <th>Actual</th>
            </tr>
          </thead>
          <tbody>
            {#each Object.entries(testCase.expectedStyles) as [prop, expectedValue]}
              <tr class="{result.actualStyles[prop] === expectedValue ? 'style-match' : 'style-mismatch'}">
                <td>{prop}</td>
                <td>{expectedValue}</td>
                <td>{result.actualStyles[prop] || 'undefined'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {:else}
    <div class="result-success">
      Test passed successfully!
      {#if result.actualOutput}
        <div class="actual-output">
          <strong>Output:</strong>
          <pre>{result.actualOutput}</pre>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .test-result {
    margin: 1rem 0;
    padding: 1rem;
    border-radius: 8px;
    border: 2px solid;
  }
  
  .test-result.passed {
    border-color: #28a745;
    background: #f0f9f1;
  }
  
  .test-result.failed {
    border-color: #dc3545;
    background: #fef5f6;
  }
  
  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    font-weight: 600;
    font-size: 1rem;
  }
  
  .result-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .execution-time {
    font-size: 0.8rem;
    color: #6c757d;
    font-weight: normal;
  }
  
  .result-error {
    padding: 0.75rem;
    background: rgba(220, 53, 69, 0.1);
    border-radius: 6px;
    margin-bottom: 1rem;
  }
  
  .result-error pre {
    margin: 0.5rem 0 0 0;
    color: #721c24;
    font-size: 0.85rem;
    white-space: pre-wrap;
    word-break: break-word;
  }
  
  .result-diff {
    margin: 1rem 0;
    padding: 0.75rem;
    background: #f8f9fa;
    border-radius: 6px;
  }
  
  .diff-header {
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #495057;
  }
  
  .diff-content {
    margin: 0;
    padding: 0.5rem;
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    font-family: 'Fira Code', 'Monaco', 'Menlo', monospace;
    font-size: 0.85rem;
    overflow-x: auto;
  }
  
  .diff-removed {
    color: #dc3545;
    background: rgba(220, 53, 69, 0.1);
    display: block;
  }
  
  .diff-added {
    color: #28a745;
    background: rgba(40, 167, 69, 0.1);
    display: block;
  }
  
  .diff-unchanged {
    color: #6c757d;
    display: block;
  }
  
  .result-comparison {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin: 1rem 0;
  }
  
  .comparison-section {
    padding: 0.75rem;
    background: #f8f9fa;
    border-radius: 6px;
  }
  
  .comparison-section strong {
    display: block;
    margin-bottom: 0.5rem;
    color: #495057;
  }
  
  .comparison-section pre {
    margin: 0;
    padding: 0.5rem;
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    font-size: 0.85rem;
    white-space: pre-wrap;
    word-break: break-word;
  }
  
  .style-comparison {
    margin-top: 1rem;
    padding: 0.75rem;
    background: #f8f9fa;
    border-radius: 6px;
  }
  
  .style-table {
    width: 100%;
    margin-top: 0.5rem;
    border-collapse: collapse;
    background: white;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .style-table th {
    padding: 0.5rem;
    background: #e9ecef;
    font-weight: 600;
    text-align: left;
    font-size: 0.85rem;
  }
  
  .style-table td {
    padding: 0.5rem;
    border-top: 1px solid #dee2e6;
    font-size: 0.85rem;
    font-family: 'Fira Code', 'Monaco', 'Menlo', monospace;
  }
  
  .style-match {
    background: rgba(40, 167, 69, 0.05);
  }
  
  .style-mismatch {
    background: rgba(220, 53, 69, 0.05);
  }
  
  .result-success {
    color: #155724;
  }
  
  .actual-output {
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgba(40, 167, 69, 0.05);
    border-radius: 6px;
  }
  
  .actual-output strong {
    display: block;
    margin-bottom: 0.5rem;
  }
  
  .actual-output pre {
    margin: 0;
    padding: 0.5rem;
    background: white;
    border: 1px solid rgba(40, 167, 69, 0.2);
    border-radius: 4px;
    font-size: 0.85rem;
    white-space: pre-wrap;
    word-break: break-word;
  }
  
  @media (max-width: 768px) {
    .result-comparison {
      grid-template-columns: 1fr;
    }
  }
</style>