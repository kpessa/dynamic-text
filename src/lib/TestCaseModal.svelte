<script>
  /**
   * TestCaseModal Component
   * 
   * A full-screen modal interface for managing test cases for dynamic sections.
   * Provides comprehensive test case editing, variable management, live test execution,
   * test grouping (Basic Tests, Edge Cases, QA/Breaking), and live preview functionality.
   * 
   * Features:
   * - Test cases organized into three AI-compatible groups
   * - Live preview panel with real-time updates
   * - Bulk test execution per group
   * - Drag and drop test reorganization
   * - Responsive design for mobile devices
   * 
   * @component
   * @example
   * <TestCaseModal
   *   bind:isOpen={showModal}
   *   bind:section={currentSection}
   *   onSave={handleSave}
   * />
   */
  import { createEventDispatcher } from 'svelte';
  import CodeEditor from './CodeEditor.svelte';
  import { testRunnerService } from './services/testRunnerService';
  import { previewEngineService } from './services/previewEngineService';
  
  /**
   * @prop {boolean} isOpen - Controls modal visibility (bindable)
   * @prop {object} section - The section object containing test cases (bindable)
   * @prop {function} onSave - Callback when test cases are saved
   */
  let { 
    isOpen = $bindable(false),
    section = $bindable(null),
    onSave = () => {}
  } = $props();
  
  const dispatch = createEventDispatcher();
  
  // Local state for editing
  let testCases = $state([]);
  let activeTestIndex = $state(0);
  let isDirty = $state(false);
  let testResults = $state({});
  let isRunningTest = $state({});
  let expandedGroups = $state({
    basicFunctionality: true,
    edgeCases: true,
    qaBreaking: true
  });
  let isInitializing = false;
  
  // Group definitions
  const testGroups = {
    basicFunctionality: { label: 'Basic Tests', icon: '📋' },
    edgeCases: { label: 'Edge Cases', icon: '⚠️' },
    qaBreaking: { label: 'QA / Breaking', icon: '🔨' }
  };
  
  // Preview panel state
  let showPreview = $state(true);
  let previewContent = $state('');
  let previewDebounceTimer = null;
  
  // Modal keyboard handling
  function handleKeydown(e) {
    if (e.key === 'Escape' && !isDirty) {
      close();
    }
  }
  
  // Initialize/reset when modal opens
  $effect(() => {
    if (isOpen && section && !isInitializing) {
      isInitializing = true;
      // Deep clone test cases for editing
      const clonedTestCases = JSON.parse(JSON.stringify(section.testCases || []));
      
      // Extract variables from code if section is dynamic
      const extractedVars = section.type === 'dynamic' 
        ? extractVariablesFromCode(section.content)
        : {};
      
      // Ensure all test cases have a category and variables
      testCases = clonedTestCases.map(tc => {
        // If test case has no variables or empty variables, use extracted ones
        const hasVariables = tc.variables && Object.keys(tc.variables).length > 0;
        return {
          ...tc,
          category: tc.category || 'basicFunctionality',
          variables: hasVariables ? tc.variables : extractedVars
        };
      });
      
      // Ensure we have at least one test case
      if (testCases.length === 0) {
        testCases = [{
          name: 'Test Case 1',
          variables: extractedVars,
          expectedOutput: '',
          expectedStyles: '',
          matchType: 'contains',
          category: 'basicFunctionality'
        }];
      }
      
      activeTestIndex = 0;
      isDirty = false;
      testResults = {};
      isRunningTest = {};
      
      // Allow re-initialization next time
      setTimeout(() => isInitializing = false, 100);
    }
  });
  
  // Track changes
  $effect(() => {
    if (section && testCases.length > 0) {
      const original = JSON.stringify(section.testCases);
      const current = JSON.stringify(testCases);
      isDirty = original !== current;
    }
  });
  
  function close() {
    if (isDirty) {
      if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
    }
    isOpen = false;
    isInitializing = false;
  }
  
  function save() {
    onSave(section.id, testCases);
    isDirty = false;
    isOpen = false;
  }
  
  // Compute grouped tests - using getter pattern to avoid derived issues
  function getGroupedTests() {
    const groups = {
      basicFunctionality: [],
      edgeCases: [],
      qaBreaking: []
    };
    
    if (!testCases || !Array.isArray(testCases)) {
      return groups;
    }
    
    testCases.forEach((tc, index) => {
      if (!tc) return;
      const category = tc.category || 'basicFunctionality';
      if (groups[category]) {
        groups[category].push({ ...tc, originalIndex: index });
      }
    });
    
    return groups;
  }
  
  // Compute group stats - using getter pattern
  function getGroupStats() {
    const groups = getGroupedTests();
    const stats = {};
    
    for (const [category, tests] of Object.entries(groups)) {
      let passed = 0;
      let failed = 0;
      
      if (Array.isArray(tests)) {
        tests.forEach(test => {
          if (test && typeof test.originalIndex === 'number') {
            const result = testResults[test.originalIndex];
            if (result) {
              if (result.passed) passed++;
              else failed++;
            }
          }
        });
      }
      
      stats[category] = { total: tests?.length || 0, passed, failed };
    }
    return stats;
  }
  
  // Use regular state that updates via effects instead of derived
  let groupedTests = $state({
    basicFunctionality: [],
    edgeCases: [],
    qaBreaking: []
  });
  let groupStats = $state({
    basicFunctionality: { total: 0, passed: 0, failed: 0 },
    edgeCases: { total: 0, passed: 0, failed: 0 },
    qaBreaking: { total: 0, passed: 0, failed: 0 }
  });
  
  // Update grouped data when test cases change
  $effect(() => {
    if (testCases && testCases.length > 0) {
      groupedTests = getGroupedTests();
      groupStats = getGroupStats();
    }
  });
  
  function extractVariablesFromCode(code) {
    const variables = {};
    
    // Extract me.getValue('variable') patterns
    const getValueRegex = /me\.getValue\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*([^)]+))?\)/g;
    let match;
    while ((match = getValueRegex.exec(code)) !== null) {
      const varName = match[1];
      // Set default values based on common patterns
      if (varName.includes('Weight') || varName.includes('weight')) {
        variables[varName] = 10; // Default weight in kg
      } else if (varName.includes('Age') || varName.includes('age')) {
        variables[varName] = 1; // Default age
      } else if (varName.includes('Rate') || varName.includes('rate')) {
        variables[varName] = 1; // Default rate
      } else {
        variables[varName] = 0; // Default numeric value
      }
    }
    
    // Extract me.getIngredientAmount patterns
    const ingredientRegex = /me\.getIngredientAmount\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = ingredientRegex.exec(code)) !== null) {
      variables[match[1]] = 0;
    }
    
    // Extract me.hasIngredient patterns
    const hasIngredientRegex = /me\.hasIngredient\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = hasIngredientRegex.exec(code)) !== null) {
      variables[match[1]] = true;
    }
    
    return variables;
  }
  
  function addTestCase(category = 'basicFunctionality') {
    // Extract variables from the section's code
    const extractedVars = section && section.type === 'dynamic' 
      ? extractVariablesFromCode(section.content)
      : {};
    
    const newTestCase = {
      name: `Test Case ${testCases.length + 1}`,
      variables: extractedVars,
      expectedOutput: '',
      expectedStyles: '',
      matchType: 'contains',
      category: category
    };
    testCases = [...testCases, newTestCase];
    activeTestIndex = testCases.length - 1;
    isDirty = true;
  }
  
  function deleteTestCase(index) {
    if (testCases.length <= 1) {
      alert('Cannot delete the last test case');
      return;
    }
    
    if (confirm(`Delete "${testCases[index].name}"?`)) {
      testCases = testCases.filter((_, i) => i !== index);
      if (activeTestIndex >= testCases.length) {
        activeTestIndex = testCases.length - 1;
      }
      isDirty = true;
    }
  }
  
  function moveTestCase(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= testCases.length) return;
    
    const newTestCases = [...testCases];
    [newTestCases[index], newTestCases[newIndex]] = [newTestCases[newIndex], newTestCases[index]];
    testCases = newTestCases;
    activeTestIndex = newIndex;
    isDirty = true;
  }
  
  function addVariable(testIndex) {
    const varName = prompt('Enter variable name:');
    if (varName && !testCases[testIndex].variables[varName]) {
      testCases[testIndex].variables[varName] = '';
      testCases = [...testCases];
      isDirty = true;
    }
  }
  
  function removeVariable(testIndex, varName) {
    if (confirm(`Remove variable "${varName}"?`)) {
      delete testCases[testIndex].variables[varName];
      testCases = [...testCases];
      isDirty = true;
    }
  }
  
  function updateVariable(testIndex, varName, value) {
    testCases[testIndex].variables[varName] = value;
    testCases = [...testCases];
    isDirty = true;
  }
  
  function runTest(testIndex) {
    const testCase = testCases[testIndex];
    isRunningTest[testIndex] = true;
    isRunningTest = {...isRunningTest};
    
    try {
      const result = testRunnerService.runSingleTest(
        section, // Pass the full section object
        testCase,
        {
          tpnMode: false,
          currentTPNInstance: null,
          currentIngredientValues: null,
          activeTestCase: testCase
        }
      );
      
      testResults[testIndex] = result.testResult;
      testResults = {...testResults};
      
      // Update preview with the test result if this is the active test
      if (testIndex === activeTestIndex && showPreview && result.testResult?.actualOutput) {
        previewContent = result.testResult.actualOutput;
      }
    } catch (error) {
      testResults[testIndex] = {
        passed: false,
        error: error.message
      };
      testResults = {...testResults};
    } finally {
      isRunningTest[testIndex] = false;
      isRunningTest = {...isRunningTest};
    }
  }
  
  function runAllTests() {
    for (let i = 0; i < testCases.length; i++) {
      runTest(i);
    }
  }
  
  function runGroupTests(category) {
    const testsInGroup = groupedTests[category] || [];
    for (const test of testsInGroup) {
      runTest(test.originalIndex);
    }
  }
  
  function moveTestToGroup(testIndex, newCategory) {
    if (testCases[testIndex]) {
      testCases[testIndex].category = newCategory;
      testCases = [...testCases];
      isDirty = true;
    }
  }
  
  function toggleGroup(category) {
    expandedGroups[category] = !expandedGroups[category];
    expandedGroups = {...expandedGroups};
  }
  
  async function generatePreview() {
    const currentTest = getActiveTest();
    if (!section || !currentTest || section.type !== 'dynamic') return;
    
    try {
      const html = previewEngineService.evaluateCode(
        section.content,
        currentTest.variables || {},
        { 
          tpnInstance: null, // No TPN instance for non-TPN tests
          testCaseIndex: activeTestIndex,
          sections: [section]
        }
      );
      
      previewContent = html || '<div style="color: gray; padding: 1rem;">No output</div>';
    } catch (error) {
      previewContent = `<div style="color: red; padding: 1rem;">Preview error: ${error.message}</div>`;
    }
  }
  
  function debouncePreview() {
    clearTimeout(previewDebounceTimer);
    previewDebounceTimer = setTimeout(() => {
      generatePreview();
    }, 500);
  }
  
  // Update preview when active test index changes
  $effect(() => {
    if (activeTestIndex >= 0 && testCases[activeTestIndex] && showPreview) {
      debouncePreview();
    }
  });
  
  // Use getter instead of derived to avoid issues
  function getActiveTest() {
    return testCases && testCases.length > 0 && activeTestIndex >= 0 && activeTestIndex < testCases.length 
      ? testCases[activeTestIndex] 
      : null;
  }
