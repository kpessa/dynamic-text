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
        class="section {draggedSection?.id === section.id ? 'dragging' : ''}"
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
          <div class="editor-wrapper">
            <CodeEditor
              value={section.content}
              language={section.type === 'static' ? 'html' : 'javascript'}
              onChange={(content) => onSectionUpdate(section.id, content)}
              on:convertToDynamic={(e) => onConvertToDynamic(section.id, e.detail.content)}
            />
            <button 
              class="done-editing-btn"
              onclick={() => onEditingSectionChange(null)}
            >
              Done Editing
            </button>
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
                class="test-cases-toggle" 
                onclick={() => onTestCaseToggle(section.id)}
                type="button"
                aria-expanded={expandedTestCases[section.id] ? 'true' : 'false'}
                aria-controls={`test-cases-${section.id}`}
              >
                <span class="collapse-icon">{expandedTestCases[section.id] ? '▼' : '▶'}</span>
                <h4>Test Cases</h4>
                {#if activeTestCase[section.id]}
                  <span class="active-test-badge">{activeTestCase[section.id].name}</span>
                {/if}
              </button>
              <div class="test-actions">
                <button 
                  class="add-test-btn" 
                  onclick={() => onTestCaseAdd(section.id)}
                >
                  + Add Test
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
                  
                  {#if testCase.expectedOutput !== undefined}
                    <div class="expected-output">
                      <label>
                        Expected Output:
                        <textarea 
                          value={testCase.expectedOutput}
                          oninput={(e) => onTestCaseUpdate(section.id, index, { expectedOutput: e.target.value })}
                          placeholder="Enter expected output for test validation..."
                        />
                      </label>
                    </div>
                  {/if}
                  
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
  }
  
  .section {
    margin-bottom: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-secondary);
    transition: opacity 0.3s;
  }
  
  .section.dragging {
    opacity: 0.5;
  }
  
  .section-header {
    display: flex;
    align-items: center;
    padding: 0.75rem;
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-color);
    gap: 0.5rem;
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
  
  .editor-wrapper {
    padding: 1rem;
  }
  
  .done-editing-btn {
    margin-top: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
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
    border-top: 1px solid var(--border-color);
  }
  
  .test-cases-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    background: var(--bg-primary);
  }
  
  .test-cases-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-size: inherit;
  }
  
  .test-cases-toggle h4 {
    margin: 0;
    font-size: 0.875rem;
  }
  
  .collapse-icon {
    font-size: 0.75rem;
  }
  
  .active-test-badge {
    padding: 0.125rem 0.5rem;
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
    border-radius: 12px;
    font-size: 0.75rem;
  }
  
  .test-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .add-test-btn,
  .ai-inspector-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
    border: 1px solid var(--border-color);
    background: white;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .test-case-list {
    padding: 0.75rem;
  }
  
  .test-case {
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 0.75rem;
    margin-bottom: 0.75rem;
    background: white;
  }
  
  .test-case.active {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 1px var(--primary-color);
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
    border: 1px solid var(--border-color);
    border-radius: 4px;
  }
  
  .test-case-run {
    padding: 0.375rem 0.75rem;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
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
  }
  
  .variable-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .add-var-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
  }
  
  .variable-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .var-name {
    min-width: 100px;
    font-size: 0.875rem;
  }
  
  .var-value {
    flex: 1;
    padding: 0.375rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
  }
  
  .remove-var-btn {
    background: none;
    border: none;
    color: #ef4444;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0 0.25rem;
  }
  
  .expected-output {
    margin-top: 0.75rem;
  }
  
  .expected-output label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .expected-output textarea {
    width: 100%;
    min-height: 60px;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.875rem;
    margin-top: 0.25rem;
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