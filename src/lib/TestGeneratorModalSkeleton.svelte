<script>
  import { getModalStore } from './stores/modalStore.js';
  
  const modalStore = getModalStore();
  
  let { 
    generatedTests = {},
    onImportTests = () => {},
    sectionId = null
  } = $props();
  
  let selectedTests = $state({
    basicFunctionality: [],
    edgeCases: [],
    qaBreaking: []
  });
  
  let activeTab = $state(0);
  
  const tabs = [
    { key: 'basicFunctionality', label: 'Basic Functionality', emoji: '✅', color: 'variant-filled-success' },
    { key: 'edgeCases', label: 'Edge Cases', emoji: '⚡', color: 'variant-filled-warning' },
    { key: 'qaBreaking', label: 'QA/Breaking Tests', emoji: '🔨', color: 'variant-filled-error' }
  ];
  
  const importanceColors = {
    high: 'variant-filled-error',
    medium: 'variant-filled-warning',
    low: 'variant-filled-success'
  };
  
  export function open(tests, importCallback, section) {
    generatedTests = tests;
    onImportTests = importCallback;
    sectionId = section;
    
    // Reset selections
    selectedTests = {
      basicFunctionality: [],
      edgeCases: [],
      qaBreaking: []
    };
    activeTab = 0;
    
    modalStore.trigger({
      type: 'component',
      component: 'testGeneratorModal'
    });
  }
  
  function toggleTest(category, index) {
    if (selectedTests[category].includes(index)) {
      selectedTests[category] = selectedTests[category].filter(i => i !== index);
    } else {
      selectedTests[category] = [...selectedTests[category], index];
    }
  }
  
  function selectAll(category) {
    if (selectedTests[category].length === generatedTests[category]?.length) {
      selectedTests[category] = [];
    } else {
      selectedTests[category] = generatedTests[category]?.map((_, i) => i) || [];
    }
  }
  
  function importSelected() {
    const testsToImport = [];
    
    Object.keys(selectedTests).forEach(category => {
      selectedTests[category].forEach(index => {
        const test = generatedTests[category]?.[index];
        if (test) {
          testsToImport.push({
            name: test.name,
            variables: test.variables
          });
        }
      });
    });
    
    if (testsToImport.length > 0) {
      onImportTests(sectionId, testsToImport);
      modalStore.close();
    }
  }
  
  function getSelectedCount() {
    return Object.values(selectedTests).reduce((sum, arr) => sum + arr.length, 0);
  }
  
  function getTotalCount() {
    return Object.values(generatedTests).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  }
  
  $effect(() => {
    // Update active tab based on index
    const currentCategory = tabs[activeTab]?.key;
    if (!currentCategory || !generatedTests[currentCategory]?.length) {
      // Find first tab with tests
      const firstWithTests = tabs.findIndex(tab => generatedTests[tab.key]?.length > 0);
      if (firstWithTests !== -1) {
        activeTab = firstWithTests;
      }
    }
  });
</script>