</script>

{#if isOpen && section}
  <div 
    class="modal-overlay" 
    onclick={close}
    onkeydown={handleKeydown}
    role="button"
    tabindex="-1"
    aria-label="Close modal overlay"
  >
    <div 
      class="modal-content" 
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Test Case Manager"
      tabindex="-1"
    >
      <div class="modal-header">
        <h2>🧪 Test Case Manager</h2>
        <div class="header-actions">
          {#if isDirty}
            <span class="unsaved-indicator">• Unsaved changes</span>
          {/if}
          <button class="close-btn" onclick={close} aria-label="Close">×</button>
        </div>
      </div>
      
      <div class="modal-body">
        <!-- Left sidebar with test case list -->
        <div class="test-list-sidebar">
          <div class="sidebar-header">
            <h3>Test Cases</h3>
            <button class="add-btn" onclick={addTestCase} title="Add test case">
              + Add
            </button>
          </div>
          
          <div class="test-list">
            {#each Object.entries(testGroups) as [category, groupInfo]}
              <div class="test-group">
                <div 
                  class="group-header"
                  onclick={() => toggleGroup(category)}
                  onkeydown={(e) => e.key === 'Enter' && toggleGroup(category)}
                  role="button"
                  tabindex="0"
                  aria-expanded={expandedGroups[category]}
                  aria-label={`${groupInfo.label} group with ${groupStats[category]?.total || 0} tests`}
                >
                  <span class="group-toggle">
                    {expandedGroups[category] ? '▼' : '▶'}
                  </span>
                  <span class="group-icon">{groupInfo.icon}</span>
                  <span class="group-label">{groupInfo.label}</span>
                  <span class="group-stats">
                    ({groupStats[category]?.total || 0}
                    {#if groupStats[category]?.passed > 0}
                      <span class="stat-passed">✓{groupStats[category].passed}</span>
                    {/if}
                    {#if groupStats[category]?.failed > 0}
                      <span class="stat-failed">✗{groupStats[category].failed}</span>
                    {/if})
                  </span>
                  <button 
                    class="group-action-btn"
                    onclick={(e) => { e.stopPropagation(); addTestCase(category); }}
                    title="Add test to group"
                  >+</button>
                  <button 
                    class="group-action-btn"
                    onclick={(e) => { e.stopPropagation(); runGroupTests(category); }}
                    title="Run all tests in group"
                  >▶</button>
                </div>
                
                {#if expandedGroups[category]}
                  <div class="group-tests">
                    {#each groupedTests[category] || [] as test}
                      <div 
                        class="test-list-item {activeTestIndex === test.originalIndex ? 'active' : ''}"
                        onclick={() => activeTestIndex = test.originalIndex}
                      >
                        <div class="test-list-item-content">
                          <span class="test-name">{test.name}</span>
                          {#if testResults[test.originalIndex]}
                            <span class="test-status {testResults[test.originalIndex].passed ? 'passed' : 'failed'}">
                              {testResults[test.originalIndex].passed ? '✓' : '✗'}
                            </span>
                          {/if}
                        </div>
                        
                        <div class="test-actions">
                          <select 
                            class="move-to-group"
                            value={test.category}
                            onchange={(e) => { e.stopPropagation(); moveTestToGroup(test.originalIndex, e.target.value); }}
                            onclick={(e) => e.stopPropagation()}
                            title="Move to group"
                          >
                            <option value="basicFunctionality">Basic</option>
                            <option value="edgeCases">Edge</option>
                            <option value="qaBreaking">QA</option>
                          </select>
                          <button 
                            class="action-btn delete"
                            onclick={(e) => { e.stopPropagation(); deleteTestCase(test.originalIndex); }}
                            disabled={testCases.length === 1}
                            title="Delete"
                          >🗑</button>
                        </div>
                      </div>
                    {/each}
                    {#if !groupedTests[category] || groupedTests[category].length === 0}
                      <div class="empty-group">No tests in this group</div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
          
          <button class="run-all-btn" onclick={runAllTests}>
            Run All Tests
          </button>
        </div>
        
        <!-- Main content area with split layout -->
        <div class="main-content {showPreview ? 'with-preview' : 'no-preview'}">
          {#if getActiveTest()}
            <div class="test-editor">
            <div class="editor-section">
              <label for="test-name">Test Name</label>
              <input 
                id="test-name"
                type="text" 
                bind:value={testCases[activeTestIndex].name}
                oninput={() => isDirty = true}
                class="test-name-input"
              />
            </div>
            
            <!-- Variables Section -->
            <div class="editor-section">
              <div class="section-header">
                <h4>Variables</h4>
                <button class="add-var-btn" onclick={() => addVariable(activeTestIndex)}>
                  + Add Variable
                </button>
              </div>
              
              <div class="variables-grid">
                {#each Object.entries(getActiveTest()?.variables || {}) as [varName, varValue]}
                  <div class="variable-row">
                    <span class="var-name">{varName}:</span>
                    <input 
                      type="text"
                      value={varValue}
                      oninput={(e) => updateVariable(activeTestIndex, varName, e.target.value)}
                      class="var-value"
                      placeholder="Enter value"
                    />
                    <button 
                      class="remove-var-btn"
                      onclick={() => removeVariable(activeTestIndex, varName)}
                      title="Remove variable"
                    >×</button>
                  </div>
                {/each}
                
                {#if Object.keys(getActiveTest()?.variables || {}).length === 0}
                  <p class="no-variables">No variables defined. Click "Add Variable" to create one.</p>
                {/if}
              </div>
            </div>
            
            <!-- Expected Output Section -->
            <div class="editor-section">
              <div class="section-header">
                <h4>Expected Output</h4>
                <select 
                  bind:value={testCases[activeTestIndex].matchType}
                  onchange={() => isDirty = true}
                  class="match-type-select"
                >
                  <option value="exact">Exact Match</option>
                  <option value="contains">Contains</option>
                  <option value="regex">Regex</option>
                  <option value="styles">Styles Only</option>
                </select>
              </div>
              
              <div class="code-editor-wrapper">
                <CodeEditor
                  value={getActiveTest()?.expectedOutput || ''}
                  language="html"
                  onChange={(value) => {
                    const activeTest = getActiveTest();
                    if (activeTest) {
                      activeTest.expectedOutput = value;
                      testCases = [...testCases];
                      isDirty = true;
                    }
                  }}
                />
              </div>
            </div>
            
            <!-- Expected Styles Section (optional) -->
            {#if getActiveTest()?.matchType === 'styles' || getActiveTest()?.expectedStyles}
              <div class="editor-section">
                <h4>Expected Styles</h4>
                <div class="code-editor-wrapper">
                  <CodeEditor
                    value={getActiveTest()?.expectedStyles || ''}
                    language="javascript"
                    onChange={(value) => {
                      const activeTest = getActiveTest();
                      if (activeTest) {
                        activeTest.expectedStyles = value;
                        testCases = [...testCases];
                        isDirty = true;
                      }
                    }}
                  />
                </div>
              </div>
            {/if}
            
            <!-- Test Results Section -->
            <div class="editor-section">
              <div class="section-header">
                <h4>Test Results</h4>
                <button 
                  class="run-test-btn"
                  onclick={() => runTest(activeTestIndex)}
                  disabled={isRunningTest[activeTestIndex]}
                >
                  {isRunningTest[activeTestIndex] ? 'Running...' : 'Run Test'}
                </button>
              </div>
              
              {#if testResults[activeTestIndex]}
                <div class="test-result {testResults[activeTestIndex].passed ? 'passed' : 'failed'}">
                  <div class="result-header">
                    {testResults[activeTestIndex].passed ? '✅ Test Passed' : '❌ Test Failed'}
                  </div>
                  
                  {#if testResults[activeTestIndex].actual}
                    <div class="result-section">
                      <h5>Actual Output:</h5>
                      <pre>{testResults[activeTestIndex].actual}</pre>
                    </div>
                  {/if}
                  
                  {#if testResults[activeTestIndex].expected}
                    <div class="result-section">
                      <h5>Expected Output:</h5>
                      <pre>{testResults[activeTestIndex].expected}</pre>
                    </div>
                  {/if}
                  
                  {#if testResults[activeTestIndex].error}
                    <div class="result-section error">
                      <h5>Error:</h5>
                      <pre>{testResults[activeTestIndex].error}</pre>
                    </div>
                  {/if}
                </div>
              {:else}
                <p class="no-results">No test results yet. Click "Run Test" to execute.</p>
              {/if}
            </div>
          </div>
          {/if}
          
          <!-- Preview Panel -->
          {#if showPreview}
            <div class="preview-panel">
              <div class="preview-header">
                <h4>Live Preview</h4>
                <button 
                  class="toggle-preview-btn"
                  onclick={() => showPreview = false}
                  title="Hide preview"
                >×</button>
              </div>
              <div class="preview-content">
                {#if previewContent}
                  {@html previewContent}
                {:else}
                  <div class="preview-placeholder">
                    Preview will appear here when you run a test or make changes
                  </div>
                {/if}
              </div>
            </div>
          {:else}
            <button 
              class="show-preview-btn"
              onclick={() => showPreview = true}
              title="Show preview panel"
            >
              👁 Show Preview
            </button>
          {/if}
        </div>
      </div>
      
      <div class="modal-footer">
        <div class="footer-info">
          {testCases.length} test case{testCases.length !== 1 ? 's' : ''}
        </div>
        <div class="footer-actions">
          <button class="cancel-btn" onclick={close}>
            Cancel
          </button>
          <button 
            class="save-btn"
            onclick={save}
            disabled={!isDirty}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 2rem;
  }
  
  .modal-content {
    background-color: #1a1a1a;
    border-radius: 12px;
    width: 90vw;
    height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #333;
  }
  
  .modal-header h2 {
    margin: 0;
    color: #fff;
    font-size: 1.5rem;
  }
  
  .header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .unsaved-indicator {
    color: #ffa500;
    font-size: 0.9rem;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 2rem;
    color: #999;
    cursor: pointer;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: all 0.2s;
  }
  
  .close-btn:hover {
    background-color: #333;
    color: #fff;
  }
  
  .modal-body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }
  
  /* Left Sidebar */
  .test-list-sidebar {
    width: 250px;
    background-color: #0d0d0d;
    border-right: 1px solid #333;
    display: flex;
    flex-direction: column;
  }
  
  .sidebar-header {
    padding: 1rem;
    border-bottom: 1px solid #333;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .sidebar-header h3 {
    margin: 0;
    color: #fff;
    font-size: 1rem;
  }
  
  .add-btn {
    background: #667eea;
    color: white;
    border: none;
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s;
  }
  
  .add-btn:hover {
    background: #764ba2;
  }
  
  .test-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }
  
  .test-list-item {
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    background-color: #1a1a1a;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid transparent;
  }
  
  .test-list-item:hover {
    background-color: #2a2a2a;
  }
  
  .test-list-item.active {
    background-color: #2a2a3a;
    border-color: #667eea;
  }
  
  .test-list-item-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .test-name {
    color: #fff;
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .test-status {
    font-size: 0.85rem;
    font-weight: bold;
  }
  
  .test-status.passed {
    color: #28a745;
  }
  
  .test-status.failed {
    color: #dc3545;
  }
  
  .test-actions {
    display: flex;
    gap: 0.25rem;
  }
  
  .action-btn {
    background: #333;
    color: #999;
    border: none;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
    transition: all 0.2s;
  }
  
  .action-btn:hover:not(:disabled) {
    background: #444;
    color: #fff;
  }
  
  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .action-btn.delete:hover:not(:disabled) {
    background: #dc3545;
    color: #fff;
  }
  
  .run-all-btn {
    margin: 0.5rem;
    padding: 0.75rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }
  
  .run-all-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
  
  /* Test Groups */
  .test-group {
    margin-bottom: 0.5rem;
  }
  
  .group-header {
    display: flex;
    align-items: center;
    padding: 0.75rem;
    background-color: #252525;
    border-radius: 6px;
    cursor: pointer;
    user-select: none;
    transition: all 0.2s;
  }
  
  .group-header:hover {
    background-color: #2a2a2a;
  }
  
  .group-toggle {
    margin-right: 0.5rem;
    color: #999;
    font-size: 0.75rem;
  }
  
  .group-icon {
    margin-right: 0.5rem;
    font-size: 1.1rem;
  }
  
  .group-label {
    flex: 1;
    color: #fff;
    font-weight: 500;
  }
  
  .group-stats {
    margin-right: 0.5rem;
    color: #999;
    font-size: 0.85rem;
  }
  
  .stat-passed {
    color: #28a745;
    margin-left: 0.25rem;
  }
  
  .stat-failed {
    color: #dc3545;
    margin-left: 0.25rem;
  }
  
  .group-action-btn {
    background: #333;
    color: #999;
    border: none;
    padding: 0.25rem 0.5rem;
    margin-left: 0.25rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s;
  }
  
  .group-action-btn:hover {
    background: #444;
    color: #fff;
  }
  
  .group-tests {
    padding-left: 1.5rem;
    margin-top: 0.5rem;
  }
  
  .empty-group {
    padding: 1rem;
    color: #666;
    font-style: italic;
    text-align: center;
    background-color: #1a1a1a;
    border-radius: 6px;
    margin-bottom: 0.5rem;
  }
  
  .move-to-group {
    background: #333;
    color: #999;
    border: 1px solid #444;
    padding: 0.25rem;
    border-radius: 4px;
    font-size: 0.75rem;
    cursor: pointer;
    margin-right: 0.25rem;
  }
  
  .move-to-group:hover {
    background: #444;
    color: #fff;
  }
  
  /* Main Content Area */
  .main-content {
    flex: 1;
    display: flex;
    overflow: hidden;
    position: relative;
  }
  
  .main-content.with-preview {
    gap: 1px;
  }
  
  .test-editor {
    flex: 1;
    padding: 1.5rem;
    overflow-y: auto;
    min-width: 0;
  }
  
  /* Preview Panel */
  .preview-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: #1e1e1e;
    border-left: 1px solid #333;
    min-width: 0;
  }
  
  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background-color: #252525;
    border-bottom: 1px solid #333;
  }
  
  .preview-header h4 {
    color: #fff;
    margin: 0;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .toggle-preview-btn {
    background: transparent;
    color: #999;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
  }
  
  .toggle-preview-btn:hover {
    background: #333;
    color: #fff;
  }
  
  .preview-content {
    flex: 1;
    padding: 1.5rem;
    overflow: auto;
    background-color: #ffffff;
    color: #000;
  }
  
  .preview-placeholder {
    color: #999;
    text-align: center;
    padding: 2rem;
    font-style: italic;
    background-color: #f5f5f5;
    border-radius: 6px;
  }
  
  .show-preview-btn {
    position: absolute;
    right: 1rem;
    top: 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
    z-index: 10;
  }
  
  .show-preview-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
  
  /* Responsive Design */
  @media (max-width: 768px) {
    .modal-content {
      width: 95vw;
      height: 95vh;
      padding: 0;
    }
    
    .modal-body {
      flex-direction: column;
    }
    
    .test-list-sidebar {
      width: 100%;
      max-width: 100%;
      border-right: none;
      border-bottom: 1px solid #333;
      max-height: 40vh;
    }
    
    .main-content {
      flex-direction: column;
    }
    
    .test-editor {
      max-height: 50vh;
    }
    
    .preview-panel {
      border-left: none;
      border-top: 1px solid #333;
      max-height: 40vh;
    }
    
    .group-action-btn {
      padding: 0.2rem 0.4rem;
      font-size: 0.75rem;
    }
    
    .move-to-group {
      font-size: 0.7rem;
    }
  }
  
  .editor-section {
    margin-bottom: 2rem;
  }
  
  .editor-section label {
    display: block;
    color: #999;
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .test-name-input {
    width: 100%;
    padding: 0.75rem;
    background-color: #2a2a2a;
    border: 1px solid #333;
    border-radius: 6px;
    color: #fff;
    font-size: 1rem;
  }
  
  .test-name-input:focus {
    outline: none;
    border-color: #667eea;
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .section-header h4 {
    margin: 0;
    color: #fff;
    font-size: 1.1rem;
  }
  
  .add-var-btn {
    background: #333;
    color: #999;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s;
  }
  
  .add-var-btn:hover {
    background: #444;
    color: #fff;
  }
  
  .variables-grid {
    background-color: #2a2a2a;
    border-radius: 6px;
    padding: 1rem;
  }
  
  .variable-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }
  
  .variable-row:last-child {
    margin-bottom: 0;
  }
  
  .var-name {
    color: #67cdcc;
    font-family: monospace;
    min-width: 120px;
  }
  
  .var-value {
    flex: 1;
    padding: 0.5rem;
    background-color: #1a1a1a;
    border: 1px solid #333;
    border-radius: 4px;
    color: #fff;
    font-family: monospace;
  }
  
  .var-value:focus {
    outline: none;
    border-color: #667eea;
  }
  
  .remove-var-btn {
    background: #dc3545;
    color: white;
    border: none;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  
  .remove-var-btn:hover {
    background: #c82333;
  }
  
  .no-variables {
    color: #666;
    font-style: italic;
    text-align: center;
    padding: 1rem;
  }
  
  .match-type-select {
    padding: 0.5rem 1rem;
    background-color: #333;
    border: 1px solid #444;
    border-radius: 4px;
    color: #fff;
    cursor: pointer;
  }
  
  .code-editor-wrapper {
    height: 200px;
    border: 1px solid #333;
    border-radius: 6px;
    overflow: hidden;
  }
  
  .run-test-btn {
    background: #28a745;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s;
  }
  
  .run-test-btn:hover:not(:disabled) {
    background: #218838;
  }
  
  .run-test-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .test-result {
    background-color: #2a2a2a;
    border-radius: 6px;
    padding: 1rem;
    border: 2px solid;
  }
  
  .test-result.passed {
    border-color: #28a745;
  }
  
  .test-result.failed {
    border-color: #dc3545;
  }
  
  .result-header {
    font-size: 1.1rem;
    font-weight: bold;
    margin-bottom: 1rem;
    color: #fff;
  }
  
  .result-section {
    margin-bottom: 1rem;
  }
  
  .result-section:last-child {
    margin-bottom: 0;
  }
  
  .result-section h5 {
    margin: 0 0 0.5rem 0;
    color: #999;
    font-size: 0.9rem;
  }
  
  .result-section pre {
    background-color: #1a1a1a;
    padding: 0.75rem;
    border-radius: 4px;
    color: #ccc;
    font-family: monospace;
    font-size: 0.85rem;
    overflow-x: auto;
    margin: 0;
  }
  
  .result-section.error pre {
    color: #ff6b6b;
  }
  
  .no-results {
    color: #666;
    font-style: italic;
    text-align: center;
    padding: 2rem;
    background-color: #2a2a2a;
    border-radius: 6px;
  }
  
  /* Footer */
  .modal-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-top: 1px solid #333;
  }
  
  .footer-info {
    color: #999;
    font-size: 0.9rem;
  }
  
  .footer-actions {
    display: flex;
    gap: 1rem;
  }
  
  .cancel-btn, .save-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .cancel-btn {
    background-color: #333;
    color: #fff;
  }
  
  .cancel-btn:hover {
    background-color: #444;
  }
  
  .save-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }
  
  .save-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
  
  .save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    .modal-content {
      width: 95vw;
      height: 95vh;
    }
    
    .test-list-sidebar {
      width: 200px;
    }
    
    .test-editor {
      padding: 1rem;
    }
  }
</style>