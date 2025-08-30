<script>
  import CodeEditor from '../CodeEditor.svelte';
  import TestGeneratorButton from '../TestGeneratorButton.svelte';
  import EmptyState from './EmptyState.svelte';
  import { getIngredientBadgeColor } from '../utils/colorUtils.ts';
  
  export let sections = [];
  export let editingSection = null;
  export let expandedTestCases = {};
  export let activeTestCase = {};
  export let ingredientsBySection = {};
  export let tpnMode = false;
  export let draggedSection = null;
  
  export let onSectionAdd = () => {};
  export let onSectionDelete = () => {};
  export let onSectionUpdate = () => {};
  export let onSectionDragStart = () => {};
  export let onSectionDragOver = () => {};
  export let onSectionDrop = () => {};
  export let onSectionDragEnd = () => {};
  export let onTestCaseToggle = () => {};
  export let onTestCaseAdd = () => {};
  export let onTestCaseUpdate = () => {};
  export let onTestCaseDelete = () => {};
  export let onActiveTestCaseSet = () => {};
  export let onTestsGenerated = () => {};
  export let onAIInspectorOpen = () => {};
  export let onConvertToDynamic = () => {};
  export let onEditingSectionChange = () => {};
  
  function addVariable(sectionId, testIndex) {
    const varName = prompt('Variable name:');
    if (varName) {
      const section = sections.find(s => s.id === sectionId);
      if (section && section.testCases && section.testCases[testIndex]) {
        const testCase = section.testCases[testIndex];
        const vars = { ...testCase.variables, [varName]: 0 };
        onTestCaseUpdate(sectionId, testIndex, { variables: vars });
      }
    }
  }
</script>

