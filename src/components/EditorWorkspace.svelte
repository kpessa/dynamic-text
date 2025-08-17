<script>
  import CodeEditor from '../lib/CodeEditor.svelte';
  import ValidationStatus from '../lib/ValidationStatus.svelte';
  import TestGeneratorButton from '../lib/TestGeneratorButton.svelte';
  import IngredientInputPanel from '../lib/IngredientInputPanel.svelte';
  import { sectionStore } from '../stores/sectionStore.svelte.ts';
  import { workspaceStore } from '../stores/workspaceStore.svelte.ts';
  
  let { 
    sections = [],
    editingSection = null,
    expandedTestCases = {},
    activeTestCase = {},
    navbarUiState = {},
    previewMode = 'preview',
    previewHTML = '',
    jsonOutput = {},
    lineObjects = [],
    referencedIngredients = [],
    currentIngredientValues = {},
    calculationTPNInstance = null,
    ingredientsBySection = {},
    loadedIngredient = null,
    loadedReference = null,
    currentPopulationType = '',
    currentHealthSystem = '',
    availablePopulations = [],
    currentValidationStatus = null,
    currentValidatedBy = null,
    currentValidatedAt = null,
    currentTestResults = null,
    currentValidationNotes = null,
    previewCollapsed = false,
    onEditingSectionChange = () => {},
    onAddSection = () => {},
    onDeleteSection = () => {},
    onUpdateSectionContent = () => {},
    onConvertToDynamic = () => {},
    onToggleTestCases = () => {},
    onAddTestCase = () => {},
    onDeleteTestCase = () => {},
    onUpdateTestCase = () => {},
    onSetActiveTestCase = () => {},
    onRunAllTests = () => {},
    onTestsGenerated = () => {},
    onOpenAIWorkflowInspector = () => {},
    onIngredientChange = () => {},
    onSectionDragStart = () => {},
    onSectionDragOver = () => {},
    onSectionDrop = () => {},
    onSectionDragEnd = () => {},
    onSwitchToPopulation = () => {},
    onShowIngredientManager = () => {},
    onPreviewModeChange = () => {},
    onPreviewCollapsedChange = () => {},
    onOutputModeChange = () => {}
  } = $props();
  
  // Helper function for ingredient badge colors
  function getIngredientBadgeColor(key) {
    // Simple hash function to generate consistent colors
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 85%)`;
  }
</script>

<div class="editor-container {previewCollapsed ? 'preview-collapsed' : ''}">
  <div class="editor-panel">
    <div class="panel-header">
      <h2>Content Sections</h2>
      <div class="header-controls">
        <button 
          class="run-all-tests-btn"
          onclick={onRunAllTests}
          title="Run all test cases with expectations (Ctrl/Cmd+T)"
        >
          🧪 Run All Tests
        </button>
        <div class="add-section-buttons">
          <button class="add-btn" onclick={() => onAddSection('static')}>
            + Static HTML
          </button>
          <button class="add-btn" onclick={() => onAddSection('dynamic')}>
            + Dynamic JS
          </button>
        </div>
      </div>
    </div>
    
    {#if loadedIngredient && loadedReference}
      <IngredientContextBar
        ingredientName={loadedIngredient.name}
        populationType={currentPopulationType}
        healthSystem={currentHealthSystem}
        referenceVersion={loadedReference.version}
        availablePopulations={availablePopulations.map(pop => ({
          type: pop.populationType,
          references: pop.references
        }))}
        onPopulationSelect={(popType, ref) => onSwitchToPopulation(popType, ref)}
        onIngredientClick={() => onShowIngredientManager()}
      />
      
      <!-- Validation Status Section -->
      <div class="validation-section">
        <ValidationStatus 
          status={currentValidationStatus}
          validatedBy={currentValidatedBy}
          validatedAt={currentValidatedAt}
          testResults={currentTestResults}
          notes={currentValidationNotes}
          compact={false}
          onUpdate={(validationData) => {
            workspaceStore.updateValidation(validationData);
            sectionStore.checkForChanges();
          }}
        />
      </div>
    {/if}
    
    <div class="sections" role="list">
      {#if sections.length === 0}
        <div class="empty-state">
          <div class="empty-state-icon">📄</div>
          <h3 class="empty-state-title">Start Creating Your Reference Text</h3>
          <p class="empty-state-description">
            Add sections to build your dynamic text content
          </p>
          <div class="empty-state-actions">
            <button class="empty-state-btn static" onclick={() => onAddSection('static')}>
              <span class="btn-icon">📝</span>
              <span class="btn-label">Add Static HTML</span>
              <span class="btn-hint">For fixed content and formatting</span>
            </button>
            <button class="empty-state-btn dynamic" onclick={() => onAddSection('dynamic')}>
              <span class="btn-icon">⚡</span>
              <span class="btn-label">Add Dynamic JavaScript</span>
              <span class="btn-hint">For calculations and logic</span>
            </button>
          </div>
        </div>
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
                onclick={() => onDeleteSection(section.id)}
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
                  onChange={(content) => onUpdateSectionContent(section.id, content)}
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
                    onclick={() => onToggleTestCases(section.id)}
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
                      onclick={() => {
                        onAddTestCase(section.id);
                        if (!expandedTestCases[section.id]) {
                          onToggleTestCases(section.id);
                        }
                      }}
                    >
                      + Add Test
                    </button>
                    <TestGeneratorButton 
                      section={section}
                      tpnMode={navbarUiState.tpnMode}
                      onTestsGenerated={(tests) => onTestsGenerated(section.id, tests)}
                    />
                    <button 
                      class="ai-inspector-btn"
                      onclick={() => onOpenAIWorkflowInspector(section.id)}
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
                            oninput={(e) => onUpdateTestCase(section.id, index, { name: e.target.value })}
                          />
                          <button 
                            class="test-case-run {activeTestCase[section.id] === testCase ? 'running' : ''}"
                            onclick={() => onSetActiveTestCase(section.id, testCase)}
                            title="Run this test case"
                          >
                            {activeTestCase[section.id] === testCase ? '■' : '▶'}
                          </button>
                          {#if section.testCases.length > 1}
                            <button 
                              class="test-case-delete"
                              onclick={() => onDeleteTestCase(section.id, index)}
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
                              onclick={() => {
                                const varName = prompt('Variable name:');
                                if (varName) {
                                  const vars = { ...testCase.variables, [varName]: 0 };
                                  onUpdateTestCase(section.id, index, { variables: vars });
                                }
                              }}
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
                                  onUpdateTestCase(section.id, index, { variables: vars });
                                }}
                              />
                              <button 
                                class="var-delete"
                                onclick={() => {
                                  const vars = { ...testCase.variables };
                                  delete vars[key];
                                  onUpdateTestCase(section.id, index, { variables: vars });
                                }}
                              >
                                ×
                              </button>
                            </div>
                          {/each}
                        </div>
                        
                        <!-- Test Expectations -->
                        <div class="test-expectations">
                          <div class="expectation-header">
                            <span>Expected Output:</span>
                            <select 
                              class="match-type-select"
                              value={testCase.matchType || 'contains'}
                              onchange={(e) => onUpdateTestCase(section.id, index, { matchType: e.target.value })}
                            >
                              <option value="exact">Exact Match</option>
                              <option value="contains">Contains</option>
                              <option value="regex">Regex</option>
                            </select>
                          </div>
                          <textarea
                            class="expected-output"
                            value={testCase.expectedOutput || ''}
                            placeholder="Enter expected output text..."
                            oninput={(e) => onUpdateTestCase(section.id, index, { expectedOutput: e.target.value })}
                          />
                          
                          <div class="expectation-header">
                            <span>Expected Styles:</span>
                            <button 
                              class="add-style-btn"
                              onclick={() => {
                                const styleProp = prompt('CSS property (e.g., color, font-weight):');
                                if (styleProp) {
                                  const styleValue = prompt(`Value for ${styleProp}:`);
                                  if (styleValue) {
                                    const styles = { ...(testCase.expectedStyles || {}), [styleProp]: styleValue };
                                    onUpdateTestCase(section.id, index, { expectedStyles: styles });
                                  }
                                }
                              }}
                            >
                              + Add Style
                            </button>
                          </div>
                          
                          {#if testCase.expectedStyles}
                            {#each Object.entries(testCase.expectedStyles) as [prop, value]}
                              <div class="style-row">
                                <span class="style-prop">{prop}:</span>
                                <input 
                                  type="text"
                                  value={value}
                                  class="style-value"
                                  oninput={(e) => {
                                    const styles = { ...testCase.expectedStyles };
                                    styles[prop] = e.target.value;
                                    onUpdateTestCase(section.id, index, { expectedStyles: styles });
                                  }}
                                />
                                <button 
                                  class="style-delete"
                                  onclick={() => {
                                    const styles = { ...testCase.expectedStyles };
                                    delete styles[prop];
                                    onUpdateTestCase(section.id, index, { expectedStyles: Object.keys(styles).length > 0 ? styles : undefined });
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            {/each}
                          {/if}
                        </div>
                        
                        <!-- Test Result Display -->
                        {#if testCase.testResult}
                          <div class="test-result {testCase.testResult.passed ? 'passed' : 'failed'}">
                            <div class="result-header">
                              {testCase.testResult.passed ? '✅ Passed' : '❌ Failed'}
                            </div>
                            {#if !testCase.testResult.passed && testCase.testResult.error}
                              <div class="result-error">{testCase.testResult.error}</div>
                            {/if}
                            {#if testCase.testResult.actualOutput}
                              <div class="result-detail">
                                <strong>Actual Output:</strong> {testCase.testResult.actualOutput}
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
  </div>
  
  <div class="preview-panel">
    <div class="panel-header preview-header">
      {#if !previewCollapsed}
        <div class="preview-header-content">
          <div class="view-tabs">
            <button 
              class="view-tab {previewMode === 'preview' ? 'active' : ''}"
              onclick={() => onPreviewModeChange('preview')}
            >
              👁️ Preview
            </button>
            <button 
              class="view-tab {previewMode === 'output' ? 'active' : ''}"
              onclick={() => onPreviewModeChange('output')}
            >
              📊 Output
            </button>
          </div>
          {#if previewMode === 'output'}
            <div class="output-format-selector">
              <button 
                class="format-btn {navbarUiState.outputMode === 'json' ? 'active' : ''}"
                onclick={() => onOutputModeChange('json')}
              >
                JSON
              </button>
              <button 
                class="format-btn {navbarUiState.outputMode === 'configurator' ? 'active' : ''}"
                onclick={() => onOutputModeChange('configurator')}
              >
                Configurator
              </button>
            </div>
          {/if}
        </div>
      {/if}
      <button 
        class="preview-toggle"
        onclick={() => onPreviewCollapsedChange(!previewCollapsed)}
        title="{previewCollapsed ? 'Show' : 'Hide'} Panel"
      >
        {previewCollapsed ? '◀' : '▶'}
      </button>
    </div>
    
    {#if referencedIngredients.length > 0 && !navbarUiState.tpnMode && previewMode === 'preview'}
      <IngredientInputPanel 
        ingredients={referencedIngredients}
        values={currentIngredientValues}
        onChange={onIngredientChange}
        tpnInstance={calculationTPNInstance}
      />
    {/if}
    
    {#if previewMode === 'preview'}
      <div class="preview">
        {@html previewHTML}
      </div>
    {:else if previewMode === 'output'}
      <div class="output-view">
        {#if navbarUiState.outputMode === 'json'}
          <div class="json-output">
            <pre>{JSON.stringify(jsonOutput, null, 2)}</pre>
          </div>
        {:else}
          <div class="configurator">
            {#each lineObjects as item (item.id)}
              <div class="config-line {!item.editable ? 'non-editable' : ''}">
                <input 
                  type="text" 
                  value={item.text}
                  readonly={true}
                  class="line-input"
                />
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  // All styles are in src/styles/layout/_app.scss and src/styles/components/_sections.scss
</style>