<div class="card p-6 w-full max-w-4xl max-h-[85vh] flex flex-col">
  <header class="mb-6">
    <div class="flex justify-between items-center">
      <div>
        <h2 class="h3 font-bold">🤖 AI Generated Test Cases</h2>
        <p class="text-surface-600-300-token mt-1">
          Review and select test cases to import
        </p>
      </div>
      <div class="flex items-center gap-3">
        <span class="badge variant-soft-primary">
          {getSelectedCount()} / {getTotalCount()} selected
        </span>
      </div>
    </div>
  </header>
  
  <!-- Tabs -->
  <TabGroup class="mb-4">
    {#each tabs as tab, i}
      <Tab bind:group={activeTab} name="test-tabs" value={i}>
        <span class="flex items-center gap-2">
          <span>{tab.emoji}</span>
          <span>{tab.label}</span>
          <span class="badge {generatedTests[tab.key]?.length ? tab.color : 'variant-soft'} text-xs">
            {generatedTests[tab.key]?.length || 0}
          </span>
        </span>
      </Tab>
    {/each}
  </TabGroup>
  
  <!-- Tab Content -->
  <div class="flex-1 overflow-y-auto">
    {#if tabs[activeTab]}
      {@const currentTab = tabs[activeTab]}
      {@const currentTests = generatedTests[currentTab.key] || []}
      
      {#if currentTests.length > 0}
        <!-- Select All -->
        <div class="flex items-center justify-between p-3 bg-surface-100-800-token rounded-lg mb-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox"
              class="checkbox"
              checked={selectedTests[currentTab.key].length === currentTests.length}
              onchange={() => selectAll(currentTab.key)}
            />
            <span class="font-medium">Select All Tests</span>
          </label>
          <span class="text-sm text-surface-600-300-token">
            {selectedTests[currentTab.key].length} of {currentTests.length} selected
          </span>
        </div>
        
        <!-- Test List -->
        <div class="space-y-3">
          {#each currentTests as test, index}
            <div 
              class="card p-4 cursor-pointer transition-all"
              class:variant-soft-primary={selectedTests[currentTab.key].includes(index)}
              onclick={() => toggleTest(currentTab.key, index)}
            >
              <div class="flex gap-3">
                <input 
                type="checkbox"
                class="checkbox mt-1"
                checked={selectedTests[currentTab.key].includes(index)}
                onchange={() => toggleTest(currentTab.key, index)}
                onclick={(e) => e.stopPropagation()}
              />
              
              <div class="flex-1">
                <div class="flex items-start justify-between mb-2">
                  <h4 class="font-semibold">{test.name}</h4>
                  {#if test.importance}
                    <span class="badge {importanceColors[test.importance] || 'variant-soft'} text-xs">
                      {test.importance}
                    </span>
                  {/if}
                </div>
                
                {#if test.description}
                  <p class="text-sm text-surface-600-300-token mb-3">
                    {test.description}
                  </p>
                {/if}
                
                  {#if test.variables && Object.keys(test.variables).length > 0}
                    <div class="bg-surface-200-700-token rounded p-3">
                      <h5 class="text-xs font-semibold mb-2 text-surface-600-300-token">
                        TEST VARIABLES:
                      </h5>
                      <div class="grid grid-cols-2 gap-2 text-sm">
                        {#each Object.entries(test.variables) as [key, value]}
                          <div class="flex justify-between">
                            <span class="font-mono text-primary-500">{key}:</span>
                            <span class="font-mono">{JSON.stringify(value)}</span>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}
                
                  {#if test.expectedOutput}
                    <div class="mt-3 p-2 bg-success-200/20 dark:bg-success-900/20 rounded">
                      <span class="text-xs font-semibold text-success-700 dark:text-success-400">
                        Expected: 
                      </span>
                      <span class="text-sm font-mono">
                        {test.expectedOutput}
                      </span>
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="flex flex-col items-center justify-center py-12 text-surface-600-300-token">
          <span class="text-6xl mb-4">📭</span>
          <p class="text-lg">No tests in this category</p>
          <p class="text-sm mt-2">The AI didn't generate any {currentTab.label.toLowerCase()}</p>
        </div>
      {/if}
    {/if}
  </div>
  
  <!-- Footer -->
  <footer class="flex justify-between items-center mt-6 pt-6 border-t border-surface-300-600-token">
    <div class="text-sm text-surface-600-300-token">
      {#if getSelectedCount() > 0}
        <span class="font-medium text-primary-500">{getSelectedCount()}</span> test{getSelectedCount() !== 1 ? 's' : ''} ready to import
      {:else}
        Select tests to import
      {/if}
    </div>
    
    <div class="flex gap-3">
      <button 
        class="btn variant-ghost"
        onclick={() => modalStore.close()}
      >
        Cancel
      </button>
      <button 
        class="btn variant-filled-primary"
        disabled={getSelectedCount() === 0}
        onclick={importSelected}
      >
        Import {getSelectedCount()} Test{getSelectedCount() !== 1 ? 's' : ''}
      </button>
    </div>
  </footer>
</div>