<script>
  import { sectionStore } from '../../stores/sectionStore.svelte.ts';
  import { workspaceStore } from '../../stores/workspaceStore.svelte.ts';
  import { testStore } from '../../stores/testStore.svelte.ts';
  import { uiStore } from '../../stores/uiStore.svelte.ts';
  import { sectionService } from '../services/sectionService';
  import CodeEditor from '../CodeEditor.svelte';
  import TestGeneratorButton from '../TestGeneratorButton.svelte';
  import { extractKeysFromCode, extractDirectKeysFromCode, isValidKey, getKeyCategory, getCanonicalKey } from '../tpnLegacy.js';
  
  // Props
  let { 
    section,
    isDragged = false,
    onDragStart = () => {},
    onDragOver = () => {},
    onDrop = () => {},
    onDragEnd = () => {},
    onChange = () => {}
  } = $props();
  
  // Reactive state
  const editingSection = $derived(sectionStore.editingSection);
  const activeTestCase = $derived(sectionStore.activeTestCase);
  const expandedTestCases = $derived(sectionStore.expandedTestCases);
  
  // Computed ingredients for this section
  const sectionIngredients = $derived.by(() => {
    if (section.type !== 'dynamic') return { allKeys: [], referencedKeys: [], calculatedKeys: [], customKeys: [] };
    
    const allKeys = extractKeysFromCode(section.content);
    const directKeys = extractDirectKeysFromCode(section.content);
    
    const categorized = {
      referencedKeys: [],
      calculatedKeys: [],
      customKeys: [],
      allKeys: allKeys
    };
    
    directKeys.forEach(key => {
      const canonicalKey = getCanonicalKey(key);
      if (isValidKey(canonicalKey)) {
        const category = getKeyCategory(canonicalKey);
        if (category === 'calculated') {
          categorized.calculatedKeys.push(canonicalKey);
        } else {
          categorized.referencedKeys.push(canonicalKey);
        }
      } else {
        categorized.customKeys.push(key);
      }
    });
    
    return categorized;
  });
  
  function handleSectionNameChange(newName) {
    sectionStore.updateSectionName(section.id, newName);
    onChange();
  }
  
  function handleContentChange(content) {
    sectionStore.updateSectionContent(section.id, content);
    onChange();
  }
  
  function handleEditToggle() {
    if (editingSection === section.id) {
      sectionStore.setEditingSection(null);
    } else {
      sectionStore.setEditingSection(section.id);
    }
  }
  
  function handleDeleteSection() {
    if (confirm('Are you sure you want to delete this section?')) {
      sectionStore.deleteSection(section.id);
      onChange();
    }
  }
  
  function handleAddTestCase() {
    sectionStore.addTestCase(section.id);
    sectionStore.toggleTestCases(section.id); // Ensure expanded
    onChange();
  }
  
  function handleUpdateTestCase(index, updates) {
    sectionStore.updateTestCase(section.id, index, updates);
    onChange();
  }
  
  function handleDeleteTestCase(index) {
    if (confirm('Are you sure you want to delete this test case?')) {
      sectionStore.deleteTestCase(section.id, index);
      onChange();
    }
  }
  
  function handleDuplicateTestCase(index) {
    const testCase = section.testCases[index];
    const duplicatedTestCase = {
      ...testCase,
      name: `${testCase.name} (Copy)`,
      variables: { ...testCase.variables },
      testResult: undefined // Clear test result for the duplicate
    };
    
    // Add the duplicated test case
    sectionStore.addTestCase(section.id);
    const newIndex = section.testCases.length - 1;
    sectionStore.updateTestCase(section.id, newIndex, duplicatedTestCase);
    onChange();
  }
  
  // Drag and drop handlers for test cases
  let draggedTestIndex = null;
  let dragOverTestIndex = null;
  
  function handleTestCaseDragStart(e, index) {
    draggedTestIndex = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
    e.target.classList.add('dragging');
  }
  
  function handleTestCaseDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedTestIndex = null;
    dragOverTestIndex = null;
    
    // Remove all drag-over classes
    const testCases = e.target.closest('.test-case-list')?.querySelectorAll('.test-case');
    testCases?.forEach(tc => tc.classList.remove('drag-over'));
  }
  
  function handleTestCaseDragOver(e, index) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedTestIndex !== null && draggedTestIndex !== index) {
      dragOverTestIndex = index;
      
      // Add visual feedback
      const testCases = e.currentTarget.closest('.test-case-list')?.querySelectorAll('.test-case');
      testCases?.forEach((tc, i) => {
        tc.classList.toggle('drag-over', i === index);
      });
    }
  }
  
  function handleTestCaseDrop(e, targetIndex) {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedTestIndex !== null && draggedTestIndex !== targetIndex) {
      sectionStore.reorderTestCases(section.id, draggedTestIndex, targetIndex);
      onChange();
    }
    
    // Clean up visual feedback
    const testCases = e.currentTarget.closest('.test-case-list')?.querySelectorAll('.test-case');
    testCases?.forEach(tc => tc.classList.remove('drag-over'));
    
    draggedTestIndex = null;
    dragOverTestIndex = null;
  }
  
  function handleSetActiveTestCase(testCase) {
    sectionStore.setActiveTestCase(section.id, testCase);
  }
  
  function handleRunSingleTest(testCase) {
    const evaluation = sectionService.evaluateCode(section.content, testCase.variables);
    const result = testStore.validateTestOutput(
      evaluation.result,
      testCase.expected || testCase.expectedOutput,
      testCase.matchType,
      evaluation.actualStyles,
      testCase.expectedStyles
    );
    
    // Update test result in store
    const testIndex = section.testCases.findIndex(tc => tc === testCase);
    if (testIndex !== -1) {
      sectionStore.updateTestCase(section.id, testIndex, {
        testResult: {
          passed: result.passed,
          actual: evaluation.result,
          error: result.error,
          executionTime: Date.now()
        }
      });
    }
    
    return result;
  }
  
  async function handleRunAllSectionTests() {
    const results = [];
    for (let i = 0; i < section.testCases.length; i++) {
      const testCase = section.testCases[i];
      if (testCase.expected || testCase.expectedOutput || testCase.expectedStyles) {
        const result = handleRunSingleTest(testCase);
        results.push(result);
      }
    }
    
    // Show summary toast or update UI
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    console.log(`Test Results: ${passed}/${total} passed`);
  }
  function addTestVariable(testCaseIndex) {
    const varName = prompt('Variable name:');
    if (varName) {
      const testCase = section.testCases[testCaseIndex];
      const vars = { ...testCase.variables, [varName]: 0 };
      handleUpdateTestCase(testCaseIndex, { variables: vars });
    }
  }
  
  function updateTestVariable(testCaseIndex, key, value) {
    const testCase = section.testCases[testCaseIndex];
    const vars = { ...testCase.variables };
    // Try to parse as number, otherwise keep as string
    vars[key] = !isNaN(value) && value !== '' ? Number(value) : value;
    handleUpdateTestCase(testCaseIndex, { variables: vars });
  }
  
  function deleteTestVariable(testCaseIndex, key) {
    const testCase = section.testCases[testCaseIndex];
    const vars = { ...testCase.variables };
    delete vars[key];
    handleUpdateTestCase(testCaseIndex, { variables: vars });
  }
  
  function handleEditVariablesAsJSON(testCaseIndex) {
    const testCase = section.testCases[testCaseIndex];
    const currentVars = testCase.variables || {};
    const jsonString = JSON.stringify(currentVars, null, 2);
    
    const newJsonString = prompt(
      'Edit variables as JSON (be careful with syntax):', 
      jsonString
    );
    
    if (newJsonString !== null) {
      try {
        const newVars = JSON.parse(newJsonString);
        if (typeof newVars === 'object' && newVars !== null) {
          handleUpdateTestCase(testCaseIndex, { variables: newVars });
        } else {
          alert('Invalid JSON: Variables must be an object');
        }
      } catch (e) {
        alert('Invalid JSON syntax: ' + e.message);
      }
    }
  }
  
  function getIngredientBadgeColor(key) {
    const canonicalKey = getCanonicalKey(key);
    if (isValidKey(canonicalKey)) {
      const category = getKeyCategory(canonicalKey);
      switch (category) {
        case 'basic':
        case 'patient':
          return '#007bff';
        case 'calculated':
          return '#28a745';
        case 'macronutrient':
          return '#fd7e14';
        case 'micronutrient':
          return '#6f42c1';
        default:
          return '#6c757d';
      }
    }
    return '#dc3545'; // Red for custom/unknown keys
  }
  function handleTestsGenerated(tests) {
    testStore.setCurrentGeneratedTests(tests);
    testStore.setTargetSectionId(section.id);
    uiStore.setShowTestGeneratorModal(true);
  }
  
  function openAIWorkflowInspector() {
    testStore.setInspectorCurrentSection(section.id);
    uiStore.setShowAIWorkflowInspector(true);
  }
  
  function handleConvertToDynamic(jsContent) {
    sectionStore.convertToDynamic(section.id, jsContent);
    onChange();
  }
