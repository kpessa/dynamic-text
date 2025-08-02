<script>
  import { extractKeysFromCode, isValidKey, getKeyCategory } from './tpnLegacy.js';
  
  let { 
    isOpen = $bindable(false),
    currentSection = null,
    allSections = [],
    onTestsGenerated = () => {}
  } = $props();
  
  let activeTab = $state('extraction');
  let isGenerating = $state(false);
  let error = $state(null);
  let extractedData = $state(null);
  let aiRequest = $state(null);
  let aiResponse = $state(null);
  let parsedTests = $state(null);
  let selectedTests = $state({
    basicFunctionality: [],
    edgeCases: [],
    qaBreaking: []
  });
  let selectedTestTypes = $state({
    basicFunctionality: true,
    edgeCases: true,
    qaBreaking: true
  });
  
  const tabs = [
    { id: 'extraction', label: 'Extraction', emoji: '🔍' },
    { id: 'request', label: 'AI Request', emoji: '📤' },
    { id: 'response', label: 'AI Response', emoji: '📥' },
    { id: 'review', label: 'Review Tests', emoji: '✅' }
  ];
  
  // Extract data from current section
  $effect(() => {
    if (currentSection && currentSection.type === 'dynamic') {
      updateExtractedData();
    }
  });
  
  function updateExtractedData() {
    if (!currentSection || !allSections.length) return;
    
    const variables = [];
    const allKeys = extractKeysFromCode(currentSection.content);
    
    // Get variables from existing test cases
    if (currentSection.testCases && currentSection.testCases.length > 0) {
      const testVars = new Set();
      currentSection.testCases.forEach(tc => {
        Object.keys(tc.variables || {}).forEach(key => testVars.add(key));
      });
      variables.push(...Array.from(testVars));
    }
    
    // Add variables from code that aren't in test cases
    allKeys.forEach(v => {
      if (!variables.includes(v)) variables.push(v);
    });
    
    // Extract variables from ALL sections for full context
    const allDocumentKeys = new Set();
    allSections.forEach(section => {
      if (section.type === 'dynamic') {
        const sectionKeys = extractKeysFromCode(section.content);
        sectionKeys.forEach(key => allDocumentKeys.add(key));
        
        // Also get from test cases
        if (section.testCases) {
          section.testCases.forEach(tc => {
            Object.keys(tc.variables || {}).forEach(key => allDocumentKeys.add(key));
          });
        }
      }
    });
    
    // Build full document context
    const documentContext = allSections.map(section => ({
      id: section.id,
      type: section.type,
      content: section.content,
      testCases: section.testCases || []
    }));
    
    extractedData = {
      sectionId: currentSection.id,
      sectionName: `Section ${currentSection.id}`,
      code: currentSection.content,
      extractedKeys: allKeys,
      allVariables: variables,
      tpnKeys: variables.filter(v => isValidKey(v)),
      customKeys: variables.filter(v => !isValidKey(v)),
      keyCategories: groupKeysByCategory(variables.filter(v => isValidKey(v))),
      // Full document context
      documentContext: documentContext,
      allDocumentKeys: Array.from(allDocumentKeys),
      allDocumentTpnKeys: Array.from(allDocumentKeys).filter(v => isValidKey(v)),
      allDocumentCustomKeys: Array.from(allDocumentKeys).filter(v => !isValidKey(v)),
      documentStats: {
        totalSections: allSections.length,
        staticSections: allSections.filter(s => s.type === 'static').length,
        dynamicSections: allSections.filter(s => s.type === 'dynamic').length,
        totalTestCases: allSections.reduce((sum, s) => sum + (s.testCases?.length || 0), 0),
        totalVariables: allDocumentKeys.size
      },
      codeStats: {
        lines: currentSection.content.split('\n').length,
        characters: currentSection.content.length,
        hasReturn: currentSection.content.includes('return'),
        hasMe: currentSection.content.includes('me.'),
        hasGetValue: currentSection.content.includes('getValue'),
        hasHtml: /<[^>]*>/.test(currentSection.content)
      }
    };
  }
  
  function groupKeysByCategory(keys) {
    const groups = {};
    keys.forEach(key => {
      const category = getKeyCategory(key) || 'OTHER';
      if (!groups[category]) groups[category] = [];
      groups[category].push(key);
    });
    return groups;
  }
  
  async function generateTests() {
    if (!extractedData) return;
    
    isGenerating = true;
    error = null;
    activeTab = 'request';
    
    try {
      // Create the request data with full document context
      const requestData = {
        dynamicCode: extractedData.code,
        variables: extractedData.allVariables,
        sectionName: extractedData.sectionName,
        notes: null,
        // Add full document context
        documentContext: extractedData.documentContext,
        allDocumentVariables: extractedData.allDocumentKeys,
        documentStats: extractedData.documentStats,
        targetSectionId: extractedData.sectionId,
        // Add selected test types
        testTypes: selectedTestTypes
      };
      
      aiRequest = {
        endpoint: '/api/generate-tests',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestData,
        timestamp: new Date().toISOString()
      };
      
      const response = await fetch('/api/generate-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      
      const responseText = await response.text();
      
      aiResponse = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        rawBody: responseText,
        timestamp: new Date().toISOString()
      };
      
      activeTab = 'response';
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { error: responseText };
        }
        
        // Store error details in the response for debugging
        aiResponse = {
          ...aiResponse,
          error: errorData
        };
        
        // Provide specific error message based on the error
        if (errorData.details?.includes('GEMINI_API_KEY')) {
          throw new Error('AI service not configured. Please ensure GEMINI_API_KEY is set in environment variables.');
        } else if (errorData.details?.includes('parse')) {
          throw new Error(`AI response parsing failed: ${errorData.details}. The AI may have generated invalid JSON.`);
        } else {
          throw new Error(errorData.error || 'Failed to generate tests');
        }
      }
      
      const data = JSON.parse(responseText);
      
      if (data.success && data.tests) {
        parsedTests = data.tests;
        selectedTests = {
          basicFunctionality: [],
          edgeCases: [],
          qaBreaking: []
        };
        activeTab = 'review';
      } else {
        throw new Error('Invalid response from server');
      }
      
    } catch (err) {
      console.error('Test generation error:', err);
      
      // Provide helpful error messages based on the error type
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        error = 'AI test generation requires running with "pnpm run dev:vercel" instead of "pnpm dev". The API endpoint is not available in frontend-only mode.';
      } else if (err.message.includes('404')) {
        error = 'API endpoint not found. Make sure you\'re running "pnpm run dev:vercel" for full functionality.';
      } else {
        error = err.message;
      }
    } finally {
      isGenerating = false;
    }
  }
  
  function toggleTest(category, index) {
    if (selectedTests[category].includes(index)) {
      selectedTests[category] = selectedTests[category].filter(i => i !== index);
    } else {
      selectedTests[category] = [...selectedTests[category], index];
    }
  }
  
  function selectAll(category) {
    if (selectedTests[category].length === parsedTests[category].length) {
      selectedTests[category] = [];
    } else {
      selectedTests[category] = parsedTests[category].map((_, i) => i);
    }
  }
  
  function importTests() {
    const testsToImport = [];
    
    Object.keys(selectedTests).forEach(category => {
      selectedTests[category].forEach(index => {
        const test = parsedTests[category][index];
        testsToImport.push({
          name: test.name,
          variables: test.variables
        });
      });
    });
    
    if (testsToImport.length > 0) {
      onTestsGenerated(currentSection.id, testsToImport);
      isOpen = false;
      resetState();
    }
  }
  
  function resetState() {
    activeTab = 'extraction';
    isGenerating = false;
    error = null;
    aiRequest = null;
    aiResponse = null;
    parsedTests = null;
    selectedTests = {
      basicFunctionality: [],
      edgeCases: [],
      qaBreaking: []
    };
  }
  
  function getBadgeColor(key) {
    const category = getKeyCategory(key);
    const colors = {
      'BASIC_PARAMETERS': '#007bff',
      'MACRONUTRIENTS': '#28a745',
      'ELECTROLYTES': '#ffc107',
      'ADDITIVES': '#6c757d',
      'PREFERENCES': '#17a2b8',
      'CALCULATED_VOLUMES': '#e83e8c',
      'CLINICAL_CALCULATIONS': '#fd7e14',
      'WEIGHT_CALCULATIONS': '#6f42c1',
      'OTHER': '#333'
    };
    return colors[category] || colors.OTHER;
  }
  
  $effect(() => {
    if (isOpen && currentSection) {
      resetState();
      updateExtractedData();
    }
  });
