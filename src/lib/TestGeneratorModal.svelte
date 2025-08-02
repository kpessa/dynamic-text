<script>
  let { 
    isOpen = $bindable(false), 
    generatedTests, 
    onImportTests,
    sectionId 
  } = $props();
  
  let selectedTests = $state({
    basicFunctionality: [],
    edgeCases: [],
    qaBreaking: []
  });
  
  let activeTab = $state('basicFunctionality');
  
  const tabLabels = {
    basicFunctionality: 'Basic Functionality',
    edgeCases: 'Edge Cases',
    qaBreaking: 'QA/Breaking Tests'
  };
  
  const tabEmojis = {
    basicFunctionality: '✅',
    edgeCases: '⚡',
    qaBreaking: '🔨'
  };
  
  function toggleTest(category, index) {
    if (selectedTests[category].includes(index)) {
      selectedTests[category] = selectedTests[category].filter(i => i !== index);
    } else {
      selectedTests[category] = [...selectedTests[category], index];
    }
  }
  
  function selectAll(category) {
    if (selectedTests[category].length === generatedTests[category].length) {
      selectedTests[category] = [];
    } else {
      selectedTests[category] = generatedTests[category].map((_, i) => i);
    }
  }
  
  function importSelected() {
    const testsToImport = [];
    
    Object.keys(selectedTests).forEach(category => {
      selectedTests[category].forEach(index => {
        const test = generatedTests[category][index];
        testsToImport.push({
          name: test.name,
          variables: test.variables
        });
      });
    });
    
    if (testsToImport.length > 0) {
      onImportTests(sectionId, testsToImport);
      isOpen = false;
    }
  }
  
  function getImportanceColor(importance) {
    switch (importance) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  }
  
  $effect(() => {
    if (isOpen) {
      // Reset selections when modal opens
      selectedTests = {
        basicFunctionality: [],
        edgeCases: [],
        qaBreaking: []
      };
      activeTab = 'basicFunctionality';
    }
  });
</script>

{#if isOpen}
  <div class="modal-overlay" onclick={() => isOpen = false}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>🤖 AI Generated Test Cases</h2>
        <button class="close-btn" onclick={() => isOpen = false}>×</button>
      </div>
      
      <div class="tabs">
        {#each Object.entries(tabLabels) as [key, label]}
          <button 
            class="tab {activeTab === key ? 'active' : ''}"
            onclick={() => activeTab = key}
          >
            <span class="tab-emoji">{tabEmojis[key]}</span>
            {label}
            <span class="tab-count">
              {generatedTests[key]?.length || 0}
            </span>
          </button>
        {/each}
      </div>
      
      <div class="test-list">
        <div class="select-all-row">
          <label class="select-all">
            <input 
              type="checkbox"
              checked={selectedTests[activeTab].length === generatedTests[activeTab]?.length}
              onchange={() => selectAll(activeTab)}
            />
            Select All
          </label>
        </div>
        
        {#if generatedTests[activeTab]}
          {#each generatedTests[activeTab] as test, index}
            <div class="test-item {selectedTests[activeTab].includes(index) ? 'selected' : ''}">
              <label class="test-checkbox">
                <input 
                  type="checkbox"
                  checked={selectedTests[activeTab].includes(index)}
                  onchange={() => toggleTest(activeTab, index)}
                />
              </label>
              
              <div class="test-content">
                <div class="test-header">
                  <h4>{test.name}</h4>
                  <span 
                    class="importance-badge"
                    style="background-color: {getImportanceColor(test.importance)}"
                  >
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
        {:else}
          <p class="no-tests">No tests in this category</p>
        {/if}
      </div>
      
      <div class="modal-footer">
        <div class="selection-info">
          {Object.values(selectedTests).flat().length} test(s) selected
        </div>
        <button class="cancel-btn" onclick={() => isOpen = false}>
          Cancel
        </button>
        <button 
          class="import-btn"
          onclick={importSelected}
          disabled={Object.values(selectedTests).flat().length === 0}
        >
          Import Selected Tests
        </button>
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
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 2rem;
  }
  
  .modal-content {
    background-color: #1a1a1a;
    border-radius: 12px;
    max-width: 900px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
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
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 2rem;
    color: #999;
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
    background-color: #333;
    color: #fff;
  }
  
  .tabs {
    display: flex;
    padding: 0 1.5rem;
    gap: 0.5rem;
    border-bottom: 1px solid #333;
  }
  
  .tab {
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    font-size: 0.9rem;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .tab:hover {
    color: #fff;
  }
  
  .tab.active {
    color: #fff;
    border-bottom-color: #667eea;
  }
  
  .tab-emoji {
    font-size: 1.1rem;
  }
  
  .tab-count {
    background-color: #333;
    color: #999;
    padding: 0.125rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
  }
  
  .tab.active .tab-count {
    background-color: #667eea;
    color: #fff;
  }
  
  .test-list {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 1.5rem;
  }
  
  .select-all-row {
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #333;
  }
  
  .select-all {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    color: #999;
  }
  
  .select-all:hover {
    color: #fff;
  }
  
  .test-item {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    margin-bottom: 1rem;
    background-color: #2a2a2a;
    border-radius: 8px;
    border: 2px solid transparent;
    transition: all 0.2s;
  }
  
  .test-item.selected {
    border-color: #667eea;
    background-color: #2a2a3a;
  }
  
  .test-checkbox {
    display: flex;
    align-items: flex-start;
    padding-top: 0.25rem;
  }
  
  .test-checkbox input {
    cursor: pointer;
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
  
  .test-header h4 {
    margin: 0;
    color: #fff;
    font-size: 1rem;
  }
  
  .importance-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    color: white;
    font-weight: 500;
  }
  
  .test-description {
    color: #ccc;
    margin: 0.5rem 0;
    font-size: 0.9rem;
  }
  
  .test-variables {
    margin: 0.75rem 0;
    font-size: 0.85rem;
  }
  
  .test-variables strong {
    color: #999;
  }
  
  .test-variables code {
    display: block;
    margin-top: 0.25rem;
    padding: 0.5rem;
    background-color: #1a1a1a;
    border-radius: 4px;
    color: #67cdcc;
    font-family: 'Courier New', monospace;
    white-space: pre;
    overflow-x: auto;
  }
  
  .expected-behavior {
    font-size: 0.85rem;
    color: #28a745;
  }
  
  .expected-behavior strong {
    color: #999;
  }
  
  .no-tests {
    text-align: center;
    color: #666;
    padding: 2rem;
  }
  
  .modal-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-top: 1px solid #333;
  }
  
  .selection-info {
    color: #999;
    font-size: 0.9rem;
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
    background-color: #333;
    color: #fff;
  }
  
  .cancel-btn:hover {
    background-color: #444;
  }
  
  .import-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    margin-left: 0.5rem;
  }
  
  .import-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
  
  .import-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>