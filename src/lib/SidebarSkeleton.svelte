<script>
  import { onMount } from 'svelte';
  import { isFirebaseConfigured } from './firebase.js';
  import { configService, normalizeConfigId } from './firebaseDataService.js';
  import { convertNotesToSections } from './services/domain/ConfigService';
  import DuplicateReportModal from './DuplicateReportModal.svelte';
  
  let { 
    onLoadReference = () => {}, 
    onSaveReference = () => {},
    onConfigActivate = () => {},
    currentSections = [],
    activeConfigId = null,
    activeConfigIngredients = []
  } = $props();
  
  let referenceTexts = $state({});
  let folders = $state({});
  let expandedFolders = $state({});
  let selectedReference = $state(null);
  let showSaveDialog = $state(false);
  let searchQuery = $state('');
  let configSearchQuery = $state('');
  let lastImportReport = $state(null);
  let showDuplicateReport = $state(false);
  
  // Filter states
  let filters = $state({
    healthSystem: '',
    domain: '',
    subdomain: '',
    version: '',
    ingredient: ''
  });
  
  // Save dialog states
  let saveData = $state({
    name: '',
    ingredient: '',
    healthSystem: 'UHS',
    domain: 'west',
    subdomain: 'prod',
    version: 'adult',
    tags: ''
  });
  
  // Available options - now editable
  let healthSystems = $state(['UHS', 'Other']);
  let domains = $state(['west', 'central', 'east']);
  let subdomains = $state(['build', 'cert', 'mock', 'prod']);
  let versions = $state(['neonatal', 'child', 'adolescent', 'adult']);
  
  // Management dialogs
  let showHealthSystemDialog = $state(false);
  let showDomainDialog = $state(false);
  let showSubdomainDialog = $state(false);
  let showIngredientDialog = $state(false);
  let showImportDialog = $state(false);
  let showManageDropdown = $state(false);
  let showConfigDialog = $state(false);
  let newItemName = $state('');
  
  // Config management states
  let firebaseConfigs = $state([]);
  let loadingFirebaseConfigs = $state(false);
  let tpnConfigs = $state({});
  
  // Ingredient type configuration
  const ingredientTypeConfig = {
    'Diluent': { icon: '💧', color: 'variant-soft-primary', name: 'Diluent' },
    'Macronutrient': { icon: '🥩', color: 'variant-soft-success', name: 'Macronutrient' },
    'Micronutrient': { icon: '💊', color: 'variant-soft-secondary', name: 'Micronutrient' },
    'Salt': { icon: '🧂', color: 'variant-soft-warning', name: 'Salt' },
    'Additive': { icon: '➕', color: 'variant-soft-error', name: 'Additive' },
    'Other': { icon: '📦', color: 'variant-soft-surface', name: 'Other' }
  };
  
  function getIngredientTypeInfo(type) {
    return ingredientTypeConfig[type] || ingredientTypeConfig['Other'];
  }
  
  // Handle clicking on an ingredient in the config view
  function handleIngredientClick(ingredient) {
    // Check for notes in both possible fields (notes for local imports, NOTE for Firebase)
    const notes = ingredient.notes || ingredient.NOTE;
    
    if (!notes || notes.length === 0) {
      alert(`No content available for ${ingredient.DISPLAY || ingredient.display || ingredient.KEYNAME || ingredient.keyname}`);
      return;
    }
    
    // Convert notes to sections
    const sections = convertNotesToSections(notes);
    
    // Check if valid content exists
    if (!hasValidContent(sections)) {
      alert(`No valid content found for ${ingredient.DISPLAY || ingredient.display || ingredient.KEYNAME || ingredient.keyname}`);
      return;
    }
    
    // Create a reference object
    const reference = {
      id: `config-${activeConfigId}-${ingredient.KEYNAME || ingredient.keyname}`,
      name: ingredient.DISPLAY || ingredient.display || ingredient.KEYNAME || ingredient.keyname,
      ingredient: ingredient.KEYNAME || ingredient.keyname,
      ingredientType: ingredient.TYPE || ingredient.type,
      sections: sections.map((s, idx) => ({
        ...s,
        id: idx + 1,
        content: s.content
      })),
      fromConfig: true,
      configId: activeConfigId
    };
    
    // Load the reference into the editor with ingredient data
    onLoadReference(reference, ingredient);
  }
  
  // Use the consolidated convertNotesToSections from ConfigService
  // This handles both string and array inputs with proper [f()] parsing
  
  function hasValidContent(sections) {
    return sections && sections.length > 0 && sections.some(s => s.content && s.content.trim().length > 0);
  }
  
  // Load saved references on mount
  onMount(() => {
    loadFromLocalStorage();
  });
  
  // Load Firebase configs when dialog opens
  $effect(() => {
    if (showConfigDialog && firebaseConfigs.length === 0 && !loadingFirebaseConfigs) {
      loadFirebaseConfigs();
    }
  });
  
  async function loadFirebaseConfigs() {
    if (!isFirebaseConfigured()) return;
    
    loadingFirebaseConfigs = true;
    try {
      const configs = await configService.getAllConfigs();
      // configs are already objects, not Firestore documents
      firebaseConfigs = configs;
      console.log(`Loaded ${configs.length} configs from Firebase:`, configs);
    } catch (error) {
      console.error('Failed to load Firebase configs:', error);
    } finally {
      loadingFirebaseConfigs = false;
    }
  }
  
  function loadFromLocalStorage() {
    const saved = localStorage.getItem('dynamic-text-references');
    if (saved) {
      try {
        referenceTexts = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load references:', e);
      }
    }
    
    // Load TPN configs
    const savedConfigs = localStorage.getItem('dynamic-text-tpn-configs');
    if (savedConfigs) {
      try {
        tpnConfigs = JSON.parse(savedConfigs);
      } catch (e) {
        console.error('Failed to load TPN configs:', e);
      }
    }
    
    buildFolderStructure();
  }
  
  function saveToLocalStorage() {
    localStorage.setItem('dynamic-text-references', JSON.stringify(referenceTexts));
    // Also save TPN configs
    localStorage.setItem('dynamic-text-tpn-configs', JSON.stringify(tpnConfigs));
  }
  
  function buildFolderStructure() {
    const rootFolders = {};
    
    // Create UHS folder structure
    rootFolders['uhs-root'] = {
      id: 'uhs-root',
      name: 'UHS',
      parentId: null,
      type: 'healthSystem',
      value: 'UHS'
    };
    
    // Create domain folders under UHS
    domains.forEach(domain => {
      const domainId = `uhs-${domain}`;
      rootFolders[domainId] = {
        id: domainId,
        name: domain.charAt(0).toUpperCase() + domain.slice(1),
        parentId: 'uhs-root',
        type: 'domain',
        value: domain
      };
      
      // Create subdomain folders
      subdomains.forEach(subdomain => {
        const subdomainId = `uhs-${domain}-${subdomain}`;
        rootFolders[subdomainId] = {
          id: subdomainId,
          name: subdomain.charAt(0).toUpperCase() + subdomain.slice(1),
          parentId: domainId,
          type: 'subdomain',
          value: subdomain
        };
        
        // Create version folders
        versions.forEach(version => {
          const versionId = `uhs-${domain}-${subdomain}-${version}`;
          rootFolders[versionId] = {
            id: versionId,
            name: version.charAt(0).toUpperCase() + version.slice(1),
            parentId: subdomainId,
            type: 'version',
            value: version
          };
        });
      });
    });
    
    // Create Other folder
    rootFolders['other-root'] = {
      id: 'other-root',
      name: 'Other Health Systems',
      parentId: null,
      type: 'healthSystem',
      value: 'Other'
    };
    
    folders = rootFolders;
  }
  
  function handleSaveReference() {
    const id = Date.now().toString();
    const newReference = {
      id,
      name: saveData.name,
      ingredient: saveData.ingredient,
      healthSystem: saveData.healthSystem,
      domain: saveData.domain,
      subdomain: saveData.subdomain,
      version: saveData.version,
      sections: currentSections.map(section => ({
        ...section,
        ...(section.type === 'dynamic' && section.testCases ? { testCases: section.testCases } : {})
      })),
      tags: saveData.tags.split(',').map(t => t.trim()).filter(t => t),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    referenceTexts[id] = newReference;
    referenceTexts = { ...referenceTexts };
    saveToLocalStorage();
    showSaveDialog = false;
    
    // Reset save form
    saveData = {
      name: '',
      ingredient: '',
      healthSystem: 'UHS',
      domain: 'west',
      subdomain: 'prod',
      version: 'adult',
      tags: ''
    };
  }
</script>

<aside class="w-96 bg-surface-50-900-token border-r border-surface-200-700-token h-full overflow-hidden flex flex-col">
  <!-- Header -->
  <header class="p-4 border-b border-surface-200-700-token">
    <div class="flex items-center justify-between mb-2">
      <h2 class="h4 font-bold">Reference Texts</h2>
      {#if activeConfigId}
        <span class="badge variant-filled-primary text-xs">
          ⚙️ {activeConfigId}
        </span>
      {/if}
    </div>
    
    <!-- Action Buttons -->
    <div class="flex gap-2">
      <button 
        class="btn btn-sm variant-filled-primary"
        onclick={() => showSaveDialog = true}
      >
        💾 Save
      </button>
      <button 
        class="btn btn-sm variant-soft-secondary"
        onclick={() => showImportDialog = true}
      >
        📥 Import
      </button>
      <button 
        class="btn btn-sm variant-soft-warning"
        onclick={() => showConfigDialog = true}
        title="Manage TPN Configs"
      >
        🔧 Configs
      </button>
      <button 
        class="btn btn-sm variant-soft-tertiary"
        onclick={() => showManageDropdown = !showManageDropdown}
      >
        ⚙️ Manage
      </button>
    </div>
  </header>
  
  <!-- Search -->
  <div class="p-4 border-b border-surface-200-700-token">
    <input 
      type="text"
      placeholder="Search references..."
      bind:value={searchQuery}
      class="input variant-form-material"
    />
  </div>
  
  <!-- Content Area -->
  <div class="flex-1 overflow-y-auto p-4">
    {#if activeConfigId && activeConfigIngredients.length > 0}
      <!-- Active Config Section -->
      <div class="mb-6">
        <h3 class="h5 font-semibold mb-3 flex items-center gap-2">
          <span class="text-primary-500">⚙️</span>
          Active Config: {activeConfigId}
        </h3>
        
        <!-- Config Search -->
        <input 
          type="text"
          placeholder="Search ingredients..."
          bind:value={configSearchQuery}
          class="input input-sm variant-form-material mb-3"
        />
        
        <!-- Ingredients List -->
        <div class="space-y-3">
          {#each Object.entries(ingredientTypeConfig) as [type, config]}
            {@const ingredients = activeConfigIngredients.filter(i => (i.TYPE || i.type || 'Other') === type)}
            {#if ingredients.length > 0}
              <div class="ingredient-type-group">
                <div class="flex items-center gap-2 mb-2 p-2 bg-surface-200-700-token rounded">
                  <span>{config.icon}</span>
                  <span class="font-medium">{config.name}</span>
                  <span class="badge variant-soft text-xs">{ingredients.length}</span>
                </div>
                <div class="space-y-1 pl-4">
                  {#each ingredients as ingredient}
                    <button
                      class="config-ingredient-item w-full text-left p-2 rounded hover:bg-surface-200-700-token transition-colors"
                      onclick={() => handleIngredientClick(ingredient)}
                    >
                      <div class="ingredient-details flex items-center justify-between">
                        <span class="text-sm font-medium">
                          {ingredient.DISPLAY || ingredient.display || ingredient.KEYNAME || ingredient.keyname}
                        </span>
                        {#if ingredient.notes || ingredient.NOTE}
                          <span class="badge variant-soft-success text-xs">
                            {(ingredient.notes || ingredient.NOTE).length} notes
                          </span>
                        {/if}
                      </div>
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
          {/each}
        </div>
      </div>
      
      <hr class="my-4 border-surface-200-700-token" />
    {/if}
    
    <!-- Reference Library -->
    <div>
      <h3 class="h5 font-semibold mb-3">Reference Library</h3>
      
      <!-- Filter Chips -->
      <div class="flex flex-wrap gap-2 mb-4">
        {#if filters.healthSystem}
          <span class="chip variant-filled-surface">
            {filters.healthSystem}
            <button onclick={() => filters.healthSystem = ''}>✕</button>
          </span>
        {/if}
        {#if filters.domain}
          <span class="chip variant-filled-surface">
            {filters.domain}
            <button onclick={() => filters.domain = ''}>✕</button>
          </span>
        {/if}
        {#if filters.subdomain}
          <span class="chip variant-filled-surface">
            {filters.subdomain}
            <button onclick={() => filters.subdomain = ''}>✕</button>
          </span>
        {/if}
        {#if filters.version}
          <span class="chip variant-filled-surface">
            {filters.version}
            <button onclick={() => filters.version = ''}>✕</button>
          </span>
        {/if}
      </div>
      
      <!-- References List -->
      <div class="space-y-2">
        {#each Object.values(referenceTexts) as ref}
          <div 
            class="card p-3 cursor-pointer hover:variant-soft-primary transition-colors"
            onclick={() => onLoadReference(ref)}
          >
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-medium text-sm">{ref.name}</h4>
                <p class="text-xs text-surface-600-300-token">
                  {ref.ingredient} • {ref.healthSystem}/{ref.domain}/{ref.subdomain}/{ref.version}
                </p>
              </div>
              <button 
                class="btn btn-sm variant-ghost-error"
                onclick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this reference?')) {
                    delete referenceTexts[ref.id];
                    referenceTexts = { ...referenceTexts };
                    saveToLocalStorage();
                  }
                }}
              >
                🗑️
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
  
  <!-- Resize Handle -->
  <div class="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary-500 transition-colors" />
</aside>

<!-- Config Dialog Modal -->
{#if showConfigDialog}
  <div 
    class="config-modal-backdrop"
    onclick={() => showConfigDialog = false}
    onkeydown={(e) => e.key === 'Escape' && (showConfigDialog = false)}
    role="button"
    tabindex="-1"
  >
    <div 
      class="config-modal-content"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <h3 class="text-xl font-bold mb-4">TPN Config Manager</h3>
      
      {#if activeConfigId}
        <div class="alert variant-soft-primary mb-4">
          <strong>Active Config:</strong> {activeConfigId}
        </div>
      {/if}
      
      <div class="config-list space-y-4">
        {#if loadingFirebaseConfigs}
          <div class="flex items-center justify-center p-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <p class="ml-3">Loading configs from Firebase...</p>
          </div>
        {/if}
        
        {#if firebaseConfigs.length > 0}
          <h4 class="text-lg font-semibold mb-2">Firebase Configs:</h4>
          <div class="space-y-2">
            {#each firebaseConfigs as config}
              <div class="config-item {activeConfigId === config.id ? 'ring-2 ring-blue-500 active' : ''}">
                <div class="flex justify-between items-start">
                  <div class="config-info">
                    <strong class="text-gray-900 dark:text-gray-100">{config.name || config.id}</strong>
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ml-2">☁️ Firebase</span>
                    <div class="config-metadata text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {config.healthSystem} / {config.domain} / {config.subdomain} / {config.version}
                    </div>
                    {#if config.importedAt}
                      <div class="config-date text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Imported: {new Date(config.importedAt.seconds * 1000).toLocaleDateString()}
                      </div>
                    {/if}
                  </div>
                  <div class="config-actions flex gap-2">
                    {#if activeConfigId !== config.id}
                      <button 
                        class="px-3 py-1 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white activate-btn"
                        onclick={async () => {
                          let configIngredients = [];
                          try {
                            configIngredients = await configService.getConfigIngredients(config.id);
                            console.log(`Loaded ${configIngredients.length} ingredients for config ${config.id}`);
                          } catch (err) {
                            console.error('Failed to load ingredients:', err);
                          }
                          onConfigActivate(config.id, configIngredients);
                          saveToLocalStorage();
                          showConfigDialog = false; // Close the modal after activation
                        }}
                      >
                        Activate
                      </button>
                    {/if}
                    <button 
                      class="px-3 py-1 text-sm rounded-md bg-red-600 hover:bg-red-700 text-white"
                      onclick={async () => {
                        if (confirm(`Delete config "${config.name || config.id}" from Firebase?`)) {
                          try {
                            await configService.deleteConfig(config.id);
                            firebaseConfigs = firebaseConfigs.filter(c => c.id !== config.id);
                            if (activeConfigId === config.id) {
                              onConfigActivate(null, []);
                            }
                          } catch (err) {
                            alert(`Failed to delete config: ${err.message}`);
                          }
                        }
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
        
        {#if Object.keys(tpnConfigs).length > 0}
          <h4 class="h4">Local Configs:</h4>
          <div class="space-y-2">
            {#each Object.entries(tpnConfigs) as [configId, config]}
              <div class="config-item card p-4 {activeConfigId === configId ? 'ring-2 ring-primary-500 active' : ''}">
                <div class="flex justify-between items-start">
                  <div class="config-info">
                    <strong>{configId}</strong>
                    <span class="badge variant-soft-secondary ml-2">💾 Local</span>
                    {#if config.metadata}
                      <div class="config-metadata text-sm text-surface-600-300-token mt-1">
                        {config.metadata.healthSystem} / {config.metadata.domain} / {config.metadata.subdomain} / {config.metadata.version}
                      </div>
                      <div class="config-date text-xs text-surface-500-400-token mt-1">
                        Imported: {new Date(config.metadata.importedAt).toLocaleDateString()}
                      </div>
                    {/if}
                  </div>
                  <div class="config-actions flex gap-2">
                    {#if activeConfigId !== configId}
                      <button 
                        class="btn btn-sm variant-filled-primary activate-btn"
                        onclick={() => {
                          onConfigActivate(configId, []);
                          saveToLocalStorage();
                          showConfigDialog = false; // Close the modal after activation
                        }}
                      >
                        Activate
                      </button>
                    {/if}
                    <button 
                      class="btn btn-sm variant-soft-error"
                      onclick={() => {
                        if (confirm(`Delete config "${configId}"?`)) {
                          delete tpnConfigs[configId];
                          if (activeConfigId === configId) {
                            onConfigActivate(null, []);
                          }
                          tpnConfigs = { ...tpnConfigs };
                          saveToLocalStorage();
                        }
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
        
        {#if Object.keys(tpnConfigs).length === 0 && firebaseConfigs.length === 0 && !loadingFirebaseConfigs}
          <p class="no-configs text-center py-8 text-surface-600-300-token">No configs found. Import a TPN JSON file to get started.</p>
        {/if}
      </div>
      
      <div class="flex justify-end mt-6">
        <button 
          class="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md"
          onclick={() => showConfigDialog = false}
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Save Dialog Modal -->
{#if showSaveDialog}
  <div class="modal-backdrop">
    <div class="modal card p-6 w-96">
      <h3 class="h4 mb-4">Save Reference</h3>
      
      <label class="label mb-3">
        <span>Name</span>
        <input 
          type="text" 
          bind:value={saveData.name}
          class="input variant-form-material"
        />
      </label>
      
      <label class="label mb-3">
        <span>Ingredient</span>
        <input 
          type="text" 
          bind:value={saveData.ingredient}
          class="input variant-form-material"
        />
      </label>
      
      <div class="grid grid-cols-2 gap-3 mb-3">
        <label class="label">
          <span>Health System</span>
          <select bind:value={saveData.healthSystem} class="select variant-form-material">
            {#each healthSystems as hs}
              <option value={hs}>{hs}</option>
            {/each}
          </select>
        </label>
        
        <label class="label">
          <span>Domain</span>
          <select bind:value={saveData.domain} class="select variant-form-material">
            {#each domains as domain}
              <option value={domain}>{domain}</option>
            {/each}
          </select>
        </label>
      </div>
      
      <div class="grid grid-cols-2 gap-3 mb-3">
        <label class="label">
          <span>Subdomain</span>
          <select bind:value={saveData.subdomain} class="select variant-form-material">
            {#each subdomains as subdomain}
              <option value={subdomain}>{subdomain}</option>
            {/each}
          </select>
        </label>
        
        <label class="label">
          <span>Version</span>
          <select bind:value={saveData.version} class="select variant-form-material">
            {#each versions as version}
              <option value={version}>{version}</option>
            {/each}
          </select>
        </label>
      </div>
      
      <label class="label mb-4">
        <span>Tags (comma-separated)</span>
        <input 
          type="text" 
          bind:value={saveData.tags}
          class="input variant-form-material"
        />
      </label>
      
      <div class="flex gap-2 justify-end">
        <button 
          class="btn variant-ghost"
          onclick={() => showSaveDialog = false}
        >
          Cancel
        </button>
        <button 
          class="btn variant-filled-primary"
          onclick={handleSaveReference}
        >
          Save
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
  }
  
  .modal {
    max-height: 90vh;
    overflow-y: auto;
  }
  /* Override for modal visibility - force white background */
  .config-modal-backdrop {
    position: fixed !important;
    inset: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 1rem !important;
    background-color: rgba(0, 0, 0, 0.5) !important;
    backdrop-filter: blur(4px) !important;
    z-index: 9999 !important;
  }
  
  .config-modal-content {
    background-color: white !important;
    color: #111827 !important;
    border-radius: 0.5rem !important;
    padding: 1.5rem !important;
    max-width: 42rem !important;
    width: 100% !important;
    max-height: 80vh !important;
    overflow-y: auto !important;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
    border: 1px solid #e5e7eb !important;
  }
  
  .config-modal-content h3,
  .config-modal-content h4,
  .config-modal-content strong,
  .config-modal-content button,
  .config-modal-content div {
    color: inherit !important;
  }
  
  .config-item {
    background-color: #f3f4f6 !important;
    padding: 1rem !important;
    margin-bottom: 0.5rem !important;
    border-radius: 0.5rem !important;
  }
</style>