<div class="sections" role="list">
  {#if sections.length === 0}
    <EmptyState 
      onAddStatic={() => onSectionAdd('static')}
      onAddDynamic={() => onSectionAdd('dynamic')}
    />
  {:else}
    {#each sections as section (section.id)}
      <div 
        class="section {draggedSection?.id === section.id ? 'dragging' : ''} {editingSection === section.id ? 'editing' : ''}"
        role="listitem"
        draggable="true"
        ondragstart={(e) => onSectionDragStart(e, section)}
        ondragover={onSectionDragOver}
        ondrop={(e) => onSectionDrop(e, section)}
        ondragend={onSectionDragEnd}
      >
        <div class="section-header">
          <span class="drag-handle">≡</span>
          <span class="section-type {section.type}">
            {section.type === 'static' ? '📝 HTML' : '⚡ JavaScript'}
          </span>
          
          {#if section.type === 'dynamic' && ingredientsBySection[section.id]}
            <div class="ingredient-badges">
              {#each ingredientsBySection[section.id].tpnKeys as key}
                <span 
                  class="ingredient-badge tpn-badge" 
                  style="background-color: {getIngredientBadgeColor(key)}"
                  title="TPN: {key}"
                >
                  {key}
                </span>
              {/each}
              {#each ingredientsBySection[section.id].calculatedKeys as key}
                <span 
                  class="ingredient-badge calculated-badge" 
                  style="background-color: {getIngredientBadgeColor(key)}"
                  title="Calculated: {key}"
                >
                  {key} 📊
                </span>
              {/each}
              {#each ingredientsBySection[section.id].customKeys as key}
                <span 
                  class="ingredient-badge custom-badge"
                  title="Custom: {key}"
                >
                  {key}
                </span>
              {/each}
              {#if ingredientsBySection[section.id].allKeys.length > 0}
                <span class="ingredient-count">
                  {ingredientsBySection[section.id].allKeys.length} vars
                </span>
              {/if}
            </div>
          {/if}
          
          <button 
            class="delete-section-btn"
            onclick={() => onSectionDelete(section.id)}
            title="Delete section"
          >
            ×
          </button>
        </div>
        
        {#if editingSection === section.id}
          <div class="editor-controls">
            <button 
              class="done-editing-btn"
              onclick={() => onEditingSectionChange(null)}
            >
              ✓ Done Editing
            </button>
          </div>
          <div class="editor-wrapper">
            <CodeEditor
              value={section.content}
              language={section.type === 'static' ? 'html' : 'javascript'}
              onChange={(content) => onSectionUpdate(section.id, content)}
              on:convertToDynamic={(e) => onConvertToDynamic(section.id, e.detail.content)}
            />
          </div>
        {:else}
          <div 
            class="content-preview"
            ondblclick={() => onEditingSectionChange(section.id)}
            onkeydown={(e) => e.key === 'Enter' && onEditingSectionChange(section.id)}
            role="button"
            tabindex="0"
            title="Double-click to edit"
          >
            <pre>{section.content}</pre>
          </div>
        {/if}
        
        {#if section.type === 'dynamic' && section.testCases}
          <div class="test-cases">
            <div class="test-cases-header">
              <button 
                class="test-cases-toggle {expandedTestCases[section.id] ? 'expanded' : ''}" 
                onclick={() => onTestCaseToggle(section.id)}
                type="button"
                aria-expanded={expandedTestCases[section.id] ? 'true' : 'false'}
                aria-controls={`test-cases-${section.id}`}
                title="Click to {expandedTestCases[section.id] ? 'collapse' : 'expand'} test cases"
              >
                <span class="collapse-icon">{expandedTestCases[section.id] ? '▼' : '▶'}</span>
                <h4>📝 Test Cases ({section.testCases?.length || 0})</h4>
                {#if activeTestCase[section.id]}
                  <span class="active-test-badge">Active: {activeTestCase[section.id].name}</span>
                {/if}
              </button>
              <div class="test-actions">
                <button 
                  class="add-test-btn" 
                  onclick={() => onTestCaseAdd(section.id)}
                  title="Add a new test case"
                >
                  ➕ New Test
                </button>
                <TestGeneratorButton 
                  section={section}
                  tpnMode={tpnMode}
                  onTestsGenerated={(tests) => onTestsGenerated(section.id, tests)}
                />
                <button 
                  class="ai-inspector-btn"
                  onclick={() => onAIInspectorOpen(section.id)}
                  title="Open AI Workflow Inspector"
                >
                  🔍 AI Inspector
                </button>
              </div>
            </div>
            
            {#if expandedTestCases[section.id]}
              <div class="test-case-list" id={`test-cases-${section.id}`}>
              {#each section.testCases as testCase, index}
                <div class="test-case {activeTestCase[section.id] === testCase ? 'active' : ''}">
                  <div class="test-case-header">
                    <input 
                      type="text" 
                      value={testCase.name}
                      class="test-case-name"
                      oninput={(e) => onTestCaseUpdate(section.id, index, { name: e.target.value })}
                    />
                    <button 
                      class="test-case-run {activeTestCase[section.id] === testCase ? 'running' : ''}"
                      onclick={() => onActiveTestCaseSet(section.id, testCase)}
                      title="Run this test case"
                    >
                      {activeTestCase[section.id] === testCase ? '■' : '▶'}
                    </button>
                    {#if section.testCases.length > 1}
                      <button 
                        class="test-case-delete"
                        onclick={() => onTestCaseDelete(section.id, index)}
                        title="Delete test case"
                      >
                        ×
                      </button>
                    {/if}
                  </div>
                  
                  <div class="test-variables">
                    <div class="variable-header">
                      <span>Variables:</span>
                      <button 
                        class="add-var-btn"
                        onclick={() => addVariable(section.id, index)}
                      >
                        + Add
                      </button>
                    </div>
                    
                    {#each Object.entries(testCase.variables || {}) as [key, value]}
                      <div class="variable-row">
                        <span class="var-name">{key}:</span>
                        <input 
                          type="text"
                          value={value}
                          class="var-value"
                          oninput={(e) => {
                            const vars = { ...testCase.variables };
                            const val = e.target.value;
                            vars[key] = !isNaN(val) && val !== '' ? Number(val) : val;
                            onTestCaseUpdate(section.id, index, { variables: vars });
                          }}
                        />
                        <button 
                          class="remove-var-btn"
                          onclick={() => {
                            const vars = { ...testCase.variables };
                            delete vars[key];
                            onTestCaseUpdate(section.id, index, { variables: vars });
                          }}
                          title="Remove variable"
                        >
                          ×
                        </button>
                      </div>
                    {/each}
                  </div>
                  
                  <div class="test-expectations">
                    <div class="expectation-header">
                      <span class="expectation-title">📋 Test Expectations</span>
                      <button 
                        class="run-test-btn"
                        onclick={() => onActiveTestCaseSet(section.id, testCase)}
                        title="Run this test and validate output"
                      >
                        ▶️ Run Test
                      </button>
                    </div>
                    
                    <div class="expected-output">
                      <label>
                        <span class="field-label">Expected Output:</span>
                        <textarea 
                          value={testCase.expectedOutput || ''}
                          oninput={(e) => onTestCaseUpdate(section.id, index, { expectedOutput: e.target.value })}
                          placeholder="Enter expected output for test validation..."
                          rows="3"
                        ></textarea>
                      </label>
                    </div>
                    
                    <div class="match-type-row">
                      <label class="match-type-label">
                        <span class="field-label">Match Type:</span>
                        <select 
                          class="match-type-select"
                          value={testCase.matchType || 'contains'}
                          onchange={(e) => onTestCaseUpdate(section.id, index, { matchType: e.target.value })}
                        >
                          <option value="contains">Contains</option>
                          <option value="exact">Exact Match</option>
                          <option value="regex">Regular Expression</option>
                        </select>
                      </label>
                    </div>
                  </div>
                  
                  {#if testCase.testResult}
                    <div class="test-result {testCase.testResult.status}">
                      <div class="result-header">
                        <span class="result-icon">
                          {testCase.testResult.status === 'pass' ? '✅' : 
                           testCase.testResult.status === 'fail' ? '❌' : '⚠️'}
                        </span>
                        <span class="result-label">
                          {testCase.testResult.status === 'pass' ? 'Test Passed' : 
                           testCase.testResult.status === 'fail' ? 'Test Failed' : 'Test Error'}
                        </span>
                      </div>
                      {#if testCase.testResult.message}
                        <div class="result-message">{testCase.testResult.message}</div>
                      {/if}
                      {#if testCase.testResult.actualOutput}
                        <div class="result-output">
                          <strong>Actual Output:</strong>
                          <pre>{testCase.testResult.actualOutput}</pre>
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
      </div>
    {/each}
  {/if}
</div>

<style>
  .sections {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    padding-bottom: 5rem; /* Extra space to ensure Done Editing button is visible */
    max-height: calc(100vh - 200px); /* Ensure scrollability */
  }
  
  .section {
    margin-bottom: 1rem;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    background: white;
    transition: all 0.3s;
    overflow: visible; /* Ensure content isn't clipped */
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }
  
  .section:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }
  
  .section.editing {
    margin-bottom: 3rem; /* Extra space when editing to ensure button is visible */
  }
  
  .section.dragging {
    opacity: 0.5;
  }
  
  .section-header {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    background: linear-gradient(to bottom, #f8f9fa, #ffffff);
    border-bottom: 1px solid #e9ecef;
    gap: 0.5rem;
    border-radius: 8px 8px 0 0;
  }
  
  .drag-handle {
    cursor: move;
    opacity: 0.5;
    user-select: none;
  }
  
  .section-type {
    font-weight: 500;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.875rem;
  }
  
  .section-type.static {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }
  
  .section-type.dynamic {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
  }
  
  .ingredient-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    flex: 1;
  }
  
  .ingredient-badge {
    padding: 0.125rem 0.375rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    color: white;
  }
  
  .ingredient-badge.tpn-badge {
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
  
  .ingredient-badge.calculated-badge {
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
  
  .ingredient-badge.custom-badge {
    background: #6b7280;
  }
  
  .ingredient-count {
    padding: 0.125rem 0.375rem;
    border-radius: 12px;
    font-size: 0.75rem;
    background: rgba(107, 114, 128, 0.1);
    color: #6b7280;
  }
  
  .delete-section-btn {
    margin-left: auto;
    background: none;
    border: none;
    color: #ef4444;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0 0.5rem;
  }
  
  .delete-section-btn:hover {
    opacity: 0.8;
  }
  
  .editor-controls {
    padding: 0.5rem 1rem;
    background: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
    display: flex;
    justify-content: flex-end;
  }
  
  .editor-wrapper {
    padding: 1rem;
  }
  
  .done-editing-btn {
    padding: 0.5rem 1rem;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }
  
  .done-editing-btn:hover {
    background: #218838;
  }
  
  .content-preview {
    padding: 1rem;
    cursor: text;
    min-height: 60px;
  }
  
  .content-preview:hover {
    background: rgba(0, 0, 0, 0.02);
  }
  
  .content-preview pre {
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.875rem;
  }
  
  .test-cases {
    border-top: 1px solid #dee2e6;
    background: #fafbfc;
  }
  
  .test-cases-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    background: #f8f9fa;
  }
  
  .test-cases-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    font-size: inherit;
    border-radius: 4px;
    transition: background-color 0.2s;
    flex: 1;
  }
  
  .test-cases-toggle:hover {
    background: rgba(0, 123, 255, 0.05);
  }
  
  .test-cases-toggle.expanded {
    background: rgba(0, 123, 255, 0.03);
  }
  
  .test-cases-toggle.expanded .collapse-icon {
    transform: rotate(90deg);
  }
  
  .test-cases-toggle h4 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: #495057;
  }
  
  .collapse-icon {
    font-size: 0.75rem;
    transition: transform 0.2s;
    color: #6c757d;
  }
  
  .active-test-badge {
    padding: 0.25rem 0.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    margin-left: auto;
  }
  
  .test-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .add-test-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
    border: 1px solid #28a745;
    background: white;
    color: #28a745;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
  }
  
  .add-test-btn:hover {
    background: #28a745;
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .ai-inspector-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
    border: 1px solid #ff6b6b;
    background: white;
    color: #ff6b6b;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
  }
  
  .ai-inspector-btn:hover {
    background: #ff6b6b;
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .test-case-list {
    padding: 0.75rem;
    max-height: 400px;
    overflow-y: auto;
    background: white;
    border-radius: 0 0 4px 4px;
  }
  
  .test-case-list::-webkit-scrollbar {
    width: 8px;
  }
  
  .test-case-list::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  
  .test-case-list::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }
  
  .test-case-list::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
  
  .test-case {
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    padding: 1rem;
    margin-bottom: 0.75rem;
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    transition: all 0.2s;
  }
  
  .test-case:last-child {
    margin-bottom: 0;
  }
  
  .test-case:hover {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }
  
  .test-case.active {
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    background: #f0f8ff;
  }
  
  .test-case-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  
  .test-case-name {
    flex: 1;
    padding: 0.375rem;
    border: 1px solid #dee2e6;
    border-radius: 4px;
  }
  
  .test-case-run {
    padding: 0.375rem 0.75rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .test-case-run:hover {
    background: #0056b3;
  }
  
  .test-case-run.running {
    background: #ef4444;
  }
  
  .test-case-delete {
    background: none;
    border: none;
    color: #ef4444;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0 0.25rem;
  }
  
  .test-variables {
    margin-bottom: 0.75rem;
    padding: 0.5rem;
    background: #f8f9fa;
    border-radius: 4px;
    border: 1px solid #e9ecef;
  }
  
  .variable-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #495057;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #dee2e6;
  }
  
  .add-var-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .add-var-btn:hover {
    background: #e9ecef;
    border-color: #adb5bd;
  }
  
  .variable-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    padding: 0.25rem;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  
  .variable-row:hover {
    background: #f8f9fa;
  }
  
  .var-name {
    min-width: 120px;
    font-size: 0.875rem;
    font-weight: 500;
    color: #495057;
  }
  
  .var-value {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    background: white;
    font-size: 0.875rem;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  
  .var-value:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
  }
  
  .remove-var-btn {
    background: none;
    border: none;
    color: #ef4444;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0 0.25rem;
  }
  
  .test-expectations {
    margin-top: 1rem;
    padding: 0.75rem;
    background: linear-gradient(to bottom, #f0f8ff, #ffffff);
    border: 1px solid #b8daff;
    border-radius: 6px;
  }
  
  .expectation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #dee2e6;
  }
  
  .expectation-title {
    font-weight: 600;
    color: #004085;
    font-size: 0.9rem;
  }
  
  .run-test-btn {
    padding: 0.375rem 0.75rem;
    background: linear-gradient(135deg, #28a745, #20c997);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s;
  }
  
  .run-test-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(40, 167, 69, 0.3);
  }
  
  .field-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #495057;
    margin-bottom: 0.25rem;
  }
  
  .expected-output {
    margin-bottom: 0.75rem;
  }
  
  .expected-output label {
    display: block;
  }
  
  .expected-output textarea {
    width: 100%;
    min-height: 80px;
    padding: 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.875rem;
    resize: vertical;
    background: white;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  
  .expected-output textarea:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
  }
  
  .match-type-row {
    margin-bottom: 0.5rem;
  }
  
  .match-type-label {
    display: block;
  }
  
  .match-type-select {
    padding: 0.375rem 0.75rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 0.875rem;
    background: white;
    cursor: pointer;
    transition: border-color 0.2s;
  }
  
  .match-type-select:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
  }
  
  .test-result {
    margin-top: 0.75rem;
    padding: 0.75rem;
    border-radius: 4px;
    font-size: 0.875rem;
  }
  
  .test-result.pass {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
  }
  
  .test-result.fail {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
  
  .test-result.error {
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
  }
  
  .result-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .result-icon {
    font-size: 1rem;
  }
  
  .result-label {
    font-weight: 500;
  }
  
  .result-message {
    margin-bottom: 0.5rem;
    color: #4b5563;
  }
  
  .result-output {
    margin-top: 0.5rem;
  }
  
  .result-output pre {
    margin-top: 0.25rem;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
</style>