</script>

<div 
  class="section {isDragged ? 'dragged' : ''}"
  draggable="true"
  ondragstart={onDragStart}
  ondragover={onDragOver}
  ondrop={onDrop}
  ondragend={onDragEnd}
  role="listitem"
>
  <div class="section-header">
    <div class="section-info">
      <input 
        type="text" 
        value={section.name}
        class="section-name"
        oninput={(e) => handleSectionNameChange(e.target.value)}
      />
      <span class="section-type {section.type}">
        {section.type === 'static' ? 'HTML' : 'JS'}
      </span>
      <button 
        class="edit-section-btn {editingSection === section.id ? 'editing' : ''}"
        onclick={handleEditToggle}
        title={editingSection === section.id ? 'Stop editing' : 'Edit section'}
      >
        {editingSection === section.id ? '🔒' : '✏️'}
      </button>
    </div>
    
    {#if section.type === 'dynamic' && sectionIngredients.allKeys.length > 0}
      <div class="ingredient-badges">
        {#each sectionIngredients.referencedKeys as key}
          <span 
            class="ingredient-badge referenced-badge"
            style="background-color: {getIngredientBadgeColor(key)}"
            title="Referenced: {key}"
          >
            {key}
          </span>
        {/each}
        {#each sectionIngredients.calculatedKeys as key}
          <span 
            class="ingredient-badge calculated-badge"
            style="background-color: {getIngredientBadgeColor(key)}"
            title="Calculated: {key}"
          >
            {key}
          </span>
        {/each}
        {#each sectionIngredients.customKeys as key}
          <span 
            class="ingredient-badge custom-badge"
            title="Custom: {key}"
          >
            {key}
          </span>
        {/each}
        {#if sectionIngredients.allKeys.length > 0}
          <span class="ingredient-count">
            {sectionIngredients.allKeys.length} vars
          </span>
        {/if}
      </div>
    {/if}
    
    <button 
      class="delete-section-btn"
      onclick={handleDeleteSection}
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
        onChange={handleContentChange}
        on:convertToDynamic={(e) => handleConvertToDynamic(e.detail.content)}
      />
      <button 
        class="done-editing-btn"
        onclick={handleEditToggle}
      >
        Done Editing
      </button>
    </div>
  {:else}
    <div 
      class="content-preview"
      ondblclick={handleEditToggle}
      onkeydown={(e) => e.key === 'Enter' && handleEditToggle()}
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
          onclick={() => sectionStore.toggleTestCases(section.id)}
          type="button"
          aria-expanded={expandedTestCases[section.id] ? 'true' : 'false'}
          aria-controls={`test-cases-${section.id}`}
          aria-label="Toggle test cases panel"
        >
          <span class="collapse-icon">{expandedTestCases[section.id] ? '▼' : '▶'}</span>
          <h4>Test Cases ({section.testCases.length})</h4>
          {#if activeTestCase[section.id]}
            <span class="active-test-badge">{activeTestCase[section.id].name}</span>
          {/if}
        </button>
        <div class="test-actions">
          <button 
            class="add-test-btn" 
            onclick={handleAddTestCase}
            title="Add new test case (Ctrl+T)"
            aria-label="Add new test case"
          >
            + Add Test
          </button>
          <button
            class="run-all-section-tests-btn"
            onclick={() => handleRunAllSectionTests()}
            title="Run all tests for this section"
            aria-label="Run all tests for this section"
          >
            ▶️ Run All
          </button>
          <TestGeneratorButton 
            {section}
            tpnMode={true}
            onTestsGenerated={handleTestsGenerated}
          />
          <button 
            class="ai-inspector-btn"
            onclick={openAIWorkflowInspector}
            title="Open AI Workflow Inspector"
            aria-label="Open AI Workflow Inspector"
          >
            🔍 AI Inspector
          </button>
        </div>
      </div>
      
      {#if expandedTestCases[section.id]}
        <div class="test-case-list" id={`test-cases-${section.id}`}>
        {#each section.testCases as testCase, index}
          <div 
            class="test-case {activeTestCase[section.id] === testCase ? 'active' : ''}"
            draggable="true"
            ondragstart={(e) => handleTestCaseDragStart(e, index)}
            ondragend={(e) => handleTestCaseDragEnd(e)}
            ondragover={(e) => handleTestCaseDragOver(e, index)}
            ondrop={(e) => handleTestCaseDrop(e, index)}
          >
            <div class="test-case-header">
              <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
              <input 
                type="text" 
                value={testCase.name}
                class="test-case-name"
                oninput={(e) => handleUpdateTestCase(index, { name: e.target.value })}
              />
              <button 
                class="test-case-run {activeTestCase[section.id] === testCase ? 'running' : ''}"
                onclick={() => {
                  handleSetActiveTestCase(testCase);
                  handleRunSingleTest(testCase);
                }}
                title="Run this test case"
              >
                {activeTestCase[section.id] === testCase ? '■' : '▶'}
              </button>
              <button
                class="test-case-duplicate"
                onclick={() => handleDuplicateTestCase(index)}
                title="Duplicate test case"
              >
                📋
              </button>
              {#if section.testCases.length > 1}
                <button 
                  class="test-case-delete"
                  onclick={() => handleDeleteTestCase(index)}
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
                  onclick={() => addTestVariable(index)}
                  title="Add new variable"
                >
                  + Add
                </button>
                <button
                  class="json-edit-btn"
                  onclick={() => handleEditVariablesAsJSON(index)}
                  title="Edit as JSON"
                >
                  {} JSON
                </button>
              </div>
              
              {#each Object.entries(testCase.variables || {}) as [key, value]}
                <div class="variable-row">
                  <span class="var-name">{key}:</span>
                  <input 
                    type="text"
                    value={typeof value === 'object' ? JSON.stringify(value) : value}
                    class="var-value"
                    oninput={(e) => updateTestVariable(index, key, e.target.value)}
                    placeholder="Value..."
                  />
                  <button 
                    class="var-delete"
                    onclick={() => deleteTestVariable(index, key)}
                    title="Delete variable"
                  >
                    ×
                  </button>
                </div>
              {/each}
              
              {#if Object.keys(testCase.variables || {}).length === 0}
                <div class="no-variables">
                  No variables defined. Click "+ Add" to create one.
                </div>
              {/if}
            </div>
            
            <!-- Test Expectations -->
            <div class="test-expectations">
              <div class="expectation-header">
                <span>Expected Output:</span>
                <select 
                  class="match-type-select"
                  value={testCase.matchType || 'contains'}
                  onchange={(e) => handleUpdateTestCase(index, { matchType: e.target.value })}
                >
                  <option value="exact">Exact Match</option>
                  <option value="contains">Contains</option>
                  <option value="regex">Regex</option>
                </select>
              </div>
              <textarea
                class="expected-output"
                value={testCase.expected || testCase.expectedOutput || ''}
                placeholder="Enter expected output text..."
                oninput={(e) => handleUpdateTestCase(index, { expected: e.target.value, expectedOutput: e.target.value })}
              ></textarea>
            </div>
            
            <!-- Test Result Display -->
            {#if testCase.testResult}
              <div class="test-result {testCase.testResult.passed ? 'passed' : 'failed'}">
                <div class="result-header">
                  {testCase.testResult.passed ? '✅ Test Passed' : '❌ Test Failed'}
                  {#if testCase.testResult.executionTime}
                    <span class="execution-time">
                      ({new Date(testCase.testResult.executionTime).toLocaleTimeString()})
                    </span>
                  {/if}
                </div>
                {#if testCase.testResult.error}
                  <div class="result-error">
                    <strong>Error:</strong> {testCase.testResult.error}
                  </div>
                {/if}
                {#if testCase.testResult.actual !== undefined}
                  <div class="result-actual">
                    <strong>Actual Output:</strong>
                    <pre>{testCase.testResult.actual}</pre>
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

<style>
  .section {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }
  
  .section:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }
  
  .section.dragged {
    opacity: 0.5;
    transform: rotate(2deg);
  }
  
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
    gap: 1rem;
  }
  
  .section-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
  }
  
  .section-name {
    border: none;
    background: transparent;
    font-size: 1rem;
    font-weight: 600;
    color: #495057;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    transition: background-color 0.2s;
    min-width: 200px;
  }
  
  .section-name:focus {
    background: white;
    outline: 2px solid #007bff;
  }
  
  .section-type {
    padding: 0.2rem 0.6rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .section-type.static {
    background: #28a745;
    color: white;
  }
  
  .section-type.dynamic {
    background: #007bff;
    color: white;
  }
  
  .edit-section-btn {
    padding: 0.375rem;
    background: transparent;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .edit-section-btn:hover {
    background: #e9ecef;
  }
  
  .edit-section-btn.editing {
    background: #007bff;
    color: white;
    border-color: #007bff;
  }
  
  .ingredient-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    align-items: center;
    max-width: 300px;
    overflow: hidden;
  }
  
  .ingredient-badge {
    padding: 0.15rem 0.4rem;
    border-radius: 10px;
    font-size: 0.7rem;
    font-weight: 500;
    color: white;
    text-shadow: 0 1px 2px rgba(0,0,0,0.1);
  }
  
  .ingredient-badge.custom-badge {
    background: #dc3545;
  }
  
  .ingredient-count {
    padding: 0.15rem 0.4rem;
    background: #6c757d;
    color: white;
    border-radius: 10px;
    font-size: 0.7rem;
    font-weight: 500;
  }
  
  .delete-section-btn {
    width: 2rem;
    height: 2rem;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    line-height: 1;
    transition: all 0.2s;
  }
  
  .delete-section-btn:hover {
    background: #c82333;
    transform: scale(1.1);
  }
  
  .editor-wrapper {
    position: relative;
  }
  
  .done-editing-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.5rem 1rem;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    z-index: 10;
    transition: background-color 0.2s;
  }
  
  .done-editing-btn:hover {
    background: #218838;
  }
  
  .content-preview {
    padding: 1rem;
    cursor: pointer;
    transition: background-color 0.2s;
    position: relative;
  }
  
  .content-preview:hover {
    background: #f8f9fa;
  }
  
  .content-preview:hover::after {
    content: 'Double-click to edit';
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    font-size: 0.75rem;
    color: #6c757d;
    background: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    border: 1px solid #dee2e6;
  }
  
  .content-preview pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: 'Fira Code', 'Monaco', 'Menlo', monospace;
    font-size: 0.9rem;
    line-height: 1.4;
    color: #495057;
  }
  
  .test-cases {
    border-top: 1px solid #e9ecef;
  }
  
  .test-cases-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: #f1f3f4;
  }
  
  .test-cases-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    color: #495057;
  }
  
  .test-cases-toggle h4 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
  }
  
  .collapse-icon {
    font-size: 0.8rem;
    transition: transform 0.2s;
  }
  
  .active-test-badge {
    padding: 0.15rem 0.5rem;
    background: #007bff;
    color: white;
    border-radius: 10px;
    font-size: 0.7rem;
    font-weight: 500;
  }
  
  .test-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .add-test-btn, .ai-inspector-btn, .run-all-section-tests-btn {
    padding: 0.4rem 0.8rem;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.2s;
  }
  
  .add-test-btn {
    background: #28a745;
    color: white;
    border-color: #28a745;
  }
  
  .add-test-btn:hover {
    background: #218838;
  }
  
  .run-all-section-tests-btn {
    background: #17a2b8;
    color: white;
    border-color: #17a2b8;
  }
  
  .run-all-section-tests-btn:hover {
    background: #138496;
  }
  
  .ai-inspector-btn {
    background: white;
    color: #495057;
  }
  
  .ai-inspector-btn:hover {
    background: #f8f9fa;
  }
  
  .test-case-list {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .test-case {
    border: 1px solid #e9ecef;
    border-radius: 6px;
    padding: 0.75rem;
    background: #fafbfc;
    cursor: move;
    transition: all 0.2s;
  }
  
  .test-case.active {
    border-color: #007bff;
    background: #f8f9ff;
  }
  
  .test-case.dragging {
    opacity: 0.5;
    cursor: grabbing;
  }
  
  .test-case.drag-over {
    border-color: #007bff;
    border-width: 2px;
    background: #e8f4ff;
  }
  
  .drag-handle {
    cursor: grab;
    color: #6c757d;
    font-size: 1.2rem;
    padding: 0 0.25rem;
    user-select: none;
  }
  
  .drag-handle:active {
    cursor: grabbing;
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
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 0.9rem;
  }
  
  .test-case-run {
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    background: #28a745;
    color: white;
  }
  
  .test-case-run:hover {
    transform: scale(1.1);
  }
  
  .test-case-run.running {
    background: #dc3545;
  }
  
  .test-case-delete, .test-case-duplicate {
    width: 1.5rem;
    height: 1.5rem;
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  
  .test-case-delete {
    background: #dc3545;
  }
  
  .test-case-duplicate {
    background: #6c757d;
  }
  
  .test-case-delete:hover, .test-case-duplicate:hover {
    transform: scale(1.1);
  }
  
  .test-variables {
    margin-bottom: 0.75rem;
  }
  
  .variable-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: #495057;
  }
  
  .add-var-btn, .json-edit-btn {
    padding: 0.25rem 0.5rem;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.2s;
  }
  
  .add-var-btn {
    background: #007bff;
  }
  
  .add-var-btn:hover {
    background: #0056b3;
  }
  
  .json-edit-btn {
    background: #6f42c1;
  }
  
  .json-edit-btn:hover {
    background: #5a32a3;
  }
  
  .no-variables {
    padding: 0.5rem;
    color: #6c757d;
    font-style: italic;
    font-size: 0.85rem;
    text-align: center;
    background: #f8f9fa;
    border-radius: 4px;
  }
  
  .variable-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .var-name {
    min-width: 80px;
    font-size: 0.85rem;
    color: #6c757d;
  }
  
  .var-value {
    flex: 1;
    padding: 0.25rem 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 0.85rem;
  }
  
  .var-delete {
    width: 1.25rem;
    height: 1.25rem;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
  }
  
  .test-expectations {
    border-top: 1px solid #e9ecef;
    padding-top: 0.75rem;
  }
  
  .expectation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: #495057;
  }
  
  .match-type-select {
    padding: 0.25rem 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 0.8rem;
  }
  
  .expected-output {
    width: 100%;
    min-height: 60px;
    padding: 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 0.85rem;
    font-family: 'Fira Code', 'Monaco', 'Menlo', monospace;
    resize: vertical;
  }
  
  /* Test Result Display Styles */
  .test-result {
    margin-top: 1rem;
    padding: 0.75rem;
    border-radius: 6px;
    border: 2px solid;
    background: white;
  }
  
  .test-result.passed {
    border-color: #28a745;
    background: #d4edda;
  }
  
  .test-result.failed {
    border-color: #dc3545;
    background: #f8d7da;
  }
  
  .result-header {
    font-weight: 600;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .execution-time {
    font-size: 0.75rem;
    color: #6c757d;
    font-weight: normal;
  }
  
  .result-error {
    padding: 0.5rem;
    background: rgba(220, 53, 69, 0.1);
    border-radius: 4px;
    margin-bottom: 0.5rem;
    color: #721c24;
    font-size: 0.85rem;
  }
  
  .result-actual {
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 4px;
    font-size: 0.85rem;
  }
  
  .result-actual pre {
    margin: 0.25rem 0 0 0;
    padding: 0.5rem;
    background: #f8f9fa;
    border-radius: 4px;
    overflow-x: auto;
    font-family: 'Fira Code', 'Monaco', 'Menlo', monospace;
    font-size: 0.8rem;
  }
</style>