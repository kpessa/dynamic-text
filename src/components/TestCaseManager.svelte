<script>
  let {
    section,
    onAddTestCase = () => {},
    onUpdateTestCase = () => {},
    onDeleteTestCase = () => {},
    onSetActiveTestCase = () => {},
    onRunTest = () => {},
    onRunAllTests = () => {},
    onGenerateTests = () => {},
    onToggleTests = () => {}
  } = $props();
  
  function addVariable(testCaseIndex) {
    const key = prompt('Enter variable name:');
    if (key) {
      const currentVars = section.testCases[testCaseIndex].variables || {};
      onUpdateTestCase(testCaseIndex, {
        variables: { ...currentVars, [key]: '' }
      });
    }
  }
  
  function updateVariable(testCaseIndex, key, value) {
    const currentVars = section.testCases[testCaseIndex].variables || {};
    onUpdateTestCase(testCaseIndex, {
      variables: { ...currentVars, [key]: value }
    });
  }
  
  function deleteVariable(testCaseIndex, key) {
    const currentVars = { ...(section.testCases[testCaseIndex].variables || {}) };
    delete currentVars[key];
    onUpdateTestCase(testCaseIndex, { variables: currentVars });
  }
  
  function addStyleExpectation(testCaseIndex) {
    const prop = prompt('Enter CSS property name:');
    if (prop) {
      const currentStyles = section.testCases[testCaseIndex].expectedStyles || {};
      onUpdateTestCase(testCaseIndex, {
        expectedStyles: { ...currentStyles, [prop]: '' }
      });
    }
  }
  
  function updateStyleExpectation(testCaseIndex, prop, value) {
    const currentStyles = section.testCases[testCaseIndex].expectedStyles || {};
    onUpdateTestCase(testCaseIndex, {
      expectedStyles: { ...currentStyles, [prop]: value }
    });
  }
  
  function deleteStyleExpectation(testCaseIndex, prop) {
    const currentStyles = { ...(section.testCases[testCaseIndex].expectedStyles || {}) };
    delete currentStyles[prop];
    onUpdateTestCase(testCaseIndex, { expectedStyles: currentStyles });
  }
</script>