</script>

{#if isOpen}
  <div 
    class="inspector-overlay" 
    onclick={() => isOpen = false}
    onkeydown={(e) => e.key === 'Escape' && (isOpen = false)}
    role="button"
    tabindex="-1"
    aria-label="Close inspector overlay"
  >
    <div 
      class="inspector-content" 
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="AI Workflow Inspector"
      tabindex="-1"
    >
      <div class="inspector-header">
        <h2>🤖 AI Workflow Inspector</h2>
        <button class="close-btn" onclick={() => isOpen = false}>×</button>
      </div>
      
      <div class="tabs">
        {#each tabs as tab}
          <button 
            class="tab {activeTab === tab.id ? 'active' : ''}"
            onclick={() => activeTab = tab.id}
            disabled={tab.id === 'request' && !aiRequest || 
                     tab.id === 'response' && !aiResponse || 
                     tab.id === 'review' && !parsedTests}
          >
            <span class="tab-emoji">{tab.emoji}</span>
            {tab.label}
          </button>
        {/each}
      </div>
      
      <div class="tab-content">
        {#if activeTab === 'extraction'}
          <div class="extraction-panel">
            <div class="section-info">
              <h3>Document Overview</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span>Target Section:</span>
                  <span>Section {extractedData?.sectionId || 'N/A'}</span>
                </div>
                <div class="info-item">
                  <span>Total Sections:</span>
                  <span>{extractedData?.documentStats.totalSections || 0}</span>
                </div>
                <div class="info-item">
                  <span>Static / Dynamic:</span>
                  <span>{extractedData?.documentStats.staticSections || 0} / {extractedData?.documentStats.dynamicSections || 0}</span>
                </div>
                <div class="info-item">
                  <span>Total Test Cases:</span>
                  <span>{extractedData?.documentStats.totalTestCases || 0}</span>
                </div>
                <div class="info-item">
                  <span>Document Variables:</span>
                  <span>{extractedData?.documentStats.totalVariables || 0}</span>
                </div>
                <div class="info-item">
                  <span>Context Size:</span>
                  <span>{extractedData?.documentContext?.reduce((sum, s) => sum + s.content.length, 0) || 0} chars</span>
                </div>
              </div>
            </div>
            
            <div class="section-info">
              <h3>Target Section Details</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span>Lines of Code:</span>
                  <span>{extractedData?.codeStats.lines || 0}</span>
                </div>
                <div class="info-item">
                  <span>Characters:</span>
                  <span>{extractedData?.codeStats.characters || 0}</span>
                </div>
                <div class="info-item">
                  <span>Has Return:</span>
                  <span class="boolean {extractedData?.codeStats.hasReturn ? 'true' : 'false'}">
                    {extractedData?.codeStats.hasReturn ? '✓' : '✗'}
                  </span>
                </div>
                <div class="info-item">
                  <span>Uses me.getValue:</span>
                  <span class="boolean {extractedData?.codeStats.hasGetValue ? 'true' : 'false'}">
                    {extractedData?.codeStats.hasGetValue ? '✓' : '✗'}
                  </span>
                </div>
                <div class="info-item">
                  <span>Generates HTML:</span>
                  <span class="boolean {extractedData?.codeStats.hasHtml ? 'true' : 'false'}">
                    {extractedData?.codeStats.hasHtml ? '✓' : '✗'}
                  </span>
                </div>
                <div class="info-item">
                  <span>Section Variables:</span>
                  <span>{extractedData?.allVariables.length || 0}</span>
                </div>
              </div>
            </div>
            
            <div class="variables-section">
              <h3>Document Variables (All Sections)</h3>
              
              {#if extractedData?.allDocumentTpnKeys.length > 0}
                <div class="variable-group">
                  <h4>Document TPN Variables ({extractedData.allDocumentTpnKeys.length})</h4>
                  <div class="variable-badges">
                    {#each extractedData.allDocumentTpnKeys as key}
                      <span 
                        class="variable-badge tpn-badge" 
                        style="background-color: {getBadgeColor(key)}"
                        title="{getKeyCategory(key)}: {key}"
                      >
                        {key}
                      </span>
                    {/each}
                  </div>
                </div>
              {/if}
              
              {#if extractedData?.allDocumentCustomKeys.length > 0}
                <div class="variable-group">
                  <h4>Document Custom Variables ({extractedData.allDocumentCustomKeys.length})</h4>
                  <div class="variable-badges">
                    {#each extractedData.allDocumentCustomKeys as key}
                      <span class="variable-badge custom-badge" title="Custom: {key}">
                        {key}
                      </span>
                    {/each}
                  </div>
                </div>
              {/if}
              
              <h3>Target Section Variables</h3>
              
              {#if extractedData?.tpnKeys.length > 0}
                <div class="variable-group">
                  <h4>Section TPN Variables ({extractedData.tpnKeys.length})</h4>
                  <div class="variable-badges">
                    {#each extractedData.tpnKeys as key}
                      <span 
                        class="variable-badge tpn-badge section-variable" 
                        style="background-color: {getBadgeColor(key)}"
                        title="{getKeyCategory(key)}: {key}"
                      >
                        {key}
                      </span>
                    {/each}
                  </div>
                </div>
              {/if}
              
              {#if extractedData?.customKeys.length > 0}
                <div class="variable-group">
                  <h4>Section Custom Variables ({extractedData.customKeys.length})</h4>
                  <div class="variable-badges">
                    {#each extractedData.customKeys as key}
                      <span class="variable-badge custom-badge section-variable" title="Custom: {key}">
                        {key}
                      </span>
                    {/each}
                  </div>
                </div>
              {/if}
              
              {#if extractedData?.keyCategories && Object.keys(extractedData.keyCategories).length > 0}
                <div class="category-breakdown">
                  <h4>TPN Categories</h4>
                  {#each Object.entries(extractedData.keyCategories) as [category, keys]}
                    <div class="category-item">
                      <span class="category-name">{category.replace('_', ' ').toLowerCase()}</span>
                      <span class="category-count">({keys.length})</span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
            
            <div class="document-context">
              <h3>Full Document Context</h3>
              <p class="context-description">
                The AI will receive the complete document structure including all static and dynamic sections:
              </p>
              {#if extractedData?.documentContext}
                <div class="context-sections">
                  {#each extractedData.documentContext as section, index}
                    <div class="context-section {section.type} {section.id === extractedData.sectionId ? 'target' : ''}">
                      <div class="context-header">
                        <span class="section-type-badge {section.type}">
                          {section.type === 'static' ? '📝' : '⚡'} Section {section.id}
                        </span>
                        {#if section.id === extractedData.sectionId}
                          <span class="target-badge">🎯 Target</span>
                        {/if}
                        <span class="content-length">{section.content.length} chars</span>
                      </div>
                      <div class="context-content">
                        <pre class="context-code">{section.content}</pre>
                        {#if section.testCases && section.testCases.length > 0}
                          <div class="context-test-cases">
                            <strong>Test Cases ({section.testCases.length}):</strong>
                            {#each section.testCases as testCase}
                              <div class="context-test-case">
                                <span class="test-name">{testCase.name}</span>
                                <span class="test-vars">({Object.keys(testCase.variables || {}).length} vars)</span>
                              </div>
                            {/each}
                          </div>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
            
            <div class="code-preview">
              <h3>Target Section Code</h3>
              <pre class="code-block">{extractedData?.code || ''}</pre>
            </div>
            
            <div class="test-type-selection">
              <h3>Test Types to Generate</h3>
              <div class="test-type-options">
                <label class="test-type-option">
                  <input 
                    type="checkbox" 
                    bind:checked={selectedTestTypes.basicFunctionality}
                  />
                  <span>✅ Basic Functionality</span>
                </label>
                <label class="test-type-option">
                  <input 
                    type="checkbox" 
                    bind:checked={selectedTestTypes.edgeCases}
                  />
                  <span>⚡ Edge Cases</span>
                </label>
                <label class="test-type-option">
                  <input 
                    type="checkbox" 
                    bind:checked={selectedTestTypes.qaBreaking}
                  />
                  <span>🔨 QA/Breaking Tests</span>
                </label>
              </div>
            </div>
            
            <div class="action-row">
              <button 
                class="generate-btn"
                onclick={generateTests}
                disabled={!extractedData || isGenerating || (!selectedTestTypes.basicFunctionality && !selectedTestTypes.edgeCases && !selectedTestTypes.qaBreaking)}
              >
                {#if isGenerating}
                  <span class="spinner"></span>
                  Generating...
                {:else}
                  🚀 Generate Tests
                {/if}
              </button>
            </div>
          </div>
          
        {:else if activeTab === 'request'}
          <div class="request-panel">
            <h3>AI Request Details</h3>
            {#if aiRequest}
              <div class="request-info">
                <div class="info-item">
                  <span>Endpoint:</span>
                  <code>{aiRequest.endpoint}</code>
                </div>
                <div class="info-item">
                  <span>Method:</span>
                  <code>{aiRequest.method}</code>
                </div>
                <div class="info-item">
                  <span>Timestamp:</span>
                  <code>{new Date(aiRequest.timestamp).toLocaleString()}</code>
                </div>
              </div>
              
              <h4>Request Body</h4>
              <pre class="json-block">{JSON.stringify(aiRequest.body, null, 2)}</pre>
            {:else}
              <p class="placeholder">Request details will appear here after generation starts...</p>
            {/if}
          </div>
          
        {:else if activeTab === 'response'}
          <div class="response-panel">
            <h3>AI Response</h3>
            {#if aiResponse}
              <div class="response-info">
                <div class="info-item">
                  <span>Status:</span>
                  <span class="status-code {aiResponse.status >= 200 && aiResponse.status < 300 ? 'success' : 'error'}">
                    {aiResponse.status} {aiResponse.statusText}
                  </span>
                </div>
                <div class="info-item">
                  <span>Timestamp:</span>
                  <code>{new Date(aiResponse.timestamp).toLocaleString()}</code>
                </div>
              </div>
              
              <h4>Raw Response</h4>
              <pre class="response-block">{aiResponse.rawBody}</pre>
              
              {#if parsedTests}
                <div class="parsed-summary">
                  <h4>Parsed Test Summary</h4>
                  <div class="test-summary">
                    <span>Basic Functionality: {parsedTests.basicFunctionality?.length || 0}</span>
                    <span>Edge Cases: {parsedTests.edgeCases?.length || 0}</span>
                    <span>QA/Breaking: {parsedTests.qaBreaking?.length || 0}</span>
                  </div>
                </div>
              {/if}
            {:else}
              <p class="placeholder">Response details will appear here after AI responds...</p>
            {/if}
          </div>
          
        {:else if activeTab === 'review'}
          <div class="review-panel">
            <h3>Review Generated Tests</h3>
            {#if parsedTests}
              <div class="test-categories">
                {#each Object.entries(parsedTests) as [category, tests]}
                  {#if selectedTestTypes[category]}
                    <div class="category-section">
                    <div class="category-header">
                      <h4>
                        {#if category === 'basicFunctionality'}✅ Basic Functionality
                        {:else if category === 'edgeCases'}⚡ Edge Cases
                        {:else if category === 'qaBreaking'}🔨 QA/Breaking Tests
                        {/if}
                        ({tests.length})
                      </h4>
                      <button 
                        class="select-all-btn"
                        onclick={() => selectAll(category)}
                      >
                        {selectedTests[category].length === tests.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    
                    <div class="test-list">
                      {#each tests as test, index}
                        <div class="test-item {selectedTests[category].includes(index) ? 'selected' : ''}">
                          <label class="test-checkbox">
                            <input 
                              type="checkbox"
                              checked={selectedTests[category].includes(index)}
                              onchange={() => toggleTest(category, index)}
                            />
                          </label>
                          
                          <div class="test-content">
                            <div class="test-header">
                              <h5>{test.name}</h5>
                              <span class="importance-badge {test.importance}">
                                {test.importance}
                              </span>
                            </div>
                            <p class="test-description">{test.description}</p>
                            <div class="test-variables">
                              <strong>Variables:</strong>
                              <code>{JSON.stringify(test.variables, null, 2)}</code>
                            </div>
                            <div class="expected-behavior">
                              <strong>Expected:</strong> {test.expectedBehavior}
                            </div>
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>
                  {/if}
                {/each}
              </div>
            {:else}
              <p class="placeholder">Generated tests will appear here for review...</p>
            {/if}
          </div>
        {/if}
      </div>
      
      {#if error}
        <div class="error-banner">
          ⚠️ {error}
        </div>
      {/if}
      
      <div class="inspector-footer">
        <div class="selection-info">
          {#if parsedTests}
            {Object.values(selectedTests).flat().length} test(s) selected
          {/if}
        </div>
        <div class="action-buttons">
          <button class="cancel-btn" onclick={() => isOpen = false}>
            Close
          </button>
          {#if parsedTests && Object.values(selectedTests).flat().length > 0}
            <button class="import-btn" onclick={importTests}>
              Import {Object.values(selectedTests).flat().length} Tests
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .inspector-overlay {
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
  
  .inspector-content {
    background-color: #fff;
    border-radius: 12px;
    max-width: 1200px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    color: #212529;
  }
  
  .inspector-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #dee2e6;
  }
  
  .inspector-header h2 {
    margin: 0;
    color: #212529;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 2rem;
    color: #6c757d;
    cursor: pointer;
    padding: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: all 0.2s;
  }
  
  .close-btn:hover {
    background-color: #f8f9fa;
    color: #212529;
  }
  
  .tabs {
    display: flex;
    padding: 0 1.5rem;
    gap: 0.5rem;
    border-bottom: 1px solid #dee2e6;
    background-color: #f8f9fa;
  }
  
  .tab {
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    color: #6c757d;
    cursor: pointer;
    font-size: 0.9rem;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .tab:hover:not(:disabled) {
    color: #212529;
  }
  
  .tab:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .tab.active {
    color: #212529;
    border-bottom-color: #646cff;
    font-weight: 500;
  }
  
  .tab-emoji {
    font-size: 1.1rem;
  }
  
  .tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }
  
  .extraction-panel, .request-panel, .response-panel, .review-panel {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .section-info h3 {
    margin: 0 0 1rem 0;
    color: #0066cc;
  }
  
  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
  }
  
  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background-color: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #e9ecef;
  }
  
  .info-item span:first-child {
    color: #6c757d;
    font-size: 0.9rem;
  }
  
  .info-item span {
    font-weight: 500;
  }
  
  .boolean.true {
    color: #28a745;
  }
  
  .boolean.false {
    color: #dc3545;
  }
  
  .variables-section h3 {
    margin: 0 0 1rem 0;
    color: #0066cc;
  }
  
  .variable-group {
    margin-bottom: 1rem;
  }
  
  .variable-group h4 {
    margin: 0 0 0.5rem 0;
    color: #6c757d;
    font-size: 0.9rem;
  }
  
  .variable-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .variable-badge {
    font-size: 0.8rem;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-weight: 500;
    white-space: nowrap;
  }
  
  .variable-badge.tpn-badge {
    color: white;
  }
  
  .variable-badge.custom-badge {
    background-color: #e9ecef;
    color: #495057;
  }
  
  .category-breakdown {
    margin-top: 1rem;
  }
  
  .category-breakdown h4 {
    margin: 0 0 0.5rem 0;
    color: #999;
    font-size: 0.9rem;
  }
  
  .category-item {
    display: flex;
    justify-content: space-between;
    padding: 0.25rem 0;
    color: #495057;
    font-size: 0.85rem;
  }
  
  .category-name {
    text-transform: capitalize;
  }
  
  .category-count {
    color: #6c757d;
  }
  
  .code-preview h3, .document-context h3 {
    margin: 0 0 1rem 0;
    color: #0066cc;
  }
  
  .context-description {
    color: #6c757d;
    font-size: 0.9rem;
    margin-bottom: 1rem;
    font-style: italic;
  }
  
  .context-sections {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 1rem;
    background-color: #f8f9fa;
  }
  
  .context-section {
    border: 1px solid #dee2e6;
    border-radius: 4px;
    background-color: #fff;
    overflow: hidden;
  }
  
  .context-section.target {
    border-color: #ffc107;
    box-shadow: 0 0 8px rgba(255, 193, 7, 0.3);
  }
  
  .context-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background-color: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
  }
  
  .section-type-badge {
    font-size: 0.8rem;
    padding: 0.2rem 0.5rem;
    border-radius: 12px;
    font-weight: 500;
  }
  
  .section-type-badge.static {
    background-color: #17a2b8;
    color: white;
  }
  
  .section-type-badge.dynamic {
    background-color: #ffc107;
    color: black;
  }
  
  .target-badge {
    background-color: #ff6b6b;
    color: white;
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;
    border-radius: 12px;
    font-weight: 500;
  }
  
  .content-length {
    color: #6c757d;
    font-size: 0.75rem;
    margin-left: auto;
  }
  
  .context-content {
    padding: 0.75rem;
  }
  
  .context-code {
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    padding: 0.5rem;
    font-family: 'Courier New', monospace;
    font-size: 0.8rem;
    color: #212529;
    overflow-x: auto;
    white-space: pre;
    max-height: 150px;
    overflow-y: auto;
    margin: 0;
  }
  
  .context-test-cases {
    margin-top: 0.5rem;
    font-size: 0.85rem;
  }
  
  .context-test-cases strong {
    color: #6c757d;
  }
  
  .context-test-case {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem 0.5rem;
    margin: 0.25rem 0;
    background-color: #e9ecef;
    border-radius: 4px;
  }
  
  .test-name {
    color: #495057;
  }
  
  .test-vars {
    color: #6c757d;
    font-size: 0.8rem;
  }
  
  .section-variable {
    border: 2px solid #ffc107 !important;
    box-shadow: 0 0 4px rgba(255, 193, 7, 0.3);
  }
  
  .code-block, .json-block, .response-block {
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 1rem;
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
    color: #212529;
    overflow-x: auto;
    white-space: pre;
    max-height: 300px;
    overflow-y: auto;
  }
  
  .test-type-selection {
    margin-top: 1.5rem;
    border-top: 1px solid #dee2e6;
    padding-top: 1rem;
  }
  
  .test-type-selection h3 {
    margin: 0 0 1rem 0;
    color: #0066cc;
  }
  
  .test-type-options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .test-type-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    padding: 0.5rem;
    background-color: #f8f9fa;
    border-radius: 6px;
    transition: background-color 0.2s;
    border: 1px solid #e9ecef;
  }
  
  .test-type-option:hover {
    background-color: #e9ecef;
    border-color: #dee2e6;
  }
  
  .test-type-option input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
  
  .test-type-option span {
    font-size: 0.95rem;
    color: #212529;
  }
  
  .action-row {
    display: flex;
    justify-content: center;
    padding-top: 1rem;
    border-top: 1px solid #dee2e6;
  }
  
  .generate-btn {
    padding: 0.75rem 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .generate-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
  
  .generate-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .placeholder {
    text-align: center;
    color: #6c757d;
    padding: 2rem;
    font-style: italic;
  }
  
  .request-info, .response-info {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
  
  .status-code.success {
    color: #28a745;
  }
  
  .status-code.error {
    color: #dc3545;
  }
  
  .parsed-summary {
    margin-top: 1.5rem;
  }
  
  .test-summary {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  
  .test-summary span {
    padding: 0.5rem 1rem;
    background-color: #2a2a2a;
    border-radius: 6px;
    font-size: 0.9rem;
  }
  
  .category-section {
    margin-bottom: 2rem;
  }
  
  .category-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #333;
  }
  
  .category-header h4 {
    margin: 0;
    color: #212529;
  }
  
  .select-all-btn {
    padding: 0.25rem 0.75rem;
    background-color: #6c757d;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
  }
  
  .select-all-btn:hover {
    background-color: #5a6268;
  }
  
  .test-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .test-item {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background-color: #f8f9fa;
    border-radius: 8px;
    border: 2px solid #e9ecef;
    transition: all 0.2s;
  }
  
  .test-item.selected {
    border-color: #646cff;
    background-color: #e7f3ff;
  }
  
  .test-checkbox {
    display: flex;
    align-items: flex-start;
    padding-top: 0.25rem;
  }
  
  .test-content {
    flex: 1;
  }
  
  .test-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .test-header h5 {
    margin: 0;
    color: #212529;
    font-size: 1rem;
  }
  
  .importance-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    color: white;
    font-weight: 500;
  }
  
  .importance-badge.high {
    background-color: #dc3545;
  }
  
  .importance-badge.medium {
    background-color: #ffc107;
    color: #000;
  }
  
  .importance-badge.low {
    background-color: #28a745;
  }
  
  .test-description {
    color: #495057;
    margin: 0.5rem 0;
    font-size: 0.9rem;
  }
  
  .test-variables {
    margin: 0.75rem 0;
    font-size: 0.85rem;
  }
  
  .test-variables strong {
    color: #6c757d;
  }
  
  .test-variables code {
    display: block;
    margin-top: 0.25rem;
    padding: 0.5rem;
    background-color: #f8f9fa;
    border-radius: 4px;
    color: #0066cc;
    font-family: 'Courier New', monospace;
    white-space: pre;
    overflow-x: auto;
    border: 1px solid #e9ecef;
  }
  
  .expected-behavior {
    font-size: 0.85rem;
    color: #28a745;
  }
  
  .expected-behavior strong {
    color: #6c757d;
  }
  
  .error-banner {
    padding: 1rem 1.5rem;
    background-color: #f8d7da;
    color: #721c24;
    border-top: 1px solid #f5c6cb;
    border-left: 4px solid #dc3545;
  }
  
  .inspector-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-top: 1px solid #dee2e6;
    background-color: #f8f9fa;
  }
  
  .selection-info {
    color: #6c757d;
    font-size: 0.9rem;
  }
  
  .action-buttons {
    display: flex;
    gap: 0.5rem;
  }
  
  .cancel-btn, .import-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .cancel-btn {
    background-color: #6c757d;
    color: #fff;
  }
  
  .cancel-btn:hover {
    background-color: #5a6268;
  }
  
  .import-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }
  
  .import-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
</style>