{#if section.type === 'dynamic'}
  <div class="test-cases">
    <div class="test-cases-header">
      <button 
        class="test-cases-toggle"
        onclick={onToggleTests}
      >
        <span class="collapse-icon">{section.showTests ? '▼' : '▶'}</span>
        <h4>Test Cases</h4>
        {#if section.testCases && section.testCases.length > 0}
          <span class="test-count">({section.testCases.length})</span>
        {/if}
        {#if section.activeTestCase}
          <span class="active-test-badge">Active: {section.activeTestCase.name}</span>
        {/if}
      </button>
      
      <div class="test-actions">
        {#if section.showTests}
          <button class="add-test-btn" onclick={onAddTestCase}>
            + Add Test
          </button>
          <button class="run-all-btn" onclick={onRunAllTests}>
            Run All Tests
          </button>
          <button class="ai-inspector-btn" onclick={onGenerateTests}>
            🤖 Generate Tests
          </button>
        {/if}
      </div>
    </div>
    
    {#if section.showTests && section.testCases}
      <div class="test-case-list">
        {#each section.testCases as testCase, index}
          <div 
            class="test-case"
            class:active={section.activeTestCase === testCase}
          >
            <div class="test-case-header">
              <input
                type="text"
                class="test-case-name"
                value={testCase.name}
                onchange={(e) => onUpdateTestCase(index, { name: e.target.value })}
                placeholder="Test name..."
              />
              <button 
                class="test-case-run"
                class:running={section.activeTestCase === testCase}
                onclick={() => {
                  onSetActiveTestCase(testCase);
                  onRunTest(testCase);
                }}
              >
                {section.activeTestCase === testCase ? 'Active' : 'Run'}
              </button>
              <button 
                class="test-case-delete"
                onclick={() => onDeleteTestCase(index)}
              >
                Delete
              </button>
            </div>
            
            <div class="test-variables">
              <div class="variable-header">
                <span>Variables</span>
                <button 
                  class="add-var-btn"
                  onclick={() => addVariable(index)}
                >
                  + Add
                </button>
              </div>
              
              {#if testCase.variables}
                {#each Object.entries(testCase.variables) as [key, value]}
                  <div class="variable-row">
                    <span class="var-name">{key}:</span>
                    <input
                      type="text"
                      class="var-value"
                      value={value}
                      onchange={(e) => updateVariable(index, key, e.target.value)}
                      placeholder="Value..."
                    />
                    <button 
                      class="var-delete"
                      onclick={() => deleteVariable(index, key)}
                    >
                      ×
                    </button>
                  </div>
                {/each}
              {/if}
            </div>
            
            <div class="test-expectations">
              <div class="expectation-header">
                <span>Expected Output</span>
                <select 
                  class="match-type-select"
                  value={testCase.matchType || 'contains'}
                  onchange={(e) => onUpdateTestCase(index, { matchType: e.target.value })}
                >
                  <option value="contains">Contains</option>
                  <option value="exact">Exact Match</option>
                  <option value="regex">Regex</option>
                </select>
              </div>
              <textarea
                class="expected-output"
                value={testCase.expectedOutput || ''}
                onchange={(e) => onUpdateTestCase(index, { expectedOutput: e.target.value })}
                placeholder="Enter expected output..."
              />
              
              <div class="expectation-header">
                <span>Expected Styles</span>
                <button 
                  class="add-style-btn"
                  onclick={() => addStyleExpectation(index)}
                >
                  + Add
                </button>
              </div>
              
              {#if testCase.expectedStyles}
                {#each Object.entries(testCase.expectedStyles) as [prop, value]}
                  <div class="style-row">
                    <span class="style-prop">{prop}:</span>
                    <input
                      type="text"
                      class="style-value"
                      value={value}
                      onchange={(e) => updateStyleExpectation(index, prop, e.target.value)}
                      placeholder="Value..."
                    />
                    <button 
                      class="style-delete"
                      onclick={() => deleteStyleExpectation(index, prop)}
                    >
                      ×
                    </button>
                  </div>
                {/each}
              {/if}
            </div>
            
            {#if section.testResults && section.testResults[index]}
              {@const result = section.testResults[index]}
              <div class="test-result" class:passed={result.passed} class:failed={!result.passed}>
                <div class="result-header">
                  {result.passed ? '✅ Test Passed' : '❌ Test Failed'}
                </div>
                {#if !result.passed && result.error}
                  <div class="result-error">{result.error}</div>
                {/if}
                {#if result.actualOutput}
                  <div class="result-detail">
                    <strong>Actual Output:</strong> {result.actualOutput}
                  </div>
                {/if}
                {#if result.actualStyles && Object.keys(result.actualStyles).length > 0}
                  <div class="result-detail">
                    <strong>Actual Styles:</strong> {JSON.stringify(result.actualStyles)}
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .test-cases {
    padding: 0.5rem;
    border-top: 1px solid #444;
    background-color: rgba(255, 255, 255, 0.02);
  }
  
  .test-cases-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .test-cases-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    transition: background-color 0.2s;
    text-align: left;
  }
  
  .test-cases-toggle:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  .collapse-icon {
    font-size: 0.8rem;
    color: #999;
    transition: transform 0.2s;
  }
  
  .test-cases-toggle h4 {
    margin: 0;
    font-size: 0.9rem;
    color: #ffc107;
  }
  
  .test-count {
    font-size: 0.8rem;
    color: #999;
  }
  
  .active-test-badge {
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;
    background-color: #ffc107;
    color: #000;
    border-radius: 12px;
    font-weight: 500;
  }
  
  .test-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .add-test-btn, .run-all-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .add-test-btn:hover, .run-all-btn:hover {
    background-color: #5a6268;
  }
  
  .ai-inspector-btn {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
  }
  
  .ai-inspector-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
  }
  
  .test-case-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .test-case {
    padding: 0.5rem;
    border: 1px solid #444;
    border-radius: 4px;
    background-color: rgba(255, 255, 255, 0.02);
  }
  
  .test-case.active {
    border-color: #ffc107;
    background-color: rgba(255, 193, 7, 0.1);
  }
  
  .test-case-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .test-case-name {
    flex: 1;
    padding: 0.25rem;
    background-color: rgba(255, 255, 255, 0.05);
    border: 1px solid #444;
    border-radius: 4px;
    color: #ccc;
    font-size: 0.9rem;
  }
  
  .test-case-run {
    padding: 0.25rem 0.5rem;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
  }
  
  .test-case-run:hover {
    background-color: #218838;
  }
  
  .test-case-run.running {
    background-color: #dc3545;
  }
  
  .test-case-delete {
    padding: 0.25rem 0.5rem;
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
  }
  
  .test-variables {
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
  }
  
  .variable-header, .expectation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    color: #999;
    font-size: 0.85rem;
    font-weight: 500;
  }
  
  .add-var-btn, .add-style-btn {
    padding: 0.2rem 0.4rem;
    font-size: 0.75rem;
    background-color: #17a2b8;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .variable-row, .style-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }
  
  .var-name {
    color: #17a2b8;
    min-width: 100px;
  }
  
  .style-prop {
    color: #6c757d;
    min-width: 100px;
    font-size: 0.85rem;
  }
  
  .var-value, .style-value {
    flex: 1;
    padding: 0.2rem;
    background-color: rgba(255, 255, 255, 0.05);
    border: 1px solid #444;
    border-radius: 4px;
    color: #ccc;
    font-size: 0.85rem;
  }
  
  .var-delete, .style-delete {
    padding: 0.2rem 0.4rem;
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
  }
  
  .test-expectations {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #444;
  }
  
  .match-type-select {
    padding: 0.2rem 0.4rem;
    font-size: 0.75rem;
    border: 1px solid #444;
    border-radius: 4px;
    background-color: rgba(255, 255, 255, 0.05);
    color: #ccc;
  }
  
  .expected-output {
    width: 100%;
    min-height: 60px;
    padding: 0.5rem;
    font-size: 0.85rem;
    border: 1px solid #444;
    border-radius: 4px;
    background-color: rgba(255, 255, 255, 0.05);
    color: #ccc;
    resize: vertical;
    margin-bottom: 1rem;
  }
  
  .test-result {
    margin-top: 1rem;
    padding: 0.75rem;
    border-radius: 4px;
    font-size: 0.85rem;
  }
  
  .test-result.passed {
    background-color: rgba(40, 167, 69, 0.2);
    border: 1px solid #28a745;
    color: #28a745;
  }
  
  .test-result.failed {
    background-color: rgba(220, 53, 69, 0.2);
    border: 1px solid #dc3545;
    color: #dc3545;
  }
  
  .result-header {
    font-weight: bold;
    margin-bottom: 0.5rem;
  }
  
  .result-error {
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
  
  .result-detail {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    word-break: break-word;
  }
</style>